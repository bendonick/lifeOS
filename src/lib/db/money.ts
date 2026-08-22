import { db } from "@/lib/db";
import { addDays, daysInMonth, monthOf, zurichToday } from "@/lib/dates";
import { paceState, type PaceState } from "@/lib/money/pace";
import type { ParsedTxn } from "@/lib/money/parsers/types";
import type { BudgetLine } from "@/lib/types";
import { budgetStartDate, budgetWindowStart, fullHistory } from "@/lib/money/window";

// All transaction/budget persistence lives here (core rule 4: no module invents
// its own storage). Budget-facing reads clamp to budget.start_date via
// src/lib/money/window.ts; the queue below is import tooling and deliberately
// reads the full table so the year of history can be categorised at all.

export interface CategorizedTxn extends ParsedTxn {
  category: string | null;
}

export function existingDedupeKeys(keys: string[]): Set<string> {
  const found = new Set<string>();
  const lookup = db.prepare("SELECT 1 AS hit FROM transactions WHERE dedupe_key = ?");
  const all = db.transaction((ks: string[]) => {
    for (const k of ks) if (lookup.get(k)) found.add(k);
  });
  all(keys);
  return found;
}

/** Confirmed import: batch row + INSERT OR IGNORE per txn (dedupe via the
 *  partial unique index — overlapping exports must never double-count). */
