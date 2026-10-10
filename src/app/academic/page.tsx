import { BookOpen, CalendarDays, ClipboardList, FileText, Map as MapIcon } from "lucide-react";
import { Suspense } from "react";
import { AcademicTasks } from "@/components/academic/AcademicTasks";
import { AddMenu } from "@/components/academic/AddMenu";
import { CoursesSection } from "@/components/academic/CoursesSection";
import { ExamsPanel } from "@/components/academic/ExamsPanel";
import { NavRail } from "@/components/academic/NavRail";
import { RemindersCard } from "@/components/academic/RemindersCard";
import { SemesterMap } from "@/components/academic/SemesterMap";
import { CalendarTile, CalendarTileSkeleton } from "@/components/calendar/CalendarTile";
import { Tile } from "@/components/ui/Tile";
import {
  firstExamLabel,
  groupCourses,
  horizonOf,
  hoursLabel,
  semesterLabel,
  semesterMap,
  termOf,
  totalCredits,
  weekOfTerm,
  weeklyHours,
  type CourseGroup,
} from "@/lib/academic/semester";
import { allCourses } from "@/lib/db/courses";
import { notesFor } from "@/lib/db/notes";
import { academicExams, academicWork, openDeadlines } from "@/lib/db/tasks";
import { dayLabel, zurichToday } from "@/lib/dates";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";
export const metadata = { title: "Academic" };

// Layout (decision #78): a slim navigation rail beside the page, one `+ Add`
// menu in the header, and four modules in the order the eye needs them —
// Semester (the term's shape), Upcoming work beside Exams (what needs action,
// and its context), Courses (reference), then the timetable at full width
// (#28/#58/#73) and the reminders list the rail links to. No rail of modules:
// what they carried moved into the page or the menu.
export default function AcademicPage() {
  const today = zurichToday();
  const courses = allCourses();
  const work = academicWork();
  const exams = academicExams();
  const deadlines = openDeadlines("academic");
  const reminders = notesFor("academic", "reminder");

  const groups = groupCourses(courses);
  const enrolled = groups.filter((g) => g.status === "enrolled");
  const term = termOf(groups);
  const map = semesterMap(groups, work, exams, today, term);
  const weekNo = term ? weekOfTerm(term, today) : null;
  const semester = semesterLabel(enrolled[0]?.semester ?? groups[0]?.semester);

  const open = work.filter((t) => !t.done);
  const thisWeek = open.filter((t) => ["today", "week"].includes(horizonOf(t.due, today))).length;
  const nextWeek = open.filter((t) => horizonOf(t.due, today) === "next").length;
  const firstExam = exams
    .filter((e) => !e.done && e.due)
    .map((e) => e.due!)
    .sort()[0];
  const pending = reminders.filter((n) => !n.reviewed).length;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[13rem_minmax(0,1fr)]">
      <NavRail reminders={pending} weekNo={weekNo} weeks={term?.weeks ?? null} termEnd={term ? dayLabel(term.end) : null} />

      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="t-serif text-3xl font-semibold tracking-tight">Academic</h1>
            {semester && <p className="text-sm text-muted">{semester}</p>}
          </div>
          <AddMenu />
        </header>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* The hero. Absent until a course carries a term start — a map with
              no axis is not a map. */}
          {map && (
            <Tile
              id="semester"
              accent="academic"
              frame="quiet"
              icon={<MapIcon size={16} />}
              title="Semester"
              meta={`${map.open} open · ${map.completed} completed · ${map.exams} ${map.exams === 1 ? "exam" : "exams"}`}
              span="lg:col-span-12"
            >
              <SemesterMap model={map} />
            </Tile>
          )}

          <Tile
            id="assignments"
            accent="academic"
            frame="quiet"
            icon={<ClipboardList size={16} />}
            title="Upcoming work"
            meta={`${thisWeek} this week · ${nextWeek} next week`}
            span="lg:col-span-12 xl:col-span-8"
          >
            <AcademicTasks tasks={work} courses={courses} today={today} mode="work" frameless addTrigger={false} />
          </Tile>

          <Tile
            id="exams"
            accent="academic"
            frame="quiet"
            icon={<FileText size={16} />}
            title="Exams"
            meta={firstExam ? firstExamLabel(firstExam, today) : undefined}
            span="lg:col-span-12 xl:col-span-4"
          >
            <ExamsPanel
              exams={exams}
              courses={courses}
              today={today}
              nextBusy={map?.nextBusy ?? null}
              peak={map?.peak ?? null}
              termEnd={term?.end ?? null}
            />
          </Tile>

          <Tile
            id="courses"
            accent="academic"
            frame="quiet"
            icon={<BookOpen size={16} />}
            title="Courses"
            meta={courseSummary(enrolled)}
            span="lg:col-span-12"
          >
            <CoursesSection courses={courses} />
          </Tile>

          {/* Full width, with a 52rem floor inside its own scroll container
              (decision #28/#58). Open by default on this page (#73): the grid
              carries the deadlines in a due strip and lists them beneath. */}
          <Tile
            id="timetable"
            accent="academic"
            frame="quiet"
            icon={<CalendarDays size={16} />}
            title="Timetable"
            span="lg:col-span-12"
          >
            <Suspense fallback={<CalendarTileSkeleton />}>
              <CalendarTile home="academic" deadlines={deadlines} expanded />
            </Suspense>
          </Tile>

          {/* The rail's Reminders link lands here. NotesCard brings its own
              shell, so it is not wrapped in a Tile. */}
          <div id="reminders" className="scroll-mt-24 lg:col-span-5">
            <RemindersCard reminders={reminders} accent="hub" />
          </div>
        </div>
      </main>
    </div>
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
