import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createStudyLog, type StudyLogKind } from "@/lib/db/study";
import { normalizeDate, zurichToday } from "@/lib/dates";

const KINDS: StudyLogKind[] = ["study", "mock"];

/** Log one study session: `{ course_id, concept, kind?, date }`. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const concept = typeof body?.concept === "string" ? body.concept.trim() : "";
  if (!concept) return NextResponse.json({ error: "say what you studied" }, { status: 400 });
  if (concept.length > 200) return NextResponse.json({ error: "keep it under 200 characters" }, { status: 400 });

  const courseId = Number(body?.course_id);
  const course = Number.isInteger(courseId)
    ? db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId)
    : undefined;
  if (!course) return NextResponse.json({ error: "unknown course" }, { status: 400 });

  const kind = body?.kind === undefined ? "study" : body.kind;
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "invalid kind" }, { status: 400 });

  const date = typeof body?.date === "string" ? normalizeDate(body.date) : null;
  if (!date) return NextResponse.json({ error: "invalid date" }, { status: 400 });
  // A log records what happened, so it cannot be dated ahead of today.
  if (date > zurichToday()) return NextResponse.json({ error: "that day has not happened yet" }, { status: 400 });

  return NextResponse.json(createStudyLog(courseId, concept, kind, date), { status: 201 });
}