export function writeImport(
  filename: string,
  source: string,
  txns: CategorizedTxn[]
): { batchId: number; inserted: number; skipped: number } {
  return db.transaction(() => {
    const { lastInsertRowid } = db
      .prepare("INSERT INTO import_batches (filename, source, row_count) VALUES (?, ?, 0)")
      .run(filename, source);
    const batchId = Number(lastInsertRowid);

    const insert = db.prepare(
      `INSERT OR IGNORE INTO transactions
         (date, amount_chf, category, merchant, note, source, batch_id, dedupe_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    let inserted = 0;
    for (const t of txns) {
      const info = insert.run(
        t.date, t.amount_chf, t.category, t.merchant, t.note, `csv:${source}`, batchId, t.dedupe_key
      );
      inserted += info.changes;
    }
    db.prepare("UPDATE import_batches SET row_count = ? WHERE id = ?").run(inserted, batchId);
    return { batchId, inserted, skipped: txns.length - inserted };
  })();
}

/** Budget-facing review count — unlike the queue, this clamps to the budget
 *  window (§5e lists it among the filtered readers). */
export function uncategorisedCountInWindow(): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM transactions WHERE category IS NULL AND date >= ?")
    .get(budgetStartDate()) as { n: number };
  return row.n;
}

/**
 * How many merchants still need a category — the Today band's attention line.
 *
 * Counted rather than derived from `merchantGroups()`, which reads and shapes
 * every merchant in the table to answer one integer. The `HAVING` clause is
 * that function's own definition of uncategorised (`MIN(COALESCE(category,''))`
 * empty = at least one row unfiled), restated so the two can never disagree
 * about the number the page shows in two places.
 */
export function uncategorisedMerchantCount(): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM (
         SELECT t.merchant FROM transactions t
         WHERE t.merchant IS NOT NULL AND TRIM(t.merchant) <> ''
         GROUP BY t.merchant
         HAVING MIN(COALESCE(t.category, '')) = ''
       )`
    )
    .get() as { n: number };
  return row.n;
}

/** Categories the queue can assign: everything mapped to a budget line, plus
 *  'transfer' and 'income', which deliberately map to no line (never spend). */
export function assignableCategories(): string[] {
  const mapped = (db.prepare("SELECT category FROM category_map ORDER BY category").all() as
    Array<{ category: string }>).map((r) => r.category);
  return [...mapped, "income", "transfer"];
}

export interface CategoryGroup {
  line: string; // budget line name — the label the user actually budgets by
  categories: string[];
}

/** The same categories, grouped by the budget line they roll into, in budget
 *  order — so category pickers speak the budget's language (user feedback
 *  2026-08-16: "map everything cleanly to that"). */
export function groupedCategories(): CategoryGroup[] {
  const rows = db
    .prepare(
      `SELECT b.name AS line, m.category
       FROM category_map m JOIN budget_lines b ON b.id = m.budget_line_id
       WHERE b.active = 1
       ORDER BY b.sort_order, m.category`
    )
    .all() as Array<{ line: string; category: string }>;
  const groups: CategoryGroup[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last?.line === r.line) last.categories.push(r.category);
    else groups.push({ line: r.line, categories: [r.category] });
  }
  groups.push({ line: "Not budgeted", categories: ["income", "transfer"] });
  return groups;
}

export interface MerchantGroup {
  merchant: string;
  count: number;
  /** Net spend as a positive number: debits add, refunds subtract. Negative
   *  means the merchant paid *you* on balance — a refund or a rebate. The
   *  Stage 2 queue summed debits only, so a merchant whose rows were all
   *  credits displayed "CHF 0" and looked like a rounding artefact. */
  total_chf: number;
  newest: string;
  category: string | null; // null = uncategorised; "" never escapes this layer
  mixed: boolean; // rows disagree — impossible via this app, possible via SQL
  proposal: CategoryProposal | null;
}

export interface CategoryProposal {
  category: string;
  confidence: "high" | "medium" | "low";
  reason: string | null;
}

/** Every merchant — the "All merchants" tab and the correction path (Stage 6).
 *  Reads the full table for the same reason the queue does: the year of history
 *  is the corpus, and a merchant filed wrongly in March is worth fixing in
 *  August. Proposals are joined in so one query feeds both tabs. */
export function merchantGroups(): MerchantGroup[] {
  const rows = db
    .prepare(
      `SELECT t.merchant AS merchant, COUNT(*) AS count,
              ROUND(SUM(-t.amount_chf), 2) AS total_chf,
              MAX(t.date) AS newest,
              MIN(COALESCE(t.category, '')) AS category,
              COUNT(DISTINCT COALESCE(t.category, '')) AS distinct_categories,
              p.category AS p_category, p.confidence AS p_confidence, p.reason AS p_reason
       FROM transactions t
       LEFT JOIN category_proposals p ON p.merchant = t.merchant
       WHERE t.merchant IS NOT NULL AND TRIM(t.merchant) <> ''
       GROUP BY t.merchant
       ORDER BY count DESC, ABS(total_chf) DESC`
    )
    .all() as Array<{
      merchant: string;
      count: number;
      total_chf: number;
      newest: string;
      category: string;
      distinct_categories: number;
      p_category: string | null;
      p_confidence: CategoryProposal["confidence"] | null;
      p_reason: string | null;
    }>;

  return rows.map((r) => ({
    merchant: r.merchant,
    count: r.count,
    total_chf: r.total_chf,
    newest: r.newest,
    category: r.category || null,
    mixed: r.distinct_categories > 1,
    proposal: r.p_category
      ? { category: r.p_category, confidence: r.p_confidence ?? "low", reason: r.p_reason }
      : null,
  }));
}

/**
 * File every one of a merchant's rows under `category`.
 *
 * Deliberately unguarded: until Stage 6 this carried `AND category IS NULL`, so
 * re-assigning an already-categorised merchant was a silent no-op and a
 * misfiling could only be fixed in SQL. That was survivable while rules were the
 * only categoriser — the user wrote them — but the assist proposes, and a
 * proposal you cannot correct is worse than no proposal. Merchant granularity is
 * the settled level (decision #42): one Migros run being a gift is not worth a
 * per-row editor.
 *
 * The proposal is dropped in the same transaction: once the user has ruled on a
 * merchant, a stale suggestion has nothing left to say.
 */
export function assignCategoryToMerchant(merchant: string, category: string): number {
  return db.transaction(() => {
    const info = db
      .prepare("UPDATE transactions SET category = ? WHERE merchant = ?")
      .run(category, merchant);
    db.prepare("DELETE FROM category_proposals WHERE merchant = ?").run(merchant);
    return info.changes;
  })();
}

// ---------------------------------------------------------------------------
// Budget overview (docs/06-stage2-brief.md §5e/§6). Every read here clamps to
// budget.start_date via budgetWindowStart(); the two deliberate exceptions —
// the labelled MoM trend and the history chart — call fullHistory() instead.

// A transaction's budget line: manual override wins, else category_map.
const LINE_OF_TXN = "COALESCE(t.budget_line_id, (SELECT m.budget_line_id FROM category_map m WHERE m.category = t.category))";
// Net spend as a positive number: debits add, refunds subtract; 'transfer' and
// 'income' never resolve to a line, so they can't reach line spend at all.
const NET_SPEND = "SUM(-t.amount_chf)";

function monthEnd(month: string): string {
  return `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;
}

/** Net spend per budget line between two dates (inclusive), keyed by line id. */
function lineSpendBetween(from: string, to: string): Map<number, number> {
  const rows = db
    .prepare(
      `SELECT ${LINE_OF_TXN} AS line_id, ${NET_SPEND} AS spent
       FROM transactions t WHERE t.date >= ? AND t.date <= ?
       GROUP BY line_id HAVING line_id IS NOT NULL`
    )
    .all(from, to) as Array<{ line_id: number; spent: number }>;
  return new Map(rows.map((r) => [r.line_id, r.spent]));
}

/** All-in net spend between two dates: everything except transfer/income —
 *  uncategorised rows are real money and count. */
function allSpendBetween(from: string, to: string): number {
  const row = db
    .prepare(
      `SELECT COALESCE(${NET_SPEND}, 0) AS spent FROM transactions t
       WHERE t.date >= ? AND t.date <= ?
         AND (t.category IS NULL OR t.category NOT IN ('transfer','income'))`
    )
    .get(from, to) as { spent: number };
  return row.spent;
}

/** Month-specific override from `budgets` (reinterpreted per decision #20):
 *  category holds a budget_lines.name. */
function monthOverride(month: string, lineName: string): number | null {
  const row = db
    .prepare("SELECT amount_chf FROM budgets WHERE month = ? AND category = ?")
    .get(month, lineName) as { amount_chf: number } | undefined;
  return row?.amount_chf ?? null;
}

export interface LineStatus extends BudgetLine {
  effective_amount: number; // month override ?? standing amount
  spent: number; // net, window-clamped: this month (fixed/variable) or this year (annual)
  carried_in: number; // carryover lines: accrued unspent since budget start (can be negative)
  paid: boolean; // fixed tier: any spend landed this month
  /** Fixed tier: this line was paid in the PREVIOUS month. The insight layer
   *  uses it to tell "rent is late" from "this line has never been paid out of
   *  this account" — ZVV and House cleaning are budgeted here but settled
   *  elsewhere, so warning about them every month would cry wolf forever. */
  paid_last_month: boolean;
}

export interface TierTotals {
  budget: number;
  spent: number;
}

export interface BudgetOverview {
  month: string; // the month shown — first budget month when today is pre-start
  today: string;
  prospective: boolean; // true while today < budget.start_date
  dayOfMonth: number;
  daysInMonth: number;
  lines: LineStatus[];
  tiers: Record<"fixed" | "variable" | "annual", TierTotals>;
  variable: { spent: number; budget: number; expected: number; pace: PaceState };
  allIn: { spent: number; budget: number }; // budget = monthly total + annual/12
  mom: { label: string; delta: number; streak: number } | null; // labelled full-history reader
  uncategorisedInWindow: number;
}

export function budgetOverview(): BudgetOverview {
  const today = zurichToday();
  const start = budgetStartDate();
  const prospective = today < start;
  // Pre-start the current calendar month is entirely outside the budget — show
  // the first budget month (labelled) instead of a meaningless empty view.
  const month = prospective ? monthOf(start) : monthOf(today);
  const mStart = `${month}-01`;
  const mEnd = monthEnd(month);
  const windowFrom = budgetWindowStart(mStart);

  const lines = db
    .prepare("SELECT * FROM budget_lines WHERE active = 1 ORDER BY sort_order, id")
    .all() as BudgetLine[];

  const monthSpend = lineSpendBetween(windowFrom, mEnd);
  // Deliberate full-history read (§5e): whether a line was paid last month is a
  // fact about the line's habits, not a budget total, and in the budget's first
  // month the previous month is entirely pre-start.
  void fullHistory();
  const prevMonth = monthOf(addDays(mStart, -1));
  const prevMonthSpend = lineSpendBetween(`${prevMonth}-01`, monthEnd(prevMonth));
  const yearSpend = lineSpendBetween(budgetWindowStart(`${month.slice(0, 4)}-01-01`), mEnd);
  // Carryover accrual: standing amount per elapsed budget month minus what was
  // actually spent since the start (historical month overrides are ignored —
  // rare, and the error is visible in the bar, not hidden in a total).
  const elapsedMonths = Math.max(
    0,
    (Number(month.slice(0, 4)) - Number(start.slice(0, 4))) * 12 +
      (Number(month.slice(5, 7)) - Number(start.slice(5, 7)))
  );
  const preMonthSpend = elapsedMonths > 0 ? lineSpendBetween(start, addDays(mStart, -1)) : new Map<number, number>();

  const statuses: LineStatus[] = lines.map((l) => {
    const spent = (l.tier === "annual" ? yearSpend.get(l.id) : monthSpend.get(l.id)) ?? 0;
    const carried_in = l.carryover
      ? l.amount_chf * elapsedMonths - (preMonthSpend.get(l.id) ?? 0)
      : 0;
    const override = l.tier === "annual" ? null : monthOverride(month, l.name);
    return {
      ...l,
      effective_amount: override ?? l.amount_chf,
      spent: Math.round(spent * 100) / 100,
      carried_in: Math.round(carried_in * 100) / 100,
      paid: l.tier === "fixed" && spent > 0,
      paid_last_month: l.tier === "fixed" && (prevMonthSpend.get(l.id) ?? 0) > 0,
    };
  });

  const tier = (t: BudgetLine["tier"]): TierTotals => {
    const of = statuses.filter((l) => l.tier === t);
    return {
      budget: of.reduce((s, l) => s + l.effective_amount, 0),
      spent: Math.round(of.reduce((s, l) => s + l.spent, 0) * 100) / 100,
    };
  };
  const tiers = { fixed: tier("fixed"), variable: tier("variable"), annual: tier("annual") };

  const dim = daysInMonth(month);
  const dayOfMonth = prospective ? 0 : Math.min(Number(today.slice(8, 10)), dim);
  const expected = tiers.variable.budget * (dayOfMonth / dim);
  const pace = paceState(tiers.variable.spent, tiers.variable.budget, dayOfMonth, dim);

  return {
    month,
    today,
    prospective,
    dayOfMonth,
    daysInMonth: dim,
    lines: statuses,
    tiers,
    variable: {
      spent: tiers.variable.spent,
      budget: tiers.variable.budget,
      expected: Math.round(expected * 100) / 100,
      pace,
    },
    allIn: {
      spent: Math.round(allSpendBetween(windowFrom, mEnd) * 100) / 100,
      budget: Math.round((tiers.fixed.budget + tiers.variable.budget + tiers.annual.budget / 12) * 100) / 100,
    },
    mom: monthOverMonth(month, prospective ? dim : dayOfMonth, start),
    uncategorisedInWindow: uncategorisedCountInWindow(),
  };
}

// The labelled month-over-month trend — one of the two deliberate full-history
// readers (§5e): compares variable-tier spend through the same day of the
// previous month, and says so when that month predates the budget.
function monthOverMonth(month: string, throughDay: number, start: string) {
  void fullHistory(); // marks the exemption; reads below are unclamped on purpose
  const prevMonth = monthOf(addDays(`${month}-01`, -1));
  const day = Math.max(1, Math.min(throughDay, daysInMonth(prevMonth)));
  const to = `${prevMonth}-${String(day).padStart(2, "0")}`;

  const variableSpend = (from: string, until: string): number => {
    const row = db
      .prepare(
        `SELECT COALESCE(${NET_SPEND}, 0) AS spent FROM transactions t
         WHERE t.date >= ? AND t.date <= ?
           AND ${LINE_OF_TXN} IN (SELECT id FROM budget_lines WHERE tier = 'variable')`
      )
      .get(from, until) as { spent: number };
    return row.spent;
  };

  const prevAny = db
    .prepare("SELECT 1 AS hit FROM transactions WHERE date >= ? AND date <= ? LIMIT 1")
    .get(`${prevMonth}-01`, monthEnd(prevMonth)) as { hit: number } | undefined;
  if (!prevAny) return null; // no prior month of data — omit rather than show zero

  const thisSpend = variableSpend(`${month}-01`, `${month}-${String(Math.max(1, throughDay)).padStart(2, "0")}`);
  const prevSpend = variableSpend(`${prevMonth}-01`, to);
  const preBudget = `${prevMonth}-01` < start;
  const label = `${new Date(`${prevMonth}-15T12:00:00Z`).toLocaleString("en-GB", { month: "short", timeZone: "UTC" })}${preBudget ? " (pre-budget)" : ""}`;

  // Streak: consecutive completed budget months under their variable budget.
  let streak = 0;
  for (let m = prevMonth; m >= monthOf(start); m = monthOf(addDays(`${m}-01`, -1))) {
    if (`${m}-01` < start) break;
    const spent = variableSpend(`${m}-01`, monthEnd(m));
    const budget = db
      .prepare("SELECT SUM(amount_chf) AS b FROM budget_lines WHERE tier = 'variable' AND active = 1")
      .get() as { b: number };
    if (spent <= (budget.b ?? 0)) streak++;
    else break;
  }

  return {
    label,
    delta: Math.round((thisSpend - prevSpend) * 100) / 100,
    streak,
  };
}

export interface VariableCategorySpend {
  category: string;
  line: string; // owning variable budget line
  spent: number;
}

/** Net spend per variable-tier leaf category for the shown month, window-
 *  clamped like every budget read. Rows exist even at zero spend so the
 *  breakdown card can show baseline ticks before the month fills in.
 *  (Category-level view: per-txn budget_line_id overrides are ignored here.) */
export function variableCategorySpend(month: string): VariableCategorySpend[] {
  const from = budgetWindowStart(`${month}-01`);
  return db
    .prepare(
      `SELECT m.category, b.name AS line, ROUND(COALESCE(s.spent, 0), 2) AS spent
       FROM category_map m
       JOIN budget_lines b ON b.id = m.budget_line_id AND b.tier = 'variable' AND b.active = 1
       LEFT JOIN (
         SELECT category, SUM(-amount_chf) AS spent FROM transactions
         WHERE date >= ? AND date <= ? GROUP BY category
       ) s ON s.category = m.category
       ORDER BY b.sort_order, spent DESC, m.category`
    )
    .all(from, monthEnd(month)) as VariableCategorySpend[];
}

// The history chart's data — the second full-history reader (§5e): net monthly
// spend across the whole table, with the budget start marked in the UI.
export interface MonthSpend {
  month: string;
  spent: number;
  /** Net spend per Food & drink leaf, for the stacked history bars. The rest of
   *  the month's spend is `spent` minus these — rendered as one neutral
   *  remainder rather than a fourth colour, because three hues is the ceiling a
   *  categorical palette reaches on this ground (decision #48). */
  byCategory: Record<string, number>;
}

const HISTORY_CATEGORIES = ["groceries", "restaurants", "bars"] as const;

export function monthlySpendHistory(): MonthSpend[] {
  const { since } = fullHistory();
  const totals = db
    .prepare(
      `SELECT substr(t.date, 1, 7) AS month, ROUND(${NET_SPEND}, 2) AS spent
       FROM transactions t
       WHERE t.date >= ? AND (t.category IS NULL OR t.category NOT IN ('transfer','income'))
       GROUP BY month ORDER BY month`
    )
    .all(since) as Array<{ month: string; spent: number }>;

  const placeholders = HISTORY_CATEGORIES.map(() => "?").join(",");
  const split = db
    .prepare(
      `SELECT substr(t.date, 1, 7) AS month, t.category AS category, ROUND(${NET_SPEND}, 2) AS spent
       FROM transactions t
       WHERE t.date >= ? AND t.category IN (${placeholders})
       GROUP BY month, t.category`
    )
    .all(since, ...HISTORY_CATEGORIES) as Array<{ month: string; category: string; spent: number }>;

  const byMonth = new Map<string, Record<string, number>>();
  for (const r of split) {
    const m = byMonth.get(r.month) ?? {};
    m[r.category] = r.spent;
    byMonth.set(r.month, m);
  }

  return totals.map((t) => ({ ...t, byCategory: byMonth.get(t.month) ?? {} }));
}

/** Manual quick-add: spend entered as a positive number, stored bank-signed. */
export function addManualTransaction(input: {
  date: string;
  amount_chf: number;
  merchant: string;
  category: string | null;
  note: string | null;
}) {
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO transactions (date, amount_chf, category, merchant, note, source) VALUES (?, ?, ?, ?, ?, 'manual')"
    )
    .run(input.date, -Math.abs(input.amount_chf), input.category, input.merchant, input.note);
  return Number(lastInsertRowid);
}

export function updateBudgetLine(
  id: number,
  patch: { amount_chf?: number; active?: boolean }
): BudgetLine | undefined {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.amount_chf !== undefined) {
    sets.push("amount_chf = ?");
    args.push(patch.amount_chf);
  }
  if (patch.active !== undefined) {
    sets.push("active = ?");
    args.push(patch.active ? 1 : 0);
  }
  if (sets.length) db.prepare(`UPDATE budget_lines SET ${sets.join(", ")} WHERE id = ?`).run(...args, id);
  return db.prepare("SELECT * FROM budget_lines WHERE id = ?").get(id) as BudgetLine | undefined;
}

/** "Just this month" edit → an override row in `budgets` (decision #20). */
export function setMonthOverride(month: string, lineName: string, amount: number) {
  db.prepare(
    `INSERT INTO budgets (month, category, amount_chf) VALUES (?, ?, ?)
     ON CONFLICT (month, category) DO UPDATE SET amount_chf = excluded.amount_chf`
  ).run(month, lineName, amount);
}
