// The single definition of "behind / on / ahead of pace" (brief §6: a ±5% dead
// band). Every surface that colors by pace — the spending card, the gauge ring,
// and every budget bar — calls this.
//
// It exists because they each had their own threshold: the card used the ±5%
// band from the server while the gauge and the bars flared warm at anything
// above the straight line, so mid-month the ring could read "over" in orange
// while the card beside it read "on pace" in grey.
//
// Pure and dependency-free on purpose — the budget table is a client component,
// so this cannot live in lib/db/money.ts (that would pull SQLite into the
// browser bundle).

export type PaceState = "under" | "on pace" | "over";

export function paceState(
  spent: number,
  budget: number,
  dayOfMonth: number,
  daysInMonth: number
): PaceState {
  if (budget > 0 && spent > budget) return "over";
  // Before the month starts there is no pace to be ahead of.
  if (budget <= 0 || dayOfMonth <= 0 || daysInMonth <= 0) return "on pace";
  const expected = budget * (dayOfMonth / daysInMonth);
  if (expected <= 0) return "on pace";
  const ratio = spent / expected;
  if (ratio > 1.05) return "over";
  if (ratio < 0.95) return "under";
  return "on pace";
}
