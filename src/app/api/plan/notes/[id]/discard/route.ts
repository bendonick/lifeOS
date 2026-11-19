import { NextRequest, NextResponse } from "next/server";
import { noteById, setNoteStatus } from "@/lib/db/plan";

/** Close a draft without applying it. The note text stays on record. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const note = noteById(id);
  if (!note) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (note.status === "proposed" || note.status === "failed") setNoteStatus(id, "discarded", note.error);
  return NextResponse.json({ ok: true });
}
