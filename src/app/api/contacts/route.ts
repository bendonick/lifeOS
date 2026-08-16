import { NextRequest, NextResponse } from "next/server";
import { createContact, type ContactInput } from "@/lib/db/contacts";
import { normalizeDate } from "@/lib/dates";

/** Shared body → ContactInput mapping for POST and PATCH. Returns a message on rejection. */
export function readContactBody(body: unknown): ContactInput | string {
  if (!body || typeof body !== "object") return "invalid body";
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return "name is required";

  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const rawLast = text(b.last_contacted);
  const last_contacted = rawLast === null ? null : normalizeDate(rawLast);
  if (rawLast !== null && last_contacted === null) return "last contacted must be YYYY-MM-DD";

  let interval: number | null = null;
  if (b.followup_interval_days !== null && b.followup_interval_days !== undefined && b.followup_interval_days !== "") {
    const n = Number(b.followup_interval_days);
    if (!Number.isInteger(n) || n <= 0) return "follow-up interval must be a whole number of days";
    interval = n;
  }

  return {
    name,
    company: text(b.company),
    role: text(b.role),
    // how_met is open TEXT on purpose (schema) — the five options are offered, not enforced.
    how_met: text(b.how_met),
    linkedin: text(b.linkedin),
    last_contacted,
    followup_interval_days: interval,
    notes: text(b.notes),
  };
}

export async function POST(req: NextRequest) {
  const input = readContactBody(await req.json().catch(() => null));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  return NextResponse.json(createContact(input), { status: 201 });
}
