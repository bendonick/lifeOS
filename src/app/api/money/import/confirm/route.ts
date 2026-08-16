import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { writeImport } from "@/lib/db/money";
import { categorize, loadRules } from "@/lib/money/categorize";
import { IMPORTS_DIR, parseBankCsv } from "@/lib/money/import";

// The write half of the preview→confirm flow: re-reads the archived file so
// what lands is exactly what was previewed.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.file === "string" ? path.basename(body.file) : "";
  const filePath = path.join(IMPORTS_DIR, name);
  if (!name || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: "unknown import file — upload again" }, { status: 400 });
  }

  const detected = parseBankCsv(fs.readFileSync(filePath));
  if (!detected) {
    return NextResponse.json({ error: "file no longer parses" }, { status: 400 });
  }

  const rules = loadRules();
  const categorised = detected.txns.map((t) => ({ ...t, category: categorize(t.merchant, rules) }));
  const result = writeImport(name, detected.parser.source, categorised);
  return NextResponse.json(result, { status: 201 });
}
