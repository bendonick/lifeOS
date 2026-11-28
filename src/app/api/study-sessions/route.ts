import { NextRequest, NextResponse } from "next/server";
import { logKind, readSessionText } from "@/lib/academic/study";
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
  const text = readSessionText(body);
  if ("error" in text) return NextResponse.json({ error: text.error }, { status: 400 });
  const { title, description } = text;

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
    createStudyLog({ courseId, title, description, kind: logKind(title), date }),
    { status: 201 }
  );
}
