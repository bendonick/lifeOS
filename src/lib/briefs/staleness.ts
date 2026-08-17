import { utcToZurichLabel, zurichToday } from "@/lib/dates";

/**
 * How old a brief is, and how loudly to say so. One helper because the hub card
 * and anything else that reports brief freshness must agree on the thresholds —
 * three private copies of "over pace" is how a gauge ended up orange next to a
 * card reading "on pace".
 *
 * Pure: no db import, so client components can use it.
 */
export type BriefTone = "fresh" | "recent" | "stale";

/** Whole days between a brief's date and today (Zurich). 0 = generated today. */
export function briefAgeDays(date: string): number {
  const from = Date.parse(`${date}T12:00:00Z`);
  const to = Date.parse(`${zurichToday()}T12:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/**
 * `stale` is the only warm tone here, and it earns it: a brief three days old
 * means the scheduled job has stopped running, which is the same class of
 * problem as an overdue task. One or two days old is just a sleeping laptop.
 */
export function briefStaleness(date: string, generatedAt: string): { label: string; tone: BriefTone } {
  const age = briefAgeDays(date);
  if (age <= 0) return { label: `today · ${utcToZurichLabel(generatedAt)}`, tone: "fresh" };
  if (age === 1) return { label: "yesterday", tone: "recent" };
  if (age === 2) return { label: "2 days old", tone: "recent" };
  return { label: `${age} days old · check the job`, tone: "stale" };
}

export const briefToneText: Record<BriefTone, string> = {
  fresh: "text-faint",
  recent: "text-muted",
  stale: "text-warn",
};
