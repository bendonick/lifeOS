"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BudgetProposal } from "@/lib/money/propose";

// "What should this line actually be?", from the user's own history (Stage 6).
// Origin sells this as an AI budget; here it is a median, so every number can be
// traced back to the months it came from — which is why the basis line and the
// caveats are not optional decoration. A proposal the user can't audit is worse
// than the guess it replaces.
//
// Collapsed until asked — the shared `Disclosure` in `SpendingSection` owns that
// now, rather than this component hand-rolling its own open/close pair. The
// budget lines were set once and are right most of the time; a permanently-open
// panel restating them would be the "Up next" mistake decision #28 removed.

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

function monthLabel(month: string): string {
  return new Date(`${month}-15T12:00:00Z`).toLocaleString("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export function BudgetProposalPanel({ proposal }: { proposal: BudgetProposal }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Nothing to propose (no history yet) means no button at all, rather than a
  // control that opens onto an empty panel.
  if (proposal.proposals.length === 0) return null;

  async function use(lineId: number, amount: number) {
    setSaving(lineId);
    setError(null);
    const res = await fetch(`/api/money/budget-lines/${lineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount_chf: amount }),
    });
    setSaving(null);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? "could not update the budget line");
      return;
    }
    startTransition(() => router.refresh());
  }

  const { months, skippedMonths, uncategorised } = proposal;
  const range = months.length > 0 ? `${monthLabel(months[0])}–${monthLabel(months[months.length - 1])}` : "";

  return (
    <div
      id="budget-proposal"
      className="rounded-lg border border-border bg-surface"
      aria-busy={isPending || saving !== null}
    >
      {(isPending || saving !== null) && (
        <div className="h-0.5 rounded-t-lg bg-personal/40" aria-hidden="true" />
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-muted">
          Proposed from history · {months.length} complete months ({range})
        </span>
        {error && (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        )}
      </div>

      <ul className="divide-y divide-border">
        {proposal.proposals.map((p) => {
          const delta = p.proposed - p.current;
          return (
            <li key={p.lineId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
              <span className="min-w-0 flex-1 basis-56">
                <span className="block text-sm">{p.line}</span>
                <span className="block text-xs text-faint">
                  median of {p.months} months · range CHF {chf.format(p.min)}–{chf.format(p.max)}
                  {p.breakdown.length > 0 &&
                    ` · ${p.breakdown.map((b) => `${b.category} ${chf.format(b.median)}`).join(" · ")}`}
                </span>
              </span>
              <span className="tabular text-xs text-muted">
                CHF {chf.format(p.current)} → <span className="text-text">{chf.format(p.proposed)}</span>{" "}
                <span className="text-faint">
                  ({delta >= 0 ? "+" : "−"}
                  {chf.format(Math.abs(delta))})
                </span>
              </span>
              <button
                type="button"
                disabled={saving !== null || isPending || delta === 0}
                onClick={() => use(p.lineId, p.proposed)}
                className="rounded-md border border-border bg-raised px-2.5 py-1 text-xs text-text transition-colors hover:border-personal/40 disabled:opacity-40"
              >
                {delta === 0 ? "matches" : `Use ${chf.format(p.proposed)}`}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="px-3 py-2 text-xs text-faint">
        {/* What survives is what makes the numbers auditable — which months are
            in, which are out, and what is missing. The paragraph that used to
            open this explained why fixed and annual lines are absent, which the
            list itself says by not containing any. */}
        History predates the budget, so these are a starting point, not a verdict.
        {skippedMonths.length > 0 &&
          ` ${skippedMonths.map(monthLabel).join(", ")} skipped — too few transactions to be a real month.`}
        {uncategorised > 0 &&
          ` ${uncategorised} transactions in this range are still uncategorised, so every figure here is an understatement.`}
      </p>
    </div>
  );
}
