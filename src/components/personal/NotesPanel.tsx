"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Table } from "@/components/ui/Table";
import { accentControl } from "@/components/ui/accents";
import { utcToZurichLabel } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
import type { Note } from "@/lib/db/notes";

// Notes §7: lightweight inbox — inline add, click to toggle reviewed.
// A simple table, not a PKM.

export function NotesPanel({ notes }: { notes: Note[] }) {
  const router = useRouter();
  const [isAdding, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

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
      body: JSON.stringify({ text: text.trim() }),
    }).catch(() => null);
    if (!res?.ok) {
      setAddError("could not add note");
      return;
    }
    setText("");
    startTransition(() => router.refresh());
  }

  const unreviewed = notes.filter((n) => !valueFor(n, !!n.reviewed));
  const shown = showAll ? notes : unreviewed;

  return (
    <div aria-busy={isPending || isAdding}>
      <div className="mb-2 flex items-center gap-1">
        <FilterPill active={!showAll} onClick={() => setShowAll(false)}>
          To review {unreviewed.length > 0 && `· ${unreviewed.length}`}
        </FilterPill>
        <FilterPill active={showAll} onClick={() => setShowAll(true)}>
          All · {notes.length}
        </FilterPill>
        {(error || addError) && (
          <span role="alert" className="ml-2 text-xs text-danger">
            {error ?? addError}
          </span>
        )}
      </div>

      <Table
        columns={["", "Note", "Added"]}
        empty={showAll ? "no notes — capture something below" : "nothing to review — all caught up"}
      >
        {shown.map((n) => {
          const reviewed = valueFor(n, !!n.reviewed);
          return (
            <tr key={n.id}>
              <td className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={() => toggle(n, reviewed)}
                  className={`h-4 w-4 cursor-pointer ${accentControl.personal}`}
                  aria-label={`reviewed: ${n.text}`}
                />
              </td>
              <td className={`px-3 py-2 ${reviewed ? "text-muted line-through" : ""}`}>{n.text}</td>
              <td className="tabular px-3 py-2 text-xs text-muted">{utcToZurichLabel(n.created_at)}</td>
            </tr>
          );
        })}
      </Table>

      <form onSubmit={add} className="mt-2 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note…"
          id="new-note"
          aria-label="note text"
          aria-invalid={!!addError}
          className="min-w-40 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint"
        />
        <button
          type="submit"
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text transition-colors hover:border-personal/40"
        >
          Add
        </button>
      </form>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
        active
          ? "border-personal/40 bg-personal/10 text-personal"
          : "border-border bg-surface text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
