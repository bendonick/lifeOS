import { StudyProgressList } from "./StudyProgressList";
import type { CourseGroup } from "@/lib/academic/semester";
import { studyProgress } from "@/lib/academic/study";
import { calendarWindow } from "@/lib/calendar/ics";
import { studyLogs } from "@/lib/db/study";
import type { CourseTask } from "@/lib/db/tasks";
import { addDays, zurichToday } from "@/lib/dates";

/**
 * Study progress (decisions #97, #98): one bar per course that ends at its
 * exam. The Exam Prep calendar decides how many segments a bar has (study
 * sessions, and mock exams in their place among them); the user's own log
 * fills them. Every bar starts empty.
 *
 * Server component: it reads the plan from the calendar, from the term's start
 * to the day after the last exam (the ICS cache is shared with the timetable,
 * so this adds no Google request), and the log from the database. Logging and
 * deleting happen in `StudyProgressList`.
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
  const today = zurichToday();
  const lastExam = exams
    .filter((e) => !e.done && e.due)
    .map((e) => e.due!.slice(0, 10))
    .sort()
    .at(-1);
  const from = termStart && termStart < today ? termStart : addDays(today, -120);
  const to = addDays(lastExam && lastExam > today ? lastExam : addDays(today, 120), 1);
  const data = await calendarWindow(from, to);
  const feed = data.feeds.find((f) => f.key === "examPrep");
  const courses = studyProgress(data.events, groups, exams, studyLogs(), today);

  return (
    <div>
      {(!feed || feed.state === "unconfigured") && (
        <p className="mb-2 text-sm text-muted">
          Add the Exam Prep calendar (<code className="text-xs">ICS_URL_EXAM_PREP</code> in{" "}
          <code className="text-xs">.env</code>) to plan sessions toward each exam.
        </p>
      )}
      {feed && (feed.state === "stale" || feed.state === "error") && (
        <p role="status" className="mb-2 text-sm text-warn">
          {feed.state === "stale"
            ? "The Exam Prep calendar could not refresh; the plan is from the last copy."
            : "The Exam Prep calendar could not load, so the plan is missing."}
        </p>
      )}
      {courses.length === 0 ? (
        <p className="text-muted">No exams or study sessions yet.</p>
      ) : (
        <StudyProgressList courses={courses} today={today} />
      )}
    </div>
  );
}
