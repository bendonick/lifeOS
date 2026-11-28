import { db } from "@/lib/db";

export type StudyLogKind = "study" | "mock";

/** One logged sitting (the `study_sessions` table). */
export interface StudyLog {
  id: number;
  course_id: number | null;
  title: string;
  description: string | null;
  kind: StudyLogKind;
  date: string;
  created_at: string;
}

/** Every logged session filed under a course, newest first. */
export function studyLogs(): StudyLog[] {
  return db
    .prepare(
      "SELECT * FROM study_sessions WHERE course_id IS NOT NULL ORDER BY date DESC, created_at DESC, id DESC"
    )
    .all() as StudyLog[];
}

export function createStudyLog(input: {
  courseId: number;
  title: string;
  description: string | null;
  kind: StudyLogKind;
  date: string;
}): StudyLog {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO study_sessions (course_id, title, description, kind, date) VALUES (?, ?, ?, ?, ?)")
    .run(input.courseId, input.title, input.description, input.kind, input.date);
  return db.prepare("SELECT * FROM study_sessions WHERE id = ?").get(lastInsertRowid) as StudyLog;
}

/** True when a row was deleted. */
export function deleteStudyLog(id: number): boolean {
  return db.prepare("DELETE FROM study_sessions WHERE id = ?").run(id).changes > 0;
}
