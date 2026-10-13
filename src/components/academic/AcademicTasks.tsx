"use client";

import Link from "next/link";
import { ChevronRight, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AnchoredForm } from "@/components/ui/AnchoredForm";
import { Disclosure, DisclosureTrigger } from "@/components/ui/Disclosure";
import { Pill } from "@/components/ui/Pill";
import { RowAction } from "@/components/ui/RowAction";
import { Table } from "@/components/ui/Table";
import { accentControl, urgencyText } from "@/components/ui/accents";
import { buttonChrome, fieldChrome, inputChrome, selectChrome } from "@/components/ui/controls";
import { HORIZONS, HORIZON_LABEL, courseCode, dueLabel, horizonOf, type Horizon } from "@/lib/academic/semester";
import { dayLabel, dueInfo } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
import type { CourseTask } from "@/lib/db/tasks";
import type { Course, TaskType } from "@/lib/types";

/**
 * Upcoming work (docs/03-pages/academic.md §4) and the exams list (§6) — the
 * same rows in the same store (decision #9), one table.
 *
 * The Upcoming view is grouped by horizon — Overdue (only when there is any) ·
 * Today · This week · Next week · Later (collapsed, carrying its count) · No
 * date — so "what do I do next" is answered by position (decision #74). Each
 * row is a done box, the title, the course's short code and **one** due label
 * — Today, Tomorrow, Wed 14 Oct — in amber when it is today or tomorrow; the
 * countdown column is gone (decision #80). A chevron opens the course, which is
 * where a task's context and editing live. Rows separate with hairlines, not
 * cards.
 *
 * Filters: Upcoming (grouped), All N (every incomplete row, flat), Completed.
 * The add form opens from the page's `+ Add` menu by hash (`addTrigger`
 * false) or from its own button on a detail page.
 *
 * Editing (2026-10-13): the pencil on a row opens an inline editor beneath it
 * — title, type, course, date, time, details — which saves through one PATCH
 * and refreshes, so the map, the groups and the counts move together. One
 * editor at a time; opening another closes the first.
 */

type View = "upcoming" | "all" | "completed";

