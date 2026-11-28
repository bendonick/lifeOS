"use client";

import { Check, ChevronRight, Pencil } from "lucide-react";
import { useId, useState } from "react";
import { PaymentForm } from "@/components/personal/PaymentForm";
import { Disclosure } from "@/components/ui/Disclosure";
import type { BillStatus, PaymentHistory } from "@/lib/db/bills";
import { dayLabel, daysInMonth, zurichLocal } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

/**
 * Monthly payments on the Money page: the checklist Personal shows, with the
 * figures. One row per bill or subscription, in columns: the payment (its name
 * is its tick, drawn as on Personal and on Habits), the due date this month,
 * the amount, and a status in words. Above the list, "N of M paid", what is
 * still to pay and the monthly total.
 *
 * The rest of a row opens it: the row takes a light ground and its detail
 * opens beneath, ruled at the left: the amount a month and a year, the due
 * day, when this month's tick was made, the last six months as marks (as the
 * habits' week strip draws days), and Edit payment, which turns the detail
 * into the shared PaymentForm with its amount field. One row opens at a time.
 *
 * Below `sm` a row is two lines: the tick and its opener, then due · amount ·
 * status, so the name keeps its width on a phone.
 */
const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const chfWhole = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const COLS = "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_8.5rem_1.5rem]";

export function PaymentsLedger({
  bills,
  history,
  month,
  today,
}: {
  bills: BillStatus[];
  history: PaymentHistory;
  month: string;
  today: string;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const baseId = useId();
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
        <span />
      </div>

      <ul className="divide-y divide-border border-b border-border max-sm:border-t">
        {bills.map((b) => {
          const paid = paidOf(b);
          const status = statusOf(b);
          const open = openId === b.id;
          const detailId = `${baseId}-${b.id}`;
          const opener = (extra: string) => ({
            type: "button" as const,
            "aria-expanded": open,
            "aria-controls": detailId,
            onClick: () => {
              setOpenId(open ? null : b.id);
              setEditingId(null);
            },
            className: `rounded text-left transition-colors ${extra}`,
          });

          return (
            <li key={b.id} className={open ? "bg-raised/40" : ""}>
              <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-1.5 ${COLS}`}>
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

                {/* Phone: the opener is the chevron; due · amount · status sit on a second line. */}
                <button {...opener("inline-flex h-9 w-6 items-center justify-center sm:hidden")} aria-label={`Details for ${b.name}`}>
                  <Chevron open={open} />
                </button>
                <button {...opener("col-span-2 flex gap-2 px-1 text-xs sm:hidden")} tabIndex={-1} aria-hidden="true">
                  <span className="tabular text-muted">Due {dayLabel(dueDate(b))}</span>
                  <span className="tabular text-text">{money(b.amount_chf)}</span>
                  <span className={`ml-auto ${status.tone}`}>{status.text}</span>
                </button>

                {/* From sm: the rest of the row is one opener, in columns. */}
                <button
                  {...opener("col-span-4 hidden min-h-9 items-center gap-x-3 sm:grid sm:grid-cols-subgrid hover:bg-raised/40")}
                  aria-label={`Details for ${b.name}: due ${dayLabel(dueDate(b))}, ${money(b.amount_chf)}, ${status.text}`}
                >
                  <span className="tabular text-sm text-muted">{dayLabel(dueDate(b))}</span>
                  <span className="tabular text-right text-sm text-text">{money(b.amount_chf)}</span>
                  <span className={`text-right text-xs ${status.tone}`}>{status.text}</span>
                  <span className="inline-flex justify-center">
                    <Chevron open={open} />
                  </span>
                </button>
              </div>

              {open && (
                <div id={detailId} className="mb-3 ml-1 border-l-2 border-hub/60 pl-4">
                  {editingId === b.id ? (
                    <div className="py-1">
                      <PaymentForm
                        payment={b}
                        withAmount
                        onDone={() => {
                          setEditingId(null);
                          setOpenId(null);
                        }}
                      />
                    </div>
                  ) : (
                    <Detail
                      bill={b}
                      paid={paid}
                      history={history}
                      month={month}
                      onEdit={() => setEditingId(b.id)}
                    />
                  )}
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

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronRight
      size={14}
      aria-hidden="true"
      className={`text-muted transition-transform duration-150 ease-out ${open ? "rotate-90" : ""}`}
    />
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

const monthShort = (m: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));

function Detail({
  bill,
  paid,
  history,
  month,
  onEdit,
}: {
  bill: BillStatus;
  paid: boolean;
  history: PaymentHistory;
  month: string;
  onEdit: () => void;
}) {
  const h = history.byBill[bill.id] ?? { paidMonths: [], paidAt: null, createdMonth: null };
  const paidMonths = new Set(h.paidMonths);
  // This month follows the tick on screen; earlier months come from the log.
  if (paid) paidMonths.add(month);
  else paidMonths.delete(month);
  // A month counts once the user was ticking payments and this one existed.
  const counts = (m: string) => history.tracked.includes(m) && (h.createdMonth === null || m >= h.createdMonth);
  const counted = history.months.filter(counts);
  const paidCounted = counted.filter((m) => paidMonths.has(m)).length;
  const paidOn = paid && h.paidAt ? dayLabel(zurichLocal(new Date(`${h.paidAt.replace(" ", "T")}Z`)).slice(0, 10)) : null;

  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 py-1 text-xs">
      <dt className="text-faint">Amount</dt>
      <dd className="tabular text-text">
        {bill.amount_chf === null
          ? "Not set"
          : `CHF ${chf.format(bill.amount_chf)} a month · CHF ${chfWhole.format(bill.amount_chf * 12)} a year`}
      </dd>
      <dt className="text-faint">Due</dt>
      <dd className="text-text">The {ordinal(bill.due_day)} of each month</dd>
      <dt className="text-faint">This month</dt>
      <dd className="text-text">{paid ? (paidOn ? `Paid, ticked ${paidOn}` : "Paid") : "Not paid yet"}</dd>
      <dt className="text-faint">Last 6 months</dt>
      <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex">
          {history.months.map((m) => {
            const isPaid = paidMonths.has(m);
            const label = `${monthShort(m)}: ${isPaid ? "paid" : counts(m) ? "not paid" : "not tracked"}`;
            return (
              <span key={m} title={label} className="inline-flex w-7 flex-col items-center gap-0.5">
                <span
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 rounded-[3px] ${
                    isPaid
                      ? m === month
                        ? "bg-hub"
                        : "bg-text"
                      : counts(m)
                        ? "border border-border-strong"
                        : "border border-dashed border-border"
                  }`}
                />
                <span aria-hidden="true" className={`text-[10px] ${m === month ? "font-bold text-text" : "text-faint"}`}>
                  {monthShort(m).slice(0, 1)}
                </span>
                <span className="sr-only">{label}</span>
              </span>
            );
          })}
        </span>
        <span className="text-muted">
          {paidCounted} of {counted.length} tracked {counted.length === 1 ? "month" : "months"} paid
        </span>
      </dd>
      <dt className="sr-only">Edit</dt>
      <dd className="col-start-2 pt-1">
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded text-link hover:text-text">
          <Pencil size={12} aria-hidden="true" /> Edit payment
        </button>
      </dd>
    </dl>
  );
}
