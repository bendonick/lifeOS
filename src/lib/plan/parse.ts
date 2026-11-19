import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Same shape as capture/sync.ts: the app runs the script rather than calling the
// API itself, so the LLM stays in scripts/ (docs/01-architecture.md) and the
// script is the one writer of a proposal (decision #84). `turbopackIgnore` for the
// same reason as there — the venv's python is a path outside the project root.
const SCRIPTS_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "scripts");
const PYTHON = path.join(SCRIPTS_DIR, ".venv", "bin", "python");
const PARSER = path.join(SCRIPTS_DIR, "plan_parse.py");

// One structured-output call at low effort; well under this in practice. The
// user is watching a progress line, so a hung call must end in the fallback.
const TIMEOUT_MS = 60_000;

/**
 * Run the parser on one note. The script records success or failure on the
 * note itself, so this only reports problems that kept it from running at all
 * (no venv, a crash before it could write, the timeout).
 *
 * @returns null when the script ran; otherwise a short reason to store on the note.
 */
export async function runPlanParse(noteId: number): Promise<string | null> {
  if (!fs.existsSync(PYTHON)) {
    return "scripts/.venv is missing — run ./scripts/setup.sh once to create it";
  }
  try {
    await execFileAsync(PYTHON, [PARSER, "--note", String(noteId)], {
      cwd: SCRIPTS_DIR,
      timeout: TIMEOUT_MS,
    });
    return null;
  } catch (err) {
    const e = err as { code?: number; killed?: boolean; stderr?: string };
    // Exit 1 is the script's own "failed, and recorded on the note".
    if (e.code === 1) return null;
    if (e.killed) return "the parser took longer than a minute and was stopped";
    const stderr = String(e.stderr ?? "").trim();
    return stderr.split("\n").filter(Boolean).slice(-2).join(" ") || String(err);
  }
}
