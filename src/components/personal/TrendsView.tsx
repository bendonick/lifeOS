"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chart } from "@/components/charts/tokens";
import { Table } from "@/components/ui/Table";
import { addDays } from "@/lib/dates";
import { METRICS, METRIC_KEYS, type MetricKey } from "@/lib/health/metrics";

// §4c. Three views over the same server-provided series:
//  * Trends — linked small multiples, one single-series chart per metric,
//    shared x domain + range selector, crosshair synced via Recharts syncId.
//    Vertical alignment is what reveals relationships — honestly.
//  * Correlation — a scatter with Pearson r and an optional 1-day lag, the
//    correct form for "do these two things relate" (never dual axes, #19).
//  * Table — no value is reachable only by hover.

type Series = Record<MetricKey, { date: string; value: number }[]>;

const RANGES = [
  ["7d", 7],
  ["30d", 30],
  ["90d", 90],
  ["all", Infinity],
] as const;
type RangeKey = (typeof RANGES)[number][0];

const VIEWS = ["Trends", "Correlation", "Table"] as const;

export function TrendsView({ series, today }: { series: Series; today: string }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>("Trends");
  const [range, setRange] = useState<RangeKey>("30d");

  const withData = METRIC_KEYS.filter((k) => series[k].length > 0);

  const rows = useMemo(() => {
    const days = RANGES.find(([k]) => k === range)![1];
    const first = withData.flatMap((k) => series[k].map((d) => d.date)).sort()[0];
    if (!first) return [];
    const from = days === Infinity ? first : addDays(today, -(days - 1));
    const byDate = new Map<string, Partial<Record<MetricKey, number>> & { date: string }>();
    for (let d = from < first && days === Infinity ? first : from; d <= today; d = addDays(d, 1)) {
      byDate.set(d, { date: d });
    }
    for (const k of withData) {
      for (const point of series[k]) {
        const row = byDate.get(point.date);
        if (row) row[k] = point.value;
      }
    }
    return [...byDate.values()];
  }, [series, withData, range, today]);

  if (withData.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-faint">
        no health data yet — log a metric or import a CSV on the Personal page
      </div>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {VIEWS.map((v) => (
            <PillButton key={v} active={view === v} onClick={() => setView(v)}>
              {v}
            </PillButton>
          ))}
        </div>
        {view !== "Correlation" && (
          <div className="flex gap-1">
            {RANGES.map(([k]) => (
              <PillButton key={k} active={range === k} onClick={() => setRange(k)}>
                {k}
              </PillButton>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        {view === "Trends" && <SmallMultiples rows={rows} metrics={withData} />}
        {view === "Correlation" && <CorrelationView series={series} metrics={withData} />}
        {view === "Table" && <TableView rows={rows} metrics={withData} />}
      </div>
    </section>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-personal/40 bg-personal/10 text-personal"
          : "border-border bg-surface text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

// --- Trends: linked small multiples -----------------------------------------

function SmallMultiples({
  rows,
  metrics,
}: {
  rows: Array<Partial<Record<MetricKey, number>> & { date: string }>;
  metrics: MetricKey[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {metrics.map((k, i) => {
        const last = i === metrics.length - 1;
        return (
          <div key={k} className="rounded-lg border border-border bg-surface p-3">
            <span className="text-xs font-medium text-personal">
              {METRICS[k].label}
              {METRICS[k].unit && <span className="text-faint"> · {METRICS[k].unit}</span>}
            </span>
            {/* container sized to include the x-axis band — no nested scrollbar */}
            <div style={{ height: last ? 150 : 120 }} className="mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} syncId="health" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={chart.grid} strokeWidth={chart.gridStroke} vertical={false} />
                  <XAxis
                    dataKey="date"
                    hide={!last}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: chart.axis, fontSize: 10 }}
                    interval="preserveStartEnd"
                    minTickGap={48}
                    tickFormatter={(d: string) => d.slice(5)}
                    height={20}
                  />
                  <YAxis
                    width={44}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: chart.axis, fontSize: 10 }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    content={<CrosshairTip metric={k} />}
                    cursor={{ stroke: chart.axis, strokeWidth: 1 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey={k}
                    stroke={chart.series}
                    strokeWidth={chart.stroke}
                    dot={false}
                    activeDot={{ r: chart.radius, stroke: chart.surface, strokeWidth: 2 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ value?: number }>;
}

function CrosshairTip({ active, label, payload, metric }: TipProps & { metric: MetricKey }) {
  if (!active || !payload?.length || payload[0].value === undefined) return null;
  return (
    <div className="tabular rounded-md border border-border bg-raised px-2 py-1 text-xs">
      <span className="text-faint">{label}</span>{" "}
      <span>
        {payload[0].value?.toFixed(METRICS[metric].precision)}
        {METRICS[metric].unit && ` ${METRICS[metric].unit}`}
      </span>
    </div>
  );
}

// --- Correlation: scatter + Pearson r ---------------------------------------

function CorrelationView({ series, metrics }: { series: Series; metrics: MetricKey[] }) {
  const [xKey, setXKey] = useState<MetricKey>(metrics[0]);
  const [yKey, setYKey] = useState<MetricKey>(metrics[1] ?? metrics[0]);
  const [lag, setLag] = useState(false);

  const points = useMemo(() => {
    const xByDate = new Map(series[xKey].map((d) => [d.date, d.value]));
    // lag: pair metric A on day d with metric B on day d+1 (sleep → next-day HRV)
    return series[yKey]
      .map((d) => ({
        x: xByDate.get(lag ? addDays(d.date, -1) : d.date),
        y: d.value,
        date: d.date,
      }))
      .filter((p): p is { x: number; y: number; date: string } => p.x !== undefined);
  }, [series, xKey, yKey, lag]);

  const r = useMemo(() => pearson(points), [points]);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <MetricSelect value={xKey} onChange={setXKey} metrics={metrics} label="x metric" />
        <span className="text-faint">vs</span>
        <MetricSelect value={yKey} onChange={setYKey} metrics={metrics} label="y metric" />
        <label className="ml-2 flex cursor-pointer items-center gap-1.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={lag}
            onChange={(e) => setLag(e.target.checked)}
            className="h-3.5 w-3.5 accent-personal"
          />
          lag {METRICS[yKey].label} by 1 day
        </label>
        <span className="tabular ml-auto text-xs text-muted">
          {points.length < 3 || r === null ? `n = ${points.length} · too few paired days` : `r = ${r.toFixed(2)} · n = ${points.length}`}
        </span>
      </div>

      <div style={{ height: 340 }} className="mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid stroke={chart.grid} strokeWidth={chart.gridStroke} />
            <XAxis
              type="number"
              dataKey="x"
              name={METRICS[xKey].label}
              domain={["auto", "auto"]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: chart.axis, fontSize: 10 }}
              label={{ value: METRICS[xKey].label, position: "insideBottom", dy: 18, fill: chart.label, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={METRICS[yKey].label}
              domain={["auto", "auto"]}
              width={48}
              tickLine={false}
              axisLine={false}
              tick={{ fill: chart.axis, fontSize: 10 }}
              label={{ value: METRICS[yKey].label, angle: -90, position: "insideLeft", fill: chart.label, fontSize: 11 }}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{ stroke: chart.axis, strokeWidth: 1 }}
              content={({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: { date: string; x: number; y: number } }> }) => {
                const p = payload?.[0]?.payload;
                if (!active || !p) return null;
                return (
                  <div className="tabular rounded-md border border-border bg-raised px-2 py-1 text-xs">
                    <span className="text-faint">{p.date}</span> {METRICS[xKey].label} {p.x} · {METRICS[yKey].label} {p.y}
                  </div>
                );
              }}
            />
            {/* dots ≥ r4 with a 2px surface ring (§4c) — explicit shape because
                Recharts sizes Scatter symbols by area, not radius */}
            <Scatter
              data={points}
              isAnimationActive={false}
              shape={(props: { cx?: number; cy?: number }) => (
                <circle cx={props.cx} cy={props.cy} r={5} fill={chart.series} stroke={chart.surface} strokeWidth={2} />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MetricSelect({
  value,
  onChange,
  metrics,
  label,
}: {
  value: MetricKey;
  onChange: (k: MetricKey) => void;
  metrics: MetricKey[];
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as MetricKey)}
      aria-label={label}
      className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
    >
      {metrics.map((k) => (
        <option key={k} value={k}>
          {METRICS[k].label}
        </option>
      ))}
    </select>
  );
}

function pearson(points: Array<{ x: number; y: number }>): number | null {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (const p of points) {
    cov += (p.x - mx) * (p.y - my);
    vx += (p.x - mx) ** 2;
    vy += (p.y - my) ** 2;
  }
  if (vx === 0 || vy === 0) return null;
  return cov / Math.sqrt(vx * vy);
}

// --- Table: nothing is hover-only -------------------------------------------

function TableView({
  rows,
  metrics,
}: {
  rows: Array<Partial<Record<MetricKey, number>> & { date: string }>;
  metrics: MetricKey[];
}) {
  const withValues = rows.filter((r) => metrics.some((k) => r[k] !== undefined)).reverse();
  return (
    <Table columns={["Date", ...metrics.map((k) => METRICS[k].label)]} empty="no values in this range">
      {withValues.map((r) => (
        <tr key={r.date}>
          <td className="tabular px-3 py-2 text-xs text-muted">{r.date}</td>
          {metrics.map((k) => (
            <td key={k} className="tabular px-3 py-2 text-sm">
              {r[k] !== undefined ? r[k]!.toFixed(METRICS[k].precision) : <span className="text-faint">—</span>}
            </td>
          ))}
        </tr>
      ))}
    </Table>
  );
}
