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

  return (
    <ul
      className={`divide-y divide-border rounded-lg border border-border bg-surface ${isPending ? "opacity-60" : ""} transition-opacity`}
    >
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
            <span className={`tabular w-24 text-right text-xs ${tone}`}>
              {b.paid
                ? "paid"
                : b.prevMonthMissed
                  ? "missed last mo"
                  : overdue
                    ? `due day ${b.due_day} · late`
                    : `due day ${b.due_day}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
