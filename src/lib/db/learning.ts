import { db } from "@/lib/db";
import { zurichToday } from "@/lib/dates";
import {
  LEARNING_STATUSES,
  LEARNING_TYPES,
  type LearningItem,
  type LearningStatus,
  type LearningType,
} from "@/lib/types";

/** What you're on now, then what's queued, then the archive. Newest within each group. */
export function learningItems(): LearningItem[] {
  return db
    .prepare(
      `SELECT * FROM learning_items
       ORDER BY CASE status
                  WHEN 'in_progress' THEN 0
                  WHEN 'queued'      THEN 1
                  WHEN 'done'        THEN 2
                  ELSE 3
                END,
                created_at DESC, id DESC`
    )
    .all() as LearningItem[];
}

export function learningItemById(id: number): LearningItem | undefined {
  return db.prepare("SELECT * FROM learning_items WHERE id = ?").get(id) as LearningItem | undefined;
}

export interface LearningInput {
  name: string;
  type?: LearningType;
  status?: LearningStatus;
  link?: string | null;
  started?: string | null;
  completed?: string | null;
  notes?: string | null;
}

export function createLearningItem(input: LearningInput): LearningItem {
  const status = input.status ?? "queued";
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO learning_items (name, type, status, link, started, completed, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.type ?? "concept",
      status,
      input.link ?? null,
      input.started ?? (status === "in_progress" ? zurichToday() : null),
      input.completed ?? (status === "done" ? zurichToday() : null),
      input.notes ?? null
    );
  return learningItemById(Number(lastInsertRowid))!;
}

type LearningPatch = Partial<
  Pick<LearningItem, "name" | "type" | "status" | "link" | "started" | "completed" | "notes">
>;

/**
 * Both dates stay editable by hand (the user's call, 2026-08-17). The only
 * automatic move: flipping to Learning / Learned stamps today into an *empty*
 * date, so the common path needs no typing. A date already set is never
 * overwritten, and an explicit value in the same patch always wins.
 */
export function updateLearningItem(id: number, patch: LearningPatch): LearningItem | undefined {
  const current = learningItemById(id);
  if (!current) return undefined;

  const effective: LearningPatch = { ...patch };
  if (patch.status === "in_progress" && patch.started === undefined && current.started === null) {
    effective.started = zurichToday();
  }
  if (patch.status === "done" && patch.completed === undefined && current.completed === null) {
    effective.completed = zurichToday();
  }

  const fields = Object.keys(effective) as (keyof LearningPatch)[];
  if (fields.length > 0) {
    const set = fields.map((f) => `${f} = ?`).join(", ");
    db.prepare(`UPDATE learning_items SET ${set} WHERE id = ?`).run(
      ...fields.map((f) => effective[f]),
      id
    );
  }
  return learningItemById(id);
}

export function deleteLearningItem(id: number): boolean {
  return db.prepare("DELETE FROM learning_items WHERE id = ?").run(id).changes > 0;
}

export function isLearningType(v: unknown): v is LearningType {
  return typeof v === "string" && (LEARNING_TYPES as string[]).includes(v);
}

export function isLearningStatus(v: unknown): v is LearningStatus {
  return typeof v === "string" && (LEARNING_STATUSES as string[]).includes(v);
}
