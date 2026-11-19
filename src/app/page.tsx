import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Agenda, AgendaSkeleton, AgendaWeek } from "@/components/lifeos/Agenda";
import { CalendarRevealPanel, CalendarRevealProvider } from "@/components/lifeos/CalendarReveal";
import { DayHeader } from "@/components/lifeos/DayHeader";
import { DueSoon } from "@/components/lifeos/DueSoon";
import { newsreader } from "@/components/lifeos/fonts";
import { GermanWord } from "@/components/lifeos/GermanWord";
import { InboxPanel } from "@/components/lifeos/InboxPanel";
import { MorningBrief } from "@/components/lifeos/MorningBrief";
import { OverviewNav } from "@/components/lifeos/OverviewNav";
import { TaskTogglesProvider } from "@/components/lifeos/TaskToggles";
import { ThisWeek } from "@/components/lifeos/ThisWeek";
import { WeekPlan } from "@/components/lifeos/WeekPlan";
import { latestBriefs } from "@/lib/db/briefs";
import { unprocessedCaptures } from "@/lib/db/inbox";
import { getArtworkPin, getCurrently } from "@/lib/db/overview";
import { dueSoon, leftoverItems, planItems } from "@/lib/db/plan";
import { weekTasks } from "@/lib/db/tasks";
import { zurichToday } from "@/lib/dates";
import { dailyArtwork } from "@/lib/overview/artwork";
import { isoWeek, leftoverSourceLabel, weekSpanLabel } from "@/lib/plan/week";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Overview" };

// This page is the app's one light surface (decision #87); the root layout's
// viewport is the dark theme's.
export const viewport: Viewport = { themeColor: "#efdfbb", colorScheme: "light" };

// The Overview (decisions #87–#90): an editorial day planner. Navigation, then the
// day and a landscape print, then the Week plan as the first working area, then
// two independent columns — tasks and reading on the left, the day's agenda and
// quick capture on the right. Flat cream paper: sections are separated by thin
// rules and space, never by tiles.
export default function OverviewPage() {
  const today = zurichToday();
  const week = isoWeek(today);
  const plan = planItems(week);
  const leftovers = leftoverItems(week);
  const due = dueSoon(week);
  const tasks = weekTasks();
  const captures = unprocessedCaptures();
  const briefs = latestBriefs();
  const currently = getCurrently();
  const pin = getArtworkPin();
  const daily = dailyArtwork(today);

  return (
    <div className={`theme-overview ${newsreader.variable} min-h-screen`}>
      <div className="mx-auto max-w-[76rem] px-5 pb-20 sm:px-8">
        <OverviewNav />
        <main>
          <DayHeader
            today={today}
            currently={currently}
            artworkId={pin ?? daily.id}
            dailyArtworkId={daily.id}
            pinnedArtworkId={pin}
          />

          {/* One optimistic "done" state for the three task lists (#89). */}
          <TaskTogglesProvider>
            <section aria-labelledby="plan-title" id="plan" className="border-b border-border pb-7 pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <div>
                  <h2 id="plan-title" className="t-serif text-[2rem] leading-tight text-text">
                    Week plan
                  </h2>
                  <p className="text-base italic text-muted">This week · {weekSpanLabel(today)}</p>
                </div>
                {plan.length === 0 && <p className="t-serif !font-medium text-base italic text-muted">Nothing planned yet</p>}
              </div>
              <div className="mt-5 grid gap-x-7 gap-y-7 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                  <WeekPlan
                    plan={plan}
                    leftovers={leftovers}
                    leftoverLabel={leftoverSourceLabel(
                      leftovers.map((t) => t.week ?? ""),
                      today
                    )}
                  />
                </div>
                <div className="min-w-0 border-t border-border pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                  <DueSoon tasks={due} />
                </div>
              </div>
            </section>

            <CalendarRevealProvider>
              {/* Two columns that flow on their own: a long brief never pushes the
                  Inbox down. Below `lg` the wrappers dissolve (`contents`) and the
                  sections take a reading order of their own — the day first, the
                  reading last. */}
              <div className="flex flex-col gap-y-9 pt-7 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-x-0">
                <div className="contents lg:flex lg:flex-col lg:gap-y-8 lg:pr-8">
                  <section aria-labelledby="week-title" className="order-1 lg:order-none">
                    <h2 id="week-title" className="mb-2 text-2xl font-bold tracking-tight text-text">
                      This week
                    </h2>
                    <ThisWeek tasks={tasks} today={today} layout="list" addInputId="new-task" />
                  </section>
                  <div className="order-4 lg:order-none">
                    <MorningBrief briefs={briefs} />
                    <GermanWord brief={briefs.german_word} />
                  </div>
                </div>

                <div className="contents lg:flex lg:flex-col lg:gap-y-8 lg:border-l lg:border-border lg:pl-8">
                  <section aria-labelledby="agenda-title" className="order-2 lg:order-none">
                    <h2 id="agenda-title" className="mb-1 text-2xl font-bold tracking-tight text-text">
                      Today agenda
                    </h2>
                    <Suspense fallback={<AgendaSkeleton />}>
                      <Agenda />
                    </Suspense>
                  </section>
                  <section
                    aria-labelledby="inbox-title"
                    id="inbox"
                    className="order-3 border-t border-border pt-6 lg:order-none"
                  >
                    <h2 id="inbox-title" className="mb-3 text-2xl font-bold tracking-tight text-text">
                      Inbox
                    </h2>
                    <InboxPanel items={captures} today={today} />
                  </section>
                </div>
              </div>

              <CalendarRevealPanel>
                <Suspense fallback={<AgendaSkeleton />}>
                  <AgendaWeek />
                </Suspense>
              </CalendarRevealPanel>
            </CalendarRevealProvider>
          </TaskTogglesProvider>
        </main>
      </div>
    </div>
  );
}
