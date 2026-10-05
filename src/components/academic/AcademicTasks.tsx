"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Disclosure, DisclosureTrigger } from "@/components/ui/Disclosure";
import { Pill } from "@/components/ui/Pill";
import { Table } from "@/components/ui/Table";
import { accentControl, accentHoverBorder, urgencyText, type Accent } from "@/components/ui/accents";
import {
  EXAM_COUNTDOWN_DAYS,
  HORIZONS,
  HORIZON_LABEL,
  courseCode,
  horizonOf,
  type Horizon,
} from "@/lib/academic/semester";
import { dayLabel, daysLeftLabel, daysUntil, dueInfo } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
import type { CourseTask } from "@/lib/db/tasks";
import type { Course, TaskType } from "@/lib/types";

/**
 * Assignments & tasks (docs/03-pages/academic.md §3) and exams (§4) — the same
 * rows in the same store (decision #9), rendered two ways:
 *
 * - `layout="table"`: the list. On the Open view it is grouped by horizon —
 *   Overdue · Today · This week · Next week · Later (collapsed) · No date — so
 *   the question "what do I do next" is answered by position, not by reading
 *   twenty-one dates (decision #74). A group only renders when it has rows.
 *   Courses appear as their short code; the type pill appears only on a row
 *   whose type is not the majority's, because a column of the word
 *   "assignment" repeated down every row is decision #60's dead column again.
 * - `layout="rail"`: exams in the rail (decision #75) — one line each, code
 *   and date, with a day count only inside `EXAM_COUNTDOWN_DAYS`.
 *
 * Days-left colour comes from `dueInfo()` + `urgencyText`, the one place that
 * owns those thresholds; the horizon edges live in `lib/academic/semester.ts`.
 */

type View = "todo" | "overdue" | "completed" | "all";

