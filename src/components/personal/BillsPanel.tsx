"use client";

import { accentControl } from "@/components/ui/accents";
import type { BillStatus } from "@/lib/db/bills";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

// Bills §7: paid checkbox per current month. Warm colors are urgency only —
// warn when unpaid past due_day, danger when last month rolled over unpaid.
//
// Unpaid sorts first, because the tile exists to answer "what have I not paid".
// Frameless: it sits inside a `Tile`, and its own border was the second identical
// rectangle 16px inside the first. Status is never colour alone — every row
// prints its words ("late · due 1st") beside the tone.

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function BillsPanel({
  bills,
  month,
  dayOfMonth,
}: {
  bills: BillStatus[];
  month: string;
  dayOfMonth: number;
}) {
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
    return <p className="text-sm text-muted">No bills tracked yet.</p>;
  }

  const paidCount = bills.filter((b) => valueFor(b, b.paid)).length;
  const openChf = bills.reduce((s, b) => s + (valueFor(b, b.paid) ? 0 : (b.amount_chf ?? 0)), 0);

  // Unpaid first, latest-due-day first within each group — the order the tile
  // is read in. `sort` on a copy: the prop array belongs to the server render.
  const ordered = [...bills].sort((a, b) => {
    const aPaid = valueFor(a, a.paid) ? 1 : 0;
    const bPaid = valueFor(b, b.paid) ? 1 : 0;
    if (aPaid !== bPaid) return aPaid - bPaid;
    return a.due_day - b.due_day || a.id - b.id;
  });

  return (
    <div className="flex flex-col gap-2" aria-busy={isPending}>
      {isPending && <div className="h-0.5 rounded-full bg-personal/40" aria-hidden="true" />}
      <div className="flex items-baseline justify-between gap-3">
        <span className="tabular text-xs font-medium text-muted">
          {paidCount} of {bills.length} paid
        </span>
        {error ? (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        ) : (
          openChf > 0 && (
            <span className="tabular t-metric text-sm">
              CHF {chf.format(openChf)} <span className="text-xs font-normal text-faint">open</span>
            </span>
          )
        )}
      </div>
      <ul className="divide-y divide-border border-t border-border">
        {ordered.map((b) => {
          const paid = valueFor(b, b.paid);
          const overdue = !paid && dayOfMonth > b.due_day;
          const tone = b.prevMonthMissed && !paid ? "text-danger" : overdue ? "text-warn" : "text-muted";
          return (
            <li key={b.id} className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                checked={paid}
                onChange={() => toggle(b, paid)}
                className={`h-4 w-4 cursor-pointer ${accentControl.personal}`}
                aria-label={`${b.name} paid this month`}
              />
              <span className={`min-w-0 flex-1 text-sm ${paid ? "text-muted line-through" : ""}`}>{b.name}</span>
              {b.amount_chf !== null && (
                <span className="tabular shrink-0 text-xs text-muted whitespace-nowrap">{chf.format(b.amount_chf)}</span>
              )}
              <span className={`tabular w-[4.5rem] shrink-0 text-right text-xs whitespace-nowrap ${tone}`}>
                {paid
                  ? "paid"
                  : b.prevMonthMissed
                    ? "missed last mo"
                    : overdue
                      ? `late · ${ordinal(b.due_day)}`
                      : `due ${ordinal(b.due_day)}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
