import { NextRequest, NextResponse } from "next/server";
import { resolveLeftovers } from "@/lib/db/plan";
import { zurichToday } from "@/lib/dates";
import { isoWeek } from "@/lib/plan/week";

/**
 * Resolve the unfinished items of earlier weeks (decision #83): `carry` ids move
 * into this week, `drop` ids are deleted. Returns the undo payload.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ids = (v: unknown): number[] | null =>
    Array.isArray(v) && v.every((x) => Number.isInteger(x)) ? (v as number[]) : null;
  const carry = ids(body?.carry ?? []);
  const drop = ids(body?.drop ?? []);
  if (!carry || !drop) return NextResponse.json({ error: "carry and drop must be id lists" }, { status: 400 });
  if (carry.length + drop.length === 0) return NextResponse.json({ error: "nothing to resolve" }, { status: 400 });
  const undo = resolveLeftovers(isoWeek(zurichToday()), carry, drop);
  return NextResponse.json({ undo });
}
