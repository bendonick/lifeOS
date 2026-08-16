import Link from "next/link";
import { CalendarStub } from "@/components/lifeos/CalendarStub";
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
export default function PersonalPage() {
  const today = zurichToday();
  const toReview = unreviewedPersonalCount();
  const germanWord = latestGermanWord();

  return (
    <PageShell page="Personal" title="Personal" subtitle="health · habits · money">
      <div className="grid gap-10 lg:grid-cols-[15rem_1fr]">
        <aside className="flex flex-col gap-4 self-start">
          <Card label="Quick Actions" accent="personal">
            <div className="mt-3 flex flex-col gap-1.5">
              <QuickAction href="#tasks" label="New Task" />
              <QuickAction href="#health" label="Log Metric" />
              <QuickAction href="#spending" label="Add Transaction" />
              <QuickAction href="#notes" label="New Note" />
            </div>
          </Card>

          <Card label="Navigation" accent="personal">
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              <NavLink href="/personal/health" label="Health trends →" />
              <NavLink href="/" label="LifeOS" />
              <NavLink href="/academic" label="Academic" />
              <NavLink href="/professional" label="Professional" />
            </div>
          </Card>

          <Card label="Notes" accent="personal" value={toReview} context="to review · Sunday" />

          <Card label="German" accent="personal">
            {germanWord ? (
              <>
                <div className="mt-2 text-sm">{germanWord.content_md}</div>
                <p className="mt-1 text-xs text-faint">generated {utcToZurichLabel(germanWord.generated_at)}</p>
              </>
            ) : (
              <p className="mt-2 text-xs text-faint">no word yet · briefs start in Stage 5</p>
            )}
          </Card>
        </aside>

        <div className="flex flex-col gap-10">
          <section id="habits">
            <SectionBanner accent="personal" title="Habits" caption="today · resets at midnight" />
            <div className="mt-4">
              <HabitList habits={habitsWithWeek(today)} today={today} />
            </div>
          </section>

          <section id="health">
            <SectionBanner accent="personal" title="Health" caption="manual & CSV · trends →" />
            <div className="mt-4">
              <HealthSection today={today} />
            </div>
          </section>

          <section id="spending">
            <SectionBanner accent="personal" title="Spending" caption="current month · UBS import" />
            <div className="mt-4">
              <SpendingSection today={today} />
            </div>
          </section>

          <section id="tasks">
            <SectionBanner accent="personal" title="Tasks" caption="due this week" />
            <div className="mt-4">
              <ThisWeek tasks={weekTasksByDomain("personal")} today={today} />
            </div>
          </section>

          <section id="bills">
            <SectionBanner accent="personal" title="Bills" caption="this month" />
            <div className="mt-4">
              <BillsPanel
                bills={billsForMonth(monthOf(today))}
                month={monthOf(today)}
                dayOfMonth={Number(today.slice(8, 10))}
              />
            </div>
          </section>

          <section id="notes">
            <SectionBanner accent="personal" title="Notes" caption="to review · Sunday" />
            <div className="mt-4">
              <NotesPanel notes={personalNotes()} />
            </div>
          </section>
        </div>
      </div>

      <section id="calendar">
        <SectionBanner
          accent="personal"
          title="Calendar"
          caption="blocked-off time · lives in Google Calendar · fake events until ICS lands in Stage 3"
        />
        <div className="mt-4">
          <CalendarStub />
        </div>
      </section>
    </PageShell>
  );
}

function QuickAction({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text transition-colors hover:border-personal/40"
    >
      {label}
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
