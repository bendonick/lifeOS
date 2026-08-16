import { NextRequest, NextResponse } from "next/server";
import { deleteContact, updateContact } from "@/lib/db/contacts";
import { readContactBody } from "../route";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const input = readContactBody(await req.json().catch(() => null));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });

  const contact = updateContact(id, {
    name: input.name,
    company: input.company ?? null,
    role: input.role ?? null,
    how_met: input.how_met ?? null,
    linkedin: input.linkedin ?? null,
    last_contacted: input.last_contacted ?? null,
    followup_interval_days: input.followup_interval_days ?? null,
    notes: input.notes ?? null,
  });
  if (!contact) return NextResponse.json({ error: "unknown contact" }, { status: 404 });
  return NextResponse.json(contact);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  // The interaction history cascades with the contact (schema ON DELETE CASCADE) —
  // the caller's confirm text has to say so.
  if (!deleteContact(id)) return NextResponse.json({ error: "unknown contact" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
