"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { DisclosureTrigger } from "@/components/ui/Disclosure";
import { RowAction } from "@/components/ui/RowAction";
import { fieldChrome, filledButtonChrome, inputChrome } from "@/components/ui/controls";
import type { CourseStudy } from "@/lib/academic/study";
import type { StudyLog } from "@/lib/db/study";
import { dayLabel } from "@/lib/dates";

/**
 * The Study progress rows (decision #98): code | bar | exam, with the count
 * and two actions under the bar. "Log session" opens a one-line form (what you
 * studied, the day, whether it was a mock exam); "Sessions" lists what has
 * been logged, newest first, each with a delete. Every change refreshes the
 * page's server data, so the bar is always the database's count.
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

/** Lines the form and the log up under the bar from `sm`, where the row is
 *  code | bar | exam. */
const UNDER_BAR = "sm:ml-[5.5rem] sm:mr-[11.5rem]";

function CourseRow({ course: c, today, onChange }: { course: CourseStudy; today: string; onChange: () => void }) {
  const [adding, setAdding] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const formId = useId();
  const logId = useId();
  const when = examWhen(c);

  return (
    <li className="border-b border-border py-3.5">
      {/* Phone: code and exam on one line, the bar and its line full width
          beneath. From `sm`: code | bar | exam, the exam where the bar ends. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_10.5rem]">
        <Link
          href={`/academic/courses/${c.courseId}`}
          className="inline-flex min-h-6 items-center justify-self-start rounded font-bold text-text underline-offset-4 hover:underline sm:col-start-1 sm:row-span-2 sm:row-start-1"
        >
          {c.code}
        </Link>

        <div className="flex items-center gap-2.5 justify-self-end sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:justify-self-start">
          {c.exam && <span aria-hidden="true" className="h-8 w-[3px] shrink-0 rounded-sm bg-danger" />}
          <div className="leading-tight">
            <p className="tabular font-bold text-text">{c.exam ? dayLabel(c.exam.slice(0, 10)) : "No exam set"}</p>
            {when && <p className="tabular text-sm text-muted">{when}</p>}
          </div>
        </div>

        <Bar course={c} />

        <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-4 sm:col-span-1 sm:col-start-2 sm:row-start-2">
          <p className="tabular text-sm text-muted">{countLabel(c)}</p>
          <div className="flex items-center gap-4">
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
            <DisclosureTrigger
              variant="add"
              accent="academic"
              open={adding}
              onToggle={() => setAdding((v) => !v)}
              summary="Log session"
              openSummary="Close"
              controls={formId}
            />
          </div>
        </div>
      </div>

      {adding && (
        <div id={formId} className={UNDER_BAR}>
          <LogForm
            course={c}
            today={today}
            onLogged={() => {
              setAdding(false);
              onChange();
            }}
          />
        </div>
      )}
      {showLog && c.log.length > 0 && (
        <div id={logId} className={UNDER_BAR}>
          <SessionLog code={c.code} log={c.log} onChange={onChange} />
        </div>
      )}
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

function LogForm({ course: c, today, onLogged }: { course: CourseStudy; today: string; onLogged: () => void }) {
  const [concept, setConcept] = useState("");
  const [date, setDate] = useState(today);
  const [mock, setMock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!concept.trim()) {
      setError("say what you studied");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ course_id: c.courseId, concept: concept.trim(), kind: mock ? "mock" : "study", date }),
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
    <form onSubmit={submit} className="mt-2.5 flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={concept}
        onChange={(e) => setConcept(e.target.value)}
        maxLength={200}
        placeholder={mock ? "Which mock or past exam?" : "What did you study?"}
        aria-label={`What you studied for ${c.code}`}
        className={`${inputChrome} min-w-0 flex-[1_1_14rem]`}
      />
      <input
        type="date"
        value={date}
        max={today}
        onChange={(e) => setDate(e.target.value)}
        aria-label="Day"
        className={fieldChrome}
      />
      <label className="inline-flex min-h-6 items-center gap-2 text-sm text-text">
        <input type="checkbox" checked={mock} onChange={(e) => setMock(e.target.checked)} />
        Mock exam
      </label>
      <button type="submit" disabled={saving} className={filledButtonChrome}>
        {saving ? "Logging…" : "Log"}
      </button>
      {error && (
        <p role="alert" className="basis-full text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

function SessionLog({ code, log, onChange }: { code: string; log: StudyLog[]; onChange: () => void }) {
  const [error, setError] = useState<string | null>(null);

  async function remove(entry: StudyLog) {
    if (!window.confirm(`Delete “${entry.concept}” from the ${code} log?`)) return;
    setError(null);
    const res = await fetch(`/api/study-sessions/${entry.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setError(`could not delete “${entry.concept}”`);
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
          <li key={l.id} className="flex items-center gap-3 py-1.5">
            <span className="tabular w-24 shrink-0 text-muted">{dayLabel(l.date)}</span>
            <span className="min-w-0 flex-1 text-text">
              {l.concept}
              {l.kind === "mock" && <span className="text-muted"> · mock exam</span>}
            </span>
            <RowAction icon={Trash2} label={`Delete “${l.concept}”`} onClick={() => remove(l)} danger />
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
