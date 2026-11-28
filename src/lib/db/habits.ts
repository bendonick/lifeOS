import { db } from "@/lib/db";
import { addDays, mondayOf } from "@/lib/dates";

/** Where a habit sits in the list: its dragged position, else its id. */
const ORDER = "COALESCE(position, id)";

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
  // In the user's order (`position`, set by dragging); a habit never moved
  // sorts by id, the order habits were added in, and new habits go to the end.
  // (The `time_of_day` column stays in the table, unread.)
  const habits = db
    .prepare(`SELECT id, name FROM habits WHERE active = 1 ORDER BY ${ORDER}, id`)
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

/** A new habit goes to the end of the list. */
export function createHabit(name: string): number {
  const res = db
    .prepare(`INSERT INTO habits (name, position) VALUES (?, (SELECT COALESCE(MAX(${ORDER}), 0) + 1 FROM habits))`)
    .run(name);
  return Number(res.lastInsertRowid);
}

/** The active habits' ids in list order. */
export function activeHabitIds(): number[] {
  return (
    db.prepare(`SELECT id FROM habits WHERE active = 1 ORDER BY ${ORDER}, id`).all() as Array<{ id: number }>
  ).map((r) => r.id);
}

/** Store a new order: `ids` is every active habit, first to last. */
export const reorderHabits = db.transaction((ids: number[]) => {
  const set = db.prepare("UPDATE habits SET position = ? WHERE id = ?");
  ids.forEach((id, i) => set.run(i + 1, id));
});

export function renameHabit(id: number, name: string) {
  db.prepare("UPDATE habits SET name = ? WHERE id = ?").run(name, id);
}

/** Removing a habit retires it (`active = 0`) rather than deleting the row, so
 *  its past ticks stay in `habit_log` with a name to belong to. */
export function archiveHabit(id: number) {
  db.prepare("UPDATE habits SET active = 0 WHERE id = ?").run(id);
}
