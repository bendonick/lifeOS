import { db } from "@/lib/db";
import { addDays, monthOf } from "@/lib/dates";
import type { PaymentInput, PaymentKind } from "@/lib/personal/payments";

export interface BillStatus {
  id: number;
  name: string;
  due_day: number;
  amount_chf: number | null;
  paid: boolean; // this month
  prevMonthMissed: boolean; // unpaid when the month rolled over → danger accent
  note: string | null;
  kind: PaymentKind;
  tags: string[];
}

/** The stored JSON list of tags; anything unreadable reads as none. */
function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

const storeTags = (tags: string[]) => (tags.length ? JSON.stringify(tags) : null);

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
              b.created_month, b.note, b.kind, b.tags
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
    note: string | null;
    kind: PaymentKind;
    tags: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    due_day: r.due_day,
    amount_chf: r.amount_chf,
    paid: !!r.paid,
    // A payment added this month did not exist last month to be missed.
    prevMonthMissed: prevMonthTracked && !r.prev_paid && (r.created_month === null || r.created_month < month),
    note: r.note,
    kind: r.kind,
    tags: parseTags(r.tags),
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
 *  it was added in. Core with no tags unless the form said otherwise. */
export function createBill(input: PaymentInput, month: string): number {
  const res = db
    .prepare("INSERT INTO bills (name, due_day, amount_chf, created_month, kind, tags) VALUES (?, ?, ?, ?, ?, ?)")
    .run(input.name, input.due_day, input.amount_chf ?? null, month, input.kind ?? "core", storeTags(input.tags ?? []));
  return Number(res.lastInsertRowid);
}

/** Name and due day always; the amount, type and tags only when given
 *  (Personal's form has none of them and must not clear them). */
export function updateBill(id: number, input: PaymentInput) {
  const sets = ["name = ?", "due_day = ?"];
  const values: Array<string | number | null> = [input.name, input.due_day];
  if (input.amount_chf !== undefined) {
    sets.push("amount_chf = ?");
    values.push(input.amount_chf);
  }
  if (input.kind !== undefined) {
    sets.push("kind = ?");
    values.push(input.kind);
  }
  if (input.tags !== undefined) {
    sets.push("tags = ?");
    values.push(storeTags(input.tags));
  }
  db.prepare(`UPDATE bills SET ${sets.join(", ")} WHERE id = ?`).run(...values, id);
}

/** The payment's note; null clears it. */
export function setBillNote(id: number, note: string | null) {
  db.prepare("UPDATE bills SET note = ? WHERE id = ?").run(note, id);
}

/** Off the lists from now on; its paid log stays. */
export function archiveBill(id: number) {
  db.prepare("UPDATE bills SET active = 0 WHERE id = ?").run(id);
}
