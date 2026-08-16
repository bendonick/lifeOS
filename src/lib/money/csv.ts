// Shared CSV plumbing for bank and health imports. Swiss exports are messy in
// bank-specific ways (docs/06-stage2-brief.md §5d) — detect, don't assume.

/** Decode a CSV buffer: BOM wins; else try strict UTF-8, fall back to Latin-1. */
export function decodeCsv(buf: Buffer): string {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString("utf8");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return buf.toString("latin1");
  }
}

/** Delimiter sniff on the raw text: semicolon beats comma if it appears at all. */
export function detectDelimiter(text: string): ";" | "," {
  const head = text.slice(0, 2000);
  return (head.match(/;/g)?.length ?? 0) >= (head.match(/,/g)?.length ?? 0) ? ";" : ",";
}

/**
 * Field-quoted CSV parse (handles delimiters and newlines inside double-quoted
 * fields, and doubled quotes as escapes). Returns raw rows including any
 * preamble — locating the real header row is the caller's job.
 */
export function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** '1'234.56' / '1 234,56' style amounts → number; returns NaN when unparseable. */
export function parseSwissAmount(raw: string): number {
  const cleaned = raw.replace(/['\s ]/g, "").replace(/,(?=\d{1,2}$)/, ".");
  return cleaned === "" ? NaN : Number(cleaned);
}

