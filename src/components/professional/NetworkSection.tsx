"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ContactForm, type ContactPayload } from "./ContactForm";
import { Pill } from "@/components/ui/Pill";
import { Table } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { urgencyText } from "@/components/ui/accents";
import { dayLabel } from "@/lib/dates";
import { followupInfo } from "@/lib/professional/followup";
import type { ContactWithFollowup } from "@/lib/db/contacts";
import type { ContactInteraction } from "@/lib/types";

/**
 * Network (docs/03-pages/professional.md §5). Default view is the follow-up
 * queue; "All contacts" is the second view the spec asks for and the only place
 * a contact with no cadence appears.
 *
 * Rows arrive pre-sorted from the server through `followupInfo`, the single owner
 * of queue membership, ordering, label and urgency — so the row shown as overdue
 * is structurally the row sorted first.
 */
type View = "due" | "all";

export function NetworkSection({
  contacts,
  interactions,
}: {
  contacts: ContactWithFollowup[];
  interactions: Record<number, ContactInteraction[]>;
}) {
  const router = useRouter();
  const [isSaving, startTransition] = useTransition();
  const [view, setView] = useState<View>("due");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queue = useMemo(
    () => contacts.filter((c) => followupInfo(c.next_followup, c.followup_interval_days).inQueue),
    [contacts]
  );
  const shown = view === "due" ? queue : contacts;

  async function save(payload: ContactPayload, id?: number): Promise<string | null> {
    const res = await fetch(id ? `/api/contacts/${id}` : "/api/contacts", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    if (!res?.ok) {
      const message = await res
        ?.json()
        .then((j) => j?.error)
        .catch(() => null);
      return message ?? "could not save the contact";
    }
    setEditing(null);
    setAdding(false);
    startTransition(() => router.refresh());
    return null;
  }

  async function remove(contact: ContactWithFollowup) {
    // Destructive and not undoable from the UI — say what goes with it.
    const history =
      contact.interaction_count > 0
        ? ` Its ${contact.interaction_count} logged interaction${contact.interaction_count === 1 ? "" : "s"} go too.`
        : "";
    if (!window.confirm(`Delete “${contact.name}”?${history}`)) return;
    setError(null);
    const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setError(`could not delete “${contact.name}”`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div aria-busy={isSaving}>
      <Tabs
        label="contact views"
        accent="professional"
        active={view}
        onChange={setView}
        tabs={[
          { key: "due", label: "Due for follow-up", count: queue.length },
          { key: "all", label: "All contacts" },
        ]}
      />

      {error && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error}
        </p>
      )}

      <Table
        columns={["Name", "Company", "How met", "Last", "Follow-up", ""]}
        empty={
          view === "due"
            ? "nobody is due — set a cadence on a contact to put them in this queue"
            : "no contacts yet — add the first below"
        }
      >
        {shown.map((c) => {
          const info = followupInfo(c.next_followup, c.followup_interval_days);
          return (
            <tr key={c.id}>
              <td className="px-3 py-2">
                {c.linkedin ? (
                  <a
                    href={c.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="text-text underline decoration-border underline-offset-2 transition-colors hover:decoration-professional"
                  >
                    {c.name} <span aria-hidden="true">↗</span>
                    <span className="sr-only">(opens their LinkedIn in a new tab)</span>
                  </a>
                ) : (
                  c.name
                )}
                {c.role && <div className="text-[11px] text-faint">{c.role}</div>}
              </td>
              <td className="px-3 py-2 text-xs text-muted">{c.company ?? "—"}</td>
              <td className="px-3 py-2">
                {c.how_met ? <Pill>{c.how_met}</Pill> : <span className="text-faint text-xs">—</span>}
              </td>
              <td className="tabular px-3 py-2 text-xs text-muted">
                {c.last_contacted ? dayLabel(c.last_contacted) : <span className="text-faint">—</span>}
              </td>
              <td className={`tabular px-3 py-2 text-xs ${urgencyText[info.urgency]}`}>
                {info.label}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(expanded === c.id ? null : c.id);
                    setEditing(null);
                  }}
                  className="rounded px-1.5 text-xs text-muted hover:text-professional"
                >
                  {expanded === c.id ? "close" : "log"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(editing === c.id ? null : c.id);
                    setExpanded(null);
                    setAdding(false);
                  }}
                  className="rounded px-1.5 text-xs text-muted hover:text-text"
                >
                  {editing === c.id ? "close" : "edit"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  className="rounded px-1.5 text-xs text-muted hover:text-danger"
                >
                  delete
                </button>
              </td>
            </tr>
          );
        })}
      </Table>

      {shown.map((c) =>
        expanded === c.id ? (
          <div key={`log-${c.id}`} className="mt-3">
            <InteractionPanel
              contact={c}
              history={interactions[c.id] ?? []}
              onLogged={() => startTransition(() => router.refresh())}
            />
          </div>
        ) : editing === c.id ? (
          <div key={`edit-${c.id}`} className="mt-3">
            <ContactForm
              contact={c}
              submitLabel="Save changes"
              onCancel={() => setEditing(null)}
              onSubmit={(payload) => save(payload, c.id)}
            />
          </div>
        ) : null
      )}

      <div className="mt-3">
        {adding ? (
          <ContactForm
            submitLabel="Add contact"
            nameInputId="new-contact"
            onCancel={() => setAdding(false)}
            onSubmit={(payload) => save(payload)}
          />
        ) : (
          <button
            type="button"
            id="new-contact"
            onClick={() => {
              setAdding(true);
              setEditing(null);
              setExpanded(null);
            }}
            className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text hover:border-professional/40"
          >
            + New contact
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Log an interaction and show what's already been logged (decision #30). Writing
 * a row advances `last_contacted`, so the queue reshuffles under the panel — but
 * back-dating only records history: it never drags the contact back into overdue.
 */
function InteractionPanel({
  contact,
  history,
  onLogged,
}: {
  contact: ContactWithFollowup;
  history: ContactInteraction[];
  onLogged: () => void;
}) {
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function log(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/contacts/${contact.id}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: date || null, note: note.trim() || null }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError("could not log that — try again");
      return;
    }
    setNote("");
    setDate("");
    onLogged();
  }

  const field =
    "rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint";

  return (
    <div aria-busy={busy} className="rounded-lg border border-border bg-surface p-4">
      <h3 className="text-xs font-medium text-professional">Log an interaction · {contact.name}</h3>
      <form onSubmit={log} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What happened? (optional)"
          aria-label="interaction note"
          className={`min-w-40 flex-1 ${field}`}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="date (defaults to today)"
          title="Defaults to today. Back-dating records the history without moving the follow-up date."
          className={`${field} text-muted`}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text hover:border-professional/40"
        >
          Log
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}

      {history.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
          {history.map((h) => (
            <li key={h.id} className="flex gap-3 text-xs">
              <span className="tabular w-24 shrink-0 text-faint">{dayLabel(h.date)}</span>
              <span className="text-muted">{h.note ?? "—"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
