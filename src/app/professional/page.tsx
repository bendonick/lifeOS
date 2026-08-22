import Link from "next/link";
import { Brain, Briefcase, CalendarDays, Compass, Hammer, Users, Zap } from "lucide-react";
import { Suspense } from "react";
import { CalendarSection, CalendarSkeleton } from "@/components/calendar/CalendarSection";
import { NotesCard } from "@/components/notes/NotesCard";
import { LearningPhase } from "@/components/professional/LearningPhase";
import { LearningTable } from "@/components/professional/LearningTable";
import { NetworkSection } from "@/components/professional/NetworkSection";
import { ProjectTasks } from "@/components/professional/ProjectTasks";
import { ProjectsSection } from "@/components/professional/ProjectsSection";
import { PageShell } from "@/components/ui/PageShell";
import { Tile } from "@/components/ui/Tile";
import { contactsWithFollowup, interactionsByContact } from "@/lib/db/contacts";
import { learningItems } from "@/lib/db/learning";
import { notesFor } from "@/lib/db/notes";
import { dayJobProject, portfolioProjects, professionalProjects } from "@/lib/db/projects";
import { openTasksForProject } from "@/lib/db/tasks";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";

// Layout (decision #59): the rail + bento of /personal and /academic, on the
// editorial theme. Section order per docs/03-pages/professional.md is unchanged
// — Day job · learning · projects · network — and the calendar still sits full
// width below the grid (decision #28).
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
      theme="theme-editorial"
    >
      {/* Rail + bento, as on /personal and /academic (decisions #50/#54/#57).
          The rail carries Olive, the main column Professional's blue.

          minmax(0,1fr) on the main track so a wide table inside it can't push
          the column past the grid — this page has four
          tables and is where that was first hit. */}
      <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-28">
          <Tile id="nav" accent="hub" icon={<Compass size={16} />} title="Go to">
            <nav aria-label="Sections" className="flex flex-col gap-1.5 text-sm">
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
          </Tile>

          <Tile id="shortcuts" accent="hub" icon={<Zap size={16} />} title="Quick add">
            <div className="grid grid-cols-2 gap-1.5">
              {dayJob && <QuickAction href="#new-day-job-task" label="Task" />}
              <QuickAction href="#new-learning" label="Topic" />
              <QuickAction href="#new-contact" label="Contact" />
              <QuickAction href="#new-project" label="Project" />
            </div>
          </Tile>

          {/* NotesCard brings its own shell, so it sits in the rail directly. */}
          <NotesCard
            notes={notesFor("professional", "idea")}
            domain="professional"
            kind="idea"
            title="Ideas"
            accent="hub"
            inputId="new-idea"
            placeholder="Add an idea…"
          />
        </aside>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          <Tile
            id="day-job"
            accent="professional"
            icon={<Briefcase size={16} />}
            title={dayJob?.name ?? "Day job"}
            caption="day job · open tasks, soonest first"
            span="lg:col-span-12"
          >
            {dayJob ? (
              <ProjectTasks
                projectId={dayJob.id}
                tasks={dayJobTasks}
                inputId="new-day-job-task"
                empty="nothing open — add a task below"
              />
            ) : (
              <p className="rounded-lg border border-border bg-raised px-3 py-6 text-center text-xs text-faint">
                no day-job project configured — set config key
                <span className="tabular"> professional.day_job_project_id</span>
              </p>
            )}
          </Tile>

          <Tile
            id="learning"
            accent="professional"
            icon={<Brain size={16} />}
            title="AI / RL concepts"
            caption="concepts to work through · papers, courses, modules"
            span="lg:col-span-12"
          >
            <LearningPhase items={learning} />
            <LearningTable items={learning} />
          </Tile>

          <Tile
            id="projects"
            accent="professional"
            icon={<Hammer size={16} />}
            title="Projects"
            caption="building · portfolio evidence"
            span="lg:col-span-12"
          >
            <ProjectsSection projects={projects} />
          </Tile>

          <Tile
            id="network"
            accent="professional"
            icon={<Users size={16} />}
            title="Network"
            caption="who to reach out to next"
            span="lg:col-span-12"
          >
            <NetworkSection contacts={contacts} interactions={interactions} />
          </Tile>
        </div>
      </div>

      {/* Outside the rail grid at full page width: the week grid has a 52rem
          floor and the main column beside a 19rem rail is narrower than that
          (decisions #28/#58). */}
      <Tile
        id="calendar"
        accent="professional"
        icon={<CalendarDays size={16} />}
        title="Calendar"
        caption="blocked-off time · lives in Google Calendar"
      >
        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarSection home="professional" />
        </Suspense>
      </Tile>
    </PageShell>
  );
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
