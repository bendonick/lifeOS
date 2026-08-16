"use client";

import { accentControl } from "@/components/ui/accents";
import type { HabitWeek } from "@/lib/db/habits";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

// Habits: one compact flat list (group headers dropped on user feedback,
// 2026-08-16 — the query still orders morning → anytime → evening), checkbox
// for today, 7-dot trailing strip (oldest → newest, today rightmost, ringed).

export function HabitList({ habits, today }: { habits: HabitWeek[]; today: string }) {
  const { toggle, valueFor, isPending, error } = useOptimisticToggle<HabitWeek>({
    idOf: (h) => h.id,
    labelOf: (h) => h.name,
    send: (h, next) =>
      fetch(`/api/habits/${h.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, done: next }),
      }),
  });

  if (habits.length === 0) {
    return (
      <div className="max-w-lg rounded-lg border border-border bg-surface px-4 py-6 text-center text-xs text-faint">
        no habits yet — seed them in the database to start tracking
      </div>
    );
  }

  const doneCount = habits.filter((h) => valueFor(h, h.days[6])).length;

  return (
    <div className="max-w-lg rounded-lg border border-border bg-surface" aria-busy={isPending}>
      {isPending && <div className="h-0.5 rounded-t-lg bg-personal/40" aria-hidden="true" />}
      <div className="flex items-baseline justify-between px-4 pt-2.5 pb-1">
        <span className="tabular text-[11px] text-muted">
          {doneCount} of {habits.length} today
        </span>
        {error && (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        )}
      </div>
      <ul className="px-4 pb-2.5">
        {habits.map((h) => {
          const doneToday = valueFor(h, h.days[6]);
          const weekDone = h.days.filter(Boolean).length;
          return (
            <li key={h.id} className="flex items-center gap-3 py-1">
              <input
                type="checkbox"
                checked={doneToday}
                onChange={() => toggle(h, doneToday)}
                className={`h-4 w-4 cursor-pointer ${accentControl.personal}`}
                aria-label={`${h.name} done today`}
              />
              <span className={`flex-1 text-sm ${doneToday ? "text-muted line-through" : ""}`}>
                {h.name}
              </span>
              <span
                className="flex items-center gap-1.5"
                role="img"
                aria-label={`${weekDone} of the last 7 days done`}
              >
                {h.days.map((done, i) => {
                  const isToday = i === 6;
                  const filled = isToday ? doneToday : done;
                  return (
                    <span
                      key={i}
                      // An empty day has to be visible or the strip reads as a
                      // few floating dots instead of a 7-slot track.
                      className={`h-2 w-2 rounded-full ${filled ? "bg-personal" : "bg-raised ring-1 ring-border"} ${
                        isToday ? "ring-1 ring-personal/60 ring-offset-1 ring-offset-surface" : ""
                      }`}
                    />
                  );
                })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
