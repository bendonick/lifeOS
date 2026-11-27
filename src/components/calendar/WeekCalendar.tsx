"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DeadlineList } from "./DeadlineList";
import { accentEvent, accentText } from "@/components/ui/accents";
import { courseTitle, type CourseName } from "@/lib/calendar/courses";
import { dueOn, type Deadline } from "@/lib/calendar/deadlines";
import { allDayOn, hourRange, placeTimed, type PlacedEvent } from "@/lib/calendar/layout";
import {
  calendarAccent,
  calendarLabel,
  inHome,
  isUnconfigured,
  type CalendarEvent,
  type CalendarKey,
  type CalendarWindow,
  type FeedStatus,
} from "@/lib/calendar/types";
import { addDays, dayLabel, hourOf, mondayOf, TZ, weekLabel, zurichLocal } from "@/lib/dates";

/**
 * The read-only half of the command center (docs/02-design-system.md): time on
 * this side, work on the other. Never merge them — decision #1.
 *
 * Data arrives from the server already expanded; this component only navigates
 * weeks and filters calendars, both through /api/calendar.
 *
 * `deadlines` (decision #73) is the one thing on the grid Google does not own:
 * the page's open, dated work, drawn as chips in a due strip above the hours
 * and listed beneath the grid. They arrive once as a prop — every open row,
 * not a week's worth — and the visible week is filtered here as you page, so
 * navigation costs no second fetch. The strip is a *date* lane, never a time
 * slot: a deadline has no duration to draw. One chip colour, by the user's
 * call, with urgency carried by the list below and not by the chips.
 */

const HOUR_PX = 44;

/**
 * A calendar from outside the page (Class or Personal on Academic, say). Its
 * blocks carry `data-outside` and name their calendar, so on "All calendars"
 * they read apart from the page's own even where a theme draws every block
 * in one colour. False on a page without a home, where nothing is outside.
 */
function isOutside(calendar: CalendarKey, home: CalendarKey | undefined): boolean {
  return Boolean(home) && !inHome(calendar, home as CalendarKey);
}

