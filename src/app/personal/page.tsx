import {
  Briefcase,
  CalendarDays,
  CircleCheck,
  GraduationCap,
  Home,
  Languages,
  NotebookPen,
  Receipt,
  User,
  Wallet,
} from "lucide-react";
import { Suspense } from "react";
import { CalendarTileSkeleton } from "@/components/calendar/CalendarTile";
import { BillsAttention } from "@/components/personal/BillsAttention";
import { GermanCard } from "@/components/personal/GermanCard";
import { HabitsToday } from "@/components/personal/HabitsToday";
import { NotesPanel } from "@/components/personal/NotesPanel";
import { SpendingSection } from "@/components/personal/SpendingSection";
import { UpcomingSection } from "@/components/personal/UpcomingSection";
import { AddMenu } from "@/components/ui/AddMenu";
import { NavRail } from "@/components/ui/NavRail";
import { Tile } from "@/components/ui/Tile";
import { billsForMonth } from "@/lib/db/bills";
import { latestGermanWord } from "@/lib/db/briefs";
import { habitsWithWeek } from "@/lib/db/habits";
import { personalNotes } from "@/lib/db/notes";
import { weekTasksByDomain } from "@/lib/db/tasks";
import { monthOf, zurichToday } from "@/lib/dates";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";
export const metadata = { title: "Personal" };

/*
 * Layout (decision #81): the Academic shell — a slim navigation rail, one
 * `+ Add` menu, modules on quiet tiles — in the order the day asks for them:
 * Habits today beside Bills needing attention, then Upcoming (tasks,
 * appointments and the calendar as one module), Spending with this month
 * first, then German beside Notes. Health is gone from the page: no module, no
 * link, no creation entry. Its data, API and trends route are untouched.
 *
 * Every figure a module shows is computed by the function its detail view
 * uses, so a summary and its detail cannot disagree.
 */
export default function PersonalPage() {
  const today = zurichToday();
  const month = monthOf(today);
  const tasks = weekTasksByDomain("personal");
  const bills = billsForMonth(month);
  const habits = habitsWithWeek(today);
  const notes = personalNotes();
  const germanWord = latestGermanWord();

  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(`${month}-15T12:00:00Z`)
  );
  const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-15T12:00:00Z`)
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[13rem_minmax(0,1fr)]">
      <NavRail
        page="Personal"
        pageIcon={<User size={16} />}
        accent="personal"
        sections={[
          { id: "overview", label: "Overview", icon: <Home size={15} /> },
          { id: "habits", label: "Habits", icon: <CircleCheck size={15} /> },
          { id: "spending", label: "Spending", icon: <Wallet size={15} /> },
          { id: "upcoming", label: "Calendar", icon: <CalendarDays size={15} /> },
          { id: "notes", label: "Notes", icon: <NotebookPen size={15} /> },
        ]}
        links={[
          { href: "/academic", label: "Academic", icon: <GraduationCap size={15} /> },
          { href: "/professional", label: "Professional", icon: <Briefcase size={15} /> },
        ]}
        footer={<p className="px-2.5 text-xs text-muted">{monthYear}</p>}
      />

      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <header id="overview" className="flex scroll-mt-6 flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="t-serif text-3xl font-semibold tracking-tight">Personal</h1>
            <p className="text-sm text-muted">habits · schedule · money</p>
          </div>
          <AddMenu
            accent="personal"
            items={[
              { label: "Task or appointment", hash: "new-task" },
              { label: "Expense", hash: "new-expense" },
              { label: "Note", hash: "new-note" },
            ]}
          />
        </header>

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <Tile
            id="habits"
            accent="personal"
            frame="quiet"
            icon={<CircleCheck size={16} />}
            title="Habits today"
            span="lg:col-span-12 xl:col-span-7"
          >
            <HabitsToday habits={habits} today={today} />
          </Tile>

          <Tile
            id="bills"
            accent="personal"
            frame="quiet"
            icon={<Receipt size={16} />}
            title="Bills needing attention"
            span="lg:col-span-12 xl:col-span-5"
          >
            <BillsAttention bills={bills} month={month} today={today} />
          </Tile>

          <Tile
            id="upcoming"
            accent="personal"
            frame="quiet"
            icon={<CalendarDays size={16} />}
            title="Upcoming"
            span="lg:col-span-12"
          >
            <Suspense fallback={<CalendarTileSkeleton />}>
              <UpcomingSection tasks={tasks} today={today} />
            </Suspense>
          </Tile>

          <Tile
            id="spending"
            accent="personal"
            frame="quiet"
            icon={<Wallet size={16} />}
            title="Spending"
            meta={
              <span className="flex items-center gap-3">
                <span>{monthName}</span>
                <a href="#spending-history" className="rounded transition-colors hover:text-text">
                  History →
                </a>
              </span>
            }
            span="lg:col-span-12"
          >
            <SpendingSection today={today} />
          </Tile>

          <Tile
            id="german"
            accent="personal"
            frame="quiet"
            icon={<Languages size={16} />}
            title="German"
            span="lg:col-span-12 md:col-span-6"
          >
            <GermanCard brief={germanWord} />
          </Tile>

          <Tile
            id="notes"
            accent="personal"
            frame="quiet"
            icon={<NotebookPen size={16} />}
            title="Notes"
            meta={`${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
            span="lg:col-span-12 md:col-span-6"
          >
            <NotesPanel notes={notes} />
          </Tile>
        </div>
      </main>
    </div>
  );
}
