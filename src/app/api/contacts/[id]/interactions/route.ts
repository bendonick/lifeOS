import { NextRequest, NextResponse } from "next/server";
import { logInteraction } from "@/lib/db/contacts";
import { normalizeDate, zurichToday } from "@/lib/dates";

/**
 * Log an interaction (decision #30). Writes history AND advances last_contacted,
 * so the follow-up queue reshuffles; the refreshed contact comes back so the
 * caller can show the new position without a second round trip.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const raw = typeof body?.date === "string" && body.date.trim() ? body.date.trim() : null;
  const date = raw === null ? zurichToday() : normalizeDate(raw);
  if (!date) return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });

  const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null;

  const contact = logInteraction(id, { date, note });
  if (!contact) return NextResponse.json({ error: "unknown contact" }, { status: 404 });
  return NextResponse.json(contact, { status: 201 });
}
