import { db } from "@/lib/db";
import { addDays, mondayOf } from "@/lib/dates";

export interface HabitWeek {
  id: number;
  name: string;
  /** This calendar week, Monday → Sunday: index 0 is Monday. Days after
   *  today are always false. */
  days: boolean[];
}

/** All active habits with this calendar week's log (Monday to Sunday of
 *  `today`'s week) — one query for the whole window, not one per habit (§3). */
export function habitsWithWeek(today: string): HabitWeek[] {
  // In the order they were added: new habits go to the end. (The old
  // morning → evening ordering left with the time-of-day field; the
  // `time_of_day` column stays in the table, unread.)
  const habits = db
    .prepare("SELECT id, name FROM habits WHERE active = 1 ORDER BY id")
    .all() as Array<Pick<HabitWeek, "id" | "name">>;

  const from = mondayOf(today);
  const logs = db
    .prepare("SELECT habit_id, date FROM habit_log WHERE done = 1 AND date >= ? AND date <= ?")
    .all(from, today) as Array<{ habit_id: number; date: string }>;
  const done = new Set(logs.map((l) => `${l.habit_id}|${l.date}`));

  const dates = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  return habits.map((h) => ({ ...h, days: dates.map((d) => done.has(`${h.id}|${d}`)) }));
}

/** Toggle a day's log — upsert / delete on the (habit_id, date) unique (§3). */
export function setHabitDone(habitId: number, date: string, isDone: boolean) {
  if (isDone) {
    db.prepare("INSERT OR IGNORE INTO habit_log (habit_id, date, done) VALUES (?, ?, 1)").run(habitId, date);
  } else {
    db.prepare("DELETE FROM habit_log WHERE habit_id = ? AND date = ?").run(habitId, date);
  }
}

/** Only active habits count: a removed habit can no longer be ticked or edited. */
export function habitExists(id: number): boolean {
  return !!db.prepare("SELECT 1 AS hit FROM habits WHERE id = ? AND active = 1").get(id);
}

export function createHabit(name: string): number {
  const res = db.prepare("INSERT INTO habits (name) VALUES (?)").run(name);
  return Number(res.lastInsertRowid);
}

export function renameHabit(id: number, name: string) {
  db.prepare("UPDATE habits SET name = ? WHERE id = ?").run(name, id);
}

/** Removing a habit retires it (`active = 0`) rather than deleting the row, so
 *  its past ticks stay in `habit_log` with a name to belong to. */
export function archiveHabit(id: number) {
  db.prepare("UPDATE habits SET active = 0 WHERE id = ?").run(id);
}
