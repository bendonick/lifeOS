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
              EXISTS (SELECT 1 FROM bill_payments p WHERE p.bill_id = b.id AND p.month = ?) AS prev_paid,
              b.created_month
       FROM bills b WHERE b.active = 1 ORDER BY b.due_day, b.id`
    )
    .all(month, prevMonth) as Array<{
    id: number;
    name: string;
    due_day: number;
    amount_chf: number | null;
    paid: 0 | 1;
    prev_paid: 0 | 1;
    created_month: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    due_day: r.due_day,
    amount_chf: r.amount_chf,
    paid: !!r.paid,
    // A payment added this month did not exist last month to be missed.
    prevMonthMissed: prevMonthTracked && !r.prev_paid && (r.created_month === null || r.created_month < month),
  }));
}

export function setBillPaid(billId: number, month: string, paid: boolean) {
  if (paid) {
    db.prepare("INSERT OR IGNORE INTO bill_payments (bill_id, month) VALUES (?, ?)").run(billId, month);
  } else {
    db.prepare("DELETE FROM bill_payments WHERE bill_id = ? AND month = ?").run(billId, month);
  }
}

/** An active bill: archived ones are off every list and take no edits. */
export function billExists(id: number): boolean {
  return !!db.prepare("SELECT 1 AS hit FROM bills WHERE id = ? AND active = 1").get(id);
}

/** A new monthly payment (a bill or a subscription), stamped with the month
 *  it was added in. */
export function createBill(input: { name: string; due_day: number; amount_chf: number | null }, month: string): number {
  const res = db
    .prepare("INSERT INTO bills (name, due_day, amount_chf, created_month) VALUES (?, ?, ?, ?)")
    .run(input.name, input.due_day, input.amount_chf, month);
  return Number(res.lastInsertRowid);
}

/** Name and due day always; the amount only when given (Personal's form has
 *  no amount field and must not clear it). */
export function updateBill(id: number, input: { name: string; due_day: number; amount_chf?: number | null }) {
  if (input.amount_chf === undefined) {
    db.prepare("UPDATE bills SET name = ?, due_day = ? WHERE id = ?").run(input.name, input.due_day, id);
  } else {
    db.prepare("UPDATE bills SET name = ?, due_day = ?, amount_chf = ? WHERE id = ?").run(
      input.name,
      input.due_day,
      input.amount_chf,
      id
    );
  }
}

/** Off the lists from now on; its paid log stays. */
export function archiveBill(id: number) {
  db.prepare("UPDATE bills SET active = 0 WHERE id = ?").run(id);
}
