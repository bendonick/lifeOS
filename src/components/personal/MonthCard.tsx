import { Card } from "@/components/ui/Card";
import type { BudgetOverview } from "@/lib/db/money";
import type { Insight, InsightTone } from "@/lib/money/insights";

// The one hero for the Spending section, absorbing what used to be two cards.
//
// `SpendingCard` said "CHF X / Y" and `SpendGauge` said "Z CHF left"
// beside it — the same fact twice, across two thirds of the top row. A spending
// screen has to answer three questions at a glance (how much is left, how much
// has gone, what needs my attention); saying the first one twice left no room
// for the third, which was the fourth line of a paragraph.
//
// Month-scoped only, at the user's ask: no per-day allowance, no "day 12 of 30".
// The pace tick carries "am I ahead or behind" without a number that swings
// wildly in the first days of a month.
//
// The progress bar is deliberately the SAME glyph the budget rows below use —
// filled track, pace tick (decision #21). The radial ring it replaces was a
// second visual grammar for the same idea, and a tick is legible on a bar in a
// way it never was on a 132px circumference.

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

const insightTone: Record<InsightTone, string> = {
  neutral: "text-muted",
  warn: "text-warn",
  danger: "text-danger",
};

const SHOWN_INSIGHTS = 2;

export function MonthCard({ o, insights = [] }: { o: BudgetOverview; insights?: Insight[] }) {
  const monthLabel = new Date(`${o.month}-15T12:00:00Z`).toLocaleString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });

  return (
    // Bare, with a rule instead of a box: this sits inside the Spending tile,
    // and a bordered card inside a bordered tile is the nested-rectangle problem
    // the redesign exists to remove. The hierarchy comes from the numeral size.
    <Card
      label={monthLabel}
      accent="personal"
      bare
      className="lg:col-span-3 lg:border-r lg:border-border lg:pr-6"
    >
      {o.prospective ? <Prospective o={o} /> : <InFlight o={o} insights={insights} />}
    </Card>
  );
}

/**
 * Before the budget's first day. Every figure is zero and will be until
 * September, so this states the plan instead of rendering a wall of zeros with
 * a full progress bar and a pace verdict about a month that hasn't happened.
 * "Never render a status that cannot yet be true."
 */
function Prospective({ o }: { o: BudgetOverview }) {
  const days = daysUntil(o.today, `${o.month}-01`);

  return (
    <>
      <p className="mt-1 text-xs text-muted">
        starts {o.month}-01
        {days > 0 && ` · in ${days} ${days === 1 ? "day" : "days"}`}
      </p>
      <div className="tabular t-metric mt-3 text-4xl">CHF {chf.format(o.variable.budget)}</div>
      <p className="mt-1 text-xs text-muted">
        planned for variable spending · all-in {chf.format(o.allIn.budget)} a month
      </p>

      {/* What the all-in figure is made of. Before a month starts there is no
          progress to report, and this is the question that replaces it: not
          "how am I doing" but "what did I commit to". It also stops the card
          rendering as mostly empty space beside a full-height neighbour. */}
      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-3">
        {[
          ["Committed", o.tiers.fixed.budget, "a month"],
          ["Variable", o.tiers.variable.budget, "a month"],
          ["Annual", o.tiers.annual.budget / 12, "a month, smoothed"],
        ].map(([label, amount, note]) => (
          <div key={label as string}>
            <dt className="text-[11px] text-faint">{label}</dt>
            <dd className="tabular mt-0.5 text-sm">
              CHF {chf.format(amount as number)}{" "}
              <span className="text-[11px] font-normal text-faint">{note}</span>
            </dd>
          </div>
        ))}
      </dl>

      <UncategorisedLink o={o} />
    </>
  );
}

function InFlight({ o, insights }: { o: BudgetOverview; insights: Insight[] }) {
  const { spent, budget } = o.variable;
  const left = budget - spent;
  const over = spent > budget;
  const fraction = budget > 0 ? Math.min(1, spent / budget) : 0;
  const paceFraction = o.dayOfMonth / o.daysInMonth;

  // One pace verdict, from the one shared helper, used by the word and the bar
  // alike — three components once each had their own threshold and the gauge
  // read orange beside a card that read "on pace".
  const paceWord = over ? "over budget" : o.variable.pace;
  const paceTone = over ? "text-danger" : o.variable.pace === "over" ? "text-warn" : "text-muted";
  const fillClass = over ? "bg-danger" : o.variable.pace === "over" ? "bg-warn" : "bg-personal";

  return (
    <>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className={`tabular t-metric text-4xl ${over ? "text-danger" : ""}`}>
          CHF {chf.format(Math.abs(Math.round(left)))}
        </span>
        <span className={`text-xs ${paceTone}`}>{paceWord}</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {over ? "over" : "left"} of {chf.format(budget)} variable
      </p>

      <div className="relative mt-3 h-2 rounded-full bg-track">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${fillClass}`}
          style={{ width: `${fraction * 100}%` }}
        />
        {/* Same tick as the budget rows: a hairline marking where spend should
            be today. Decorative, so it takes --color-border's sibling tone
            rather than the text token. */}
        {paceFraction > 0 && paceFraction < 1 && (
          <div
            className="absolute -inset-y-0.5 w-px bg-faint"
            style={{ left: `${paceFraction * 100}%` }}
            aria-hidden="true"
          />
        )}
      </div>

      <p className="tabular mt-2 text-xs text-faint">
        {chf.format(spent)} spent · all-in {chf.format(o.allIn.spent)} / {chf.format(o.allIn.budget)}
        {o.mom && (
          <>
            {" · vs "}
            {o.mom.label}: {chf.format(Math.abs(o.mom.delta))} {o.mom.delta <= 0 ? "under" : "over"}
            {o.mom.streak > 1 && ` · ${ordinal(o.mom.streak)} month under budget`}
          </>
        )}
      </p>

      <UncategorisedLink o={o} />

      {/* "What needs my attention" gets its own place below a rule, rather than
          being the fourth line of the paragraph above it. Empty renders nothing
          — no heading, no rule, no empty slot. */}
      {insights.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-2.5">
          {insights.slice(0, SHOWN_INSIGHTS).map((i) => (
            <li key={i.id} className={`text-xs ${insightTone[i.tone]}`}>
              {i.text}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** A categorising chore is housekeeping, not urgency — warm stays reserved. */
function UncategorisedLink({ o }: { o: BudgetOverview }) {
  if (o.uncategorisedInWindow === 0) return null;
  return (
    <a href="#uncategorised" className="mt-2 inline-block text-xs text-muted hover:text-text">
      {o.uncategorisedInWindow} to categorise →
    </a>
  );
}

function daysUntil(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000));
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
