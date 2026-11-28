"use client";

import { Menu, Pencil } from "lucide-react";
import { useState } from "react";
import { HabitForm } from "@/components/personal/HabitForm";
import { Disclosure } from "@/components/ui/Disclosure";
import { RowAction } from "@/components/ui/RowAction";
import { accentControl } from "@/components/ui/accents";
import type { HabitWeek } from "@/lib/db/habits";
import { addDays, mondayOf } from "@/lib/dates";
import { useDragOrder } from "@/lib/useDragOrder";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";

/**
 * Habits today: today's checklist first, one box and one name per row, and at
 * the end of every row the week so far, Monday to Sunday. Ticking today is
 * never behind anything; the week is always in view rather than behind a
 * "7-day history" toggle, so the missed days show without asking.
 *
 * Each past day in a strip is its own 24px button (a 14px mark inside it), so
 * a day forgotten earlier in the week can be caught up from where it shows as
 * missed. Days after today are drawn dashed and cannot be ticked. Today's box
 * and today's mark in the strip are one value under one key, so they flip
 * together.
 *
 * Habits are managed in place: a pencil at the end of a row turns the row into
 * its editor (name, Remove), and "Add habit" under the list, or
 * Habit in the page's `+ Add` menu (`#new-habit`), opens the same form empty.
 * The three lines at the start of a row are its handle: drag it up or down to
 * change the order, or focus it and use the arrow keys (`useDragOrder`).
 *
 * The count is rendered here rather than in the section heading so it moves
 * with the optimistic toggle; a server-rendered heading would lag the click by
 * a round trip.
 */

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** One habit on one day of the week (0 = Monday). */
interface Cell {
  habit: HabitWeek;
  day: number;
}

export function HabitsToday({ habits, today }: { habits: HabitWeek[]; today: string }) {
  const monday = mondayOf(today);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const todayIdx = dates.indexOf(today);

  const { toggle, valueFor, isPending, error } = useOptimisticToggle<Cell>({
    // Unique per habit and day while `day` stays within 0–6.
    idOf: (c) => c.habit.id * 7 + c.day,
    labelOf: (c) => (c.day === todayIdx ? c.habit.name : `${c.habit.name} on ${DAY_NAMES[c.day]}`),
    send: (c, next) =>
      fetch(`/api/habits/${c.habit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dates[c.day], done: next }),
      }),
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const byId = new Map(habits.map((h) => [h.id, h]));
  const drag = useDragOrder({
    ids: habits.map((h) => h.id),
    labelOf: (id) => byId.get(id)?.name ?? "Habit",
    save: (order) =>
      fetch("/api/habits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      }),
  });
  const ordered = drag.order.map((id) => byId.get(id)).filter((h): h is HabitWeek => !!h);

  const addHabit = (
    <Disclosure variant="add" accent="personal" summary="Add habit" openSummary="Cancel" anchors={["new-habit"]} className="mt-3">
      <HabitForm inputId="new-habit" />
    </Disclosure>
  );

  if (habits.length === 0) {
    return (
      <div>
        <p className="text-sm text-muted">No habits yet.</p>
        {addHabit}
      </div>
    );
  }

  const isDone = (habit: HabitWeek, day: number) => valueFor({ habit, day }, habit.days[day]);
  const doneCount = habits.filter((h) => isDone(h, todayIdx)).length;
  const complete = doneCount === habits.length;

  return (
    <div aria-busy={isPending}>
      {/* The count, and the strip's day letters above its columns. */}
      <div className="flex items-end justify-between gap-4 pb-1.5">
        <span className="tabular text-sm text-muted">
          {complete ? "All done today" : `${doneCount} of ${habits.length} done today`}
        </span>
        <span aria-hidden="true" className="flex shrink-0 gap-3">
          <span className="flex">
            {LETTERS.map((l, i) => (
              <span
                key={i}
                className={`w-6 text-center text-[11px] ${i === todayIdx ? "font-bold text-text" : "text-muted"}`}
              >
                {l}
              </span>
            ))}
          </span>
          {/* Over the edit column, so the letters stay above their marks. */}
          <span className="w-6" />
        </span>
      </div>

      {(error ?? drag.error) && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error ?? drag.error}
        </p>
      )}
      <p role="status" className="sr-only">
        {drag.status}
      </p>

      <ul
        className={`divide-y divide-border border-y border-border ${drag.dragId !== null ? "cursor-grabbing select-none" : ""}`}
      >
        {ordered.map((h) => {
          if (editingId === h.id) {
            return (
              <li key={h.id} ref={drag.rowRef(h.id)} className="py-2.5">
                <HabitForm habit={h} onDone={() => setEditingId(null)} />
              </li>
            );
          }
          const doneToday = isDone(h, todayIdx);
          const weekDone = h.days.filter((_, i) => i <= todayIdx && isDone(h, i)).length;
          return (
            <li
              key={h.id}
              ref={drag.rowRef(h.id)}
              className={`flex min-h-12 items-center gap-3 py-2 ${
                drag.dragId === h.id ? "relative z-10 bg-raised shadow-sm" : ""
              }`}
            >
              <button
                type="button"
                {...drag.handleProps(h.id)}
                aria-label={`Move ${h.name}: drag, or use the arrow keys`}
                className={`-ml-1 inline-flex h-6 w-6 shrink-0 touch-none items-center justify-center rounded text-muted transition-colors hover:text-text ${
                  drag.dragId === h.id ? "cursor-grabbing" : "cursor-grab"
                }`}
              >
                <Menu size={14} aria-hidden="true" />
              </button>
              {/* 24px target around a 16px glyph (decision #76). */}
              <label className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded">
                <input
                  type="checkbox"
                  checked={doneToday}
                  onChange={() => toggle({ habit: h, day: todayIdx }, doneToday)}
                  className={`h-4 w-4 cursor-pointer ${accentControl.personal}`}
                  aria-label={`${h.name} done today`}
                />
              </label>
              <span className={`min-w-0 flex-1 truncate text-sm ${doneToday ? "text-muted line-through" : "text-text"}`}>
                {h.name}
              </span>
              <span
                role="group"
                aria-label={`${h.name} this week: ${weekDone} of ${todayIdx + 1} days so far`}
                className="flex shrink-0"
              >
                {dates.map((date, i) => {
                  if (i > todayIdx) {
                    return (
                      <span key={date} aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center">
                        <span className="h-3.5 w-3.5 rounded-[3px] border border-dashed border-border" />
                      </span>
                    );
                  }
                  const done = isDone(h, i);
                  return (
                    <button
                      key={date}
                      type="button"
                      aria-pressed={done}
                      aria-label={`${h.name}, ${i === todayIdx ? "today" : DAY_NAMES[i]}`}
                      onClick={() => toggle({ habit: h, day: i }, done)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-raised"
                    >
                      {/* Past days done in ink, today done in the page's rust;
                          a miss is an outline at the control-boundary tone (3.7:1). */}
                      <span
                        className={`h-3.5 w-3.5 rounded-[3px] ${
                          done
                            ? i === todayIdx
                              ? "bg-hub"
                              : "bg-text"
                            : "ring-1 ring-inset ring-border-strong"
                        }`}
                      />
                    </button>
                  );
                })}
              </span>
              <RowAction icon={Pencil} label={`Edit ${h.name}`} onClick={() => setEditingId(h.id)} />
            </li>
          );
        })}
      </ul>

      {addHabit}
    </div>
  );
}
