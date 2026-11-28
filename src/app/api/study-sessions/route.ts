import { NextRequest, NextResponse } from "next/server";
import { logKind } from "@/lib/academic/study";
import { db } from "@/lib/db";
import { createStudyLog } from "@/lib/db/study";
import { normalizeDate, zurichToday } from "@/lib/dates";

/**
 * Log one study session: `{ course_id, title, description?, date? }`. The day
 * defaults to today and cannot be ahead of it. Whether it fills a mock exam
 * segment is read from the title (`logKind`).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "give the session a title" }, { status: 400 });
  if (title.length > 120) return NextResponse.json({ error: "keep the title under 120 characters" }, { status: 400 });

  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (description.length > 2000)
    return NextResponse.json({ error: "keep the description under 2000 characters" }, { status: 400 });

  const courseId = Number(body?.course_id);
  const course = Number.isInteger(courseId)
    ? db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId)
    : undefined;
  if (!course) return NextResponse.json({ error: "unknown course" }, { status: 400 });

  const today = zurichToday();
  const date = body?.date === undefined ? today : typeof body.date === "string" ? normalizeDate(body.date) : null;
  if (!date) return NextResponse.json({ error: "invalid date" }, { status: 400 });
  // A log records what happened, so it cannot be dated ahead of today.
  if (date > today) return NextResponse.json({ error: "that day has not happened yet" }, { status: 400 });

  return NextResponse.json(
    createStudyLog({ courseId, title, description: description || null, kind: logKind(title), date }),
    { status: 201 }
  );
}
