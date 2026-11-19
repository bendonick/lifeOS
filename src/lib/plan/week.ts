import { addDays } from "@/lib/dates";

// Week math for the hub's Week plan (decision #83). Pure and client-safe: every
// function takes the date it works from rather than reading the clock, so a node
// check can move the calendar (thresholds and dates take `today`).
//
// The app stores ISO weeks ('2026-W47') because they sort as strings and survive
// a year boundary; the screen never shows one (decision #82).

/** 'YYYY-MM-DD' → ISO week 'YYYY-Www'. The ISO year can differ from the date's year. */
export function isoWeek(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const mondayIndex = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  // The ISO week belongs to the year that holds its Thursday.
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() - mondayIndex + 3);
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1, 12);
  const week = 1 + Math.floor((thursday.getTime() - jan1) / (7 * 86_400_000));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** The Monday ('YYYY-MM-DD') of the week that holds `date`. */
export function mondayOfDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return addDays(date, -((d.getUTCDay() + 6) % 7));
}

/** The ISO week before the one that holds `date`. */
export function previousIsoWeek(date: string): string {
  return isoWeek(addDays(mondayOfDate(date), -7));
}

function short(date: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`)
  );
}

/**
 * 'Mon 16 – Sun 22 Nov' for the week that holds `date`; the month is named on
 * both ends when the week crosses one ('Mon 30 Nov – Sun 6 Dec').
 */
export function weekSpanLabel(date: string): string {
  const monday = mondayOfDate(date);
  const sunday = addDays(monday, 6);
  const sameMonth = monday.slice(5, 7) === sunday.slice(5, 7);
  const from = short(monday, sameMonth ? { weekday: "short", day: "numeric" } : { weekday: "short", day: "numeric", month: "short" });
  const to = short(sunday, { weekday: "short", day: "numeric", month: "short" });
  return `${from} – ${to}`;
}

/**
 * How the carry-over block names where its items came from. Only the week just
 * before reads as "last week"; anything older is "earlier weeks", because a
 * three-week-old item labelled "last week" would be a small lie.
 */
export function leftoverSourceLabel(weeks: string[], today: string): string {
  const last = previousIsoWeek(today);
  return weeks.every((w) => w === last) ? "last week" : "earlier weeks";
}
