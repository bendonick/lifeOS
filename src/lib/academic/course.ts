import type { Course, Weekday } from "@/lib/types";
import { WEEKDAYS } from "@/lib/types";

// Pure course helpers — no SQLite, so client components can import them.

/** `schedule_days` is stored as JSON; this is the only place that parses it. */
export function scheduleDays(course: Pick<Course, "schedule_days">): Weekday[] {
  if (!course.schedule_days) return [];
  try {
    const parsed: unknown = JSON.parse(course.schedule_days);
    if (!Array.isArray(parsed)) return [];
    return WEEKDAYS.filter((d) => parsed.includes(d));
  } catch {
    return [];
  }
}

/** 8.5 → '08:30'. */
export function hourLabel(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** '08:30' → 8.5; anything else → null. */
export function parseHour(value: string): number | null {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h + min / 60;
}

/**
 * 'Wed 08:00–12:00' from the structured fields. Derived in one place and written
 * to `courses.time_label` on save, so the display string can never drift from
 * the days and hours it claims to describe.
 */
export function scheduleLabel(
  days: Weekday[],
  startHour: number | null,
  endHour: number | null
): string | null {
  const when = days.join(" ");
  if (startHour === null) return when || null;
  const time =
    endHour === null ? hourLabel(startHour) : `${hourLabel(startHour)}–${hourLabel(endHour)}`;
  return when ? `${when} ${time}` : time;
}

/**
 * What to call the course-page link. The user's LMS is OLAT, so its host gets
 * the name they use for it; any other host is named by its domain, which is
 * honest for a link whose destination the app does not otherwise know.
 */
export function courseLinkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "lms.example.edu" ? "OLAT page" : host;
  } catch {
    return "course page";
  }
}

/**
 * Folder name under data/academic/courses/. Derived from the name rather than
 * stored, so renaming a course is a one-line rename on disk — Stage 6's RAG
 * corpus reads the same path.
 */
export function courseSlug(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "course"
  );
}
