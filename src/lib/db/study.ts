import { db } from "@/lib/db";

export type StudyLogKind = "study" | "mock";

/** One logged sitting (the `study_sessions` table). */
export interface StudyLog {
  id: number;
  course_id: number | null;
  concept: string;
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

export function createStudyLog(courseId: number, concept: string, kind: StudyLogKind, date: string): StudyLog {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO study_sessions (course_id, concept, kind, date) VALUES (?, ?, ?, ?)")
    .run(courseId, concept, kind, date);
  return db.prepare("SELECT * FROM study_sessions WHERE id = ?").get(lastInsertRowid) as StudyLog;
}

/** True when a row was deleted. */
export function deleteStudyLog(id: number): boolean {
  return db.prepare("DELETE FROM study_sessions WHERE id = ?").run(id).changes > 0;
}
