import { db } from "@/lib/db";
import { daysInMonth, monthOf } from "@/lib/dates";
import { fullHistory } from "@/lib/money/window";

// "What should this budget line actually be?", answered from the user's own
// history (Stage 6). Origin advertises this as an AI feature; here it is a
// median, which is the honest tool for the job — explainable, reproducible,
// free, and impossible to hallucinate.
//
// Deliberately full-history (§5e): the whole point is to read the year that
// sits BEFORE budget.start_date. Nothing here touches a budget total, and the
// caller renders the basis alongside every number so the source is never a
// mystery.
//
// Scope is the **variable tier only**, and that is a judgement, not an
// oversight:
//   * fixed lines are contracts the user already knows — and their history is
//     lumpy in a way that makes a median actively wrong (rent lands twice in
//     some months and not at all in others, so the median of this data set is
//     a little more than the rent itself);
//   * annual lines are stated per year, so a median of monthly spend is zero
//     for eleven months and a spike in the twelfth.
// The variable tier is also the one the system itself defines as the money the
// user actually decides about, which is where a proposal can change a decision.

export interface LineProposal {
  lineId: number;
  line: string;
  current: number;
  proposed: number;
  months: number;
  min: number;
  max: number;
  /** Per-category medians inside the line — the "why" behind the number. */
  breakdown: { category: string; median: number }[];
}

export interface BudgetProposal {
  months: string[]; // the complete months the medians are drawn from
  /** Months inside the date range that were dropped as too sparse to be real. */
  skippedMonths: string[];
  /** Transactions in range still uncategorised — they roll into no line, so
   *  every median below is an understatement until the queue is cleared. */
  uncategorised: number;
  proposals: LineProposal[];
}

// A month bracketed by the data range can still be missing most of its rows: the
// July 2026 export carried 6 transactions where every neighbouring month has
// 28–86. Zero-filling that month as though nothing was spent pulls every median
// down. Compare each month against the median month's row count rather than a
// hardcoded floor, so the test scales with how much the user actually spends.
const MIN_COVERAGE_RATIO = 0.25;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Months for which the transaction history covers every day.
 *
 * A partial month understates every total, and the two partial months here are
 * the first and last of the import (the data starts on the 10th and ends on the
 * 12th). Including them would drag both medians down by roughly a third of a
 * month each.
 */
function completeMonths(): { months: string[]; skipped: string[] } {
  const span = db
    .prepare("SELECT MIN(date) AS from_date, MAX(date) AS to_date FROM transactions")
    .get() as { from_date: string | null; to_date: string | null };
  if (!span.from_date || !span.to_date) return { months: [], skipped: [] };

  const firstMonth = monthOf(span.from_date);
  const lastMonth = monthOf(span.to_date);
  // A month is complete only if the data reaches its first and last day.
  const startsClean = span.from_date.endsWith("-01");
  const endsClean = Number(span.to_date.slice(8, 10)) === daysInMonth(lastMonth);

  const bracketed: string[] = [];
  for (let m = firstMonth; m <= lastMonth; m = nextMonth(m)) {
    if (m === firstMonth && !startsClean) continue;
    if (m === lastMonth && !endsClean) continue;
    bracketed.push(m);
  }

  const counts = new Map(
    (
      db
        .prepare("SELECT substr(date, 1, 7) AS month, COUNT(*) AS n FROM transactions GROUP BY month")
        .all() as Array<{ month: string; n: number }>
    ).map((r) => [r.month, r.n])
  );
  const present = bracketed.map((m) => counts.get(m) ?? 0);
  const floor = median(present) * MIN_COVERAGE_RATIO;

  const months = bracketed.filter((m) => (counts.get(m) ?? 0) >= floor);
  const skipped = bracketed.filter((m) => (counts.get(m) ?? 0) < floor);
  return { months, skipped };
}

function nextMonth(month: string): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Median monthly spend per variable budget line, with its per-category basis. */
export function proposeBudget(): BudgetProposal {
  void fullHistory(); // marks the exemption; every read below is unclamped on purpose

  const { months, skipped } = completeMonths();
  if (months.length === 0) return { months: [], skippedMonths: [], uncategorised: 0, proposals: [] };

  const from = `${months[0]}-01`;
  const to = `${months[months.length - 1]}-${daysInMonth(months[months.length - 1])}`;
  const inRange = new Set(months);

  const lines = db
    .prepare(
      "SELECT id, name, amount_chf FROM budget_lines WHERE active = 1 AND tier = 'variable' ORDER BY sort_order, id"
    )
    .all() as Array<{ id: number; name: string; amount_chf: number }>;

  // One pass: monthly spend per (line, category). Rolled up in JS rather than in
  // three SQL round trips, and the zero-fill below is why — a month in which a
  // category saw no spend is a real zero, and SQL's GROUP BY simply omits it.
  const rows = db
    .prepare(
      `SELECT substr(t.date, 1, 7) AS month, t.category AS category, m.budget_line_id AS line_id,
              ROUND(SUM(-t.amount_chf), 2) AS spent
       FROM transactions t
       JOIN category_map m ON m.category = t.category
       JOIN budget_lines b ON b.id = m.budget_line_id
       WHERE b.tier = 'variable' AND b.active = 1 AND t.date >= ? AND t.date <= ?
       GROUP BY month, t.category, m.budget_line_id`
    )
    .all(from, to) as Array<{ month: string; category: string; line_id: number; spent: number }>;

  const byLine = new Map<number, Map<string, number>>(); // line -> month -> spend
  const byCategory = new Map<string, Map<string, number>>(); // "line|cat" -> month -> spend
  for (const r of rows) {
    if (!inRange.has(r.month)) continue;
    const lm = byLine.get(r.line_id) ?? new Map<string, number>();
    lm.set(r.month, (lm.get(r.month) ?? 0) + r.spent);
    byLine.set(r.line_id, lm);

    const key = `${r.line_id}|${r.category}`;
    const cm = byCategory.get(key) ?? new Map<string, number>();
    cm.set(r.month, r.spent);
    byCategory.set(key, cm);
  }

  // Zero-fill: a month with no spend on a line is a genuine 0 in that line's
  // distribution, not a missing sample. Dropping it would bias every median up.
  const series = (m: Map<string, number> | undefined): number[] =>
    months.map((mo) => m?.get(mo) ?? 0);

  const proposals: LineProposal[] = [];
  for (const line of lines) {
    const values = series(byLine.get(line.id));
    const proposed = median(values);
    // A line with no history has nothing to propose — the Buffer/cushion line
    // owns no categories, so its median is a true zero and suggesting the user
    // budget CHF 0 for it would be noise dressed as advice.
    if (proposed <= 0) continue;

    const breakdown = [...byCategory.entries()]
      .filter(([key]) => key.startsWith(`${line.id}|`))
      .map(([key, m]) => ({ category: key.slice(key.indexOf("|") + 1), median: median(series(m)) }))
      .filter((b) => b.median > 0)
      .sort((a, b) => b.median - a.median);

    proposals.push({
      lineId: line.id,
      line: line.name,
      current: line.amount_chf,
      proposed: Math.round(proposed),
      months: months.length,
      min: Math.round(Math.min(...values)),
      max: Math.round(Math.max(...values)),
      breakdown,
    });
  }

  const uncategorised = (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM transactions WHERE category IS NULL AND date >= ? AND date <= ?"
      )
      .get(from, to) as { n: number }
  ).n;

  return { months, skippedMonths: skipped, uncategorised, proposals };
}
