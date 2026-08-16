"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

// Upload → preview → confirm (docs/06-stage2-brief.md §5d — never write on
// upload). Preview state is ephemeral UI, not data ownership: the confirmed
// import is re-read from the server via router.refresh().

interface Preview {
  file: string;
  bank: string;
  total: number;
  new: number;
  skipped: number;
  uncategorised: number;
  dateRange: { from: string; to: string } | null;
  categories: { category: string; count: number; total_chf: number }[];
}

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function ImportPanel() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/money/import", { method: "POST", body });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(json?.error ?? "import failed");
      return;
    }
    setPreview(json as Preview);
  }

  async function confirm() {
    if (!preview) return;
    setBusy(true);
    const res = await fetch("/api/money/import/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: preview.file }),
    });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(json?.error ?? "confirm failed");
      return;
    }
    setResult(`${json.inserted} imported · ${json.skipped} skipped (already imported)`);
    setPreview(null);
    startTransition(() => router.refresh());
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text transition-colors hover:border-personal/40 disabled:opacity-50"
        >
          {busy ? "Working…" : "Import bank CSV"}
        </button>
        {result && <span className="text-xs text-muted">{result}</span>}
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>

      {preview && (
        <div className="mt-3 rounded-lg border border-border bg-surface p-4">
          <p className="text-sm">
            <span className="font-medium uppercase">{preview.bank}</span> export ·{" "}
            <span className="tabular">{preview.total}</span> rows
            {preview.dateRange && (
              <span className="text-muted">
                {" "}
                · {preview.dateRange.from} → {preview.dateRange.to}
              </span>
            )}
          </p>
          <p className="tabular mt-1 text-sm text-muted">
            {preview.new} new · {preview.skipped} skipped (already imported) · {preview.uncategorised}{" "}
            uncategorised
          </p>

          {preview.categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
              {preview.categories.slice(0, 10).map((c) => (
                <span key={c.category} className="tabular">
                  {c.category} · {c.count} · CHF {chf.format(c.total_chf)}
                </span>
              ))}
              {preview.categories.length > 10 && (
                <span className="text-faint">+{preview.categories.length - 10} more</span>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              disabled={busy || preview.new === 0}
              onClick={confirm}
              className="rounded-md border border-personal/40 bg-personal/10 px-3 py-1.5 text-sm text-personal transition-colors hover:bg-personal/20 disabled:opacity-50"
            >
              Import {preview.new} transactions
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-text"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
