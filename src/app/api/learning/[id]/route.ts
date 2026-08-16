import { NextRequest, NextResponse } from "next/server";
import { deleteLearningItem, isLearningStatus, updateLearningItem } from "@/lib/db/learning";
import { normalizeDate } from "@/lib/dates";

/**
 * Partial by design: the table edits one cell at a time (a status select, a date
 * field), so only the keys actually present are written. Flipping status stamps
 * an empty started/completed server-side — see updateLearningItem.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const b = body as Record<string, unknown>;

  const patch: Parameters<typeof updateLearningItem>[1] = {};

  if (b.name !== undefined) {
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name) return NextResponse.json({ error: "topic is required" }, { status: 400 });
    patch.name = name;
  }
  if (b.status !== undefined) {
    if (!isLearningStatus(b.status))
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    patch.status = b.status;
  }
  if (b.link !== undefined) {
    patch.link = typeof b.link === "string" && b.link.trim() ? b.link.trim() : null;
  }
  for (const key of ["started", "completed"] as const) {
    if (b[key] === undefined) continue;
    const raw = typeof b[key] === "string" ? (b[key] as string).trim() : "";
    if (!raw) {
      patch[key] = null;
      continue;
    }
    const normalized = normalizeDate(raw);
    if (!normalized)
      return NextResponse.json({ error: `${key} must be YYYY-MM-DD` }, { status: 400 });
    patch[key] = normalized;
  }

  const item = updateLearningItem(id, patch);
  if (!item) return NextResponse.json({ error: "unknown learning item" }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  if (!deleteLearningItem(id))
    return NextResponse.json({ error: "unknown learning item" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
