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

export interface InboxItem {
  id: number;
  text: string;
  source: "app" | "phone_relay";
  created_at: string;
  processed: 0 | 1;
  parsed_json: string | null;
}
