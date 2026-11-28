import { NextRequest, NextResponse } from "next/server";
import { setFxRates } from "@/lib/db/bills";
import { zurichToday } from "@/lib/dates";
import { checkFxRates } from "@/lib/personal/payments";

/** The rates subscriptions are converted to francs at: `{ USD, EUR, GBP }`,
 *  francs per unit, stamped with today's date. */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const checked = checkFxRates(body ?? {});
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });
  setFxRates(checked, zurichToday());
  return NextResponse.json({ ok: true });
}
