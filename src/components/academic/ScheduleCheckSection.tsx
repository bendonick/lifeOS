import { ScheduleCheck } from "./ScheduleCheck";
import { checkCourse, probeMonday, type ScheduleCheck as Check } from "@/lib/academic/drift";
import { calendarWeek } from "@/lib/calendar/ics";
import { mondayOf, zurichToday } from "@/lib/dates";
import type { Course } from "@/lib/types";

/**
 * Server half of the drift check: works out which week to compare each course
 * against, fetches those weeks once each (the ICS cache makes repeats free),
 * and hands the verdicts to the panel.
 */
export async function ScheduleCheckSection({ courses }: { courses: Course[] }) {
  const enrolled = courses.filter((c) => c.status === "enrolled");
  if (enrolled.length === 0) return null;

  const today = zurichToday();
  const thisMonday = mondayOf(today);
  const targets = enrolled.map((course) => ({ course, week: probeMonday(course, today, thisMonday) }));

  const weeks = [...new Set(targets.map((t) => t.week).filter((w): w is string => !!w))];
  const fetched = new Map(
    await Promise.all(weeks.map(async (w) => [w, await calendarWeek(w)] as const))
  );

  const checks: Check[] = targets.map(({ course, week }) => {
    const data = week ? fetched.get(week) : undefined;
    const feed = data?.feeds.find((f) => f.key === "academic");
    // Cached-but-stale still tells the truth about what Google holds; only an
    // unconfigured or erroring feed means we genuinely cannot say.
    const usable = feed ? feed.state === "ok" || feed.state === "stale" : false;
    const events = data?.events.filter((e) => e.calendar === "academic") ?? [];
    return checkCourse(course, events, week, usable);
  });

  return <ScheduleCheck checks={checks} courses={enrolled} />;
}
