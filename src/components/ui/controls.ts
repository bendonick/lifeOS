// One source for the form-control chrome strings.
//
// These were copied by hand into every form on the page — the design system's own
// advice ("copy the chrome from a sibling component") is fine for the second
// instance and stops scaling at the fifth. Extracting the quick-add forms made
// it five, and five hand-copied strings is how one input ends up 1px taller
// than the one beside it.
//
// Accent-dependent parts stay out of here and come from `accents.ts`, so a
// control can't hardcode a domain colour.

export const inputChrome =
  "rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint";

/** Narrow numeric/date/time fields: less horizontal padding, right-aligned by caller. */
export const fieldChrome =
  "rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted";

export const selectChrome =
  "rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted";

export const buttonChrome =
  "rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text transition-colors";

/** The one emphasised button on a surface — a Quick add, a confirm. */
export const primaryButtonChrome =
  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors";
