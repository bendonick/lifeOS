import { scheduleDays } from "./course";
import { googleEventUrl, hhmm } from "@/lib/calendar/gcal";
import { addDays, zurichToUtc } from "@/lib/dates";
import type { Course, Weekday } from "@/lib/types";

/**
 * The course half of the prefilled-Google-link story (decision #27): it knows
 * how to describe a weekly class series, and hands the URL assembly to the
 * shared builder in `src/lib/calendar/gcal.ts`, which Personal's one-off
 * appointments use as well. One builder, one set of DST rules.
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

  return {
    // Local wall-clock, never UTC stamps — a term crossing the October switch
    // would otherwise slide an hour. The shared builder enforces it.
    url: googleEventUrl({
      title: course.name,
      start: `${firstDate}T${hhmm(startHour)}`,
      end: `${firstDate}T${hhmm(endHour)}`,
      recur: rrule,
      details,
      location: course.room ?? undefined,
    }),
    summary: `${days.join(" ")} ${hhmm(startHour)}–${hhmm(endHour)}, weekly from ${firstDate}${
      course.term_end ? ` until ${course.term_end}` : ""
    }`,
    openEnded: !course.term_end,
  };
}
