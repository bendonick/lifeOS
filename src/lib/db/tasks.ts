import { db } from "@/lib/db";
import { addDays, zurichToday } from "@/lib/dates";
import { DOMAINS, TASK_TYPES, type Domain, type Task, type TaskType } from "@/lib/types";

/**
 * The LifeOS "This week" rollup: open tasks due within the next 7 days OR overdue,
 * across all domains (the payoff of the single tasks store), soonest first.
 */
export function weekTasks(): Task[] {
  const horizon = addDays(zurichToday(), 7);
  return db
    .prepare(
      `SELECT * FROM tasks
       WHERE done = 0 AND due IS NOT NULL AND substr(due, 1, 10) <= ?
       ORDER BY due, id`
    )
    .all(horizon) as Task[];
}

/** One domain's slice of the week view (the payoff of decision #9: pages are
 *  filtered views over the single tasks store). */
export function weekTasksByDomain(domain: Domain): Task[] {
  const horizon = addDays(zurichToday(), 7);
  return db
    .prepare(
      `SELECT * FROM tasks
       WHERE done = 0 AND domain = ? AND due IS NOT NULL AND substr(due, 1, 10) <= ?
       ORDER BY due, id`
    )
    .all(domain, horizon) as Task[];
}

export function allTasks(): Task[] {
  return db.prepare("SELECT * FROM tasks ORDER BY done, due IS NULL, due, id").all() as Task[];
}

export interface NewTask {
  title: string;
  domain: Domain;
  type?: TaskType;
  due?: string | null;
  notes?: string | null;
  course_id?: number | null;
}

export function createTask(input: NewTask): Task {
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO tasks (title, domain, type, due, notes, course_id) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(
      input.title,
      input.domain,
      input.type ?? "task",
      input.due ?? null,
      input.notes ?? null,
      input.course_id ?? null
    );
  return db.prepare("SELECT * FROM tasks WHERE id = ?").get(lastInsertRowid) as Task;
}

export function updateTask(
  id: number,
  patch: Partial<Pick<Task, "title" | "domain" | "type" | "due" | "done" | "notes" | "course_id">>
): Task | undefined {
  const fields = Object.keys(patch) as (keyof typeof patch)[];
  if (fields.length > 0) {
    const set = fields.map((f) => `${f} = ?`).join(", ");
    db.prepare(`UPDATE tasks SET ${set} WHERE id = ?`).run(...fields.map((f) => patch[f]), id);
  }
  return db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
}

export function isDomain(v: unknown): v is Domain {
  return typeof v === "string" && (DOMAINS as string[]).includes(v);
}

export function isTaskType(v: unknown): v is TaskType {
  return typeof v === "string" && (TASK_TYPES as string[]).includes(v);
}

/* ---------------------------------------------------------------------------
 * Academic views (Stage 3). The single tasks store filtered three ways —
 * decision #9 again: pages are views, not silos.
 * ------------------------------------------------------------------------- */

/** A task carrying its course name, so tables don't N+1 for a label. */
export interface CourseTask extends Task {
  course_name: string | null;
}

const WITH_COURSE = `
  SELECT tasks.*, courses.name AS course_name
  FROM tasks LEFT JOIN courses ON courses.id = tasks.course_id
`;

/** Assignments & tasks (docs/03-pages/academic.md §3) — exams have their own section. */
export function academicWork(): CourseTask[] {
  return db
    .prepare(
      `${WITH_COURSE}
       WHERE tasks.domain = 'academic' AND tasks.type IN ('task','assignment')
       ORDER BY tasks.done, tasks.due IS NULL, tasks.due, tasks.id`
    )
    .all() as CourseTask[];
}

/** Exams (§4). Modelled as type='exam' only — no midterm/final split (decision #25). */
export function academicExams(): CourseTask[] {
  return db
    .prepare(
      `${WITH_COURSE}
       WHERE tasks.domain = 'academic' AND tasks.type = 'exam'
       ORDER BY tasks.done, tasks.due IS NULL, tasks.due, tasks.id`
    )
    .all() as CourseTask[];
}

/** Everything filed against one course, for the course detail view. */
export function tasksForCourse(courseId: number): CourseTask[] {
  return db
    .prepare(
      `${WITH_COURSE}
       WHERE tasks.course_id = ?
       ORDER BY tasks.done, tasks.due IS NULL, tasks.due, tasks.id`
    )
    .all(courseId) as CourseTask[];
}
