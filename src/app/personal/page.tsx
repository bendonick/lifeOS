import type { Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarTileSkeleton } from "@/components/calendar/CalendarTile";
import { GermanCard } from "@/components/personal/GermanCard";
import { HabitsToday } from "@/components/personal/HabitsToday";
import { MonthlyPayments } from "@/components/personal/MonthlyPayments";
import { NotesPanel } from "@/components/personal/NotesPanel";
import { UpcomingSection } from "@/components/personal/UpcomingSection";
import { AddMenu } from "@/components/ui/AddMenu";
import { newsreader } from "@/components/ui/fonts";
import { PageMasthead } from "@/components/ui/PageMasthead";
import { RuledSection } from "@/components/ui/RuledSection";
import { SiteNav } from "@/components/ui/SiteNav";
import { billsForMonth } from "@/lib/db/bills";
import { latestGermanWord } from "@/lib/db/briefs";
import { habitsWithWeek } from "@/lib/db/habits";
import { personalNotes } from "@/lib/db/notes";
import { weekTasksByDomain } from "@/lib/db/tasks";
import { monthOf, zurichToday } from "@/lib/dates";
import { weekSpanLabel } from "@/lib/plan/week";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";
export const metadata = { title: "Personal" };

// A Maritime page, like the Overview and Academic: light.
export const viewport: Viewport = { themeColor: "#efdfbb", colorScheme: "light" };

/*
 * Layout (replacing #81's navigation rail and tiles): the horizontal LifeOS
 * navigation with the page's one `+ Add` menu, the shared masthead with the
 * section links, then the modules in the order the day asks for them: Habits
 * today beside Money, Upcoming (tasks, appointments and the calendar as one
 * module), then German beside Notes. Flat cream paper: sections are separated
 * by rules, never by tiles. Health stays off the page; its data, API and
 * trends route are untouched.
 *
 * Money here is a high-level check only: the month's payments ticked off, with
 * no amounts. Every figure (bills with amounts, budget, spending, history,
 * imports) is on /personal/money.
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
  const toReview = notes.filter((n) => !n.reviewed).length;

  return (
    <div className={`theme-maritime page-personal ${newsreader.variable} min-h-screen`}>
      <div className="mx-auto max-w-[76rem] px-5 pb-20 sm:px-8">
        <SiteNav current="personal">
          <AddMenu
            accent="personal"
            variant="filled"
            items={[
              { label: "Task or appointment", hash: "new-task" },
              { label: "Habit", hash: "new-habit" },
              { label: "Payment", hash: "new-payment" },
              { label: "Note", hash: "new-note" },
            ]}
          />
        </SiteNav>

        <main>
          <PageMasthead
            eyebrow="Home"
            title="Personal"
            subtitle={
              <>
                {monthYear}
                <span className="text-muted"> · habits, schedule and money</span>
              </>
            }
            sections={[
              { id: "habits", label: "Habits" },
              { id: "money", label: "Money" },
              { id: "upcoming", label: "Upcoming" },
              { id: "german", label: "German" },
              { id: "notes", label: "Notes", count: toReview },
            ]}
          />

          {/* Habits get the wider column; one thin rule separates Money. Below
              `lg` they stack. */}
          <div className="grid grid-cols-1 border-b border-border lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <RuledSection
              id="habits"
              title="Habits today"
              meta={weekSpanLabel(today)}
              className="min-w-0 border-b lg:border-b-0 lg:pr-8"
            >
              <HabitsToday habits={habits} today={today} />
            </RuledSection>
            <RuledSection
              id="money"
              title="Money"
              meta={
                <>
                  {monthName}
                  <span aria-hidden="true"> · </span>
                  <Link href="/personal/money" className="rounded text-link hover:text-text">
                    Money →
                  </Link>
                </>
              }
              className="min-w-0 border-b-0 lg:border-l lg:border-border lg:pl-8"
            >
              <MonthlyPayments bills={bills} month={month} today={today} />
            </RuledSection>
          </div>

          <RuledSection id="upcoming" title="Upcoming" meta="Zürich time">
            <Suspense fallback={<CalendarTileSkeleton />}>
              <UpcomingSection tasks={tasks} today={today} />
            </Suspense>
          </RuledSection>

          <div className="grid grid-cols-1 lg:grid-cols-2">
            <RuledSection id="german" title="German" className="min-w-0 border-b lg:border-b-0 lg:pr-8">
              <GermanCard brief={germanWord} />
            </RuledSection>
            <RuledSection
              id="notes"
              title="Notes"
              meta={`${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
              className="min-w-0 border-b-0 lg:border-l lg:border-border lg:pl-8"
            >
              <NotesPanel notes={notes} />
            </RuledSection>
          </div>
        </main>
      </div>
    </div>
  );
}
