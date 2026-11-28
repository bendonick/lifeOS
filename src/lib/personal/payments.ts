// The monthly payment rule (bills and subscriptions), shared by the forms and
// the API routes. Pure and client-safe: a form checks with the same rule the
// route enforces.

export const PAYMENT_NAME_MAX = 60;

// Whole francs as "CHF 70", anything with cents as "CHF 12.90".
const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const chfCents = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** An amount as the Money page writes it; rounded to the cent first, so a sum
 *  like 19.9 + 0.1 reads "CHF 20". No amount is a dash. */
export function formatChf(n: number | null): string {
  return formatMoney(n, "CHF");
}

/** The same, in the payment's own currency: "USD 20", "EUR 9.99". */
export function formatMoney(n: number | null, currency: Currency): string {
  if (n === null) return "—";
  const c = Math.round(n * 100) / 100;
  return `${currency} ${Number.isInteger(c) ? chf.format(c) : chfCents.format(c)}`;
}

/** What a subscription can bill in, in the order the dropdown lists them.
 *  Core payments are in francs. */
export const CURRENCIES = ["USD", "EUR", "CHF", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const CURRENCY_NAMES: Record<Currency, string> = {
  USD: "US dollar",
  EUR: "Euro",
  CHF: "Swiss franc",
  GBP: "Pound sterling",
};
/** A new subscription starts in dollars: most apps bill in them. */
export const SUBSCRIPTION_CURRENCY: Currency = "USD";

/** Francs per unit of each other currency, set by hand on the Money page (no
 *  outside service: nothing leaves the machine). `set` is the day they were
 *  last saved; null means the defaults below are in use. */
export interface FxRates {
  USD: number;
  EUR: number;
  GBP: number;
  set: string | null;
}
export const DEFAULT_FX_RATES: FxRates = { USD: 0.8, EUR: 0.93, GBP: 1.06, set: null };
export const FX_RATE_MAX = 100;

/** An amount in francs at the given rates. */
export function toChf(amount: number, currency: Currency, rates: FxRates): number {
  return currency === "CHF" ? amount : amount * rates[currency];
}

/** Rates as typed on the page: each a positive number of francs. */
export function checkFxRates(raw: { USD?: unknown; EUR?: unknown; GBP?: unknown }):
  | Omit<FxRates, "set">
  | { error: string } {
  const out: Partial<Omit<FxRates, "set">> = {};
  for (const c of ["USD", "EUR", "GBP"] as const) {
    const v = typeof raw[c] === "string" ? Number(raw[c]) : raw[c];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v > FX_RATE_MAX) {
      return { error: `the ${c} rate is a number of francs above 0` };
    }
    out[c] = Math.round(v * 10_000) / 10_000;
  }
  return out as Omit<FxRates, "set">;
}

/** A cancel date: a real day, not in the future. */
export function checkCancelDate(raw: unknown, today: string): { cancelled_on: string | null } | { error: string } {
  if (raw === null) return { cancelled_on: null };
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T12:00:00Z`))) {
    return { error: "the cancel date is a day, like 2026-11-28" };
  }
  if (raw > today) return { error: "the cancel date can't be in the future" };
  return { cancelled_on: raw };
}

/** How long a cancelled subscription stays listed. */
export const CANCELLED_KEEP_MONTHS = 6;
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
  /** Absent: leave the stored currency alone. */
  currency?: Currency;
}

/** The key a tag is compared by: "utility" and "Utility " are one tag. */
export const tagKey = (tag: string) => tag.trim().replace(/\s+/g, " ").toLowerCase();

/** What the tag field offers: every tag in use (first spelling wins), then
 *  the starter tags not yet used. */
export function tagSuggestions(items: { tags: string[] }[]): string[] {
  const seen = new Map<string, string>();
  for (const it of items) for (const t of it.tags) if (!seen.has(tagKey(t))) seen.set(tagKey(t), t);
  const inUse = [...seen.values()].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  return [...inUse, ...STARTER_TAGS.filter((s) => !seen.has(tagKey(s)))];
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
 * number or an empty string (no amount). So are `kind`, `tags` and
 * `currency`, which only the Money page's forms send.
 */
export function checkPayment(raw: {
  name?: unknown;
  due_day?: unknown;
  amount_chf?: unknown;
  kind?: unknown;
  tags?: unknown;
  currency?: unknown;
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

  if (raw.currency !== undefined) {
    if (!CURRENCIES.includes(raw.currency as Currency)) return { error: "the currency is USD, EUR, CHF or GBP" };
    out.currency = raw.currency as Currency;
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
