import { NotesCard } from "@/components/notes/NotesCard";
import type { Accent } from "@/components/ui/accents";
import type { Note } from "@/lib/db/notes";

/**
 * The Reminders rail card (docs/03-pages/academic.md §1). Thin wrapper over the
 * shared NotesCard so /academic keeps a zero-line diff — the generalisation
 * happened in Stage 4 and Academic must not have to change to benefit from it.
 */
export function RemindersCard({
  reminders,
  accent = "academic",
  bare = false,
}: {
  /** Forwarded to NotesCard: no shell or title when the page supplies them. */
  bare?: boolean;
  reminders: Note[];
  /** Rail placements pass the rail's accent; the default keeps every existing
   *  caller's rendering identical. */
  accent?: Accent;
}) {
  return (
    <NotesCard
      notes={reminders}
      domain="academic"
      kind="reminder"
      title="Reminders"
      accent={accent}
      inputId="new-reminder"
      placeholder="Add a reminder…"
      bare={bare}
    />
  );
}
