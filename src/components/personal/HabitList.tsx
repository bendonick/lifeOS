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
      <div className="px-4 py-6 text-center text-xs text-faint">
        no habits yet — seed them in the database to start tracking
      </div>
    );
  }

  const doneCount = habits.filter((h) => valueFor(h, h.days[6])).length;

  return (
    <div aria-busy={isPending}>
      {isPending && <div className="mb-2 h-0.5 rounded-full bg-personal/40" aria-hidden="true" />}
      <CompletionRing done={doneCount} total={habits.length} />
      <div className="flex items-baseline justify-between pt-1 pb-1">
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

/**
 * Today's completion, as one mark above the list.
 *
 * A ring rather than a bar here on purpose: this is a single self-contained
 * fraction with no time axis and no pace to mark, which is the one shape a
 * radial reads better than a track. The budget's progress bars are the opposite
 * case — they carry a pace tick — and that is why they stayed bars.
 */
function CompletionRing({ done, total }: { done: number; total: number }) {
  const SIZE = 104;
  const R = 42;
  const STROKE = 8;
  const C = 2 * Math.PI * R;
  const frac = total > 0 ? done / total : 0;
  const complete = total > 0 && done === total;

  return (
    <div className="flex justify-center py-1">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} className="stroke-raised" />
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
              className="text-personal transition-[stroke-dasharray] duration-200 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular t-display text-xl font-semibold">{Math.round(frac * 100)}%</span>
          <span className="text-[10px] text-faint">{complete ? "all done" : "today"}</span>
        </div>
      </div>
    </div>
  );
}
