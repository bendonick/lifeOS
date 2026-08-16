import { NextRequest, NextResponse } from "next/server";
import { setNoteReviewed } from "@/lib/db/notes";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/notes/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (typeof body?.reviewed !== "boolean") {
    return NextResponse.json({ error: "reviewed is required" }, { status: 400 });
  }
  const note = setNoteReviewed(Number(id), body.reviewed);
  if (!note) return NextResponse.json({ error: "unknown note" }, { status: 404 });
  return NextResponse.json(note);
}
