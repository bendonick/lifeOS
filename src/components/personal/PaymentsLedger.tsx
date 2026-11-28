"use client";

import { Check } from "lucide-react";
import { PaymentForm } from "@/components/personal/PaymentForm";
import { Disclosure } from "@/components/ui/Disclosure";
import type { BillStatus } from "@/lib/db/bills";
import { dayLabel, daysInMonth } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

/**
 * Monthly payments on the Money page: the checklist Personal shows, with the
 * figures. One row per bill or subscription, in columns: the payment (its name
 * is its tick, drawn as on Personal and on Habits), the due date this month,
 * the amount, and a status in words. Above the list, "N of M paid", what is
 * still to pay and the monthly total. "Add payment" under the list, or
 * Payment in the page's `+ Add` menu (`#new-payment`), adds one with its
 * amount.
 *
 * A row does not open yet: what a payment's detail and editor hold is still to
 * be decided.
 *
 * Below `sm` a row is two lines: the tick, then due · amount · status, so the
 * name keeps its width on a phone.
 */
const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const chfWhole = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const COLS = "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_8.5rem]";

export function PaymentsLedger({ bills, month, today }: { bills: BillStatus[]; month: string; today: string }) {
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

  const addPayment = (
    <Disclosure
      variant="add"
      accent="personal"
      summary="Add payment"
      openSummary="Cancel"
      anchors={["new-payment"]}
      className="mt-3"
    >
      <PaymentForm withAmount inputId="new-payment" />
    </Disclosure>
  );

  if (bills.length === 0) {
    return (
      <div>
        <p className="text-sm text-muted">No monthly payments yet.</p>
        {addPayment}
      </div>
    );
  }

  const dayOfMonth = Number(today.slice(8, 10));
  const lastDay = daysInMonth(month);
  const dueDay = (b: BillStatus) => Math.min(b.due_day, lastDay);
  const dueDate = (b: BillStatus) => `${month}-${String(dueDay(b)).padStart(2, "0")}`;
  const paidOf = (b: BillStatus) => valueFor(b, b.paid);

  const statusOf = (b: BillStatus): { text: string; tone: string } => {
    if (paidOf(b)) return { text: "Paid", tone: "text-muted" };
    if (b.prevMonthMissed) return { text: "Missed last month", tone: "text-danger" };
    const left = dueDay(b) - dayOfMonth;
    if (left < 0) return { text: "Overdue", tone: "text-warn" };
    if (left === 0) return { text: "Due today", tone: "text-text" };
    return { text: `In ${left} ${left === 1 ? "day" : "days"}`, tone: "text-muted" };
  };

  const paidCount = bills.filter(paidOf).length;
  const total = bills.reduce((s, b) => s + (b.amount_chf ?? 0), 0);
  const owed = bills.filter((b) => !paidOf(b)).reduce((s, b) => s + (b.amount_chf ?? 0), 0);
  const money = (n: number | null) => (n === null ? "—" : `CHF ${chf.format(n)}`);

  return (
    <div aria-busy={isPending}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-2">
        <span className="tabular text-sm text-text">
          {paidCount} of {bills.length} paid
        </span>
        <span className="tabular text-sm text-muted">
          CHF {chfWhole.format(owed)} still to pay · CHF {chfWhole.format(total)} a month
        </span>
      </div>

      {error && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div aria-hidden="true" className={`hidden gap-x-3 border-b border-border pb-1.5 text-xs text-faint sm:grid ${COLS}`}>
        <span>Payment</span>
        <span>Due</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Status</span>
      </div>

      <ul className="divide-y divide-border border-b border-border max-sm:border-t">
        {bills.map((b) => {
          const paid = paidOf(b);
          const status = statusOf(b);
          return (
            <li key={b.id} className={`grid items-center gap-x-3 gap-y-1 py-1.5 ${COLS}`}>
              {/* The tick: the name in a wide box, as on Personal. */}
              <button
                type="button"
                aria-pressed={paid}
                aria-label={`${b.name} paid this month`}
                onClick={() => toggle(b, paid)}
                className={`flex min-h-9 min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-text transition-colors ${
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

              {/* Phone: due · amount · status on a second line. */}
              <span className="flex gap-2 px-1 text-xs sm:hidden">
                <span className="tabular text-muted">Due {dayLabel(dueDate(b))}</span>
                <span className="tabular text-text">{money(b.amount_chf)}</span>
                <span className={`ml-auto ${status.tone}`}>{status.text}</span>
              </span>

              {/* From sm: in columns. */}
              <span className="tabular hidden text-sm text-muted sm:block">{dayLabel(dueDate(b))}</span>
              <span className="tabular hidden text-right text-sm text-text sm:block">{money(b.amount_chf)}</span>
              <span className={`hidden text-right text-xs sm:block ${status.tone}`}>{status.text}</span>
            </li>
          );
        })}
      </ul>

      {addPayment}
    </div>
  );
}
