import Link from "next/link";
import { Suspense } from "react";
import { CalendarSection, CalendarSkeleton } from "@/components/calendar/CalendarSection";
import { ThisWeek } from "@/components/lifeos/ThisWeek";
import { BillsPanel } from "@/components/personal/BillsPanel";
import { HabitList } from "@/components/personal/HabitList";
import { HealthSection } from "@/components/personal/HealthSection";
import { NotesPanel } from "@/components/personal/NotesPanel";
import { SpendingSection } from "@/components/personal/SpendingSection";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { billsForMonth } from "@/lib/db/bills";
import { latestGermanWord } from "@/lib/db/briefs";
import { habitsWithWeek } from "@/lib/db/habits";
import { personalNotes, unreviewedPersonalCount } from "@/lib/db/notes";
import { weekTasksByDomain } from "@/lib/db/tasks";
import { monthOf, utcToZurichLabel, zurichToday } from "@/lib/dates";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";

// Layout per docs/06-stage2-brief.md §7: narrow left rail of stacked cards,
// wide main column of banner+caption sections, calendar full-width below.
// Quick Actions target the section's first input rather than the section
// itself, so the browser moves focus there as well as scrolling.
export default function PersonalPage() {
  const today = zurichToday();
  const toReview = unreviewedPersonalCount();
  const germanWord = latestGermanWord();

  return (
    <PageShell page="Personal" title="Personal" subtitle="habits · health · money">
      <div className="grid gap-10 lg:grid-cols-[15rem_1fr]">
        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-28">
          <Card label="Quick Actions" accent="hub">
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <QuickAction href="#new-task" label="Task" />
              <QuickAction href="#new-metric" label="Metric" />
              <QuickAction href="#new-expense" label="Expense" />
              <QuickAction href="#new-note" label="Note" />
            </div>
          </Card>

          <Card label="Navigation" accent="hub">
            <nav aria-label="Sections" className="mt-3 flex flex-col gap-1.5 text-sm">
              <NavLink href="/personal/health" label="Health trends →" />
              <NavLink href="/" label="LifeOS" />
              <NavLink href="/academic" label="Academic" />
              <NavLink href="/professional" label="Professional" />
            </nav>
          </Card>

          <a href="#notes" className="group block rounded-lg">
            <Card
              label="To review"
              accent="personal"
              value={toReview}
              context={toReview === 1 ? "note · Sunday" : "notes · Sunday"}
              className="transition-colors group-hover:border-personal/30"
            />
          </a>

          <Card label="German" accent="personal">
            {germanWord ? (
              <>
                <div className="mt-2 text-sm">{germanWord.content_md}</div>
                <p className="mt-1 text-xs text-faint">
                  generated {utcToZurichLabel(germanWord.generated_at)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-faint">no word yet · briefs start in Stage 5</p>
            )}
          </Card>
        </aside>

        <div className="flex flex-col gap-10">
          <section id="habits" aria-labelledby="habits-title">
            <SectionBanner
              id="habits-title"
              accent="personal"
              title="Habits"
              caption="today · resets at midnight"
            />
            <div className="mt-4">
              <HabitList habits={habitsWithWeek(today)} today={today} />
            </div>
          </section>

          <section id="health" aria-labelledby="health-title">
            <SectionBanner
              id="health-title"
              accent="personal"
              title="Health"
              caption="manual entry & CSV import"
              action={{ href: "/personal/health", label: "trends →" }}
            />
            <div className="mt-4">
              <HealthSection today={today} />
            </div>
          </section>

          <section id="spending" aria-labelledby="spending-title">
            <SectionBanner
              id="spending-title"
              accent="personal"
              title="Spending"
              caption="current month · UBS import"
            />
            <div className="mt-4">
              <SpendingSection today={today} />
            </div>
          </section>

          <section id="tasks" aria-labelledby="tasks-title">
            <SectionBanner
              id="tasks-title"
              accent="personal"
              title="Tasks"
              caption="due this week"
            />
            <div className="mt-4">
              <ThisWeek
                tasks={weekTasksByDomain("personal")}
                today={today}
                fixedDomain="personal"
                accent="personal"
              />
            </div>
          </section>

          <section id="bills" aria-labelledby="bills-title">
            <SectionBanner id="bills-title" accent="personal" title="Bills" caption="this month" />
            <div className="mt-4">
              <BillsPanel
                bills={billsForMonth(monthOf(today))}
                month={monthOf(today)}
                dayOfMonth={Number(today.slice(8, 10))}
              />
            </div>
          </section>

          <section id="notes" aria-labelledby="notes-title">
            <SectionBanner
              id="notes-title"
              accent="personal"
              title="Notes"
              caption="lightweight inbox · reviewed on Sunday"
            />
            <div className="mt-4">
              <NotesPanel notes={personalNotes()} />
            </div>
          </section>

          <section id="calendar" aria-labelledby="calendar-title">
            <SectionBanner
              id="calendar-title"
              accent="personal"
              title="Calendar"
              caption="blocked-off time · lives in Google Calendar"
            />
            <div className="mt-4">
              <Suspense fallback={<CalendarSkeleton />}>
                <CalendarSection home="personal" />
              </Suspense>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-md border border-border bg-raised px-2 py-1.5 text-center text-xs text-text transition-colors hover:border-personal/40"
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
