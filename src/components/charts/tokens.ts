// Shared chart tokens (docs/06-stage2-brief.md §4a) — the single source of
// truth for both the hand-rolled SVG sparklines and the Recharts trends page.
// Nothing else defines a chart color, stroke width, or radius.

export const chart = {
  stroke: 2, // all data lines
  gridStroke: 1, // hairline, solid — never dashed
  markerMin: 8, // min hit-target-bearing marker size
  radius: 4, // rounded data-ends
  series: "var(--color-personal)", // single-series default on this page
  grid: "var(--color-border)",
  axis: "var(--color-faint)",
  label: "var(--color-muted)",
  surface: "var(--color-surface)",
} as const;
