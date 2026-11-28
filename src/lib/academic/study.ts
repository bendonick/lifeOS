import { matchCourse, type CourseName } from "@/lib/calendar/courses";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { StudyLog } from "@/lib/db/study";
import type { CourseTask } from "@/lib/db/tasks";
import { daysBetween, type CourseGroup } from "./semester";

/*
 * Study progress per course (decisions #97, #98, #101). Pure: no SQLite, no
 * clock; `now` comes in as Zurich 'YYYY-MM-DDTHH:MM'. Client components import
 * the types.
 *
 * The Exam Prep calendar sets the goal and nothing else: how many study
 * sessions and mock exams a course is planned to take before its exam, and
 * where the mock exams fall among them. Progress is the user's own log
 * (`study_sessions`): every bar starts empty, and each logged session fills
 * the next study segment, each logged mock exam the next mock segment. Whether
 * a planned session's time has passed never fills anything.
 *
 * It does set the pace (#101): `due` is how many planned sessions, of either
 * kind, had ended by `now`, and `pace` is the logged count minus that, so a
 * course is "2 behind" when the calendar had five sessions done by now and
 * three are logged. The bar draws a tick after the `due`-th segment.
 *
 * A calendar session belongs to a course when its title names the course
 * (`matchCourse`, the same reading the timetable uses). What the title says
 * beyond the course decides its kind: "mock exam", "past exam" or "practice"
 * is a mock exam, any other mention of "exam" is the exam itself and is not
 * planned study, and everything else is a study session. All-day events are
 * never sessions, and sessions at or after the course's exam are left out.
 */

export type SlotKind = "study" | "mock";

/** The kind of calendar session a title's non-course part describes. */
export function sessionKind(rest: string): SlotKind | "exam" {
  const r = rest.toLowerCase();
  if (/\b(mock|past|practice)\b/.test(r)) return "mock";
  if (/\bexams?\b/.test(r)) return "exam";
  return "study";
}

/**
 * The kind of a logged session, read from its title: one that names a mock,
 * past or practice exam fills a mock segment, anything else a study segment.
 * Stricter than `sessionKind`, since a log title is free text ("practice
 * problems" is studying, "practice exam" is not).
 */
export function logKind(title: string): StudyLog["kind"] {
  return /\b(mock|past exams?|practice exams?)\b/i.test(title) ? "mock" : "study";
}

/**
 * The title and description of a logged session, as POST and PATCH take
 * them: the title is required and at most 120 characters, the description
 * optional (empty becomes null) and at most 2000. Both are trimmed.
 */
export function readSessionText(
  body: unknown
): { title: string; description: string | null } | { error: string } {
  const b = (body ?? {}) as { title?: unknown; description?: unknown };
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) return { error: "give the session a title" };
  if (title.length > 120) return { error: "keep the title under 120 characters" };
  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (description.length > 2000) return { error: "keep the description under 2000 characters" };
  return { title, description: description || null };
}

/**
 * The review flag on a session body (decision #102): undefined when the body
 * leaves it out, an error when it is there but not true or false.
 */
export function readReview(body: unknown): boolean | undefined | { error: string } {
  const review = (body ?? {}) as { review?: unknown };
  if (review.review === undefined) return undefined;
  if (typeof review.review !== "boolean") return { error: "review must be true or false" };
  return review.review;
}

/** One planned session: a segment of the bar. */
export interface StudySlot {
  /** The calendar occurrence id (uid + start). */
  id: string;
  kind: SlotKind;
  filled: boolean;
}

export interface CourseStudy {
  code: string;
  name: string;
  /** The course row new sessions are filed under (the first slot's id). */
  courseId: number;
  /** The earliest open exam's due value; null when the course has none. */
  exam: string | null;
  /** Whole days from today to the exam; null without one. */
  daysToExam: number | null;
  /** The plan, in calendar order. */
  slots: StudySlot[];
  planned: Record<SlotKind, number>;
  done: Record<SlotKind, number>;
  /** This course's logged sessions, newest first. */
  log: StudyLog[];
  /** Planned sessions (study and mock) that had ended by now. */
  due: number;
  /** Logged sessions minus `due`: negative is behind, positive ahead. */
  pace: number;
}

export function studyProgress(
  events: CalendarEvent[],
  groups: CourseGroup[],
  exams: CourseTask[],
  logs: StudyLog[],
  now: string
): CourseStudy[] {
  const today = now.slice(0, 10);
  const enrolled = groups.filter((g) => g.status === "enrolled");
  const names: CourseName[] = enrolled.map((g) => ({ name: g.name, code: g.code }));

  const byCode = new Map<string, CourseStudy>();
  for (const g of enrolled) {
    const inGroup = (id: number | null) => id != null && g.ids.includes(id);
    const exam =
      exams
        .filter((e) => !e.done && e.due && inGroup(e.course_id))
        .map((e) => e.due!)
        .sort()[0] ?? null;
    const log = logs.filter((l) => inGroup(l.course_id));
    byCode.set(g.code, {
      code: g.code,
      name: g.name,
      courseId: g.ids[0],
      exam,
      daysToExam: exam ? daysBetween(today, exam.slice(0, 10)) : null,
      slots: [],
      planned: { study: 0, mock: 0 },
      done: {
        study: log.filter((l) => l.kind === "study").length,
        mock: log.filter((l) => l.kind === "mock").length,
      },
      log,
      due: 0,
      pace: 0,
    });
  }

  const sessions = events
    .filter((e) => e.calendar === "examPrep" && !e.allDay)
    .sort((a, b) => a.start.localeCompare(b.start));
  for (const e of sessions) {
    const m = matchCourse(e.title, names);
    const course = m && byCode.get(m.code);
    if (!course) continue;
    const kind = sessionKind(m.rest);
    if (kind === "exam") continue;
    if (course.exam && e.start >= course.exam.slice(0, 16)) continue;
    // Logged sessions fill the plan from the left, each kind in its own order.
    const filled = course.planned[kind] < course.done[kind];
    course.planned[kind] += 1;
    course.slots.push({ id: e.id, kind, filled });
    if (e.end <= now) course.due += 1;
  }
  for (const c of byCode.values()) c.pace = c.done.study + c.done.mock - c.due;

  // Courses heading for an exam first, nearest first; then the rest by code. A
  // course with no exam, no plan and no log is not part of this view.
  return [...byCode.values()]
    .filter((c) => c.exam || c.slots.length > 0 || c.log.length > 0)
    .sort((a, b) => {
      if (a.exam && b.exam) return a.exam.localeCompare(b.exam);
      if (a.exam) return -1;
      if (b.exam) return 1;
      return a.code.localeCompare(b.code);
    });
}
