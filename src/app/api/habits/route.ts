import { NextRequest, NextResponse } from "next/server";
import { createHabit } from "@/lib/db/habits";
import { checkHabitName, isHabitTime } from "@/lib/personal/habits";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const checked = checkHabitName(body?.name);
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });
  const time = body?.time_of_day ?? "anytime";
  if (!isHabitTime(time)) return NextResponse.json({ error: "invalid time_of_day" }, { status: 400 });

  return NextResponse.json({ id: createHabit(checked.name, time) }, { status: 201 });
}
