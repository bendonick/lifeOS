import type { MonthSpend } from "@/lib/db/money";

// The second deliberate full-history reader (§5e): monthly net spend across
// everything imported, with a visible marker separating "before tracking"
// from "budgeted". Hand-rolled SVG — it's context, not an analysis chart.

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

const W = 720;
const H = 132;
const PAD = { top: 18, right: 8, bottom: 22, left: 8 };

export function SpendingHistory({ months, startDate }: { months: MonthSpend[]; startDate: string }) {
  if (months.length < 2) return null;

  const max = Math.max(...months.map((m) => m.spent), 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / months.length;
  const barW = Math.min(40, step * 0.62);
  const startMonth = startDate.slice(0, 7);
  // Marker sits before the first budgeted month — or after the last bar while
  // all data is still pre-budget. It must be visible either way (§5e).
  const firstBudgeted = months.findIndex((m) => m.month >= startMonth);
  const markerIdx = firstBudgeted >= 0 ? firstBudgeted : months.length;
  const markerX = PAD.left + markerIdx * step;
  const labelLeft = markerX > W * 0.6;

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-baseline justify-between px-1">
        <span className="text-xs font-medium text-muted">Monthly spend · full history</span>
        <span className="text-[11px] text-faint">pre-budget months shown for context only</span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full min-w-130" role="img" aria-label="monthly spend history">
          {months.map((m, i) => {
            const h = Math.max(2, (m.spent / max) * innerH);
            const x = PAD.left + i * step + (step - barW) / 2;
            const pre = m.month < startMonth;
            return (
              <g key={m.month}>
                <rect
                  x={x}
                  y={PAD.top + innerH - h}
                  width={barW}
                  height={h}
                  rx={2}
                  className={pre ? "fill-personal/30" : "fill-personal"}
                >
                  <title>{`${m.month} · CHF ${chf.format(m.spent)}`}</title>
                </rect>
                <text
                  x={x + barW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-faint text-[9px]"
                >
                  {m.month.slice(5)}
                </text>
              </g>
            );
          })}
          <g>
            <line x1={markerX} y1={PAD.top - 6} x2={markerX} y2={PAD.top + innerH} className="stroke-warn" strokeWidth={1} />
            <text
              x={labelLeft ? markerX - 4 : markerX + 4}
              y={PAD.top - 6}
              textAnchor={labelLeft ? "end" : "start"}
              className="fill-warn text-[9px]"
            >
              budget starts {startDate}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
