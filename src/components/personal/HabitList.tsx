"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { HabitWeek } from "@/lib/db/habits";

// Habits: one compact flat list (group headers dropped on user feedback,
// 2026-08-16 — the query still orders morning → anytime → evening), checkbox
// for today, 7-dot trailing strip (oldest → newest, today rightmost, ringed).
// Optimistic toggle — a failed POST reverts and shows the error.

export function HabitList({ habits, today }: { habits: HabitWeek[]; today: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Optimistic overlay for today's state, keyed by habit id; server truth
  // returns via router.refresh() and clears it.
  const [overlay, setOverlay] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  async function toggle(habit: HabitWeek) {
    const next = !(overlay[habit.id] ?? habit.days[6]);
    setError(null);
    setOverlay((o) => ({ ...o, [habit.id]: next }));
    const res = await fetch(`/api/habits/${habit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, done: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setOverlay((o) => ({ ...o, [habit.id]: !next }));
      setError(`could not save "${habit.name}" — try again`);
      return;
    }
    startTransition(() => router.refresh());
  }

  const doneCount = habits.filter((h) => overlay[h.id] ?? h.days[6]).length;

  return (
    <div className="max-w-lg rounded-lg border border-border bg-surface px-4 py-2.5">
      <div className="flex items-baseline justify-between pb-1">
        <span className="tabular text-[11px] text-faint">
          {doneCount} of {habits.length} today
        </span>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
      <ul>
        {habits.map((h) => {
          const doneToday = overlay[h.id] ?? h.days[6];
          return (
            <li key={h.id} className="flex items-center gap-3 py-1">
              <input
                type="checkbox"
                checked={doneToday}
                onChange={() => toggle(h)}
                className="h-4 w-4 cursor-pointer accent-[#a78bfa]"
                aria-label={`${h.name} done today`}
              />
              <span className={`flex-1 text-sm ${doneToday ? "text-muted line-through" : ""}`}>
                {h.name}
              </span>
              <span className="flex items-center gap-1.5" aria-label="last 7 days">
                {h.days.map((done, i) => {
                  const isToday = i === 6;
                  const filled = isToday ? doneToday : done;
                  return (
                    <span
                      key={i}
                      className={`h-2 w-2 rounded-full ${
                        filled ? "bg-personal" : "border border-border"
                      } ${isToday ? "ring-1 ring-personal/60 ring-offset-2 ring-offset-surface" : ""}`}
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
