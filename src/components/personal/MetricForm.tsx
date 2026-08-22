"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { accentHoverBorder } from "@/components/ui/accents";
import { buttonChrome, fieldChrome, selectChrome } from "@/components/ui/controls";
import { useTransientStatus } from "@/lib/useTransientStatus";
import { METRICS, METRIC_KEYS } from "@/lib/health/metrics";

/**
 * Manual health entry — one metric, one value, through `/api/health/metrics`
 * and so through `ingestMetrics`, which stays the only door into the table
 * (decision #17).
 *
 * Split out of `HealthQuickEntry`, which bolted this together with the CSV
 * import behind a hairline divider and left all six controls permanently open
 * at the foot of the Health tile. Logging today's steps and re-importing an
 * export are not the same job and do not belong on the same row: this one is a
 * daily action and belongs in Quick add, the other is occasional and belongs
 * behind a disclosure.
 */
export function MetricForm({
  today,
  inputId,
  autoFocus = false,
}: {
  today: string;
  inputId?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(today);
  const [metric, setMetric] = useState<string>(METRIC_KEYS[0]);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useTransientStatus();

  async function log(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(value);
    if (value.trim() === "" || !Number.isFinite(v)) {
      setError("enter a number");
      return;
    }
    setError(null);
    const res = await fetch("/api/health/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, metric, value: v }),
    }).catch(() => null);
    if (!res?.ok) {
      setError("could not log metric");
      return;
    }
    const m = METRICS[metric as keyof typeof METRICS];
    setStatus(`Logged ${m.label} ${v}${m.unit ? ` ${m.unit}` : ""}`);
    setValue("");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={log} className="flex flex-wrap items-center gap-2" aria-busy={isPending}>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={fieldChrome}
        aria-label="metric date"
      />
      <select
        value={metric}
        onChange={(e) => setMetric(e.target.value)}
        className={selectChrome}
        aria-label="metric"
      >
        {METRIC_KEYS.map((k) => (
          <option key={k} value={k}>
            {METRICS[k].label}
          </option>
        ))}
      </select>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="value"
        id={inputId}
        autoFocus={autoFocus}
        inputMode="decimal"
        aria-invalid={!!error}
        className={`tabular w-24 text-right ${fieldChrome}`}
        aria-label="metric value"
      />
      <button type="submit" className={`${buttonChrome} ${accentHoverBorder.personal}`}>
        Log
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
      {status && !error && (
        <span role="status" className="text-xs text-muted">
          {status}
        </span>
      )}
    </form>
  );
}
