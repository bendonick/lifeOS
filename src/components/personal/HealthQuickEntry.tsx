"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { METRICS, METRIC_KEYS } from "@/lib/health/metrics";

// Manual quick-entry + mapped CSV import (§2). Both go through /api/health/*
// → ingestMetrics; this component owns no data, only form state.

export function HealthQuickEntry({ today, mappings }: { today: string; mappings: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(today);
  const [metric, setMetric] = useState<string>(METRIC_KEYS[0]);
  const [value, setValue] = useState("");
  const [mapping, setMapping] = useState(mappings[0] ?? "");
  const [message, setMessage] = useState<{ tone: "muted" | "danger"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function log(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(value);
    if (value.trim() === "" || !Number.isFinite(v)) {
      setMessage({ tone: "danger", text: "enter a number" });
      return;
    }
    setMessage(null);
    const res = await fetch("/api/health/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, metric, value: v }),
    });
    if (!res.ok) {
      setMessage({ tone: "danger", text: "could not log metric" });
      return;
    }
    setValue("");
    startTransition(() => router.refresh());
  }

  async function importCsv(file: File) {
    setMessage(null);
    const body = new FormData();
    body.append("file", file);
    body.append("mapping", mapping);
    const res = await fetch("/api/health/import", { method: "POST", body });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage({ tone: "danger", text: json?.error ?? "import failed" });
      return;
    }
    setMessage({
      tone: "muted",
      text: `${json.inserted} values imported${json.rejected ? ` · ${json.rejected} rejected` : ""}`,
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={isPending}>
      <form onSubmit={log} className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
          aria-label="metric date"
        />
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
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
          id="new-metric"
          inputMode="decimal"
          className="tabular w-20 rounded-md border border-border bg-surface px-2 py-1.5 text-right text-sm placeholder:text-faint focus:border-personal/50"
          aria-label="metric value"
        />
        <button
          type="submit"
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text transition-colors hover:border-personal/40"
        >
          Log
        </button>
      </form>

      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importCsv(f);
          e.target.value = "";
        }}
      />
      <select
        value={mapping}
        onChange={(e) => setMapping(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
        aria-label="csv mapping"
      >
        {mappings.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        disabled={!mapping}
        className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text transition-colors hover:border-personal/40 disabled:opacity-50"
      >
        Import CSV
      </button>
      {message && (
        <span
          role={message.tone === "danger" ? "alert" : "status"}
          className={`text-xs ${message.tone === "danger" ? "text-danger" : "text-muted"}`}
        >
          {message.text}
        </span>
      )}
    </div>
  );
}
