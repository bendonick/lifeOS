import { WeekCalendar } from "./WeekCalendar";
import { calendarWeek } from "@/lib/calendar/ics";
import type { CalendarKey } from "@/lib/calendar/types";
import { mondayOf, zurichToday } from "@/lib/dates";

/**
 * Server half of the calendar: fetches the feeds (secrets stay here) and hands
 * the expanded week to the client component. Wrap in <Suspense fallback={
 * <CalendarSkeleton />}> so a slow or unreachable Google never blocks the page.
 */
export async function CalendarSection({ home }: { home?: CalendarKey }) {
  const today = zurichToday();
  const monday = mondayOf(today);
  const data = await calendarWeek(monday);
  return <WeekCalendar initial={data} monday={monday} today={today} home={home} />;
}

export function CalendarSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading calendar"
      className="h-[26rem] rounded-lg border border-border bg-surface"
    />
  );
}
