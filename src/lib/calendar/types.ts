import type { Accent } from "@/components/ui/accents";

// Client-safe: no env, no node, no SQLite. Client components import from here;
// only `ics.ts` (server) reads the secret feed URLs.

/**
 * The Google calendars (docs/01-architecture.md → integrations). "class" is
 * the primary calendar, historically named — the catch-all where external
 * invites land, so it is domain-less and renders in the hub's neutral accent.
 * "examPrep" is final-exam study time; it belongs to Academic (see
 * `calendarHome`), so Academic's own view shows it beside the Academic calendar.
 */
export type CalendarKey = "academic" | "personal" | "professional" | "class" | "examPrep";

export const CALENDARS: { key: CalendarKey; label: string; accent: Accent; envVar: string }[] = [
  { key: "academic", label: "Academic", accent: "academic", envVar: "ICS_URL_ACADEMIC" },
  { key: "personal", label: "Personal", accent: "personal", envVar: "ICS_URL_PERSONAL" },
  { key: "professional", label: "Professional", accent: "professional", envVar: "ICS_URL_PROFESSIONAL" },
  { key: "class", label: "Class", accent: "hub", envVar: "ICS_URL_CLASS" },
  { key: "examPrep", label: "Exam Prep", accent: "academic", envVar: "ICS_URL_EXAM_PREP" },
];

export const calendarAccent: Record<CalendarKey, Accent> = {
  academic: "academic",
  personal: "personal",
  professional: "professional",
  class: "hub",
  examPrep: "academic",
};

export const calendarLabel: Record<CalendarKey, string> = {
  academic: "Academic",
  personal: "Personal",
  professional: "Professional",
  class: "Class",
  examPrep: "Exam Prep",
};

/**
 * The page a calendar belongs to. A page's own view (`home`) shows every
 * calendar whose home is that page, not only the one with the same key — so
 * Exam Prep appears on Academic's default tab without the "All calendars"
 * toggle. Every other calendar is its own home.
 */
export const calendarHome: Record<CalendarKey, CalendarKey> = {
  academic: "academic",
  personal: "personal",
  professional: "professional",
  class: "class",
  examPrep: "academic",
};

/** True when `calendar`'s events belong in `home`'s own view. */
export function inHome(calendar: CalendarKey, home: CalendarKey): boolean {
  return calendarHome[calendar] === home;
}

/** One occurrence, already resolved to Zurich wall-clock. */
export interface CalendarEvent {
  /** uid + recurrence start — stable across refetches, unique within a window. */
  id: string;
  calendar: CalendarKey;
  title: string;
  location: string | null;
  /** 'YYYY-MM-DD' when allDay, else 'YYYY-MM-DDTHH:MM' (Zurich). */
  start: string;
  /** Same shape as start. For all-day events this is the iCal-exclusive end date. */
  end: string;
  allDay: boolean;
}

/**
 * Per-feed honesty (docs/02-design-system.md — "staleness is honest"):
 * `stale` means the fetch failed but cached ICS is still being rendered.
 */
export type FeedState = "ok" | "stale" | "error" | "unconfigured";

export interface FeedStatus {
  key: CalendarKey;
  label: string;
  state: FeedState;
  /** ISO instant of the data currently rendered; null when nothing was ever fetched. */
  fetchedAt: string | null;
  error: string | null;
}

export interface CalendarWindow {
  events: CalendarEvent[];
  feeds: FeedStatus[];
}

/** True when no feed is configured — the page shows setup instructions, not an empty grid. */
export function isUnconfigured(feeds: FeedStatus[]): boolean {
  return feeds.every((f) => f.state === "unconfigured");
}
