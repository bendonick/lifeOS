"use client";

import { Check, ChevronRight, Pencil } from "lucide-react";
import { useId, useState } from "react";
import { PaymentForm } from "@/components/personal/PaymentForm";
import { PaymentNote } from "@/components/personal/PaymentNote";
import { TagFilterRow, TagFilterSummary, useTagFilter } from "@/components/personal/TagFilter";
import { Disclosure } from "@/components/ui/Disclosure";
import { Pill } from "@/components/ui/Pill";
import { RowAction } from "@/components/ui/RowAction";
import { Tabs } from "@/components/ui/Tabs";
import type { BillStatus } from "@/lib/db/bills";
import { dayLabel, daysInMonth } from "@/lib/dates";
import { formatChf } from "@/lib/personal/payments";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

/**
 * Monthly payments on the Money page: the core payments you pay yourself and
 * tick, as on Personal, with the figures. Subscriptions bill themselves and
 * live in their own module below (`SubscriptionsList`); choosing Core or
 * Subscription in a payment's editor moves it between the two.
 *
 * One row per payment, in columns: the payment (its name is its tick, drawn
 * as on Personal and on Habits), its tags, the due date this month, the
 * amount, and a status in words. Above the list, "N of M paid" with what is
 * still to pay, and the monthly total. "Add payment" under the list, or
 * Payment in the page's `+ Add` menu (`#new-payment`), adds one with its
 * amount and tags.
 *
 * **Tags** are as many words as you like (Utility and Tech on one payment).
 * They filter, never group, so nothing is counted twice: the tag row above the
 * list (`TagFilter`) takes any number of tags and shows the payments carrying
 * any of them, with their monthly sum; none picked shows every payment. Sort
 * (Due, Amount, Name) sits beside it. Picks last while the page is open.
 *
 * A pencil at the end of a row turns it into its editor, the shared
 * PaymentForm with its amount, type and tags: name, due day, amount, Core or
 * Subscription, tags (typed, with the tags in use offered), Save, Cancel,
 * Remove payment (asks once; its paid months stay in the log). One row is
 * edited at a time.
 *
 * At the right end of the payment's bar, inside it, a chevron opens the row's
 * **Details**: for now a note (`PaymentNote`), read and written in place
 * without going into the editor. Closed at rest; any number of rows can be
 * open. A dot on the chevron says a note exists while the row is closed.
 *
 * Below `sm` a row is two lines: the bar and the pencil, then due · amount ·
 * tags · status, so the name keeps its width on a phone.
 */
// With a Tags column once any payment has a tag; without, the column would
// sit empty.
const COLS_TAGS = "sm:grid-cols-[minmax(0,1fr)_10rem_6.5rem_6.5rem_8.5rem_1.75rem]";
const COLS_PLAIN = "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_8.5rem_1.75rem]";

type Sort = "due" | "amount" | "name";

