import { NextRequest, NextResponse } from "next/server";
import { createNote } from "@/lib/db/notes";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
  return NextResponse.json(createNote(text), { status: 201 });
}
