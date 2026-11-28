import type { BudgetOverview } from "@/lib/db/money";
import type { Insight, InsightTone } from "@/lib/money/insights";

// The one hero for the Spending section (decisions #46/#47, relabelled in #81).
//
// Month-scoped only, at the user's ask: no per-day allowance, no "day 12 of 30".
// The pace tick carries "am I ahead or behind" without a number that swings
// wildly in the first days of a month.
//
// The progress bar is deliberately the SAME glyph the budget rows below use —
// filled track, pace tick (decision #21). Nothing here redefines a figure: the
// headline is the variable tier's budget minus its window-clamped spend, and
// the overall budget is the all-in monthly total the overview already carries
// (monthly lines plus annual/12).

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

const insightTone: Record<InsightTone, string> = {
  neutral: "text-muted",
  warn: "text-warn",
  danger: "text-danger",
};

const SHOWN_INSIGHTS = 2;

export function MonthCard({ o, insights = [] }: { o: BudgetOverview; insights?: Insight[] }) {
  return o.prospective ? <Prospective o={o} /> : <InFlight o={o} insights={insights} />;
}

/**
 * Before the budget's first day. Every figure is zero and will be until the
 * start date, so this states the plan instead of rendering a wall of zeros with
 * a full progress bar and a pace verdict about a month that hasn't happened.
 * "Never render a status that cannot yet be true."
 */
function Prospective({ o }: { o: BudgetOverview }) {
  const days = daysUntil(o.today, `${o.month}-01`);

  return (
    <div>
      <p className="text-xs text-muted">
        starts {o.month}-01
        {days > 0 && ` · in ${days} ${days === 1 ? "day" : "days"}`}
      </p>
      <div className="tabular t-metric mt-2 text-4xl">CHF {chf.format(o.variable.budget)}</div>
      <p className="mt-1 text-sm text-muted">planned for variable spending</p>

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
      <p className="tabular mt-3 text-xs text-faint">Overall budget · CHF {chf.format(o.allIn.budget)} a month</p>
    </div>
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
  const paceWord = o.variable.pace === "on pace" ? "on pace" : `${o.variable.pace} pace`;
  const paceTone = over ? "text-danger" : o.variable.pace === "over" ? "text-warn" : "text-muted";
  const fillClass = over ? "bg-danger" : o.variable.pace === "over" ? "bg-warn" : "bg-hub";

  return (
    <div>
      <span className={`tabular t-metric block text-4xl ${over ? "text-danger" : ""}`}>
        CHF {chf.format(Math.abs(Math.round(left)))}
      </span>
      {/* The pace verdict finishes the line under the figure, so it reads as a
          sentence ("Available to spend · under pace") rather than a lone word
          at the far edge. */}
      <p className="mt-1 text-sm text-muted">
        {over ? "Over the variable budget" : "Available to spend"}
        {!over && <span className={paceTone}> · {paceWord}</span>}
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

      <p className="tabular mt-2.5 text-xs text-muted">
        CHF {chf.format(spent)} spent of CHF {chf.format(budget)} variable budget
      </p>
      <p className="tabular mt-1 text-xs text-faint">
        Overall budget · CHF {chf.format(o.allIn.budget)}
        {o.allIn.spent > 0 && ` · CHF ${chf.format(o.allIn.spent)} spent all-in`}
        {o.mom && (
          <>
            {" · vs "}
            {o.mom.label}: {chf.format(Math.abs(o.mom.delta))} {o.mom.delta <= 0 ? "under" : "over"}
            {o.mom.streak > 1 && ` · ${ordinal(o.mom.streak)} month under budget`}
          </>
        )}
      </p>

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
    </div>
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
