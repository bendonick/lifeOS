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

/**
 * 'Wed 20 Aug' for a 'YYYY-MM-DD' date — with the year appended when it isn't
 * this one, so a January exam sitting five months out can't read as last month.
 */
export function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.slice(0, 4) === zurichToday().slice(0, 4) ? {} : { year: "numeric" }),
    timeZone: "UTC",
  })
    .format(new Date(`${date}T12:00:00Z`))
    // en-GB inserts a comma once a year is present ("Thu, 28 Jan 2027"); drop it
    // so dated rows read the same whichever year they fall in.
    .replace(",", "");
}

/** UTC 'YYYY-MM-DD HH:MM:SS' (SQLite datetime('now')) → short Zurich label. */
export function utcToZurichLabel(utc: string): string {
  const d = new Date(utc.replace(" ", "T") + (utc.endsWith("Z") ? "" : "Z"));
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
  if (date === zurichToday())
    return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  return dayLabel(date);
}

/** The two shapes `tasks.due` accepts (schema.sql): a date, or a date and time. */
export function isDueValue(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(value);
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
  if (date < today) return { label: `${dayLabel(date)}${time} · overdue`, urgency: "overdue" };
  if (date === today) return { label: `today${time}`, urgency: "today" };
  if (date === addDays(today, 1)) return { label: `tomorrow${time}`, urgency: "soon" };
  return { label: `${dayLabel(date)}${time}`, urgency: "none" };
}

/* ---------------------------------------------------------------------------
 * Absolute instant ↔ Zurich wall-clock. Added in Stage 3: ICS gives absolute
 * instants (or floating times in a VTIMEZONE), the app speaks Zurich local
 * strings. `Intl` carries the full IANA database, so this needs no tz library
 * and stays correct across DST transitions.
 * ------------------------------------------------------------------------- */

const zurichFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  // h23 rather than hour12:false — the latter renders midnight as "24" in some ICUs.
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** An instant as Zurich wall-clock 'YYYY-MM-DDTHH:MM:SS'. */
function zurichParts(d: Date): string {
  const p = zurichFormat.formatToParts(d);
  const at = (type: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === type)!.value;
  return `${at("year")}-${at("month")}-${at("day")}T${at("hour")}:${at("minute")}:${at("second")}`;
}

/** An instant as the app's local datetime string, 'YYYY-MM-DDTHH:MM' (Zurich). */
export function zurichLocal(d: Date): string {
  return zurichParts(d).slice(0, 16);
}

/** Zurich's UTC offset in ms at a given instant (+3600000 in winter, +7200000 in summer). */
function zurichOffsetAt(utcMs: number): number {
  return Date.parse(`${zurichParts(new Date(utcMs))}Z`) - utcMs;
}

/**
 * Zurich wall-clock 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM' → the absolute instant.
 * Two passes: the first guess uses the offset for the naive instant, the second
 * re-reads it at the corrected instant so times near a DST switch land right.
 */
export function zurichToUtc(local: string): Date {
  const naive = Date.parse(`${local.length === 10 ? `${local}T00:00` : local.slice(0, 16)}:00Z`);
  const ms = naive - zurichOffsetAt(naive - zurichOffsetAt(naive));
  return new Date(ms);
}

/** '08:00' from 'YYYY-MM-DDTHH:MM'. */
export function timeOfDay(local: string): string {
  return local.slice(11, 16);
}

/** Fractional hour (8.5 = 08:30) of a 'YYYY-MM-DDTHH:MM', for calendar positioning. */
export function hourOf(local: string): number {
  return Number(local.slice(11, 13)) + Number(local.slice(14, 16)) / 60;
}

/** '14 – 20 Sep 2026' for the week starting `monday`; spans months/years when it must. */
/**
 * The Overview's headline date in two parts — 'Thursday' and '19 November' — so
 * the page can break the line between them (decision #88).
 */
export function longDateParts(date: string): { weekday: string; dayMonth: string } {
  const at = new Date(`${date}T12:00:00Z`);
  const part = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(at);
  return { weekday: part({ weekday: "long" }), dayMonth: part({ day: "numeric", month: "long" }) };
}

export function weekLabel(monday: string): string {
  const sunday = addDays(monday, 6);
  const part = (date: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(
      new Date(`${date}T12:00:00Z`)
    );
  const sameYear = monday.slice(0, 4) === sunday.slice(0, 4);
  const sameMonth = sameYear && monday.slice(5, 7) === sunday.slice(5, 7);
  const from = part(monday, sameMonth ? { day: "numeric" } : { day: "numeric", month: "short" });
  const to = part(sunday, { day: "numeric", month: "short", year: "numeric" });
  return `${from} – ${to}`;
}

/** Whole days from today (Zurich) to a due value; 0 = today, negative = overdue. */
export function daysUntil(due: string): number {
  const from = Date.parse(`${zurichToday()}T12:00:00Z`);
  const to = Date.parse(`${due.slice(0, 10)}T12:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/** '3d' / 'today' / '2d over' — the days-left column on academic tables. */
export function daysLeftLabel(due: string): string {
  const n = daysUntil(due);
  if (n === 0) return "today";
  return n > 0 ? `${n}d` : `${-n}d over`;
}
