"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { AcademicTasks } from "@/components/academic/AcademicTasks";
import { Disclosure } from "@/components/ui/Disclosure";
import { courseCode, weekRangeLabel } from "@/lib/academic/semester";
import type { CourseTask } from "@/lib/db/tasks";
import { dayLabel } from "@/lib/dates";
import type { Course } from "@/lib/types";

/**
 * Exams as secondary context beside Upcoming work (decision #80): the nearest
 * exam in full — course, date, time — and the rest behind "N more exams", where
 * every exam keeps its done box and the add form the `+ Add` menu reaches by
 * hash. No countdown numerals: the header's "First in N days" is the one.
 *
 * Under it, the next busy week — the same count and threshold the semester
 * map draws, so the two can never disagree — with the term's peak and end as a
 * quiet second line. Hidden when no future week qualifies.
 */
export function ExamsPanel({
  exams,
  courses,
  today,
  nextBusy,
  peak,
  termEnd,
}: {
  exams: CourseTask[];
  courses: Course[];
  today: string;
  nextBusy: { monday: string; count: number } | null;
  peak: { monday: string; count: number } | null;
  termEnd: string | null;
}) {
  const codes = new Map(courses.map((c) => [c.id, courseCode(c)] as const));
  const open = exams
    .filter((e) => !e.done && e.due)
    .sort((a, b) => a.due!.localeCompare(b.due!));
  const first = open[0];
  const rest = open.length - 1;

  return (
    <div className="flex flex-col">
      {first ? (
        <div>
          {first.course_id != null ? (
            <Link
              href={`/academic/courses/${first.course_id}`}
              title={first.title}
              className="rounded text-lg font-semibold text-text transition-colors hover:text-academic"
            >
              {codes.get(first.course_id) ?? first.course_name}
            </Link>
          ) : (
            <span className="text-lg font-semibold text-text">{first.title}</span>
          )}
          <p className="tabular mt-0.5 text-sm text-muted">
            {dayLabel(first.due!.slice(0, 10))}
            {first.due!.length > 10 && ` · ${first.due!.slice(11, 16)}`}
            {first.course_id != null && <span className="text-faint"> · {first.title}</span>}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">No exams scheduled.</p>
      )}

      {open.length > 0 ? (
        <Disclosure
          summary={rest > 0 ? `${rest} more ${rest === 1 ? "exam" : "exams"}` : "Exam details"}
          anchors={["new-exam"]}
          className="mt-3"
        >
          <AcademicTasks tasks={exams} courses={courses} today={today} mode="exams" frameless addTrigger={false} />
        </Disclosure>
      ) : (
        <div className="mt-1">
          <AcademicTasks tasks={exams} courses={courses} today={today} mode="exams" frameless addTrigger={false} />
        </div>
      )}

      {nextBusy && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="t-serif flex items-center gap-2 text-base leading-none text-academic">
            <CalendarDays size={14} aria-hidden="true" className="opacity-80" />
            Next busy week
          </h3>
          <p className="tabular mt-2 text-sm text-muted">
            {weekRangeLabel(nextBusy.monday)} · {nextBusy.count} due
          </p>
          {(peak && peak.monday !== nextBusy.monday) || termEnd ? (
            <p className="tabular mt-0.5 text-xs text-faint">
              {peak && peak.monday !== nextBusy.monday && `peak ${weekRangeLabel(peak.monday)} · ${peak.count} due`}
              {peak && peak.monday !== nextBusy.monday && termEnd && " · "}
              {termEnd && `term ends ${dayLabel(termEnd)}`}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
