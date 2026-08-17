import { NextRequest, NextResponse } from "next/server";
import { assignableCategories, assignCategoryToMerchant } from "@/lib/db/money";
import { upsertRule } from "@/lib/money/categorize";

// Assign a category to every row of a merchant; with always=true also save a
// lasting rule for future imports. Accepts one assignment or a batch — the
// Stage 6 tail is 111 merchants seen exactly once, and clicking Assign 111
// times is not a review, it is data entry.
//
// Partial success is reported rather than rolled back: with 100 assignments in
// flight, failing all of them because one category was unknown would be the
// worse answer.

interface Assignment {
  merchant: string;
  category: string;
  always: boolean;
}

function readAssignments(body: unknown): Assignment[] {
  const b = body as Record<string, unknown> | null;
  const raw = Array.isArray(b?.assignments) ? b.assignments : [b];
  return raw
    .map((item) => {
      const a = item as Record<string, unknown> | null;
      return {
        merchant: typeof a?.merchant === "string" ? a.merchant : "",
        category: typeof a?.category === "string" ? a.category : "",
        always: a?.always === true,
      };
    })
    .filter((a) => a.merchant && a.category);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const assignments = readAssignments(body);
  if (assignments.length === 0) {
    return NextResponse.json({ error: "merchant and category are required" }, { status: 400 });
  }

  const known = new Set(assignableCategories());
  const unknown = [...new Set(assignments.filter((a) => !known.has(a.category)).map((a) => a.category))];
  const valid = assignments.filter((a) => known.has(a.category));
  if (valid.length === 0) {
    return NextResponse.json({ error: `unknown category: ${unknown.join(", ")}` }, { status: 400 });
  }

  let updated = 0;
  let rules = 0;
  for (const a of valid) {
    updated += assignCategoryToMerchant(a.merchant, a.category);
    // upsertRule reports whether the list changed — a merchant the existing
    // rules already resolve correctly needs no rule of its own.
    if (a.always && upsertRule(a.merchant.toLowerCase(), a.category)) rules++;
  }

  return NextResponse.json({
    merchants: valid.length,
    updated,
    rulesSaved: rules,
    ...(unknown.length > 0 && { skipped: unknown }),
  });
}
