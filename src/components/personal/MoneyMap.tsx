"use client";

import { useState } from "react";
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { moneyCategorical } from "@/components/charts/tokens";
import { Tabs } from "@/components/ui/Tabs";
import type { FlowNode, MoneyFlow } from "@/lib/money/flow";

// Where the money actually went, as a Sankey — Origin's "money map", re-rooted
// at outflow because this account has no income to root at (see lib/money/flow.ts).
//
// Colour is by budget **tier**, not by category: three hues assigned in fixed
// order from the validated money palette (decision #43), never cycled. Twenty-odd
// categories would need a palette this design system deliberately doesn't have,
// and tier is the more meaningful split anyway — it is the budget's own spine.
// Depth inside a tier is carried by ribbon opacity, not by inventing more hues.
//
// Every value is also printed in the table below the chart, so nothing here is
// reachable only by hover.

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

const TIER_COLOR: Record<FlowNode["tier"], string> = {
  fixed: moneyCategorical.fixed,
  variable: moneyCategorical.variable,
  annual: moneyCategorical.annual,
  // Root and Uncategorised are structure, not a fourth category — they take the
  // neutral border tone so they never read as another tier.
  none: "var(--color-faint)",
};

// Below this a node cannot carry a two-line label without running into its
// neighbour, so name and value share one line instead.
const STACKED_LABEL_MIN_HEIGHT = 24;

const TIER_LABEL: Record<"fixed" | "variable" | "annual", string> = {
  fixed: "Fixed",
  variable: "Variable",
  annual: "Annual",
};

type View = "map" | "table";

export function MoneyMap({ flow, label }: { flow: MoneyFlow; label: string }) {
  const [view, setView] = useState<View>("map");

  if (flow.nodes.length <= 1 || flow.total <= 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-3 py-3">
        <p className="text-xs text-muted">No spending in this period yet.</p>
      </div>
    );
  }

  // The chart draws outflow → tier → budget line and stops there.
  //
  // The category hop was built and then cut from the *chart* on looking at it:
  // Recharts lays a Sankey out by longest path, so every leaf lands in the final
  // column regardless of its logical depth — which put Rent (the largest line) beside
  // nightlife (a small one) in one column. At any sane height the small nodes were
  // sub-pixel ribbons with their labels stacked on top of each other. Three
  // columns of comparable magnitudes reads; five columns spanning three orders
  // of magnitude does not.
  //
  // Nothing is lost: the Table tab below renders every hop including categories,
  // which is also what keeps this chart honest under the no-hover-only rule.
  const data = chartSubgraph(flow);

  return (
    <section aria-labelledby="money-map-title" className="flex flex-col">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id="money-map-title" className="text-xs font-semibold tracking-wide text-muted">
          Money map <span className="font-normal text-faint">· {label}</span>
        </h3>
        <span className="tabular text-xs text-muted">CHF {chf.format(flow.total)} out</span>
      </div>

      <Tabs
        tabs={[
          { key: "map", label: "Map" },
          { key: "table", label: "Table" },
        ]}
        active={view}
        onChange={setView}
        accent="personal"
        label="money map views"
      />

      <div className="rounded-lg border border-border bg-surface p-3">
        {/* Identity is never colour-alone: the legend names each tier in text. */}
        <ul className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {(["fixed", "variable", "annual"] as const).map((t) => (
            <li key={t} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: TIER_COLOR[t] }}
              />
              {TIER_LABEL[t]}
            </li>
          ))}
        </ul>

        {view === "map" ? (
          // A Sankey needs width; below ~700px the labels collide with the
          // ribbons. Scroll the chart rather than the page (the page must never
          // scroll sideways), and give the inner box a floor.
          <div className="overflow-x-auto">
            <div className="h-[480px] min-w-[640px]">
              <ResponsiveContainer width="100%" height="100%">
                <Sankey
                  data={data}
                  nodePadding={18}
                  nodeWidth={10}
                  margin={{ top: 12, right: 168, bottom: 16, left: 8 }}
                  link={<FlowRibbon nodes={data.nodes} />}
                  node={<FlowBar nodes={data.nodes} />}
                >
                  <Tooltip content={<FlowTip />} isAnimationActive={false} />
                </Sankey>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <FlowTable flow={flow} />
        )}
      </div>
    </section>
  );
}

/** Depth 0–2 of the flow, with link indices remapped onto the kept nodes.
 *  Copies rather than the server arrays: Recharts mutates what it lays out, so
 *  handing it the rendered payload makes a re-render read half-computed
 *  geometry back as data. */
function chartSubgraph(flow: MoneyFlow): { nodes: FlowNode[]; links: MoneyFlow["links"] } {
  const remap = new Map<number, number>();
  const nodes: FlowNode[] = [];
  flow.nodes.forEach((n, i) => {
    if (n.depth > 2) return;
    remap.set(i, nodes.length);
    nodes.push({ ...n });
  });
  const links = flow.links
    .filter((l) => remap.has(l.source) && remap.has(l.target))
    .map((l) => ({ source: remap.get(l.source)!, target: remap.get(l.target)!, value: l.value }));
  return { nodes, links };
}

