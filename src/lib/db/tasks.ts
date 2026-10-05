import { db } from "@/lib/db";
import type { Deadline } from "@/lib/calendar/deadlines";
import { addDays, zurichToday } from "@/lib/dates";
import { DOMAINS, TASK_TYPES, type Domain, type Task, type TaskType } from "@/lib/types";

/** A task with the course it is filed against, for the code the hub shows beside it. */
export interface WeekTask extends Task {
  course_name: string | null;
  course_short_name: string | null;
}

/**
 * The LifeOS "This week" rollup: open tasks due within the next 7 days OR overdue,
 * across all domains (the payoff of the single tasks store), soonest first. Each
 * row carries its course's name and short name so the hub can say "Stage 1 ·
 * ATAI" without a second query — on a page that shows every domain, the title
 * alone does not say which course a stage belongs to.
 */
export function weekTasks(): WeekTask[] {
  const horizon = addDays(zurichToday(), 7);
  return db
    .prepare(
      `SELECT tasks.*, courses.name AS course_name, courses.short_name AS course_short_name
       FROM tasks LEFT JOIN courses ON courses.id = tasks.course_id
       WHERE tasks.done = 0 AND tasks.due IS NOT NULL AND substr(tasks.due, 1, 10) <= ?
       ORDER BY tasks.due, tasks.id`
    )
    .all(horizon) as WeekTask[];
}

/**
 * One domain's slice of the week view (the payoff of decision #9: pages are
 * filtered views over the single tasks store) — plus every open *appointment*,
 * however far out it sits.
 *
 * `length(due) > 10` is "this row carries a time", which is the whole of how an
 * appointment is distinguished from a task: no tag, no enum value, just the
 * shape of the value. A haircut booked three weeks out used to be typed in and
 * then vanish until the week it happened, which is not somewhere you can keep a
 * commitment.
 */
export function weekTasksByDomain(domain: Domain): Task[] {
  const horizon = addDays(zurichToday(), 7);
  return db
    .prepare(
      `SELECT * FROM tasks
       WHERE done = 0 AND domain = ? AND due IS NOT NULL
         AND (substr(due, 1, 10) <= ? OR length(due) > 10)
       ORDER BY due, id`
    )
    .all(domain, horizon) as Task[];
}

/**
 * Open, dated work for the week grid's due strip (decision #73) — assignments,
 * tasks and exams alike, with the course or project it is filed against as a
 * label. One domain when asked, every domain when not: the hub can adopt the
 * same strip later by calling this with no argument, which is the whole of
 * the wiring it would need.
 */
export function openDeadlines(domain?: Domain): Deadline[] {
  const where = domain ? "AND tasks.domain = ?" : "";
  return db
    .prepare(
      `SELECT tasks.id, tasks.title, tasks.type, tasks.domain, tasks.due,
              COALESCE(courses.name, projects.name) AS context
       FROM tasks
       LEFT JOIN courses  ON courses.id  = tasks.course_id
       LEFT JOIN projects ON projects.id = tasks.project_id
       WHERE tasks.done = 0 AND tasks.due IS NOT NULL ${where}
       ORDER BY tasks.due, tasks.id`
    )
    .all(...(domain ? [domain] : [])) as Deadline[];
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
  project_id?: number | null;
}

export function createTask(input: NewTask): Task {
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO tasks (title, domain, type, due, notes, course_id, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      input.title,
      input.domain,
      input.type ?? "task",
      input.due ?? null,
      input.notes ?? null,
      input.course_id ?? null,
      input.project_id ?? null
    );
  return db.prepare("SELECT * FROM tasks WHERE id = ?").get(lastInsertRowid) as Task;
}

export function updateTask(
  id: number,
  patch: Partial<
    Pick<Task, "title" | "domain" | "type" | "due" | "done" | "notes" | "course_id" | "project_id">
  >
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

/* ---------------------------------------------------------------------------
 * Professional views (Stage 4). Decision #9 once more: the same store, filtered.
 * ------------------------------------------------------------------------- */

/** Open work for one project, soonest first — undated last, which is what
 *  "soonest first" has to mean when `due` is nullable. */
export function openTasksForProject(projectId: number): Task[] {
  return db
    .prepare(
      `SELECT * FROM tasks
       WHERE project_id = ? AND done = 0
       ORDER BY due IS NULL, due, id`
    )
    .all(projectId) as Task[];
}

/** Everything filed against one project, for the project detail view. */
export function tasksForProject(projectId: number): Task[] {
  return db
    .prepare(
      `SELECT * FROM tasks
       WHERE project_id = ?
       ORDER BY done, due IS NULL, due, id`
    )
    .all(projectId) as Task[];
}
