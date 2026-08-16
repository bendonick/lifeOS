import { db } from "@/lib/db";
import { createTask, type NewTask } from "@/lib/db/tasks";
import type { Domain, InboxItem, Task } from "@/lib/types";

export function unprocessedCaptures(): InboxItem[] {
  return db
    .prepare("SELECT * FROM inbox WHERE processed = 0 ORDER BY created_at DESC, id DESC")
    .all() as InboxItem[];
}

export function addCapture(text: string, source: "app" | "phone_relay" = "app"): InboxItem {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO inbox (text, source) VALUES (?, ?)")
    .run(text, source);
  return db.prepare("SELECT * FROM inbox WHERE id = ?").get(lastInsertRowid) as InboxItem;
}

function markProcessed(id: number, parsed: object) {
  db.prepare("UPDATE inbox SET processed = 1, parsed_json = ? WHERE id = ?").run(
    JSON.stringify(parsed),
    id
  );
}

/** Capture → task. parsed_json records what the capture became. */
export const captureToTask = db.transaction((id: number, input: NewTask): Task => {
  const task = createTask(input);
  markProcessed(id, { action: "task", task_id: task.id });
  return task;
});

/** Capture → lightweight note (notes table; surfaces on domain pages from Stage 2). */
export const captureToNote = db.transaction((id: number, text: string, domain: Domain | null) => {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO notes (text, domain, kind) VALUES (?, ?, 'note')")
    .run(text, domain);
  markProcessed(id, { action: "note", note_id: Number(lastInsertRowid) });
});

export function dismissCapture(id: number) {
  markProcessed(id, { action: "dismissed" });
}

export function captureExists(id: number): boolean {
  return db.prepare("SELECT 1 FROM inbox WHERE id = ? AND processed = 0").get(id) !== undefined;
}
