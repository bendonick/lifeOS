"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CategoryOptions } from "@/components/personal/CategoryOptions";
import { Tabs } from "@/components/ui/Tabs";
import { accentControl } from "@/components/ui/accents";
import type { CategoryGroup, MerchantGroup } from "@/lib/db/money";

// The one merchant surface (Stage 6): the review queue, the correction path,
// and "where does the money actually go" are the same list filtered two ways.
//
// To review — uncategorised merchants, prefilled from `category_proposals` when
// the assist has run. Sorted by row count so each assignment retires the
// largest block. All merchants — every merchant with its current category,
// changeable; this is the only way to correct a misfiling without SQL.
//
// Bulk accept exists because the tail is real: 122 merchants, 111 of them seen
// exactly once. Reviewing that one dropdown at a time is data entry, not review.

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const SHOWN = 12;

type View = "review" | "all";

interface Assignment {
  merchant: string;
  category: string;
  always: boolean;
}

export function MerchantsPanel({
  merchants,
  categories,
}: {
  merchants: MerchantGroup[];
  categories: CategoryGroup[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<View>("review");
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const uncategorised = merchants.filter((m) => !m.category);
  const rows = view === "review" ? uncategorised : merchants;
  const shown = showAll ? rows : rows.slice(0, SHOWN);

  // Only high-confidence proposals are offered in bulk. Medium and low are the
  // ones worth a human glance, and hiding them inside an "accept all" would
  // make the confidence rating decorative.
  const bulkReady = uncategorised.filter((m) => m.proposal?.confidence === "high");

  async function assign(assignments: Assignment[]) {
    if (assignments.length === 0) return;
    setError(null);
    setStatus(null);
    const res = await fetch("/api/money/categorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assignments.length === 1 ? assignments[0] : { assignments }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error ?? "assignment failed — try again");
      return;
    }
    if (assignments.length > 1) {
      setStatus(`Filed ${json.updated} transactions across ${json.merchants} merchants.`);
    }
    startTransition(() => router.refresh());
  }

  async function runAssist() {
    setBusy(true);
    setError(null);
    setStatus(null);
    const res = await fetch("/api/money/assist", { method: "POST" });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(json?.error ?? "assist failed");
      return;
    }
    setStatus(
      json.proposed > 0
        ? `Proposed a category for ${json.proposed} merchant${json.proposed === 1 ? "" : "s"}.`
        : "Nothing left to propose."
    );
    startTransition(() => router.refresh());
  }

  const needProposals = uncategorised.filter((m) => !m.proposal).length;

  return (
    <div id="uncategorised" aria-busy={isPending || busy}>
      <Tabs
        tabs={[
          { key: "review", label: "To review", count: uncategorised.length },
          { key: "all", label: "All merchants", count: merchants.length },
        ]}
        active={view}
        onChange={(v) => {
          setView(v);
          setShowAll(false);
        }}
        accent="personal"
        label="merchant views"
      />

      <div className="rounded-lg border border-border bg-surface">
        {(isPending || busy) && (
          <div className="h-0.5 rounded-t-lg bg-personal/40" aria-hidden="true" />
        )}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-muted">
            {view === "review"
              ? `${uncategorised.length} merchants · ${uncategorised.reduce((s, g) => s + g.count, 0)} rows`
              : `${merchants.length} merchants · ${merchants.reduce((s, g) => s + g.count, 0)} rows`}
          </span>
          <div className="flex flex-wrap items-center gap-2">
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
            {view === "review" && bulkReady.length > 0 && (
              <button
                type="button"
                disabled={busy || isPending}
                onClick={() =>
                  assign(
                    bulkReady.map((m) => ({
                      merchant: m.merchant,
                      category: m.proposal!.category,
                      always: m.count > 1,
                    }))
                  )
                }
                className="rounded-md border border-border bg-raised px-2.5 py-1 text-xs text-text transition-colors hover:border-personal/40 disabled:opacity-40"
              >
                Accept {bulkReady.length} confident
              </button>
            )}
            {view === "review" && needProposals > 0 && (
              <button
                type="button"
                disabled={busy || isPending}
                onClick={runAssist}
                title={`Ask the assist to propose a category for ${needProposals} merchant${needProposals === 1 ? "" : "s"}`}
                className="rounded-md border border-border bg-raised px-2.5 py-1 text-xs text-text transition-colors hover:border-personal/40 disabled:opacity-40"
              >
                {busy ? "Proposing…" : `Assist · ${needProposals}`}
              </button>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted">
            {view === "review" ? "Nothing to review — every merchant has a category." : "No merchants yet."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((m) => (
              <MerchantRow
                key={m.merchant}
                merchant={m}
                categories={categories}
                disabled={busy || isPending}
                onAssign={(category, always) => assign([{ merchant: m.merchant, category, always }])}
              />
            ))}
          </ul>
        )}

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

function MerchantRow({
  merchant: m,
  categories,
  disabled,
  onAssign,
}: {
  merchant: MerchantGroup;
  categories: CategoryGroup[];
  disabled: boolean;
  onAssign: (category: string, always: boolean) => void;
}) {
  // Prefilled from the proposal when there is one, else the current category.
  // A proposal is a suggestion in a dropdown the user can change before
  // committing — nothing is filed until Assign (decision #36).
  const [category, setCategory] = useState(m.category ?? m.proposal?.category ?? "");
  // A rule for a merchant seen once will never fire again, so "always" only
  // defaults on where it can actually pay off.
  const [always, setAlways] = useState(m.count > 1);

  const changed = category !== "" && category !== m.category;

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      <span className="min-w-0 flex-1 basis-48">
        <span className="block truncate text-sm" title={m.merchant}>
          {m.merchant}
        </span>
        {m.proposal && !m.category && (
          // Confidence first and non-shrinking: it decides how hard to look, so
          // it must survive the truncation that a long reason will cause.
          <span className="flex items-baseline gap-1 text-[11px] text-faint">
            <span className="shrink-0">{m.proposal.confidence}</span>
            <span className="truncate" title={m.proposal.reason ?? undefined}>
              · {m.proposal.reason}
            </span>
          </span>
        )}
        {m.mixed && (
          <span className="block text-xs text-muted">rows disagree</span>
        )}
      </span>

      <span className="tabular text-xs text-muted">
        {m.count}× ·{" "}
        {m.total_chf < 0 ? `+CHF ${chf.format(-m.total_chf)}` : `CHF ${chf.format(m.total_chf)}`}
      </span>

      <select
        value={category}
        disabled={disabled}
        onChange={(e) => setCategory(e.target.value)}
        aria-label={`Category for ${m.merchant}`}
        className="w-36 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted"
      >
        <option value="">category…</option>
        <CategoryOptions groups={categories} />
      </select>

      <label
        className="flex cursor-pointer items-center gap-1 text-xs text-muted"
        title={`Also save a rule so future imports categorise “${m.merchant}” automatically`}
      >
        <input
          type="checkbox"
          checked={always}
          disabled={disabled}
          onChange={(e) => setAlways(e.target.checked)}
          className={`h-3.5 w-3.5 ${accentControl.personal}`}
        />
        always
      </label>

      <button
        type="button"
        disabled={disabled || !changed}
        onClick={() => onAssign(category, always)}
        className="rounded-md border border-border bg-raised px-2.5 py-1 text-xs text-text transition-colors hover:border-personal/40 disabled:opacity-40"
      >
        {m.category ? "Change" : "Assign"}
      </button>
    </li>
  );
}
