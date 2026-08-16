// The follow-up queue's one owner: membership, ordering, label and urgency.
// Pure and dependency-free (the src/lib/money/pace.ts precedent) so client
// components can import it without pulling SQLite into the browser bundle.
//
// `next_followup` IS a due date, so thresholds and colour delegate to dueInfo()
// in @/lib/dates + urgencyText in @/components/ui/accents — no new colour
// vocabulary enters the codebase (one exported helper per threshold).

import { addDays, dueInfo, type Urgency } from "@/lib/dates";

/** last_contacted + interval. Null when either half is missing. */
export function nextFollowup(
  lastContacted: string | null,
  intervalDays: number | null
): string | null {
  if (!intervalDays || intervalDays <= 0) return null;
  if (!lastContacted) return null;
  return addDays(lastContacted.slice(0, 10), intervalDays);
}

export interface FollowupInfo {
  /** Whether the contact belongs in the "Due for follow-up" view at all. */
  inQueue: boolean;
  /** Sort ascending on this; never-contacted floats to the top, off-queue sinks. */
  sortKey: string;
  label: string;
  urgency: Urgency;
}

/**
 * Rules, each a judgment call kept in one place:
 *  - No interval → not in the queue. Never invent a cadence the user didn't set.
 *    The contact still appears under "All contacts".
 *  - Interval set but never contacted → in the queue, sorts first, urgency "none".
 *    It isn't late; you just haven't started. Warm colour means urgency only.
 *  - Otherwise label and urgency come verbatim from dueInfo().
 */
export function followupInfo(
  next: string | null,
  intervalDays: number | null
): FollowupInfo {
  if (!intervalDays || intervalDays <= 0) {
    return { inQueue: false, sortKey: "￿", label: "no cadence set", urgency: "none" };
  }
  if (!next) {
    return { inQueue: true, sortKey: "", label: "never contacted", urgency: "none" };
  }
  const { label, urgency } = dueInfo(next);
  return { inQueue: true, sortKey: next, label, urgency };
}
