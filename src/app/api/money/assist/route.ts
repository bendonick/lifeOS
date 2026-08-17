import { NextResponse } from "next/server";
import { runCategorizeAssist } from "@/lib/money/assist";

// Propose a category for every uncategorised merchant that lacks one
// (decision #36: the script proposes, the app applies when the user accepts).
// On-demand only — there is no scheduled job behind this one.
export async function POST() {
  try {
    return NextResponse.json(await runCategorizeAssist());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
