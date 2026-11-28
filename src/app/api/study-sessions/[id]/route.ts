import { NextRequest, NextResponse } from "next/server";
import { logKind, readSessionText } from "@/lib/academic/study";
import { deleteStudyLog, updateStudyLog } from "@/lib/db/study";

/** Edit a logged session: `{ title, description? }`. The kind follows the new
 *  title (`logKind`); the course and the day do not change. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/study-sessions/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const text = readSessionText(body);
  if ("error" in text) return NextResponse.json({ error: text.error }, { status: 400 });
  const updated = updateStudyLog(Number(id), { ...text, kind: logKind(text.title) });
  if (!updated) return NextResponse.json({ error: "unknown session" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/study-sessions/[id]">) {
  const { id } = await ctx.params;
  if (!deleteStudyLog(Number(id))) return NextResponse.json({ error: "unknown session" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
