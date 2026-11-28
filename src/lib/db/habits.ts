import { db } from "@/lib/db";
import { addDays, mondayOf } from "@/lib/dates";
import type { HabitTime } from "@/lib/personal/habits";

export interface HabitWeek {
  id: number;
  name: string;
  time_of_day: HabitTime;
  /** This calendar week, Monday → Sunday: index 0 is Monday. Days after
   *  today are always false. */
  days: boolean[];
}

/** All active habits with this calendar week's log (Monday to Sunday of
 *  `today`'s week) — one query for the whole window, not one per habit (§3). */
export function habitsWithWeek(today: string): HabitWeek[] {
  // Flat list, but still flowing morning → anytime → evening (user dropped the
  // group headers for compactness, 2026-08-16).
  const habits = db
    .prepare(
      `SELECT id, name, time_of_day FROM habits WHERE active = 1
       ORDER BY CASE time_of_day WHEN 'morning' THEN 0 WHEN 'anytime' THEN 1 ELSE 2 END, id`
    )
    .all() as Array<Pick<HabitWeek, "id" | "name" | "time_of_day">>;

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

export function createHabit(name: string, timeOfDay: HabitTime): number {
  const res = db.prepare("INSERT INTO habits (name, time_of_day) VALUES (?, ?)").run(name, timeOfDay);
  return Number(res.lastInsertRowid);
}

export function updateHabit(id: number, patch: { name?: string; time_of_day?: HabitTime }) {
  if (patch.name !== undefined) db.prepare("UPDATE habits SET name = ? WHERE id = ?").run(patch.name, id);
  if (patch.time_of_day !== undefined)
    db.prepare("UPDATE habits SET time_of_day = ? WHERE id = ?").run(patch.time_of_day, id);
}

/** Removing a habit retires it (`active = 0`) rather than deleting the row, so
 *  its past ticks stay in `habit_log` with a name to belong to. */
export function archiveHabit(id: number) {
  db.prepare("UPDATE habits SET active = 0 WHERE id = ?").run(id);
}
