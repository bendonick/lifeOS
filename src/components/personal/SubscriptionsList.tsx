"use client";

import { ChevronRight, Pencil, RefreshCw } from "lucide-react";
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

/**
 * Subscriptions on the Money page: the payments that bill themselves
 * (streaming, apps, delivery and travel passes), so there is nothing to tick.
 * They are payments of type Subscription, kept apart from Monthly payments
 * (`PaymentsLedger`) and left off Personal's checklist; choosing Core or
 * Subscription in the editor moves a payment between the two lists.
 *
 * One row per subscription, in columns: the subscription, its tags, the day it
 * bills this month, and the amount. The bar has a repeat mark where a payment
 * has its tick, and the whole bar opens the row's **Details** (its note, as on
 * Monthly payments), with a dot on the chevron while a note exists and the row
 * is closed. A date still to come this month is in full ink, one already
 * billed is muted. Above the list, how many there are and how many still bill
 * this month, and what they cost a month and a year.
 *
 * The tag row filters as on Monthly payments (any number of tags, a row shows
 * when it carries any of them, none picked shows all), and Sort orders by
 * date, amount or name. The pencil opens the shared PaymentForm; "Add
 * subscription", or Subscription in the page's `+ Add` menu
 * (`#new-subscription`), adds one already set to Subscription.
 *
 * Below `sm` a row is two lines: the bar and the pencil, then the date ·
 * amount · tags.
 */
const COLS_TAGS = "sm:grid-cols-[minmax(0,1fr)_10rem_6.5rem_6.5rem_1.75rem]";
const COLS_PLAIN = "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_1.75rem]";

type Sort = "date" | "amount" | "name";

