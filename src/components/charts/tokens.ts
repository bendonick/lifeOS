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

/**
 * Categorical palette — money charts only (decision #43).
 *
 * Decision #19 recorded why every chart here is single-hue: the domain accents
 * fail the dark categorical lightness band (L 0.71–0.76 against a 0.48–0.67
 * band), so a chart that colours by category had nothing safe to colour with.
 * The money map needs to separate the three budget tiers, so this is a small
 * palette scoped to that job and nothing else — the domain accents keep meaning
 * Academic / Personal / Professional everywhere they already do.
 *
 * Three slots because there are three tiers, and because a categorical palette
 * is assigned in fixed order and never cycled. Depth *inside* a tier is carried
 * by opacity on the ribbons, not by inventing a fourth hue.
 *
 * Hue choice was heavily constrained before taste got a say: green, purple and
 * blue are the domain accents, and orange and red are the reserved status
 * colours (`warn` / `danger`). Teal, magenta and amber are what was left.
 *
 * These values are validated, not chosen by eye — `dataviz`'s
 * scripts/validate_palette.js against the real dark surface (#17171b):
 *   lightness band PASS · chroma floor PASS · contrast PASS
 *   CVD all-pairs worst ΔE 12.7 (protan) / 11.7 (tritan), against a target of 8
 *   normal-vision worst ΔE 20.4, against a floor of 15
 * Dark only, because the app is dark only. Re-run the validator if a value moves.
 */
export const moneyCategorical = {
  fixed: "#0d9488",
  variable: "#c026d3",
  annual: "#c08a00",
} as const;
