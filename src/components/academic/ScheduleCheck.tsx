import { googleEventPlan } from "@/lib/academic/gcal";
import type { ScheduleCheck as Check } from "@/lib/academic/drift";
import type { Course } from "@/lib/types";
import { dayLabel } from "@/lib/dates";

/**
 * Does Google hold the class blocks these courses claim? (decision #27)
 *
 * Sits under the timetable because that is where a missing class is felt. Tones
 * stay neutral on purpose: a schedule mismatch is a discrepancy to look at, not
 * a deadline, and warm colours in this system mean urgency only.
 */
export function ScheduleCheck({ checks, courses }: { checks: Check[]; courses: Course[] }) {
  if (checks.length === 0) return null;

  const byId = new Map(courses.map((c) => [c.id, c]));
  const problems = checks.filter((c) => c.state === "missing" || c.state === "moved");
  const okCount = checks.filter((c) => c.state === "ok").length;
  const unknown = checks.filter((c) => c.state === "unknown");
  // The denominator counts what was actually compared — "0 of 1" reads as a
  // failure when the one course simply had nothing to check against.
  const checked = checks.length - unknown.length;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs font-medium text-academic">Schedule check</div>
      <p className="mt-1 text-xs text-muted">
        {checked === 0
          ? "nothing to compare yet"
          : `${okCount} of ${checked} ${checked === 1 ? "course matches" : "courses match"} the Academic calendar`}
        {unknown.length > 0 && ` · ${unknown.length} not checked`}
      </p>

      <ul className="mt-3 space-y-2.5">
        {checks.map((check) => {
          const course = byId.get(check.courseId);
          const plan = course ? googleEventPlan(course) : null;
          return (
            <li key={check.courseId} className="text-xs">
              <div className="flex items-baseline gap-1.5">
                <span aria-hidden="true" className={dotClass[check.state]} />
                <span className="text-text">{check.courseName}</span>
                <span className="sr-only">{stateWord[check.state]}</span>
              </div>
              <p className="mt-0.5 pl-3.5 text-faint">{check.detail}</p>
              {check.state === "missing" && plan && (
                <p className="mt-1 pl-3.5">
                  <a
                    href={plan.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Opens Google with ${plan.summary} prefilled — pick the Academic calendar, then Save.`}
                    className="rounded text-muted underline decoration-border underline-offset-2 hover:text-text"
                  >
                    add it to Google →
                  </a>
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {problems.length > 0 && (
        <p className="mt-3 border-t border-border pt-2 text-[11px] text-faint">
          Google owns these events — fix them there and this list follows. The check looks at{" "}
          {checks[0].probeWeek ? `the week of ${dayLabel(checks[0].probeWeek)}` : "the term week"}.
        </p>
      )}
    </div>
  );
}

const dotClass: Record<Check["state"], string> = {
  ok: "mt-1 inline-block size-1.5 shrink-0 rounded-full bg-academic",
  moved: "mt-1 inline-block size-1.5 shrink-0 rounded-full bg-muted",
  missing: "mt-1 inline-block size-1.5 shrink-0 rounded-full border border-muted",
  unknown: "mt-1 inline-block size-1.5 shrink-0 rounded-full border border-border",
};

const stateWord: Record<Check["state"], string> = {
  ok: "matches the calendar",
  moved: "differs from the calendar",
  missing: "not in the calendar",
  unknown: "not checked",
};
