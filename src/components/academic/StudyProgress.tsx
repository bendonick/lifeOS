import Link from "next/link";
import type { CourseGroup } from "@/lib/academic/semester";
import { studyProgress, type CourseStudy } from "@/lib/academic/study";
import { calendarWindow } from "@/lib/calendar/ics";
import type { CourseTask } from "@/lib/db/tasks";
import { addDays, dayLabel, zurichLocal } from "@/lib/dates";

/**
 * Study progress (decision #97): one bar per course that ends at its exam.
 * Each Exam Prep session is one equal segment, filled once the session is
 * over, so every bar reads as "how much of the plan is behind me" and the
 * courses compare at a glance whatever their number of sessions. Mock and past
 * exams are outlined segments in the same row. Counted in sessions, never
 * hours: nothing is logged by hand.
 *
 * Server component: it fetches its own window, from the term's start to the
 * day after the last exam. The ICS cache is shared with the timetable, so this
 * adds no Google request.
 */
export async function StudyProgress({
  groups,
  exams,
  termStart,
}: {
  groups: CourseGroup[];
  exams: CourseTask[];
  termStart: string | null;
}) {
  const now = zurichLocal(new Date());
  const today = now.slice(0, 10);
  const lastExam = exams
    .filter((e) => !e.done && e.due)
    .map((e) => e.due!.slice(0, 10))
    .sort()
    .at(-1);
  const from = termStart && termStart < today ? termStart : addDays(today, -120);
  const to = addDays(lastExam && lastExam > today ? lastExam : addDays(today, 120), 1);
  const data = await calendarWindow(from, to);
  const feed = data.feeds.find((f) => f.key === "examPrep");

  if (!feed || feed.state === "unconfigured") {
    return (
      <p className="text-muted">
        Add the Exam Prep calendar (<code className="text-sm">ICS_URL_EXAM_PREP</code> in{" "}
        <code className="text-sm">.env</code>) to see study progress.
      </p>
    );
  }

  const courses = studyProgress(data.events, groups, exams, now);
  if (courses.length === 0) {
    return <p className="text-muted">No exams or study sessions yet.</p>;
  }

  return (
    <div>
      {feed.state !== "ok" && (
        <p role="status" className="mb-2 text-sm text-warn">
          {feed.state === "stale"
            ? "The Exam Prep calendar could not refresh; showing the last copy."
            : "The Exam Prep calendar could not load."}
        </p>
      )}
      <ul className="border-t border-border">
        {courses.map((c) => (
          <CourseRow key={c.code} course={c} />
        ))}
      </ul>
      <Legend />
    </div>
  );
}

function CourseRow({ course: c }: { course: CourseStudy }) {
  const total = c.sessions.length;
  const when = examWhen(c);

  return (
    // Phone: code and exam on one line, the bar full width beneath. From `sm`:
    // code | bar | exam, the exam sitting where the bar ends.
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-border py-3.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_10.5rem]">
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

      {total > 0 ? (
        <div
          role="img"
          aria-label={`${c.code}: ${c.done} of ${total} sessions done${c.exam ? `, exam ${dayLabel(c.exam.slice(0, 10))}` : ""}`}
          className="col-span-2 flex h-[22px] gap-[2px] sm:col-span-1 sm:col-start-2 sm:row-start-1"
        >
          {c.sessions.map((s) => (
            <span key={s.id} className="study-seg flex-1" data-state={s.state} data-kind={s.kind} />
          ))}
        </div>
      ) : (
        <div className="col-span-2 flex h-[22px] items-center rounded-sm border border-dashed border-border-strong px-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
          <span className="truncate text-xs text-muted">No sessions in the Exam Prep calendar</span>
        </div>
      )}

      <p className="tabular col-span-2 text-sm text-muted sm:col-span-1 sm:col-start-2 sm:row-start-2">
        {c.done} of {total} {total === 1 ? "session" : "sessions"}
      </p>
    </li>
  );
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
  const items = [
    { label: "Done", state: "done", kind: "study" },
    { label: "Planned", state: "ahead", kind: "study" },
    { label: "Mock or past exam", state: "ahead", kind: "practice" },
    { label: "Happening now", state: "now", kind: "study" },
  ];
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="study-seg h-3 w-3.5" data-state={i.state} data-kind={i.kind} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
