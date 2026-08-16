import { firstOccurrence } from "./gcal";
import { scheduleDays } from "./course";
import type { CalendarEvent } from "@/lib/calendar/types";
import { hourOf, mondayOf } from "@/lib/dates";
import type { Course, Weekday } from "@/lib/types";

/**
 * Does Google actually hold the class block this course claims? (decision #27)
 *
 * An export is a one-time hand-off — Google owns the event afterwards, so the
 * course row and the calendar can silently disagree. This compares the two and
 * says so. It stays read-only: it never edits either side.
 *
 * Matching is by time slot, and the matched event's title is reported back, so
 * a slot filled by something unexpected is visible rather than silently "ok".
 * Title text is only a fallback for finding a class that moved.
 */

/** Start and end may drift by this much and still count as the same block. */
const TOLERANCE_HOURS = 15 / 60;

export type ScheduleState = "ok" | "moved" | "missing" | "unknown";

export interface ScheduleCheck {
  courseId: number;
  courseName: string;
  state: ScheduleState;
  /** One line for the reader: what was expected, and what is actually there. */
  detail: string;
  /** The week the check looked at, so the answer can be reproduced. */
  probeWeek: string | null;
}

/**
 * Which week to compare against: the current one while the term is running,
 * otherwise the week holding the term's first class — not the week of
 * `term_start` itself, which can land before the first session and would make
 * every course look missing.
 */
export function probeMonday(course: Course, today: string, mondayOfToday: string): string | null {
  if (!course.term_start) return null;
  const inTerm = today >= course.term_start && (!course.term_end || today <= course.term_end);
  if (inTerm) return mondayOfToday;
  const first = firstOccurrence(course.term_start, scheduleDays(course));
  return mondayOf(first ?? course.term_start);
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Loose title match, for spotting a class that was moved rather than deleted. */
function titlesLookAlike(a: string, b: string): boolean {
  const x = normalize(a);
  const y = normalize(b);
  if (x.length < 4 || y.length < 4) return false;
  return x.includes(y) || y.includes(x);
}

/** 'Wed' for a 'YYYY-MM-DD' — a moved class reads better by weekday than by date. */
function shortDay(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`)
  );
}

function hhmm(hour: number): string {
  const h = Math.floor(hour);
  return `${String(h).padStart(2, "0")}:${String(Math.round((hour - h) * 60)).padStart(2, "0")}`;
}

export function checkCourse(
  course: Course,
  academicEvents: CalendarEvent[],
  monday: string | null,
  feedUsable: boolean
): ScheduleCheck {
  const base = { courseId: course.id, courseName: course.name, probeWeek: monday };
  const days = scheduleDays(course);

  if (!days.length || course.start_hour == null || !course.term_start || !monday) {
    return {
      ...base,
      state: "unknown",
      detail: "add days, a start time and term dates to check this",
    };
  }
  // Never claim a class is missing when we simply cannot see the calendar.
  if (!feedUsable) {
    return { ...base, state: "unknown", detail: "Academic calendar unavailable — not checked" };
  }

  const startHour = course.start_hour;
  const endHour = course.end_hour != null && course.end_hour > startHour ? course.end_hour : startHour + 1;
  const timed = academicEvents.filter((e) => !e.allDay);

  const matched: string[] = [];
  const drifted: string[] = [];
  const missingDays: Weekday[] = [];

  for (const day of days) {
    const date = firstOccurrence(monday, [day]);
    if (!date) continue;
    const onDay = timed.filter((e) => e.start.slice(0, 10) === date);
    const covering = onDay.find(
      (e) =>
        Math.abs(hourOf(e.start) - startHour) <= TOLERANCE_HOURS &&
        Math.abs(hourOf(e.end) - endHour) <= TOLERANCE_HOURS
    );
    if (covering) {
      matched.push(covering.title);
      continue;
    }
    const overlapping = onDay.find(
      (e) => hourOf(e.start) < endHour && hourOf(e.end) > startHour
    );
    if (overlapping) {
      drifted.push(
        `${day} ${overlapping.start.slice(11, 16)}–${overlapping.end.slice(11, 16)} “${overlapping.title}”`
      );
      continue;
    }
    missingDays.push(day);
  }

  const expected = `${days.join(" ")} ${hhmm(startHour)}–${hhmm(endHour)}`;

  if (missingDays.length === 0 && drifted.length === 0) {
    const names = [...new Set(matched)];
    return {
      ...base,
      state: "ok",
      detail:
        names.length === 1 && titlesLookAlike(names[0], course.name)
          ? `${expected} — in the calendar`
          : `${expected} — matched ${names.map((n) => `“${n}”`).join(", ")}`,
    };
  }

  if (drifted.length > 0) {
    return { ...base, state: "moved", detail: `expected ${expected}; calendar has ${drifted.join(", ")}` };
  }

  // Nothing in the slot — is it somewhere else that week, or absent entirely?
  const elsewhere = timed.find((e) => titlesLookAlike(e.title, course.name));
  if (elsewhere) {
    return {
      ...base,
      state: "moved",
      detail: `expected ${expected}; calendar has it ${shortDay(elsewhere.start.slice(0, 10))} ${elsewhere.start.slice(11, 16)}–${elsewhere.end.slice(11, 16)}`,
    };
  }
  return { ...base, state: "missing", detail: `${expected} — no class block in the calendar` };
}
