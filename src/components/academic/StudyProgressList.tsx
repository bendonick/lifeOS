"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DisclosureTrigger } from "@/components/ui/Disclosure";
import { RowAction } from "@/components/ui/RowAction";
import { buttonChrome, filledButtonChrome, inputChrome } from "@/components/ui/controls";
import type { CourseStudy } from "@/lib/academic/study";
import type { StudyLog } from "@/lib/db/study";
import { dayLabel } from "@/lib/dates";

/**
 * The Study progress rows (decisions #98, #99): code | bar | exam. The filled
 * plus beside each course code opens a small dialog (title, description) that
 * logs a session for today; "Sessions" under the bar lists what has been
 * logged, newest first, each with a delete. Every change refreshes the page's
 * server data, so the bar is always the database's count.
 */
export function StudyProgressList({ courses, today }: { courses: CourseStudy[]; today: string }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const refresh = () => startTransition(() => router.refresh());

  return (
    <div aria-busy={isRefreshing}>
      <ul className="border-t border-border">
        {courses.map((c) => (
          <CourseRow key={c.code} course={c} today={today} onChange={refresh} />
        ))}
      </ul>
      <Legend />
    </div>
  );
}

/** Lines the session list up under the bar from `sm`, where the row is
 *  code | bar | exam. */
const UNDER_BAR = "sm:ml-[7.5rem] sm:mr-[11.5rem]";