export function AcademicTasks({
  tasks,
  courses,
  today,
  mode,
  fixedCourseId,
  frameless = false,
  rows = "divided",
  addTrigger = true,
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
  /** Forwarded to Table. */
  rows?: "divided" | "cards";
  /** `true` renders the add form behind its own `+ Add …` trigger; `false`
   *  leaves it to the page's `+ Add` menu, which reaches it by hash. */
  addTrigger?: boolean;
}) {
  const router = useRouter();
  const [isAdding, startTransition] = useTransition();
  const [view, setView] = useState<View>(mode === "exams" ? "all" : "upcoming");
  const [laterOpen, setLaterOpen] = useState(false);

  const [editing, setEditing] = useState<number | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eType, setEType] = useState<TaskType>("assignment");
  const [eCourseId, setECourseId] = useState("");
  const [eDue, setEDue] = useState("");
  const [eDueTime, setEDueTime] = useState("");
  const [eNotes, setENotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

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

  const codes = useMemo(() => new Map(courses.map((c) => [c.id, courseCode(c)] as const)), [courses]);
  const codeOf = (t: CourseTask) => (t.course_id != null ? (codes.get(t.course_id) ?? t.course_name) : null);

  const open = useMemo(
    () =>
      tasks
        .filter((t) => !t.done)
        .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.id - b.id),
    [tasks]
  );
  const shown = useMemo(() => (view === "completed" ? tasks.filter((t) => t.done) : open), [tasks, open, view]);

  const horizons = useMemo(() => {
    if (view !== "upcoming") return null;
    const buckets = new Map<Horizon, CourseTask[]>();
    for (const t of shown) {
      const h = horizonOf(t.due, today);
      const list = buckets.get(h);
      if (list) list.push(t);
      else buckets.set(h, [t]);
    }
    return HORIZONS.filter((h) => buckets.has(h)).map((h) => ({ horizon: h, items: buckets.get(h)! }));
  }, [shown, view, today]);

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

  function startEdit(t: CourseTask) {
    if (editing === t.id) {
      setEditing(null);
      return;
    }
    setEditing(t.id);
    setEditError(null);
    setETitle(t.title);
    setEType(t.type);
    setECourseId(t.course_id != null ? String(t.course_id) : "");
    setEDue(t.due ? t.due.slice(0, 10) : "");
    setEDueTime(t.due && t.due.length > 10 ? t.due.slice(11, 16) : "");
    setENotes(t.notes ?? "");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editing === null) return;
    if (!eTitle.trim()) {
      setEditError("enter a title");
      return;
    }
    if (eDueTime && !eDue) {
      setEditError("pick a date for that time");
      return;
    }
    setEditError(null);
    const res = await fetch(`/api/tasks/${editing}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: eTitle.trim(),
        type: mode === "exams" ? "exam" : eType,
        due: eDue ? (eDueTime ? `${eDue}T${eDueTime}` : eDue) : null,
        notes: eNotes.trim() || null,
        // A course page keeps the task where it is; the main list can re-file.
        ...(fixedCourseId ? {} : { course_id: eCourseId ? Number(eCourseId) : null }),
      }),
    }).catch(() => null);
    if (!res?.ok) {
      const message = await res?.json().then((j) => j?.error).catch(() => null);
      setEditError(message ?? "could not save — try again");
      return;
    }
    setEditing(null);
    startSave(() => router.refresh());
  }

  const busy = isPending || isAdding || isSaving;
  const anchor = mode === "exams" ? "new-exam" : "new-assignment";

  const form = (close?: () => void) => (
    <form onSubmit={add} className="flex flex-wrap items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        id={anchor}
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
              {c.time_label ? `${c.name} · ${c.time_label}` : c.name}
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
      <button type="submit" className={`${buttonChrome} hover:border-academic/40`}>
        Add
      </button>
      {close && (
        <button type="button" onClick={close} className={`${buttonChrome} text-muted hover:text-text`}>
          Cancel
        </button>
      )}
    </form>
  );

  const adder = addTrigger ? (
    <Disclosure
      variant="add"
      accent="academic"
      summary={mode === "exams" ? "Add exam" : "Add assignment or task"}
      openSummary="Cancel"
      anchors={[anchor]}
      className="mt-3"
    >
      {form()}
    </Disclosure>
  ) : (
    <AnchoredForm anchor={anchor}>{(close) => form(close)}</AnchoredForm>
  );

  const columns = ["", mode === "exams" ? "Exam" : "Task", ...(fixedCourseId ? [] : ["Course"]), "Due", ""];

  const editor = (t: CourseTask) => (
    <tr key={`edit-${t.id}`} data-section="">
      <td colSpan={columns.length} className="px-2 pb-3">
        <form
          onSubmit={saveEdit}
          aria-label={`edit ${t.title}`}
          className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-(--color-inset) p-3"
        >
          <input
            value={eTitle}
            onChange={(e) => setETitle(e.target.value)}
            aria-label="title"
            aria-invalid={!!editError && !eTitle.trim()}
            autoFocus
            className={`min-w-40 flex-1 ${inputChrome}`}
          />
          {mode === "work" && (
            <select value={eType} onChange={(e) => setEType(e.target.value as TaskType)} aria-label="type" className={`w-28 ${selectChrome}`}>
              <option value="assignment">assignment</option>
              <option value="task">task</option>
            </select>
          )}
          {!fixedCourseId && (
            <select value={eCourseId} onChange={(e) => setECourseId(e.target.value)} aria-label="course" className={`w-36 ${selectChrome}`}>
              <option value="">no course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.time_label ? `${c.name} · ${c.time_label}` : c.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1.5">
            <input type="date" value={eDue} onChange={(e) => setEDue(e.target.value)} aria-label="due date" className={fieldChrome} />
            <input
              type="time"
              value={eDueTime}
              onChange={(e) => setEDueTime(e.target.value)}
              aria-label="due time (optional)"
              className={`w-28 ${fieldChrome}`}
            />
          </div>
          <input
            value={eNotes}
            onChange={(e) => setENotes(e.target.value)}
            placeholder="Details…"
            aria-label="details"
            className={`min-w-40 flex-1 ${inputChrome}`}
          />
          <button type="submit" className={`${buttonChrome} hover:border-academic/40`}>
            Save
          </button>
          <button type="button" onClick={() => setEditing(null)} className={`${buttonChrome} text-muted hover:text-text`}>
            Cancel
          </button>
          {editError && (
            <span role="alert" className="text-xs text-danger">
              {editError}
            </span>
          )}
        </form>
      </td>
    </tr>
  );

  // A row, and its editor beneath it while it is open.
  const row = (t: CourseTask) => [
    <Row
      key={t.id}
      task={t}
      mode={mode}
      today={today}
      code={fixedCourseId ? null : codeOf(t)}
      showCourse={!fixedCourseId}
      done={valueFor(t, !!t.done)}
      onToggle={toggle}
      editing={editing === t.id}
      onEdit={() => startEdit(t)}
    />,
    ...(editing === t.id ? [editor(t)] : []),
  ];

  return (
    <div aria-busy={busy}>
      {mode === "work" && (
        <div className="mb-2 flex flex-wrap items-center gap-1">
          <ViewTab active={view === "upcoming"} onClick={() => setView("upcoming")}>
            Upcoming
          </ViewTab>
          <ViewTab active={view === "all"} onClick={() => setView("all")}>
            All {open.length}
          </ViewTab>
          <ViewTab active={view === "completed"} onClick={() => setView("completed")}>
            Completed
          </ViewTab>
        </div>
      )}

      {(error || addError) && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error ?? addError}
        </p>
      )}

      <Table columns={columns} empty={emptyHint(view, mode)} frameless={frameless} rows={rows}>
        {horizons
          ? horizons.flatMap(({ horizon, items }) => {
              const collapsed = horizon === "later" && !laterOpen;
              const next = items[0]?.due ? dayLabel(items[0].due.slice(0, 10)) : null;
              // data-section: a group label, never an item row.
              const header = (
                <tr key={`group-${horizon}`} data-section="">
                  <td colSpan={columns.length} className="px-2 pt-3 pb-1">
                    {horizon === "later" ? (
                      <DisclosureTrigger
                        open={laterOpen}
                        onToggle={() => setLaterOpen((v) => !v)}
                        summary="Later"
                        detail={`${items.length} ${items.length === 1 ? "task" : "tasks"}${next ? ` · next ${next}` : ""}`}
                      />
                    ) : (
                      <span className={`t-eyebrow uppercase ${horizon === "overdue" ? "text-danger" : "text-faint"}`}>
                        {HORIZON_LABEL[horizon]}
                        <span className="normal-case text-muted"> · {items.length}</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
              return collapsed ? [header] : [header, ...items.flatMap(row)];
            })
          : shown.flatMap(row)}
      </Table>

      {adder}
    </div>
  );
}

function Row({
  task,
  mode,
  today,
  code,
  showCourse,
  done,
  onToggle,
  editing,
  onEdit,
}: {
  task: CourseTask;
  mode: "work" | "exams";
  today: string;
  code: string | null;
  showCourse: boolean;
  done: boolean;
  onToggle: (task: CourseTask, current: boolean) => void;
  editing: boolean;
  onEdit: () => void;
}) {
  const urgency = task.due ? dueInfo(task.due).urgency : null;
  return (
    <tr>
      <td className="w-10 px-2 py-3">
        {/* 24px target around a 16px glyph (decision #76). The label stops the
            click reaching anything else in the row. */}
        <label className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded align-middle">
          <input
            type="checkbox"
            checked={done}
            onChange={() => onToggle(task, done)}
            className={`h-4 w-4 cursor-pointer ${accentControl.academic}`}
            aria-label={`done: ${task.title}`}
          />
        </label>
      </td>
      <td className={`px-3 py-3 ${done ? "text-muted line-through" : "text-text"}`}>
        {task.title}
        {mode === "work" && task.type !== "assignment" && (
          <span className="ml-2 align-middle">
            <Pill>{task.type}</Pill>
          </span>
        )}
      </td>
      {showCourse && (
        <td className="px-3 py-3">
          {code ? <Pill>{code}</Pill> : <span className="text-xs text-faint">no course</span>}
        </td>
      )}
      <td
        className={`tabular px-3 py-3 text-right text-xs whitespace-nowrap ${
          urgency && !done ? urgencyText[urgency] : "text-faint"
        }`}
      >
        {task.due ? dueLabel(task.due, today) : "—"}
      </td>
      <td className="w-16 px-2 py-3">
        <span className="flex items-center justify-end gap-0.5">
          <RowAction
            icon={editing ? X : Pencil}
            label={editing ? `close editor: ${task.title}` : `edit ${task.title}`}
            expanded={editing}
            onClick={onEdit}
          />
          {task.course_id != null && (
            <Link
              href={`/academic/courses/${task.course_id}`}
              aria-label={`Open ${code ?? task.course_name ?? "course"}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-faint transition-colors hover:text-text"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          )}
        </span>
      </td>
    </tr>
  );
}

function emptyHint(view: View, mode: "work" | "exams"): string {
  if (mode === "exams") return "no exams yet — add one when the date is announced";
  switch (view) {
    case "completed":
      return "nothing finished yet";
    default:
      return "nothing open";
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
