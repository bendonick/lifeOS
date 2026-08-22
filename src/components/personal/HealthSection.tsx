import { Sparkline } from "@/components/charts/Sparkline";
import { HealthImport } from "@/components/personal/HealthImport";
import { MetricForm } from "@/components/personal/MetricForm";
import { Card } from "@/components/ui/Card";
import { Disclosure } from "@/components/ui/Disclosure";
import { getConfigJSON } from "@/lib/db/config";
import { healthCardData } from "@/lib/db/health";

/**
 * The four §2 metrics, as a summary rather than a workspace.
 *
 * Before: four bordered `Card`s inside a bordered `Tile` — cards inside a card,
 * five nested rectangles to say "—" four times — with a six-control form strip
 * open beneath them. It occupied the entire first viewport and reported nothing.
 *
 * Now: bare metrics separated by space, and both editors behind intent. Logging
 * is a daily action so it also lives in Quick add; importing a CSV happens when
 * a new export lands, so it sits one deliberate click away. Historical detail
 * was always a click away at `/personal/health` — that link is the tile's own
 * header action and is no longer duplicated at the foot of the section.
 */

const int = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function HealthSection({ today }: { today: string }) {
  const d = healthCardData(today);
  const mappingNames = Object.keys(getConfigJSON<Record<string, unknown>>("health.csv_mappings", {}));
  const kcalLeft = d.targets.kcal - d.macros.kcal;

  return (
    <div className="flex flex-col gap-5">
      {/* Four across once the tile is full-width — a 2×2 block in a 776px tile
          is a 300px list in a 776px box, which is the same blank-space problem
          one level down. min-w-0 on the items: grid 1fr is minmax(auto,1fr), so
          a long macro line would otherwise push the row past the container. */}
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
        <Metric
          label="Macros left"
          value={d.macros.logged ? int.format(Math.abs(kcalLeft)) : "—"}
          unit={d.macros.logged ? (kcalLeft >= 0 ? "kcal left" : "kcal over") : undefined}
          note={
            d.macros.logged
              ? `P ${int.format(d.macros.protein)}/${d.targets.protein} · C ${int.format(d.macros.carbs)}/${d.targets.carbs} · F ${int.format(d.macros.fat)}/${d.targets.fat}`
              : `no food logged · target ${int.format(d.targets.kcal)} kcal`
          }
          spark={d.sparks.kcal}
          logged={d.macros.logged}
        />

        <Metric
          label="Sleep"
          value={d.sleep ? int.format(d.sleep.value) : "—"}
          note={
            d.sleep
              ? d.sleep.delta7 === null
                ? `latest · ${d.sleep.date}`
                : `${d.sleep.delta7 >= 0 ? "+" : "−"}${Math.abs(d.sleep.delta7)} vs 7d avg`
              : "no data yet"
          }
          spark={d.sparks.sleep_score}
          logged={!!d.sleep}
        />

        <Metric
          label="HRV"
          value={d.hrv ? int.format(d.hrv.value) : "—"}
          unit={d.hrv ? "ms" : undefined}
          note={
            d.hrv
              ? `${d.hrv.value > d.targets.hrv.high ? "above range" : d.hrv.value < d.targets.hrv.low ? "below range" : "in range"} · ${d.targets.hrv.low}–${d.targets.hrv.high}`
              : `no data · range ${d.targets.hrv.low}–${d.targets.hrv.high}`
          }
          spark={d.sparks.hrv}
          logged={!!d.hrv}
        />

        <Metric
          label="Steps"
          value={d.steps ? int.format(d.steps.value) : "—"}
          note={
            d.steps
              ? `${Math.round((d.steps.value / d.targets.steps) * 100)}% of ${int.format(d.targets.steps)}`
              : `no data · target ${int.format(d.targets.steps)}`
          }
          spark={d.sparks.steps}
          logged={!!d.steps}
        />
      </div>

      <div className="flex flex-wrap items-start gap-x-5 gap-y-3 border-t border-border pt-4">
        <Disclosure variant="add" summary="Log a metric" openSummary="Cancel" anchors={["new-metric"]}>
          <MetricForm today={today} inputId="new-metric" autoFocus />
        </Disclosure>
        <Disclosure summary="Import CSV" openSummary="Import CSV">
          <HealthImport mappings={mappingNames} />
        </Disclosure>
      </div>
    </div>
  );
}

/**
 * One metric, unboxed. `Card`'s grammar — label, value, context — with `bare`
 * so the tile around it is the only border on screen.
 */
function Metric({
  label,
  value,
  unit,
  note,
  spark,
  logged,
}: {
  label: string;
  value: string;
  unit?: string;
  note: string;
  spark: number[];
  /** Drives the tone of the value: an honest em-dash should not shout. */
  logged: boolean;
}) {
  return (
    <Card label={label} accent="personal" labelTone="muted" bare>
      <div className={`t-metric mt-1.5 text-2xl ${logged ? "" : "text-muted"}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted">{unit}</span>}
      </div>
      {/* `text-balance` so a two-line note breaks evenly instead of orphaning a
          word, and the range/target never splits across the en dash. */}
      <p className={`tabular mt-1 text-xs text-balance ${logged ? "text-muted" : "text-faint"}`}>
        {note}
      </p>
      {spark.length > 1 && (
        <div className="mt-2.5 text-personal">
          <Sparkline values={spark} width={96} height={20} />
        </div>
      )}
    </Card>
  );
}
