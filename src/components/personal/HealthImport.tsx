"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { accentHoverBorder } from "@/components/ui/accents";
import { buttonChrome, selectChrome } from "@/components/ui/controls";

/**
 * Mapped CSV import (§2) — the occasional half of what `HealthQuickEntry` used
 * to hold. Lives behind a disclosure now: an import happens when a new export
 * lands, not daily, and a file picker sitting open under four empty metric
 * cards was the clearest example of the page showing tools instead of state.
 *
 * The file format is data, not code: named mappings live in
 * `config.health.csv_mappings`.
 */
export function HealthImport({ mappings }: { mappings: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mapping, setMapping] = useState(mappings[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "muted" | "danger"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function importCsv(file: File) {
    setMessage(null);
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    body.append("mapping", mapping);
    const res = await fetch("/api/health/import", { method: "POST", body }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setMessage({ tone: "danger", text: json?.error ?? "import failed" });
      return;
    }
    setMessage({
      tone: "muted",
      text: `${json.inserted} values imported${json.rejected ? ` · ${json.rejected} rejected` : ""}`,
    });
    startTransition(() => router.refresh());
  }

  if (mappings.length === 0) {
    return <p className="text-xs text-faint">no CSV mappings configured — add one under config.health.csv_mappings</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={isPending || busy}>
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
        className={selectChrome}
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
        disabled={busy}
        className={`${buttonChrome} ${accentHoverBorder.personal} disabled:opacity-50`}
      >
        {busy ? "Importing…" : "Choose CSV"}
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
