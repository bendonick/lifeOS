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

export function allTasks(): Task[] {
  return db.prepare("SELECT * FROM tasks ORDER BY done, due IS NULL, due, id").all() as Task[];
}

export interface NewTask {
  title: string;
  domain: Domain;
  type?: TaskType;
  due?: string | null;
  notes?: string | null;
}

export function createTask(input: NewTask): Task {
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO tasks (title, domain, type, due, notes) VALUES (?, ?, ?, ?, ?)"
    )
    .run(input.title, input.domain, input.type ?? "task", input.due ?? null, input.notes ?? null);
  return db.prepare("SELECT * FROM tasks WHERE id = ?").get(lastInsertRowid) as Task;
}

export function updateTask(
  id: number,
  patch: Partial<Pick<Task, "title" | "domain" | "type" | "due" | "done" | "notes">>
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
