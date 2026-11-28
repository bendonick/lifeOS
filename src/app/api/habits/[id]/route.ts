import { NextRequest, NextResponse } from "next/server";
import { archiveHabit, habitExists, setHabitDone, updateHabit } from "@/lib/db/habits";
import { checkHabitName, isHabitTime, type HabitTime } from "@/lib/personal/habits";

// One habit. PATCH does two jobs, told apart by the body: `{ date, done }`
// ticks or unticks a day; `{ name?, time_of_day? }` edits the habit itself.
// DELETE removes the habit from the page and keeps its log (archiveHabit).

async function activeId(ctx: RouteContext<"/api/habits/[id]">): Promise<number | null> {
  const { id } = await ctx.params;
  const habitId = Number(id);
  return Number.isInteger(habitId) && habitExists(habitId) ? habitId : null;
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/habits/[id]">) {
  const habitId = await activeId(ctx);
  if (habitId === null) return NextResponse.json({ error: "unknown habit" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (body && ("name" in body || "time_of_day" in body)) {
    const patch: { name?: string; time_of_day?: HabitTime } = {};
    if ("name" in body) {
      const checked = checkHabitName(body.name);
      if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });
      patch.name = checked.name;
    }
    if ("time_of_day" in body) {
      if (!isHabitTime(body.time_of_day)) return NextResponse.json({ error: "invalid time_of_day" }, { status: 400 });
      patch.time_of_day = body.time_of_day;
    }
    updateHabit(habitId, patch);
    return NextResponse.json({ ok: true });
  }

  const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : "";
  if (!date || typeof body.done !== "boolean") {
    return NextResponse.json({ error: "date and done are required" }, { status: 400 });
  }

  setHabitDone(habitId, date, body.done);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/habits/[id]">) {
  const habitId = await activeId(ctx);
  if (habitId === null) return NextResponse.json({ error: "unknown habit" }, { status: 404 });
  archiveHabit(habitId);
  return NextResponse.json({ ok: true });
}
