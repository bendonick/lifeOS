import { db } from "@/lib/db";
import { courseCode } from "@/lib/academic/semester";
import { courseById } from "@/lib/db/courses";
import { projectById } from "@/lib/db/projects";
import { createTask, isDomain, weekTasks, type WeekTask } from "@/lib/db/tasks";
import { isDueValue } from "@/lib/dates";
import type { AcceptItem, PlanTask, Proposal, ProposalItem, UndoPayload } from "@/lib/plan/types";
import type { Task } from "@/lib/types";

// The hub's Week plan (decisions #82–#85). A plan item is a task with a `week`;
// raw notes and the parser's proposals live in `plan_notes`. This module is the
// only writer of both on the app side — scripts/plan_parse.py writes a proposal
// into `plan_notes` and nothing else (#84).

export type PlanNoteStatus = "pending" | "proposed" | "failed" | "accepted" | "discarded" | "undone";

export interface PlanNote {
  id: number;
  week: string;
  text: string;
  status: PlanNoteStatus;
  proposal_json: string | null;
  applied_json: string | null;
  error: string | null;
  created_at: string;
}

/** The course code or project name a task is filed under, for the label beside it. */
function contextOf(courseId: number | null, projectId: number | null): string | null {
  if (courseId !== null) {
    const course = courseById(courseId);
    if (course) return courseCode(course);
  }
  if (projectId !== null) return projectById(projectId)?.name ?? null;
  return null;
}

/** This week's plan, in the order it was written (carried and matched tasks lead). */
export function planItems(week: string): PlanTask[] {
  const rows = db.prepare("SELECT * FROM tasks WHERE week = ? ORDER BY id").all(week) as Task[];
  return rows.map((t) => ({ ...t, context: contextOf(t.course_id, t.project_id) }));
}

/** Unfinished plan items from any earlier week — what the carry-over block offers. */
export function leftoverItems(week: string): PlanTask[] {
  const rows = db
    .prepare("SELECT * FROM tasks WHERE week IS NOT NULL AND week < ? AND done = 0 ORDER BY week, id")
    .all(week) as Task[];
  return rows.map((t) => ({ ...t, context: contextOf(t.course_id, t.project_id) }));
}

/** The old "This week" rollup minus what the plan already shows, so nothing appears twice. */
export function dueSoon(week: string): WeekTask[] {
  return weekTasks().filter((t) => t.week !== week);
}

export function createNote(week: string, text: string): PlanNote {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO plan_notes (week, text) VALUES (?, ?)")
    .run(week, text);
  return noteById(Number(lastInsertRowid))!;
}

export function noteById(id: number): PlanNote | undefined {
  return db.prepare("SELECT * FROM plan_notes WHERE id = ?").get(id) as PlanNote | undefined;
}

export function setNoteStatus(id: number, status: PlanNoteStatus, error: string | null = null): void {
  db.prepare("UPDATE plan_notes SET status = ?, error = ? WHERE id = ?").run(status, error, id);
}

/**
 * The stored proposal, with the labels the draft shows filled in from the
 * database. The script stores ids only, so a course renamed between parse and
 * render still shows its current code.
 */
export function proposalOf(note: PlanNote): Proposal | null {
  if (!note.proposal_json) return null;
  let raw: { items?: unknown };
  try {
    raw = JSON.parse(note.proposal_json);
  } catch {
    return null;
  }
  if (!Array.isArray(raw.items)) return null;
  const items = (raw.items as ProposalItem[]).map((item) => ({
    ...item,
    context: contextOf(item.course_id, item.project_id),
  }));
  return { items };
}

/** Why an accept item is unusable, or null when it is fine. */
export function acceptItemError(item: AcceptItem): string | null {
  if (typeof item.title !== "string" || !item.title.trim()) return "every item needs a title";
  if (!isDomain(item.domain)) return "invalid domain";
  if (item.due !== null && (typeof item.due !== "string" || !isDueValue(item.due)))
    return "due must be YYYY-MM-DD or YYYY-MM-DDTHH:MM";
  if (item.course_id !== null && (!Number.isInteger(item.course_id) || !courseById(item.course_id)))
    return "unknown course";
  if (item.project_id !== null && (!Number.isInteger(item.project_id) || !projectById(item.project_id)))
    return "unknown project";
  if (item.match_id !== null && !Number.isInteger(item.match_id)) return "invalid match";
  if (item.group !== null && typeof item.group !== "string") return "invalid group";
  return null;
}