export function WeekCalendar({
  initial,
  monday: initialMonday,
  today,
  /** When set, the default view is this page's calendars (every calendar
   *  whose home it is: Academic shows classes and Exam Prep) with an "All
   *  calendars" tab. */
  home,
  /** Open, dated work to draw in the due strip and list under the grid. */
  deadlines,
  /** The page's courses: its own events are named by course code. */
  courses,
}: {
  initial: CalendarWindow;
  monday: string;
  today: string;
  home?: CalendarKey;
  deadlines?: Deadline[];
  courses?: CourseName[];
}) {
  const [monday, setMonday] = useState(initialMonday);
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(!home);

  // The page's own events go by course code ('NLP', 'FoC II · mock exam'), so
  // one course reads the same however its Google titles spell it, and the
  // code fits where the full name was cut off.
  const nameOf = useCallback(
    (e: CalendarEvent) =>
      courses && home && inHome(e.calendar, home) ? courseTitle(e.title, courses) : e.title,
    [courses, home]
  );

  const load = useCallback(async (target: string, force = false) => {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/calendar?monday=${target}${force ? "&force=1" : ""}`);
      if (!res.ok) throw new Error(`calendar request failed (${res.status})`);
      const json = (await res.json()) as CalendarWindow & { monday: string };
      setMonday(json.monday);
      setData({ events: json.events, feeds: json.feeds });
    } catch (err) {
      setFailed(err instanceof Error ? err.message : "calendar request failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    [monday]
  );

  const visible = useMemo(
    () => (showAll || !home ? data.events : data.events.filter((e) => inHome(e.calendar, home))),
    [data.events, home, showAll]
  );

  const placed = useMemo(() => days.map((d) => placeTimed(visible, d)), [days, visible]);
  const allDay = useMemo(() => days.map((d) => allDayOn(visible, d)), [days, visible]);
  const due = useMemo(
    () => (deadlines ? days.map((d) => dueOn(deadlines, d)) : null),
    [days, deadlines]
  );
  const [fromHour, toHour] = useMemo(() => hourRange(placed), [placed]);
  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i);
  const shown = new Set(visible.map((e) => e.calendar));

  if (isUnconfigured(data.feeds)) return <NotConfigured />;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-1">
          <NavButton label="Previous week" onClick={() => load(addDays(monday, -7))}>
            <ChevronLeft size={14} aria-hidden="true" />
          </NavButton>
          <NavButton label="Next week" onClick={() => load(addDays(monday, 7))}>
            <ChevronRight size={14} aria-hidden="true" />
          </NavButton>
          <span className="ml-2 text-sm font-medium">{weekLabel(monday)}</span>
          {monday !== mondayOf(today) && (
            <button
              type="button"
              onClick={() => load(mondayOf(today))}
              className="ml-1 rounded-md px-2 py-1 text-xs text-muted hover:text-text"
            >
              today
            </button>
          )}
        </div>

        {home && (
          <div className="flex items-center gap-1" role="tablist" aria-label="Calendars shown">
            <Tab active={!showAll} onClick={() => setShowAll(false)}>
              {calendarLabel[home]}
            </Tab>
            <Tab active={showAll} onClick={() => setShowAll(true)}>
              All calendars
            </Tab>
          </div>
        )}
      </div>

      {/* Pending is a hairline plus aria-busy — never a dimmed panel, which drops
          the text you are reading below AA exactly when you act on it. */}
      <div className="h-0.5 rounded-full" style={{ background: busy ? "var(--color-border)" : "transparent" }} />

      <div
        aria-busy={busy}
        className="mt-1 overflow-x-auto rounded-lg border border-border bg-surface"
      >
        <div className="grid min-w-[52rem] grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]">
          <div className="border-b border-border" />
          {days.map((d) => (
            <div
              key={d}
              // Styling hooks (`data-today`, `data-event`, `data-calendar`,
              // `data-outside`): the Maritime theme tints today rust, draws event
              // blocks slate, hatches Exam Prep rust and outlines calendars from
              // outside the page; inert elsewhere.
              data-today={d === today ? "" : undefined}
              className={`border-b border-l border-border px-2 py-2 text-xs font-medium ${
                d === today ? "text-text" : "text-muted"
              }`}
            >
              {dayLabel(d)}
              {d === today && <span className="ml-1.5 text-[11px] text-faint">today</span>}
            </div>
          ))}

          {/* The due strip renders whenever deadlines are wired, empty week or
              not: it is the one fixed place to look for the week's work, and a
              lane that appears only on busy weeks would move under the eye. */}
          {due && (
            <>
              <div className="flex items-end justify-end border-b border-border px-2 py-1.5 text-[11px] text-faint">
                due
              </div>
              {days.map((d, i) => (
                <div key={d} className="min-h-10 space-y-1 border-b border-l border-border p-1">
                  {due[i].map((item) => (
                    <DeadlineChip key={item.id} item={item} />
                  ))}
                </div>
              ))}
            </>
          )}

          {allDay.some((list) => list.length > 0) && (
            <>
              <div className="border-b border-border px-2 py-1.5 text-right text-[11px] text-faint">
                all-day
              </div>
              {days.map((d, i) => (
                <div key={d} className="space-y-1 border-b border-l border-border p-1">
                  {allDay[i].map((e) => (
                    <div
                      key={e.id}
                      data-calendar={e.calendar}
                      data-outside={isOutside(e.calendar, home) ? "" : undefined}
                      className={`truncate rounded border px-1.5 py-0.5 text-[11px] ${accentEvent[calendarAccent[e.calendar]]}`}
                    >
                      {nameOf(e)}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          <div className="relative" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[11px] text-faint"
                style={{ top: i * HOUR_PX }}
              >
                {i > 0 && `${String(h).padStart(2, "0")}:00`}
              </div>
            ))}
          </div>

          {days.map((d, i) => (
            <DayColumn
              key={d}
              day={d}
              today={today}
              hours={hours}
              fromHour={fromHour}
              toHour={toHour}
              placed={placed[i]}
              home={home}
              nameOf={nameOf}
            />
          ))}
        </div>
      </div>

      <FeedLine
        feeds={data.feeds}
        shown={shown}
        showAll={showAll || !home}
        home={home}
        hasDeadlines={Boolean(deadlines)}
        busy={busy}
        failed={failed}
        onRefresh={() => load(monday, true)}
      />

      {deadlines && <DeadlineList items={deadlines} monday={monday} today={today} />}
    </div>
  );
}

/**
 * A deadline in the due strip: title and what it is filed against, nothing
 * more. Olive is the palette's green — the one the user asked for — reached
 * through the existing `hub` accent rather than a new token. The date and the
 * figures live in the list under the grid; the grid has no hover tooltips.
 */
function DeadlineChip({ item }: { item: Deadline }) {
  const time = item.due.length > 10 ? item.due.slice(11, 16) : null;
  const detail = [time, item.context].filter(Boolean).join(" · ");
  return (
    <div
      className={`rounded-md border px-1.5 py-1 text-[11px] leading-tight ${accentEvent.hub}`}
    >
      <div className="truncate font-medium">{item.title}</div>
      {detail && <div className="truncate opacity-80">{detail}</div>}
    </div>
  );
}

function DayColumn({
  day,
  today,
  hours,
  fromHour,
  toHour,
  placed,
  home,
  nameOf,
}: {
  day: string;
  today: string;
  hours: number[];
  fromHour: number;
  toHour: number;
  placed: PlacedEvent[];
  home?: CalendarKey;
  nameOf: (e: CalendarEvent) => string;
}) {
  return (
    <div
      data-today={day === today ? "" : undefined}
      className={`relative border-l border-border ${day === today ? "bg-raised/40" : ""}`}
      style={{ height: hours.length * HOUR_PX }}
    >
      {hours.map((h, i) => (
        <div
          key={h}
          className="absolute inset-x-0 border-t border-border/50"
          style={{ top: i * HOUR_PX }}
        />
      ))}

      {day === today && <NowLine fromHour={fromHour} toHour={toHour} />}

      {placed.map((p) => {
        const top = (p.startHour - fromHour) * HOUR_PX;
        const height = (p.endHour - p.startHour) * HOUR_PX;
        const width = `calc((100% - 0.5rem) / ${p.lanes})`;
        const outside = isOutside(p.event.calendar, home);
        const source = outside ? ` · ${calendarLabel[p.event.calendar]}` : "";
        return (
          <div
            key={p.event.id}
            data-event=""
            data-calendar={p.event.calendar}
            data-outside={outside ? "" : undefined}
            className={`absolute overflow-hidden rounded border px-1.5 py-0.5 text-[11px] leading-tight ${accentEvent[calendarAccent[p.event.calendar]]}`}
            style={{
              top: top + 1,
              height: Math.max(height - 2, 14),
              left: `calc(0.25rem + ${p.lane} * ${width})`,
              width,
            }}
          >
            {/* A tall block has room to wrap; a short one must stay on one line. */}
            <div className={`font-medium ${height >= 60 ? "line-clamp-2" : "truncate"}`}>
              {nameOf(p.event)}
            </div>
            {height >= 34 && (
              <div className="truncate opacity-80">
                {p.continuesBefore ? "…" : p.event.start.slice(11, 16)}
                {/* Lanes mean a half-width block, where a full range truncates to
                    "08:00–1…"; the start time alone is shown instead. */}
                {p.continuesAfter ? " …" : p.lanes > 1 ? "" : `–${p.event.end.slice(11, 16)}`}
                {/* An outside calendar names itself after the time, ahead of the
                    place: which calendar it is matters more on this page. */}
                {source}
                {p.event.location && p.lanes === 1 && height >= 52 ? ` · ${p.event.location}` : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Rendered after mount only — the server has no idea what time it is for the reader. */
function NowLine({ fromHour, toHour }: { fromHour: number; toHour: number }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(hourOf(zurichLocal(new Date())));
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  if (now === null || now < fromHour || now > toHour) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-10 border-t border-text/45"
      style={{ top: (now - fromHour) * HOUR_PX }}
    />
  );
}

/** Honest provenance: what was fetched, when, and what is missing or stale. */
function FeedLine({
  feeds,
  shown,
  showAll,
  home,
  hasDeadlines,
  busy,
  failed,
  onRefresh,
}: {
  feeds: FeedStatus[];
  shown: Set<CalendarKey>;
  showAll: boolean;
  home?: CalendarKey;
  /** With a due strip on the grid the legend has two kinds to name, so it
   *  renders even for a single calendar. */
  hasDeadlines: boolean;
  busy: boolean;
  failed: string | null;
  onRefresh: () => void;
}) {
  const live = feeds.filter((f) => f.state !== "unconfigured");
  const newest = live
    .map((f) => f.fetchedAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);
  const broken = live.filter((f) => f.state === "error");
  const stale = live.filter((f) => f.state === "stale");
  const missing = feeds.filter((f) => f.state === "unconfigured");

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
      {((showAll && shown.size > 1) || hasDeadlines) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {feeds
            .filter((f) => shown.has(f.key))
            .map((f) => (
              <span key={f.key} className={`flex items-center gap-1.5 ${accentText[calendarAccent[f.key]]}`}>
                <span
                  aria-hidden="true"
                  data-swatch=""
                  data-calendar={f.key}
                  data-outside={isOutside(f.key, home) ? "" : undefined}
                  className="inline-block size-2 rounded-[2px] bg-current opacity-70"
                />
                {f.label}
              </span>
            ))}
          {hasDeadlines && (
            <span className={`flex items-center gap-1.5 ${accentText.hub}`}>
              <span
                aria-hidden="true"
                className="inline-block size-2 rounded-[2px] border border-current bg-current/40"
              />
              deadline
            </span>
          )}
        </div>
      )}
      {newest && <span>updated {new Date(newest).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ })}</span>}
      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        className="inline-flex min-h-6 items-center rounded text-faint underline decoration-border underline-offset-2 hover:text-muted disabled:cursor-wait"
      >
        {busy ? "refreshing…" : "refresh"}
      </button>
      {stale.length > 0 && (
        <span role="status">
          showing cached {stale.map((f) => f.label).join(", ")} — last fetch failed
        </span>
      )}
      {broken.length > 0 && (
        <span role="alert" className="text-danger">
          {broken.map((f) => `${f.label}: ${f.error}`).join(" · ")}
        </span>
      )}
      {failed && (
        <span role="alert" className="text-danger">
          {failed}
        </span>
      )}
      {missing.length > 0 && <span>not configured: {missing.map((f) => f.label).join(", ")}</span>}
    </div>
  );
}

/** No feed at all is a setup problem, not an empty week — say what to do. */
function NotConfigured() {
  return (
    <div className="rounded-lg border border-border bg-surface p-6 text-sm">
      <p className="text-muted">The calendar is not connected yet.</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-faint">
        <li>Google Calendar → Settings → pick a calendar → Integrate calendar.</li>
        <li>
          Copy <span className="text-muted">Secret address in iCal format</span> (treat it like a
          password).
        </li>
        <li>
          Paste it into <span className="text-muted">.env</span> as{" "}
          <span className="text-muted">ICS_URL_ACADEMIC</span> (also CLASS, PERSONAL,
          PROFESSIONAL, EXAM_PREP), then restart <span className="text-muted">npm run dev</span>.
        </li>
      </ol>
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-md border border-border bg-raised px-2 py-1 text-xs text-muted hover:text-text"
    >
      {children}
    </button>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-[11px] ${
        active ? "border-border bg-raised text-text" : "border-transparent text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
