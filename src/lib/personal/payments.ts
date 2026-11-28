// The monthly payment rule (bills and subscriptions), shared by the forms and
// the API routes. Pure and client-safe: a form checks with the same rule the
// route enforces.

export const PAYMENT_NAME_MAX = 60;
export const PAYMENT_AMOUNT_MAX = 100_000;

export interface PaymentInput {
  name: string;
  due_day: number;
  /** Absent: leave the stored amount alone. null: no amount. */
  amount_chf?: number | null;
}

/**
 * `amount` is optional: Personal's form sends none, the Money page's sends a
 * number or an empty string (no amount).
 */
export function checkPayment(raw: { name?: unknown; due_day?: unknown; amount_chf?: unknown }):
  | PaymentInput
  | { error: string } {
  const name = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
  if (!name) return { error: "give the payment a name" };
  if (name.length > PAYMENT_NAME_MAX) return { error: `keep the name under ${PAYMENT_NAME_MAX} characters` };

  const day = typeof raw.due_day === "string" ? Number(raw.due_day) : raw.due_day;
  if (typeof day !== "number" || !Number.isInteger(day) || day < 1 || day > 31) {
    return { error: "the due day is a day of the month, 1 to 31" };
  }

  if (raw.amount_chf === undefined) return { name, due_day: day };
  if (raw.amount_chf === null || raw.amount_chf === "") return { name, due_day: day, amount_chf: null };
  const amount = typeof raw.amount_chf === "string" ? Number(raw.amount_chf) : raw.amount_chf;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > PAYMENT_AMOUNT_MAX) {
    return { error: "the amount is a number of francs, 0 or more" };
  }
  return { name, due_day: day, amount_chf: Math.round(amount * 100) / 100 };
}
