"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { accentHoverBorder } from "@/components/ui/accents";
import { buttonChrome, inputChrome } from "@/components/ui/controls";
import { useTransientStatus } from "@/lib/useTransientStatus";

/** Inline note capture, lifted out of `NotesPanel` so Quick add and the Notes
 *  tile share one implementation. Still a lightweight inbox, not a PKM. */
export function NoteForm({
  inputId,
  autoFocus = false,
  onAdded,
}: {
  inputId?: string;
  autoFocus?: boolean;
  onAdded?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useTransientStatus();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("write something first");
      return;
    }
    setError(null);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    }).catch(() => null);
    if (!res?.ok) {
      setError("could not add note");
      return;
    }
    setStatus("Note added · it will be waiting on Sunday");
    setText("");
    startTransition(() => router.refresh());
    onAdded?.();
  }

  return (
    <form onSubmit={add} className="flex flex-wrap items-center gap-2" aria-busy={isPending}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a note…"
        id={inputId}
        autoFocus={autoFocus}
        aria-label="note text"
        aria-invalid={!!error}
        className={`min-w-40 flex-1 ${inputChrome}`}
      />
      <button type="submit" className={`${buttonChrome} ${accentHoverBorder.personal}`}>
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
