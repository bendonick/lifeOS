"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pill } from "@/components/ui/Pill";
import type { HabitWeek } from "@/lib/db/habits";

// Habits §3: three time-of-day groups, checkbox for today, 7-dot trailing
// strip (oldest → newest, today rightmost and ringed). Optimistic toggle —
// a failed POST reverts and shows the error instead of swallowing it.

const GROUPS = [
  ["morning", "Morning"],
  ["anytime", "Anytime"],
  ["evening", "Evening"],
] as const;

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

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      {error && <p className="mb-3 text-xs text-danger">{error}</p>}
      <div className="flex flex-col gap-4">
        {GROUPS.map(([key, label]) => {
          const group = habits.filter((h) => h.time_of_day === key);
          if (!group.length) return null;
          return (
            <div key={key}>
              <Pill tone="personal">{label}</Pill>
              <ul className="mt-2 flex flex-col gap-1">
                {group.map((h) => {
                  const doneToday = overlay[h.id] ?? h.days[6];
                  return (
                    <li key={h.id} className="flex items-center gap-3 py-0.5">
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
        })}
      </div>
    </div>
  );
}