const VIEWS: { key: View; label: string }[] = [
  { key: "todo", label: "Open" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

export function AcademicTasks({
  tasks,
  courses,
  today,
  mode,
  fixedCourseId,
  frameless = false,
  rows = "divided",
  layout = "table",
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
  /** `rail` is the compact exams list for the Olive rail; `table` everywhere else. */
  layout?: "table" | "rail";
}) {
  const router = useRouter();
  const [isAdding, startTransition] = useTransition();
  const [view, setView] = useState<View>(mode === "exams" ? "all" : "todo");
  const [laterOpen, setLaterOpen] = useState(false);

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

  const shown = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    switch (view) {
      case "todo":
        return open;
      case "overdue":
        return open.filter((t) => t.due && t.due.slice(0, 10) < today);
      case "completed":
        return tasks.filter((t) => t.done);
      default:
        return tasks;
    }
  }, [tasks, view, today]);

  const horizons = useMemo(() => {
    if (view !== "todo") return null;
    const buckets = new Map<Horizon, CourseTask[]>();
    for (const t of shown) {
      const h = horizonOf(t.due, today);
      const list = buckets.get(h);
      if (list) list.push(t);
      else buckets.set(h, [t]);
    }
    return HORIZONS.filter((h) => buckets.has(h)).map((h) => ({ horizon: h, items: buckets.get(h)! }));
  }, [shown, view, today]);

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

  // The rail is Olive on every page; the main column carries Academic's hue.
  const accent: Accent = layout === "rail" ? "hub" : "academic";
  const control = accentControl[accent];
  const busy = isPending || isAdding;

  const form = (
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
      <button
        type="submit"
        className={`rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text transition-colors ${accentHoverBorder[accent]}`}
      >
        Add
      </button>
    </form>
  );

  // Editing behind intent (#64, app-wide by #72): the resting page reads; the
  // rail Quick-add anchors reach the input through `anchors`.
  const addDisclosure = (
    <Disclosure
      variant="add"
      accent={accent}
      summary={mode === "exams" ? "Add exam" : "Add assignment or task"}
      openSummary="Cancel"
      anchors={[mode === "exams" ? "new-exam" : "new-assignment"]}
      className="mt-3"
    >
      {form}
    </Disclosure>
  );

  if (layout === "rail") {
    const open = tasks
      .filter((t) => !valueFor(t, !!t.done))
      .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
    return (
      <div aria-busy={busy}>
        {(error || addError) && (
          <p role="alert" className="mb-2 text-xs text-danger">
            {error ?? addError}
          </p>
        )}
        {open.length === 0 ? (
          <p className="text-xs text-muted">no exams yet</p>
        ) : (
          <ul className="flex flex-col">
            {open.map((t) => (
              <RailExam
                key={t.id}
                task={t}
                code={codeOf(t)}
                done={valueFor(t, !!t.done)}
                onToggle={toggle}
                control={control}
              />
            ))}
          </ul>
        )}
        {addDisclosure}
      </div>
    );
  }

  const columns = [
    "",
    mode === "exams" ? "Exam" : "Item",
    ...(fixedCourseId ? [] : ["Course"]),
    "Due",
    "Left",
  ];

  const row = (t: CourseTask) => (
    <Row
      key={t.id}
      task={t}
      mode={mode}
      code={fixedCourseId ? null : codeOf(t)}
      showCourse={!fixedCourseId}
      done={valueFor(t, !!t.done)}
      onToggle={toggle}
      control={control}
    />
  );

  return (
    <div aria-busy={busy}>
      {mode === "work" && (
        <div className="mb-2 flex flex-wrap items-center gap-1">
          {VIEWS.map((v) => (
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
        {horizons
          ? horizons.flatMap(({ horizon, items }) => {
              const collapsed = horizon === "later" && !laterOpen;
              const next = items[0]?.due ? dayLabel(items[0].due.slice(0, 10)) : null;
              // data-section: a group label, never an item-card (cards variant).
              const header = (
                <tr key={`group-${horizon}`} data-section="">
                  <td colSpan={columns.length} className="px-2 pt-3 pb-1">
                    {horizon === "later" ? (
                      // Collapsed by default, and it says what is behind it:
                      // the count and the next date (decision #63).
                      <DisclosureTrigger
                        open={laterOpen}
                        onToggle={() => setLaterOpen((v) => !v)}
                        summary="Later"
                        detail={`${items.length}${next ? ` · next ${next}` : ""}`}
                      />
                    ) : (
                      <span className="t-eyebrow uppercase text-faint">
                        {HORIZON_LABEL[horizon]}
                        <span className="normal-case text-muted"> · {items.length}</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
              return collapsed ? [header] : [header, ...items.map(row)];
            })
          : shown.map(row)}
      </Table>

      {addDisclosure}
    </div>
  );
}

function Row({
  task,
  mode,
  code,
  showCourse,
  done,
  onToggle,
  control,
}: {
  task: CourseTask;
  mode: "work" | "exams";
  code: string | null;
  showCourse: boolean;
  done: boolean;
  onToggle: (task: CourseTask, current: boolean) => void;
  control: string;
}) {
  const info = task.due ? dueInfo(task.due) : null;
  // The Left pill already says "4d over", so the due cell drops the word and
  // keeps the colour — one urgency statement per encoding, not two.
  const dueText = info?.urgency === "overdue" ? info.label.replace(/ · overdue$/, "") : info?.label;
  return (
    <tr>
      <td className="w-10 px-2 py-1.5">
        {/* 24px target around a 16px glyph (decision #76). */}
        <label className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded align-middle">
          <input
            type="checkbox"
            checked={done}
            onChange={() => onToggle(task, done)}
            className={`h-4 w-4 cursor-pointer ${control}`}
            aria-label={`done: ${task.title}`}
          />
        </label>
      </td>
      <td className={`px-3 py-2 ${done ? "text-muted line-through" : ""}`}>
        {task.title}
        {mode === "work" && task.type !== "assignment" && (
          <span className="ml-2 align-middle">
            <Pill>{task.type}</Pill>
          </span>
        )}
      </td>
      {showCourse && (
        <td className="px-3 py-2">
          {code ? <Pill>{code}</Pill> : <span className="text-xs text-faint">no course</span>}
        </td>
      )}
      <td
        className={`tabular px-3 py-2 text-xs whitespace-nowrap ${
          info && !done ? urgencyText[info.urgency] : "text-faint"
        }`}
      >
        {dueText ?? "—"}
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

/** One exam in the rail: code, date, and a day count only once it is near. */
function RailExam({
  task,
  code,
  done,
  onToggle,
  control,
}: {
  task: CourseTask;
  code: string | null;
  done: boolean;
  onToggle: (task: CourseTask, current: boolean) => void;
  control: string;
}) {
  const date = task.due?.slice(0, 10);
  const time = task.due && task.due.length > 10 ? task.due.slice(11, 16) : null;
  const info = task.due ? dueInfo(task.due) : null;
  const near = !!task.due && daysUntil(task.due) <= EXAM_COUNTDOWN_DAYS;
  return (
    <li className="flex items-center gap-2 border-t border-border py-1.5 first:border-t-0">
      <label className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded">
        <input
          type="checkbox"
          checked={done}
          onChange={() => onToggle(task, done)}
          className={`h-4 w-4 cursor-pointer ${control}`}
          aria-label={`done: ${task.title}${code ? ` (${code})` : ""}`}
        />
      </label>
      {task.course_id != null && code ? (
        <Link
          href={`/academic/courses/${task.course_id}`}
          title={task.title}
          className="shrink-0 rounded text-sm font-semibold text-text transition-colors hover:text-hub"
        >
          {code}
        </Link>
      ) : (
        <span className="truncate text-sm text-text">{task.title}</span>
      )}
      <span className="tabular min-w-0 flex-1 truncate text-xs text-muted">
        {date ? dayLabel(date) : "date to be announced"}
        {time && ` · ${time}`}
      </span>
      {near && info && (
        <span
          className={`t-metric shrink-0 text-base ${info.urgency === "none" ? "text-text" : urgencyText[info.urgency]}`}
        >
          {daysLeftLabel(task.due!)}
        </span>
      )}
    </li>
  );
}

function emptyHint(view: View, mode: "work" | "exams"): string {
  if (mode === "exams") return "no exams yet — add one below when the date is announced";
  switch (view) {
    case "overdue":
      return "nothing overdue";
    case "completed":
      return "nothing finished yet";
    case "all":
      return "nothing yet — add an assignment below";
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
