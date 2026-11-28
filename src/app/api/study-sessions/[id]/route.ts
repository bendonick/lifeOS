import { NextRequest, NextResponse } from "next/server";
import { logKind, readReview, readSessionText } from "@/lib/academic/study";
import { deleteStudyLog, setStudyLogReview, updateStudyLog, type StudyLog } from "@/lib/db/study";

/**
 * Edit a logged session. `{ review }` alone flags it to go over again or clears
 * the flag (decision #102). `{ title, description?, review? }` rewrites its
 * text; the kind follows the new title (`logKind`). The course and the day do
 * not change.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/study-sessions/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const review = readReview(body);
  if (typeof review === "object") return NextResponse.json({ error: review.error }, { status: 400 });

  const textGiven = body && typeof body === "object" && ("title" in body || "description" in body);
  let updated: StudyLog | undefined;
  if (!textGiven && review !== undefined) {
    updated = setStudyLogReview(Number(id), review);
  } else {
    const text = readSessionText(body);
    if ("error" in text) return NextResponse.json({ error: text.error }, { status: 400 });
    updated = updateStudyLog(Number(id), { ...text, kind: logKind(text.title), review });
  }
  if (!updated) return NextResponse.json({ error: "unknown session" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/study-sessions/[id]">) {
  const { id } = await ctx.params;
  if (!deleteStudyLog(Number(id))) return NextResponse.json({ error: "unknown session" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
