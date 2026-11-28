import { NextRequest, NextResponse } from "next/server";
import { activeHabitIds, createHabit, reorderHabits } from "@/lib/db/habits";
import { checkHabitName } from "@/lib/personal/habits";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const checked = checkHabitName(body?.name);
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });

  return NextResponse.json({ id: createHabit(checked.name) }, { status: 201 });
}

/** `{ order: [ids] }`: the list's new order. It must name every active habit
 *  exactly once, so a stale page (a habit added or removed in another tab)
 *  is refused rather than half-applied. */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const order: unknown = body?.order;
  const current = activeHabitIds();
  const valid =
    Array.isArray(order) &&
    order.length === current.length &&
    order.every((id) => Number.isInteger(id)) &&
    new Set(order).size === order.length &&
    current.every((id) => order.includes(id));
  if (!valid) return NextResponse.json({ error: "the list changed, reload and try again" }, { status: 409 });

  reorderHabits(order as number[]);
  return NextResponse.json({ ok: true });
}
