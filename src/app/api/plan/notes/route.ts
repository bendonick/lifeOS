import { NextRequest, NextResponse } from "next/server";
import { createNote, noteById, proposalOf, setNoteStatus } from "@/lib/db/plan";
import { zurichToday } from "@/lib/dates";
import { friendlyParseError } from "@/lib/plan/errors";
import { runPlanParse } from "@/lib/plan/parse";
import { isoWeek } from "@/lib/plan/week";

const MAX_NOTE = 4000;

/**
 * Save a brain dump and parse it into a draft (decisions #84/#85). The note is
 * written before the parser starts, so a failed parse never loses it. A failure
 * is a normal answer here (200 with status "failed"): the client offers the
 * local split, and the note stays on record either way.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "write at least one thing first" }, { status: 400 });
  if (text.length > MAX_NOTE)
    return NextResponse.json({ error: `keep the note under ${MAX_NOTE} characters` }, { status: 400 });

  const note = createNote(isoWeek(zurichToday()), text);
  const runError = await runPlanParse(note.id);
  if (runError) setNoteStatus(note.id, "failed", runError);

  const after = noteById(note.id)!;
  if (after.status === "proposed") {
    return NextResponse.json({ note_id: after.id, status: "proposed", proposal: proposalOf(after) });
  }
  // 'pending' here means the script exited without recording anything.
  if (after.status === "pending") setNoteStatus(after.id, "failed", "the parser stopped without an answer");
  const detail = after.error ?? runError ?? "the parser stopped without an answer";
  return NextResponse.json({ note_id: after.id, status: "failed", error: friendlyParseError(detail), detail });
}
