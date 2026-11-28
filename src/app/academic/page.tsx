import type { Viewport } from "next";
import { Suspense } from "react";
import { AcademicTasks } from "@/components/academic/AcademicTasks";
import { CoursesSection } from "@/components/academic/CoursesSection";
import { ExamsPanel } from "@/components/academic/ExamsPanel";
import { RemindersCard } from "@/components/academic/RemindersCard";
import { SemesterMap } from "@/components/academic/SemesterMap";
import { StudyProgress } from "@/components/academic/StudyProgress";
import { CalendarTile, CalendarTileSkeleton } from "@/components/calendar/CalendarTile";
import { AddMenu } from "@/components/ui/AddMenu";
import { newsreader } from "@/components/ui/fonts";
import { PageMasthead } from "@/components/ui/PageMasthead";
import { RuledSection } from "@/components/ui/RuledSection";
import { SiteNav } from "@/components/ui/SiteNav";
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
import { getArtworkPin } from "@/lib/db/overview";
import { academicExams, academicWork, openDeadlines } from "@/lib/db/tasks";
import { zurichToday } from "@/lib/dates";
import { dailyArtwork } from "@/lib/overview/artwork";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";
export const metadata = { title: "Academic" };

// A Maritime page (decision #91): light, like the Overview.
export const viewport: Viewport = { themeColor: "#efdfbb", colorScheme: "light" };

// Layout (decisions #91–#94, replacing #78's navigation rail): the horizontal
// LifeOS navigation with the page's one `+ Add` menu, a masthead with a print
// and the section links, then the modules in the order the eye needs them —
// the Semester map at full width (the term's shape, read by calendar date),
// Upcoming work beside Exams (what needs action, and its context), Courses
// (reference), the timetable open at full width (#28/#58/#73) and Reminders.
// Flat cream paper: sections are separated by rules, never by tiles.
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
  const week = term && weekNo ? `week ${weekNo} of ${term.weeks}` : null;

  const open = work.filter((t) => !t.done);
  const thisWeek = open.filter((t) => ["today", "week"].includes(horizonOf(t.due, today))).length;
  const nextWeek = open.filter((t) => horizonOf(t.due, today) === "next").length;
  const firstExam = exams
    .filter((e) => !e.done && e.due)
    .map((e) => e.due!)
    .sort()[0];
  const pending = reminders.filter((n) => !n.reviewed).length;
  const pin = getArtworkPin("academic");
  const daily = dailyArtwork(today, "academic");

  return (
    // `page-academic` scopes the few rules that are this route's alone (the
    // timetable's slate event blocks); everything else is the shared theme.
    <div className={`theme-maritime page-academic ${newsreader.variable} min-h-screen`}>
      <div className="mx-auto max-w-[76rem] px-5 pb-20 sm:px-8">
        <SiteNav current="academic">
          <AddMenu
            accent="academic"
            variant="filled"
            items={[
              { label: "Course", hash: "new-course" },
              { label: "Assignment or task", hash: "new-assignment" },
              { label: "Exam", hash: "new-exam" },
              { label: "Reminder", hash: "new-reminder" },
            ]}
          />
        </SiteNav>

        <main>
          <PageMasthead
            eyebrow="University"
            title="Academic"
            subtitle={
              semester || week ? (
                <>
                  {semester}
                  {semester && week && <span className="text-muted"> · {week}</span>}
                  {!semester && week}
                </>
              ) : null
            }
            sections={[
              ...(map ? [{ id: "semester", label: "Semester" }] : []),
              { id: "assignments", label: "Assignments" },
              { id: "exams", label: "Exams" },
              { id: "study", label: "Study" },
              { id: "courses", label: "Courses" },
              { id: "timetable", label: "Timetable" },
              { id: "reminders", label: "Reminders", count: pending },
            ]}
            artwork={{ collection: "academic", artworkId: pin ?? daily.id, dailyArtworkId: daily.id, pinnedArtworkId: pin }}
          />

          {/* The hero. Absent until a course carries a term start — a map with
              no axis is not a map. */}
          {map && (
            <RuledSection
              id="semester"
              title="Semester map"
              meta={`${map.open} open · ${map.completed} completed · ${map.exams} ${map.exams === 1 ? "exam" : "exams"}`}
            >
              <SemesterMap model={map} />
            </RuledSection>
          )}

          {/* Upcoming work gets the wider column; one thin rule separates Exams.
              Below `lg` they stack. */}
          <div className="grid grid-cols-1 border-b border-border lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <RuledSection
              id="assignments"
              title="Upcoming work"
              meta={`${thisWeek} this week · ${nextWeek} next week`}
              className="min-w-0 border-b lg:border-b-0 lg:pr-8"
            >
              <AcademicTasks tasks={work} courses={courses} today={today} mode="work" frameless addTrigger={false} />
            </RuledSection>
            <RuledSection
              id="exams"
              title="Exams"
              meta={firstExam ? firstExamLabel(firstExam, today) : undefined}
              className="min-w-0 border-b-0 lg:border-l lg:border-border lg:pl-8"
            >
              <ExamsPanel exams={exams} courses={courses} today={today} />
            </RuledSection>
          </div>

          {/* Sessions per course toward each exam (#97), between the exams they
              lead to and the course list. Read from the Exam Prep calendar. */}
          <RuledSection id="study" title="Study progress" meta="Sessions from Exam Prep">
            <Suspense fallback={<p className="text-muted">Loading sessions…</p>}>
              <StudyProgress groups={groups} exams={exams} termStart={term?.start ?? null} />
            </Suspense>
          </RuledSection>

          <RuledSection id="courses" title="Courses" meta={courseSummary(enrolled)}>
            <CoursesSection courses={courses} />
          </RuledSection>

          {/* Full width, with a 52rem floor inside its own scroll container
              (decision #28/#58). Open by default on this page (#73): the grid
              carries the deadlines in a due strip and lists them beneath. */}
          <RuledSection id="timetable" title="Timetable" meta="Zürich time">
            <Suspense fallback={<CalendarTileSkeleton />}>
              <CalendarTile
                home="academic"
                deadlines={deadlines}
                courses={groups.map((g) => ({ name: g.name, code: g.code }))}
                expanded
              />
            </Suspense>
          </RuledSection>

          <RuledSection id="reminders" title="Reminders" className="border-b-0">
            <RemindersCard reminders={reminders} accent="hub" bare />
          </RuledSection>
        </main>
      </div>
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
