"use client";

import { useState } from "react";
import { NoteForm } from "@/components/personal/NoteForm";
import { Disclosure } from "@/components/ui/Disclosure";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { accentControl } from "@/components/ui/accents";
import { utcToZurichLabel } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
import type { Note } from "@/lib/db/notes";

/**
 * Notes §7: a lightweight inbox, not a PKM.
 *
 * The panel used to render a full-height bordered table whose only content was
 * "nothing to review — all caught up", with an add form open beneath it: the
 * most screen space on the page spent on the least information. An empty inbox
 * is good news and should take one line.
 *
 * Its private pill-tab implementation is gone too — this is one of the four
 * copies the shared `ui/Tabs` was extracted to replace.
 */
export function NotesPanel({ notes }: { notes: Note[] }) {
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

  const unreviewed = notes.filter((n) => !valueFor(n, !!n.reviewed));
  const shown = showAll ? notes : unreviewed;
  const view = showAll ? "all" : "review";

  return (
    <div className="flex flex-col gap-3" aria-busy={isPending}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Tabs
          tabs={[
            { key: "review", label: "To review", count: unreviewed.length },
            { key: "all", label: "All", count: notes.length },
          ]}
          active={view}
          onChange={(v) => setShowAll(v === "all")}
          accent="personal"
          label="note views"
        />
        {error && (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        )}
      </div>

      {shown.length === 0 ? (
        // The calm state, at the size calm deserves.
        <p className="text-sm text-muted">
          {showAll ? "No notes yet." : "All caught up."}
        </p>
      ) : (
        <Table columns={["", "Note", "Added"]} empty="" frameless rows="cards">
          {shown.map((n) => {
            const reviewed = valueFor(n, !!n.reviewed);
            return (
              <tr key={n.id}>
                <td className="w-8 px-3 py-2 align-top">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={() => toggle(n, reviewed)}
                    className={`mt-0.5 h-4 w-4 cursor-pointer ${accentControl.personal}`}
                    aria-label={`reviewed: ${n.text}`}
                  />
                </td>
                <td className={`px-3 py-2 ${reviewed ? "text-muted line-through" : ""}`}>{n.text}</td>
                <td className="tabular px-3 py-2 align-top text-xs text-muted whitespace-nowrap">
                  {utcToZurichLabel(n.created_at)}
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      <Disclosure variant="add" accent="personal" summary="Add note" openSummary="Cancel" anchors={["new-note"]}>
        <NoteForm inputId="new-note" autoFocus />
      </Disclosure>
    </div>
  );
}
