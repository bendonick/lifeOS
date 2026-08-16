import { scheduleDays } from "./course";
import { addDays, zurichToUtc } from "@/lib/dates";
import type { Course, Weekday } from "@/lib/types";

/**
 * Prefilled Google Calendar event links (decision #27). The app never writes to
 * Google — it hands Google a filled-in form and you press Save, so Google
 * creates and owns the event exactly as decision #1 requires.
 *
 * Pure: no env, no db, no network. Client components import it directly.
 */

const BYDAY: Record<Weekday, string> = { Mon: "MO", Tue: "TU", Wed: "WE", Thu: "TH", Fri: "FR" };
const ISO_DOW: Record<Weekday, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };

/** ISO weekday of a 'YYYY-MM-DD' (Mon=1 … Sun=7). */
export function isoDow(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

/** First date on or after `from` falling on one of `days`. */
export function firstOccurrence(from: string, days: Weekday[]): string | null {
  if (!days.length) return null;
  const wanted = new Set(days.map((d) => ISO_DOW[d]));
  for (let i = 0; i < 7; i++) {
    const date = addDays(from, i);
    if (wanted.has(isoDow(date))) return date;
  }
  return null;
}

/** 8.5 → '083000'. */
function clockStamp(hour: number): string {
  const capped = Math.min(hour, 23 + 59 / 60);
  const h = Math.floor(capped);
  const m = Math.round((capped - h) * 60);
  return `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
}

/** A Date as UTC basic format, which is the only form RRULE's UNTIL accepts. */
function utcStamp(d: Date): string {
  return `${d.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
}

export interface GoogleEventPlan {
  url: string;
  /** Plain-language summary of what pressing the link will create. */
  summary: string;
  /** True when no term end is known, so the series has no natural stop. */
  openEnded: boolean;
}

/**
 * Needs days, a start time and a term start; without them there is no series to
 * describe and the caller shows a hint instead of a dead link.
 */
export function googleEventPlan(course: Course): GoogleEventPlan | null {
  const days = scheduleDays(course);
  if (!days.length || course.start_hour == null || !course.term_start) return null;

  const firstDate = firstOccurrence(course.term_start, days);
  if (!firstDate) return null;

  const startHour = course.start_hour;
  const endHour =
    course.end_hour != null && course.end_hour > startHour ? course.end_hour : startHour + 1;
  const day = firstDate.replace(/-/g, "");

  // Local wall-clock plus ctz, never UTC stamps: a class pinned to an absolute
  // instant would slide an hour when Zurich leaves summer time mid-term.
  const dates = `${day}T${clockStamp(startHour)}/${day}T${clockStamp(endHour)}`;

  const rrule = [
    "RRULE:FREQ=WEEKLY",
    `BYDAY=${days.map((d) => BYDAY[d]).join(",")}`,
    course.term_end ? `UNTIL=${utcStamp(zurichToUtc(`${course.term_end}T23:59`))}` : null,
  ]
    .filter(Boolean)
    .join(";");

  const details = [
    course.professor ? `Professor: ${course.professor}` : null,
    course.professor_email ? `Email: ${course.professor_email}` : null,
    course.credits != null ? `Credits: ${course.credits}` : null,
    course.semester ? `Semester: ${course.semester}` : null,
    "Created from LifeOS — this calendar stays the source of truth for time.",
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: course.name,
    dates,
    ctz: "Europe/Zurich",
    recur: rrule,
    details,
  });
  if (course.room) params.set("location", course.room);

  return {
    url: `https://calendar.google.com/calendar/render?${params.toString()}`,
    summary: `${days.join(" ")} ${hhmm(startHour)}–${hhmm(endHour)}, weekly from ${firstDate}${
      course.term_end ? ` until ${course.term_end}` : ""
    }`,
    openEnded: !course.term_end,
  };
}

function hhmm(hour: number): string {
  const h = Math.floor(hour);
  return `${String(h).padStart(2, "0")}:${String(Math.round((hour - h) * 60)).padStart(2, "0")}`;
}
