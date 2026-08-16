"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * The project's `notes` column — one text field, not a note feed. `notes` rows
 * carry a domain and kind but no project_id, so a real per-project feed is a
 * schema change; it's logged in BACKLOG rather than smuggled in here.
 */
export function ProjectNotes({ projectId, notes }: { projectId: number; notes: string | null }) {
  const router = useRouter();
  const [isSaving, startTransition] = useTransition();
  const [text, setText] = useState(notes ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const dirty = text !== (notes ?? "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: text }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setFailed(true);
      setMessage("could not save — try again");
      return;
    }
    setFailed(false);
    setMessage("saved");
    startTransition(() => router.refresh());
  }

  return (
    <form onSubmit={save} aria-busy={busy || isSaving}>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setMessage(null);
        }}
        rows={4}
        aria-label="project notes"
        placeholder="What this project is, where it stands, what's next…"
        className="w-full rounded-lg border border-border bg-surface p-4 text-sm placeholder:text-faint"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !dirty}
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text hover:border-professional/40 disabled:text-muted"
        >
          Save notes
        </button>
        {message && (
          <span role={failed ? "alert" : "status"} className={`text-xs ${failed ? "text-danger" : "text-muted"}`}>
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
