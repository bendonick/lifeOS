import { curriculumState } from "@/lib/professional/curriculum";
import type { LearningItem } from "@/lib/types";

/**
 * The slim line above the AI/RL concepts table: which curriculum phase is
 * live (decision #68). Server component on purpose: the table's own
 * `router.refresh()` after every status flip re-renders this line for free.
 */

/** Dev-only, once per drift set: a mapped name with no row is a silent rename. */
let warnedFor = "";
function warnUnmatched(unmatched: string[]) {
  const key = unmatched.join("|");
  if (process.env.NODE_ENV === "production" || unmatched.length === 0 || key === warnedFor) return;
  warnedFor = key;
  console.warn(
    `[curriculum] ${unmatched.length} curriculum name(s) have no learning_items row — ` +
      `renamed in the table without updating src/lib/professional/curriculum.ts? ` +
      unmatched.map((n) => `"${n}"`).join(", ")
  );
}

export function LearningPhase({ items }: { items: LearningItem[] }) {
  const state = curriculumState(items);
  warnUnmatched(state.unmatched);

  // No curriculum rows at all (fresh db): nothing truthful to say, so say nothing.
  if (state.matched === 0) return null;

  if (!state.next || !state.phase) {
    return (
      <p className="mb-4 text-sm text-muted">
        Roadmap complete — {state.learned} learned
        {state.dropped > 0 ? `, ${state.dropped} dropped` : ""}.
      </p>
    );
  }

  return (
    <p className="mb-4 text-sm text-muted">
      Phase {state.phase.number} — {state.phase.name}
    </p>
  );
}
