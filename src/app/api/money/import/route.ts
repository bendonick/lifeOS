import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { existingDedupeKeys } from "@/lib/db/money";
import { categorize, loadRules } from "@/lib/money/categorize";
import { IMPORTS_DIR, parseBankCsv } from "@/lib/money/import";

// Upload → parse → preview. Never writes transactions (§5d); the file is
// archived to data/imports/ and the confirm route re-reads it from there.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file uploaded" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const detected = parseBankCsv(buf);
  if (!detected) {
    return NextResponse.json(
      { error: "not a recognised bank export (known banks: UBS)" },
      { status: 400 }
    );
  }
  const { parser, txns } = detected;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const safeName = `${stamp}-${path.basename(file.name).replace(/[^\w.-]+/g, "_")}`;
  fs.mkdirSync(IMPORTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(IMPORTS_DIR, safeName), buf);

  const rules = loadRules();
  const existing = existingDedupeKeys(txns.map((t) => t.dedupe_key));
  const fresh = txns.filter((t) => !existing.has(t.dedupe_key));

  const byCategory = new Map<string, { count: number; total_chf: number }>();
  let uncategorised = 0;
  for (const t of fresh) {
    const category = categorize(t.merchant, rules) ?? "uncategorised";
    if (category === "uncategorised") uncategorised++;
    const entry = byCategory.get(category) ?? { count: 0, total_chf: 0 };
    entry.count++;
    if (t.amount_chf < 0) entry.total_chf += -t.amount_chf;
    byCategory.set(category, entry);
  }

  const dates = txns.map((t) => t.date).sort();
  return NextResponse.json({
    file: safeName,
    bank: parser.source,
    total: txns.length,
    new: fresh.length,
    skipped: txns.length - fresh.length,
    uncategorised,
    dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    categories: [...byCategory.entries()]
      .map(([category, v]) => ({ category, count: v.count, total_chf: Math.round(v.total_chf * 100) / 100 }))
      .sort((a, b) => b.total_chf - a.total_chf),
  });
}
