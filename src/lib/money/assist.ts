import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// `turbopackIgnore` for the same reason src/lib/capture/sync.ts carries it:
// without it the bundler traces `scripts/` into the build, and
// `scripts/.venv/bin/python` is a symlink to the Homebrew interpreter — outside
// the project root, so the trace fails and takes the whole build with it.
const SCRIPTS_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "scripts");
const PYTHON = path.join(SCRIPTS_DIR, ".venv", "bin", "python");
const ASSIST = path.join(SCRIPTS_DIR, "categorize_assist.py");

// The script batches 40 merchants per call, so the 122-merchant backlog is four
// sequential requests. Generous because this is a button the user is watching.
const TIMEOUT_MS = 300_000;

export interface AssistSummary {
  merchants: number; // merchants sent this run
  proposed: number; // proposals written
  failed: number; // merchants in a chunk that errored
}

/**
 * Run the categorisation assist and return its summary.
 *
 * Unlike capture ingest this has no launchd job — there is no recurring backlog
 * to drain, only an import's tail, so it runs when the user asks. It still
 * lives in `scripts/` rather than in the app: the API-calling code is the
 * intelligence layer's, and putting a second Anthropic client in the webapp
 * would put an LLM one import away from the render path.
 */
export async function runCategorizeAssist(): Promise<AssistSummary> {
  if (!fs.existsSync(PYTHON)) {
    throw new Error("scripts/.venv is missing — run `./scripts/setup.sh` once to create it");
  }

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(PYTHON, [ASSIST], {
      cwd: SCRIPTS_DIR,
      timeout: TIMEOUT_MS,
    }));
  } catch (err) {
    // execFile rejects on a non-zero exit; the script's own message is on stderr
    // and is far more useful than "Command failed".
    const stderr = String((err as { stderr?: string }).stderr ?? "").trim();
    throw new Error(stderr.split("\n").filter(Boolean).slice(-3).join(" ") || String(err));
  }

  const summary = JSON.parse(stdout.trim().split("\n").at(-1) ?? "{}") as Partial<AssistSummary>;
  return {
    merchants: summary.merchants ?? 0,
    proposed: summary.proposed ?? 0,
    failed: summary.failed ?? 0,
  };
}
