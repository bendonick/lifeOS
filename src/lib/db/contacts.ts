import { db } from "@/lib/db";
import { followupInfo, nextFollowup } from "@/lib/professional/followup";
import type { Contact, ContactInteraction } from "@/lib/types";

/** A contact carrying its computed follow-up date, so tables don't recompute per cell. */
export interface ContactWithFollowup extends Contact {
  next_followup: string | null;
  interaction_count: number;
}

/**
 * Every contact, ordered by the follow-up queue: never-contacted first, then
 * soonest due, with contacts that have no cadence sinking to the bottom.
 * Sorted in TypeScript through the same helper that renders the row, so the row
 * shown as overdue is structurally the row sorted first (one owner).
 */
export function contactsWithFollowup(): ContactWithFollowup[] {
  const rows = db
    .prepare(
      `SELECT contacts.*,
              (SELECT COUNT(*) FROM contact_interactions ci WHERE ci.contact_id = contacts.id)
                AS interaction_count
       FROM contacts`
    )
    .all() as Array<Contact & { interaction_count: number }>;

  return rows
    .map((row) => ({
      ...row,
      next_followup: nextFollowup(row.last_contacted, row.followup_interval_days),
    }))
    .sort((a, b) => {
      const ka = followupInfo(a.next_followup, a.followup_interval_days).sortKey;
      const kb = followupInfo(b.next_followup, b.followup_interval_days).sortKey;
      return ka === kb ? a.name.localeCompare(b.name) : ka < kb ? -1 : 1;
    });
}

export function contactById(id: number): ContactWithFollowup | undefined {
  return contactsWithFollowup().find((c) => c.id === id);
}

export function contactExists(id: number): boolean {
  return db.prepare("SELECT 1 FROM contacts WHERE id = ?").get(id) !== undefined;
}

/** Whole history in one query, grouped here — never one query per rendered row. */
export function interactionsByContact(): Record<number, ContactInteraction[]> {
  const rows = db
    .prepare("SELECT * FROM contact_interactions ORDER BY date DESC, id DESC")
    .all() as ContactInteraction[];
  const grouped: Record<number, ContactInteraction[]> = {};
  for (const row of rows) (grouped[row.contact_id] ??= []).push(row);
  return grouped;
}

export interface ContactInput {
  name: string;
  company?: string | null;
  role?: string | null;
  how_met?: string | null;
  linkedin?: string | null;
  last_contacted?: string | null;
  followup_interval_days?: number | null;
  notes?: string | null;
}

export function createContact(input: ContactInput): ContactWithFollowup {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO contacts
        (name, company, role, how_met, linkedin, last_contacted, followup_interval_days, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.company ?? null,
      input.role ?? null,
      input.how_met ?? null,
      input.linkedin ?? null,
      input.last_contacted ?? null,
      input.followup_interval_days ?? null,
      input.notes ?? null
    );
  return contactById(Number(lastInsertRowid))!;
}

export function updateContact(
  id: number,
  patch: Partial<
    Pick<
      Contact,
      "name" | "company" | "role" | "how_met" | "linkedin" | "last_contacted"
      | "followup_interval_days" | "notes"
    >
  >
): ContactWithFollowup | undefined {
  if (!contactExists(id)) return undefined;
  const fields = Object.keys(patch) as (keyof typeof patch)[];
  if (fields.length > 0) {
    const set = fields.map((f) => `${f} = ?`).join(", ");
    db.prepare(`UPDATE contacts SET ${set} WHERE id = ?`).run(...fields.map((f) => patch[f]), id);
  }
  return contactById(id);
}

/** Interaction history cascades (schema ON DELETE CASCADE) — the confirm text must say so. */
export function deleteContact(id: number): boolean {
  return db.prepare("DELETE FROM contacts WHERE id = ?").run(id).changes > 0;
}

/**
 * Log an interaction and advance the queue in one transaction (decision #30).
 *
 * The MAX is load-bearing: back-dating an interaction records the history but must
 * never drag `last_contacted` backwards and pull the contact into the overdue block.
 * ISO 'YYYY-MM-DD' compares lexicographically, so no date functions are needed.
 */
export function logInteraction(
  contactId: number,
  input: { date: string; note?: string | null }
): ContactWithFollowup | undefined {
  if (!contactExists(contactId)) return undefined;
  db.transaction(() => {
    db.prepare("INSERT INTO contact_interactions (contact_id, date, note) VALUES (?, ?, ?)").run(
      contactId,
      input.date,
      input.note ?? null
    );
    db.prepare(
      "UPDATE contacts SET last_contacted = MAX(COALESCE(last_contacted, ?), ?) WHERE id = ?"
    ).run(input.date, input.date, contactId);
  })();
  return contactById(contactId);
}
