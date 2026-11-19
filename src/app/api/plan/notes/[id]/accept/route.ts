import { NextRequest, NextResponse } from "next/server";
import { acceptItemError, acceptNote, noteById } from "@/lib/db/plan";
import { zurichToday } from "@/lib/dates";
import type { AcceptItem } from "@/lib/plan/types";
import { isoWeek } from "@/lib/plan/week";

const MAX_ITEMS = 50;

/**
 * Apply a draft as the user left it: new items become tasks in this week's plan,
 * matched items pull their existing task in. Returns the undo payload.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const note = noteById(id);
  if (!note) return NextResponse.json({ error: "not found" }, { status: 404 });
  // 'failed' is accepted too: that is the local-split path (decision #85).
  if (note.status !== "proposed" && note.status !== "failed")
    return NextResponse.json({ error: `this note is already ${note.status}` }, { status: 409 });

  const body = await req.json().catch(() => null);
  const raw: unknown = body?.items;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ITEMS)
    return NextResponse.json({ error: `send 1 to ${MAX_ITEMS} items` }, { status: 400 });

  const items: AcceptItem[] = raw.map((r) => ({
    title: typeof r?.title === "string" ? r.title : "",
    domain: r?.domain,
    course_id: r?.course_id ?? null,
    project_id: r?.project_id ?? null,
    group: r?.group ?? null,
    due: r?.due ?? null,
    match_id: r?.match_id ?? null,
  }));
  for (const item of items) {
    const error = acceptItemError(item);
    if (error) return NextResponse.json({ error }, { status: 400 });
  }

  const undo = acceptNote(id, isoWeek(zurichToday()), items);
  return NextResponse.json({ undo });
}
