import type { PaceState } from "@/lib/money/pace";

// What the spending card says beyond the total (Stage 6). Pure arithmetic over
// numbers the page already has: no LLM, so it is legal on the render path
// (docs/01-architecture.md), always current, and never confidently wrong.
//
// Two rules shape every insight below.
//
// An insight renders ONLY when it has something to say. Decision #28 removed a
// panel that was chrome in every state but the rare one it existed for; a line
// that reads "on pace, nothing unusual" every day is the same mistake in less
// space. When nothing fires, the card is exactly what it was before.
//
// Tone is urgency, not decoration. `danger` means the budget is already gone,
// `warn` means it will be if nothing changes. Everything informational stays
// neutral — if every line is coloured, none of them signals.
//
// Input is structural rather than `BudgetOverview` so this file imports nothing
// from src/lib/db: same reason pace.ts is standalone — a client component that
// wants an insight must not drag SQLite into the browser bundle.

export type InsightTone = "neutral" | "warn" | "danger";

export interface Insight {
  id: string;
  text: string;
  tone: InsightTone;
}

export interface InsightLine {
  name: string;
  tier: "fixed" | "variable" | "annual";
  effective_amount: number;
  spent: number;
  paid: boolean;
  paid_last_month: boolean;
}

export interface InsightCategory {
  category: string;
  line: string;
  spent: number;
}

/** The user's own monthly averages, as stored in config under budget.baseline. */
export interface InsightBaseline {
  food: Record<string, number>;
  additional: { avg: number };
}

export interface InsightInput {
  prospective: boolean; // budget hasn't started — nothing has happened yet
  dayOfMonth: number;
  daysInMonth: number;
  variable: { spent: number; budget: number; pace: PaceState };
  lines: InsightLine[];
  categories: InsightCategory[];
  baseline: InsightBaseline | null;
}

// Projecting a month from its first days is arithmetic, not information: one big
// shop on the 2nd "projects" to fifteen times the budget. Four days of evidence
// is the floor for saying anything about where the month is heading.
const MIN_DAYS_TO_PROJECT = 4;

// A fixed line is only late once the month is old enough that its absence means
// something. Before this, "unpaid" is a status that cannot yet be true.
const FIXED_LINE_LATE_AFTER_DAY = 15;

// Separator for lists of budget-line names. NOT ", " — "Transit pass,
// city zones" is one line whose own name contains a comma, so a comma-joined list
// of three lines read as four.
const LIST_SEP = " · ";

// A category has to be meaningfully AND materially above its average to be worth
// a line — 25% over a CHF 20 average is CHF 5 and nobody needs telling.
const CATEGORY_OVER_RATIO = 1.25;
const CATEGORY_OVER_MIN_CHF = 50;

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/**
 * Ranked insights, most urgent first. The caller decides how many to render —
 * the card takes two, which is what fits without turning a card into a report.
 */
export function spendingInsights(input: InsightInput): Insight[] {
  const { prospective, dayOfMonth, daysInMonth, variable, lines, categories, baseline } = input;

  // Nothing has happened yet: no pace, no runway, no unpaid bills. A prospective
  // month gets silence rather than five insights about zero.
  if (prospective || dayOfMonth <= 0 || variable.budget <= 0) return [];

  const out: Insight[] = [];
  const daysLeft = daysInMonth - dayOfMonth;
  const left = variable.budget - variable.spent;
  const perDay = variable.spent / dayOfMonth;
  const canProject = dayOfMonth >= MIN_DAYS_TO_PROJECT && variable.spent > 0;

  // 1. Already over — the one state that outranks everything else.
  if (left < 0) {
    out.push({
      id: "over",
      text:
        daysLeft > 0
          ? `CHF ${chf.format(-left)} over the variable budget with ${daysLeft} ${
              daysLeft === 1 ? "day" : "days"
            } still to go.`
          : `CHF ${chf.format(-left)} over the variable budget for the month.`,
      tone: "danger",
    });
  }

  // 2. A committed payment that hasn't landed. Fixed lines are rent-shaped: their
  //    absence late in the month is a thing to chase, not a saving.
  if (dayOfMonth > FIXED_LINE_LATE_AFTER_DAY) {
    // `paid_last_month` is the whole point of the filter: ZVV and House cleaning
    // are budgeted here but have never been paid out of this account, so an
    // unconditional check would fire on them every month forever and teach the
    // user to ignore the line that one day says "Rent".
    const unpaid = lines.filter(
      (l) => l.tier === "fixed" && !l.paid && l.paid_last_month && l.effective_amount > 0
    );
    // Wording matters here: the budget table's Fixed header reports "0 of 5
    // paid", and an insight reading "2 bills haven't been paid" beside it looks
    // like a contradiction. It isn't — the filter above is narrower than the
    // count — so the text states the narrower claim rather than the true-but-
    // incomplete one.
    if (unpaid.length === 1) {
      out.push({
        id: "unpaid",
        text: `${unpaid[0].name} (CHF ${chf.format(
          unpaid[0].effective_amount
        )}) usually lands by now — it hasn't this month.`,
        tone: "warn",
      });
    } else if (unpaid.length > 1) {
      out.push({
        id: "unpaid",
        text: `${unpaid.length} bills that usually land by now haven't: ${unpaid
          .map((l) => l.name)
          .join(LIST_SEP)}.`,
        tone: "warn",
      });
    }
  }

  // 3. Runway — the Origin-shaped question, answered as a date rather than a
  //    percentage. Only worth saying when the money actually runs out first.
  if (left >= 0 && canProject && perDay > 0) {
    const exhaustedOn = Math.ceil(variable.budget / perDay);
    if (exhaustedOn <= daysInMonth) {
      out.push({
        id: "runway",
        text: `At this pace the variable budget is spent by the ${ordinal(exhaustedOn)}.`,
        tone: "warn",
      });
    }
  }

  // 4. Which category is driving it — the "why" behind the pace, measured
  //    against the user's own history rather than against the budget.
  if (baseline) {
    const elapsed = dayOfMonth / daysInMonth;
    const averageFor = (c: InsightCategory): number | null =>
      c.line === "Additional expenses" ? null : (baseline.food[c.category] ?? null);

    const overs = categories
      .map((c) => {
        const avg = averageFor(c);
        if (avg === null || avg <= 0) return null;
        const expected = avg * elapsed;
        const delta = c.spent - expected;
        if (c.spent < expected * CATEGORY_OVER_RATIO || delta < CATEGORY_OVER_MIN_CHF) return null;
        return { category: c.category, delta };
      })
      .filter((x): x is { category: string; delta: number } => x !== null)
      .sort((a, b) => b.delta - a.delta);

    if (overs.length > 0) {
      out.push({
        id: "category",
        text: `${overs[0].category} is CHF ${chf.format(overs[0].delta)} above your usual by day ${dayOfMonth}.`,
        tone: "neutral",
      });
    }
  }

  // A fifth insight — "CHF X a day for the remaining N days" — was cut on the
  // user's call: he reads this page by the month, and a daily rate is both noise
  // and the number that swings hardest in the first days of one. `runway` keeps
  // the useful half, as a date inside the month rather than a rate.

  return out;
}
