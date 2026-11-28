"use client";

import { Check, ChevronRight, Pencil } from "lucide-react";
import { useId, useState } from "react";
import { PaymentForm } from "@/components/personal/PaymentForm";
import { PaymentNote } from "@/components/personal/PaymentNote";
import { Disclosure } from "@/components/ui/Disclosure";
import { RowAction } from "@/components/ui/RowAction";
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
 * A pencil at the end of a row turns it into its editor, the shared
 * PaymentForm with its amount field: name, due day, amount, Save, Cancel,
 * Remove payment (asks once; its paid months stay in the log). One row is
 * edited at a time.
 *
 * At the right end of the payment's bar, inside it, a chevron opens the row's
 * **Details**: for now a note (`PaymentNote`), read and written in place
 * without going into the editor. Closed at rest; any number of rows can be
 * open. A dot on the chevron says a note exists while the row is closed.
 *
 * Below `sm` a row is two lines: the bar and the pencil, then due · amount ·
 * status, so the name keeps its width on a phone.
 */
// Whole francs as "CHF 70", anything with cents as "CHF 12.90".
const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const chfCents = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const COLS = "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_8.5rem_1.75rem]";

export function PaymentsLedger({ bills, month, today }: { bills: BillStatus[]; month: string; today: string }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());
  const baseId = useId();
  const toggleOpen = (id: number) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
  const money = (n: number | null) =>
    n === null ? "—" : `CHF ${Number.isInteger(n) ? chf.format(n) : chfCents.format(n)}`;

  return (
    <div aria-busy={isPending}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-2">
        <span className="tabular text-sm text-text">
          {paidCount} of {bills.length} paid
        </span>
        <span className="tabular text-sm text-muted">
          CHF {chf.format(owed)} still to pay · CHF {chf.format(total)} a month
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
        <span />
      </div>

      <ul className="divide-y divide-border border-b border-border max-sm:border-t">
        {bills.map((b) => {
          if (editingId === b.id) {
            return (
              <li key={b.id} className="py-2.5">
                <PaymentForm payment={b} withAmount onDone={() => setEditingId(null)} />
              </li>
            );
          }
          const paid = paidOf(b);
          const status = statusOf(b);
          const open = openIds.has(b.id);
          const detailId = `${baseId}-${b.id}`;
          return (
            <li key={b.id}>
              <div
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-1.5 ${COLS}`}
              >
                {/* The bar: the tick (the name, as on Personal) and, at its
                    right end, the Details toggle. Two buttons in one box. */}
                <div
                  className={`col-start-1 row-start-1 flex min-h-9 min-w-0 items-stretch rounded-md text-sm text-text ${
                    paid
                      ? "bg-[color-mix(in_oklab,var(--color-rust)_22%,var(--color-bg))] shadow-[inset_3px_0_0_var(--color-hub)]"
                      : "ring-1 ring-inset ring-border-strong"
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={paid}
                    aria-label={`${b.name} paid this month`}
                    onClick={() => toggle(b, paid)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-l-md py-1.5 pl-2.5 pr-2 text-left transition-colors ${
                      paid ? "" : "hover:bg-raised"
                    }`}
                  >
                    <span className="inline-flex w-3.5 shrink-0 justify-center text-hub">
                      {paid && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}
                    </span>
                    <span className="truncate">{b.name}</span>
                  </button>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={detailId}
                    aria-label={`Details for ${b.name}${b.note ? " (has a note)" : ""}`}
                    onClick={() => toggleOpen(b.id)}
                    className="relative my-1.5 inline-flex w-9 shrink-0 items-center justify-center rounded-r-md border-l border-border text-muted transition-colors hover:text-text"
                  >
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      className={`transition-transform duration-150 ease-out ${open ? "rotate-90" : ""}`}
                    />
                    {b.note && !open && (
                      <span aria-hidden="true" className="absolute right-2 top-0 h-1.5 w-1.5 rounded-full bg-hub" />
                    )}
                  </button>
                </div>

                <span className="col-start-2 row-start-1 inline-flex justify-center sm:col-start-5">
                  <RowAction icon={Pencil} label={`Edit ${b.name}`} onClick={() => setEditingId(b.id)} />
                </span>

                {/* Phone: due · amount · status on a second line. */}
                <span className="col-span-2 flex gap-2 px-1 text-xs sm:hidden">
                  <span className="tabular text-muted">Due {dayLabel(dueDate(b))}</span>
                  <span className="tabular text-text">{money(b.amount_chf)}</span>
                  <span className={`ml-auto ${status.tone}`}>{status.text}</span>
                </span>

                {/* From sm: in columns. */}
                <span className="tabular hidden text-sm text-muted sm:col-start-2 sm:row-start-1 sm:block">
                  {dayLabel(dueDate(b))}
                </span>
                <span className="tabular hidden text-right text-sm text-text sm:col-start-3 sm:row-start-1 sm:block">
                  {money(b.amount_chf)}
                </span>
                <span className={`hidden text-right text-xs sm:col-start-4 sm:row-start-1 sm:block ${status.tone}`}>
                  {status.text}
                </span>
              </div>

              {open && (
                <div id={detailId} className="mb-3 ml-1 border-l-2 border-hub/60 pl-4">
                  <p className="mb-1.5 text-xs text-faint">Note</p>
                  <PaymentNote billId={b.id} name={b.name} initial={b.note} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {addPayment}
    </div>
  );
}
