import { CalendarTile } from "@/components/calendar/CalendarTile";
import { TaskForm } from "@/components/lifeos/TaskForm";
import { ThisWeek } from "@/components/lifeos/ThisWeek";
import { UpcomingEmpty } from "@/components/personal/UpcomingEmpty";
import { Disclosure } from "@/components/ui/Disclosure";
import { calendarWeek } from "@/lib/calendar/ics";
import { isUnconfigured } from "@/lib/calendar/types";
import { mondayOf } from "@/lib/dates";
import type { Task } from "@/lib/types";

/**
 * Upcoming (decision #81): the Schedule list and the Calendar preview as one
 * module. Tasks and appointments lead — overdue ones included, since
 * `weekTasksByDomain` keeps them — and the calendar's next events follow, with
 * the week grid behind "Open calendar". When neither has anything, the module
 * is one quiet strip with the two things you might do about it.
 *
 * The feed is read here only to decide which shape to render; `CalendarTile`
 * reads it again from the same ten-minute cache.
 */
export async function UpcomingSection({ tasks, today }: { tasks: Task[]; today: string }) {
  const data = await calendarWeek(mondayOf(today));
  const configured = !isUnconfigured(data.feeds);
  const events = configured
    ? data.events.filter((e) => e.calendar === "personal" && e.start.slice(0, 10) >= today)
    : [];

  if (tasks.length === 0 && events.length === 0) {
    return (
      <UpcomingEmpty
        taskForm={<TaskForm today={today} fixedDomain="personal" accent="personal" inputId="new-task" autoFocus />}
        calendar={
          configured ? (
            <CalendarTile home="personal" expanded />
          ) : (
            <p className="text-sm text-muted">No calendar feeds configured.</p>
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tasks.length > 0 ? (
        <ThisWeek
          tasks={tasks}
          today={today}
          fixedDomain="personal"
          accent="personal"
          showType={false}
          frameless
          addInputId="new-task"
        />
      ) : (
        <Disclosure variant="add" accent="personal" summary="Task" openSummary="Cancel" anchors={["new-task"]}>
          <TaskForm today={today} fixedDomain="personal" accent="personal" inputId="new-task" autoFocus />
        </Disclosure>
      )}
      {configured && (
        <div className={tasks.length > 0 ? "border-t border-border pt-4" : ""}>
          <CalendarTile home="personal" openSummary="Open calendar" hideEmpty />
        </div>
      )}
    </div>
  );
}
