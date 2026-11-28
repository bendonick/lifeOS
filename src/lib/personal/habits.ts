// The habit name rule, shared by the page's form and the API routes. Pure and
// client-safe: the form checks with the same rule the route enforces.

export const HABIT_NAME_MAX = 60;

/** A trimmed, single-spaced name, or an error in words. */
export function checkHabitName(raw: unknown): { name: string } | { error: string } {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!name) return { error: "give the habit a name" };
  if (name.length > HABIT_NAME_MAX) return { error: `keep the name under ${HABIT_NAME_MAX} characters` };
  return { name };
}
