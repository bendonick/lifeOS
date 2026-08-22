import type { MonthSpend } from "@/lib/db/money";

// The second deliberate full-history reader (§5e): monthly net spend across
// everything imported, with a visible marker separating "before tracking"
// from "budgeted". Hand-rolled SVG — it's context, not an analysis chart.

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

// Same three slots, same meaning, as the category card and the budget table.
const STACK = ["groceries", "restaurants", "bars"] as const;
const FILL: Record<string, string> = {
  groceries: "fill-cat-1",
  restaurants: "fill-cat-2",
  bars: "fill-cat-3",
};

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
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-xs font-medium text-muted">Monthly spend</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
          {STACK.map((c) => (
            <span key={c} className="flex items-center gap-1">
              <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${FILL[c].replace("fill-", "bg-")}`} />
              {c}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-cat-rest" />
            other
          </span>
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full min-w-130" role="img" aria-label="monthly spend history">
          {months.map((m, i) => {
            const h = Math.max(2, (m.spent / max) * innerH);
            const x = PAD.left + i * step + (step - barW) / 2;
            const pre = m.month < startMonth;
            // Stacked by the three food categories, with everything else as one
            // neutral remainder on top. A fourth hue is not available (decision
            // #48), and inventing one for "the rest" would claim a category that
            // doesn't exist. Pre-budget months keep their reduced opacity, so the
            // "before tracking" marker still reads.
            const segs = STACK.map((c) => ({ c, v: m.byCategory[c] ?? 0 })).filter((s) => s.v > 0);
            const named = segs.reduce((sum, s) => sum + s.v, 0);
            const rest = Math.max(0, m.spent - named);
            const parts = [...segs.map((s) => ({ fill: FILL[s.c], v: s.v })), { fill: "fill-cat-rest", v: rest }];
            let cursor = 0;
            return (
              <g key={m.month}>
                <g opacity={pre ? 0.45 : 1}>
                  {parts
                    .filter((p) => p.v > 0)
                    .map((p, idx) => {
                      const segH = (p.v / m.spent) * h;
                      const y = PAD.top + innerH - cursor - segH;
                      cursor += segH;
                      return (
                        <rect
                          key={idx}
                          x={x}
                          y={y}
                          width={barW}
                          height={Math.max(1, segH)}
                          className={p.fill}
                        />
                      );
                    })}
                </g>
                <rect x={x} y={PAD.top + innerH - h} width={barW} height={h} fill="transparent">
                  <title>{`${m.month} · CHF ${chf.format(m.spent)}`}</title>
                </rect>
                <text
                  x={x + barW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  className="fill-faint text-[10px]"
                >
                  {m.month.slice(5)}
                </text>
              </g>
            );
          })}
          <g>
            <line x1={markerX} y1={PAD.top - 6} x2={markerX} y2={PAD.top + innerH} className="stroke-faint" strokeWidth={1} />
            <text
              x={labelLeft ? markerX - 4 : markerX + 4}
              y={PAD.top - 6}
              textAnchor={labelLeft ? "end" : "start"}
              className="fill-muted text-[10px]"
            >
              budget starts {startDate}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
