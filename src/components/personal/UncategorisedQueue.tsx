"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { UncategorisedGroup } from "@/lib/db/money";

// The review queue (§5d/§5e): merchants sorted by frequency so each assignment
// retires the largest block of rows. "Always" (default on) also appends a
// lasting merchant→category rule for future imports.

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const SHOWN = 12;

export function UncategorisedQueue({
  groups,
  categories,
}: {
  groups: UncategorisedGroup[];
  categories: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assign(merchant: string, category: string, always: boolean) {
    if (!category) return;
    setError(null);
    const res = await fetch("/api/money/categorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant, category, always }),
    });
    if (!res.ok) {
      setError("assignment failed — try again");
      return;
    }
    startTransition(() => router.refresh());
  }

  const rows = groups.filter((g) => g.merchant);
  const shown = showAll ? rows : rows.slice(0, SHOWN);
  const totalRows = rows.reduce((s, g) => s + g.count, 0);

  return (
    <div className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <div className="rounded-lg border border-border bg-surface">
        <div className="flex items-baseline justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-muted">
            Uncategorised · {rows.length} merchants · {totalRows} rows
          </span>
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>
        <ul className="divide-y divide-border">
          {shown.map((g) => (
            <QueueRow key={g.merchant} group={g} categories={categories} onAssign={assign} />
          ))}
        </ul>
        {rows.length > SHOWN && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-full px-3 py-2 text-left text-xs text-faint transition-colors hover:text-muted"
          >
            {showAll ? "show fewer" : `+${rows.length - SHOWN} more merchants`}
          </button>
        )}
      </div>
    </div>
  );
}

function QueueRow({
  group,
  categories,
  onAssign,
}: {
  group: UncategorisedGroup;
  categories: string[];
  onAssign: (merchant: string, category: string, always: boolean) => void;
}) {
  const [category, setCategory] = useState("");
  const [always, setAlways] = useState(true);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-sm" title={group.merchant}>
        {group.merchant}
      </span>
      <span className="tabular text-xs text-muted">
        {group.count}× · CHF {chf.format(group.total_chf)}
      </span>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted focus:outline-none"
      >
        <option value="">category…</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <label className="flex cursor-pointer items-center gap-1 text-xs text-faint">
        <input
          type="checkbox"
          checked={always}
          onChange={(e) => setAlways(e.target.checked)}
          className="h-3.5 w-3.5 accent-[#a78bfa]"
        />
        always
      </label>
      <button
        type="button"
        disabled={!category}
        onClick={() => onAssign(group.merchant, category, always)}
        className="rounded-md border border-border bg-raised px-2.5 py-1 text-xs text-text transition-colors hover:border-personal/40 disabled:opacity-40"
      >
        Assign
      </button>
    </li>
  );
}
