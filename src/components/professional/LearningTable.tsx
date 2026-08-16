"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { dayLabel } from "@/lib/dates";
import { Pill } from "@/components/ui/Pill";
import { Table } from "@/components/ui/Table";
import {
  LEARNING_STATUSES,
  LEARNING_STATUS_LABEL,
  LEARNING_TYPES,
  type LearningItem,
  type LearningStatus,
  type LearningType,
} from "@/lib/types";

/**
 * AI / RL concepts (docs/03-pages/professional.md §3). Starts empty by design —
 * the user fills it. Shape confirmed with him 2026-08-17: topic, date, link to
 * external material, and a status marker in his words ("not learned / learning /
 * learned"), which LEARNING_STATUS_LABEL owns so no surface re-words it.
 *
 * Both dates stay hand-editable; flipping the status only stamps a date that is
 * still empty (see updateLearningItem), so the common path needs no typing.
 * No view tabs: a tab that shows the same rows is chrome pretending to be a control.
 */
export function LearningTable({ items }: { items: LearningItem[] }) {
  const router = useRouter();
  const [isSaving, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<LearningType>("concept");
  const [link, setLink] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<LearningStatus>("queued");
  const [addError, setAddError] = useState<string | null>(null);

  async function patch(id: number, body: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/learning/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) {
      setError("could not save — try again");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setAddError("name the topic");
      return;
    }
    setAddError(null);
    const res = await fetch("/api/learning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        type,
        status,
        link: link.trim() || null,
        // One date field on the form: it means "finished" once the topic is
        // already learned, and "started" in every other state.
        started: status === "done" ? null : date || null,
        completed: status === "done" ? date || null : null,
      }),
    }).catch(() => null);
    if (!res?.ok) {
      setAddError("could not save — try again");
      return;
    }
    setName("");
    setLink("");
    setDate("");
    startTransition(() => router.refresh());
  }

  return (
    <div aria-busy={isSaving}>
      {(error || addError) && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error ?? addError}
        </p>
      )}

      <Table
        columns={["Topic", "Type", "Status", "Started", "Learned"]}
        empty="nothing here yet — add the first topic below"
      >
        {items.map((item) => (
          <tr key={item.id}>
            <td className="px-3 py-2">
              {item.link ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-text underline decoration-border underline-offset-2 transition-colors hover:decoration-professional"
                >
                  {item.name} <span aria-hidden="true">↗</span>
                  <span className="sr-only">(opens the material in a new tab)</span>
                </a>
              ) : (
                item.name
              )}
            </td>
            <td className="px-3 py-2">
              <Pill>{item.type}</Pill>
            </td>
            <td className="px-3 py-2">
              <select
                value={item.status}
                onChange={(e) => patch(item.id, { status: e.target.value })}
                aria-label={`status: ${item.name}`}
                className="w-32 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted"
              >
                {LEARNING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {LEARNING_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </td>
            <DateCell
              value={item.started}
              label={`started: ${item.name}`}
              onSave={(v) => patch(item.id, { started: v })}
            />
            <DateCell
              value={item.completed}
              label={`learned: ${item.name}`}
              onSave={(v) => patch(item.id, { completed: v })}
            />
          </tr>
        ))}
      </Table>

      <form onSubmit={add} className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          id="new-learning"
          placeholder="Add a topic…"
          aria-label="topic"
          aria-invalid={!!addError}
          className="min-w-40 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as LearningType)}
          aria-label="type"
          className="w-28 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
        >
          {LEARNING_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link (optional)"
          aria-label="link to material (optional)"
          className="w-40 rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="date (optional)"
          title="Optional — the day you started, or the day you learned it"
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LearningStatus)}
          aria-label="status"
          className="w-32 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
        >
          {LEARNING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEARNING_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text hover:border-professional/40"
        >
          Add
        </button>
      </form>
    </div>
  );
}

/**
 * Click-to-edit date cell. Six permanent date inputs turned the table into a
 * form — every other table in this system renders text and puts the control
 * behind an action (BudgetTable swaps a cell for its editor the same way), and
 * an empty date showed as a "mm/dd/yyyy" placeholder on nearly every row.
 */
function DateCell({
  value,
  label,
  onSave,
}: {
  value: string | null;
  label: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <td className="px-3 py-2">
        <input
          type="date"
          autoFocus
          defaultValue={value ?? ""}
          aria-label={label}
          onBlur={(e) => {
            setEditing(false);
            if (e.target.value !== (value ?? "")) onSave(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="tabular rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted"
        />
      </td>
    );
  }

  return (
    <td className="px-3 py-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`${label} — ${value ? dayLabel(value) : "not set"}, click to edit`}
        className={`tabular rounded text-xs ${value ? "text-muted" : "text-faint"} hover:text-text`}
      >
        {value ? dayLabel(value) : "—"}
      </button>
    </td>
  );
}
