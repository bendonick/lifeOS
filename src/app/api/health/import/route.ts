import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getConfigJSON } from "@/lib/db/config";
import { ingestMetrics, type IngestRow } from "@/lib/health/ingest";
import type { MetricKey } from "@/lib/health/metrics";
import { decodeCsv, detectDelimiter, parseDelimited } from "@/lib/money/csv";
import { IMPORTS_DIR } from "@/lib/money/import";

// Health CSV import (§2): the file format is data, not code — named mappings
// live in config under health.csv_mappings, so a new export format is a config
// edit. Rows go through ingestMetrics like every other write.

interface HealthCsvMapping {
  dateColumn: string;
  dateFormat?: string; // default ISO; normalizeDate also accepts DD.MM.YYYY
  columns: Record<string, MetricKey>; // csv header -> metric key
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const mappingName = form?.get("mapping");
  if (!(file instanceof File) || typeof mappingName !== "string") {
    return NextResponse.json({ error: "file and mapping are required" }, { status: 400 });
  }

  const mappings = getConfigJSON<Record<string, HealthCsvMapping>>("health.csv_mappings", {});
  const mapping = mappings[mappingName];
  if (!mapping) {
    return NextResponse.json(
      { error: `unknown mapping "${mappingName}" — known: ${Object.keys(mappings).join(", ") || "none"}` },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const text = decodeCsv(buf);
  const rows = parseDelimited(text, detectDelimiter(text));
  if (rows.length < 2) return NextResponse.json({ error: "empty CSV" }, { status: 400 });

  const headers = rows[0].map((h) => h.trim());
  const dateIdx = headers.indexOf(mapping.dateColumn);
  if (dateIdx === -1) {
    return NextResponse.json(
      { error: `date column "${mapping.dateColumn}" not found in CSV header` },
      { status: 400 }
    );
  }
  const metricCols = Object.entries(mapping.columns)
    .map(([header, metric]) => ({ idx: headers.indexOf(header), metric }))
    .filter((c) => c.idx !== -1);

  const ingest: IngestRow[] = [];
  for (const row of rows.slice(1)) {
    const date = row[dateIdx] ?? "";
    if (!date.trim()) continue;
    for (const col of metricCols) {
      const raw = (row[col.idx] ?? "").trim();
      if (raw === "") continue;
      ingest.push({ date, metric: col.metric, value: Number(raw) });
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  fs.mkdirSync(IMPORTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(IMPORTS_DIR, `${stamp}-${path.basename(file.name).replace(/[^\w.-]+/g, "_")}`),
    buf
  );

  // replaceSameSource: re-importing a file re-states, never double-counts.
  const result = ingestMetrics(ingest, "csv", { replaceSameSource: true });
  return NextResponse.json(result, { status: 201 });
}