interface NodeShapeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: { name: string; value: number };
  nodes: FlowNode[];
  containerWidth?: number;
}

function FlowBar(props: Partial<NodeShapeProps>) {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, payload, nodes = [] } = props;
  const meta = nodes[index];
  const color = TIER_COLOR[meta?.tier ?? "none"];
  // The deepest column has no room to its right, so its label sits to the left.
  const labelLeft = (meta?.depth ?? 0) >= 3;
  const value = payload?.value ?? meta?.value ?? 0;

  // Name over value only where the node is tall enough to own two lines of
  // text. A small node next to the largest one is a couple of pixels high, so
  // its stacked label overran the node below it and the two names interleaved.
  // Below the threshold the label collapses to one line, which fits in the
  // node padding.
  const stacked = height >= STACKED_LABEL_MIN_HEIGHT;
  const labelX = labelLeft ? x - 6 : x + width + 6;
  const anchor = labelLeft ? "end" : "start";

  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.9} radius={2} />
      {stacked ? (
        <>
          <text
            x={labelX}
            y={y + height / 2}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-muted text-[10px]"
          >
            {meta?.name}
          </text>
          <text
            x={labelX}
            y={y + height / 2 + 11}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="tabular fill-faint text-[10px]"
          >
            {chf.format(value)}
          </text>
        </>
      ) : (
        <text
          x={labelX}
          y={y + height / 2}
          textAnchor={anchor}
          dominantBaseline="middle"
          className="fill-muted text-[10px]"
        >
          {meta?.name} <tspan className="tabular fill-faint">{chf.format(value)}</tspan>
        </text>
      )}
    </Layer>
  );
}

interface LinkShapeProps {
  sourceX: number;
  targetX: number;
  sourceY: number;
  targetY: number;
  sourceControlX: number;
  targetControlX: number;
  linkWidth: number;
  payload: { target: FlowNode | number; source: FlowNode | number };
  index: number;
  nodes: FlowNode[];
}

function FlowRibbon(props: Partial<LinkShapeProps>) {
  const {
    sourceX = 0,
    targetX = 0,
    sourceY = 0,
    targetY = 0,
    sourceControlX = 0,
    targetControlX = 0,
    linkWidth = 0,
    payload,
    nodes = [],
  } = props;

  // A ribbon takes its colour from where the money ENDS UP, so a tier's hue
  // reads continuously from the root outward instead of every ribbon leaving
  // the root being neutral.
  //
  // Recharts hands the link's `payload.target` as the resolved *node object*,
  // with the fields from our own data merged onto it — so `tier` is read off it
  // directly. An earlier version looked the node up by index and silently found
  // nothing, which is why every ribbon rendered grey.
  const target = payload?.target;
  const meta =
    target && typeof target === "object" && "tier" in target
      ? (target as unknown as FlowNode)
      : typeof target === "number"
        ? nodes[target]
        : undefined;
  const color = TIER_COLOR[meta?.tier ?? "none"];
  // Deeper hops sit lighter, so the eye follows the trunk first.
  const opacity = (meta?.depth ?? 1) >= 2 ? 0.3 : 0.4;

  return (
    <path
      d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={color}
      strokeWidth={Math.max(1, linkWidth)}
      strokeOpacity={opacity}
    />
  );
}

function FlowTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: unknown }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as {
    name?: string;
    value?: number;
    source?: { name: string };
    target?: { name: string };
  };
  const title = p.name ?? (p.source && p.target ? `${p.source.name} → ${p.target.name}` : "");
  if (!title) return null;
  return (
    <div className="rounded-md border border-border bg-raised px-2 py-1 text-xs">
      <span className="text-text">{title}</span>
      <span className="tabular ml-2 text-muted">CHF {chf.format(p.value ?? 0)}</span>
    </div>
  );
}

function FlowTable({ flow }: { flow: MoneyFlow }) {
  const rows = flow.links
    .map((l) => ({
      from: flow.nodes[l.source],
      to: flow.nodes[l.target],
      value: l.value,
    }))
    .sort((a, b) => a.to.depth - b.to.depth || b.value - a.value);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="py-1 pr-3 font-medium">From</th>
            <th className="py-1 pr-3 font-medium">To</th>
            <th className="py-1 text-right font-medium">CHF</th>
            <th className="py-1 pl-3 text-right font-medium">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={`${r.from.name}→${r.to.name}`}>
              <td className="py-1 pr-3 text-muted">{r.from.name}</td>
              <td className="py-1 pr-3">{r.to.name}</td>
              <td className="tabular py-1 text-right">{chf.format(r.value)}</td>
              <td className="tabular py-1 pl-3 text-right text-faint">
                {((r.value / flow.total) * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
