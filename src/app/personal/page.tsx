import Link from "next/link";
import {
  Activity,
  CalendarDays,
  CircleCheck,
  Compass,
  Inbox,
  Languages,
  ListChecks,
  NotebookPen,
  Receipt,
  Wallet,
  Zap,
} from "lucide-react";
import { Suspense } from "react";
import { CalendarSection, CalendarSkeleton } from "@/components/calendar/CalendarSection";
import { ThisWeek } from "@/components/lifeos/ThisWeek";
import { BillsPanel } from "@/components/personal/BillsPanel";
import { HabitList } from "@/components/personal/HabitList";
import { HealthSection } from "@/components/personal/HealthSection";
import { NotesPanel } from "@/components/personal/NotesPanel";
import { SpendingSection } from "@/components/personal/SpendingSection";
import { PageShell } from "@/components/ui/PageShell";
import { Tile } from "@/components/ui/Tile";
import { billsForMonth } from "@/lib/db/bills";
import { latestGermanWord } from "@/lib/db/briefs";
import { habitsWithWeek } from "@/lib/db/habits";
import { personalNotes, unreviewedPersonalCount } from "@/lib/db/notes";
import { weekTasksByDomain } from "@/lib/db/tasks";
import { monthOf, utcToZurichLabel, zurichToday } from "@/lib/dates";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";

// Layout: a twelve-column bento of tiles (decision #50), replacing the narrow
// left rail + one long banner column of §7. Same modules, same data — the rail
// cards and the banner sections are all `Tile`s now, sized by what they matter.
// Quick Actions target the section's first input rather than the section
// itself, so the browser moves focus there as well as scrolling.
export default function PersonalPage() {
  const today = zurichToday();
  const toReview = unreviewedPersonalCount();
  const germanWord = latestGermanWord();

  return (
    <PageShell page="Personal" title="Personal" subtitle="habits · health · money" theme="theme-warm">
      {/* Bento: hierarchy comes from tile size, not from decoration. Twelve
          columns on lg, one on small — a tile that matters is simply bigger.
          `items-start` so a tile ends where its content does: stretching every
          tile to its tallest neighbour left 120px of dead space under Quick add
          and Health, which reads as unfinished rather than as breathing room.

          Spending and Calendar take the full twelve: Spending is a whole
          module (hero, budget, history, review) and Calendar is a week grid,
          and both look cramped at anything less. */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <Tile
          id="shortcuts"
          icon={<Zap size={16} />}
          title="Quick add"
          accent="hub"
          span="lg:col-span-3"
          surface="bg-field"
        >
          <div className="grid grid-cols-2 gap-1.5">
            <QuickAction href="#new-task" label="Task" />
            <QuickAction href="#new-metric" label="Metric" />
            <QuickAction href="#new-expense" label="Expense" />
            <QuickAction href="#new-note" label="Note" />
          </div>
        </Tile>

        <Tile id="nav" icon={<Compass size={16} />} title="Go to" accent="hub" span="lg:col-span-3">
          <nav aria-label="Sections" className="flex flex-col gap-1.5 text-sm">
            <NavLink href="/personal/health" label="Health trends →" />
            <NavLink href="/" label="LifeOS" />
            <NavLink href="/academic" label="Academic" />
            <NavLink href="/professional" label="Professional" />
          </nav>
        </Tile>

        {/* Two small tiles carry the field as well as the spending hero, so the
            oxblood recurs down the page instead of appearing once and reading
            as an accident. Deliberately the two smallest — a field this
            saturated earns its place by being scarce. */}
        <Tile
          id="review"
          icon={<Inbox size={16} />}
          title="To review"
          caption={toReview === 1 ? "note · Sunday" : "notes · Sunday"}
          span="lg:col-span-2"
          surface="bg-field"
        >
          <a href="#notes" className="tabular t-display block text-3xl font-semibold hover:text-personal">
            {toReview}
          </a>
        </Tile>

        <Tile id="german" icon={<Languages size={16} />} title="German" span="lg:col-span-4">
          {germanWord ? (
            <>
              <div className="text-sm">{germanWord.content_md}</div>
              <p className="mt-1 text-xs text-faint">
                generated {utcToZurichLabel(germanWord.generated_at)}
              </p>
            </>
          ) : (
            <p className="text-xs text-faint">no word yet</p>
          )}
        </Tile>

        <Tile
          id="habits"
          icon={<CircleCheck size={16} />}
          title="Habits"
          caption="today · resets at midnight"
          span="lg:col-span-4"
        >
          <HabitList habits={habitsWithWeek(today)} today={today} />
        </Tile>

        <Tile
          id="health"
          icon={<Activity size={16} />}
          title="Health"
          caption="manual entry & CSV import"
          action={{ href: "/personal/health", label: "trends →" }}
          span="lg:col-span-8"
        >
          <HealthSection today={today} />
        </Tile>

        <Tile
          id="spending"
          icon={<Wallet size={16} />}
          title="Spending"
          caption="current month · UBS import"
          span="lg:col-span-12"
        >
          <SpendingSection today={today} />
        </Tile>

        <Tile id="tasks" icon={<ListChecks size={16} />} title="Tasks" caption="due this week" span="lg:col-span-4">
          <ThisWeek
            tasks={weekTasksByDomain("personal")}
            today={today}
            fixedDomain="personal"
            accent="personal"
          />
        </Tile>

        <Tile id="bills" icon={<Receipt size={16} />} title="Bills" caption="this month" span="lg:col-span-4">
          <BillsPanel
            bills={billsForMonth(monthOf(today))}
            month={monthOf(today)}
            dayOfMonth={Number(today.slice(8, 10))}
          />
        </Tile>

        <Tile
          id="notes"
          icon={<NotebookPen size={16} />}
          title="Notes"
          caption="lightweight inbox · reviewed on Sunday"
          span="lg:col-span-4"
        >
          <NotesPanel notes={personalNotes()} />
        </Tile>

        <Tile
          id="calendar"
          icon={<CalendarDays size={16} />}
          title="Calendar"
          caption="blocked-off time · lives in Google Calendar"
          span="lg:col-span-12"
        >
          <Suspense fallback={<CalendarSkeleton />}>
            <CalendarSection home="personal" />
          </Suspense>
        </Tile>
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
