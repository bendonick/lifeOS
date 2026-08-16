import path from "node:path";
import { decodeCsv, detectDelimiter, parseDelimited } from "@/lib/money/csv";
import { ubsParser } from "@/lib/money/parsers/ubs";
import type { BankParser, ParsedTxn } from "@/lib/money/parsers/types";

/** Where uploaded bank/health CSVs are archived (inside gitignored data/). */
export const IMPORTS_DIR = path.join(process.cwd(), "data", "imports");

// Registry of known banks — a new bank is one parser file plus one line here.
const PARSERS: BankParser[] = [ubsParser];

// Bank preambles vary in length; scan this many leading rows for a header.
const HEADER_SCAN_ROWS = 30;

export interface DetectedImport {
  parser: BankParser;
  txns: ParsedTxn[];
}

/** Decode + parse a bank CSV buffer, or null if no known bank matches. */
export function parseBankCsv(buf: Buffer): DetectedImport | null {
  const text = decodeCsv(buf);
  const rows = parseDelimited(text, detectDelimiter(text));
  for (let i = 0; i < Math.min(rows.length, HEADER_SCAN_ROWS); i++) {
    const headers = rows[i].map((h) => h.trim());
    for (const parser of PARSERS) {
      if (parser.detect(headers)) {
        return { parser, txns: parser.parse(headers, rows.slice(i + 1)) };
      }
    }
  }
  return null;
}
