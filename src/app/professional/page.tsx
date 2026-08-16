import Link from "next/link";
import { Suspense } from "react";
import { CalendarSection, CalendarSkeleton } from "@/components/calendar/CalendarSection";
import { NotesCard } from "@/components/notes/NotesCard";
import { LearningTable } from "@/components/professional/LearningTable";
import { NetworkSection } from "@/components/professional/NetworkSection";
import { ProjectTasks } from "@/components/professional/ProjectTasks";
import { ProjectsSection } from "@/components/professional/ProjectsSection";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { contactsWithFollowup, interactionsByContact } from "@/lib/db/contacts";
import { learningItems } from "@/lib/db/learning";
import { notesFor } from "@/lib/db/notes";
import { dayJobProject, portfolioProjects, professionalProjects } from "@/lib/db/projects";
import { openTasksForProject } from "@/lib/db/tasks";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";

// Layout per docs/02-design-system.md, section order per
// docs/03-pages/professional.md. The calendar sits full width below the grid, as
// on /academic (decision #28) — the tables above are the work half of the
// command center, so nothing goes beside the week.
export default function ProfessionalPage() {
  const dayJob = dayJobProject();
  const dayJobTasks = dayJob ? openTasksForProject(dayJob.id) : [];
  const projects = portfolioProjects();
  const learning = learningItems();
  const contacts = contactsWithFollowup();
  const interactions = interactionsByContact();

  return (
    <PageShell
      page="Professional"
      title="Professional"
      subtitle="Day job · learning · network"
    >
      {/* minmax(0,1fr) so a wide table inside the track can't push the column
          past the grid. */}
      <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-28">
          <Card label="Quick Actions" accent="hub">
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {dayJob && <QuickAction href="#new-day-job-task" label="Task" />}
              <QuickAction href="#new-learning" label="Topic" />
              <QuickAction href="#new-contact" label="Contact" />
              <QuickAction href="#new-project" label="Project" />
            </div>
          </Card>

          <Card label="Navigation" accent="hub">
            <nav aria-label="Sections" className="mt-3 flex flex-col gap-1.5 text-sm">
              {professionalProjects().map((p) => (
                <Link
                  key={p.id}
                  href={`/professional/projects/${p.id}`}
                  className="truncate text-muted transition-colors hover:text-text"
                >
                  {p.name} →
                </Link>
              ))}
              <span aria-hidden="true" className="my-1 border-t border-border" />
              <NavLink href="/" label="LifeOS" />
              <NavLink href="/academic" label="Academic" />
              <NavLink href="/personal" label="Personal" />
            </nav>
          </Card>

          <NotesCard
            notes={notesFor("professional", "idea")}
            domain="professional"
            kind="idea"
            title="Ideas"
            accent="professional"
            inputId="new-idea"
            placeholder="Add an idea…"
          />
        </aside>

        <div className="flex flex-col gap-10">
          <section id="day-job" aria-labelledby="day-job-title">
            <SectionBanner
              id="day-job-title"
              accent="professional"
              title={dayJob?.name ?? "Day job"}
              caption="day job · open tasks, soonest first"
            />
            <div className="mt-4">
              {dayJob ? (
                <ProjectTasks
                  projectId={dayJob.id}
                  tasks={dayJobTasks}
                  inputId="new-day-job-task"
                  empty="nothing open — add a task below"
                />
              ) : (
                <p className="rounded-lg border border-border bg-surface px-3 py-6 text-center text-xs text-faint">
                  no day-job project configured — set config key
                  <span className="tabular"> professional.day_job_project_id</span>
                </p>
              )}
            </div>
          </section>

          <section id="learning" aria-labelledby="learning-title">
            <SectionBanner
              id="learning-title"
              accent="professional"
              title="AI / RL concepts"
              caption="concepts to work through · papers, courses, modules"
            />
            <div className="mt-4">
              <LearningTable items={learning} />
            </div>
          </section>

          <section id="projects" aria-labelledby="projects-title">
            <SectionBanner
              id="projects-title"
              accent="professional"
              title="Projects"
              caption="building · portfolio evidence"
            />
            <div className="mt-4">
              <ProjectsSection projects={projects} />
            </div>
          </section>

          <section id="network" aria-labelledby="network-title">
            <SectionBanner
              id="network-title"
              accent="professional"
              title="Network"
              caption="who to reach out to next"
            />
            <div className="mt-4">
              <NetworkSection contacts={contacts} interactions={interactions} />
            </div>
          </section>
        </div>
      </div>

      <section id="calendar" aria-labelledby="calendar-title">
        <SectionBanner
          id="calendar-title"
          accent="professional"
          title="Calendar"
          caption="blocked-off time · lives in Google Calendar"
        />
        <div className="mt-4">
          <Suspense fallback={<CalendarSkeleton />}>
            <CalendarSection home="professional" />
          </Suspense>
        </div>
      </section>
    </PageShell>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-md border border-border bg-raised px-2 py-1.5 text-center text-xs text-text transition-colors hover:border-professional/40"
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
