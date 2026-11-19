"use client";

import { useTaskToggles } from "@/components/lifeos/TaskToggles";
import { dueInfo } from "@/lib/dates";
import type { WeekTask } from "@/lib/db/tasks";

// The deadline context beside the Week plan (decisions #82, #89): overdue and the
// next 7 days from every page, minus what the plan already shows. `WeekTask` is a
// type-only import — no SQLite reaches the client bundle. Toggles are the page's
// shared ones, so a row completed here is completed in This week at once.

export function DueSoon({ tasks }: { tasks: WeekTask[] }) {
  const toggles = useTaskToggles();

  return (
    <section aria-labelledby="due-soon-title">
      <h3 id="due-soon-title" className="text-xl font-bold tracking-tight text-text">
        Due soon
      </h3>
      <p className="mb-3 mt-0.5 text-sm italic text-muted">Overdue and the next 7 days, from your pages</p>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted">Nothing overdue or due in the next 7 days.</p>
      ) : (
        <ul className="flex flex-col">
          {tasks.map((t) => {
            const done = toggles.valueFor(t, t.done === 1);
            const due = t.due ? dueInfo(t.due) : null;
            const context = t.course_short_name ?? t.course_name;
            return (
              <li key={t.id} className="row-card py-2 last:border-b-0">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggles.toggle(t, done)}
                      className="h-4.5 w-4.5 cursor-pointer"
                      aria-label={`done: ${t.title}`}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block ${done ? "text-muted line-through" : "text-text"}`}>{t.title}</span>
                    <span className="flex flex-wrap gap-x-1.5 text-sm">
                      {context && <span className="text-text">{context}</span>}
                      {context && due && (
                        <span aria-hidden="true" className="text-muted">
                          ·
                        </span>
                      )}
                      {/* Oxblood is the page's deadline colour (decision #87);
                          the word, not the colour, says a date has passed. */}
                      {due && (
                        <span className={`text-danger ${due.urgency === "overdue" ? "font-semibold" : ""}`}>
                          {due.label}
                        </span>
                      )}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {!toggles.shared && toggles.error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {toggles.error}
        </p>
      )}
    </section>
  );
}
