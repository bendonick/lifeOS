import { NextRequest, NextResponse } from "next/server";
import { createBill } from "@/lib/db/bills";
import { monthOf, zurichToday } from "@/lib/dates";
import { checkPayment } from "@/lib/personal/payments";

/** A new monthly payment: `{ name, due_day, amount_chf? }`. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const checked = checkPayment(body ?? {});
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });

  const id = createBill({ ...checked, amount_chf: checked.amount_chf ?? null }, monthOf(zurichToday()));
  return NextResponse.json({ id }, { status: 201 });
}
