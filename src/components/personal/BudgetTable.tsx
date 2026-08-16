"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BudgetOverview, LineStatus } from "@/lib/db/money";

// YNAB's category-row pattern, restyled for this design system (§6): filled
// track instead of stripes, and a pace tick marking where spend *should* be
// today — the bar answers "ahead or behind" with no text. Fixed rows show
// paid/unpaid (committed, not paced); annual rows show year progress + /mo.

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const TIERS = [
  ["fixed", "Fixed"],
  ["variable", "Variable"],
  ["annual", "Annual"],
] as const;

export function BudgetTable({ o }: { o: BudgetOverview }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());
  // Annual lines are committed, not decided daily — collapsed by default so the
  // table stays monthly-sized; the subtotal row still shows the /yr and /mo
  // figures (user feedback 2026-08-16).
  const [showAnnual, setShowAnnual] = useState(false);

  const paceFraction = o.prospective ? 0 : o.dayOfMonth / o.daysInMonth;
  const grandBudget = o.tiers.fixed.budget + o.tiers.variable.budget + o.tiers.annual.budget / 12;

  return (
    <div
      className={`rounded-lg border border-border bg-surface ${isPending ? "opacity-60" : ""} transition-opacity`}
    >
      {TIERS.map(([tier, label]) => {
        const lines = o.lines.filter((l) => l.tier === tier);
        if (!lines.length) return null;
        const t = o.tiers[tier];
        const collapsible = tier === "annual";
        const open = !collapsible || showAnnual;
        return (
          <div key={tier} className="border-b border-border last:border-b-0">
            <div className={`flex items-baseline justify-between px-3 pt-3 ${open ? "pb-1" : "pb-3"}`}>
              {collapsible ? (
                <button
                  type="button"
                  onClick={() => setShowAnnual((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted transition-colors hover:text-text"
                  aria-expanded={open}
                >
                  <span aria-hidden="true" className="text-[10px] text-faint">
                    {open ? "▾" : "▸"}
                  </span>
                  {label}
                </button>
              ) : (
                <span className="text-xs font-semibold tracking-wide text-muted">{label}</span>
              )}
              <span className="tabular text-xs font-medium text-muted">
                CHF {chf.format(t.spent)} / {chf.format(t.budget)}
                {tier === "annual" && <span className="text-faint"> /yr · {chf.format(t.budget / 12)}/mo</span>}
              </span>
            </div>
            {open && (
              <ul>
                {lines.map((l) => (
                  <BudgetRow
                    key={l.id}
                    line={l}
                    month={o.month}
                    paceFraction={paceFraction}
                    prospective={o.prospective}
                    onSaved={refresh}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
      <div className="flex items-baseline justify-between border-t border-border px-3 py-2.5">
        <span className="text-xs font-semibold">Total / month</span>
        <span className="tabular text-xs font-semibold">
          CHF {chf.format(o.allIn.spent)} / {chf.format(grandBudget)}
        </span>
      </div>
    </div>
  );
}

function BudgetRow({
  line,
  month,
  paceFraction,
  prospective,
  onSaved,
}: {
  line: LineStatus;
  month: string;
  paceFraction: number;
  prospective: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const isVariable = line.tier === "variable";
  const isAnnual = line.tier === "annual";
  const envelope = isVariable ? line.effective_amount + line.carried_in : line.effective_amount;
  const fraction = envelope > 0 ? line.spent / envelope : 0;
  const over = line.spent > envelope;
  // Warm = urgency only: warn when ahead of the pace tick (§6), danger past
  // 100%. A prospective month has no pace yet, so it can't be "ahead".
  const aheadOfPace = isVariable && paceFraction > 0 && fraction > paceFraction + 0.001;
  const fillClass = over ? "bg-danger" : aheadOfPace ? "bg-warn" : "bg-personal";

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
      <span className="w-56 min-w-0 truncate text-sm" title={line.notes ?? undefined}>
        {line.name}
      </span>

      <div className="relative h-2 min-w-24 flex-1 rounded-full bg-raised">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${fillClass}`}
          style={{ width: `${Math.min(100, Math.max(0, fraction * 100))}%` }}
        />
        {isVariable && paceFraction > 0 && (
          <div
            className="absolute -inset-y-0.5 w-px bg-faint"
            style={{ left: `${paceFraction * 100}%` }}
            title="where you should be today"
          />
        )}
      </div>

      {editing ? (
        <EditForm line={line} month={month} onDone={() => { setEditing(false); onSaved(); }} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="edit amount"
          className="tabular w-44 text-right text-xs text-muted transition-colors hover:text-text"
        >
          CHF {chf.format(line.spent)} / {chf.format(envelope)}
          {isAnnual && <span className="text-faint"> /yr</span>}
          {over && <span className="text-danger"> · {chf.format(line.spent - envelope)} over</span>}
          {!over && line.carryover > 0 && line.carried_in !== 0 && (
            <span className="text-faint"> · {line.carried_in > 0 ? "+" : ""}{chf.format(line.carried_in)} carried</span>
          )}
        </button>
      )}

      <span className="w-14 text-right text-[11px]">
        {/* paid/unpaid means nothing before the month starts — leave blank */}
        {line.tier === "fixed" &&
          !prospective &&
          (line.paid ? <span className="text-muted">paid</span> : <span className="text-faint">unpaid</span>)}
        {isAnnual && <span className="text-faint">{chf.format(line.effective_amount / 12)}/mo</span>}
      </span>
    </li>
  );
}

function EditForm({ line, month, onDone }: { line: LineStatus; month: string; onDone: () => void }) {
  const [amount, setAmount] = useState(String(line.effective_amount));
  const [justThisMonth, setJustThisMonth] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) return;
    setBusy(true);
    await fetch(`/api/money/budget-lines/${line.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(justThisMonth ? { amount_chf: value, justThisMonth: true, month } : { amount_chf: value }),
    });
    setBusy(false);
    onDone();
  }

  return (
    <form onSubmit={save} className="flex items-center gap-2">
      <input
        autoFocus
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        className="tabular w-20 rounded-md border border-border bg-raised px-2 py-0.5 text-right text-xs focus:border-personal/50 focus:outline-none"
        aria-label={`amount for ${line.name}`}
      />
      <label className="flex cursor-pointer items-center gap-1 text-[11px] text-faint">
        <input
          type="checkbox"
          checked={justThisMonth}
          onChange={(e) => setJustThisMonth(e.target.checked)}
          className="h-3 w-3 accent-[#a78bfa]"
        />
        just this month
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md border border-border bg-raised px-2 py-0.5 text-[11px] text-text hover:border-personal/40 disabled:opacity-50"
      >
        Save
      </button>
      <button type="button" onClick={onDone} className="text-[11px] text-faint hover:text-muted">
        cancel
      </button>
    </form>
  );
}
