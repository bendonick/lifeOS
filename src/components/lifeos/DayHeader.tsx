import { ArtworkFrame } from "@/components/lifeos/ArtworkFrame";
import { Currently } from "@/components/lifeos/Currently";
import { longDateParts } from "@/lib/dates";
import type { Currently as CurrentlyValues } from "@/lib/db/overview";

// The Overview's masthead (decision #88): the day on the left, a landscape print
// on the right. The date is the page's <h1> — "LifeOS" is the wordmark in the
// navigation, and what this page is *about* is today.

export function DayHeader({
  today,
  currently,
  artworkId,
  dailyArtworkId,
  pinnedArtworkId,
}: {
  today: string;
  currently: CurrentlyValues;
  artworkId: string;
  dailyArtworkId: string;
  pinnedArtworkId: string | null;
}) {
  const { weekday, dayMonth } = longDateParts(today);
  return (
    <section
      aria-labelledby="day-title"
      className="grid gap-x-9 gap-y-6 border-b border-border pb-5 pt-6 md:grid-cols-[minmax(0,0.62fr)_minmax(0,1fr)]"
    >
      <div className="flex flex-col justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Your day</p>
          <h1
            id="day-title"
            className="t-serif mt-1.5 text-[clamp(2.375rem,4.7vw,3.5rem)] leading-[1.03] text-text"
          >
            <time dateTime={today}>
              {weekday},
              <br />
              {dayMonth}
            </time>
          </h1>
        </div>
        <Currently building={currently.building} reading={currently.reading} />
      </div>
      <ArtworkFrame collection="overview" initialId={artworkId} dailyId={dailyArtworkId} pinnedId={pinnedArtworkId} />
    </section>
  );
}
