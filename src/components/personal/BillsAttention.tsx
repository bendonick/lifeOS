"use client";

import { useId, useState } from "react";
import { ChevronRight, Pencil } from "lucide-react";
import { PaymentForm } from "@/components/personal/PaymentForm";
import { Disclosure, DisclosureTrigger } from "@/components/ui/Disclosure";
import { RowAction } from "@/components/ui/RowAction";
import { accentControl } from "@/components/ui/accents";
import type { BillStatus } from "@/lib/db/bills";
import { dayLabel, daysInMonth } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

/**
 * Bills needing attention (decision #81): the month's unpaid bills as one
 * module — the outstanding total in full, then a row per bill with its amount
 * and a status in words and a date, never colour alone. A row opens to its
 * detail, which is where the paid box lives; "Manage bills" is the full list,
 * paid included, with every box. Warm colours mean urgency only: amber past
 * the due day, red when last month rolled over unpaid.
 *
 * "Manage bills" is also where payments are edited with their amounts (a
 * pencil per row opens the shared PaymentForm with its amount field) and
 * added ("Add payment" under the list). Personal edits name and due day only.
 *
 * Count, total and rows all move with the optimistic toggle, which is why they
 * render here rather than in the tile header. The due-period scope is the
 * existing one: this calendar month, `billsForMonth(month)`.
 */
const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function BillsAttention({ bills, month, today }: { bills: BillStatus[]; month: string; today: string }) {
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [manage, setManage] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const listId = useId();
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
    <Disclosure variant="add" accent="personal" summary="Add payment" openSummary="Cancel" className="mt-3">
      <PaymentForm withAmount />
    </Disclosure>
  );

  if (bills.length === 0) {
    return (
      <div>
        <p className="text-sm text-muted">No bills tracked yet.</p>
        {addPayment}
      </div>
    );
  }

  const dayOfMonth = Number(today.slice(8, 10));
  const paidOf = (b: BillStatus) => valueFor(b, b.paid);
  // A due day past the month's end (31 in November) falls on its last day.
  const dueDay = (b: BillStatus) => Math.min(b.due_day, daysInMonth(month));
  const dueDate = (b: BillStatus) => `${month}-${String(dueDay(b)).padStart(2, "0")}`;
  const statusOf = (b: BillStatus): { text: string; tone: string } => {
    if (paidOf(b)) return { text: "Paid", tone: "text-muted" };
    if (b.prevMonthMissed) return { text: "Missed last month", tone: "text-danger" };
    if (dayOfMonth > dueDay(b)) return { text: "Overdue", tone: "text-warn" };
    return { text: `Due ${dayLabel(dueDate(b))}`, tone: "text-muted" };
  };

  const ordered = [...bills].sort((a, b) => a.due_day - b.due_day || a.id - b.id);
  const unpaid = ordered.filter((b) => !paidOf(b));
  const outstanding = unpaid.reduce((s, b) => s + (b.amount_chf ?? 0), 0);
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(`${month}-15T12:00:00Z`)
  );

  return (
    <div aria-busy={isPending}>
      {unpaid.length === 0 ? (
        <p className="text-sm text-muted">All paid for {monthName}.</p>
      ) : (
        <>
          <div>
            <div className="tabular t-metric text-3xl">CHF {chf.format(outstanding)}</div>
            <p className="tabular mt-0.5 text-sm text-muted">
              outstanding · {unpaid.length} unpaid
            </p>
          </div>

          <ul className="mt-3 divide-y divide-border border-t border-border">
            {unpaid.map((b) => {
              const status = statusOf(b);
              const open = openRow === b.id;
              const detailId = `${listId}-${b.id}`;
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={detailId}
                    onClick={() => setOpenRow(open ? null : b.id)}
                    className="flex min-h-12 w-full items-center gap-3 rounded py-2 text-left transition-colors hover:bg-raised/30"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-text">{b.name}</span>
                    {b.amount_chf !== null && (
                      <span className="tabular shrink-0 text-sm text-text whitespace-nowrap">
                        CHF {chf.format(b.amount_chf)}
                      </span>
                    )}
                    <span className={`shrink-0 text-xs whitespace-nowrap ${status.tone}`}>{status.text}</span>
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      className={`shrink-0 text-faint transition-transform duration-150 ease-out ${open ? "rotate-90" : ""}`}
                    />
                  </button>
                  {open && (
                    <div id={detailId} className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-3 pl-1 text-xs text-muted">
                      <span className="tabular">
                        Due {dayLabel(dueDate(b))}
                        {b.prevMonthMissed && " · last month unpaid"}
                      </span>
                      <PaidBox bill={b} paid={paidOf(b)} onToggle={toggle} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="mt-3">
        <DisclosureTrigger
          open={manage}
          onToggle={() => setManage((v) => !v)}
          summary="Manage bills"
          openSummary="Hide bills"
          detail={`${bills.length - unpaid.length} of ${bills.length} paid`}
        />
      </div>
      {manage && (
        <ul className="mt-2 divide-y divide-border border-t border-border">
          {ordered.map((b) => {
            if (editingId === b.id) {
              return (
                <li key={b.id} className="py-2.5">
                  <PaymentForm payment={b} withAmount onDone={() => setEditingId(null)} />
                </li>
              );
            }
            const paid = paidOf(b);
            const status = statusOf(b);
            return (
              <li key={b.id} className="flex min-h-11 items-center gap-3 py-1.5">
                <PaidBox bill={b} paid={paid} onToggle={toggle} compact />
                <span className={`min-w-0 flex-1 truncate text-sm ${paid ? "text-muted line-through" : "text-text"}`}>
                  {b.name}
                </span>
                {b.amount_chf !== null && (
                  <span className="tabular shrink-0 text-xs text-muted whitespace-nowrap">CHF {chf.format(b.amount_chf)}</span>
                )}
                <span className={`tabular shrink-0 text-xs whitespace-nowrap ${status.tone}`}>
                  {paid ? "paid" : `due ${dayLabel(dueDate(b))}`}
                </span>
                <RowAction icon={Pencil} label={`Edit ${b.name}`} onClick={() => setEditingId(b.id)} />
              </li>
            );
          })}
        </ul>
      )}
      {manage && addPayment}
    </div>
  );
}

function PaidBox({
  bill,
  paid,
  onToggle,
  compact = false,
}: {
  bill: BillStatus;
  paid: boolean;
  onToggle: (bill: BillStatus, current: boolean) => void;
  compact?: boolean;
}) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 ${compact ? "h-6 w-6 justify-center" : ""}`}>
      <input
        type="checkbox"
        checked={paid}
        onChange={() => onToggle(bill, paid)}
        className={`h-4 w-4 cursor-pointer ${accentControl.personal}`}
        aria-label={`${bill.name} paid this month`}
      />
      {!compact && <span className="text-text">{paid ? "Paid" : "Mark as paid"}</span>}
    </label>
  );
}
