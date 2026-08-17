import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// `turbopackIgnore` because these are runtime tools, not bundled assets: without
// it the bundler traces `scripts/` into the build, and `scripts/.venv/bin/python`
// is a symlink to the Homebrew interpreter — outside the project root, so the
// trace fails and takes the whole build with it.
const SCRIPTS_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "scripts");
const PYTHON = path.join(SCRIPTS_DIR, ".venv", "bin", "python");
const INGEST = path.join(SCRIPTS_DIR, "capture_ingest.py");

// Parsing 25 captures is 25 sequential API calls in the worst case; the launchd
// job normally keeps the backlog at zero, so a Sync click has one or two to do.
const TIMEOUT_MS = 180_000;

export interface SyncSummary {
  file: string;
  file_exists: boolean;
  lines: number;
  ingested: number;
  parsed: number;
  parse_failed: number;
  malformed: number;
}

/**
 * Run the capture ingest script and return its summary.
 *
 * The Sync button and the launchd job run the *same* script rather than two
 * implementations of the same logic — the app is a dev server that is often not
 * running, so ingest can't live behind an HTTP endpoint the scheduler calls.
 */
export async function runCaptureSync(): Promise<SyncSummary> {
  if (!fs.existsSync(PYTHON)) {
    throw new Error("scripts/.venv is missing — run `./scripts/setup.sh` once to create it");
  }

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(PYTHON, [INGEST], {
      cwd: SCRIPTS_DIR,
      timeout: TIMEOUT_MS,
    }));
  } catch (err) {
    // execFile rejects on a non-zero exit; the script's own message is on stderr
    // and is far more useful than "Command failed".
    const stderr = String((err as { stderr?: string }).stderr ?? "").trim();
    throw new Error(stderr.split("\n").filter(Boolean).slice(-3).join(" ") || String(err));
  }

  const summary = JSON.parse(stdout.trim().split("\n").at(-1) ?? "{}") as Partial<SyncSummary>;
  return {
    file: summary.file ?? "",
    file_exists: summary.file_exists ?? false,
    lines: summary.lines ?? 0,
    ingested: summary.ingested ?? 0,
    parsed: summary.parsed ?? 0,
    parse_failed: summary.parse_failed ?? 0,
    malformed: summary.malformed ?? 0,
  };
}
