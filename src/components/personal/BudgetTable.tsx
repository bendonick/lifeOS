"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BudgetOverview, LineStatus } from "@/lib/db/money";
import { paceState } from "@/lib/money/pace";

// YNAB's category-row pattern, restyled for this design system (§6): filled
// track instead of stripes, and a pace tick marking where spend *should* be
// today. Fixed rows are committed rather than paced, so per §6 they show
// paid/unpaid and get no track at all; annual rows show year-to-date progress
// against the annual amount, with no pace tick (pace is a monthly idea).

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
  // table stays monthly-sized; the subtotal row still carries /yr and /mo.
  const [showAnnual, setShowAnnual] = useState(false);

  const paceFraction = o.prospective ? 0 : o.dayOfMonth / o.daysInMonth;

  return (
    <div className="rounded-lg border border-border bg-surface" aria-busy={isPending}>
      {isPending && <div className="h-0.5 rounded-t-lg bg-personal/40" aria-hidden="true" />}
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
                {/* Annual spend is year-to-date, not this month — say so, or it
                    reads as a monthly figure sitting beside two monthly ones. */}
                CHF {chf.format(t.spent)}
                {tier === "annual" && <span className="text-faint"> YTD</span>} / {chf.format(t.budget)}
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
                    dayOfMonth={o.dayOfMonth}
                    daysInMonth={o.daysInMonth}
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
        <span className="text-xs font-semibold">
          Total / month <span className="font-normal text-faint">· annual smoothed ÷12</span>
        </span>
        <span className="tabular text-xs font-semibold">
          CHF {chf.format(o.allIn.spent)} / {chf.format(o.allIn.budget)}
        </span>
      </div>

      {!o.prospective && (
        <p className="border-t border-border px-3 py-1.5 text-[11px] text-faint">
          The line on each variable bar marks where spending should be by day {o.dayOfMonth}.
        </p>
      )}
    </div>
  );
}

function BudgetRow({
  line,
  month,
  paceFraction,
  dayOfMonth,
  daysInMonth,
  prospective,
  onSaved,
}: {
  line: LineStatus;
  month: string;
  paceFraction: number;
  dayOfMonth: number;
  daysInMonth: number;
  prospective: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const isFixed = line.tier === "fixed";
  const isVariable = line.tier === "variable";
  const isAnnual = line.tier === "annual";
  const envelope = isVariable ? line.effective_amount + line.carried_in : line.effective_amount;
  const fraction = envelope > 0 ? line.spent / envelope : 0;
  const over = line.spent > envelope;

  // Warm = urgency only, and only on the same ±5% band the spending card uses —
  // otherwise half the bars flare orange from ordinary mid-month noise while the
  // card beside them still reads "on pace".
  const pace = isVariable ? paceState(line.spent, envelope, dayOfMonth, daysInMonth) : "on pace";
  const fillClass = over ? "bg-danger" : pace === "over" ? "bg-warn" : "bg-personal";

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
      <span className="w-56 min-w-0 truncate text-sm" title={line.notes ?? undefined}>
        {line.name}
      </span>

      {/* §6: fixed lines are committed, not paced — no track. */}
      {isFixed ? (
        <span className="min-w-24 flex-1 text-[11px]">
          {!prospective &&
            (line.paid ? (
              <span className="text-muted">paid this month</span>
            ) : (
              <span className="text-faint">not yet paid</span>
            ))}
        </span>
      ) : (
        <div className="relative h-2 min-w-24 flex-1 rounded-full bg-raised">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${fillClass}`}
            style={{ width: `${Math.min(100, Math.max(0, fraction * 100))}%` }}
          />
          {isVariable && paceFraction > 0 && (
            <div
              className="absolute -inset-y-0.5 w-px bg-faint"
              style={{ left: `${paceFraction * 100}%` }}
              aria-hidden="true"
            />
          )}
        </div>
      )}

      {editing ? (
        <EditForm line={line} month={month} onDone={() => { setEditing(false); onSaved(); }} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${line.name} budget, currently CHF ${chf.format(envelope)}`}
          className="tabular w-44 shrink-0 text-right text-xs text-muted decoration-dotted underline-offset-4 transition-colors hover:text-text hover:underline"
        >
          CHF {chf.format(line.spent)} / {chf.format(envelope)}
          {isAnnual && <span className="text-faint"> /yr</span>}
          {over && <span className="text-danger"> · {chf.format(line.spent - envelope)} over</span>}
          {!over && line.carryover > 0 && line.carried_in !== 0 && (
            <span className="text-faint"> · {line.carried_in > 0 ? "+" : ""}{chf.format(line.carried_in)} carried</span>
          )}
        </button>
      )}

      <span className="w-14 shrink-0 text-right text-[11px] text-faint">
        {isAnnual && `${chf.format(line.effective_amount / 12)}/mo`}
      </span>
    </li>
  );
}

function EditForm({ line, month, onDone }: { line: LineStatus; month: string; onDone: () => void }) {
  const [amount, setAmount] = useState(String(line.effective_amount));
  const [justThisMonth, setJustThisMonth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      setError("enter a number");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/money/budget-lines/${line.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(justThisMonth ? { amount_chf: value, justThisMonth: true, month } : { amount_chf: value }),
    }).catch(() => null);
    setBusy(false);
    // A rejected PATCH used to close the editor as if it had worked, and the
    // stale amount would quietly reappear.
    if (!res?.ok) {
      setError("could not save");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-center justify-end gap-2">
      <input
        autoFocus
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        aria-invalid={!!error}
        className="tabular w-20 rounded-md border border-border bg-raised px-2 py-0.5 text-right text-xs"
        aria-label={`amount for ${line.name}`}
      />
      <label className="flex cursor-pointer items-center gap-1 text-[11px] text-muted">
        <input
          type="checkbox"
          checked={justThisMonth}
          onChange={(e) => setJustThisMonth(e.target.checked)}
          className="h-3.5 w-3.5"
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
      {error && (
        <span role="alert" className="text-[11px] text-danger">
          {error}
        </span>
      )}
    </form>
  );
}
