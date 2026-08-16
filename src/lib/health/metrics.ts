// The canonical metric registry (docs/06-stage2-brief.md §2). Nothing else in
// the app may hardcode a metric name — read from here. `aggregate: "sum"`
// means multiple rows on one date add up (macros logged per meal); everything
// else takes the latest row for that date.

export const METRICS = {
  sleep_score: { label: "Sleep", unit: "", precision: 0, higherIsBetter: true },
  hrv: { label: "HRV", unit: "ms", precision: 0, higherIsBetter: true },
  steps: { label: "Steps", unit: "", precision: 0, higherIsBetter: true },
  kcal: { label: "Calories", unit: "kcal", precision: 0, aggregate: "sum" },
  protein: { label: "Protein", unit: "g", precision: 0, aggregate: "sum" },
  carbs: { label: "Carbs", unit: "g", precision: 0, aggregate: "sum" },
  fat: { label: "Fat", unit: "g", precision: 0, aggregate: "sum" },
  weight: { label: "Weight", unit: "kg", precision: 1 },
  resting_hr: { label: "Resting HR", unit: "bpm", precision: 0, higherIsBetter: false },
} as const;

export type MetricKey = keyof typeof METRICS;

export function isMetricKey(v: unknown): v is MetricKey {
  return typeof v === "string" && v in METRICS;
}

export function isSumMetric(metric: MetricKey): boolean {
  return "aggregate" in METRICS[metric] && METRICS[metric].aggregate === "sum";
}

export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];
