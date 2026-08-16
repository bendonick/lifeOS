import { Card } from "@/components/ui/Card";
import type { VariableCategorySpend } from "@/lib/db/money";

// Where the variable money goes: a bar list of this month's spend per food
// leaf + the Additional envelope as one row (its baseline exists only at
// group level). Faint ticks mark the user's historical monthly averages from
// budget.baseline — the "vs your historical average" the seed was made for.
// Single hue; every value is printed, so nothing is hover-only.

export interface BaselineConfig {
  food: { groceries: number; restaurants: number; mensa: number; kiosk: number; coffee: number; total: number };
  additional: { avg: number; min: number; max: number };
}

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

interface Row {
  label: string;
  spent: number;
  baseline: number | null;
}

export function CategoryBreakdown({
  spend,
  baseline,
}: {
  spend: VariableCategorySpend[];
  baseline: BaselineConfig | null;
}) {
  const foodBase: Record<string, number> = baseline ? { ...baseline.food } : {};
  const rows: Row[] = spend
    .filter((s) => s.line === "Food & drink")
    .map((s) => ({ label: s.category, spent: s.spent, baseline: foodBase[s.category] ?? null }))
    // biggest first even before the month has spend — rank by whichever of
    // actual/baseline is larger, so groceries leads an empty September too
    .sort((a, b) => Math.max(b.spent, b.baseline ?? 0) - Math.max(a.spent, a.baseline ?? 0));

  const additional = spend.filter((s) => s.line === "Additional expenses");
  if (additional.length) {
    rows.push({
      label: "additional",
      spent: Math.round(additional.reduce((sum, s) => sum + s.spent, 0) * 100) / 100,
      baseline: baseline?.additional.avg ?? null,
    });
  }

  const max = Math.max(...rows.map((r) => Math.max(r.spent, r.baseline ?? 0)), 1);
  const nothingSpent = rows.every((r) => r.spent === 0);

  return (
    <Card label="By category" accent="personal">
      <ul className="mt-3 flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2.5">
            <span className="w-20 truncate text-xs text-muted">{r.label}</span>
            <div className="relative h-2 flex-1 rounded-full bg-raised">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-personal"
                style={{ width: `${Math.min(100, (r.spent / max) * 100)}%` }}
              />
              {/* A caret under the track, not a vertical rule — the budget
                  table's pace tick is a rule, and two identical glyphs 200px
                  apart meaning opposite things is worse than no marker. */}
              {r.baseline !== null && (
                <span
                  className="absolute -bottom-1.5 h-0 w-0 -translate-x-1/2 border-x-[3px] border-b-[4px] border-x-transparent border-b-faint"
                  style={{ left: `${Math.min(100, (r.baseline / max) * 100)}%` }}
                  aria-hidden="true"
                />
              )}
            </div>
            <span className="tabular w-16 text-right text-xs">
              {r.spent > 0 ? (
                `CHF ${chf.format(r.spent)}`
              ) : (
                <span className="text-faint">{r.baseline !== null ? `avg ${chf.format(r.baseline)}` : "—"}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] text-faint">
        ▲ marks your historical monthly average
        {nothingSpent && " · bars fill as the month is spent"}
      </p>
    </Card>
  );
}
