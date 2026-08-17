import { Card } from "@/components/ui/Card";
import type { BudgetOverview } from "@/lib/db/money";
import type { Insight, InsightTone } from "@/lib/money/insights";

// The §6 card: variable-tier headline (the money the user actually decides
// about), all-in as muted context, labelled MoM trend. Warm color only when
// over — if everything is colored, nothing signals.
//
// Stage 6 adds the explaining half: up to two ranked insights from
// src/lib/money/insights.ts, which returns an empty list whenever it has
// nothing worth saying. With no insights the card renders exactly as before —
// the separator and the lines both disappear rather than leaving an empty slot.

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

const insightTone: Record<InsightTone, string> = {
  neutral: "text-muted",
  warn: "text-warn",
  danger: "text-danger",
};

const SHOWN_INSIGHTS = 2;

export function SpendingCard({ o, insights = [] }: { o: BudgetOverview; insights?: Insight[] }) {
  const pct = o.variable.budget > 0 ? Math.round((o.variable.spent / o.variable.budget) * 100) : 0;
  const paceTone =
    o.variable.spent > o.variable.budget ? "text-danger" : o.variable.pace === "over" ? "text-warn" : "text-muted";

  const monthLabel = new Date(`${o.month}-15T12:00:00Z`).toLocaleString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });

  return (
    <Card label="Spending" accent="personal">
      <div className="tabular t-display mt-2 text-2xl font-semibold">
        CHF {chf.format(o.variable.spent)} <span className="text-base font-normal text-muted">/ {chf.format(o.variable.budget)}</span>
      </div>
      {o.prospective ? (
        <p className="mt-1 text-xs text-muted">
          {monthLabel} · budget starts {o.month}-01 · all-in {chf.format(o.allIn.spent)} /{" "}
          {chf.format(o.allIn.budget)}
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          {pct}% · day {o.dayOfMonth} ·{" "}
          <span className={paceTone}>{o.variable.spent > o.variable.budget ? "over budget" : o.variable.pace}</span>{" "}
          · all-in {chf.format(o.allIn.spent)} / {chf.format(o.allIn.budget)}
        </p>
      )}
      {o.mom && (
        <p className="tabular mt-1 text-xs text-faint">
          vs {o.mom.label}: CHF {chf.format(Math.abs(o.mom.delta))} {o.mom.delta <= 0 ? "under" : "over"}
          {o.mom.streak > 1 && ` · ${ordinal(o.mom.streak)} month under budget`}
        </p>
      )}
      {/* A categorising chore is housekeeping, not urgency — warm stays reserved. */}
      {o.uncategorisedInWindow > 0 && (
        <a href="#uncategorised" className="mt-1 inline-block text-xs text-muted hover:text-text">
          {o.uncategorisedInWindow} to categorise →
        </a>
      )}
      {insights.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-2">
          {insights.slice(0, SHOWN_INSIGHTS).map((i) => (
            <li key={i.id} className={`text-xs ${insightTone[i.tone]}`}>
              {i.text}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
