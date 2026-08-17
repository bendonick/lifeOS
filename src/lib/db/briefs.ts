import { db } from "@/lib/db";

export interface Brief {
  id: number;
  date: string;
  kind: string;
  content_md: string;
  generated_at: string;
}

/**
 * The three brief kinds Stage 5 ships (decision #35 dropped email_todos). Order
 * is the order they render on the hub. `briefs.kind` still accepts 'email_todos'
 * so bringing it back is a new script, not a migration.
 */
export const BRIEF_KINDS = ["world", "ai_research", "german_word"] as const;
export type BriefKind = (typeof BRIEF_KINDS)[number];

export const BRIEF_LABEL: Record<BriefKind, string> = {
  world: "World brief",
  ai_research: "AI research",
  german_word: "German word of the day",
};

/** What each card says before its script has ever run (docs/03-pages/lifeos.md §1). */
export const BRIEF_PLACEHOLDER: Record<BriefKind, string> = {
  world: "a few headline summaries worth knowing",
  ai_research: "suggested papers and articles, with links",
  german_word: "word, translation, example sentence",
};

/**
 * The newest brief of each kind — not today's. A brief that failed to generate
 * this morning shows yesterday's, labelled stale; blanking the card would hide
 * both the content and the fact that a script stopped running.
 */
export function latestBriefs(): Partial<Record<BriefKind, Brief>> {
  const rows = db
    .prepare(
      `SELECT * FROM briefs b
       WHERE b.date = (SELECT MAX(date) FROM briefs WHERE kind = b.kind)
       ORDER BY b.kind`
    )
    .all() as Brief[];
  return Object.fromEntries(rows.map((b) => [b.kind, b]));
}

/** Latest German word-of-the-day brief; null until Stage 5 starts writing them. */
export function latestGermanWord(): Brief | null {
  return (
    (db
      .prepare("SELECT * FROM briefs WHERE kind = 'german_word' ORDER BY date DESC LIMIT 1")
      .get() as Brief | undefined) ?? null
  );
}
