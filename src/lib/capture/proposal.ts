import { isDueValue, zurichToday } from "@/lib/dates";
import { isMetricKey } from "@/lib/health/metrics";
import { DOMAINS, NOTE_KINDS, TASK_TYPES, type Domain, type NoteKind, type TaskType } from "@/lib/types";

/**
 * What `scripts/capture_ingest.py` wrote into `inbox.parsed_json` for a capture
 * that hasn't been processed yet: a *proposal*, not a result. The script never
 * creates the row itself — the app applies it through `createTask` /
 * `ingestMetrics` / `createNote`, so the health-ingest quarantine (decision #17)
 * and "no module invents its own storage" survive a second language.
 *
 * The parser's schema is flat with empty-string sentinels (strict JSON-schema
 * support rules out nullable sub-objects), so every field arrives on every
 * proposal and `kind` selects which of them mean anything.
 */
export interface CaptureProposal {
  kind: "task" | "metrics" | "note" | "unknown";
  title: string;
  domain: string;
  task_type: string;
  due: string;
  note_kind: string;
  metrics: Array<{ metric: string; value: number; date: string }>;
  reason: string;
}

/** A proposal narrowed to what the app can actually act on. */
export type ActionableProposal =
  | { kind: "task"; title: string; domain: Domain; type: TaskType; due: string | null; reason: string }
  | { kind: "metrics"; rows: Array<{ metric: string; value: number; date: string }>; reason: string }
  | { kind: "note"; text: string; domain: Domain | null; noteKind: NoteKind; reason: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Read and validate a stored proposal. Anything the model got wrong — an unknown
 * metric, a due date in a shape `tasks.due` doesn't accept, a domain that isn't
 * one of the three — is dropped here rather than at the INSERT, so a bad parse
 * degrades to "no suggestion" instead of a 500 or a wrong row.
 *
 * Returns null for `unknown`, for malformed JSON, and for a row that has already
 * been processed (whose parsed_json is a result, not a proposal).
 */
export function readProposal(parsedJson: string | null, processed: number): ActionableProposal | null {
  if (!parsedJson || processed) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(parsedJson);
  } catch {
    return null;
  }
  if (!isRecord(raw)) return null;

  const str = (key: string) => (typeof raw[key] === "string" ? (raw[key] as string).trim() : "");
  const reason = str("reason");

  switch (raw.kind) {
    case "task": {
      const title = str("title");
      const domain = str("domain");
      if (!title || !DOMAINS.includes(domain as Domain)) return null;
      const type = TASK_TYPES.includes(str("task_type") as TaskType)
        ? (str("task_type") as TaskType)
        : "task";
      const due = str("due");
      return {
        kind: "task",
        title,
        domain: domain as Domain,
        type,
        due: due && isDueValue(due) ? due : null,
        reason,
      };
    }
    case "metrics": {
      const today = zurichToday();
      const rows = Array.isArray(raw.metrics)
        ? raw.metrics.filter(isRecord).flatMap((m) => {
            const metric = typeof m.metric === "string" ? m.metric : "";
            const value = typeof m.value === "number" ? m.value : NaN;
            if (!isMetricKey(metric) || !Number.isFinite(value)) return [];
            const date = typeof m.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(m.date) ? m.date : today;
            return [{ metric, value, date }];
          })
        : [];
      return rows.length ? { kind: "metrics", rows, reason } : null;
    }
    case "note": {
      const text = str("title");
      if (!text) return null;
      const domain = str("domain");
      const noteKind = str("note_kind");
      return {
        kind: "note",
        text,
        domain: DOMAINS.includes(domain as Domain) ? (domain as Domain) : null,
        noteKind: NOTE_KINDS.includes(noteKind as NoteKind) ? (noteKind as NoteKind) : "note",
        reason,
      };
    }
    default:
      return null;
  }
}
