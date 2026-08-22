import { Suspense } from "react";
import { CalendarDays, Inbox, LayoutGrid, ListChecks, Sunrise } from "lucide-react";
import { CalendarTile, CalendarTileSkeleton } from "@/components/calendar/CalendarTile";
import { BriefRow } from "@/components/lifeos/BriefRow";
import { DomainTiles } from "@/components/lifeos/DomainTiles";
import { InboxPanel } from "@/components/lifeos/InboxPanel";
import { ThisWeek } from "@/components/lifeos/ThisWeek";
import { PageShell } from "@/components/ui/PageShell";
import { Tile } from "@/components/ui/Tile";
import { latestBriefs } from "@/lib/db/briefs";
import { unprocessedCaptures } from "@/lib/db/inbox";
import { weekTasks } from "@/lib/db/tasks";
import { dayLabel, zurichToday } from "@/lib/dates";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";

// Layout (decision #59): a bento on the editorial theme, keeping the order of
// docs/03-pages/lifeos.md — brief row → This week | Inbox → domains — with the
// calendar full width below. No left rail: the hub is the navigation.
export default function LifeOSPage() {
  const today = zurichToday();
  const tasks = weekTasks();
  const captures = unprocessedCaptures();
  const briefs = latestBriefs();

  return (
    <PageShell title="LifeOS" subtitle={dayLabel(today)} theme="theme-editorial">
      {/* No rail here: the hub *is* the navigation, so a shortcuts column would
          be a menu pointing at the page you are on. A bento without one, in the
          order of docs/03-pages/lifeos.md — brief → this week | inbox → domains
          — with the calendar full width below (decisions #28/#58).

          Everything is Olive: the hub is domain-less by definition, which is
          exactly what --color-hub means. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
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
          id="week"
          icon={<ListChecks size={16} />}
          title="This week"
          caption="due in the next 7 days or overdue · all domains"
          accent="hub"
          span="lg:col-span-8"
        >
          <ThisWeek tasks={tasks} today={today} frameless rows="cards" />
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
      </div>

      <Tile
        id="calendar"
        icon={<CalendarDays size={16} />}
        title="Calendar"
        caption="blocked-off time · lives in Google Calendar"
        accent="hub"
      >
        {/* Collapsed like Personal's (#66, now #72): what's coming leads, the
            grid opens on request. No `home` — the hub reads every calendar. */}
        <Suspense fallback={<CalendarTileSkeleton />}>
          <CalendarTile />
        </Suspense>
      </Tile>
    </PageShell>
  );
}
