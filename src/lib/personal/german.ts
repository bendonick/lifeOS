/**
 * The German word-of-the-day brief, taken apart for the card (decision #81).
 *
 * The scripts write one shape (scripts/lifeos/briefs.py): a first line of
 * `**word** (note) — *translation*`, then an example sentence with its
 * translation in italics on the next line, then any further context. The card
 * shows the first two at rest and the rest behind "More context". A brief that
 * does not fit the shape returns null and renders through the Markdown
 * renderer instead — a stray format is still readable, never blank.
 *
 * Pure: no SQLite, no React.
 */
export interface GermanWord {
  word: string;
  /** The parenthesised note after the word — a reflexive form, a gender, a plural. */
  note: string | null;
  translation: string | null;
  example: string | null;
  exampleEn: string | null;
  /** Remaining markdown, for the disclosure. Empty when there is none. */
  context: string;
}

export function parseGermanWord(md: string): GermanWord | null {
  const paragraphs = md
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const head = paragraphs[0]?.match(/^\*\*([^*]+)\*\*\s*(?:\(([^)]*)\))?\s*(?:[—–-]+\s*)?(?:\*([^*]+)\*)?\s*$/);
  if (!head) return null;

  let example: string | null = null;
  let exampleEn: string | null = null;
  let rest = paragraphs.slice(1);
  const second = rest[0]?.split("\n").map((l) => l.trim()) ?? [];
  // An example is a plain German line, optionally followed by its italic
  // translation. A paragraph that opens in italics or with a bullet is context.
  if (second.length > 0 && second.length <= 2 && !/^[*\-•]/.test(second[0])) {
    example = second[0];
    const en = second[1]?.match(/^\*(.+)\*$/);
    exampleEn = en ? en[1].trim() : null;
    rest = rest.slice(1);
  }

  return {
    word: head[1].trim(),
    note: head[2]?.trim() || null,
    translation: head[3]?.trim() || null,
    example,
    exampleEn,
    context: rest.join("\n\n"),
  };
}
