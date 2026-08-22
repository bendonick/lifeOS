"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Disclosure } from "@/components/ui/Disclosure";
import { Pill, TypePill } from "@/components/ui/Pill";
import { Table } from "@/components/ui/Table";
import { accentControl, urgencyText } from "@/components/ui/accents";
import { daysLeftLabel, dueInfo } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
import type { CourseTask } from "@/lib/db/tasks";
import type { Course, TaskType } from "@/lib/types";

/**
 * Assignments & tasks (docs/03-pages/academic.md §3) and exams (§4) — the same
 * table with different filters, because they are the same rows in the same store
 * (decision #9). Exams carry no midterm/final split (decision #25), so they get
 * no view tabs; assignments get the full set.
 *
 * Days-left colour comes from `dueInfo()` + `urgencyText`, the one place that
 * owns those thresholds.
 */

type View = "todo" | "upcoming" | "overdue" | "course" | "completed" | "all";

const VIEWS: { key: View; label: string }[] = [
  { key: "todo", label: "Open" },
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
  { key: "course", label: "By course" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

/** "Upcoming" is the fortnight ahead — far enough to plan, near enough to matter. */
const UPCOMING_DAYS = 14;

export function AcademicTasks({
  tasks,
  courses,
  today,
  mode,
  fixedCourseId,
  frameless = false,
  rows = "divided",
}: {
  tasks: CourseTask[];
  courses: Course[];
  today: string;
  mode: "work" | "exams";
  /** On a course page the list is pre-filtered — file new items here and drop
   *  the redundant Course column and picker. */
  fixedCourseId?: number;
  /** Inside a Tile the tile is the border (#65); the course page keeps the frame. */
  frameless?: boolean;
  /** Forwarded to Table — the main page renders row-cards (#70). */
  rows?: "divided" | "cards";
}) {
  const router = useRouter();
  const [isAdding, startTransition] = useTransition();
  const [view, setView] = useState<View>(mode === "exams" ? "all" : "todo");

  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>(mode === "exams" ? "exam" : "assignment");
  const [courseId, setCourseId] = useState(fixedCourseId ? String(fixedCourseId) : "");
  const [due, setDue] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const { toggle, valueFor, isPending, error } = useOptimisticToggle<CourseTask>({
    idOf: (t) => t.id,
    labelOf: (t) => t.title,
    send: (t, next) =>
      fetch(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      }),
  });

  const horizon = useMemo(() => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + UPCOMING_DAYS);
    return d.toISOString().slice(0, 10);
  }, [today]);

  const shown = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    switch (view) {
      case "todo":
      case "course":
        return open;
      case "upcoming":
        return open.filter((t) => t.due && t.due.slice(0, 10) >= today && t.due.slice(0, 10) <= horizon);
      case "overdue":
        return open.filter((t) => t.due && t.due.slice(0, 10) < today);
      case "completed":
        return tasks.filter((t) => t.done);
      default:
        return tasks;
    }
  }, [tasks, view, today, horizon]);

  const grouped = useMemo(() => {
    if (view !== "course") return null;
    const buckets = new Map<string, CourseTask[]>();
    for (const t of shown) {
      const key = t.course_name ?? "Unfiled";
      const list = buckets.get(key);
      if (list) list.push(t);
      else buckets.set(key, [t]);
    }
    // Unfiled last — it's a to-file pile, not a course.
    return [...buckets.entries()].sort(([a], [b]) =>
      a === "Unfiled" ? 1 : b === "Unfiled" ? -1 : a.localeCompare(b)
    );
  }, [shown, view]);

  const counts = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    return {
      todo: open.length,
      overdue: open.filter((t) => t.due && t.due.slice(0, 10) < today).length,
    };
  }, [tasks, today]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setAddError(mode === "exams" ? "name the exam" : "enter a title");
      return;
    }
    // A time with no date has nothing to hang on — say so rather than dropping it.
    if (dueTime && !due) {
      setAddError("pick a date for that time");
      return;
    }
    setAddError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        domain: "academic",
        type,
        due: due ? (dueTime ? `${due}T${dueTime}` : due) : null,
        course_id: courseId ? Number(courseId) : null,
      }),
    }).catch(() => null);
    if (!res?.ok) {
      setAddError("could not save — try again");
      return;
    }
    setTitle("");
    setDue("");
    setDueTime("");
    startTransition(() => router.refresh());
  }

  const columns = [
    "",
    mode === "exams" ? "Exam" : "Item",
    ...(fixedCourseId ? [] : ["Course"]),
    ...(mode === "exams" ? [] : ["Type"]),
    "Due",
    "Left",
  ];
  const busy = isPending || isAdding;

  return (
    <div aria-busy={busy}>
      {mode === "work" && (
        <div className="mb-2 flex flex-wrap items-center gap-1">
          {VIEWS.filter((v) => !(fixedCourseId && v.key === "course")).map((v) => (
            <ViewTab key={v.key} active={view === v.key} onClick={() => setView(v.key)}>
              {v.label}
              {v.key === "todo" && counts.todo > 0 && ` · ${counts.todo}`}
              {v.key === "overdue" && counts.overdue > 0 && ` · ${counts.overdue}`}
            </ViewTab>
          ))}
        </div>
      )}

      {(error || addError) && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error ?? addError}
        </p>
      )}

      <Table columns={columns} empty={emptyHint(view, mode)} frameless={frameless} rows={rows}>
        {grouped
          ? grouped.flatMap(([course, items]) => [
              // data-section: a group label, never an item-card (cards variant).
              <tr key={`group-${course}`} data-section="" className="bg-raised/50">
                <td colSpan={columns.length} className="px-3 py-1.5 text-[11px] text-muted">
                  {course} · {items.length}
                </td>
              </tr>,
              ...items.map((t) => (
                <Row key={t.id} task={t} mode={mode} showCourse={!fixedCourseId} done={valueFor(t, !!t.done)} onToggle={toggle} />
              )),
            ])
          : shown.map((t) => (
              <Row key={t.id} task={t} mode={mode} showCourse={!fixedCourseId} done={valueFor(t, !!t.done)} onToggle={toggle} />
            ))}
      </Table>

      {/* Editing behind intent (#64, now app-wide by #72): the resting page
          reads; the rail Quick-add anchors reach the input through `anchors`. */}
      <Disclosure
        variant="add"
        accent="academic"
        summary={mode === "exams" ? "Add exam" : "Add assignment or task"}
        openSummary="Cancel"
        anchors={[mode === "exams" ? "new-exam" : "new-assignment"]}
        className="mt-3"
      >
      <form onSubmit={add} className="flex flex-wrap items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          id={mode === "exams" ? "new-exam" : "new-assignment"}
          placeholder={mode === "exams" ? "Add an exam…" : "Add an assignment or task…"}
          aria-label={mode === "exams" ? "exam name" : "item title"}
          aria-invalid={!!addError}
          autoFocus
          className="min-w-40 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint"
        />
        {mode === "work" && (
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            aria-label="type"
            className="w-28 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
          >
            <option value="assignment">assignment</option>
            <option value="task">task</option>
          </select>
        )}
        {/* Long course names would otherwise set the select's intrinsic width and
            wrap the Add button onto its own line; the popup still shows them in full. */}
        {!fixedCourseId && (
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            aria-label="course"
            className="w-36 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
          >
            <option value="">no course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        {/* Date and time wrap as a pair — an exam at 09:00 should never end up
            on a different line from the day it falls on. */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            aria-label={mode === "exams" ? "exam date" : "due date"}
            aria-invalid={!!addError && !!dueTime && !due}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
          />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            aria-label={mode === "exams" ? "exam time (optional)" : "due time (optional)"}
            title="Optional — leave blank for a whole-day deadline"
            className="w-28 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text hover:border-academic/40"
        >
          Add
        </button>
      </form>
      </Disclosure>
    </div>
  );
}

function Row({
  task,
  mode,
  showCourse,
  done,
  onToggle,
}: {
  task: CourseTask;
  mode: "work" | "exams";
  showCourse: boolean;
  done: boolean;
  onToggle: (task: CourseTask, current: boolean) => void;
}) {
  const info = task.due ? dueInfo(task.due) : null;
  return (
    <tr>
      <td className="w-8 px-3 py-2">
        <input
          type="checkbox"
          checked={done}
          onChange={() => onToggle(task, done)}
          className={`h-4 w-4 cursor-pointer ${accentControl.academic}`}
          aria-label={`done: ${task.title}`}
        />
      </td>
      <td className={`px-3 py-2 ${done ? "text-muted line-through" : ""}`}>{task.title}</td>
      {showCourse && <td className="px-3 py-2 text-xs text-muted">{task.course_name ?? "—"}</td>}
      {mode === "work" && (
        <td className="px-3 py-2">
          <TypePill type={task.type} />
        </td>
      )}
      <td className={`tabular px-3 py-2 text-xs ${info && !done ? urgencyText[info.urgency] : "text-faint"}`}>
        {info?.label ?? "—"}
      </td>
      <td className="tabular px-3 py-2 text-xs">
        {/* A countdown on something already handed in is noise, so it stops at done. */}
        {task.due && !done ? (
          <Pill tone={info?.urgency === "overdue" ? "danger" : info?.urgency === "none" ? "neutral" : "warn"}>
            {daysLeftLabel(task.due)}
          </Pill>
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
    </tr>
  );
}

function emptyHint(view: View, mode: "work" | "exams"): string {
  if (mode === "exams") return "no exams yet — add one below when the date is announced";
  switch (view) {
    case "overdue":
      return "nothing overdue";
    case "upcoming":
      return `nothing due in the next ${UPCOMING_DAYS} days`;
    case "completed":
      return "nothing finished yet";
    default:
      return "nothing open — add an assignment below";
  }
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
        active
          ? "border-academic/40 bg-academic/10 text-academic"
          : "border-border bg-surface text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
