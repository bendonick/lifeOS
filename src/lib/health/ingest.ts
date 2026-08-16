import { db } from "@/lib/db";
import { normalizeDate } from "@/lib/dates";
import { isMetricKey, isSumMetric } from "@/lib/health/metrics";

// The quarantine boundary (§2): EVERY path into health_metrics goes through
// ingestMetrics — manual entry, CSV import, and every future device adapter.
// Garmin/Oura fragility lives outside this function, never inside the app.

export interface IngestRow {
  date: string; // anything normalizeDate accepts
  metric: string; // validated against the registry
  value: number;
}

export interface IngestResult {
  inserted: number;
  rejected: number; // unknown metric, bad date, or non-finite value
}

/**
 * Validate, normalise dates to Zurich 'YYYY-MM-DD', and upsert.
 *
 * Upsert semantics follow the registry: non-sum metrics keep one row per date
 * (a new claim replaces the old one); sum metrics accumulate rows. With
 * `replaceSameSource` (CSV imports, future adapters) a batch first clears its
 * own source's rows for the (date, metric) pairs it re-states, so re-importing
 * a file never double-counts — while manual per-meal entries still stack.
 */
export function ingestMetrics(
  rows: IngestRow[],
  source: string,
  opts: { replaceSameSource?: boolean } = {}
): IngestResult {
  const valid: Array<{ date: string; metric: string; value: number }> = [];
  let rejected = 0;
  for (const r of rows) {
    const date = normalizeDate(r.date);
    if (!date || !isMetricKey(r.metric) || !Number.isFinite(r.value)) {
      rejected++;
      continue;
    }
    valid.push({ date, metric: r.metric, value: r.value });
  }

  db.transaction(() => {
    const deleteAll = db.prepare("DELETE FROM health_metrics WHERE date = ? AND metric = ?");
    const deleteSameSource = db.prepare(
      "DELETE FROM health_metrics WHERE date = ? AND metric = ? AND source = ?"
    );
    const insert = db.prepare(
      "INSERT INTO health_metrics (date, metric, value, source) VALUES (?, ?, ?, ?)"
    );

    const cleared = new Set<string>();
    for (const r of valid) {
      const key = `${r.date}|${r.metric}`;
      if (!cleared.has(key)) {
        cleared.add(key);
        if (!isSumMetric(r.metric as never)) deleteAll.run(r.date, r.metric);
        else if (opts.replaceSameSource) deleteSameSource.run(r.date, r.metric, source);
      }
      insert.run(r.date, r.metric, r.value, source);
    }
  })();

  return { inserted: valid.length, rejected };
}
