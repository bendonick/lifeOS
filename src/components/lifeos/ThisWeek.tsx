"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pill, TypePill } from "@/components/ui/Pill";
import { Table } from "@/components/ui/Table";
import { dueInfo } from "@/lib/dates";
import { DOMAINS, type Domain, type Task } from "@/lib/types";

// Reads arrive as props from the server page; every mutation goes through the API
// routes, then router.refresh() re-reads server truth. The client never owns data.

const urgencyClass = { overdue: "text-danger", today: "text-warn", soon: "text-warn", none: "text-muted" };

export function ThisWeek({ tasks, today }: { tasks: Task[]; today: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<Domain>("personal");
  const [due, setDue] = useState(today);

  async function toggleDone(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    startTransition(() => router.refresh());
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), domain, due: due || null }),
    });
    setTitle("");
    startTransition(() => router.refresh());
  }

  return (
    <div className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <Table
        columns={["", "Task", "Domain", "Type", "Due"]}
        empty="nothing due this week — add a task below or enjoy the quiet"
      >
        {tasks.map((t) => {
          const info = t.due ? dueInfo(t.due) : null;
          return (
            <tr key={t.id} className="group">
              <td className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={!!t.done}
                  onChange={() => toggleDone(t)}
                  className="h-4 w-4 cursor-pointer accent-[#3ecf8e]"
                  aria-label={`done: ${t.title}`}
                />
              </td>
              <td className="px-3 py-2">{t.title}</td>
              <td className="px-3 py-2">
                <Pill tone={t.domain}>{t.domain}</Pill>
              </td>
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
          className="min-w-40 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint focus:border-hub/50 focus:outline-none"
        />
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value as Domain)}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted focus:outline-none"
        >
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted [color-scheme:dark] focus:outline-none"
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
