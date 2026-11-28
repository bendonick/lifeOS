import { NextRequest, NextResponse } from "next/server";
import { deleteStudyLog } from "@/lib/db/study";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/study-sessions/[id]">) {
  const { id } = await ctx.params;
  if (!deleteStudyLog(Number(id))) return NextResponse.json({ error: "unknown session" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
