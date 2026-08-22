import { TrendsView } from "@/components/personal/TrendsView";
import { PageShell } from "@/components/ui/PageShell";
import { dailySeries } from "@/lib/db/health";
import { zurichToday } from "@/lib/dates";
import { METRIC_KEYS, type MetricKey } from "@/lib/health/metrics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Health trends" };

// Health trends (§4c): linked single-series small multiples + a correlation
// scatter — never a dual-axis chart (decision #19). All series are read here
// on the server; the client owns only view state (range, hover, tab).
export default function HealthTrendsPage() {
  const today = zurichToday();
  const series = {} as Record<MetricKey, { date: string; value: number }[]>;
  for (const key of METRIC_KEYS) series[key] = dailySeries(key, "0000-00-00", today);

  return (
    <PageShell page="Personal / Health" title="Health trends" subtitle="manual & CSV · single-series by design">
      <TrendsView series={series} today={today} />
    </PageShell>
  );
}
