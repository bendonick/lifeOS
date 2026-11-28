import { matchCourse, type CourseName } from "@/lib/calendar/courses";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { CourseTask } from "@/lib/db/tasks";
import { daysBetween, type CourseGroup } from "./semester";

/*
 * Study progress per course, counted in sessions from the Exam Prep calendar.
 * Pure: no SQLite, no clock. `now` comes in as Zurich 'YYYY-MM-DDTHH:MM', so a
 * test can move it.
 *
 * A session belongs to a course when its title names the course
 * (`matchCourse`, the same reading the timetable uses). What the title says
 * beyond the course decides its kind: "mock exam", "past exam" or "practice"
 * is a practice session, any other mention of "exam" is the exam itself and is
 * not a session, and everything else is a study session. All-day events are
 * never sessions, and sessions that start at or after the course's exam are
 * left out.
 *
 * A session counts as done once its end has passed. Nothing is logged by hand:
 * the calendar is the plan, and the plan going by is the progress.
 */

export type SessionKind = "study" | "practice" | "exam";

/** The kind of session a title's non-course part describes. */
export function sessionKind(rest: string): SessionKind {
  const r = rest.toLowerCase();
  if (/\b(mock|past|practice)\b/.test(r)) return "practice";
  if (/\bexams?\b/.test(r)) return "exam";
  return "study";
}

export interface StudySession {
  /** The calendar occurrence id (uid + start), stable across refetches. */
  id: string;
  start: string;
  end: string;
  kind: "study" | "practice";
  /** What the title says beyond the course: "mock exam", or "". */
  label: string;
  state: "done" | "now" | "ahead";
}

export interface CourseStudy {
  code: string;
  name: string;
  /** The first slot's id, for the course page link. */
  courseId: number;
  /** The earliest open exam's due value; null when the course has none. */
  exam: string | null;
  /** Whole days from today to the exam; null without one. */
  daysToExam: number | null;
  /** Every session before the exam, in order. */
  sessions: StudySession[];
  done: number;
}

export function studyProgress(
  events: CalendarEvent[],
  groups: CourseGroup[],
  exams: CourseTask[],
  now: string
): CourseStudy[] {
  const enrolled = groups.filter((g) => g.status === "enrolled");
  const names: CourseName[] = enrolled.map((g) => ({ name: g.name, code: g.code }));
  const today = now.slice(0, 10);

  const byCode = new Map<string, CourseStudy>();
  for (const g of enrolled) {
    const exam =
      exams
        .filter((e) => !e.done && e.due && e.course_id != null && g.ids.includes(e.course_id))
        .map((e) => e.due!)
        .sort()[0] ?? null;
    byCode.set(g.code, {
      code: g.code,
      name: g.name,
      courseId: g.ids[0],
      exam,
      daysToExam: exam ? daysBetween(today, exam.slice(0, 10)) : null,
      sessions: [],
      done: 0,
    });
  }

  for (const e of events) {
    if (e.calendar !== "examPrep" || e.allDay) continue;
    const m = matchCourse(e.title, names);
    const course = m && byCode.get(m.code);
    if (!course) continue;
    const kind = sessionKind(m.rest);
    if (kind === "exam") continue;
    if (course.exam && e.start >= course.exam.slice(0, 16)) continue;
    course.sessions.push({
      id: e.id,
      start: e.start,
      end: e.end,
      kind,
      label: m.rest,
      state: e.end <= now ? "done" : e.start <= now ? "now" : "ahead",
    });
  }

  for (const c of byCode.values()) {
    c.sessions.sort((a, b) => a.start.localeCompare(b.start));
    c.done = c.sessions.filter((s) => s.state === "done").length;
  }

  // Courses heading for an exam first, nearest first; then courses with
  // sessions but no exam. A course with neither is not part of this view.
  return [...byCode.values()]
    .filter((c) => c.exam || c.sessions.length > 0)
    .sort((a, b) => {
      if (a.exam && b.exam) return a.exam.localeCompare(b.exam);
      if (a.exam) return -1;
      if (b.exam) return 1;
      return a.code.localeCompare(b.code);
    });
}
