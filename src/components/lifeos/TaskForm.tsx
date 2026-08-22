"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { accentHoverBorder, type Accent } from "@/components/ui/accents";
import { buttonChrome, fieldChrome, inputChrome, selectChrome } from "@/components/ui/controls";
import { useTransientStatus } from "@/lib/useTransientStatus";
import { DOMAINS, type Domain } from "@/lib/types";

/**
 * Adding a task or an appointment. Lifted out of `ThisWeek` so the Schedule
 * tile and the Quick add menu render the *same* component rather than two
 * copies that drift — the page already learned that lesson with four private
 * pill-tab implementations.
 *
 * A time makes the row an appointment (decision #60); that is the only thing
 * distinguishing the two, so the time field is the one that matters here.
 */
export function TaskForm({
  today,
  fixedDomain,
  accent = "hub",
  inputId,
  autoFocus = false,
  onAdded,
}: {
  today: string;
  /** On a domain page the domain is fixed and its select disappears. */
  fixedDomain?: Domain;
  accent?: Accent;
  /** Anchor id for the title input — only the on-page instance claims it, or
   *  two copies would answer to the same `#new-task`. */
  inputId?: string;
  autoFocus?: boolean;
  onAdded?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState<Domain>(fixedDomain ?? "personal");
  const [due, setDue] = useState(today);
  const [dueTime, setDueTime] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useTransientStatus();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("enter a title");
      return;
    }
    // A time with no date has nothing to hang on — say so rather than dropping
    // it, which is what silently sending `due: null` would amount to.
    if (dueTime && !due) {
      setError("pick a date for that time");
      return;
    }
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        domain,
        due: due ? (dueTime ? `${due}T${dueTime}` : due) : null,
        notes: details.trim() || null,
      }),
    }).catch(() => null);
    if (!res?.ok) {
      setError("could not add task");
      return;
    }
    setStatus(dueTime ? `Added “${title.trim()}” · ${due} ${dueTime}` : `Added “${title.trim()}”`);
    setTitle("");
    setDueTime("");
    setDetails("");
    startTransition(() => router.refresh());
    onAdded?.();
  }

  return (
    <form onSubmit={add} className="flex flex-wrap items-center gap-2" aria-busy={isPending}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        id={inputId}
        autoFocus={autoFocus}
        aria-label="task title"
        aria-invalid={!!error && !title.trim()}
        className={`min-w-40 flex-1 ${inputChrome}`}
      />
      {!fixedDomain && (
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value as Domain)}
          aria-label="domain"
          className={selectChrome}
        >
          {DOMAINS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      )}
      {/* Date and time wrap as a pair — a haircut at 10:00 should never end up
          on a different line from the day it falls on. */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="due date"
          aria-invalid={!!error && !!dueTime && !due}
          className={fieldChrome}
        />
        <input
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          aria-label="time (optional)"
          title="Optional — a time makes it an appointment, and offers the hand-off to Google Calendar"
          className={`w-28 ${fieldChrome}`}
        />
      </div>
      <input
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Details…"
        aria-label="details (optional)"
        title="Optional — an address, a room, anything worth having on the row. It travels to Google as the event's location."
        className={`min-w-32 flex-1 ${inputChrome}`}
      />
      <button type="submit" className={`${buttonChrome} ${accentHoverBorder[accent]}`}>
        Add
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
      {status && !error && (
        <span role="status" className="text-xs text-muted">
          {status}
        </span>
      )}
    </form>
  );
}
