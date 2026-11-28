"use client";

import { Check, ChevronRight, Pencil } from "lucide-react";
import { useId, useState } from "react";
import { PaymentForm } from "@/components/personal/PaymentForm";
import { PaymentNote } from "@/components/personal/PaymentNote";
import { tagKey } from "@/components/personal/TagField";
import { Disclosure } from "@/components/ui/Disclosure";
import { Pill } from "@/components/ui/Pill";
import { RowAction } from "@/components/ui/RowAction";
import { Tabs } from "@/components/ui/Tabs";
import type { BillStatus } from "@/lib/db/bills";
import { dayLabel, daysInMonth } from "@/lib/dates";
import { STARTER_TAGS, type PaymentKind } from "@/lib/personal/payments";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

/**
 * Monthly payments on the Money page: the checklist Personal shows, with the
 * figures. One row per bill or subscription, in columns: the payment (its
 * name is its tick, drawn as on Personal and on Habits), its tags, the due
 * date this month, the amount, and a status in words. Above the list, "N of M
 * paid" with what is still to pay, and the month split into core costs and
 * subscriptions with the total. "Add payment" under the list, or Payment in
 * the page's `+ Add` menu (`#new-payment`), adds one with its amount, type
 * and tags.
 *
 * **Type and tags.** Each payment is exactly one type, Core (rent, insurance,
 * the travel pass) or Subscription (a service you could cancel), and the list
 * is grouped by it, each group with its own "N of M paid · CHF X a month";
 * because a payment is in exactly one group, the groups add up to the total.
 * Tags are as many words as you like (Utility and Tech on one payment). They
 * filter rather than group, so nothing is counted twice: the tag row above
 * the list takes any number of tags and shows the payments carrying any of
 * them, with their monthly sum; none picked shows every payment. Group (Type,
 * None) and Sort (Due, Amount, Name) sit beside it. Picks last while the page
 * is open; a reload starts from Type, Due and every payment.
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
// Whole francs as "CHF 70", anything with cents as "CHF 12.90".
const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const chfCents = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// With a Tags column once any payment has a tag; without, the column would
// sit empty.
const COLS_TAGS = "sm:grid-cols-[minmax(0,1fr)_10rem_6.5rem_6.5rem_8.5rem_1.75rem]";
const COLS_PLAIN = "sm:grid-cols-[minmax(0,1fr)_6.5rem_6.5rem_8.5rem_1.75rem]";

type Group = "type" | "none";
type Sort = "due" | "amount" | "name";
const GROUPS: { key: PaymentKind; title: string }[] = [
  { key: "core", title: "Core" },
  { key: "subscription", title: "Subscriptions" },
];

export function PaymentsLedger({ bills, month, today }: { bills: BillStatus[]; month: string; today: string }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());
  const [picked, setPicked] = useState<Set<string>>(() => new Set()); // tag keys
  const [group, setGroup] = useState<Group>("type");
  const [sort, setSort] = useState<Sort>("due");
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

  // Every tag in use, once each (first spelling wins), A to Z, with how many
  // payments carry it.
  const tagCounts = new Map<string, { tag: string; count: number }>();
  for (const b of bills) {
    for (const t of b.tags) {
      const k = tagKey(t);
      const seen = tagCounts.get(k);
      if (seen) seen.count += 1;
      else tagCounts.set(k, { tag: t, count: 1 });
    }
  }
  const tagsInUse = [...tagCounts.values()].sort((a, b) => a.tag.localeCompare(b.tag, "en", { sensitivity: "base" }));
  const suggestions = [
    ...tagsInUse.map((t) => t.tag),
    ...STARTER_TAGS.filter((s) => !tagCounts.has(tagKey(s))),
  ];

  const addPayment = (
    <Disclosure
      variant="add"
      accent="personal"
      summary="Add payment"
      openSummary="Cancel"
      anchors={["new-payment"]}
      className="mt-3"
    >
      <PaymentForm withAmount withLabels tagSuggestions={suggestions} inputId="new-payment" />
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
  // Rounded to the cent first, so a sum like 19.9 + 0.1 reads "CHF 20".
  const money = (n: number | null) => {
    if (n === null) return "—";
    const c = Math.round(n * 100) / 100;
    return `CHF ${Number.isInteger(c) ? chf.format(c) : chfCents.format(c)}`;
  };
  const sum = (list: BillStatus[]) => list.reduce((s, b) => s + (b.amount_chf ?? 0), 0);
  const perMonth = (list: BillStatus[]) =>
    list.some((b) => b.amount_chf !== null) ? `${money(sum(list))} a month` : "no amounts yet";

  // A tag picked and then taken off every payment stops filtering.
  const activePicks = [...picked].filter((k) => tagCounts.has(k));
  const togglePick = (k: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const shown = activePicks.length
    ? bills.filter((b) => b.tags.some((t) => activePicks.includes(tagKey(t))))
    : bills;
  const byName = (a: BillStatus, b: BillStatus) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  const ordered = [...shown].sort((a, b) =>
    sort === "amount"
      ? (b.amount_chf ?? -1) - (a.amount_chf ?? -1) || byName(a, b)
      : sort === "name"
        ? byName(a, b)
        : dueDay(a) - dueDay(b) || byName(a, b)
  );
  const sections =
    group === "type"
      ? GROUPS.map((g) => ({ ...g, list: ordered.filter((b) => b.kind === g.key) })).filter((g) => g.list.length)
      : [{ key: "all", title: null, list: ordered }];
  const hasTags = tagsInUse.length > 0;
  const COLS = hasTags ? COLS_TAGS : COLS_PLAIN;
  const core = sum(bills.filter((b) => b.kind === "core"));
  const subscriptions = sum(bills.filter((b) => b.kind === "subscription"));

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
            tagSuggestions={suggestions}
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
            <span className="tabular shrink-0 text-text">{money(b.amount_chf)}</span>
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
            {money(b.amount_chf)}
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
          {paidCount} of {bills.length} paid <span className="text-muted">· {money(owed)} still to pay</span>
        </span>
        <span className="tabular text-sm text-muted">
          <span className="whitespace-nowrap">{money(core)} core</span> ·{" "}
          <span className="whitespace-nowrap">{money(subscriptions)} subscriptions</span> ·{" "}
          <span className="whitespace-nowrap">{money(total)} a month</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pb-3">
        {hasTags ? (
          <div role="group" aria-label="Filter by tag" className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              aria-pressed={activePicks.length === 0}
              onClick={() => setPicked(new Set())}
              data-view-tab=""
              className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-muted transition-colors hover:text-text"
            >
              All · {bills.length}
            </button>
            {tagsInUse.map(({ tag, count }) => (
              <button
                key={tag}
                type="button"
                aria-pressed={activePicks.includes(tagKey(tag))}
                onClick={() => togglePick(tagKey(tag))}
                data-view-tab=""
                className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-muted transition-colors hover:text-text"
              >
                {tag} · {count}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-faint">Tags you give a payment (its pencil) appear here to filter by.</p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          <span className="flex items-center gap-2">
            Group
            <Tabs
              label="Group payments"
              accent="personal"
              className=""
              active={group}
              onChange={setGroup}
              tabs={[
                { key: "type", label: "Type" },
                { key: "none", label: "None" },
              ]}
            />
          </span>
          <span className="flex items-center gap-2">
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
      </div>

      {activePicks.length > 0 && (
        <p className="tabular pb-2 text-sm text-text">
          {activePicks.map((k) => tagCounts.get(k)!.tag).join(", ")}: {shown.length}{" "}
          {shown.length === 1 ? "payment" : "payments"} · {perMonth(shown)}
          <button type="button" onClick={() => setPicked(new Set())} className="ml-3 text-link hover:text-text">
            Show all
          </button>
        </p>
      )}

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

      {sections.map((sec, i) => (
        <div key={sec.key} className={`border-b border-border ${i === 0 ? "max-sm:border-t" : ""}`}>
          {sec.title && (
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 pb-1 pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-text">{sec.title}</h3>
              <span className="tabular text-xs text-muted">
                {sec.list.filter(paidOf).length} of {sec.list.length} paid · {perMonth(sec.list)}
              </span>
            </div>
          )}
          <ul className="divide-y divide-border">{sec.list.map(renderRow)}</ul>
        </div>
      ))}

      {addPayment}
    </div>
  );
}
