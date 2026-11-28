import { WeekCalendar } from "./WeekCalendar";
import { Disclosure } from "@/components/ui/Disclosure";
import type { Deadline } from "@/lib/calendar/deadlines";
import { calendarWeek } from "@/lib/calendar/ics";
import {
  calendarAccent,
  inHome,
  isUnconfigured,
  type CalendarEvent,
  type CalendarKey,
} from "@/lib/calendar/types";
import { accentText } from "@/components/ui/accents";
import { dayLabel, mondayOf, zurichToday } from "@/lib/dates";

/**
 * The calendar as a dashboard summary rather than an embedded workspace.
 *
 * The week grid is ~600px of mostly-empty rows, and it sat at the same visual
 * weight as every other section — the single largest thing on the page carrying
 * the least information on a quiet week. What a dashboard owes here is "what is
 * coming"; the grid is what you open when you want to plan against free time,
 * which is a deliberate act (decision #2's second surface, on request).
 *
 * The feed is fetched either way — the grid is a client component and the ICS
 * cache is shared — so collapsing costs nothing and the summary is free.
 *
 * `expanded` is the exception (decision #73, Academic): once the grid carries
 * the page's deadlines it is no longer empty rows, it is the week's work, and
 * the page leads with it — no summary list, no disclosure. The other three
 * pages are unchanged; adopting the same view there is two props, not a fork.
 */
const UPCOMING = 4;

export async function CalendarTile({
  home,
  deadlines,
  expanded = false,
  openSummary = "Open week",
  hideEmpty = false,
}: {
  home?: CalendarKey;
  /** Open, dated work to draw in the grid's due strip and list beneath it. */
  deadlines?: Deadline[];
  /** Render the grid open, in place of the summary list and its disclosure. */
  expanded?: boolean;
  /** The disclosure's label — "Open calendar" where the tile is not the calendar. */
  openSummary?: string;
  /** Skip the "Nothing left this week" line when the caller already says so. */
  hideEmpty?: boolean;
}) {
  const today = zurichToday();
  const monday = mondayOf(today);
  const data = await calendarWeek(monday);

  if (isUnconfigured(data.feeds)) {
    return (
      <p className="text-sm text-muted">
        No calendar feeds configured — add the secret ICS URLs to <code className="text-xs">.env</code>.
      </p>
    );
  }

  if (expanded) {
    return (
      <WeekCalendar initial={data} monday={monday} today={today} home={home} deadlines={deadlines} />
    );
  }

  // The tile's own calendar, and the count is scoped to it too — a filtered
  // list above an unfiltered total needed the words "all calendars" to stop
  // reading as a contradiction, and the cheapest way to drop that phrase is to
  // count the same set the list shows. `start` is a sortable Zurich wall-clock
  // string, so a lexical compare is a chronological one.
  const mine = home ? data.events.filter((e) => inHome(e.calendar, home)) : data.events;
  const upcoming = mine
    .filter((e) => e.start.slice(0, 10) >= today)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, UPCOMING);

  return (
    <div className="flex flex-col gap-4">
      {upcoming.length === 0 ? (
        hideEmpty ? null : <p className="text-sm text-muted">Nothing left this week.</p>
      ) : (
        // Capped: a single upcoming event across the full page width put its
        // title and its time 900px apart, which reads as two unrelated things.
        <ul className="flex max-w-3xl flex-col divide-y divide-border border-t border-border">
          {upcoming.map((e) => (
            <EventRow key={e.id} event={e} today={today} />
          ))}
        </ul>
      )}

      <Disclosure
        summary={openSummary}
        openSummary={openSummary.replace(/^Open/, "Hide")}
        detail={`${mine.length} this week`}
      >
        <WeekCalendar initial={data} monday={monday} today={today} home={home} deadlines={deadlines} />
      </Disclosure>
    </div>
  );
}

function EventRow({ event, today }: { event: CalendarEvent; today: string }) {
  const date = event.start.slice(0, 10);
  const when = date === today ? "today" : dayLabel(date);
  return (
    <li className="flex items-baseline gap-3 py-2">
      <span
        aria-hidden="true"
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current ${accentText[calendarAccent[event.calendar]]}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{event.title}</span>
        {event.location && <span className="block truncate text-xs text-faint">{event.location}</span>}
      </span>
      <span className="tabular shrink-0 text-xs text-muted whitespace-nowrap">
        {when}
        {!event.allDay && <span className="text-faint"> · {event.start.slice(11, 16)}</span>}
      </span>
    </li>
  );
}

export function CalendarTileSkeleton() {
  return <div aria-busy="true" aria-label="Loading calendar" className="h-32 rounded-lg bg-raised/40" />;
}
