import { NextRequest, NextResponse } from "next/server";
import { assignableCategories, assignCategoryToMerchant } from "@/lib/db/money";
import { appendRule } from "@/lib/money/categorize";

// One click from the uncategorised queue: assign a category to all of a
// merchant's uncategorised rows; with always=true also append a lasting rule.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const merchant = typeof body?.merchant === "string" ? body.merchant : "";
  const category = typeof body?.category === "string" ? body.category : "";
  if (!merchant || !assignableCategories().includes(category)) {
    return NextResponse.json({ error: "merchant and a known category are required" }, { status: 400 });
  }

  const updated = assignCategoryToMerchant(merchant, category);
  if (body.always === true) appendRule(merchant.toLowerCase(), category);
  return NextResponse.json({ updated, ruleAdded: body.always === true });
}
