"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pill, TypePill } from "@/components/ui/Pill";
import { Table } from "@/components/ui/Table";
import { accentControl, type Accent } from "@/components/ui/accents";
import { dueInfo } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
import { DOMAINS, type Domain, type Task } from "@/lib/types";

// Reads arrive as props from the server page; every mutation goes through the API
// routes, then router.refresh() re-reads server truth. The client never owns data.

const urgencyClass = { overdue: "text-danger", today: "text-warn", soon: "text-warn", none: "text-muted" };

export function ThisWeek({
  tasks,
  today,
  fixedDomain,
  accent = "hub",
}: {
  tasks: Task[];
  today: string;
  /** On a domain page the list is pre-filtered — fix the domain, and the
   *  redundant Domain column + select disappear. */
  fixedDomain?: Domain;
  /** Control tint. Defaults to the domain-less hub; a domain page passes its own
   *  so Personal doesn't render Academic-green checkboxes. */
  accent?: Accent;
}) {
  const router = useRouter();
  const [isAdding, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<Domain>(fixedDomain ?? "personal");
  const [due, setDue] = useState(today);
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

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setAddError("enter a title");
      return;
    }
    setAddError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), domain, due: due || null }),
    }).catch(() => null);
    if (!res?.ok) {
      setAddError("could not add task");
      return;
    }
    setTitle("");
    startTransition(() => router.refresh());
  }

  const busy = isPending || isAdding;

  return (
    <div aria-busy={busy}>
      {(error || addError) && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error ?? addError}
        </p>
      )}
      <Table
        columns={fixedDomain ? ["", "Task", "Type", "Due"] : ["", "Task", "Domain", "Type", "Due"]}
        empty="nothing due this week — add a task below or enjoy the quiet"
      >
        {tasks.map((t) => {
          const info = t.due ? dueInfo(t.due) : null;
          const done = valueFor(t, !!t.done);
          return (
            <tr key={t.id} className="group">
              <td className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggle(t, done)}
                  className={`h-4 w-4 cursor-pointer ${accentControl[accent]}`}
                  aria-label={`done: ${t.title}`}
                />
              </td>
              <td className={`px-3 py-2 ${done ? "text-muted line-through" : ""}`}>{t.title}</td>
              {!fixedDomain && (
                <td className="px-3 py-2">
                  <Pill tone={t.domain}>{t.domain}</Pill>
                </td>
              )}
              <td className="px-3 py-2">
                <TypePill type={t.type} />
              </td>
              <td className={`tabular px-3 py-2 text-xs ${info ? urgencyClass[info.urgency] : "text-faint"}`}>
                {info?.label ?? "—"}
              </td>
            </tr>
          );
        })}
      </Table>

      <form onSubmit={addTask} className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          id="new-task"
          aria-label="task title"
          aria-invalid={!!addError}
          className="min-w-40 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint"
        />
        {!fixedDomain && (
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value as Domain)}
            aria-label="domain"
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
          >
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="due date"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
        />
        <button
          type="submit"
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text transition-colors hover:border-hub/40"
        >
          Add
        </button>
      </form>
    </div>
  );
}
