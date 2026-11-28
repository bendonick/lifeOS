"use client";

import { Check } from "lucide-react";
import type { BillStatus } from "@/lib/db/bills";
import { dayLabel, daysInMonth } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

/**
 * The month's payments on Personal: bills and subscriptions as one checklist,
 * a high-level check that each has gone out, with no amounts or totals. Every
 * figure lives on the Money page.
 *
 * A payment's name is its tick, drawn like a habit's: a wide box, tinted rust
 * with a rust check once paid. Beside it a status in words, never colour
 * alone: "Due Mon 1 Dec", "Overdue" (amber) past the due day, "Missed last
 * month" (red) when last month rolled over unpaid, "Paid".
 *
 * The count moves with the optimistic toggle, so it renders here rather than
 * in the section heading.
 */
export function MonthlyPayments({ bills, month, today }: { bills: BillStatus[]; month: string; today: string }) {
  const { toggle, valueFor, isPending, error } = useOptimisticToggle<BillStatus>({
    idOf: (b) => b.id,
    labelOf: (b) => b.name,
    send: (b, next) =>
      fetch(`/api/bills/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, paid: next }),
      }),
  });

  if (bills.length === 0) {
    return <p className="text-sm text-muted">No monthly payments yet.</p>;
  }

  const dayOfMonth = Number(today.slice(8, 10));
  const lastDay = daysInMonth(month);
  const paidOf = (b: BillStatus) => valueFor(b, b.paid);
  const paidCount = bills.filter(paidOf).length;

  const statusOf = (b: BillStatus): { text: string; tone: string } => {
    // A due day past the month's end (31 in November) falls on its last day.
    const due = Math.min(b.due_day, lastDay);
    if (paidOf(b)) return { text: "Paid", tone: "text-muted" };
    if (b.prevMonthMissed) return { text: "Missed last month", tone: "text-danger" };
    if (dayOfMonth > due) return { text: "Overdue", tone: "text-warn" };
    return { text: `Due ${dayLabel(`${month}-${String(due).padStart(2, "0")}`)}`, tone: "text-muted" };
  };

  return (
    <div aria-busy={isPending}>
      <div className="flex items-baseline justify-between gap-4 pb-1.5">
        <span className="text-sm text-text">Monthly payments</span>
        <span className="tabular text-sm text-muted">
          {paidCount} of {bills.length} paid
        </span>
      </div>

      {error && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error}
        </p>
      )}

      <ul className="divide-y divide-border border-y border-border">
        {bills.map((b) => {
          const paid = paidOf(b);
          const status = statusOf(b);
          return (
            <li key={b.id} className="flex min-h-12 items-center gap-3 py-1.5">
              <button
                type="button"
                aria-pressed={paid}
                aria-label={`${b.name} paid this month`}
                onClick={() => toggle(b, paid)}
                className={`flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-text transition-colors ${
                  paid
                    ? "bg-[color-mix(in_oklab,var(--color-rust)_22%,var(--color-bg))] shadow-[inset_3px_0_0_var(--color-hub)]"
                    : "ring-1 ring-inset ring-border-strong hover:bg-raised"
                }`}
              >
                <span className="inline-flex w-3.5 shrink-0 justify-center text-hub">
                  {paid && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}
                </span>
                <span className="truncate">{b.name}</span>
              </button>
              <span className={`tabular w-28 shrink-0 text-right text-xs ${status.tone}`}>
                {status.text}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
