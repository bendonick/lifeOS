"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Disclosure } from "@/components/ui/Disclosure";
import { accentControl, accentText, type Accent } from "@/components/ui/accents";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
import type { Note } from "@/lib/db/notes";

/**
 * A rail card over the shared `notes` table, filtered to one domain + kind
 * (decision #16: one notes table serves every rail card — Academic "Reminders",
 * Professional "Ideas"). Extracted from RemindersCard in Stage 4 rather than
 * copied, so the two cards can't drift.
 */
export function NotesCard({
  notes,
  domain,
  kind,
  title,
  accent,
  inputId,
  placeholder,
  bare = false,
}: {
  /** No shell and no title of its own: the page's section already has a
   *  heading and a rule (the Maritime Academic page, decision #94). The status
   *  line and the add action then share one row. */
  bare?: boolean;
  notes: Note[];
  domain: string;
  kind: Note["kind"];
  title: string;
  accent: Accent;
  inputId: string;
  placeholder: string;
}) {
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
      body: JSON.stringify({ text: text.trim(), domain, kind }),
    }).catch(() => null);
    if (!res?.ok) {
      setAddError("could not add");
      return;
    }
    setText("");
    startTransition(() => router.refresh());
  }

  const open = notes.filter((n) => !valueFor(n, !!n.reviewed));

  return (
    <div
      aria-busy={isPending || isAdding}
      data-notes-bare={bare ? "" : undefined}
      className={bare ? "" : "rounded-xl border-2 border-border-strong bg-surface p-4"}
    >
      {!bare && (
        <div className={`flex items-center gap-2 text-xs font-medium ${accentText[accent]}`}>
          {/* Theming hook — the editorial theme renders this as a serif title so
              NotesCard sits in a rail of Tiles without looking like a stranger.
              Inert everywhere else. */}
          <span data-card-label="">{title}</span>
        </div>
      )}
      <p className={bare ? "t-serif !font-medium text-base italic text-muted" : "mt-1 text-xs text-muted"}>
        {open.length === 0 ? (bare ? "Nothing pending" : "nothing pending") : `${open.length} pending`}
      </p>

      {notes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {notes.map((n) => {
            const done = valueFor(n, !!n.reviewed);
            return (
              <li key={n.id} className="flex items-start gap-2 text-sm">
                {/* 24px target around the box (decision #76). */}
                <label className="-my-0.5 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggle(n, done)}
                    className={`h-3.5 w-3.5 cursor-pointer ${accentControl[accent]}`}
                    aria-label={`done: ${n.text}`}
                  />
                </label>
                <span className={done ? "text-faint line-through" : "text-muted"}>{n.text}</span>
              </li>
            );
          })}
        </ul>
      )}

      {/* Editing behind intent (#64/#72); the rail Quick-add anchors open it. */}
      <Disclosure
        variant="add"
        accent={accent}
        summary={`Add ${kind}`}
        openSummary="Cancel"
        anchors={[inputId]}
        className="mt-3"
      >
        <form onSubmit={add}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            id={inputId}
            placeholder={placeholder}
            aria-label={`${title} text`}
            aria-invalid={!!addError}
            autoFocus
            className="w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm placeholder:text-faint"
          />
          {(error || addError) && (
            <p role="alert" className="mt-1 text-[11px] text-danger">
              {error ?? addError}
            </p>
          )}
        </form>
      </Disclosure>
    </div>
  );
}