export function PaymentsLedger({
  bills,
  month,
  today,
  tagSuggestions,
}: {
  /** The core payments; subscriptions are listed apart. */
  bills: BillStatus[];
  month: string;
  today: string;
  /** Offered in the tag field: the tags on every payment, then the starters. */
  tagSuggestions: string[];
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());
  const [sort, setSort] = useState<Sort>("due");
  const filter = useTagFilter(bills);
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
    // Keyed, so adding the first one keeps the form open for the next as the
    // empty line gives way to the list.
    <Disclosure
      key="add"
      variant="add"
      accent="personal"
      summary="Add payment"
      openSummary="Cancel"
      anchors={["new-payment"]}
      className="mt-3"
    >
      <PaymentForm withAmount withLabels tagSuggestions={tagSuggestions} inputId="new-payment" />
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

  const sum = (list: BillStatus[]) => list.reduce((s, b) => s + (b.amount_chf ?? 0), 0);
  const paidCount = bills.filter(paidOf).length;
  const owed = sum(bills.filter((b) => !paidOf(b)));
  const perMonth = (list: BillStatus[]) =>
    list.some((b) => b.amount_chf !== null) ? `${formatChf(sum(list))} a month` : "no amounts yet";

  const byName = (a: BillStatus, b: BillStatus) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  const ordered = [...filter.shown].sort((a, b) =>
    sort === "amount"
      ? (b.amount_chf ?? -1) - (a.amount_chf ?? -1) || byName(a, b)
      : sort === "name"
        ? byName(a, b)
        : dueDay(a) - dueDay(b) || byName(a, b)
  );
  const hasTags = filter.inUse.length > 0;
  const COLS = hasTags ? COLS_TAGS : COLS_PLAIN;
  // Where each column sits from sm; one further right with a Tags column.
  const POS = hasTags
    ? { due: "sm:col-start-3", amount: "sm:col-start-4", status: "sm:col-start-5", edit: "sm:col-start-6" }
    : { due: "sm:col-start-2", amount: "sm:col-start-3", status: "sm:col-start-4", edit: "sm:col-start-5" };

  const renderRow = (b: BillStatus) => {
    if (editingId === b.id) {
      return (
        <li key={b.id} className="py-2.5">
          <PaymentForm
            payment={b}
            withAmount
            withLabels
            tagSuggestions={tagSuggestions}
            onDone={() => setEditingId(null)}
          />
        </li>
      );
    }
    const paid = paidOf(b);
    const status = statusOf(b);
    const open = openIds.has(b.id);
    const detailId = `${baseId}-${b.id}`;
    return (
      <li key={b.id}>
        <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-1.5 ${COLS}`}>
          {/* The bar: the tick (the name, as on Personal) and, at its right
              end, the Details toggle. Two buttons in one box. */}
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

          <span className={`col-start-2 row-start-1 inline-flex justify-center ${POS.edit}`}>
            <RowAction icon={Pencil} label={`Edit ${b.name}`} onClick={() => setEditingId(b.id)} />
          </span>

          {/* Phone: due · amount · tags · status on a second line. */}
          <span className="col-span-2 flex min-w-0 gap-2 px-1 text-xs sm:hidden">
            <span className="tabular shrink-0 text-muted">Due {dayLabel(dueDate(b))}</span>
            <span className="tabular shrink-0 text-text">{formatChf(b.amount_chf)}</span>
            {b.tags.length > 0 && <span className="truncate text-faint">{b.tags.join(" · ")}</span>}
            <span className={`ml-auto shrink-0 ${status.tone}`}>{status.text}</span>
          </span>

          {/* From sm: in columns. */}
          {hasTags && (
            <span className="hidden flex-wrap gap-1 sm:col-start-2 sm:row-start-1 sm:flex">
              {b.tags.map((t) => (
                <Pill key={t}>{t}</Pill>
              ))}
            </span>
          )}
          <span className={`tabular hidden text-sm text-muted sm:row-start-1 sm:block ${POS.due}`}>
            {dayLabel(dueDate(b))}
          </span>
          <span className={`tabular hidden text-right text-sm text-text sm:row-start-1 sm:block ${POS.amount}`}>
            {formatChf(b.amount_chf)}
          </span>
          <span className={`hidden text-right text-xs sm:row-start-1 sm:block ${POS.status} ${status.tone}`}>
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
  };

  return (
    <div aria-busy={isPending}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-2">
        <span className="tabular text-sm text-text">
          {paidCount} of {bills.length} paid <span className="text-muted">· {formatChf(owed)} still to pay</span>
        </span>
        <span className="tabular text-sm text-muted">{perMonth(bills)}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3">
        <TagFilterRow filter={filter} total={bills.length} noun="payment" />
        <span className="flex items-center gap-2 text-xs text-muted">
          Sort
          <Tabs
            label="Sort payments"
            accent="personal"
            className=""
            active={sort}
            onChange={setSort}
            tabs={[
              { key: "due", label: "Due" },
              { key: "amount", label: "Amount" },
              { key: "name", label: "Name" },
            ]}
          />
        </span>
      </div>

      <TagFilterSummary filter={filter} noun="payment" perMonth={perMonth(filter.shown)} />

      {error && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div aria-hidden="true" className={`hidden gap-x-3 border-b border-border pb-1.5 text-xs text-faint sm:grid ${COLS}`}>
        <span>Payment</span>
        {hasTags && <span>Tags</span>}
        <span>Due</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Status</span>
        <span />
      </div>

      <ul className="divide-y divide-border border-b border-border max-sm:border-t">{ordered.map(renderRow)}</ul>

      {addPayment}
    </div>
  );
}
