import { NextRequest, NextResponse } from "next/server";
import { createNote, type Note } from "@/lib/db/notes";
import { DOMAINS } from "@/lib/types";

const NOTE_KINDS: Note["kind"][] = ["note", "reminder", "idea"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  // Academic Reminders and Professional Ideas are the same table, filtered
  // (decision #16) — so the route takes domain/kind instead of hardcoding personal.
  const domain = body.domain === undefined ? "personal" : body.domain;
  if (domain !== null && !DOMAINS.includes(domain))
    return NextResponse.json({ error: "invalid domain" }, { status: 400 });
  const kind = body.kind === undefined ? "note" : body.kind;
  if (!NOTE_KINDS.includes(kind))
    return NextResponse.json({ error: "invalid kind" }, { status: 400 });

  return NextResponse.json(createNote(text, domain, kind), { status: 201 });
}
