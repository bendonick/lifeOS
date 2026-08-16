import { db } from "@/lib/db";

export interface Note {
  id: number;
  text: string;
  domain: string | null;
  kind: "note" | "reminder" | "idea";
  reviewed: number;
  created_at: string;
}

/** Personal notes inbox: unreviewed first, newest within each group. */
export function personalNotes(): Note[] {
  return db
    .prepare("SELECT * FROM notes WHERE domain = 'personal' ORDER BY reviewed, created_at DESC, id DESC")
    .all() as Note[];
}

export function unreviewedPersonalCount(): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM notes WHERE domain = 'personal' AND reviewed = 0")
    .get() as { n: number };
  return row.n;
}

export function createNote(text: string): Note {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO notes (text, domain, kind) VALUES (?, 'personal', 'note')")
    .run(text);
  return db.prepare("SELECT * FROM notes WHERE id = ?").get(lastInsertRowid) as Note;
}

export function setNoteReviewed(id: number, reviewed: boolean): Note | undefined {
  db.prepare("UPDATE notes SET reviewed = ? WHERE id = ?").run(reviewed ? 1 : 0, id);
  return db.prepare("SELECT * FROM notes WHERE id = ?").get(id) as Note | undefined;
}
