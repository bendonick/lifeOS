"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { AcademicTasks } from "@/components/academic/AcademicTasks";
import { Disclosure } from "@/components/ui/Disclosure";
import { courseCode } from "@/lib/academic/semester";
import type { CourseTask } from "@/lib/db/tasks";
import { dayLabel } from "@/lib/dates";
import type { Course } from "@/lib/types";

/**
 * Exams as secondary context beside Upcoming work (decisions #80, #93): the
 * nearest exam in full — course, title, date, time — and the rest behind "N
 * more exams", where every exam keeps its done box and the add form the
 * `+ Add` menu reaches by hash.
 *
 * The panel ends there. The "Next busy week" block that used to follow was
 * removed at the user's ask (#93): the weekly load lives in the semester map,
 * in one place.
 */
export function ExamsPanel({ exams, courses, today }: { exams: CourseTask[]; courses: Course[]; today: string }) {
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
              className="inline-flex min-h-6 items-center rounded text-lg font-bold text-text underline-offset-4 hover:underline"
            >
              {codes.get(first.course_id) ?? first.course_name}
            </Link>
          ) : (
            <span className="text-lg font-bold text-text">{first.title}</span>
          )}
          {first.course_id != null && (
            <p className="text-text">
              {first.course_name}
              {first.title && first.title !== first.course_name && <span className="text-muted"> · {first.title}</span>}
            </p>
          )}
          <p className="tabular mt-1.5 inline-flex items-center gap-2 text-danger">
            <Calendar size={16} aria-hidden="true" />
            {dayLabel(first.due!.slice(0, 10))}
            {first.due!.length > 10 && ` · ${first.due!.slice(11, 16)}`}
          </p>
        </div>
      ) : (
        <p className="text-muted">No exams scheduled.</p>
      )}

      {open.length > 0 ? (
        <Disclosure
          summary={rest > 0 ? `${rest} more ${rest === 1 ? "exam" : "exams"}` : "Exam details"}
          anchors={["new-exam"]}
          className="mt-3 border-t border-border pt-2"
        >
          <AcademicTasks tasks={exams} courses={courses} today={today} mode="exams" frameless addTrigger={false} />
        </Disclosure>
      ) : (
        <div className="mt-1">
          <AcademicTasks tasks={exams} courses={courses} today={today} mode="exams" frameless addTrigger={false} />
        </div>
      )}
    </div>
  );
}
