import { db } from "@/lib/db";
import { getConfigJSON, setConfig } from "@/lib/db/config";
import { addDays, daysInMonth, monthOf } from "@/lib/dates";
import {
  CANCELLED_KEEP_MONTHS,
  DEFAULT_FX_RATES,
  type Currency,
  type FxRates,
  type PaymentInput,
  type PaymentKind,
} from "@/lib/personal/payments";

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
  /** What `amount_chf` is in: francs for core payments, a subscription's own
   *  currency otherwise (the column predates currencies). */
  currency: Currency;
}

/** A subscription cancelled in the last six months, for the Cancelled list. */
export interface CancelledSubscription {
  id: number;
  name: string;
  amount_chf: number | null;
  currency: Currency;
  tags: string[];
  cancelled_on: string;
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
              b.created_month, b.note, b.kind, b.tags, b.currency
       FROM bills b WHERE b.active = 1 AND b.cancelled_on IS NULL ORDER BY b.due_day, b.id`
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
    currency: Currency;
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
    currency: r.currency,
  }));
}

/** The day `months` months before `date`, clamped to that month's length. */
function monthsBefore(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const total = y * 12 + (m - 1) - months;
  const month = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  return `${month}-${String(Math.min(d, daysInMonth(month))).padStart(2, "0")}`;
}

/** Subscriptions cancelled in the last six months, latest first. Older ones
 *  are no longer listed; their rows stay in the database. */
export function cancelledSubscriptions(today: string): CancelledSubscription[] {
  const rows = db
    .prepare(
      `SELECT id, name, amount_chf, currency, tags, cancelled_on FROM bills
       WHERE active = 1 AND cancelled_on IS NOT NULL AND cancelled_on > ?
       ORDER BY cancelled_on DESC, id DESC`
    )
    .all(monthsBefore(today, CANCELLED_KEEP_MONTHS)) as Array<
    Omit<CancelledSubscription, "tags"> & { tags: string | null }
  >;
  return rows.map((r) => ({ ...r, tags: parseTags(r.tags) }));
}

/** The kind of an active payment, or null when there is none. */
export function billKind(id: number): PaymentKind | null {
  const row = db.prepare("SELECT kind FROM bills WHERE id = ? AND active = 1").get(id) as
    | { kind: PaymentKind }
    | undefined;
  return row?.kind ?? null;
}

/** Cancels a subscription on the given day; null restores it. */
export function setBillCancelled(id: number, cancelledOn: string | null) {
  db.prepare("UPDATE bills SET cancelled_on = ? WHERE id = ?").run(cancelledOn, id);
}

/** The francs-per-unit rates subscriptions are converted at. */
export function fxRates(): FxRates {
  const stored = getConfigJSON<Partial<FxRates> | null>("fx_rates", null);
  return stored ? { ...DEFAULT_FX_RATES, ...stored } : DEFAULT_FX_RATES;
}

export function setFxRates(rates: Omit<FxRates, "set">, today: string) {
  setConfig("fx_rates", JSON.stringify({ ...rates, set: today }));
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
    .prepare(
      "INSERT INTO bills (name, due_day, amount_chf, created_month, kind, tags, currency) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      input.name,
      input.due_day,
      input.amount_chf ?? null,
      month,
      input.kind ?? "core",
      storeTags(input.tags ?? []),
      input.currency ?? "CHF"
    );
  return Number(res.lastInsertRowid);
}

/** Name and due day always; the amount, type, tags and currency only when
 *  given (Personal's form has none of them and must not clear them). */
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
  if (input.currency !== undefined) {
    sets.push("currency = ?");
    values.push(input.currency);
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