function CourseRow({ course: c, today, onChange }: { course: CourseStudy; today: string; onChange: () => void }) {
  const [logging, setLogging] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const logId = useId();
  const when = examWhen(c);

  return (
    <li className="border-b border-border py-3.5">
      {/* Phone: code and exam on one line, the bar and its line full width
          beneath. From `sm`: code | bar | exam, the exam where the bar ends. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[6.5rem_minmax(0,1fr)_10.5rem]">
        <div className="flex items-center gap-2 justify-self-start sm:col-start-1 sm:row-span-2 sm:row-start-1">
          <Link
            href={`/academic/courses/${c.courseId}`}
            className="inline-flex min-h-6 items-center rounded font-bold text-text underline-offset-4 hover:underline"
          >
            {c.code}
          </Link>
          <button
            type="button"
            onClick={() => setLogging(true)}
            aria-label={`Log a session for ${c.code}`}
            aria-haspopup="dialog"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--color-ink) text-(--color-paper) transition-colors hover:bg-(--color-ink-hover)"
          >
            <Plus size={15} strokeWidth={2.75} aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-2.5 justify-self-end sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:justify-self-start">
          {c.exam && <span aria-hidden="true" className="h-8 w-[3px] shrink-0 rounded-sm bg-danger" />}
          <div className="leading-tight">
            <p className="tabular font-bold text-text">{c.exam ? dayLabel(c.exam.slice(0, 10)) : "No exam set"}</p>
            {when && <p className="tabular text-sm text-muted">{when}</p>}
          </div>
        </div>

        <Bar course={c} />

        <div className="col-span-2 flex min-h-7 flex-wrap items-center justify-between gap-x-4 sm:col-span-1 sm:col-start-2 sm:row-start-2">
          <p className="tabular text-sm text-muted">{countLabel(c)}</p>
          {c.log.length > 0 && (
            <DisclosureTrigger
              open={showLog}
              onToggle={() => setShowLog((v) => !v)}
              summary="Sessions"
              openSummary="Hide sessions"
              detail={c.log.length}
              controls={logId}
            />
          )}
        </div>
      </div>

      {showLog && c.log.length > 0 && (
        <div id={logId} className={UNDER_BAR}>
          <SessionLog code={c.code} log={c.log} onChange={onChange} />
        </div>
      )}

      <LogDialog
        course={c}
        today={today}
        open={logging}
        onClose={() => setLogging(false)}
        onLogged={() => {
          setLogging(false);
          onChange();
        }}
      />
    </li>
  );
}

function Bar({ course: c }: { course: CourseStudy }) {
  const place = "col-span-2 h-[22px] sm:col-span-1 sm:col-start-2 sm:row-start-1";
  if (c.slots.length === 0) {
    return (
      <div className={`${place} flex items-center rounded-sm border border-dashed border-border-strong px-2`}>
        <span className="truncate text-xs text-muted">No sessions planned in the Exam Prep calendar</span>
      </div>
    );
  }
  return (
    <div role="img" aria-label={`${c.code}: ${countLabel(c)}`} className={`${place} flex gap-[2px]`}>
      {c.slots.map((s) => (
        <span key={s.id} className="study-seg flex-1" data-kind={s.kind} data-filled={s.filled ? "" : undefined} />
      ))}
    </div>
  );
}

/**
 * The log dialog: a native modal <dialog>, so Escape, focus and the inert page
 * behind it come from the browser. A click on the backdrop closes it too. The
 * session is logged for today; a title naming a mock or past exam fills a mock
 * segment (`logKind`, applied by the API).
 */
function LogDialog({
  course: c,
  today,
  open,
  onClose,
  onLogged,
}: {
  course: CourseStudy;
  today: string;
  open: boolean;
  onClose: () => void;
  onLogged: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape and `dialog.close()` close the element without React; listening on
  // the element itself keeps `open` in step either way.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handle = () => closeRef.current();
    dialog.addEventListener("close", handle);
    return () => dialog.removeEventListener("close", handle);
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setTitle("");
      setDescription("");
      setError(null);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("give the session a title");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: c.courseId, title: title.trim(), description: description.trim(), date: today }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const message = await res?.json().then((j) => j?.error).catch(() => null);
      setError(message ?? "could not log the session");
      return;
    }
    onLogged();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-lg border border-border-strong bg-(--color-bg) p-0 text-text shadow-xl backdrop:bg-(--color-ink)/40"
    >
      <form onSubmit={submit} className="flex flex-col gap-4 p-5">
        <div>
          <h3 id={titleId} className="t-serif text-2xl leading-tight text-text">
            Log a session
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            {c.code} · {c.name} · {dayLabel(today)}
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
          Title
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Attention and transformers"
            className={`${inputChrome} text-base font-normal`}
          />
          {c.planned.mock > 0 && (
            <span className="text-xs font-normal text-muted">Put “mock exam” in the title to fill a mock exam.</span>
          )}
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
          <span>
            Description <span className="font-normal text-muted">(optional)</span>
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="What you covered, what is still unclear"
            className={`${inputChrome} resize-y text-base font-normal`}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonChrome}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={filledButtonChrome}>
            {saving ? "Logging…" : "Log session"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function SessionLog({ code, log, onChange }: { code: string; log: StudyLog[]; onChange: () => void }) {
  const [error, setError] = useState<string | null>(null);

  async function remove(entry: StudyLog) {
    if (!window.confirm(`Delete “${entry.title}” from the ${code} log?`)) return;
    setError(null);
    const res = await fetch(`/api/study-sessions/${entry.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setError(`could not delete “${entry.title}”`);
      return;
    }
    onChange();
  }

  return (
    <div className="mt-2">
      {error && (
        <p role="alert" className="mb-1 text-sm text-danger">
          {error}
        </p>
      )}
      <ul className="divide-y divide-border border-t border-border text-sm">
        {log.map((l) => (
          <li key={l.id} className="flex items-start gap-3 py-1.5">
            <span className="tabular w-24 shrink-0 pt-0.5 text-muted">{dayLabel(l.date)}</span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-text">
                {l.title}
                {l.kind === "mock" && <span className="text-muted"> · mock exam</span>}
              </p>
              {l.description && <p className="whitespace-pre-line text-muted">{l.description}</p>}
            </div>
            <RowAction icon={Trash2} label={`Delete “${l.title}”`} onClick={() => remove(l)} danger />
          </li>
        ))}
      </ul>
    </div>
  );
}

function countLabel(c: CourseStudy): string {
  const parts: string[] = [];
  if (c.planned.study > 0 || c.done.study > 0) {
    parts.push(
      c.planned.study > 0
        ? `${c.done.study} of ${c.planned.study} ${c.planned.study === 1 ? "session" : "sessions"}`
        : `${c.done.study} ${c.done.study === 1 ? "session" : "sessions"}`
    );
  }
  if (c.planned.mock > 0 || c.done.mock > 0) {
    parts.push(
      c.planned.mock > 0
        ? `${c.done.mock} of ${c.planned.mock} mock ${c.planned.mock === 1 ? "exam" : "exams"}`
        : `${c.done.mock} mock ${c.done.mock === 1 ? "exam" : "exams"}`
    );
  }
  return parts.join(" · ") || "Nothing logged yet";
}

function examWhen(c: CourseStudy): string | null {
  if (c.daysToExam === null) return null;
  const n = c.daysToExam;
  if (n < 0) return "exam passed";
  if (n === 0) return "exam today";
  if (n === 1) return "exam tomorrow";
  return `exam in ${n} days`;
}

function Legend() {
  const items: { label: string; kind: string; filled: boolean }[] = [
    { label: "Logged", kind: "study", filled: true },
    { label: "Planned", kind: "study", filled: false },
    { label: "Mock exam", kind: "mock", filled: false },
    { label: "Mock exam logged", kind: "mock", filled: true },
  ];
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="study-seg h-3 w-3.5"
            data-kind={i.kind}
            data-filled={i.filled ? "" : undefined}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
