import { Card } from "@/components/ui/Card";
import type { BudgetOverview } from "@/lib/db/money";

// "Left to spend" radial — a hero number with a single-fraction progress ring
// (variable tier only, like the card headline). One hue by design: a
// multi-segment donut would need a categorical palette the domain accents
// can't provide on dark (decision #19's palette note). The ring carries the
// same pace semantics as the budget bars: warn when ahead of pace, danger
// past 100%, and a tick marking where today *should* be.

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

const SIZE = 132;
const R = 52;
const STROKE = 12;
const C = 2 * Math.PI * R;

export function SpendGauge({ o }: { o: BudgetOverview }) {
  const { spent, budget } = o.variable;
  const frac = budget > 0 ? Math.min(1, spent / budget) : 0;
  const left = budget - spent;
  const over = spent > budget;
  const paceFraction = o.prospective ? 0 : o.dayOfMonth / o.daysInMonth;
  const ahead = !o.prospective && paceFraction > 0 && frac > paceFraction + 0.001;
  const ringClass = over ? "text-danger" : ahead ? "text-warn" : "text-personal";

  // pace tick: a short radial segment at the expected-by-today angle
  const tickAngle = 2 * Math.PI * paceFraction - Math.PI / 2;
  const tick = {
    x1: SIZE / 2 + (R - STROKE / 2 - 2) * Math.cos(tickAngle),
    y1: SIZE / 2 + (R - STROKE / 2 - 2) * Math.sin(tickAngle),
    x2: SIZE / 2 + (R + STROKE / 2 + 2) * Math.cos(tickAngle),
    y2: SIZE / 2 + (R + STROKE / 2 + 2) * Math.sin(tickAngle),
  };

  return (
    <Card label="Left to spend" accent="personal">
      <div className="mt-2 flex items-center justify-center">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              strokeWidth={STROKE}
              className="stroke-raised"
            />
            {frac > 0 && (
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${frac * C} ${C}`}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                className={ringClass}
              />
            )}
            {paceFraction > 0 && (
              <line {...tick} strokeWidth={1.5} className="stroke-faint" />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tabular text-xl font-semibold">
              {chf.format(Math.abs(Math.round(left)))}
            </span>
            <span className={`text-[11px] ${over ? "text-danger" : "text-muted"}`}>
              {over ? "CHF over" : "CHF left"}
            </span>
          </div>
        </div>
      </div>
      <p className="tabular mt-2 text-center text-xs text-muted">
        {o.prospective
          ? `of ${chf.format(budget)} · month starts ${o.month}-01`
          : `of ${chf.format(budget)} · ${Math.round(frac * 100)}% spent by day ${o.dayOfMonth}`}
      </p>
    </Card>
  );
}
