"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { accentControl } from "@/components/ui/accents";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
import type { Note } from "@/lib/db/notes";

/**
 * The Reminders rail card (docs/03-pages/academic.md §1) — a lightweight
 * checklist over `notes` filtered to domain=academic, kind=reminder
 * (decision #16: one notes table serves every rail card).
 */
export function RemindersCard({ reminders }: { reminders: Note[] }) {
  const router = useRouter();
  const [isAdding, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const { toggle, valueFor, isPending, error } = useOptimisticToggle<Note>({
    idOf: (n) => n.id,
    labelOf: (n) => n.text,
    send: (n, next) =>
      fetch(`/api/notes/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed: next }),
      }),
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setAddError("write something first");
      return;
    }
    setAddError(null);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), domain: "academic", kind: "reminder" }),
    }).catch(() => null);
    if (!res?.ok) {
      setAddError("could not add");
      return;
    }
    setText("");
    startTransition(() => router.refresh());
  }

  const open = reminders.filter((n) => !valueFor(n, !!n.reviewed));

  return (
    <div
      aria-busy={isPending || isAdding}
      className="rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-academic">
        <span>Reminders</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {open.length === 0 ? "nothing pending" : `${open.length} pending`}
      </p>

      {reminders.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {reminders.map((n) => {
            const done = valueFor(n, !!n.reviewed);
            return (
              <li key={n.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggle(n, done)}
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer ${accentControl.academic}`}
                  aria-label={`done: ${n.text}`}
                />
                <span className={done ? "text-faint line-through" : "text-muted"}>{n.text}</span>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={add} className="mt-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          id="new-reminder"
          placeholder="Add a reminder…"
          aria-label="reminder text"
          aria-invalid={!!addError}
          className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm placeholder:text-faint"
        />
        {(error || addError) && (
          <p role="alert" className="mt-1 text-[11px] text-danger">
            {error ?? addError}
          </p>
        )}
      </form>
    </div>
  );
}
