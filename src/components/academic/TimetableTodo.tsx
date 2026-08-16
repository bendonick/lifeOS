"use client";

import { accentControl, urgencyText } from "@/components/ui/accents";
import { dueInfo } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
import type { CourseTask } from "@/lib/db/tasks";

/**
 * The interactive half of the command center (decision #2): free time on the
 * calendar, work on this side. Open academic items, soonest first. Undated items
 * come last rather than being hidden — they are still work.
 */
export function TimetableTodo({ tasks }: { tasks: CourseTask[] }) {
  const { toggle, valueFor, isPending, error } = useOptimisticToggle<CourseTask>({
    idOf: (t) => t.id,
    labelOf: (t) => t.title,
    send: (t, next) =>
      fetch(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      }),
  });

  const open = tasks.filter((t) => !valueFor(t, !!t.done));

  return (
    <div aria-busy={isPending} className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs font-medium text-academic">To do</div>
      <p className="mt-1 text-xs text-muted">
        {open.length === 0 ? "nothing open" : `${open.length} open · soonest first`}
      </p>

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-danger">
          {error}
        </p>
      )}

      {open.length === 0 ? (
        <p className="mt-4 text-xs text-faint">
          Nothing to pick up — add work in Assignments or Exams above.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tasks.map((t) => {
            const done = valueFor(t, !!t.done);
            if (done) return null;
            const info = t.due ? dueInfo(t.due) : null;
            return (
              <li key={t.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggle(t, done)}
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer ${accentControl.academic}`}
                  aria-label={`done: ${t.title}`}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm">{t.title}</div>
                  <div className="flex flex-wrap items-baseline gap-x-1.5 text-[11px]">
                    <span className={info ? urgencyText[info.urgency] : "text-faint"}>
                      {info?.label ?? "no date"}
                    </span>
                    {t.course_name && <span className="text-faint">· {t.course_name}</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
