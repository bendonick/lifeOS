import { Card } from "@/components/ui/Card";
import type { BudgetOverview } from "@/lib/db/money";

// The §6 card: variable-tier headline (the money the user actually decides
// about), all-in as muted context, labelled MoM trend. Warm color only when
// over — if everything is colored, nothing signals.

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function SpendingCard({ o }: { o: BudgetOverview }) {
  const pct = o.variable.budget > 0 ? Math.round((o.variable.spent / o.variable.budget) * 100) : 0;
  const paceTone =
    o.variable.spent > o.variable.budget ? "text-danger" : o.variable.pace === "over" ? "text-warn" : "text-muted";

  const monthLabel = new Date(`${o.month}-15T12:00:00Z`).toLocaleString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });

  return (
    <Card label="Spending" accent="personal">
      <div className="tabular mt-2 text-2xl font-semibold">
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
      {o.uncategorisedInWindow > 0 && (
        <p className="mt-1 text-xs text-warn">{o.uncategorisedInWindow} to categorise</p>
      )}
    </Card>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