export function SubscriptionsList({
  subscriptions,
  month,
  today,
  tagSuggestions,
}: {
  subscriptions: BillStatus[];
  month: string;
  today: string;
  tagSuggestions: string[];
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());
  const [sort, setSort] = useState<Sort>("date");
  const filter = useTagFilter(subscriptions);
  const baseId = useId();
  const toggleOpen = (id: number) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addSubscription = (
    // Keyed, so adding the first one keeps the form open for the next as the
    // empty line gives way to the list.
    <Disclosure
      key="add"
      variant="add"
      accent="personal"
      summary="Add subscription"
      openSummary="Cancel"
      anchors={["new-subscription"]}
      className="mt-3"
    >
      <PaymentForm
        withAmount
        withLabels
        defaultKind="subscription"
        tagSuggestions={tagSuggestions}
        inputId="new-subscription"
      />
    </Disclosure>
  );

  if (subscriptions.length === 0) {
    return (
      <div>
        <p className="text-sm text-muted">No subscriptions yet.</p>
        {addSubscription}
      </div>
    );
  }

  const dayOfMonth = Number(today.slice(8, 10));
  const lastDay = daysInMonth(month);
  const billDay = (s: BillStatus) => Math.min(s.due_day, lastDay);
  const billDate = (s: BillStatus) => `${month}-${String(billDay(s)).padStart(2, "0")}`;
  const toCome = (s: BillStatus) => billDay(s) >= dayOfMonth;

  const sum = (list: BillStatus[]) => list.reduce((t, s) => t + (s.amount_chf ?? 0), 0);
  const perMonth = (list: BillStatus[]) =>
    list.some((s) => s.amount_chf !== null) ? `${formatChf(sum(list))} a month` : "no amounts yet";
  const stillToBill = subscriptions.filter(toCome).length;

  const byName = (a: BillStatus, b: BillStatus) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  const ordered = [...filter.shown].sort((a, b) =>
    sort === "amount"
      ? (b.amount_chf ?? -1) - (a.amount_chf ?? -1) || byName(a, b)
      : sort === "name"
        ? byName(a, b)
        : billDay(a) - billDay(b) || byName(a, b)
  );
  const hasTags = filter.inUse.length > 0;
  const COLS = hasTags ? COLS_TAGS : COLS_PLAIN;
  const POS = hasTags
    ? { date: "sm:col-start-3", amount: "sm:col-start-4", edit: "sm:col-start-5" }
    : { date: "sm:col-start-2", amount: "sm:col-start-3", edit: "sm:col-start-4" };

  const renderRow = (s: BillStatus) => {
    if (editingId === s.id) {
      return (
        <li key={s.id} className="py-2.5">
          <PaymentForm
            payment={s}
            withAmount
            withLabels
            tagSuggestions={tagSuggestions}
            onDone={() => setEditingId(null)}
          />
        </li>
      );
    }
    const open = openIds.has(s.id);
    const detailId = `${baseId}-${s.id}`;
    const dateTone = toCome(s) ? "text-text" : "text-muted";
    return (
      <li key={s.id}>
        <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-1.5 ${COLS}`}>
          {/* The bar: nothing to tick, so the whole bar opens the Details. */}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={`Details for ${s.name}${s.note ? " (has a note)" : ""}`}
            onClick={() => toggleOpen(s.id)}
            className="col-start-1 row-start-1 flex min-h-9 min-w-0 items-stretch rounded-md bg-raised/60 text-left text-sm text-text ring-1 ring-inset ring-border transition-colors hover:bg-raised"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-2.5 pr-2">
              <span className="inline-flex w-3.5 shrink-0 justify-center text-muted">
                <RefreshCw size={12} aria-hidden="true" />
              </span>
              <span className="truncate">{s.name}</span>
            </span>
            <span className="relative my-1.5 inline-flex w-9 shrink-0 items-center justify-center border-l border-border text-muted">
              <ChevronRight
                size={14}
                aria-hidden="true"
                className={`transition-transform duration-150 ease-out ${open ? "rotate-90" : ""}`}
              />
              {s.note && !open && (
                <span aria-hidden="true" className="absolute right-2 top-0 h-1.5 w-1.5 rounded-full bg-hub" />
              )}
            </span>
          </button>

          <span className={`col-start-2 row-start-1 inline-flex justify-center ${POS.edit}`}>
            <RowAction icon={Pencil} label={`Edit ${s.name}`} onClick={() => setEditingId(s.id)} />
          </span>

          {/* Phone: date · amount · tags on a second line. */}
          <span className="col-span-2 flex min-w-0 gap-2 px-1 text-xs sm:hidden">
            <span className={`tabular shrink-0 ${dateTone}`}>Bills {dayLabel(billDate(s))}</span>
            <span className="tabular shrink-0 text-text">{formatChf(s.amount_chf)}</span>
            {s.tags.length > 0 && <span className="truncate text-faint">{s.tags.join(" · ")}</span>}
          </span>

          {/* From sm: in columns. */}
          {hasTags && (
            <span className="hidden flex-wrap gap-1 sm:col-start-2 sm:row-start-1 sm:flex">
              {s.tags.map((t) => (
                <Pill key={t}>{t}</Pill>
              ))}
            </span>
          )}
          <span className={`tabular hidden text-sm sm:row-start-1 sm:block ${POS.date} ${dateTone}`}>
            {dayLabel(billDate(s))}
          </span>
          <span className={`tabular hidden text-right text-sm text-text sm:row-start-1 sm:block ${POS.amount}`}>
            {formatChf(s.amount_chf)}
          </span>
        </div>

        {open && (
          <div id={detailId} className="mb-3 ml-1 border-l-2 border-hub/60 pl-4">
            <p className="mb-1.5 text-xs text-faint">Note</p>
            <PaymentNote billId={s.id} name={s.name} initial={s.note} />
          </div>
        )}
      </li>
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-2">
        <span className="tabular text-sm text-text">
          {subscriptions.length} {subscriptions.length === 1 ? "subscription" : "subscriptions"}{" "}
          <span className="text-muted">
            · {stillToBill ? `${stillToBill} still to bill this month` : "all billed this month"}
          </span>
        </span>
        <span className="tabular text-sm text-muted">
          <span className="whitespace-nowrap">{perMonth(subscriptions)}</span>
          {subscriptions.some((s) => s.amount_chf !== null) && (
            <>
              {" "}
              · <span className="whitespace-nowrap">{formatChf(sum(subscriptions) * 12)} a year</span>
            </>
          )}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3">
        <TagFilterRow filter={filter} total={subscriptions.length} noun="subscription" />
        <span className="flex items-center gap-2 text-xs text-muted">
          Sort
          <Tabs
            label="Sort subscriptions"
            accent="personal"
            className=""
            active={sort}
            onChange={setSort}
            tabs={[
              { key: "date", label: "Date" },
              { key: "amount", label: "Amount" },
              { key: "name", label: "Name" },
            ]}
          />
        </span>
      </div>

      <TagFilterSummary filter={filter} noun="subscription" perMonth={perMonth(filter.shown)} />

      <div aria-hidden="true" className={`hidden gap-x-3 border-b border-border pb-1.5 text-xs text-faint sm:grid ${COLS}`}>
        <span>Subscription</span>
        {hasTags && <span>Tags</span>}
        <span>Bills on</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      <ul className="divide-y divide-border border-b border-border max-sm:border-t">{ordered.map(renderRow)}</ul>

      {addSubscription}
    </div>
  );
}
