// Habit fields shared by the page's form and the API route. Pure and
// client-safe: the form validates with the same rules the route enforces.

export type HabitTime = "morning" | "anytime" | "evening";

/** The list runs morning → any time → evening; the form offers them in that order. */
export const HABIT_TIMES: { value: HabitTime; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "anytime", label: "Any time" },
  { value: "evening", label: "Evening" },
];

export const HABIT_NAME_MAX = 60;

export function isHabitTime(v: unknown): v is HabitTime {
  return HABIT_TIMES.some((t) => t.value === v);
}

/** A trimmed name, or an error in words. */
export function checkHabitName(raw: unknown): { name: string } | { error: string } {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!name) return { error: "give the habit a name" };
  if (name.length > HABIT_NAME_MAX) return { error: `keep the name under ${HABIT_NAME_MAX} characters` };
  return { name };
}
