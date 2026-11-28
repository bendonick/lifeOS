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
  /** 1 when flagged to go over again (decision #102). */
  review: 0 | 1;
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
  review: boolean;
}): StudyLog {
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO study_sessions (course_id, title, description, kind, date, review) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(input.courseId, input.title, input.description, input.kind, input.date, input.review ? 1 : 0);
  return db.prepare("SELECT * FROM study_sessions WHERE id = ?").get(lastInsertRowid) as StudyLog;
}

/** Rewrite a logged session's text and kind, and its review flag when given;
 *  its course and day stay. */
export function updateStudyLog(
  id: number,
  input: { title: string; description: string | null; kind: StudyLogKind; review?: boolean }
): StudyLog | undefined {
  db.prepare("UPDATE study_sessions SET title = ?, description = ?, kind = ? WHERE id = ?").run(
    input.title,
    input.description,
    input.kind,
    id
  );
  if (input.review !== undefined) setStudyLogReview(id, input.review);
  return db.prepare("SELECT * FROM study_sessions WHERE id = ?").get(id) as StudyLog | undefined;
}

/** Flag a logged session to go over again, or clear the flag. */
export function setStudyLogReview(id: number, review: boolean): StudyLog | undefined {
  db.prepare("UPDATE study_sessions SET review = ? WHERE id = ?").run(review ? 1 : 0, id);
  return db.prepare("SELECT * FROM study_sessions WHERE id = ?").get(id) as StudyLog | undefined;
}

/** True when a row was deleted. */
export function deleteStudyLog(id: number): boolean {
  return db.prepare("DELETE FROM study_sessions WHERE id = ?").run(id).changes > 0;
}
