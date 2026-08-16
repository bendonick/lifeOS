import { chart } from "@/components/charts/tokens";

// §4b: a texture, not a chart. No axes, no labels, no tooltip, no dependency.
// The parent sets color (e.g. `text-personal`) — the polyline uses currentColor.

export function Sparkline({
  values,
  width = 64,
  height = 20,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length <= 1) return null; // nothing beats a broken line

  const min = Math.min(...values);
  const max = Math.max(...values);
  const inset = 2; // the line never touches the edge
  const span = max - min;
  const y = (v: number) =>
    span === 0 ? height / 2 : inset + (1 - (v - min) / span) * (height - 2 * inset);
  const x = (i: number) => (i / (values.length - 1)) * width;
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = values[values.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={chart.stroke}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={width} cy={y(last)} r={2} fill="currentColor" />
    </svg>
  );
}
