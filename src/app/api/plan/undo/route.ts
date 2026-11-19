import { NextRequest, NextResponse } from "next/server";
import { isUndoPayload, undoApply } from "@/lib/db/plan";

/** Reverse one apply — an accept, a carry-over or a drop — from the payload it returned. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!isUndoPayload(body?.undo)) return NextResponse.json({ error: "invalid undo payload" }, { status: 400 });
  undoApply(body.undo);
  return NextResponse.json({ ok: true });
}
