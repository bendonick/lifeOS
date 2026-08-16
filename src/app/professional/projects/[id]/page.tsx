import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectNotes } from "@/components/professional/ProjectNotes";
import { ProjectTasks } from "@/components/professional/ProjectTasks";
import { Pill } from "@/components/ui/Pill";
import { PageShell } from "@/components/ui/PageShell";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { urgencyText } from "@/components/ui/accents";
import { dayJobProjectId, projectById } from "@/lib/db/projects";
import { tasksForProject } from "@/lib/db/tasks";
import { dayLabel, daysLeftLabel, dueInfo } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Project detail (docs/03-pages/professional.md §4): its tasks and its notes.
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const project = Number.isInteger(id) ? projectById(id) : undefined;
  if (!project) notFound();

  const tasks = tasksForProject(project.id);
  const open = tasks.filter((t) => !t.done).length;
  const info = project.deadline ? dueInfo(project.deadline) : null;
  // The day job doesn't appear in the Projects table (decision #31), so its
  // "all projects" link would point at a list it isn't in.
  const isDayJob = project.id === dayJobProjectId();

  return (
    <PageShell
      page="Professional"
      title={project.name}
      subtitle={isDayJob ? "day job" : undefined}
    >
      <section aria-labelledby="details-title">
        <SectionBanner
          id="details-title"
          accent="professional"
          title="Project"
          caption={isDayJob ? "the day job · its section leads the page" : "metadata · edit on the Professional page"}
          action={{
            href: isDayJob ? "/professional#day-job" : "/professional#projects",
            label: isDayJob ? "← Professional" : "← all projects",
          }}
        />
        <dl className="mt-4 grid gap-x-6 gap-y-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Status">
            <Pill tone={project.status === "active" ? "professional" : "neutral"}>
              {project.status}
            </Pill>
          </Detail>
          <Detail label="Deadline">
            {info ? (
              <span className={`tabular text-sm ${urgencyText[info.urgency]}`}>
                {dayLabel(project.deadline!)} · {daysLeftLabel(project.deadline!)}
              </span>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Open tasks">
            <span className="tabular">{open}</span>
          </Detail>
          <Detail label="Started">
            <span className="tabular text-sm text-muted">
              {dayLabel(project.created_at.slice(0, 10))}
            </span>
          </Detail>
        </dl>
      </section>

      <section aria-labelledby="project-work-title">
        <SectionBanner
          id="project-work-title"
          accent="professional"
          title="Tasks"
          caption="filed against this project · finished ones stay, at the bottom"
        />
        <div className="mt-4">
          <ProjectTasks
            projectId={project.id}
            tasks={tasks}
            inputId="new-project-task"
            empty="nothing filed here yet — add a task below"
          />
        </div>
      </section>

      <section aria-labelledby="project-notes-title">
        <SectionBanner
          id="project-notes-title"
          accent="professional"
          title="Notes"
          caption="project notes · one field, not a feed"
        />
        <div className="mt-4">
          <ProjectNotes projectId={project.id} notes={project.notes} />
        </div>
      </section>

      <p className="text-xs text-faint">
        <Link href="/professional" className="rounded hover:text-muted">
          ← Professional
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
