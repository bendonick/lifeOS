import { NextRequest, NextResponse } from "next/server";
import { billExists, setBillPaid } from "@/lib/db/bills";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/bills/[id]">) {
  const { id } = await ctx.params;
  const billId = Number(id);
  if (!billExists(billId)) return NextResponse.json({ error: "unknown bill" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const month = typeof body?.month === "string" && /^\d{4}-\d{2}$/.test(body.month) ? body.month : "";
  if (!month || typeof body.paid !== "boolean") {
    return NextResponse.json({ error: "month and paid are required" }, { status: 400 });
  }

  setBillPaid(billId, month, body.paid);
  return NextResponse.json({ ok: true });
}
