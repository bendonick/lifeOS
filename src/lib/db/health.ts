import { db } from "@/lib/db";
import { getConfig, getConfigJSON } from "@/lib/db/config";
import { addDays } from "@/lib/dates";
import { METRICS, isSumMetric, type MetricKey } from "@/lib/health/metrics";

// Read side of health_metrics. Aggregation follows the registry: sum metrics
// add up within a date, everything else takes the latest row for that date.

export interface DayValue {
  date: string;
  value: number;
}

export function dailySeries(metric: MetricKey, from: string, to: string): DayValue[] {
  if (isSumMetric(metric)) {
    return db
      .prepare(
        `SELECT date, SUM(value) AS value FROM health_metrics
         WHERE metric = ? AND date >= ? AND date <= ? GROUP BY date ORDER BY date`
      )
      .all(metric, from, to) as DayValue[];
  }
  return db
    .prepare(
      `SELECT date, value FROM health_metrics hm
       WHERE metric = ? AND date >= ? AND date <= ?
         AND id = (SELECT MAX(id) FROM health_metrics WHERE metric = hm.metric AND date = hm.date)
       ORDER BY date`
    )
    .all(metric, from, to) as DayValue[];
}

/** Most recent day's (aggregated) value, regardless of window. */
export function latestValue(metric: MetricKey): DayValue | null {
  const last = db
    .prepare("SELECT MAX(date) AS date FROM health_metrics WHERE metric = ?")
    .get(metric) as { date: string | null };
  if (!last.date) return null;
  return dailySeries(metric, last.date, last.date)[0] ?? null;
}

export interface HealthTargets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  steps: number;
  hrv: { low: number; high: number };
}

export function healthTargets(): HealthTargets {
  const num = (key: string, fallback: number) => Number(getConfig(key) ?? fallback);
  return {
    kcal: num("health.target.kcal", 0),
    protein: num("health.target.protein", 0),
    carbs: num("health.target.carbs", 0),
    fat: num("health.target.fat", 0),
    steps: num("health.target.steps", 0),
    hrv: getConfigJSON("health.range.hrv", { low: 0, high: 0 }),
  };
}

const SPARK_DAYS = 14;

export interface HealthCardData {
  targets: HealthTargets;
  /** Today's macro sums (0 when nothing logged) + whether anything was logged. */
  macros: { kcal: number; protein: number; carbs: number; fat: number; logged: boolean };
  sleep: { value: number; date: string; delta7: number | null } | null;
  hrv: { value: number; date: string } | null;
  steps: { value: number; date: string } | null;
  sparks: Record<"kcal" | "sleep_score" | "hrv" | "steps", number[]>;
}

export function healthCardData(today: string): HealthCardData {
  const targets = healthTargets();
  const sumToday = (metric: MetricKey) => dailySeries(metric, today, today)[0]?.value ?? 0;
  const macros = {
    kcal: sumToday("kcal"),
    protein: sumToday("protein"),
    carbs: sumToday("carbs"),
    fat: sumToday("fat"),
    logged: !!db
      .prepare(
        "SELECT 1 AS hit FROM health_metrics WHERE date = ? AND metric IN ('kcal','protein','carbs','fat') LIMIT 1"
      )
      .get(today),
  };

  const sleepLatest = latestValue("sleep_score");
  let delta7: number | null = null;
  if (sleepLatest) {
    const window = dailySeries("sleep_score", addDays(sleepLatest.date, -7), addDays(sleepLatest.date, -1));
    if (window.length > 0) {
      const avg = window.reduce((s, d) => s + d.value, 0) / window.length;
      delta7 = Math.round(sleepLatest.value - avg);
    }
  }

  const sparkFrom = addDays(today, -(SPARK_DAYS - 1));
  const spark = (metric: MetricKey) => dailySeries(metric, sparkFrom, today).map((d) => d.value);

  return {
    targets,
    macros,
    sleep: sleepLatest ? { ...sleepLatest, delta7 } : null,
    hrv: latestValue("hrv"),
    steps: latestValue("steps"),
    sparks: {
      kcal: spark("kcal"),
      sleep_score: spark("sleep_score"),
      hrv: spark("hrv"),
      steps: spark("steps"),
    },
  };
}
