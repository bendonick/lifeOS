import { CalendarRevealTrigger } from "@/components/lifeos/CalendarReveal";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { calendarWeek } from "@/lib/calendar/ics";
import { calendarLabel, isUnconfigured, type CalendarEvent } from "@/lib/calendar/types";
import { addDays, dayLabel, mondayOf, zurichToday } from "@/lib/dates";

// The Overview's calendar summary as a day planner's agenda (decision #90): an
// aligned time column, a slim rust marker, and the event's full title — wrapped,
// never truncated. Today's events stay together; the next day that has any is
// labelled explicitly beneath. Same source as every other calendar surface
// (`calendarWeek`, the shared ICS cache), read-only as always (decision #1).

function Row({ event }: { event: CalendarEvent }) {
  return (
    <li className="grid grid-cols-[4.25rem_auto_minmax(0,1fr)] items-stretch gap-x-3 border-b border-border py-3">
      <span className="tabular text-muted">{event.allDay ? "all day" : event.start.slice(11, 16)}</span>
      <span aria-hidden="true" className="w-0.5 rounded-full bg-(--color-rust)" />
      <span className="min-w-0">
        <span className="block text-text">{event.title}</span>
        {event.location && <span className="block text-sm text-muted">{event.location}</span>}
        {/* The calendar is named in words, for screen readers and for the eye
            alike — no colour carries it here. */}
        <span className="sr-only">{calendarLabel[event.calendar]} calendar</span>
      </span>
    </li>
  );
}

export async function Agenda() {
  const today = zurichToday();
  const data = await calendarWeek(mondayOf(today));

  if (isUnconfigured(data.feeds)) {
    return (
      <p className="text-sm text-muted">
        No calendar feeds are configured. Add the secret ICS URLs to <code className="text-xs">.env</code>.
      </p>
    );
  }

  const sorted = [...data.events].sort((a, b) => a.start.localeCompare(b.start));
  const todays = sorted.filter((e) => e.start.slice(0, 10) === today);
  const nextDate = sorted.find((e) => e.start.slice(0, 10) > today)?.start.slice(0, 10);
  const nexts = nextDate ? sorted.filter((e) => e.start.slice(0, 10) === nextDate) : [];
  const unreadable = data.feeds.filter((f) => f.state === "error").length;

  return (
    <div>
      {todays.length === 0 ? (
        <p className="border-b border-border pb-3 text-muted">Nothing on the calendar today.</p>
      ) : (
        <ul className="flex flex-col">
          {todays.map((e) => (
            <Row key={e.id} event={e} />
          ))}
        </ul>
      )}

      {nextDate && (
        <>
          <h3 className="mt-4 text-base text-muted">
            {nextDate === addDays(today, 1) && <span className="font-semibold">Tomorrow</span>}
            {nextDate === addDays(today, 1) && " · "}
            <span className="italic">{dayLabel(nextDate)}</span>
          </h3>
          <ul className="flex flex-col">
            {nexts.map((e) => (
              <Row key={e.id} event={e} />
            ))}
          </ul>
        </>
      )}

      {unreadable > 0 && (
        <p className="mt-2 text-sm text-warn">
          {unreadable === 1 ? "One calendar" : `${unreadable} calendars`} could not be read. Open the calendar for details.
        </p>
      )}

      <div className="mt-2">
        <CalendarRevealTrigger detail={`${data.events.length} this week`} />
      </div>
    </div>
  );
}

/** The existing week grid, for the full-width panel "Open calendar" reveals. */
export async function AgendaWeek() {
  const today = zurichToday();
  const monday = mondayOf(today);
  const data = await calendarWeek(monday);
  return <WeekCalendar initial={data} monday={monday} today={today} />;
}

export function AgendaSkeleton() {
  return <div aria-busy="true" aria-label="Loading calendar" className="h-40 rounded-lg bg-raised" />;
}
