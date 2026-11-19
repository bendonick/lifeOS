// What the Week plan says when the parser fails (decision #85): what went wrong,
// in the interface's voice, without the stack. The raw message stays on the note.

const RULES: Array<[RegExp, string]> = [
  [/401|authentication|x-api-key|ANTHROPIC_API_KEY/i, "The API key was rejected, so the planner could not run."],
  [/\.venv is missing|setup\.sh/i, "The planner is not installed yet (run ./scripts/setup.sh once)."],
  [/longer than a minute|timed? ?out/i, "The planner took too long to answer."],
  [/429|rate.?limit|overloaded|529/i, "The planner is busy right now."],
  [/declined|refusal/i, "The planner declined this note."],
];

export function friendlyParseError(raw: string | null | undefined): string {
  for (const [pattern, message] of RULES) if (raw && pattern.test(raw)) return message;
  return "The planner could not run.";
}
