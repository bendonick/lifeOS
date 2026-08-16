import { db } from "@/lib/db";

export interface Brief {
  id: number;
  date: string;
  kind: string;
  content_md: string;
  generated_at: string;
}

/** Latest German word-of-the-day brief; null until Stage 5 starts writing them. */
export function latestGermanWord(): Brief | null {
  return (
    (db
      .prepare("SELECT * FROM briefs WHERE kind = 'german_word' ORDER BY date DESC LIMIT 1")
      .get() as Brief | undefined) ?? null
  );
}
