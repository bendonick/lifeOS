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
import { Markdown } from "@/components/ui/Markdown";
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

// Layout (decision #54): the left rail returns, holding the day's small state
// and the ways out of the page; the main column is a twelve-column bento of the
// subject matter. Rail tiles carry the Cerulean accent, main tiles the ochre, so
// the two halves are told apart by temperature rather than by a rule.
// Quick Actions target the section's first input rather than the section
// itself, so the browser moves focus there as well as scrolling.
export default function PersonalPage() {
  const today = zurichToday();
  const toReview = unreviewedPersonalCount();
  const germanWord = latestGermanWord();

  return (
    <PageShell page="Personal" title="Personal" subtitle="habits · health · money" theme="theme-editorial">
      {/* Rail + main, with a bento inside the main column.
          The rail is the day's small state and the ways out of the page —
          shortcuts, navigation, the review count, the word, the habit ticks.
          None of it is subject matter, all of it is glanced at, and it is the
          same set the original design put here. It carries the Cerulean
          accent; the main column carries ochre, so the two halves are told
          apart by temperature rather than by a divider.

          Rail tiles all sit on the plain surface. Two of them briefly took the
          oxblood field and it made the rail the loudest thing on the page —
          the field is reserved for the page header and the spending hero,
          where it marks something that leads rather than something you glance
          at.

          `items-start` inside the main grid so a tile ends where its content
          does — stretching every tile to its tallest neighbour left dead space
          that read as unfinished. */}
      <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
        <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-28">
          <Tile id="nav" icon={<Compass size={16} />} title="Go to" accent="hub">
            <nav aria-label="Sections" className="flex flex-col gap-1.5 text-sm">
              <NavLink href="/personal/health" label="Health trends →" />
              <NavLink href="/" label="LifeOS" />
              <NavLink href="/academic" label="Academic" />
              <NavLink href="/professional" label="Professional" />
            </nav>
          </Tile>

          <Tile id="shortcuts" icon={<Zap size={16} />} title="Quick add" accent="hub">
            <div className="grid grid-cols-2 gap-1.5">
              <QuickAction href="#new-task" label="Task" />
              <QuickAction href="#new-metric" label="Metric" />
              <QuickAction href="#new-expense" label="Expense" />
              <QuickAction href="#new-note" label="Note" />
            </div>
          </Tile>

          <Tile id="german" icon={<Languages size={16} />} title="German" accent="hub">
            {germanWord ? (
              <>
                {/* Through the shared renderer, like the hub's brief rows. This
                    tile printed `content_md` raw, so the headword arrived as
                    literal `**anmelden**` and the three paragraphs ran together
                    into one block — the one brief on the page that was not
                    going through Markdown (decision #38). */}
                <Markdown text={germanWord.content_md} />
                <p className="mt-1 text-xs text-faint">
                  generated {utcToZurichLabel(germanWord.generated_at)}
                </p>
              </>
            ) : (
              <p className="text-xs text-faint">no word yet</p>
            )}
          </Tile>

          <Tile
            id="review"
            icon={<Inbox size={16} />}
            title="To review"
            caption={toReview === 1 ? "note · Sunday" : "notes · Sunday"}
            accent="hub"
          >
            <a href="#notes" className="tabular t-display block text-3xl font-semibold hover:text-hub">
              {toReview}
            </a>
          </Tile>

          <Tile
            id="habits"
            icon={<CircleCheck size={16} />}
            title="Habits"
            caption="today · resets at midnight"
            accent="hub"
          >
            <HabitList habits={habitsWithWeek(today)} today={today} />
          </Tile>
        </aside>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          <Tile
            id="health"
            icon={<Activity size={16} />}
            title="Health"
            caption="manual entry & CSV import"
            action={{ href: "/personal/health", label: "trends →" }}
            span="lg:col-span-12"
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

          <Tile id="tasks" icon={<ListChecks size={16} />} title="Tasks" caption="due this week" span="lg:col-span-6">
            <ThisWeek
              tasks={weekTasksByDomain("personal")}
              today={today}
              fixedDomain="personal"
              accent="personal"
            />
          </Tile>

          <Tile id="bills" icon={<Receipt size={16} />} title="Bills" caption="this month" span="lg:col-span-6">
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
            span="lg:col-span-12"
          >
            <NotesPanel notes={personalNotes()} />
          </Tile>

        </div>
      </div>

      {/* Outside the rail grid, at full page width (decision #28). The week grid
          has a 52rem floor and the main column beside a 19rem rail is narrower
          than that, so in there it scrolled and clipped Sunday. A week view you
          have to scroll is not a week view. */}
      <Tile
        id="calendar"
        icon={<CalendarDays size={16} />}
        title="Calendar"
        caption="blocked-off time · lives in Google Calendar"
      >
        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarSection home="personal" />
        </Suspense>
      </Tile>
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
