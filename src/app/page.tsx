import { BriefRow } from "@/components/lifeos/BriefRow";
import { CalendarStub } from "@/components/lifeos/CalendarStub";
import { DomainTiles } from "@/components/lifeos/DomainTiles";
import { InboxPanel } from "@/components/lifeos/InboxPanel";
import { ThisWeek } from "@/components/lifeos/ThisWeek";
import { PageShell } from "@/components/ui/PageShell";
import { SectionBanner } from "@/components/ui/SectionBanner";
import { unprocessedCaptures } from "@/lib/db/inbox";
import { weekTasks } from "@/lib/db/tasks";
import { dayLabel, zurichToday } from "@/lib/dates";

// Reads happen here on the server via the shared db modules; client components
// mutate through /api/* and router.refresh() back to this page's data.
export const dynamic = "force-dynamic";

// Layout per docs/03-pages/lifeos.md: brief row → This week | Inbox → calendar → tiles.
export default function LifeOSPage() {
  const today = zurichToday();
  const tasks = weekTasks();
  const captures = unprocessedCaptures();

  return (
    <PageShell title="LifeOS" subtitle={dayLabel(today)}>
      <section>
        <SectionBanner title="Morning brief" caption="generated on weekday mornings · stubs until Stage 5" />
        <div className="mt-4">
          <BriefRow />
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <section>
          <SectionBanner title="This week" caption="due in the next 7 days or overdue · all domains" />
          <div className="mt-4">
            <ThisWeek tasks={tasks} today={today} />
          </div>
        </section>

        <section>
          <SectionBanner title="Inbox" caption="raw captures · process into tasks and notes" />
          <div className="mt-4">
            <InboxPanel items={captures} today={today} />
          </div>
        </section>
      </div>

      <section>
        <SectionBanner
          title="Calendar"
          caption="blocked-off time · lives in Google Calendar · fake events until ICS lands in Stage 3"
        />
        <div className="mt-4">
          <CalendarStub />
        </div>
      </section>

      <section>
        <SectionBanner title="Domains" caption="three pages, one system" />
        <div className="mt-4">
          <DomainTiles />
        </div>
      </section>
    </PageShell>
  );
}
