// All user-facing day math happens in Europe/Zurich regardless of server locale
// (docs/01-architecture.md: an early Notion embed used Europe/Rome).

export const TZ = "Europe/Zurich";

/** Today's date in Zurich as 'YYYY-MM-DD'. */
export function zurichToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** date ('YYYY-MM-DD') + n days, as 'YYYY-MM-DD'. UTC-noon anchor sidesteps DST edges. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' passes through; 'DD.MM.YYYY' converts; anything else → null. */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return null;
}

/** 'YYYY-MM' of a 'YYYY-MM-DD' date. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Number of days in a 'YYYY-MM' month. */
export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Monday of the week containing `date` ('YYYY-MM-DD'). */
export function mondayOf(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const shift = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(date, -shift);
}

/** 'Wed 20 Aug' for a 'YYYY-MM-DD' date. */
export function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** UTC 'YYYY-MM-DD HH:MM:SS' (SQLite datetime('now')) → short Zurich label. */
export function utcToZurichLabel(utc: string): string {
  const d = new Date(utc.replace(" ", "T") + (utc.endsWith("Z") ? "" : "Z"));
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
  if (date === zurichToday())
    return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  return dayLabel(date);
}

export type Urgency = "overdue" | "today" | "soon" | "none";

/**
 * Display label + urgency for a task due value ('YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM').
 * Warm colors are reserved for urgency (design system): red = overdue, orange = due
 * today/tomorrow.
 */
export function dueInfo(due: string): { label: string; urgency: Urgency } {
  const date = due.slice(0, 10);
  const time = due.length > 10 ? ` ${due.slice(11, 16)}` : "";
  const today = zurichToday();
  if (date < today) return { label: `${dayLabel(date)} · overdue`, urgency: "overdue" };
  if (date === today) return { label: `today${time}`, urgency: "today" };
  if (date === addDays(today, 1)) return { label: `tomorrow${time}`, urgency: "soon" };
  return { label: `${dayLabel(date)}${time}`, urgency: "none" };
}
