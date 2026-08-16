"use client";

import { accentControl } from "@/components/ui/accents";
import type { BillStatus } from "@/lib/db/bills";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

// Bills §7: paid checkbox per current month. Warm colors are urgency only —
// warn when unpaid past due_day, danger when last month rolled over unpaid.

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
    return (
      <div className="max-w-lg rounded-lg border border-border bg-surface px-3 py-6 text-center text-xs text-faint">
        no bills tracked — add one to see it here each month
      </div>
    );
  }

  const paidCount = bills.filter((b) => valueFor(b, b.paid)).length;
  const openChf = bills.reduce((s, b) => s + (valueFor(b, b.paid) ? 0 : (b.amount_chf ?? 0)), 0);

  return (
    <div className="max-w-lg rounded-lg border border-border bg-surface" aria-busy={isPending}>
      {isPending && <div className="h-0.5 rounded-t-lg bg-personal/40" aria-hidden="true" />}
      <div className="flex items-baseline justify-between border-b border-border px-3 py-2">
        <span className="tabular text-xs font-medium text-muted">
          {paidCount} of {bills.length} paid
        </span>
        {error ? (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        ) : (
          openChf > 0 && <span className="tabular text-xs text-faint">CHF {chf.format(openChf)} open</span>
        )}
      </div>
      <ul className="divide-y divide-border">
        {bills.map((b) => {
          const paid = valueFor(b, b.paid);
          const overdue = !paid && dayOfMonth > b.due_day;
          const tone = b.prevMonthMissed && !paid ? "text-danger" : overdue ? "text-warn" : "text-muted";
          return (
            <li key={b.id} className="flex items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                checked={paid}
                onChange={() => toggle(b, paid)}
                className={`h-4 w-4 cursor-pointer ${accentControl.personal}`}
                aria-label={`${b.name} paid this month`}
              />
              <span className={`flex-1 text-sm ${paid ? "text-muted line-through" : ""}`}>{b.name}</span>
              {b.amount_chf !== null && (
                <span className="tabular text-xs text-muted">CHF {chf.format(b.amount_chf)}</span>
              )}
              <span className={`tabular w-20 text-right text-xs ${tone}`}>
                {paid
                  ? "paid"
                  : b.prevMonthMissed
                    ? "missed last mo"
                    : overdue
                      ? `late · due ${ordinal(b.due_day)}`
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
