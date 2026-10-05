import { addDays } from "@/lib/dates";
import type { Domain, TaskType } from "@/lib/types";

/**
 * Deadlines on the week grid (decision #73). Client-safe like the rest of this
 * directory — no env, no node, no SQLite — so `WeekCalendar` can filter the
 * visible week itself as it pages, with no second fetch and no new API route.
 *
 * A deadline is a *date* this system owns, not a block of time Google owns:
 * it renders in the grid's due strip, never as a slot at 23:59, and nothing
 * here is ever written back to a feed (decision #1 is untouched). The shape is
 * deliberately domain-agnostic — `context` is a course name on Academic and a
 * project name elsewhere — so the hub can adopt the same strip later by
 * passing every domain's open work instead of one's.
 */
export interface Deadline {
  id: number;
  title: string;
  type: TaskType;
  domain: Domain;
  /** The task's `due`: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' (Zurich). */
  due: string;
  /** What it is filed against — a course or project name — or null when unfiled. */
  context: string | null;
}

function dateOf(d: Deadline): string {
  return d.due.slice(0, 10);
}

function chronological(a: Deadline, b: Deadline): number {
  return a.due.localeCompare(b.due) || a.id - b.id;
}

/** Everything due on `day` ('YYYY-MM-DD'), soonest first. */
export function dueOn(items: Deadline[], day: string): Deadline[] {
  return items.filter((d) => dateOf(d) === day).sort(chronological);
}

/** Everything due in the week starting `monday`, soonest first. */
export function dueInWeek(items: Deadline[], monday: string): Deadline[] {
  const end = addDays(monday, 7);
  return items.filter((d) => dateOf(d) >= monday && dateOf(d) < end).sort(chronological);
}

/**
 * Open work whose date has passed, oldest first. Shown on every week, not
 * only the current one: overdue work has no column in any week you can page
 * to, and the week you are planning is exactly where it must not be forgotten.
 */
export function overdueBefore(items: Deadline[], today: string): Deadline[] {
  return items.filter((d) => dateOf(d) < today).sort(chronological);
}
