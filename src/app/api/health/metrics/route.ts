import { NextRequest, NextResponse } from "next/server";
import { ingestMetrics } from "@/lib/health/ingest";

// Manual quick-entry — one row, through the same ingest boundary as everything.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : "";
  const metric = typeof body?.metric === "string" ? body.metric : "";
  const value = typeof body?.value === "number" ? body.value : NaN;

  const result = ingestMetrics([{ date, metric, value }], "manual");
  if (result.inserted === 0) {
    return NextResponse.json({ error: "invalid date, metric, or value" }, { status: 400 });
  }
  return NextResponse.json(result, { status: 201 });
}
