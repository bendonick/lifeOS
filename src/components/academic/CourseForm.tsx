"use client";

import { useState } from "react";
import { hourLabel, parseHour, scheduleDays } from "@/lib/academic/course";
import { courseCode } from "@/lib/academic/semester";
import { COURSE_STATUSES, WEEKDAYS, type Course, type CourseStatus, type Weekday } from "@/lib/types";

/**
 * Create/edit a course. One form for both so the fields can't drift apart.
 * Nothing here is required except a name — an MSc course often gets entered
 * before its room or professor is known.
 */

export interface CoursePayload {
  name: string;
  semester: string | null;
  credits: number | null;
  professor: string | null;
  professor_email: string | null;
  room: string | null;
  status: CourseStatus;
  schedule_days: Weekday[];
  start_hour: number | null;
  end_hour: number | null;
  term_start: string | null;
  term_end: string | null;
  url: string | null;
  short_name: string | null;
}

const field =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm placeholder:text-faint";

export function CourseForm({
  course,
  onSubmit,
  onCancel,
  submitLabel,
  nameInputId,
}: {
  course?: Course;
  onSubmit: (payload: CoursePayload) => Promise<string | null>;
  onCancel: () => void;
  submitLabel: string;
  /** Quick-Action anchor target. Only the "add" form takes it — an edit form
   *  open at the same time would otherwise duplicate the id. */
  nameInputId?: string;
}) {
  const [name, setName] = useState(course?.name ?? "");
  const [semester, setSemester] = useState(course?.semester ?? "");
  const [credits, setCredits] = useState(course?.credits != null ? String(course.credits) : "");
  const [professor, setProfessor] = useState(course?.professor ?? "");
  const [email, setEmail] = useState(course?.professor_email ?? "");
  const [room, setRoom] = useState(course?.room ?? "");
  const [status, setStatus] = useState<CourseStatus>(course?.status ?? "enrolled");
  const [days, setDays] = useState<Weekday[]>(course ? scheduleDays(course) : []);
  const [start, setStart] = useState(course?.start_hour != null ? hourLabel(course.start_hour) : "");
  const [end, setEnd] = useState(course?.end_hour != null ? hourLabel(course.end_hour) : "");
  const [termStart, setTermStart] = useState(course?.term_start ?? "");
  const [termEnd, setTermEnd] = useState(course?.term_end ?? "");
  const [url, setUrl] = useState(course?.url ?? "");
  const [shortName, setShortName] = useState(course?.short_name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleDay(day: Weekday) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((d) => d !== day)
        : WEEKDAYS.filter((d) => d === day || current.includes(d))
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Never fail silently: say what is wrong and mark the offending field.
    if (!name.trim()) {
      setError("a course needs a name");
      return;
    }
    const creditValue = credits.trim() ? Number(credits) : null;
    if (creditValue !== null && (!Number.isFinite(creditValue) || creditValue < 0)) {
      setError("credits must be a number");
      return;
    }
    if ((start && parseHour(start) === null) || (end && parseHour(end) === null)) {
      setError("times must look like 08:00");
      return;
    }
    if (url.trim() && !/^https?:\/\//i.test(url.trim())) {
      setError("the course page must start with https://");
      return;
    }
    if (shortName.trim().length > 12) {
      setError("the short name must be 12 characters or fewer");
      return;
    }
    setError(null);
    setBusy(true);
    const failure = await onSubmit({
      name: name.trim(),
      semester: semester.trim() || null,
      credits: creditValue,
      professor: professor.trim() || null,
      professor_email: email.trim() || null,
      room: room.trim() || null,
      status,
      schedule_days: days,
      start_hour: start ? parseHour(start) : null,
      end_hour: end ? parseHour(end) : null,
      term_start: termStart || null,
      term_end: termEnd || null,
      url: url.trim() || null,
      short_name: shortName.trim() || null,
    });
    setBusy(false);
    if (failure) setError(failure);
  }

  return (
    <form
      onSubmit={submit}
      aria-busy={busy}
      className="rounded-lg border border-border bg-surface p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Labelled label="Course name" className="sm:col-span-2 lg:col-span-1">
          <input
            id={nameInputId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Advanced Topics in AI"
            aria-invalid={!!error && !name.trim()}
            className={field}
          />
        </Labelled>
        <Labelled label="Short name">
          <input
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            maxLength={12}
            // The placeholder is what the page will show if this is left blank,
            // so the user sees the fallback before deciding to override it.
            placeholder={courseCode({ name: name || "Advanced Topics in AI", short_name: null })}
            aria-invalid={!!error && shortName.trim().length > 12}
            className={field}
          />
        </Labelled>
        <Labelled label="Semester">
          <input
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder="F26"
            className={field}
          />
        </Labelled>
        <Labelled label="Credits">
          <input
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            inputMode="decimal"
            placeholder="6"
            className={`tabular ${field}`}
          />
        </Labelled>
        <Labelled label="Professor">
          <input value={professor} onChange={(e) => setProfessor(e.target.value)} className={field} />
        </Labelled>
        <Labelled label="Professor email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
        </Labelled>
        <Labelled label="Room">
          <input
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="HG E 1.1"
            className={field}
          />
        </Labelled>
        <Labelled label="Course page" className="sm:col-span-2 lg:col-span-3">
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://lms.example.edu/auth/RepositoryEntry/…"
            aria-invalid={!!error && !!url.trim() && !/^https?:\/\//i.test(url.trim())}
            className={field}
          />
        </Labelled>

        <Labelled label="Days" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {WEEKDAYS.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(d)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    on
                      ? "border-academic/40 bg-academic/10 text-academic"
                      : "border-border bg-raised text-muted hover:text-text"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </Labelled>
        <Labelled label="Time">
          <div className="flex items-center gap-1.5">
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              aria-label="start time"
              className={field}
            />
            <span className="text-xs text-faint">–</span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              aria-label="end time"
              className={field}
            />
          </div>
        </Labelled>

        <Labelled label="Term start">
          <input
            type="date"
            value={termStart}
            onChange={(e) => setTermStart(e.target.value)}
            className={field}
          />
        </Labelled>
        <Labelled label="Term end">
          <input
            type="date"
            value={termEnd}
            onChange={(e) => setTermEnd(e.target.value)}
            className={field}
          />
        </Labelled>
        <Labelled label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CourseStatus)}
            className={`${field} text-muted`}
          >
            {COURSE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Labelled>
      </div>

      <p className="mt-3 text-[11px] text-faint">
        Days and times describe the course. The class blocks you see on the timetable come from
        the recurring event in Google Calendar — this system never writes to it.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-academic/40 bg-academic/10 px-3 py-1.5 text-sm text-academic hover:border-academic/60"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-muted hover:text-text"
        >
          Cancel
        </button>
        {error && (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

function Labelled({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] text-faint">{label}</span>
      {children}
    </label>
  );
}
