import type { BaselineConfig } from "@/components/personal/CategoryBreakdown";

/**
 * The right half of Spending (decision #81): what a month usually costs, by
 * category, from `budget.baseline` — the historical averages the budget was
 * proposed from. Labelled as history on the surface, because beside a live
 * "available to spend" figure a row of amounts reads as this month unless told
 * otherwise. One hue and one scale: these are magnitudes of one kind.
 */
const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function CategoryAverages({ baseline }: { baseline: BaselineConfig | null }) {
  if (!baseline) return <p className="text-sm text-muted">No spending history yet.</p>;

  const rows = Object.entries(baseline.food)
    .filter(([k]) => k !== "total")
    .map(([k, v]) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: v }))
    .sort((a, b) => b.value - a.value);
  rows.push({ label: "Additional expenses", value: baseline.additional.avg });
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div>
      <p className="text-xs text-muted">
        Monthly category averages <span className="text-faint">(historical)</span>
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-sm text-text">{r.label}</span>
            <div
              role="img"
              aria-label={`${r.label}: CHF ${chf.format(r.value)} a month on average`}
              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-track"
            >
              <div className="h-full rounded-full bg-hub/80" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
            <span className="tabular w-20 shrink-0 text-right text-sm text-text">CHF {chf.format(r.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
