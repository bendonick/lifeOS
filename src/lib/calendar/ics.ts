import fs from "node:fs";
import path from "node:path";
import { addDays } from "@/lib/dates";
import { expandIcs, sortEvents } from "./expand";
import { CALENDARS, type CalendarKey, type CalendarWindow, type FeedStatus } from "./types";

/**
 * Server-only. Fetches the secret iCal feeds, caches them, and expands them into
 * a window. Never import this from a client component — it reads `process.env`
 * and the filesystem. Client components take `CalendarWindow` as a prop.
 *
 * Cache is two-layer, per docs/01-architecture.md ("Cache 5–15 min"):
 *   memory — survives across requests, so a page render never refetches four feeds;
 *   disk   — survives a dev-server restart, and is what keeps the calendar
 *            readable (flagged `stale`) when Google is unreachable or offline.
 */

const TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_DIR = path.join(process.cwd(), "data", "cache", "ics");

interface Cached {
  text: string;
  fetchedAt: number;
}

const globalForIcs = globalThis as unknown as { icsCache?: Map<CalendarKey, Cached> };
const memory = (globalForIcs.icsCache ??= new Map<CalendarKey, Cached>());

function diskPath(key: CalendarKey): string {
  return path.join(CACHE_DIR, `${key}.ics`);
}

function readDisk(key: CalendarKey): Cached | null {
  try {
    const file = diskPath(key);
    return { text: fs.readFileSync(file, "utf8"), fetchedAt: fs.statSync(file).mtimeMs };
  } catch {
    return null;
  }
}

function writeDisk(key: CalendarKey, text: string): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(diskPath(key), text, "utf8");
  } catch {
    // A read-only data dir must not take the calendar down; memory cache still serves.
  }
}

function cachedFor(key: CalendarKey): Cached | null {
  const inMemory = memory.get(key);
  if (inMemory) return inMemory;
  const onDisk = readDisk(key);
  if (onDisk) memory.set(key, onDisk);
  return onDisk;
}

/** One line, no URL — the feed address is a secret and must never reach the UI. */
function reason(err: unknown): string {
  if (err instanceof DOMException && err.name === "TimeoutError") return "timed out";
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/https?:\/\/\S+/g, "the feed").slice(0, 120);
}

async function load(
  key: CalendarKey,
  url: string,
  force: boolean
): Promise<{ cached: Cached | null; error: string | null }> {
  const existing = cachedFor(key);
  if (!force && existing && Date.now() - existing.fetchedAt < TTL_MS) {
    return { cached: existing, error: null };
  }
  try {
    // Next patches fetch with its own cache; this module owns caching, so opt out.
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Google returned ${res.status}`);
    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) throw new Error("response was not an iCal feed");
    const fresh: Cached = { text, fetchedAt: Date.now() };
    memory.set(key, fresh);
    writeDisk(key, text);
    return { cached: fresh, error: null };
  } catch (err) {
    return { cached: existing, error: reason(err) };
  }
}

/**
 * @param from  'YYYY-MM-DD' Zurich, inclusive
 * @param to    'YYYY-MM-DD' Zurich, exclusive
 */
export async function calendarWindow(
  from: string,
  to: string,
  opts: { force?: boolean } = {}
): Promise<CalendarWindow> {
  const results = await Promise.all(
    CALENDARS.map(async ({ key, label, envVar }): Promise<{ status: FeedStatus; events: ReturnType<typeof expandIcs> }> => {
      const url = process.env[envVar]?.trim();
      if (!url) {
        return {
          status: { key, label, state: "unconfigured", fetchedAt: null, error: null },
          events: [],
        };
      }

      const { cached, error } = await load(key, url, opts.force ?? false);
      if (!cached) {
        return {
          status: { key, label, state: "error", fetchedAt: null, error: error ?? "no data" },
          events: [],
        };
      }

      try {
        return {
          status: {
            key,
            label,
            state: error ? "stale" : "ok",
            fetchedAt: new Date(cached.fetchedAt).toISOString(),
            error,
          },
          events: expandIcs(cached.text, key, from, to),
        };
      } catch (err) {
        // A feed that parses today can stop parsing tomorrow; one bad feed must
        // not blank the others.
        return {
          status: {
            key,
            label,
            state: "error",
            fetchedAt: new Date(cached.fetchedAt).toISOString(),
            error: reason(err),
          },
          events: [],
        };
      }
    })
  );

  return {
    events: sortEvents(results.flatMap((r) => r.events)),
    feeds: results.map((r) => r.status),
  };
}

/** The week starting `monday` ('YYYY-MM-DD'). */
export function calendarWeek(monday: string, opts?: { force?: boolean }): Promise<CalendarWindow> {
  return calendarWindow(monday, addDays(monday, 7), opts);
}
