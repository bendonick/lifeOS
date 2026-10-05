"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { CourseForm, type CoursePayload } from "./CourseForm";
import { Pill } from "@/components/ui/Pill";
import { RowAction } from "@/components/ui/RowAction";
import { courseLinkLabel } from "@/lib/academic/course";
import { googleEventPlan } from "@/lib/academic/gcal";
import { groupCourses, type CourseGroup } from "@/lib/academic/semester";
import { WEEKDAYS, type Course, type Weekday } from "@/lib/types";

/**
 * Courses as cards (decision #74), one per course rather than one table row per
 * weekly slot. A card carries four facts and no more — the code and name, the
 * days it meets, each slot's time, and the ways out — because above four a card
 * grid is a table that lost its alignment. Credits are summed once in the tile
 * header; professor, room and email live on the course page.
 *
 * The whole card opens the course (a stretched link under the controls); the
 * per-slot controls sit above it. Credits are the only score this system keeps
 * — no grades, no GPA (decision #10).
 */
export function CoursesSection({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groups = groupCourses(courses);

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
        `Delete “${course.name}” (${course.time_label ?? "no time set"})? Its assignments and exams stay, unfiled, and its materials folder is left on disk.`
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

      {groups.length === 0 ? (
        <p className="py-6 text-center text-xs text-faint">no courses yet — add your first below</p>
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <CourseCard
              key={g.key}
              group={g}
              editing={editing}
              onEdit={(id) => {
                setEditing(editing === id ? null : id);
                setAdding(false);
              }}
              onDelete={remove}
            />
          ))}
        </ul>
      )}

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

const DAY_SHORT: Record<Weekday, string> = { Mon: "Mo", Tue: "Tu", Wed: "We", Thu: "Th", Fri: "Fr" };

function CourseCard({
  group,
  editing,
  onEdit,
  onDelete,
}: {
  group: CourseGroup;
  editing: number | null;
  onEdit: (id: number) => void;
  onDelete: (course: Course) => void;
}) {
  const first = group.slots[0];
  return (
    // Utility spelling of the row-card grammar rather than `.row-card`, because
    // the hover border swap must beat the un-layered class (the Domains-nav
    // precedent in docs/02-design-system.md).
    <li className="relative flex min-w-0 flex-col gap-2 rounded-md border border-border bg-(--color-inset) p-3 transition-colors hover:border-border-strong">
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <Link
          href={`/academic/courses/${first.id}`}
          className="shrink-0 rounded text-sm font-semibold text-text after:absolute after:inset-0 after:rounded-md after:content-['']"
        >
          {group.code}
        </Link>
        <span className="truncate text-xs text-muted" title={group.name}>
          {group.name}
        </span>
        {/* Only a status that is not the default earns a pill — eight "enrolled"
            pills in a row were a column of the same word (decision #60's lesson). */}
        {group.status !== "enrolled" && <Pill>{group.status}</Pill>}
      </div>

      {/* Two-letter days: "T T" for Tuesday and Thursday left position as the
          only cue. 11px is the floor for dense chrome, and these are glyphs in
          a strip rather than prose. */}
      <div
        role="img"
        aria-label={group.days.length ? `meets ${group.days.join(", ")}` : "no days set"}
        className="flex gap-0.5"
      >
        {WEEKDAYS.map((d) => {
          const on = group.days.includes(d);
          return (
            <span
              key={d}
              aria-hidden="true"
              className={`inline-flex h-5 w-6 items-center justify-center rounded text-[11px] ${
                on ? "border border-academic/30 bg-academic/15 font-semibold text-academic" : "text-faint"
              }`}
            >
              {DAY_SHORT[d]}
            </span>
          );
        })}
      </div>

      <ul className="relative z-10 flex flex-col gap-0.5">
        {group.slots.map((slot, i) => (
          <li key={slot.id} className="flex items-center justify-between gap-2">
            <span className="tabular truncate text-xs text-text">{slot.time_label ?? "time not set"}</span>
            <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-faint">
              <GoogleLink course={slot} />
              {i === 0 && group.url && (
                <a
                  href={group.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded px-1 transition-colors hover:text-academic"
                >
                  {courseLinkLabel(group.url)} ↗
                </a>
              )}
              <RowAction
                icon={editing === slot.id ? X : Pencil}
                label={
                  editing === slot.id
                    ? `close editor: ${slot.name} ${slot.time_label ?? ""}`.trim()
                    : `edit ${slot.name} ${slot.time_label ?? ""}`.trim()
                }
                expanded={editing === slot.id}
                onClick={() => onEdit(slot.id)}
              />
              <RowAction
                icon={Trash2}
                danger
                label={`delete ${slot.name} ${slot.time_label ?? ""}`.trim()}
                onClick={() => onDelete(slot)}
              />
            </span>
          </li>
        ))}
      </ul>
    </li>
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
      className="rounded px-1 transition-colors hover:text-academic"
    >
      calendar ↗
    </a>
  );
}
