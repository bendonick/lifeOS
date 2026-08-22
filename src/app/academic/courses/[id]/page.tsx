import Link from "next/link";
import { notFound } from "next/navigation";
import { AcademicTasks } from "@/components/academic/AcademicTasks";
import { MaterialsList } from "@/components/academic/MaterialsList";
import { Pill } from "@/components/ui/Pill";
import { PageShell } from "@/components/ui/PageShell";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { courseSlug, scheduleDays } from "@/lib/academic/course";
import { courseById } from "@/lib/db/courses";
import { tasksForCourse } from "@/lib/db/tasks";
import { dayLabel, zurichToday } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** The tab carries the course's name — the layout template appends · LifeOS. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const course = Number.isInteger(id) ? courseById(id) : undefined;
  return { title: course?.name ?? "Course" };
}

// Course detail (docs/03-pages/academic.md §2): metadata, this course's work,
// and its materials folder.
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const course = Number.isInteger(id) ? courseById(id) : undefined;
  if (!course) notFound();

  const today = zurichToday();
  const tasks = tasksForCourse(course.id);
  const work = tasks.filter((t) => t.type !== "exam");
  const exams = tasks.filter((t) => t.type === "exam");
  const days = scheduleDays(course);

  return (
    <PageShell page="Academic" title={course.name} subtitle={course.semester ?? undefined}>
      <section aria-labelledby="details-title">
        <SectionBanner
          id="details-title"
          accent="academic"
          title="Course"
          caption="metadata · edit on the Academic page"
          action={{ href: "/academic#courses", label: "← all courses" }}
        />
        <dl className="mt-4 grid gap-x-6 gap-y-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Status">
            <Pill tone={course.status === "enrolled" ? "academic" : "neutral"}>{course.status}</Pill>
          </Detail>
          <Detail label="Credits">
            <span className="tabular">{course.credits ?? "—"}</span>
          </Detail>
          <Detail label="Schedule">
            {days.length || course.time_label ? (
              <span className="flex flex-wrap items-center gap-1">
                {days.map((d) => (
                  <Pill key={d}>{d}</Pill>
                ))}
                <span className="tabular text-xs text-muted">
                  {course.time_label?.replace(days.join(" "), "").trim()}
                </span>
              </span>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Room">{course.room ?? "—"}</Detail>
          <Detail label="Professor">{course.professor ?? "—"}</Detail>
          <Detail label="Email">
            {course.professor_email ? (
              <a href={`mailto:${course.professor_email}`} className="rounded transition-colors hover:text-academic">
                {course.professor_email}
              </a>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Term">
            {course.term_start || course.term_end
              ? `${course.term_start ? dayLabel(course.term_start) : "?"} – ${
                  course.term_end ? dayLabel(course.term_end) : "?"
                }`
              : "—"}
          </Detail>
          <Detail label="Materials folder">
            <span className="text-xs break-all text-muted">
              data/academic/courses/{courseSlug(course.name)}
            </span>
          </Detail>
        </dl>
      </section>

      <section aria-labelledby="course-work-title">
        <SectionBanner
          id="course-work-title"
          accent="academic"
          title="Assignments & tasks"
          caption="filed against this course"
        />
        <div className="mt-4">
          <AcademicTasks
            tasks={work}
            courses={[course]}
            today={today}
            mode="work"
            fixedCourseId={course.id}
          />
        </div>
      </section>

      <section aria-labelledby="course-exams-title">
        <SectionBanner
          id="course-exams-title"
          accent="academic"
          title="Exams"
          caption="filed against this course"
        />
        <div className="mt-4">
          <AcademicTasks
            tasks={exams}
            courses={[course]}
            today={today}
            mode="exams"
            fixedCourseId={course.id}
          />
        </div>
      </section>

      <section aria-labelledby="materials-title">
        <SectionBanner
          id="materials-title"
          accent="academic"
          title="Materials"
          caption="lecture PDFs on disk · searchable in Stage 6"
        />
        <div className="mt-4">
          <MaterialsList slug={courseSlug(course.name)} />
        </div>
      </section>

      <p className="text-xs text-faint">
        <Link href="/academic" className="rounded transition-colors hover:text-muted">
          ← Academic
        </Link>
      </p>
    </PageShell>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-faint">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
