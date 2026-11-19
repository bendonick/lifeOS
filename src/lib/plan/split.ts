// The Week plan's local fallback (decision #85): when the parser cannot run, the
// note still becomes items. Deliberately dumb — split on the separators people
// type between thoughts, strip the "I need to" lead-ins, capitalise. No domain
// guessing: the draft defaults every item to Personal and lets the user change it.

const SEPARATORS = /[,;\n•]+/;

// "I need to", "want to go", "should", "and I have to" … at the start of a piece.
// The lead-in carries intent, not content, and every parsed title would drop it too.
const LEAD_IN =
  /^(?:and\s+|also\s+|then\s+)?(?:i\s+)?(?:really\s+)?(?:need|want|have|has|should|must|gotta|got|ought)(?:\s+to)?\s+(?:go\s+(?:and\s+)?)?/i;

/** Split a brain dump into item titles, in the order they were written. */
export function splitNote(text: string): string[] {
  return text
    .split(SEPARATORS)
    .map((piece) => piece.trim().replace(LEAD_IN, "").trim())
    .map((piece) => piece.replace(/[.!?]+$/, "").trim())
    .filter((piece) => piece.length > 0)
    .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
    .map((piece) => piece.slice(0, 200));
}
