import { db } from "@/lib/db";
import { addDays, monthOf } from "@/lib/dates";

export interface BillStatus {
  id: number;
  name: string;
  due_day: number;
  amount_chf: number | null;
  paid: boolean; // this month
  prevMonthMissed: boolean; // unpaid when the month rolled over → danger accent
}

export function billsForMonth(month: string): BillStatus[] {
  const prevMonth = monthOf(addDays(`${month}-01`, -1));
  // Rollover-danger only applies to months the system was actually tracking —
  // on a fresh start no payment rows exist and nothing should scream danger.
  const prevMonthTracked = !!db
    .prepare("SELECT 1 AS hit FROM bill_payments WHERE month = ? LIMIT 1")
    .get(prevMonth);

  const rows = db
    .prepare(
      `SELECT b.id, b.name, b.due_day, b.amount_chf,
              EXISTS (SELECT 1 FROM bill_payments p WHERE p.bill_id = b.id AND p.month = ?) AS paid,
              EXISTS (SELECT 1 FROM bill_payments p WHERE p.bill_id = b.id AND p.month = ?) AS prev_paid
       FROM bills b WHERE b.active = 1 ORDER BY b.due_day, b.id`
    )
    .all(month, prevMonth) as Array<{
    id: number;
    name: string;
    due_day: number;
    amount_chf: number | null;
    paid: 0 | 1;
    prev_paid: 0 | 1;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    due_day: r.due_day,
    amount_chf: r.amount_chf,
    paid: !!r.paid,
    prevMonthMissed: prevMonthTracked && !r.prev_paid,
  }));
}

export function setBillPaid(billId: number, month: string, paid: boolean) {
  if (paid) {
    db.prepare("INSERT OR IGNORE INTO bill_payments (bill_id, month) VALUES (?, ?)").run(billId, month);
  } else {
    db.prepare("DELETE FROM bill_payments WHERE bill_id = ? AND month = ?").run(billId, month);
  }
}

export function billExists(id: number): boolean {
  return !!db.prepare("SELECT 1 AS hit FROM bills WHERE id = ?").get(id);
}
