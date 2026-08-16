import ICAL from "ical.js";
import { zurichLocal, zurichToUtc } from "@/lib/dates";
import type { CalendarEvent, CalendarKey } from "./types";

/**
 * ICS text → the occurrences overlapping a window, in Zurich wall-clock.
 *
 * RRULE / RDATE / EXDATE / RECURRENCE-ID overrides are all ical.js's job
 * (docs/01-architecture.md: "never hand-roll RRULE"). This file only decides
 * which occurrences the window wants and what timezone they are rendered in.
 *
 * Pure and dependency-free apart from ical.js, so it can be exercised against a
 * fixture without a network or a database.
 */

/** Runaway guard: an unbounded daily rule from 2010 is ~6k steps, a bad feed is infinite. */
const MAX_STEPS = 20_000;

/**
 * How far past the window the iterator keeps stepping before giving up. A
 * RECURRENCE-ID override can move an occurrence *earlier* than its slot, so
 * stopping exactly at the window edge would drop an event the user did move.
 */
const OVERSHOOT_DAYS = 14;

/** Milliseconds of one occurrence boundary, whatever zone the feed expressed it in. */
function instantOf(t: ICAL.Time): number {
  // A floating time (no TZID, no Z) means "wall-clock wherever you are" — here, Zurich.
  if (t.zone?.tzid === "floating") return zurichToUtc(wallClockOf(t)).getTime();
  return t.toJSDate().getTime();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateOf(t: ICAL.Time): string {
  return `${t.year}-${pad(t.month)}-${pad(t.day)}`;
}

function wallClockOf(t: ICAL.Time): string {
  return `${dateOf(t)}T${pad(t.hour)}:${pad(t.minute)}`;
}

/**
 * VTIMEZONE definitions travel inside the feed. Registering them lets ical.js
 * resolve TZID params; anything unregistered still works because we convert
 * through absolute instants and format with Intl, which owns the IANA database.
 */
function registerTimezones(calendar: ICAL.Component): void {
  for (const vtimezone of calendar.getAllSubcomponents("vtimezone")) {
    const zone = new ICAL.Timezone(vtimezone);
    if (zone.tzid && !ICAL.TimezoneService.has(zone.tzid)) {
      ICAL.TimezoneService.register(zone);
    }
  }
}

function toEvent(
  calendar: CalendarKey,
  uid: string,
  startTime: ICAL.Time,
  endTime: ICAL.Time,
  summary: string | null,
  location: string | null
): CalendarEvent {
  const allDay = startTime.isDate;
  return {
    id: `${calendar}:${uid}:${allDay ? dateOf(startTime) : wallClockOf(startTime)}`,
    calendar,
    // Untitled Google events exist; an empty block with no label is worse than a word.
    title: summary?.trim() || "(no title)",
    location: location?.trim() || null,
    start: allDay ? dateOf(startTime) : zurichLocal(new Date(instantOf(startTime))),
    end: allDay ? dateOf(endTime) : zurichLocal(new Date(instantOf(endTime))),
    allDay,
  };
}

/** [start, end) of an occurrence as absolute ms, for window overlap tests. */
function boundsOf(startTime: ICAL.Time, endTime: ICAL.Time): [number, number] {
  if (startTime.isDate) {
    // All-day DTEND is exclusive in iCal, so the date span is already half-open.
    return [zurichToUtc(dateOf(startTime)).getTime(), zurichToUtc(dateOf(endTime)).getTime()];
  }
  return [instantOf(startTime), instantOf(endTime)];
}

/**
 * @param from  window start, 'YYYY-MM-DD' Zurich (inclusive)
 * @param to    window end,   'YYYY-MM-DD' Zurich (exclusive)
 */
export function expandIcs(
  text: string,
  calendar: CalendarKey,
  from: string,
  to: string
): CalendarEvent[] {
  const component = new ICAL.Component(ICAL.parse(text));
  registerTimezones(component);

  const fromMs = zurichToUtc(from).getTime();
  const toMs = zurichToUtc(to).getTime();
  const stopMs = toMs + OVERSHOOT_DAYS * 86_400_000;
  const out: CalendarEvent[] = [];

  for (const vevent of component.getAllSubcomponents("vevent")) {
    // Overrides are reached through their master's occurrence details; emitting
    // them here too would double-render every moved class.
    if (vevent.hasProperty("recurrence-id")) continue;

    const event = new ICAL.Event(vevent);
    const uid = event.uid || vevent.getFirstPropertyValue("summary")?.toString() || "event";

    if (!event.isRecurring()) {
      const [startMs, endMs] = boundsOf(event.startDate, event.endDate);
      if (endMs > fromMs && startMs < toMs) {
        out.push(
          toEvent(calendar, uid, event.startDate, event.endDate, event.summary, event.location)
        );
      }
      continue;
    }

    const iterator = event.iterator();
    for (let step = 0; step < MAX_STEPS; step++) {
      const next = iterator.next();
      if (!next) break;
      // Stop on the *slot* time, not the (possibly shifted) occurrence start —
      // slots advance monotonically, an overridden start does not.
      if (instantOf(next) >= stopMs) break;

      const occurrence = event.getOccurrenceDetails(next);
      const [startMs, endMs] = boundsOf(occurrence.startDate, occurrence.endDate);
      if (endMs <= fromMs || startMs >= toMs) continue;

      out.push(
        toEvent(
          calendar,
          uid,
          occurrence.startDate,
          occurrence.endDate,
          occurrence.item?.summary ?? event.summary,
          occurrence.item?.location ?? event.location
        )
      );
    }
  }

  return out;
}

/** Chronological, all-day first within a day so they can render as a header strip. */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort(
    (a, b) =>
      a.start.slice(0, 10).localeCompare(b.start.slice(0, 10)) ||
      Number(b.allDay) - Number(a.allDay) ||
      a.start.localeCompare(b.start) ||
      a.title.localeCompare(b.title)
  );
}
