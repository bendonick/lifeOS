"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { RowAction } from "@/components/ui/RowAction";
import { Table } from "@/components/ui/Table";
import { urgencyText } from "@/components/ui/accents";
import { daysLeftLabel, dueInfo } from "@/lib/dates";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/types";
import type { ProjectWithWork } from "@/lib/db/projects";

/**
 * Projects (docs/03-pages/professional.md §4) — what's being built, as portfolio
 * evidence. The day job is deliberately absent: it has its own section above and
 * listing it here would restate it (decision #31).
 *
 * Four fields, so the editor is an inline row rather than its own form file.
 */
export function ProjectsSection({ projects }: { projects: ProjectWithWork[] }) {
  const router = useRouter();
  const [isSaving, startTransition] = useTransition();
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(payload: ProjectPayload, id?: number): Promise<string | null> {
    const res = await fetch(id ? `/api/projects/${id}` : "/api/projects", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    if (!res?.ok) {
      const message = await res
        ?.json()
        .then((j) => j?.error)
        .catch(() => null);
      return message ?? "could not save the project";
    }
    setEditing(null);
    setAdding(false);
    startTransition(() => router.refresh());
    return null;
  }

  async function remove(project: ProjectWithWork) {
    // Destructive and not undoable from the UI — confirm, and say what survives.
    if (
      !window.confirm(
        `Delete “${project.name}”? Its tasks stay, unfiled — only the project row goes.`
      )
    )
      return;
    setError(null);
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setError(`could not delete “${project.name}”`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div aria-busy={isSaving}>
      {error && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error}
        </p>
      )}

      <Table
        columns={["Project", "Status", "Deadline", "Left", "Open", ""]}
        empty="nothing in flight — add a project below"
        frameless
        rows="cards"
      >
        {projects.map((p) => {
          const info = p.deadline ? dueInfo(p.deadline) : null;
          return (
            <tr key={p.id}>
              <td className="px-3 py-2">
                <Link
                  href={`/professional/projects/${p.id}`}
                  className="rounded text-text hover:text-professional"
                >
                  {p.name}
                </Link>
              </td>
              <td className="px-3 py-2">
                <Pill tone={p.status === "active" ? "professional" : "neutral"}>{p.status}</Pill>
              </td>
              <td
                className={`tabular px-3 py-2 text-xs ${info ? urgencyText[info.urgency] : "text-faint"}`}
              >
                {info?.label ?? "—"}
              </td>
              <td className="tabular px-3 py-2 text-xs">
                {p.deadline ? (
                  <Pill
                    tone={
                      info?.urgency === "overdue"
                        ? "danger"
                        : info?.urgency === "none"
                          ? "neutral"
                          : "warn"
                    }
                  >
                    {daysLeftLabel(p.deadline)}
                  </Pill>
                ) : (
                  <span className="text-faint">—</span>
                )}
              </td>
              <td className="tabular px-3 py-2 text-xs text-muted">
                {p.open_tasks > 0 ? p.open_tasks : <span className="text-faint">—</span>}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <RowAction
                  icon={editing === p.id ? X : Pencil}
                  label={editing === p.id ? `close editor: ${p.name}` : `edit ${p.name}`}
                  expanded={editing === p.id}
                  onClick={() => {
                    setEditing(editing === p.id ? null : p.id);
                    setAdding(false);
                  }}
                />
                <RowAction icon={Trash2} danger label={`delete ${p.name}`} onClick={() => remove(p)} />
              </td>
            </tr>
          );
        })}
      </Table>

      {projects.map(
        (p) =>
          editing === p.id && (
            <div key={p.id} className="mt-3">
              <ProjectRowForm
                project={p}
                submitLabel="Save changes"
                onCancel={() => setEditing(null)}
                onSubmit={(payload) => save(payload, p.id)}
              />
            </div>
          )
      )}

      <div className="mt-3">
        {adding ? (
          <ProjectRowForm
            submitLabel="Add project"
            nameInputId="new-project"
            onCancel={() => setAdding(false)}
            onSubmit={(payload) => save(payload)}
          />
        ) : (
          <button
            type="button"
            id="new-project"
            onClick={() => {
              setAdding(true);
              setEditing(null);
            }}
            className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text hover:border-professional/40"
          >
            + New project
          </button>
        )}
      </div>
    </div>
  );
}

export interface ProjectPayload {
  name: string;
  status: ProjectStatus;
  deadline: string | null;
  notes: string | null;
}

function ProjectRowForm({
  project,
  submitLabel,
  nameInputId,
  onCancel,
  onSubmit,
}: {
  project?: ProjectWithWork;
  submitLabel: string;
  nameInputId?: string;
  onCancel: () => void;
  onSubmit: (payload: ProjectPayload) => Promise<string | null>;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "active");
  const [deadline, setDeadline] = useState(project?.deadline ?? "");
  const [notes, setNotes] = useState(project?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("name the project");
      return;
    }
    setError(null);
    setBusy(true);
    const message = await onSubmit({
      name: name.trim(),
      status,
      deadline: deadline || null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (message) setError(message);
  }

  const field =
    "rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint";

  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      className="rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          id={nameInputId}
          placeholder="Project name"
          aria-label="project name"
          aria-invalid={!!error}
          className={`min-w-40 flex-1 ${field}`}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          aria-label="status"
          className={`w-28 ${field} text-muted`}
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          aria-label="deadline (optional)"
          className={`${field} text-muted`}
        />
      </div>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        aria-label="notes"
        className={`mt-2 w-full ${field}`}
      />
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
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
