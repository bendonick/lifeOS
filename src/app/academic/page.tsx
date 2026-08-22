import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Compass,
  FileText,
  GraduationCap,
  Zap,
} from "lucide-react";
import { Suspense } from "react";
import { AcademicTasks } from "@/components/academic/AcademicTasks";
import { CoursesSection } from "@/components/academic/CoursesSection";
import { RemindersCard } from "@/components/academic/RemindersCard";
import { CalendarTile, CalendarTileSkeleton } from "@/components/calendar/CalendarTile";
import { PageShell } from "@/components/ui/PageShell";
import { Tile } from "@/components/ui/Tile";
import { allCourses, creditTotals, type CreditTotals } from "@/lib/db/courses";
import { notesFor } from "@/lib/db/notes";
import { academicExams, academicWork } from "@/lib/db/tasks";
import { zurichToday } from "@/lib/dates";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";

// Layout (decision #57): the rail + bento of /personal, on the editorial theme.
// Same modules, same data — the rail cards and the banner sections are all
// `Tile`s now. Every main-column tile takes all twelve columns: courses,
// assignments and exams are wide tables and the timetable is a week grid, and
// none of them reads at half width.
export default function AcademicPage() {
  const today = zurichToday();
  const courses = allCourses();
  const work = academicWork();
  const exams = academicExams();
  const enrolled = courses.filter((c) => c.status === "enrolled");

  return (
    <PageShell
      page="Academic"
      title="Academic"
      subtitle="courses · deadlines · timetable"
    >
      {/* Rail + bento, matching /personal (decisions #50/#54/#57). The rail is
          the ways out of the page and the day's small state — course links,
          quick adds, reminders — and carries the Olive rail accent; the main
          column carries Academic's own lifted Merlot, so the two halves are
          told apart by temperature and the page stays distinguishable from
          Personal at a glance.

          Every module the banner layout had is here, unchanged: courses with
          the credit summary, assignments, exams, the timetable, reminders, the
          course links and the four quick-add anchors. */}
      <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
        <aside className="flex flex-col gap-6 self-start lg:sticky lg:top-28">
          <Tile id="nav" accent="hub" icon={<Compass size={16} />} title="Go to">
            <nav aria-label="Sections" className="flex flex-col gap-1.5 text-sm">
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
          </Tile>

          <Tile id="shortcuts" accent="hub" icon={<Zap size={16} />} title="Quick add">
            <div className="grid grid-cols-2 gap-1.5">
              <QuickAction href="#new-course" label="Course" />
              <QuickAction href="#new-assignment" label="Assignment" />
              <QuickAction href="#new-exam" label="Exam" />
              <QuickAction href="#new-reminder" label="Reminder" />
            </div>
          </Tile>

          {/* NotesCard brings its own shell, so it sits in the rail directly
              rather than inside a Tile — it would otherwise be a card in a card. */}
          <RemindersCard reminders={notesFor("academic", "reminder")} accent="hub" />
        </aside>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <Tile
            id="courses"
            accent="academic"
            icon={<GraduationCap size={16} />}
            title="Courses"
            caption="credits · not grades"
            meta={creditSummary(enrolled.length, creditTotals())}
            span="lg:col-span-12"
          >
            <CoursesSection courses={courses} />
          </Tile>

          <Tile
            id="assignments"
            accent="academic"
            icon={<ClipboardList size={16} />}
            title="Assignments & tasks"
            caption="due dates · days left"
            span="lg:col-span-12"
          >
            <AcademicTasks tasks={work} courses={courses} today={today} mode="work" frameless rows="cards" />
          </Tile>

          <Tile
            id="exams"
            accent="academic"
            icon={<FileText size={16} />}
            title="Exams"
            caption="dates as they are announced"
            span="lg:col-span-12"
          >
            <AcademicTasks tasks={exams} courses={courses} today={today} mode="exams" frameless rows="cards" />
          </Tile>

        </div>
      </div>

      {/* Outside the rail grid, at full page width (decision #28). The week grid
          has a 52rem floor and the main column beside a 19rem rail is narrower
          than that, so in there it scrolled and clipped Sunday. A week view you
          have to scroll is not a week view. */}
      <Tile
        id="timetable"
        accent="academic"
        icon={<CalendarDays size={16} />}
        title="Timetable"
        caption="blocked-off time · lives in Google Calendar"
      >
        <Suspense fallback={<CalendarTileSkeleton />}>
          <CalendarTile home="academic" />
        </Suspense>
      </Tile>
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
      className="rounded-md border border-border bg-raised px-2 py-1.5 text-center text-xs text-text transition-colors hover:border-hub/40"
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
