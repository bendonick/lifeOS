"use client";

import { useState } from "react";
import { DisclosureTrigger } from "@/components/ui/Disclosure";
import { accentControl } from "@/components/ui/accents";
import type { HabitWeek } from "@/lib/db/habits";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

/**
 * Habits today (decision #81): the day's checklist as a main-column module.
 * One box and one name per row, "N of M completed" over a quiet olive track,
 * and the trailing week behind "7-day history" — the dots are history, not the
 * action, so they come back on request. Ticking today is never behind anything.
 *
 * The count and the track are rendered here rather than in the tile header so
 * they move with the optimistic toggle; a server-rendered header would lag the
 * click by a round trip.
 */
export function HabitsToday({ habits, today }: { habits: HabitWeek[]; today: string }) {
  const [showWeek, setShowWeek] = useState(false);
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
    return <p className="text-sm text-muted">No habits yet.</p>;
  }

  const doneCount = habits.filter((h) => valueFor(h, h.days[6])).length;
  const complete = doneCount === habits.length;

  return (
    <div aria-busy={isPending}>
      {/* The count and its track share one line, so the count reads as the
          track's label rather than floating on its own above it. */}
      <div className="flex items-center gap-4">
        <div
          role="progressbar"
          aria-label="habits completed today"
          aria-valuemin={0}
          aria-valuemax={habits.length}
          aria-valuenow={doneCount}
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-track"
        >
          <div
            className="h-full rounded-full bg-hub transition-[width] duration-200 ease-out"
            style={{ width: `${(doneCount / habits.length) * 100}%` }}
          />
        </div>
        <span className="tabular shrink-0 text-xs text-muted">
          {complete ? "All done" : `${doneCount} of ${habits.length} done`}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}

      <ul className="mt-3 divide-y divide-border border-t border-border">
        {habits.map((h) => {
          const doneToday = valueFor(h, h.days[6]);
          return (
            <li key={h.id} className="flex min-h-12 items-center gap-3 py-2">
              {/* 24px target around a 16px glyph (decision #76). */}
              <label className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded">
                <input
                  type="checkbox"
                  checked={doneToday}
                  onChange={() => toggle(h, doneToday)}
                  className={`h-4 w-4 cursor-pointer ${accentControl.personal}`}
                  aria-label={`${h.name} done today`}
                />
              </label>
              <span className={`min-w-0 flex-1 text-sm ${doneToday ? "text-muted line-through" : "text-text"}`}>
                {h.name}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3">
        <DisclosureTrigger
          open={showWeek}
          onToggle={() => setShowWeek((v) => !v)}
          summary="7-day history"
          openSummary="Hide history"
        />
      </div>
      {showWeek && (
        <ul className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
          {habits.map((h) => {
            const doneToday = valueFor(h, h.days[6]);
            const weekDone = h.days.filter((d, i) => (i === 6 ? doneToday : d)).length;
            return (
              <li key={h.id} className="flex items-center gap-3 text-xs">
                <span className="w-32 shrink-0 truncate text-muted">{h.name}</span>
                <span
                  className="flex shrink-0 items-center gap-1.5"
                  role="img"
                  aria-label={`${h.name}: ${weekDone} of the last 7 days done`}
                >
                  {h.days.map((done, i) => {
                    const isToday = i === 6;
                    const filled = isToday ? doneToday : done;
                    return (
                      <span
                        key={i}
                        // An empty day has to be visible or the strip reads as a
                        // few floating dots instead of a 7-slot track.
                        className={`h-2 w-2 rounded-full ${filled ? "bg-hub" : "bg-raised ring-1 ring-border"} ${
                          isToday ? "ring-1 ring-hub/60 ring-offset-1 ring-offset-surface" : ""
                        }`}
                      />
                    );
                  })}
                </span>
                <span className="tabular text-faint">{weekDone}/7</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
