"use client";

import { accentControl, urgencyText } from "@/components/ui/accents";
import { dueInfo } from "@/lib/dates";
import type { WeekTask } from "@/lib/db/tasks";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

// The old "This week" table's job, kept inside the Week plan (decision #82):
// overdue and the next 7 days from every page, minus what the plan already shows.
// `WeekTask` is a type-only import — no SQLite reaches the client bundle.

export function DueSoon({ tasks }: { tasks: WeekTask[] }) {
  const toggles = useOptimisticToggle<WeekTask>({
    idOf: (t) => t.id,
    labelOf: (t) => t.title,
    send: (t, next) =>
      fetch(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      }),
  });

  return (
    <section aria-labelledby="due-soon-title">
      <h3 id="due-soon-title" className="text-sm font-medium text-hub">
        Due soon
      </h3>
      <p className="mb-3 mt-0.5 text-xs text-faint">Overdue and the next 7 days, from your pages</p>
      {tasks.length === 0 ? (
        <p className="text-xs text-muted">Nothing overdue or due in the next 7 days.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((t) => {
            const done = toggles.valueFor(t, t.done === 1);
            const due = t.due ? dueInfo(t.due) : null;
            const context = t.course_short_name ?? t.course_name;
            return (
              <li key={t.id} className="row-card py-1.5 pl-1.5 pr-3">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggles.toggle(t, done)}
                      className={`h-4 w-4 cursor-pointer ${accentControl.hub}`}
                      aria-label={`done: ${t.title}`}
                    />
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className={`block text-sm ${done ? "text-muted line-through" : "text-text"}`}>{t.title}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-2.5 text-xs">
                      {context && <span className="text-muted">{context}</span>}
                      {due && <span className={urgencyText[due.urgency]}>{due.label}</span>}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {toggles.error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {toggles.error}
        </p>
      )}
    </section>
  );
}
