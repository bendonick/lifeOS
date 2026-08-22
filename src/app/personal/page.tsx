import Link from "next/link";
import {
  Activity,
  CalendarDays,
  CircleCheck,
  Compass,
  Gauge,
  Inbox,
  Languages,
  ListChecks,
  NotebookPen,
  Receipt,
  Wallet,
  Zap,
} from "lucide-react";
import { Suspense } from "react";
import { CalendarTile, CalendarTileSkeleton } from "@/components/calendar/CalendarTile";
import { ThisWeek } from "@/components/lifeos/ThisWeek";
import { BillsPanel } from "@/components/personal/BillsPanel";
import { HabitList } from "@/components/personal/HabitList";
import { HealthSection } from "@/components/personal/HealthSection";
import { NotesPanel } from "@/components/personal/NotesPanel";
import { AttentionList, SignalsList } from "@/components/personal/RailStatus";
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

/*
 * Layout — the rail carries the day, the column carries the subject matter.
 *
 * No tile carries a caption. Every one of them restated what the tile below it
 * already showed ("today's metrics" over four metrics, "this month" over a row
 * of due dates, "resets at midnight" over a list of checkboxes), and seven of
 * them stacked down a page is noise pretending to be guidance.
 *
 * The briefing used to be a full-width `TodayBand` across the top. It is now six
 * rail modules (Quick add · Needs attention · Signals · Habits · German · Go to),
 * which is the arrangement this page had before and the one /academic and
 * /professional still use. No full-width heading band: the page opens straight
 * into the tiles.
 *
 * Three levels survive the move:
 *   1. The rail — what needs doing, what needs attention, and the ways out. It
 *      is sticky, so it follows you the whole way down the column.
 *   2. The main column — one stacked tile per module, each a summary.
 *   3. Behind a `Disclosure` in each tile — the detail: budget lines, the CSV
 *      import, the habit matrix, the transaction tools, the week grid.
 *
 * The accent split is unchanged (decision #54): Olive rail, Tobacco main, so the
 * halves read apart by temperature rather than by a divider.
 *
 * Every read the rail and the tiles share is computed once here and passed down,
 * so the number in the rail and the number in the section cannot disagree.
 */
export default function PersonalPage() {
  const today = zurichToday();
  const month = monthOf(today);
  const tasks = weekTasksByDomain("personal");
  const bills = billsForMonth(month);
  const habits = habitsWithWeek(today);
  const notes = personalNotes();
  const toReview = unreviewedPersonalCount();
  const germanWord = latestGermanWord();

  return (
    <PageShell page="Personal" title="Personal" subtitle="habits · health · money" theme="theme-editorial">
      <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6 self-start lg:sticky lg:top-28">
          {/* Anchors, not an inline menu: each target is an input inside a
              section's `Disclosure`, which opens, scrolls and focuses on being
              targeted. Same shape as /academic and /professional's rail, and it
              keeps a 34rem form out of a 19rem column. */}
          <Tile id="shortcuts" accent="hub" icon={<Zap size={16} />} title="Quick add">
            <div className="grid grid-cols-2 gap-1.5">
              <QuickAction href="#new-task" label="Task" />
              <QuickAction href="#new-metric" label="Metric" />
              <QuickAction href="#new-expense" label="Expense" />
              <QuickAction href="#new-note" label="Note" />
            </div>
          </Tile>

          <Tile id="attention" accent="hub" icon={<Inbox size={16} />} title="Needs attention">
            <AttentionList
              bills={bills}
              dayOfMonth={Number(today.slice(8, 10))}
              notesToReview={toReview}
            />
          </Tile>

          <Tile id="signals" accent="hub" icon={<Gauge size={16} />} title="Signals">
            <SignalsList today={today} />
          </Tile>

          <Tile
            id="habits"
            icon={<CircleCheck size={16} />}
            title="Habits"
            accent="hub"
          >
            <HabitList habits={habits} today={today} />
          </Tile>

          <Tile id="german" accent="hub" icon={<Languages size={16} />} title="German">
            {germanWord ? (
              <>
                {/* Through the shared renderer, like the hub's brief rows. */}
                <Markdown text={germanWord.content_md} />
                <p className="mt-2 text-xs text-faint">
                  generated {utcToZurichLabel(germanWord.generated_at)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">No word yet.</p>
            )}
          </Tile>

          <Tile id="nav" accent="hub" icon={<Compass size={16} />} title="Go to">
            <nav aria-label="Sections" className="flex flex-col gap-1.5 text-sm">
              <NavLink href="/personal/health" label="Health trends →" />
              <NavLink href="/" label="LifeOS" />
              <NavLink href="/academic" label="Academic" />
              <NavLink href="/professional" label="Professional" />
            </nav>
          </Tile>
        </aside>

        {/* One stacked column, like /academic and /professional — the only two
            pages that never showed a hole under a short tile. Pairing at
            `span-6` put Bills below *Health's* bottom rather than Schedule's,
            which is what opened ~105px of nothing under Schedule. Only the last
            row pairs, where the shorter tile leaves a ragged corner instead.

            `content-start` as well as `items-start`: this div is a grid *item*
            of the rail layout, so if the rail were ever the taller column it
            would stretch, and a stretched grid container spreads its auto rows
            to fill. `items-start` only aligns items within a row. */}
        <div className="grid grid-cols-1 content-start items-start gap-6 lg:grid-cols-12">
          <Tile
            id="tasks"
            accent="personal"
            icon={<ListChecks size={16} />}
            title="Schedule"
            span="lg:col-span-12"
          >
            <ThisWeek
              tasks={tasks}
              today={today}
              fixedDomain="personal"
              accent="personal"
              showType={false}
              frameless
              rows="cards"
              addInputId="new-task"
            />
          </Tile>

          <Tile
            id="health"
            accent="personal"
            icon={<Activity size={16} />}
            title="Health"
            action={{ href: "/personal/health", label: "trends →" }}
            span="lg:col-span-12"
          >
            <HealthSection today={today} />
          </Tile>

          {/* Back inside the rail grid. Out at full page width it was the
              reason the rail stopped following: `spending` and `calendar`
              between them left 1357px of a 2024px page with no rail beside it,
              and the rail grid ended up exactly as tall as the rail itself — so
              `sticky` had zero travel and never engaged at all. Its hero and
              category list are re-proportioned 3:2 to hold up at this width. */}
          <Tile
            id="spending"
            accent="personal"
            icon={<Wallet size={16} />}
            title="Spending"
            span="lg:col-span-12"
          >
            <SpendingSection today={today} />
          </Tile>

          <Tile
            id="bills"
            accent="personal"
            icon={<Receipt size={16} />}
            title="Bills"
            span="lg:col-span-6"
          >
            <BillsPanel bills={bills} month={month} dayOfMonth={Number(today.slice(8, 10))} />
          </Tile>

          <Tile
            id="notes"
            accent="personal"
            icon={<NotebookPen size={16} />}
            title="Notes"
            span="lg:col-span-6"
          >
            <NotesPanel notes={notes} />
          </Tile>
        </div>
      </div>

      {/* Outside the rail grid, at full page width (decision #28/#58). The week
          grid has a 52rem floor and the main column beside a 19rem rail is
          narrower than that, so in there it scrolled and clipped Sunday. It is
          collapsed by default now — the tile leads with what is coming, and the
          grid is what you open to plan against free time. */}
      <Tile
        id="calendar"
        accent="personal"
        icon={<CalendarDays size={16} />}
        title="Calendar"
      >
        <Suspense fallback={<CalendarTileSkeleton />}>
          <CalendarTile home="personal" />
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
