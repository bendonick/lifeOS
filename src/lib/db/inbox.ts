import { db } from "@/lib/db";
import type { ActionableProposal } from "@/lib/capture/proposal";
import { createNote } from "@/lib/db/notes";
import { createTask, type NewTask } from "@/lib/db/tasks";
import { ingestMetrics } from "@/lib/health/ingest";
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

/**
 * Record what a capture became. Any proposal already sitting in `parsed_json`
 * is nested rather than overwritten: when a suggestion turns out to be wrong,
 * the row it produced and the parse that produced it are both still readable.
 */
function markProcessed(id: number, parsed: object) {
  const row = db.prepare("SELECT parsed_json FROM inbox WHERE id = ?").get(id) as
    | { parsed_json: string | null }
    | undefined;
  let proposal: unknown;
  if (row?.parsed_json) {
    try {
      proposal = JSON.parse(row.parsed_json);
    } catch {
      proposal = undefined;
    }
  }
  db.prepare("UPDATE inbox SET processed = 1, parsed_json = ? WHERE id = ?").run(
    JSON.stringify(proposal === undefined ? parsed : { ...parsed, proposal }),
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

export interface AcceptResult {
  action: "task" | "metrics" | "note";
  summary: string;
}

/**
 * Apply a parse proposal (decision #36). Every write goes through the module
 * that owns that table — `createTask`, `ingestMetrics`, `createNote` — so the
 * capture path gets the same validation, the same FK guards and the same
 * health-ingest quarantine as a row typed into a form.
 */
export const acceptProposal = db.transaction((id: number, proposal: ActionableProposal): AcceptResult => {
  switch (proposal.kind) {
    case "task": {
      const task = createTask({
        title: proposal.title,
        domain: proposal.domain,
        type: proposal.type,
        due: proposal.due,
      });
      markProcessed(id, { action: "task", task_id: task.id });
      return { action: "task", summary: `${proposal.type} · ${proposal.domain}` };
    }
    case "metrics": {
      const { inserted, rejected } = ingestMetrics(proposal.rows, "capture");
      markProcessed(id, {
        action: "metrics",
        metrics: proposal.rows.map((r) => r.metric),
        inserted,
        rejected,
      });
      return { action: "metrics", summary: `${inserted} metric${inserted === 1 ? "" : "s"}` };
    }
    case "note": {
      const note = createNote(proposal.text, proposal.domain, proposal.noteKind);
      markProcessed(id, { action: "note", note_id: note.id, kind: proposal.noteKind });
      return { action: "note", summary: proposal.noteKind };
    }
  }
});

export function dismissCapture(id: number) {
  markProcessed(id, { action: "dismissed" });
}

export function captureExists(id: number): boolean {
  return db.prepare("SELECT 1 FROM inbox WHERE id = ? AND processed = 0").get(id) !== undefined;
}

/** The stored proposal for one capture, or null if it has none (or is processed). */
export function captureParsedJson(id: number): { parsed_json: string | null; processed: number } | null {
  return (
    (db.prepare("SELECT parsed_json, processed FROM inbox WHERE id = ?").get(id) as
      | { parsed_json: string | null; processed: number }
      | undefined) ?? null
  );
}
