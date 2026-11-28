import { NextRequest, NextResponse } from "next/server";
import { archiveBill, billExists, setBillPaid, updateBill } from "@/lib/db/bills";
import { checkPayment } from "@/lib/personal/payments";

// One monthly payment. PATCH does two jobs, told apart by the body:
// `{ month, paid }` ticks or unticks a month; `{ name, due_day, amount_chf? }`
// edits it. DELETE takes it off the lists and keeps its paid log.

async function activeId(ctx: RouteContext<"/api/bills/[id]">): Promise<number | null> {
  const { id } = await ctx.params;
  const billId = Number(id);
  return Number.isInteger(billId) && billExists(billId) ? billId : null;
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/bills/[id]">) {
  const billId = await activeId(ctx);
  if (billId === null) return NextResponse.json({ error: "unknown bill" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (body && "name" in body) {
    const checked = checkPayment(body);
    if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });
    updateBill(billId, checked);
    return NextResponse.json({ ok: true });
  }

  const month = typeof body?.month === "string" && /^\d{4}-\d{2}$/.test(body.month) ? body.month : "";
  if (!month || typeof body.paid !== "boolean") {
    return NextResponse.json({ error: "month and paid are required" }, { status: 400 });
  }

  setBillPaid(billId, month, body.paid);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/bills/[id]">) {
  const billId = await activeId(ctx);
  if (billId === null) return NextResponse.json({ error: "unknown bill" }, { status: 404 });
  archiveBill(billId);
  return NextResponse.json({ ok: true });
}
