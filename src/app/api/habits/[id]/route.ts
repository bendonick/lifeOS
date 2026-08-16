import { NextRequest, NextResponse } from "next/server";
import { habitExists, setHabitDone } from "@/lib/db/habits";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/habits/[id]">) {
  const { id } = await ctx.params;
  const habitId = Number(id);
  if (!habitExists(habitId)) return NextResponse.json({ error: "unknown habit" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : "";
  if (!date || typeof body.done !== "boolean") {
    return NextResponse.json({ error: "date and done are required" }, { status: 400 });
  }

  setHabitDone(habitId, date, body.done);
  return NextResponse.json({ ok: true });
}
