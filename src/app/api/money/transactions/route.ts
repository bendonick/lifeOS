import { NextRequest, NextResponse } from "next/server";
import { addManualTransaction, assignableCategories } from "@/lib/db/money";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : "";
  const amount = typeof body?.amount_chf === "number" ? body.amount_chf : NaN;
  const merchant = typeof body?.merchant === "string" ? body.merchant.trim() : "";
  if (!date || !Number.isFinite(amount) || amount <= 0 || !merchant) {
    return NextResponse.json(
      { error: "date, positive amount_chf, and merchant are required" },
      { status: 400 }
    );
  }
  const category =
    typeof body.category === "string" && assignableCategories().includes(body.category)
      ? body.category
      : null;

  const id = addManualTransaction({
    date,
    amount_chf: amount,
    merchant,
    category,
    note: typeof body.note === "string" && body.note ? body.note : null,
  });
  return NextResponse.json({ id }, { status: 201 });
}
