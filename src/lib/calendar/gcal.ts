import { addDays } from "@/lib/dates";

/**
 * The one builder for prefilled Google Calendar links (decision #27). The app
 * never writes to Google — it hands Google a filled-in form and you press Save,
 * so Google creates and owns the event exactly as decision #1 requires.
 *
 * It lives in `src/lib/calendar/` because that is the shared calendar module
 * (decision #26) and this is now used by two domains: Academic's course series
 * and Personal's one-off appointments. It follows the convention `types.ts`
 * documents for this directory — no env, no node, no SQLite — so client
 * components import it directly. Never import `ics.ts` from here.
 */

const TZ = "Europe/Zurich";

export interface GoogleEventInput {
  title: string;
  /** Zurich wall-clock, 'YYYY-MM-DDTHH:MM'. Timed events only — an all-day
   *  event needs Google's exclusive-end convention and nothing asks for one. */
  start: string;
  /** Same shape as `start`. Defaults to one hour after it. */
  end?: string;
  location?: string;
  details?: string;
  /** A full RRULE line, e.g. 'RRULE:FREQ=WEEKLY;BYDAY=WE'. Omit for a one-off. */
  recur?: string;
}

/**
 * Times go as local wall-clock plus `ctz`, never as UTC stamps: an event pinned
 * to an absolute instant slides an hour when Zurich leaves summer time. That is
 * the whole reason this function exists rather than a `Date` and `toISOString`.
 */
export function googleEventUrl(input: GoogleEventInput): string {
  const end = input.end ?? plusOneHour(input.start);

  // Insertion order is the query order, and it is asserted against a captured
  // baseline. Keep it as it is.
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${stamp(input.start)}/${stamp(end)}`,
    ctz: TZ,
  });
  if (input.recur) params.set("recur", input.recur);
  if (input.details) params.set("details", input.details);
  if (input.location) params.set("location", input.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** '2026-08-25T10:00' → '20260825T100000' (Google's basic format). */
function stamp(local: string): string {
  return `${local.slice(0, 10).replace(/-/g, "")}T${local.slice(11, 16).replace(":", "")}00`;
}

/**
 * One hour later in *wall-clock* terms, rolling into the next day at midnight.
 * Wall-clock and not an instant, because that is what `ctz` will be applied to.
 */
function plusOneHour(local: string): string {
  const minutes = Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16)) + 60;
  const date = minutes >= 1440 ? addDays(local.slice(0, 10), 1) : local.slice(0, 10);
  const wrapped = minutes % 1440;
  return `${date}T${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** A fractional hour (8.5) as 'HH:MM', capped at 23:59 so a bad end_hour can't
 *  produce '24:00'. Shared with the course link's summary line. */
export function hhmm(hour: number): string {
  const capped = Math.min(hour, 23 + 59 / 60);
  const h = Math.floor(capped);
  return `${pad(h)}:${pad(Math.round((capped - h) * 60))}`;
}
