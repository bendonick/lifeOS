import Link from "next/link";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  Compass,
  FileText,
  GraduationCap,
  Map as MapIcon,
  Zap,
} from "lucide-react";
import { Suspense } from "react";
import { AcademicNow } from "@/components/academic/AcademicNow";
import { AcademicTasks } from "@/components/academic/AcademicTasks";
import { CoursesSection } from "@/components/academic/CoursesSection";
import { RemindersCard } from "@/components/academic/RemindersCard";
import { SemesterMap } from "@/components/academic/SemesterMap";
import { CalendarTile, CalendarTileSkeleton } from "@/components/calendar/CalendarTile";
import { PageShell } from "@/components/ui/PageShell";
import { Tile } from "@/components/ui/Tile";
import {
  groupCourses,
  hoursLabel,
  semesterMap,
  termOf,
  totalCredits,
  weeklyHours,
  type CourseGroup,
} from "@/lib/academic/semester";
import { allCourses } from "@/lib/db/courses";
import { notesFor } from "@/lib/db/notes";
import { academicExams, academicWork, openDeadlines } from "@/lib/db/tasks";
import { daysLeftLabel, zurichToday } from "@/lib/dates";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";
export const metadata = { title: "Academic" };

// Layout (decisions #57, #74, #75): the rail + bento of /personal on the
// editorial theme. The rail carries the term's standing state — what is next,
// the exams, the ways out, quick adds, reminders — in the constant Olive. The
// main column carries Academic's lifted Merlot and has a subject now: the
// semester map leads, the course cards and the horizon list follow, and the
// timetable keeps its full-width place outside the rail grid (#28/#58/#73).
export default function AcademicPage() {
  const today = zurichToday();
  const courses = allCourses();
  const work = academicWork();
  const exams = academicExams();
  const deadlines = openDeadlines("academic");

  const groups = groupCourses(courses);
  const enrolled = groups.filter((g) => g.status === "enrolled");
  const term = termOf(groups);
  const map = semesterMap(groups, work, exams, today, term);

  const openWork = work.filter((t) => !t.done).length;
  const doneWork = work.filter((t) => t.done).length;
  const openExams = exams.filter((e) => !e.done);
  const firstExam = openExams.map((e) => e.due).filter((d): d is string => !!d).sort()[0];

  return (
    <PageShell page="Academic" title="Academic" subtitle="courses · deadlines · timetable">
      <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
        <aside className="flex flex-col gap-6 self-start lg:sticky lg:top-28">
          <Tile id="now" accent="hub" icon={<Activity size={16} />} title="Now">
            <AcademicNow work={work} exams={exams} groups={groups} today={today} map={map} term={term} />
          </Tile>

          {/* Exams are the term's fixed points, not the day's work, so they live
              with the page's standing state in the rail (decision #75). */}
          <Tile
            id="exams"
            accent="hub"
            icon={<FileText size={16} />}
            title="Exams"
            meta={firstExam ? `first in ${daysLeftLabel(firstExam)}` : undefined}
          >
            <AcademicTasks tasks={exams} courses={courses} today={today} mode="exams" layout="rail" />
          </Tile>

          <Tile id="nav" accent="hub" icon={<Compass size={16} />} title="Go to">
            <nav aria-label="Sections" className="flex flex-col gap-1.5 text-sm">
              {enrolled.length > 0 && (
                <>
                  {enrolled.map((g) => (
                    <Link
                      key={g.key}
                      href={`/academic/courses/${g.ids[0]}`}
                      title={g.name}
                      className="flex items-center justify-between gap-2 text-muted transition-colors hover:text-text"
                    >
                      <span className="truncate">{g.code}</span>
                      <span aria-hidden="true" className="text-faint">
                        →
                      </span>
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
          {/* The hero. Absent until a course carries a term start — a map with
              no axis is not a map. */}
          {map && (
            <Tile
              id="semester"
              accent="academic"
              icon={<MapIcon size={16} />}
              title="Semester"
              meta={`${openWork} open · ${doneWork} done · ${openExams.length} ${openExams.length === 1 ? "exam" : "exams"}`}
              span="lg:col-span-12"
            >
              <SemesterMap model={map} />
            </Tile>
          )}

          <Tile
            id="courses"
            accent="academic"
            icon={<GraduationCap size={16} />}
            title="Courses"
            meta={courseSummary(enrolled)}
            span="lg:col-span-12"
          >
            <CoursesSection courses={courses} />
          </Tile>

          <Tile
            id="assignments"
            accent="academic"
            icon={<ClipboardList size={16} />}
            title="Assignments & tasks"
            span="lg:col-span-12"
          >
            <AcademicTasks tasks={work} courses={courses} today={today} mode="work" frameless rows="cards" />
          </Tile>
        </div>
      </div>

      {/* Outside the rail grid, at full page width (decision #28). The week grid
          has a 52rem floor and the main column beside a 19rem rail is narrower
          than that, so in there it scrolled and clipped Sunday. A week view you
          have to scroll is not a week view.

          Open by default here, alone among the four pages (decision #73): the
          grid carries the page's deadlines in a due strip and lists them
          beneath, so it is the week's work and not empty rows. */}
      <Tile id="timetable" accent="academic" icon={<CalendarDays size={16} />} title="Timetable">
        <Suspense fallback={<CalendarTileSkeleton />}>
          <CalendarTile home="academic" deadlines={deadlines} expanded />
        </Suspense>
      </Tile>
    </PageShell>
  );
}

/** The header's one line of totals: courses counted once each, credits summed
 *  once per course (a two-slot course is not twelve credits), contact hours a
 *  week. "earned" appears only once a course is actually completed — a standing
 *  "0 earned" in month one is noise, not information. */
function courseSummary(enrolled: CourseGroup[]): string {
  const parts = [
    `${enrolled.length} ${enrolled.length === 1 ? "course" : "courses"}`,
    `${totalCredits(enrolled)} credits`,
  ];
  const hours = weeklyHours(enrolled);
  if (hours > 0) parts.push(`${hoursLabel(hours)} h/week`);
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
