"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Table } from "@/components/ui/Table";
import { utcToZurichLabel } from "@/lib/dates";
import type { Note } from "@/lib/db/notes";

// Notes §7: lightweight inbox — inline add, click to toggle reviewed.
// A simple table, not a PKM.

export function NotesPanel({ notes }: { notes: Note[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState("");

  async function toggleReviewed(note: Note) {
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewed: !note.reviewed }),
    });
    startTransition(() => router.refresh());
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });
    setText("");
    startTransition(() => router.refresh());
  }

  return (
    <div className={isPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <Table columns={["", "Note", "Added"]} empty="no notes — capture something below">
        {notes.map((n) => (
          <tr key={n.id}>
            <td className="w-8 px-3 py-2">
              <input
                type="checkbox"
                checked={!!n.reviewed}
                onChange={() => toggleReviewed(n)}
                className="h-4 w-4 cursor-pointer accent-[#a78bfa]"
                aria-label={`reviewed: ${n.text}`}
              />
            </td>
            <td className={`px-3 py-2 ${n.reviewed ? "text-muted line-through" : ""}`}>{n.text}</td>
            <td className="tabular px-3 py-2 text-xs text-faint">{utcToZurichLabel(n.created_at)}</td>
          </tr>
        ))}
      </Table>
      <form onSubmit={add} className="mt-2 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note…"
          className="min-w-40 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint focus:border-personal/50 focus:outline-none"
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
