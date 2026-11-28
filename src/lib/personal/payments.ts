// The monthly payment rule (bills and subscriptions), shared by the forms and
// the API routes. Pure and client-safe: a form checks with the same rule the
// route enforces.

export const PAYMENT_NAME_MAX = 60;
export const PAYMENT_AMOUNT_MAX = 100_000;

/** Core: the cost of living (rent, insurance, the travel pass). Subscription:
 *  a service you could cancel (streaming, apps, delivery passes). */
export const PAYMENT_KINDS = ["core", "subscription"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export const PAYMENT_TAG_MAX = 24;
export const PAYMENT_TAGS_MAX = 8;
/** Offered in the tag field before any payment carries them, so the first
 *  tags come from one vocabulary. Any other word is a tag too. */
export const STARTER_TAGS = ["Housing", "Insurance", "Transport", "Food", "Entertainment", "Utility"];

export interface PaymentInput {
  name: string;
  due_day: number;
  /** Absent: leave the stored amount alone. null: no amount. */
  amount_chf?: number | null;
  /** Absent: leave the stored type alone. */
  kind?: PaymentKind;
  /** Absent: leave the stored tags alone. [] clears them. */
  tags?: string[];
}

/**
 * A payment's tags: each trimmed with its spaces collapsed, empty ones
 * dropped, and a repeat (in any letter case) kept once, as first written.
 */
export function checkPaymentTags(raw: unknown): { tags: string[] } | { error: string } {
  if (!Array.isArray(raw) || raw.some((t) => typeof t !== "string")) return { error: "tags are a list of words" };
  const tags: string[] = [];
  for (const t of raw as string[]) {
    const tag = t.trim().replace(/\s+/g, " ");
    if (!tag) continue;
    if (tag.length > PAYMENT_TAG_MAX) return { error: `keep each tag under ${PAYMENT_TAG_MAX} characters` };
    if (!tags.some((k) => k.toLowerCase() === tag.toLowerCase())) tags.push(tag);
  }
  if (tags.length > PAYMENT_TAGS_MAX) return { error: `a payment takes at most ${PAYMENT_TAGS_MAX} tags` };
  return { tags };
}

/**
 * `amount` is optional: Personal's form sends none, the Money page's sends a
 * number or an empty string (no amount). So are `kind` and `tags`, which only
 * the Money page's form sends.
 */
export function checkPayment(raw: {
  name?: unknown;
  due_day?: unknown;
  amount_chf?: unknown;
  kind?: unknown;
  tags?: unknown;
}): PaymentInput | { error: string } {
  const name = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
  if (!name) return { error: "give the payment a name" };
  if (name.length > PAYMENT_NAME_MAX) return { error: `keep the name under ${PAYMENT_NAME_MAX} characters` };

  const day = typeof raw.due_day === "string" ? Number(raw.due_day) : raw.due_day;
  if (typeof day !== "number" || !Number.isInteger(day) || day < 1 || day > 31) {
    return { error: "the due day is a day of the month, 1 to 31" };
  }

  const out: PaymentInput = { name, due_day: day };

  if (raw.amount_chf === null || raw.amount_chf === "") out.amount_chf = null;
  else if (raw.amount_chf !== undefined) {
    const amount = typeof raw.amount_chf === "string" ? Number(raw.amount_chf) : raw.amount_chf;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > PAYMENT_AMOUNT_MAX) {
      return { error: "the amount is a number of francs, 0 or more" };
    }
    out.amount_chf = Math.round(amount * 100) / 100;
  }

  if (raw.kind !== undefined) {
    if (!PAYMENT_KINDS.includes(raw.kind as PaymentKind)) return { error: "a payment is core or a subscription" };
    out.kind = raw.kind as PaymentKind;
  }

  if (raw.tags !== undefined) {
    const checked = checkPaymentTags(raw.tags);
    if ("error" in checked) return checked;
    out.tags = checked.tags;
  }
  return out;
}

export const PAYMENT_NOTE_MAX = 2000;

/** A payment's note: trimmed, empty means none (null). */
export function checkPaymentNote(raw: unknown): { note: string | null } | { error: string } {
  if (raw === null) return { note: null };
  if (typeof raw !== "string") return { error: "the note is text" };
  const note = raw.trim();
  if (note.length > PAYMENT_NOTE_MAX) return { error: `keep the note under ${PAYMENT_NOTE_MAX} characters` };
  return { note: note || null };
}
