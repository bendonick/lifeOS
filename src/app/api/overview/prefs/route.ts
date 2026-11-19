import { NextRequest, NextResponse } from "next/server";
import { getArtworkPin, getCurrently, setArtworkPin, setCurrently, type Currently } from "@/lib/db/overview";
import { artworkById } from "@/lib/overview/artwork";

const MAX_ENTRY = 80;

/**
 * Save the Overview's preferences: the two "Currently" entries and the pinned
 * print. Every field is optional; only the ones sent are changed.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const patch: Partial<Currently> = {};
  for (const key of ["building", "reading"] as const) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== "string") return NextResponse.json({ error: `${key} must be text` }, { status: 400 });
    const value = body[key].trim();
    if (value.length > MAX_ENTRY)
      return NextResponse.json({ error: `keep it under ${MAX_ENTRY} characters` }, { status: 400 });
    patch[key] = value;
  }
  if (Object.keys(patch).length > 0) setCurrently(patch);

  if (body.pin !== undefined) {
    if (body.pin !== null && (typeof body.pin !== "string" || !artworkById(body.pin)))
      return NextResponse.json({ error: "unknown print" }, { status: 400 });
    setArtworkPin(body.pin);
  }

  return NextResponse.json({ currently: getCurrently(), pin: getArtworkPin() });
}
