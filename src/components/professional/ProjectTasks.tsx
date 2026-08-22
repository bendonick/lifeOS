"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pill, TypePill } from "@/components/ui/Pill";
import { Table } from "@/components/ui/Table";
import { accentControl, urgencyText } from "@/components/ui/accents";
import { daysLeftLabel, dueInfo } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
import type { Task, TaskType } from "@/lib/types";

/**
 * Open work for one project, soonest first (docs/03-pages/professional.md §2).
 * Used twice: the day-job section on /professional and the project detail page —
 * the same rows from the same store (decision #9), filtered by project_id.
 *
 * Deliberately not AcademicTasks: that carries six view tabs, course grouping and
 * exam mode, and generalising it would put a finished, verified page at risk on
 * every Stage 4 change. What's shared is what matters — Table, TypePill, the
 * optimistic toggle, and dueInfo/urgencyText as the single owner of due colour.
 */
export function ProjectTasks({
  projectId,
  tasks,
  inputId,
  empty,
  frameless = false,
}: {
  projectId: number;
  tasks: Task[];
  inputId: string;
  empty: string;
  /** Inside a Tile the tile is the border (#65); the detail page keeps the frame. */
  frameless?: boolean;
}) {
  const router = useRouter();
  const [isAdding, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("task");
  const [due, setDue] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const { toggle, valueFor, isPending, error } = useOptimisticToggle<Task>({
    idOf: (t) => t.id,
    labelOf: (t) => t.title,
    send: (t, next) =>
      fetch(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      }),
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setAddError("enter a title");
      return;
    }
    setAddError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        domain: "professional",
        type,
        due: due || null,
        project_id: projectId,
      }),
    }).catch(() => null);
    if (!res?.ok) {
      setAddError("could not save — try again");
      return;
    }
    setTitle("");
    setDue("");
    startTransition(() => router.refresh());
  }

  return (
    <div aria-busy={isPending || isAdding}>
      {(error || addError) && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error ?? addError}
        </p>
      )}

      <Table columns={["", "Task", "Due", "Left"]} empty={empty} frameless={frameless}>
        {tasks.map((t) => {
          const done = valueFor(t, !!t.done);
          const info = t.due ? dueInfo(t.due) : null;
          return (
            <tr key={t.id}>
              <td className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggle(t, done)}
                  className={`h-4 w-4 cursor-pointer ${accentControl.professional}`}
                  aria-label={`done: ${t.title}`}
                />
              </td>
              <td className={`px-3 py-2 ${done ? "text-muted line-through" : ""}`}>
                <span className="align-middle">{t.title}</span>
                {/* Almost everything here is a plain task; a column repeating
                    "task" on every row is chrome, so the pill shows only when
                    the type actually says something. */}
                {t.type !== "task" && (
                  <span className="ml-2 align-middle">
                    <TypePill type={t.type} />
                  </span>
                )}
              </td>
              <td
                className={`tabular px-3 py-2 text-xs ${
                  info && !done ? urgencyText[info.urgency] : "text-faint"
                }`}
              >
                {info?.label ?? "—"}
              </td>
              <td className="tabular px-3 py-2 text-xs">
                {t.due && !done ? (
                  <Pill
                    tone={
                      info?.urgency === "overdue"
                        ? "danger"
                        : info?.urgency === "none"
                          ? "neutral"
                          : "warn"
                    }
                  >
                    {daysLeftLabel(t.due)}
                  </Pill>
                ) : (
                  <span className="text-faint">—</span>
                )}
              </td>
            </tr>
          );
        })}
      </Table>

      <form onSubmit={add} className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          id={inputId}
          placeholder="Add a task…"
          aria-label="task title"
          aria-invalid={!!addError}
          className="min-w-40 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TaskType)}
          aria-label="type"
          className="w-28 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
        >
          <option value="task">task</option>
          <option value="meeting">meeting</option>
        </select>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="due date (optional)"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
        />
        <button
          type="submit"
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text hover:border-professional/40"
        >
          Add
        </button>
      </form>
    </div>
  );
}
