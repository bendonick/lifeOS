"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { CourseForm, type CoursePayload } from "./CourseForm";
import { Pill } from "@/components/ui/Pill";
import { RowAction } from "@/components/ui/RowAction";
import { Table } from "@/components/ui/Table";
import { scheduleDays } from "@/lib/academic/course";
import { googleEventPlan } from "@/lib/academic/gcal";
import type { Course } from "@/lib/types";

/**
 * Courses gallery + the credits counter (docs/03-pages/academic.md §2). Credits
 * are the only score this system keeps — no grades, no GPA (decision #10).
 */
export function CoursesSection({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(payload: CoursePayload, id?: number): Promise<string | null> {
    const res = await fetch(id ? `/api/courses/${id}` : "/api/courses", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    if (!res?.ok) {
      const message = await res?.json().then((j) => j?.error).catch(() => null);
      return message ?? "could not save the course";
    }
    setAdding(false);
    setEditing(null);
    startTransition(() => router.refresh());
    return null;
  }

  async function remove(course: Course) {
    // Destructive and not undoable from the UI — confirm, and say what survives.
    if (
      !window.confirm(
        `Delete “${course.name}”? Its assignments and exams stay, unfiled, and its materials folder is left on disk.`
      )
    )
      return;
    setError(null);
    const res = await fetch(`/api/courses/${course.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setError(`could not delete “${course.name}”`);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div aria-busy={isRefreshing}>
      {error && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error}
        </p>
      )}

      <Table
        columns={["Course", "Semester", "Credits", "Schedule", "Room", "Professor", "Status", ""]}
        empty="no courses yet — add your first below"
        frameless
        rows="cards"
      >
        {courses.map((c) => (
          <tr key={c.id}>
            <td className="px-3 py-2">
              <Link href={`/academic/courses/${c.id}`} className="rounded text-text transition-colors hover:text-academic">
                {c.name}
              </Link>
            </td>
            <td className="px-3 py-2 text-xs text-muted">{c.semester ?? "—"}</td>
            <td className="tabular px-3 py-2 text-xs text-muted">{c.credits ?? "—"}</td>
            <td className="px-3 py-2">
              <ScheduleCell course={c} />
            </td>
            <td className="px-3 py-2 text-xs text-muted">{c.room ?? "—"}</td>
            <td className="px-3 py-2 text-xs text-muted">
              {c.professor_email ? (
                <a href={`mailto:${c.professor_email}`} className="rounded transition-colors hover:text-text">
                  {c.professor ?? c.professor_email}
                </a>
              ) : (
                (c.professor ?? "—")
              )}
            </td>
            <td className="px-3 py-2">
              <Pill tone={c.status === "enrolled" ? "academic" : "neutral"}>{c.status}</Pill>
            </td>
            <td className="px-3 py-2 text-right whitespace-nowrap">
              <GoogleLink course={c} />
              <RowAction
                icon={editing === c.id ? X : Pencil}
                label={editing === c.id ? `close editor: ${c.name}` : `edit ${c.name}`}
                expanded={editing === c.id}
                onClick={() => {
                  setEditing(editing === c.id ? null : c.id);
                  setAdding(false);
                }}
              />
              <RowAction icon={Trash2} danger label={`delete ${c.name}`} onClick={() => remove(c)} />
            </td>
          </tr>
        ))}
      </Table>

      {courses.map(
        (c) =>
          editing === c.id && (
            <div key={c.id} className="mt-3">
              <CourseForm
                course={c}
                submitLabel="Save changes"
                onCancel={() => setEditing(null)}
                onSubmit={(payload) => save(payload, c.id)}
              />
            </div>
          )
      )}

      <div className="mt-3">
        {adding ? (
          <CourseForm
            submitLabel="Add course"
            nameInputId="new-course"
            onCancel={() => setAdding(false)}
            onSubmit={(payload) => save(payload)}
          />
        ) : (
          <button
            type="button"
            id="new-course"
            onClick={() => {
              setAdding(true);
              setEditing(null);
            }}
            className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text hover:border-academic/40"
          >
            + New course
          </button>
        )}
      </div>
    </div>
  );
}

/** Only for a course that is actually running and has a describable series —
 *  a link that would open a half-empty Google form is worse than no link. */
function GoogleLink({ course }: { course: Course }) {
  if (course.status !== "enrolled") return null;
  const plan = googleEventPlan(course);
  if (!plan) return null;
  return (
    <a
      href={plan.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`Opens Google Calendar with ${plan.summary} prefilled.${
        plan.openEnded ? " No term end is set, so the series will repeat until you give it one." : ""
      } Pick the Academic calendar, then Save.`}
      className="rounded px-1.5 text-xs text-muted hover:text-academic"
    >
      calendar ↗
    </a>
  );
}

function ScheduleCell({ course }: { course: Course }) {
  const days = scheduleDays(course);
  if (!days.length && !course.time_label) return <span className="text-xs text-faint">—</span>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {days.map((d) => (
        <Pill key={d}>{d}</Pill>
      ))}
      {course.start_hour != null && (
        <span className="tabular text-xs text-muted">
          {course.time_label?.replace(days.join(" "), "").trim()}
        </span>
      )}
    </div>
  );
}
