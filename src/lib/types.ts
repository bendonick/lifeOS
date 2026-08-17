// Row types for the tables Stage 1 touches; grow this file as pages come online.

export type Domain = "academic" | "personal" | "professional";
export type TaskType = "task" | "assignment" | "exam" | "meeting";

// The `notes.kind` enum, hoisted here in Stage 5 so the capture parser and the
// notes module validate against one list rather than two.
export type NoteKind = "note" | "reminder" | "idea";

export const DOMAINS: Domain[] = ["academic", "personal", "professional"];
export const TASK_TYPES: TaskType[] = ["task", "assignment", "exam", "meeting"];
export const NOTE_KINDS: NoteKind[] = ["note", "reminder", "idea"];

export interface Task {
  id: number;
  title: string;
  domain: Domain;
  type: TaskType;
  due: string | null; // 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM', Europe/Zurich
  done: 0 | 1;
  course_id: number | null;
  project_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  date: string; // 'YYYY-MM-DD'
  amount_chf: number; // bank-signed: debits negative, credits positive
  category: string | null;
  merchant: string | null;
  note: string | null;
  source: string | null; // manual | csv:<bank>
  batch_id: number | null;
  dedupe_key: string | null;
  budget_line_id: number | null;
  created_at: string;
}

export interface BudgetLine {
  id: number;
  name: string;
  tier: "fixed" | "variable" | "annual";
  amount_chf: number;
  carryover: 0 | 1;
  sort_order: number;
  active: 0 | 1;
  notes: string | null;
}

export interface InboxItem {
  id: number;
  text: string;
  source: "app" | "phone_relay";
  created_at: string;
  processed: 0 | 1;
  // While unprocessed: the parser's proposal (src/lib/capture/proposal.ts).
  // Once processed: what the capture became, with the proposal nested inside.
  parsed_json: string | null;
  // The iOS Shortcut's capture id; null for captures typed into the app.
  external_id: string | null;
}

export type CourseStatus = "enrolled" | "completed" | "dropped";
export const COURSE_STATUSES: CourseStatus[] = ["enrolled", "completed", "dropped"];

/** Mon–Fri only: `courses.schedule_days` holds a JSON subset of these (architecture §data). */
export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
export const WEEKDAYS: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export interface Course {
  id: number;
  name: string;
  professor: string | null;
  professor_email: string | null;
  credits: number | null;
  room: string | null;
  status: CourseStatus;
  /** JSON array of Weekday — read it through `scheduleDays()`, never JSON.parse inline. */
  schedule_days: string | null;
  time_label: string | null;
  start_hour: number | null;
  end_hour: number | null;
  term_start: string | null;
  term_end: string | null;
  semester: string | null;
  created_at: string;
}

/* ---------------------------------------------------------------------------
 * Professional (Stage 4). Projects, the AI/RL learning list, and the network CRM.
 * ------------------------------------------------------------------------- */

export type ProjectStatus = "active" | "paused" | "done";
export const PROJECT_STATUSES: ProjectStatus[] = ["active", "paused", "done"];

export interface Project {
  id: number;
  name: string;
  domain: Domain;
  status: ProjectStatus;
  deadline: string | null; // 'YYYY-MM-DD'
  notes: string | null;
  created_at: string;
}

/** Concept first — it's the default reach (docs/03-pages/professional.md §3). */
export type LearningType = "concept" | "course" | "paper" | "book" | "module" | "video";
export const LEARNING_TYPES: LearningType[] = ["concept", "course", "paper", "book", "module", "video"];

export type LearningStatus = "queued" | "in_progress" | "done" | "dropped";
export const LEARNING_STATUSES: LearningStatus[] = ["queued", "in_progress", "done", "dropped"];

/**
 * The user's words for the stored enum, decided 2026-08-17: he asked for
 * "not learned / learning / learned". One owner for the mapping so no surface
 * invents its own wording.
 */
export const LEARNING_STATUS_LABEL: Record<LearningStatus, string> = {
  queued: "Not learned",
  in_progress: "Learning",
  done: "Learned",
  dropped: "Dropped",
};

export interface LearningItem {
  id: number;
  name: string;
  type: LearningType;
  status: LearningStatus;
  link: string | null;
  started: string | null; // 'YYYY-MM-DD'
  completed: string | null; // 'YYYY-MM-DD'
  notes: string | null;
  created_at: string;
}

/** `contacts.how_met` is open TEXT on purpose — these are offered, not enforced. */
export const HOW_MET: string[] = ["Conference", "Intro", "Work", "Online", "University"];

export interface Contact {
  id: number;
  name: string;
  company: string | null;
  role: string | null;
  how_met: string | null;
  linkedin: string | null;
  last_contacted: string | null; // 'YYYY-MM-DD'
  followup_interval_days: number | null;
  notes: string | null;
  created_at: string;
}

export interface ContactInteraction {
  id: number;
  contact_id: number;
  date: string; // 'YYYY-MM-DD' — when it happened, not when it was logged
  note: string | null;
  created_at: string;
}
