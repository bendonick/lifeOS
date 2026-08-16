import Link from "next/link";
import { Suspense } from "react";
import { AcademicTasks } from "@/components/academic/AcademicTasks";
import { CoursesSection } from "@/components/academic/CoursesSection";
import { RemindersCard } from "@/components/academic/RemindersCard";
import { ScheduleCheckSection } from "@/components/academic/ScheduleCheckSection";
import { TimetableTodo } from "@/components/academic/TimetableTodo";
import { CalendarSection, CalendarSkeleton } from "@/components/calendar/CalendarSection";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { allCourses, creditTotals, type CreditTotals } from "@/lib/db/courses";
import { notesFor } from "@/lib/db/notes";
import { academicExams, academicWork } from "@/lib/db/tasks";
import { zurichToday } from "@/lib/dates";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";

// Layout per docs/02-design-system.md: narrow left rail of stacked cards, wide
// main column of banner+caption sections, and the timetable full-width below —
// the command center needs the room for a week grid beside its task list.
export default function AcademicPage() {
  const today = zurichToday();
  const courses = allCourses();
  const work = academicWork();
  const exams = academicExams();
  const enrolled = courses.filter((c) => c.status === "enrolled");
  // Two already-sorted lists concatenated are not one sorted list — the command
  // center promises "soonest first", so merge them properly, undated last.
  const openWork = [...work, ...exams]
    .filter((t) => !t.done)
    .sort((a, b) => Number(!a.due) - Number(!b.due) || (a.due ?? "").localeCompare(b.due ?? "") || a.id - b.id);

  return (
    <PageShell page="Academic" title="Academic" subtitle="courses · deadlines · timetable">
      <div className="grid gap-10 lg:grid-cols-[15rem_1fr]">
        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-28">
          <Card label="Quick Actions" accent="hub">
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <QuickAction href="#new-course" label="Course" />
              <QuickAction href="#new-assignment" label="Assignment" />
              <QuickAction href="#new-exam" label="Exam" />
              <QuickAction href="#new-reminder" label="Reminder" />
            </div>
          </Card>

          <Card label="Navigation" accent="hub">
            <nav aria-label="Sections" className="mt-3 flex flex-col gap-1.5 text-sm">
              {enrolled.length > 0 && (
                <>
                  {enrolled.map((c) => (
                    <Link
                      key={c.id}
                      href={`/academic/courses/${c.id}`}
                      className="truncate text-muted transition-colors hover:text-text"
                    >
                      {c.name} →
                    </Link>
                  ))}
                  <span aria-hidden="true" className="my-1 border-t border-border" />
                </>
              )}
              <NavLink href="/" label="LifeOS" />
              <NavLink href="/personal" label="Personal" />
              <NavLink href="/professional" label="Professional" />
            </nav>
          </Card>

          <RemindersCard reminders={notesFor("academic", "reminder")} />
        </aside>

        <div className="flex flex-col gap-10">
          <section id="courses" aria-labelledby="courses-title">
            <SectionBanner
              id="courses-title"
              accent="academic"
              title="Courses"
              caption="credits · not grades"
              meta={creditSummary(enrolled.length, creditTotals())}
            />
            <div className="mt-4">
              <CoursesSection courses={courses} />
            </div>
          </section>

          <section id="assignments" aria-labelledby="assignments-title">
            <SectionBanner
              id="assignments-title"
              accent="academic"
              title="Assignments & tasks"
              caption="due dates · days left"
            />
            <div className="mt-4">
              <AcademicTasks tasks={work} courses={courses} today={today} mode="work" />
            </div>
          </section>

          <section id="exams" aria-labelledby="exams-title">
            <SectionBanner
              id="exams-title"
              accent="academic"
              title="Exams"
              caption="dates as they are announced"
            />
            <div className="mt-4">
              <AcademicTasks tasks={exams} courses={courses} today={today} mode="exams" />
            </div>
          </section>
        </div>
      </div>

      <section id="timetable" aria-labelledby="timetable-title">
        <SectionBanner
          id="timetable-title"
          accent="academic"
          title="Timetable"
          caption="blocked-off time · lives in Google Calendar · pick work from the list beside it"
        />
        {/* min-w-0: without it the 1fr track inherits the week grid's 52rem
            min-content width, the tracks overrun the section, and the side
            column hangs off the right edge. */}
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <Suspense fallback={<CalendarSkeleton />}>
              <CalendarSection home="academic" />
            </Suspense>
          </div>
          <div className="flex flex-col gap-4">
            <TimetableTodo tasks={openWork} />
            <Suspense fallback={null}>
              <ScheduleCheckSection courses={courses} />
            </Suspense>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

/** Replaces the two credit cards that used to head the section — same two
 *  numbers, one line. "earned" only appears once a course is actually completed:
 *  a standing "0 earned" in month one is noise, not information. */
function creditSummary(courseCount: number, credits: CreditTotals): string {
  const parts = [
    `${courseCount} ${courseCount === 1 ? "course" : "courses"}`,
    `${credits.enrolled} credits`,
  ];
  if (credits.completed > 0) parts.push(`${credits.completed} earned`);
  return parts.join(" · ");
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-md border border-border bg-raised px-2 py-1.5 text-center text-xs text-text transition-colors hover:border-academic/40"
    >
      + {label}
    </a>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-muted transition-colors hover:text-text">
      {label}
    </Link>
  );
}
