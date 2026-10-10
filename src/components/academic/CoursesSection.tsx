"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { CourseForm, type CoursePayload } from "./CourseForm";
import { AnchoredForm } from "@/components/ui/AnchoredForm";
import { Pill } from "@/components/ui/Pill";
import { RowAction } from "@/components/ui/RowAction";
import { courseLinkLabel, scheduleDays } from "@/lib/academic/course";
import { googleEventPlan } from "@/lib/academic/gcal";
import { groupCourses, type CourseGroup } from "@/lib/academic/semester";
import { dayLabel } from "@/lib/dates";
import { WEEKDAYS, type Course, type Weekday } from "@/lib/types";

/**
 * Courses as compact rows (decision #80): the code, the full name and a
 * chevron, two columns on desktop. Expanding a row reveals what the old cards
 * carried at rest — every slot's days and time with its calendar link, edit and
 * delete; credits, semester, professor, room, term; the OLAT page; the way to
 * the course page. One course per row even when it is stored as two slots
 * (decision #77). Credits are the only score this system keeps — no grades, no
 * GPA (decision #10).
 *
 * The add form has no button here: the page's `+ Add` menu opens it by hash.
 */
export function CoursesSection({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [editing, setEditing] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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

  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div aria-busy={isRefreshing}>
      {error && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error}
        </p>
      )}

      {groups.length === 0 ? (
        <p className="py-6 text-center text-xs text-faint">no courses yet</p>
      ) : (
        // Explicit tracks: an implicit `auto` column sizes to the longest course
        // name and pushed the page 2px wide at phone width.
        <ul className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {groups.map((g) => (
            <CourseRow
              key={g.key}
              group={g}
              open={expanded.has(g.key)}
              onToggle={() => toggle(g.key)}
              editing={editing}
              onEdit={(id) => setEditing(editing === id ? null : id)}
              onDelete={remove}
              onSave={save}
            />
          ))}
        </ul>
      )}

      <AnchoredForm anchor="new-course">
        {(close) => (
          <CourseForm submitLabel="Add course" nameInputId="new-course" onCancel={close} onSubmit={(payload) => save(payload)} />
        )}
      </AnchoredForm>
    </div>
  );
}

const DAY_SHORT: Record<Weekday, string> = { Mon: "Mo", Tue: "Tu", Wed: "We", Thu: "Th", Fri: "Fr" };

function CourseRow({
  group,
  open,
  onToggle,
  editing,
  onEdit,
  onDelete,
  onSave,
}: {
  group: CourseGroup;
  open: boolean;
  onToggle: () => void;
  editing: number | null;
  onEdit: (id: number) => void;
  onDelete: (course: Course) => void;
  onSave: (payload: CoursePayload, id: number) => Promise<string | null>;
}) {
  const panelId = useId();
  const first = group.slots[0];
  const termStart = group.slots.map((s) => s.term_start).filter((d): d is string => !!d).sort()[0];
  const termEnd = group.slots.map((s) => s.term_end).filter((d): d is string => !!d).sort().at(-1);

  return (
    <li className="min-w-0 border-b border-border last:border-b-0 md:last:border-b md:[&:nth-last-child(-n+2)]:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded px-1 py-3 text-left transition-colors hover:bg-raised/30"
      >
        <span className="w-16 shrink-0 text-sm font-semibold text-text">{group.code}</span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted">{group.name}</span>
        {group.status !== "enrolled" && <Pill>{group.status}</Pill>}
        <ChevronRight
          size={14}
          aria-hidden="true"
          className={`shrink-0 text-faint transition-transform duration-150 ease-out ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div id={panelId} className="px-1 pb-4">
          <ul className="flex flex-col gap-1.5">
            {group.slots.map((slot) => {
              const days = scheduleDays(slot);
              return (
                <li key={slot.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span
                    role="img"
                    aria-label={days.length ? `meets ${days.join(", ")}` : "no days set"}
                    className="flex gap-0.5"
                  >
                    {WEEKDAYS.map((d) => {
                      const on = days.includes(d);
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
                  </span>
                  <span className="tabular text-sm text-text">{slot.time_label ?? "time not set"}</span>
                  <span className="ml-auto flex items-center gap-0.5 text-xs text-faint">
                    <GoogleLink course={slot} />
                    <RowAction
                      icon={editing === slot.id ? X : Pencil}
                      label={editing === slot.id ? `close editor: ${slot.name} ${slot.time_label ?? ""}`.trim() : `edit ${slot.name} ${slot.time_label ?? ""}`.trim()}
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
              );
            })}
          </ul>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
            <Fact label="Credits">{group.credits ?? "—"}</Fact>
            <Fact label="Semester">{group.semester ?? "—"}</Fact>
            <Fact label="Professor">
              {first.professor_email ? (
                <a href={`mailto:${first.professor_email}`} className="rounded transition-colors hover:text-academic">
                  {first.professor ?? first.professor_email}
                </a>
              ) : (
                (first.professor ?? "—")
              )}
            </Fact>
            <Fact label="Room">{group.slots.map((s) => s.room).find(Boolean) ?? "—"}</Fact>
            <Fact label="Term">{termStart || termEnd ? `${termStart ? dayLabel(termStart) : "?"} – ${termEnd ? dayLabel(termEnd) : "?"}` : "—"}</Fact>
            <Fact label="Links">
              <span className="flex flex-wrap gap-x-3">
                {group.url && (
                  <a href={group.url} target="_blank" rel="noopener noreferrer" className="rounded text-academic transition-colors hover:underline">
                    {courseLinkLabel(group.url)} ↗
                  </a>
                )}
                <Link href={`/academic/courses/${first.id}`} className="rounded text-text transition-colors hover:text-academic">
                  Open course →
                </Link>
              </span>
            </Fact>
          </dl>

          {group.slots.map(
            (slot) =>
              editing === slot.id && (
                <div key={slot.id} className="mt-3">
                  <CourseForm
                    course={slot}
                    submitLabel="Save changes"
                    onCancel={() => onEdit(slot.id)}
                    onSubmit={(payload) => onSave(payload, slot.id)}
                  />
                </div>
              )
          )}
        </div>
      )}
    </li>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-faint">{label}</dt>
      <dd className="text-text">{children}</dd>
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
      className="rounded px-1 transition-colors hover:text-academic"
    >
      calendar ↗
    </a>
  );
}
