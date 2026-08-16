"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { BillStatus } from "@/lib/db/bills";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function toggle(bill: BillStatus) {
    await fetch(`/api/bills/${bill.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, paid: !bill.paid }),
    });
    startTransition(() => router.refresh());
  }

  const paidCount = bills.filter((b) => b.paid).length;
  const openChf = bills.reduce((s, b) => s + (b.paid ? 0 : (b.amount_chf ?? 0)), 0);

  return (
    <div
      className={`max-w-lg rounded-lg border border-border bg-surface ${isPending ? "opacity-60" : ""} transition-opacity`}
    >
      <div className="flex items-baseline justify-between border-b border-border px-3 py-2">
        <span className="tabular text-xs font-medium text-muted">
          {paidCount} of {bills.length} paid
        </span>
        {openChf > 0 && (
          <span className="tabular text-xs text-faint">CHF {chf.format(openChf)} open</span>
        )}
      </div>
      <ul className="divide-y divide-border">
        {bills.map((b) => {
          const overdue = !b.paid && dayOfMonth > b.due_day;
          const tone = b.prevMonthMissed && !b.paid ? "text-danger" : overdue ? "text-warn" : "text-muted";
          return (
            <li key={b.id} className="flex items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                checked={b.paid}
                onChange={() => toggle(b)}
                className="h-4 w-4 cursor-pointer accent-[#a78bfa]"
                aria-label={`${b.name} paid this month`}
              />
              <span className={`flex-1 text-sm ${b.paid ? "text-muted line-through" : ""}`}>{b.name}</span>
              {b.amount_chf !== null && (
                <span className="tabular text-xs text-muted">CHF {chf.format(b.amount_chf)}</span>
              )}
              <span className={`tabular w-20 text-right text-xs ${tone}`}>
                {b.paid
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
