import { hourOf } from "@/lib/dates";
import type { CalendarEvent } from "./types";

// Pure geometry for the week grid. Client-safe (no env, no db) so the calendar
// component can import it directly.

/** A 15-minute event still needs to be readable, so nothing renders shorter. */
const MIN_SLOT_HOURS = 0.5;

/** The grid always shows at least the working day, then grows to fit the data. */
const DEFAULT_RANGE: [number, number] = [8, 20];

export interface PlacedEvent {
  event: CalendarEvent;
  /** Clamped to this day: an event running past midnight renders 0–24 on the days between. */
  startHour: number;
  endHour: number;
  lane: number;
  lanes: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

/** All-day events covering `day` — iCal DTEND is exclusive, so `end` is not included. */
export function allDayOn(events: CalendarEvent[], day: string): CalendarEvent[] {
  return events.filter((e) => e.allDay && e.start <= day && day < e.end);
}

/**
 * Timed events overlapping `day`, packed into lanes so concurrent events sit
 * side by side instead of hiding each other.
 */
export function placeTimed(events: CalendarEvent[], day: string): PlacedEvent[] {
  const items = events
    .filter((e) => !e.allDay)
    .filter((e) => {
      const startDay = e.start.slice(0, 10);
      const endDay = e.end.slice(0, 10);
      if (startDay > day || endDay < day) return false;
      // An event ending at exactly 00:00 belongs to the previous day only.
      return !(endDay === day && startDay !== day && hourOf(e.end) === 0);
    })
    .map((e) => {
      const startsToday = e.start.slice(0, 10) === day;
      const endsToday = e.end.slice(0, 10) === day;
      const startHour = startsToday ? hourOf(e.start) : 0;
      const rawEnd = endsToday ? hourOf(e.end) : 24;
      return {
        event: e,
        startHour,
        endHour: Math.min(24, Math.max(rawEnd, startHour + MIN_SLOT_HOURS)),
        continuesBefore: !startsToday,
        continuesAfter: !endsToday,
      };
    })
    // Longest-first within a start time keeps the wide block on the left lane.
    .sort((a, b) => a.startHour - b.startHour || b.endHour - a.endHour);

  const placed: PlacedEvent[] = [];
  let cluster: PlacedEvent[] = [];
  let clusterEnd = -Infinity;
  let laneEnds: number[] = [];

  const flush = () => {
    for (const p of cluster) p.lanes = laneEnds.length;
    placed.push(...cluster);
    cluster = [];
    laneEnds = [];
    clusterEnd = -Infinity;
  };

  for (const item of items) {
    // A gap with nothing running means the next events start a fresh cluster,
    // so two consecutive lonely events both render full width.
    if (cluster.length && item.startHour >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= item.startHour);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endHour);
    } else {
      laneEnds[lane] = item.endHour;
    }
    cluster.push({ ...item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.endHour);
  }
  if (cluster.length) flush();

  return placed;
}

/**
 * Visible hour band. Hardcoding 08:00–20:00 (as the Stage 1 stub did) silently
 * drops a 07:00 run or a 21:00 lecture, so the range grows to the data.
 */
export function hourRange(days: PlacedEvent[][]): [number, number] {
  let [min, max] = DEFAULT_RANGE;
  for (const day of days) {
    for (const p of day) {
      min = Math.min(min, Math.floor(p.startHour));
      max = Math.max(max, Math.ceil(p.endHour));
    }
  }
  return [Math.max(0, min), Math.min(24, Math.max(max, min + 1))];
}
