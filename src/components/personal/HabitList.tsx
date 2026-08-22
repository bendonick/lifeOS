"use client";

import { useState } from "react";
import { DisclosureTrigger } from "@/components/ui/Disclosure";
import { accentControl } from "@/components/ui/accents";
import type { HabitWeek } from "@/lib/db/habits";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

// Habits: one compact flat list (group headers dropped on user feedback,
// 2026-08-16 — the query still orders morning → anytime → evening), checkbox
// for today, and the trailing week.
//
// Progress leads; the matrix is supporting detail. Six rows of seven 8px dots
// in a 19rem rail is a 42-cell grid carrying one bit each, and while the log is
// young every one of them is empty — so the row now states `n/7` in words and
// the dots come back on request. Ticking today stays the primary action and is
// never behind anything.

export function HabitList({ habits, today }: { habits: HabitWeek[]; today: string }) {
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
    return (
      <div className="px-4 py-6 text-center text-xs text-faint">
        no habits yet — seed them in the database to start tracking
      </div>
    );
  }

  const doneCount = habits.filter((h) => valueFor(h, h.days[6])).length;

  const complete = habits.length > 0 && doneCount === habits.length;

  return (
    <div aria-busy={isPending}>
      {isPending && <div className="mb-2 h-0.5 rounded-full bg-hub/40" aria-hidden="true" />}

      {/* Progress first, and as one object: the ring used to be a 104px circle
          centred above a left-aligned count, so the tile opened with three
          different alignments and 60px of empty space around an arc that is
          invisible at 0%. Ring and numerals now read as a single mark. */}
      <div className="flex items-center gap-3 pb-3">
        <CompletionRing done={doneCount} total={habits.length} />
        <div className="min-w-0">
          <p className="tabular t-metric text-xl">
            {doneCount} <span className="text-sm font-normal text-muted">of {habits.length}</span>
          </p>
          <p className="text-xs text-faint">{complete ? "all done today" : "done today"}</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error}
        </p>
      )}

      <ul className="divide-y divide-border border-t border-border">
        {habits.map((h) => {
          const doneToday = valueFor(h, h.days[6]);
          const weekDone = h.days.filter(Boolean).length;
          return (
            <li key={h.id} className="flex items-center gap-3 py-1.5">
              <input
                type="checkbox"
                checked={doneToday}
                onChange={() => toggle(h, doneToday)}
                className={`h-4 w-4 shrink-0 cursor-pointer ${accentControl.personal}`}
                aria-label={`${h.name} done today`}
              />
              <span className={`min-w-0 flex-1 text-sm ${doneToday ? "text-muted line-through" : ""}`}>
                {h.name}
              </span>
              {showWeek ? (
                <span
                  className="flex shrink-0 items-center gap-1.5"
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
              ) : (
                <span className="tabular shrink-0 text-xs text-faint" title="done in the last 7 days">
                  {weekDone}/7
                </span>
              )}
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
    </div>
  );
}

/**
 * Today's completion, as one mark beside the count.
 *
 * A ring rather than a bar on purpose: a single self-contained fraction with no
 * time axis and no pace to mark is the one shape a radial reads better than a
 * track. The budget's progress bars are the opposite case — they carry a pace
 * tick — and that is why they stayed bars.
 *
 * No text inside it any more. At 104px with a "0%" in the middle it was the
 * largest element in the rail and said less than the two words next to it.
 */
function CompletionRing({ done, total }: { done: number; total: number }) {
  const SIZE = 56;
  const R = 24;
  const STROKE = 5;
  const C = 2 * Math.PI * R;
  const frac = total > 0 ? done / total : 0;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="shrink-0"
      role="img"
      aria-label={`${Math.round(frac * 100)}% of today's habits done`}
    >
      <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} className="stroke-track" />
      {/* Below ~0.5% a round cap renders as a stray dot on an empty ring. */}
      {frac > 0.005 && (
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${frac * C} ${C}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          /* Habits sits in the left rail, so the ring takes the rail's accent
             rather than the main column's. */
          className="text-hub transition-[stroke-dasharray] duration-200 ease-out"
        />
      )}
    </svg>
  );
}
