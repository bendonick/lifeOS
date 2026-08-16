"use client";

import { useState } from "react";
import { HOW_MET, type Contact } from "@/lib/types";

export interface ContactPayload {
  name: string;
  company: string | null;
  role: string | null;
  how_met: string | null;
  linkedin: string | null;
  last_contacted: string | null;
  followup_interval_days: number | null;
  notes: string | null;
}

/** The default cadence is visible and editable rather than hidden: a contact with
 *  no interval never enters the follow-up queue, and inventing one silently would
 *  be the system deciding who you owe a message. */
const DEFAULT_INTERVAL = "90";

export function ContactForm({
  contact,
  submitLabel,
  nameInputId,
  onCancel,
  onSubmit,
}: {
  contact?: Contact;
  submitLabel: string;
  nameInputId?: string;
  onCancel: () => void;
  onSubmit: (payload: ContactPayload) => Promise<string | null>;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [company, setCompany] = useState(contact?.company ?? "");
  const [role, setRole] = useState(contact?.role ?? "");
  const [howMet, setHowMet] = useState(contact?.how_met ?? "");
  const [linkedin, setLinkedin] = useState(contact?.linkedin ?? "");
  const [lastContacted, setLastContacted] = useState(contact?.last_contacted ?? "");
  const [interval, setInterval] = useState(
    contact ? (contact.followup_interval_days?.toString() ?? "") : DEFAULT_INTERVAL
  );
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("name the contact");
      return;
    }
    if (interval.trim() && !(Number(interval) > 0 && Number.isInteger(Number(interval)))) {
      setError("follow-up interval must be a whole number of days");
      return;
    }
    setError(null);
    setBusy(true);
    const message = await onSubmit({
      name: name.trim(),
      company: company.trim() || null,
      role: role.trim() || null,
      how_met: howMet || null,
      linkedin: linkedin.trim() || null,
      last_contacted: lastContacted || null,
      followup_interval_days: interval.trim() ? Number(interval) : null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (message) setError(message);
  }

  const field =
    "w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint";

  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      className="rounded-lg border border-border bg-surface p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Labelled label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            id={nameInputId}
            aria-invalid={!!error && !name.trim()}
            className={field}
          />
        </Labelled>
        <Labelled label="Company">
          <input value={company} onChange={(e) => setCompany(e.target.value)} className={field} />
        </Labelled>
        <Labelled label="Role">
          <input value={role} onChange={(e) => setRole(e.target.value)} className={field} />
        </Labelled>
        <Labelled label="How met">
          {/* Open TEXT in the schema — these five are offered, not enforced. */}
          <select
            value={howMet}
            onChange={(e) => setHowMet(e.target.value)}
            className={`${field} text-muted`}
          >
            <option value="">—</option>
            {HOW_MET.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled label="LinkedIn">
          <input
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://…"
            className={field}
          />
        </Labelled>
        <Labelled label="Last contacted">
          <input
            type="date"
            value={lastContacted}
            onChange={(e) => setLastContacted(e.target.value)}
            className={`${field} text-muted`}
          />
        </Labelled>
        <Labelled label="Follow up every (days)">
          <input
            type="number"
            min={1}
            step={1}
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            placeholder="leave blank for no cadence"
            className={`${field} tabular text-muted`}
          />
        </Labelled>
        <div className="sm:col-span-2 lg:col-span-2">
          <Labelled label="Notes">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
          </Labelled>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text hover:border-professional/40"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-text"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted">{label}</span>
      {children}
    </label>
  );
}
