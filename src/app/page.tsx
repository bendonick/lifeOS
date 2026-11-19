import { Suspense } from "react";
import { CalendarDays, Inbox, LayoutGrid, ListChecks, Sunrise } from "lucide-react";
import { CalendarTile, CalendarTileSkeleton } from "@/components/calendar/CalendarTile";
import { BriefRow } from "@/components/lifeos/BriefRow";
import { DomainTiles } from "@/components/lifeos/DomainTiles";
import { DueSoon } from "@/components/lifeos/DueSoon";
import { InboxPanel } from "@/components/lifeos/InboxPanel";
import { WeekPlan } from "@/components/lifeos/WeekPlan";
import { PageShell } from "@/components/ui/PageShell";
import { Tile } from "@/components/ui/Tile";
import { latestBriefs } from "@/lib/db/briefs";
import { unprocessedCaptures } from "@/lib/db/inbox";
import { dueSoon, leftoverItems, planItems } from "@/lib/db/plan";
import { dayLabel, zurichToday } from "@/lib/dates";
import { isoWeek, leftoverSourceLabel, weekSpanLabel } from "@/lib/plan/week";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";

// Layout (decision #82, narrowing #59): a bento on the editorial theme — the Week
// plan leads, full width, then domains → brief row → Inbox, with the calendar full
// width below. No left rail: the hub is the navigation.
export default function LifeOSPage() {
  const today = zurichToday();
  const week = isoWeek(today);
  const plan = planItems(week);
  const leftovers = leftoverItems(week);
  const captures = unprocessedCaptures();
  const briefs = latestBriefs();

  const due = dueSoon(week);

  return (
    <PageShell title="LifeOS" subtitle={dayLabel(today)}>
      {/* No rail here: the hub *is* the navigation. The Week plan leads (decision
          #82, the user's ask 2026-11-19): what the week is for comes before the
          doorways and the rollups. Calendar | Inbox share the last row, where
          This week | Inbox used to sit — This week's job now lives inside the
          plan as Due soon.

          Everything is Olive: the hub is domain-less by definition, which is
          exactly what --color-hub means. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <Tile
          id="plan"
          icon={<ListChecks size={16} />}
          title="Week plan"
          caption={`This week · ${weekSpanLabel(today)}`}
          meta={plan.length === 0 ? "Nothing planned yet" : undefined}
          accent="hub"
          span="lg:col-span-12"
        >
          <div className="flex flex-col gap-7 lg:flex-row">
            <div className="min-w-0 lg:flex-[2_1_0%]">
              <WeekPlan
                plan={plan}
                leftovers={leftovers}
                leftoverLabel={leftoverSourceLabel(
                  leftovers.map((t) => t.week ?? ""),
                  today
                )}
              />
            </div>
            <div className="min-w-0 lg:flex-[1_1_0%]">
              <DueSoon tasks={due} />
            </div>
          </div>
        </Tile>

        <Tile
          id="domains"
          icon={<LayoutGrid size={16} />}
          title="Domains"
          caption="three pages, one system"
          accent="hub"
          span="lg:col-span-12"
        >
          <DomainTiles />
        </Tile>

        <Tile
          id="brief"
          icon={<Sunrise size={16} />}
          title="Morning brief"
          caption="generated on weekday mornings by scripts/, never at render time"
          accent="hub"
          span="lg:col-span-12"
        >
          <BriefRow briefs={briefs} />
        </Tile>

        <Tile
          id="calendar"
          icon={<CalendarDays size={16} />}
          title="Calendar"
          caption="blocked-off time · lives in Google Calendar"
          accent="hub"
          span="lg:col-span-8"
        >
          {/* Collapsed like Personal's (#66, now #72): what's coming leads, the
              grid opens on request. No `home` — the hub reads every calendar. */}
          <Suspense fallback={<CalendarTileSkeleton />}>
            <CalendarTile />
          </Suspense>
        </Tile>

        <Tile
          id="inbox"
          icon={<Inbox size={16} />}
          title="Inbox"
          caption="raw captures from here and your phone · one click to file them"
          accent="hub"
          span="lg:col-span-4"
        >
          <InboxPanel items={captures} today={today} />
        </Tile>
      </div>
    </PageShell>
  );
}
