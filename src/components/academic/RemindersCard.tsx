import { NotesCard } from "@/components/notes/NotesCard";
import type { Note } from "@/lib/db/notes";

/**
 * The Reminders rail card (docs/03-pages/academic.md §1). Thin wrapper over the
 * shared NotesCard so /academic keeps a zero-line diff — the generalisation
 * happened in Stage 4 and Academic must not have to change to benefit from it.
 */
export function RemindersCard({ reminders }: { reminders: Note[] }) {
  return (
    <NotesCard
      notes={reminders}
      domain="academic"
      kind="reminder"
      title="Reminders"
      accent="academic"
      inputId="new-reminder"
      placeholder="Add a reminder…"
    />
  );
}
