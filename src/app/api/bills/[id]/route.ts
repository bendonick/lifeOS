import { NextRequest, NextResponse } from "next/server";
import { archiveBill, billExists, billKind, setBillCancelled, setBillNote, setBillPaid, updateBill } from "@/lib/db/bills";
import { zurichToday } from "@/lib/dates";
import { checkCancelDate, checkPayment, checkPaymentNote } from "@/lib/personal/payments";

// One monthly payment. PATCH does three jobs, told apart by the body:
// `{ month, paid }` ticks or unticks a month; `{ name, due_day, amount_chf?,
// kind?, tags?, currency? }` edits it (what is left out stays as it was);
// `{ note }` sets its note (empty or null clears it); `{ cancelled_on }`
// cancels a subscription on that day, or restores it with null. DELETE takes
// it off the lists and keeps its paid log.

async function activeId(ctx: RouteContext<"/api/bills/[id]">): Promise<number | null> {
  const { id } = await ctx.params;
  const billId = Number(id);
  return Number.isInteger(billId) && billExists(billId) ? billId : null;
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/bills/[id]">) {
  const billId = await activeId(ctx);
  if (billId === null) return NextResponse.json({ error: "unknown bill" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (body && "note" in body) {
    const checked = checkPaymentNote(body.note);
    if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });
    setBillNote(billId, checked.note);
    return NextResponse.json({ ok: true });
  }
  if (body && "cancelled_on" in body) {
    if (billKind(billId) !== "subscription") {
      return NextResponse.json({ error: "only a subscription can be cancelled" }, { status: 400 });
    }
    const checked = checkCancelDate(body.cancelled_on, zurichToday());
    if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });
    setBillCancelled(billId, checked.cancelled_on);
    return NextResponse.json({ ok: true });
  }
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