/**
 * Write an accepted draft into this week's plan, in one transaction. A new item
 * becomes a task; a matched item pulls the existing open task into the plan
 * (its `week` is set), so a task the user already had is never created twice.
 */
export const acceptNote = db.transaction(
  (noteId: number, week: string, items: AcceptItem[]): UndoPayload => {
    const undo: UndoPayload = { note_id: noteId, created: [], restored: [], rewound: [] };
    for (const item of items) {
      const group = item.group?.trim() ? item.group.trim().slice(0, 60) : null;
      if (item.match_id !== null) {
        const existing = db
          .prepare("SELECT id, week FROM tasks WHERE id = ? AND done = 0")
          .get(item.match_id) as { id: number; week: string | null } | undefined;
        if (existing) {
          undo.rewound.push({ id: existing.id, week: existing.week });
          db.prepare("UPDATE tasks SET week = ? WHERE id = ?").run(week, existing.id);
          continue;
        }
        // The matched task was finished or deleted since the parse: add it as new.
      }
      // A course files the item under Academic whatever the draft said.
      const domain = item.course_id !== null ? "academic" : item.domain;
      const task = createTask({
        title: item.title.trim().slice(0, 200),
        domain,
        due: item.due,
        course_id: item.course_id,
        project_id: item.project_id,
        week,
        plan_group: group,
      });
      undo.created.push(task.id);
    }
    db.prepare("UPDATE plan_notes SET status = 'accepted', applied_json = ? WHERE id = ?").run(
      JSON.stringify(undo),
      noteId
    );
    return undo;
  }
);

/**
 * Resolve last week's leftovers: `carry` ids move into `week`, `drop` ids are
 * deleted (decision #83). The deleted rows travel back in the undo payload.
 */
export const resolveLeftovers = db.transaction(
  (week: string, carry: number[], drop: number[]): UndoPayload => {
    const undo: UndoPayload = { note_id: null, created: [], restored: [], rewound: [] };
    for (const id of carry) {
      const row = db
        .prepare("SELECT id, week FROM tasks WHERE id = ? AND week IS NOT NULL AND week < ? AND done = 0")
        .get(id, week) as { id: number; week: string } | undefined;
      if (!row) continue;
      undo.rewound.push({ id: row.id, week: row.week });
      db.prepare("UPDATE tasks SET week = ? WHERE id = ?").run(week, row.id);
    }
    for (const id of drop) {
      const row = db
        .prepare("SELECT * FROM tasks WHERE id = ? AND week IS NOT NULL AND week < ? AND done = 0")
        .get(id, week) as Task | undefined;
      if (!row) continue;
      undo.restored.push(row);
      db.prepare("DELETE FROM tasks WHERE id = ?").run(row.id);
    }
    return undo;
  }
);

const TASK_COLUMNS = [
  "id", "title", "domain", "type", "due", "done", "course_id", "project_id",
  "notes", "created_at", "week", "plan_group",
] as const;

/** Reverse one apply. Each step is guarded, so undoing twice is harmless. */
export const undoApply = db.transaction((undo: UndoPayload): void => {
  for (const id of undo.created) db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  for (const { id, week } of undo.rewound) db.prepare("UPDATE tasks SET week = ? WHERE id = ?").run(week, id);
  const insert = db.prepare(
    `INSERT OR IGNORE INTO tasks (${TASK_COLUMNS.join(", ")}) VALUES (${TASK_COLUMNS.map(() => "?").join(", ")})`
  );
  for (const row of undo.restored) insert.run(...TASK_COLUMNS.map((c) => row[c] ?? null));
  if (undo.note_id !== null) setNoteStatus(undo.note_id, "undone");
});

/** True when a value has the shape /api/plan/undo accepts. */
export function isUndoPayload(v: unknown): v is UndoPayload {
  if (!v || typeof v !== "object") return false;
  const u = v as Record<string, unknown>;
  const ints = (a: unknown) => Array.isArray(a) && a.every((x) => Number.isInteger(x));
  return (
    (u.note_id === null || Number.isInteger(u.note_id)) &&
    ints(u.created) &&
    Array.isArray(u.restored) &&
    u.restored.every(
      (r) => r && typeof r === "object" && Number.isInteger((r as Task).id) && typeof (r as Task).title === "string" && isDomain((r as Task).domain)
    ) &&
    Array.isArray(u.rewound) &&
    u.rewound.every(
      (r) => r && typeof r === "object" && Number.isInteger((r as { id: unknown }).id)
    )
  );
}
