import { getConfig } from "@/lib/db/config";

// The budget-start rule (docs/06-stage2-brief.md §5e, decision #23): the budget
// begins on budget.start_date; everything imported from before it is history.
// EVERY budget-facing query — spending card, pace math, budget-line bars, tier
// subtotals, uncategorised review count — must clamp its window with
// budgetWindowStart(). The only readers allowed past it are the labelled
// month-over-month trend and the history chart, which call fullHistory()
// so their exemption is visible at the call site.

export function budgetStartDate(): string {
  // Missing config would silently include a year of pre-budget history; that is
  // exactly the bug this helper exists to prevent, so fail loudly instead.
  const date = getConfig("budget.start_date");
  if (!date) throw new Error("config key budget.start_date is missing");
  return date;
}

// Start of the queried window, clamped to the budget start. Pass the natural
// window start (e.g. first of the current month); get back the later of the two.
export function budgetWindowStart(windowStart: string): string {
  const start = budgetStartDate();
  return windowStart > start ? windowStart : start;
}

// Deliberate, self-documenting escape hatch for the two exempt readers.
export function fullHistory(): { since: string } {
  return { since: "0000-00-00" };
}
