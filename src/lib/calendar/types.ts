import type { Accent } from "@/components/ui/accents";

// Client-safe: no env, no node, no SQLite. Client components import from here;
// only `ics.ts` (server) reads the secret feed URLs.

/**
 * The four Google calendars (docs/01-architecture.md → integrations). "class" is
 * the primary calendar, historically named — the catch-all where external
 * invites land, so it is domain-less and renders in the hub's neutral accent.
 */
export type CalendarKey = "academic" | "personal" | "professional" | "class";

export const CALENDARS: { key: CalendarKey; label: string; accent: Accent; envVar: string }[] = [
  { key: "academic", label: "Academic", accent: "academic", envVar: "ICS_URL_ACADEMIC" },
  { key: "personal", label: "Personal", accent: "personal", envVar: "ICS_URL_PERSONAL" },
  { key: "professional", label: "Professional", accent: "professional", envVar: "ICS_URL_PROFESSIONAL" },
  { key: "class", label: "Class", accent: "hub", envVar: "ICS_URL_CLASS" },
];

export const calendarAccent: Record<CalendarKey, Accent> = {
  academic: "academic",
  personal: "personal",
  professional: "professional",
  class: "hub",
};

export const calendarLabel: Record<CalendarKey, string> = {
  academic: "Academic",
  personal: "Personal",
  professional: "Professional",
  class: "Class",
};

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
