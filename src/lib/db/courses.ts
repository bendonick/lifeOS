import { db } from "@/lib/db";
import { scheduleLabel } from "@/lib/academic/course";
import { COURSE_STATUSES, WEEKDAYS, type Course, type CourseStatus, type Weekday } from "@/lib/types";

/** Enrolled first, then by day/time so the list reads like a timetable. */
export function allCourses(): Course[] {
  return db
    .prepare(
      `SELECT * FROM courses
       ORDER BY CASE status WHEN 'enrolled' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END,
                start_hour IS NULL, start_hour, name`
    )
    .all() as Course[];
}

export function courseById(id: number): Course | undefined {
  return db.prepare("SELECT * FROM courses WHERE id = ?").get(id) as Course | undefined;
}

/**
 * The credits counter (docs/03-pages/academic.md §2). The user tracks credits,
 * not grades — decision #10 — so this is the only number the page keeps score of.
 */
export interface CreditTotals {
  enrolled: number;
  completed: number;
}

export function creditTotals(): CreditTotals {
  const rows = db
    .prepare(
      "SELECT status, COALESCE(SUM(credits), 0) AS total FROM courses GROUP BY status"
    )
    .all() as { status: CourseStatus; total: number }[];
  const of = (s: CourseStatus) => rows.find((r) => r.status === s)?.total ?? 0;
  return { enrolled: of("enrolled"), completed: of("completed") };
}

export interface CourseInput {
  name: string;
  professor?: string | null;
  professor_email?: string | null;
  credits?: number | null;
  room?: string | null;
  status?: CourseStatus;
  schedule_days?: Weekday[];
  start_hour?: number | null;
  end_hour?: number | null;
  term_start?: string | null;
  term_end?: string | null;
  semester?: string | null;
  url?: string | null;
  short_name?: string | null;
}

/** time_label is always derived here, never accepted from the caller. */
function labelFor(input: CourseInput): string | null {
  return scheduleLabel(input.schedule_days ?? [], input.start_hour ?? null, input.end_hour ?? null);
}

export function createCourse(input: CourseInput): Course {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO courses
        (name, professor, professor_email, credits, room, status, schedule_days,
         time_label, start_hour, end_hour, term_start, term_end, semester, url, short_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.professor ?? null,
      input.professor_email ?? null,
      input.credits ?? null,
      input.room ?? null,
      input.status ?? "enrolled",
      input.schedule_days?.length ? JSON.stringify(input.schedule_days) : null,
      labelFor(input),
      input.start_hour ?? null,
      input.end_hour ?? null,
      input.term_start ?? null,
      input.term_end ?? null,
      input.semester ?? null,
      input.url ?? null,
      input.short_name ?? null
    );
  return courseById(Number(lastInsertRowid))!;
}

export function updateCourse(id: number, input: CourseInput): Course | undefined {
  if (!courseById(id)) return undefined;
  db.prepare(
    `UPDATE courses SET
       name = ?, professor = ?, professor_email = ?, credits = ?, room = ?, status = ?,
       schedule_days = ?, time_label = ?, start_hour = ?, end_hour = ?,
       term_start = ?, term_end = ?, semester = ?, url = ?, short_name = ?
     WHERE id = ?`
  ).run(
    input.name,
    input.professor ?? null,
    input.professor_email ?? null,
    input.credits ?? null,
    input.room ?? null,
    input.status ?? "enrolled",
    input.schedule_days?.length ? JSON.stringify(input.schedule_days) : null,
    labelFor(input),
    input.start_hour ?? null,
    input.end_hour ?? null,
    input.term_start ?? null,
    input.term_end ?? null,
    input.semester ?? null,
    input.url ?? null,
    input.short_name ?? null,
    id
  );
  return courseById(id);
}

/** Tasks survive with course_id set to NULL (schema ON DELETE SET NULL) — deleting
 *  a course must never silently delete its assignments. */
export function deleteCourse(id: number): boolean {
  return db.prepare("DELETE FROM courses WHERE id = ?").run(id).changes > 0;
}

export function isCourseStatus(v: unknown): v is CourseStatus {
  return typeof v === "string" && (COURSE_STATUSES as string[]).includes(v);
}

export function parseWeekdays(v: unknown): Weekday[] {
  if (!Array.isArray(v)) return [];
  return WEEKDAYS.filter((d) => v.includes(d));
}
