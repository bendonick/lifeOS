import Link from "next/link";
import { Sparkline } from "@/components/charts/Sparkline";
import { HealthQuickEntry } from "@/components/personal/HealthQuickEntry";
import { Card } from "@/components/ui/Card";
import { getConfigJSON } from "@/lib/db/config";
import { healthCardData } from "@/lib/db/health";

// The four §2 cards in the design system's card grammar, each with a 14-day
// sparkline. Empty states are honest — no fake numbers before data exists.

const int = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

export function HealthSection({ today }: { today: string }) {
  const d = healthCardData(today);
  const mappingNames = Object.keys(getConfigJSON<Record<string, unknown>>("health.csv_mappings", {}));

  const kcalLeft = d.targets.kcal - d.macros.kcal;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Macros left" accent="personal">
          {d.macros.logged ? (
            <>
              <div className="tabular mt-2 text-2xl font-semibold">
                {int.format(Math.abs(kcalLeft))} <span className="text-base font-normal text-muted">kcal {kcalLeft >= 0 ? "left" : "over"}</span>
              </div>
              <p className="tabular mt-1 text-[11px] whitespace-nowrap text-muted">
                P {int.format(d.macros.protein)}/{d.targets.protein} · C {int.format(d.macros.carbs)}/
                {d.targets.carbs} · F {int.format(d.macros.fat)}/{d.targets.fat}
              </p>
            </>
          ) : (
            <>
              <div className="tabular mt-2 text-2xl font-semibold text-muted">—</div>
              <p className="mt-1 text-xs text-faint">nothing logged today · target {int.format(d.targets.kcal)} kcal</p>
            </>
          )}
          <SparkRow values={d.sparks.kcal} />
        </Card>

        <Card label="Sleep" accent="personal">
          {d.sleep ? (
            <>
              <div className="tabular mt-2 text-2xl font-semibold">{int.format(d.sleep.value)}</div>
              <p className="tabular mt-1 text-xs text-muted">
                {d.sleep.delta7 === null
                  ? `latest · ${d.sleep.date}`
                  : `${d.sleep.delta7 >= 0 ? "+" : "−"}${Math.abs(d.sleep.delta7)} vs 7d avg`}
              </p>
            </>
          ) : (
            <Empty hint="no sleep data yet" />
          )}
          <SparkRow values={d.sparks.sleep_score} />
        </Card>

        <Card label="HRV" accent="personal">
          {d.hrv ? (
            <>
              <div className="tabular mt-2 text-2xl font-semibold">
                {int.format(d.hrv.value)} <span className="text-base font-normal text-muted">ms</span>
              </div>
              <p className="tabular mt-1 text-xs text-muted">
                {d.hrv.value > d.targets.hrv.high ? "above range" : d.hrv.value < d.targets.hrv.low ? "below range" : "in range"}{" "}
                · {d.targets.hrv.low}–{d.targets.hrv.high}
              </p>
            </>
          ) : (
            <Empty hint={`no HRV data yet · range ${d.targets.hrv.low}–${d.targets.hrv.high}`} />
          )}
          <SparkRow values={d.sparks.hrv} />
        </Card>

        <Card label="Steps" accent="personal">
          {d.steps ? (
            <>
              <div className="tabular mt-2 text-2xl font-semibold">{int.format(d.steps.value)}</div>
              <p className="tabular mt-1 text-xs text-muted">
                {Math.round((d.steps.value / d.targets.steps) * 100)}% of {int.format(d.targets.steps)}
              </p>
            </>
          ) : (
            <Empty hint={`no step data yet · target ${int.format(d.targets.steps)}`} />
          )}
          <SparkRow values={d.sparks.steps} />
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <HealthQuickEntry today={today} mappings={mappingNames} />
        <Link href="/personal/health" className="text-xs text-personal transition-colors hover:underline">
          trends →
        </Link>
      </div>
    </div>
  );
}

function SparkRow({ values }: { values: number[] }) {
  if (values.length <= 1) return null;
  return (
    <div className="mt-3 text-personal">
      <Sparkline values={values} width={96} height={20} />
    </div>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <>
      <div className="tabular mt-2 text-2xl font-semibold text-muted">—</div>
      <p className="mt-1 text-xs text-faint">{hint}</p>
    </>
  );
}
