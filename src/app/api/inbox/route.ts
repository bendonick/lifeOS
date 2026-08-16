import { NextRequest, NextResponse } from "next/server";
import { addCapture, unprocessedCaptures } from "@/lib/db/inbox";

export async function GET() {
  return NextResponse.json(unprocessedCaptures());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
  return NextResponse.json(addCapture(text, "app"), { status: 201 });
}
