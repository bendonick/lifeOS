"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { accentControl } from "@/components/ui/accents";
import type { BudgetOverview, LineStatus, VariableCategorySpend } from "@/lib/db/money";
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

// The three category hues mean groceries / restaurants / bars everywhere on this
// page, so they cannot be reused here to mean budget *lines* — one hue, one
// meaning, or the page teaches two conflicting keys. Food & drink instead fills
// as a stack of its own three categories, which is the same key applied one
// level up. Every other line keeps the single pace-driven fill: they are status
// bars, and urgency has to be able to take the whole track.
const CATEGORY_FILL: Record<string, string> = {
  groceries: "bg-cat-1",
  restaurants: "bg-cat-2",
  bars: "bg-cat-3",
};

export function BudgetTable({
  o,
  categorySpend = [],
}: {
  o: BudgetOverview;
  categorySpend?: VariableCategorySpend[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());
  // Fixed and annual lines are committed, not decided daily, so both collapse by
  // default and the table opens at the size of the decisions in it: three
  // variable rows. Fixed used to render five rows that all read "CHF 0 / X"
  // beside an empty gap where a bar would be — a bar it deliberately never gets,
  // because a committed cost is not paced (§6). The header carries the one live
  // fact those rows held between them: how many have landed.
  const [open, setOpen] = useState<Record<string, boolean>>({ variable: true });
  const toggle = (tier: string) => setOpen((o) => ({ ...o, [tier]: !o[tier] }));

  const paceFraction = o.prospective ? 0 : o.dayOfMonth / o.daysInMonth;

  return (
    <div className="rounded-lg border border-border bg-surface" aria-busy={isPending}>
      {isPending && <div className="h-0.5 rounded-t-lg bg-personal/40" aria-hidden="true" />}
      {TIERS.map(([tier, label]) => {
        const lines = o.lines.filter((l) => l.tier === tier);
        if (!lines.length) return null;
        const t = o.tiers[tier];
        const collapsible = tier !== "variable";
        const isOpen = !collapsible || open[tier] === true;
        const paidCount = tier === "fixed" ? lines.filter((l) => l.paid).length : 0;
        return (
          <div key={tier} className="border-b border-border last:border-b-0">
            <div className={`flex items-baseline justify-between gap-3 px-3 pt-3 ${isOpen ? "pb-1" : "pb-3"}`}>
              {collapsible ? (
                <button
                  type="button"
                  onClick={() => toggle(tier)}
                  className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted transition-colors hover:text-text"
                  aria-expanded={isOpen}
                >
                  {/* Same chevron grammar as Disclosure — the one surviving
                      hand-rolled triangle pointed its own way. */}
                  <ChevronRight
                    size={12}
                    aria-hidden="true"
                    className={`shrink-0 text-faint transition-transform duration-150 ease-out ${isOpen ? "rotate-90" : ""}`}
                  />
                  {label}
                </button>
              ) : (
                <span className="text-xs font-semibold tracking-wide text-muted">{label}</span>
              )}
              <span className="tabular text-xs font-medium text-muted">
                {/* A paid count is the summary worth having, and only once the
                    month can have produced one — before the budget starts,
                    "0 of 5 paid" is a status that cannot yet be true. */}
                {tier === "fixed" && !o.prospective && (
                  <span className="text-faint">
                    {paidCount} of {lines.length} paid ·{" "}
                  </span>
                )}
                {/* Annual is a per-YEAR budget, so it says so in words rather
                    than stacking YTD, /yr and /mo abbreviations in one line. */}
                {tier === "annual" ? (
                  <>
                    CHF {chf.format(t.spent)} of {chf.format(t.budget)}
                    <span className="text-faint">
                      {" "}
                      this year · {chf.format(t.budget / 12)}/mo equivalent
                    </span>
                  </>
                ) : (
                  <>
                    CHF {chf.format(t.spent)} / {chf.format(t.budget)}
                  </>
                )}
              </span>
            </div>
            {isOpen && (
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
                    segments={categorySpend.filter((c) => c.line === l.name)}
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
  segments = [],
  onSaved,
}: {
  line: LineStatus;
  month: string;
  paceFraction: number;
  dayOfMonth: number;
  daysInMonth: number;
  prospective: boolean;
  /** Category split for this line, if it has one worth showing. */
  segments?: VariableCategorySpend[];
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

  const lineSpent = segments.reduce((sum, c) => sum + c.spent, 0);
  const stacked =
    isVariable && !over && pace !== "over" && lineSpent > 0
      ? [...segments].filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent)
      : [];

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
      <span className="w-56 min-w-0 truncate text-sm" title={line.notes ?? undefined}>
        {line.name}
      </span>

      {/* §6: fixed lines are committed, not paced — no track, so a dot carries
          the only state they have. Neutral tones on purpose: a bill that is not
          due yet is not a problem, and the alarm case (a line paid last month
          that hasn't landed this one) is already an insight on the hero card.
          Colouring every unpaid row warm would spend the warn token on the
          normal state of the first of the month. */}
      {isFixed ? (
        <span className="flex min-w-24 flex-1 items-center gap-1.5 text-[11px]">
          {!prospective && (
            <>
              <span
                aria-hidden="true"
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  line.paid ? "bg-personal" : "bg-border"
                }`}
              />
              <span className={line.paid ? "text-muted" : "text-faint"}>
                {line.paid ? "paid this month" : "not yet paid"}
              </span>
            </>
          )}
        </span>
      ) : (
        <div className="relative h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-track">
          {/* Stacked only while the line is behaving. Once it is over pace or
              over budget the warm fill takes the whole track — a warning split
              into three decorative colours is not a warning. */}
          {stacked.length > 0 ? (
            <div className="absolute inset-y-0 left-0 flex" style={{ width: `${Math.min(100, fraction * 100)}%` }}>
              {stacked.map((seg) => (
                <div
                  key={seg.category}
                  className={CATEGORY_FILL[seg.category] ?? "bg-cat-rest"}
                  style={{ width: `${(seg.spent / lineSpent) * 100}%` }}
                  title={`${seg.category}: CHF ${chf.format(seg.spent)}`}
                />
              ))}
            </div>
          ) : (
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${fillClass}`}
              style={{ width: `${Math.min(100, Math.max(0, fraction * 100))}%` }}
            />
          )}
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
          className={`h-3.5 w-3.5 ${accentControl.personal}`}
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
