// Row types for the tables Stage 1 touches; grow this file as pages come online.

export type Domain = "academic" | "personal" | "professional";
export type TaskType = "task" | "assignment" | "exam" | "meeting";

export const DOMAINS: Domain[] = ["academic", "personal", "professional"];
export const TASK_TYPES: TaskType[] = ["task", "assignment", "exam", "meeting"];

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
  parsed_json: string | null;
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
