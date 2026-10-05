import { urgencyText } from "@/components/ui/accents";
import {
  horizonOf,
  nextHeavyWeek,
  weekOfTerm,
  weekRangeLabel,
  type CourseGroup,
  type SemesterMapModel,
  type Term,
} from "@/lib/academic/semester";
import type { CourseTask } from "@/lib/db/tasks";
import { dayLabel, daysLeftLabel, dueInfo } from "@/lib/dates";

/**
 * The rail's first module (decision #74): the day's small state for the term.
 * What is next, with a day count big enough to read from across the room; what
 * is behind, as a link into the list; how this week and next compare; the next
 * week that is heavier than usual; and where in the term we are.
 *
 * Every figure comes from the same helpers the tiles below use, so the rail
 * and the map cannot disagree. Server component — a read and a render.
 *
 * The overdue item is also named in the list and under the timetable. It stays
 * here because the rail is the summary level and this is the one line on the
 * page that changes what you do next; it is a link so the repetition at least
 * takes you there.
 */
export function AcademicNow({
  work,
  exams,
  groups,
  today,
  map,
  term,
}: {
  work: CourseTask[];
  exams: CourseTask[];
  groups: CourseGroup[];
  today: string;
  map: SemesterMapModel | null;
  term: Term | null;
}) {
  const codeOf = new Map<number, string>();
  for (const g of groups) for (const id of g.ids) codeOf.set(id, g.code);
  const code = (t: CourseTask) => (t.course_id != null ? (codeOf.get(t.course_id) ?? t.course_name) : null);

  const open = work.filter((t) => !t.done);
  const next = [...open, ...exams.filter((e) => !e.done)]
    .filter((t) => t.due && t.due.slice(0, 10) >= today)
    .sort((a, b) => a.due!.localeCompare(b.due!))[0];
  const overdue = open.filter((t) => t.due && t.due.slice(0, 10) < today);
  const thisWeek = open.filter((t) => ["today", "week"].includes(horizonOf(t.due, today))).length;
  const nextWeek = open.filter((t) => horizonOf(t.due, today) === "next").length;
  const heavy = map ? nextHeavyWeek(map) : null;
  const peak = map && map.peak >= 0 ? { monday: map.weeks[map.peak].monday, count: map.counts[map.peak] } : null;
  const weekNo = term ? weekOfTerm(term, today) : null;
  const semester = groups.find((g) => g.status === "enrolled")?.semester;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="t-eyebrow text-faint">Next</div>
        {next ? (
          <>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span className={`t-metric text-2xl ${urgencyText[dueInfo(next.due!).urgency]}`}>
                {daysLeftLabel(next.due!)}
              </span>
              <a
                href={next.type === "exam" ? "#exams" : "#assignments"}
                className="truncate rounded text-sm text-text transition-colors hover:text-academic"
              >
                {next.title}
              </a>
            </div>
            <div className="tabular mt-0.5 text-xs text-muted">
              {[code(next), dueInfo(next.due!).label].filter(Boolean).join(" · ")}
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">Nothing due.</p>
        )}
      </div>

      <ul className="flex flex-col gap-1.5 border-t border-border pt-2.5 text-sm">
        {overdue.length > 0 && (
          <li>
            <a href="#assignments" className={`rounded transition-colors hover:underline ${urgencyText.overdue}`}>
              {overdue.length} overdue · {overdue[0].title}
              {code(overdue[0]) && ` · ${code(overdue[0])}`}
              <span aria-hidden="true" className="text-faint">
                {" "}
                →
              </span>
            </a>
          </li>
        )}
        <li className="text-muted">
          {thisWeek} due this week · {nextWeek} next week
        </li>
        {heavy && (
          <li className="text-muted">
            Next heavy week · {weekRangeLabel(heavy.monday)} · {heavy.count} due
          </li>
        )}
        {peak && peak.monday !== heavy?.monday && (
          <li className="text-xs text-faint">
            peak {weekRangeLabel(peak.monday)} · {peak.count} due
          </li>
        )}
      </ul>

      {term && weekNo && (
        <div className="border-t border-border pt-2.5">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-text">
              {semester ? `${semester} · ` : ""}week {weekNo} of {term.weeks}
            </span>
            <span className="text-muted">ends {dayLabel(term.end)}</span>
          </div>
          <div
            role="progressbar"
            aria-label="week of term"
            aria-valuemin={1}
            aria-valuemax={term.weeks}
            aria-valuenow={weekNo}
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-track"
          >
            <div className="h-full rounded-full bg-hub" style={{ width: `${Math.round((weekNo / term.weeks) * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
