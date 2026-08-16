import { normalizeDate } from "@/lib/dates";
import { parseSwissAmount } from "@/lib/money/csv";
import type { BankParser, ParsedTxn } from "@/lib/money/parsers/types";

// UBS account-statement CSV, written against the user's real 2025-10→2026-08
// export. Observed format (differs from the generic Swiss-CSV folklore):
//   * UTF-8 with BOM (not Latin-1), semicolon-delimited, trailing empty column
//   * 8-line account preamble, then a blank line, then the header row
//   * ISO 'YYYY-MM-DD' dates (normalizeDate still accepts DD.MM.YYYY)
//   * Debit column already signed negative; Credit positive; mutually exclusive
//   * no thousands separators (parseSwissAmount strips them anyway)
//   * Description1 = "Merchant;Address;…" inside one quoted field
//   * 'Transaction no.' is unique per row — the dedupe key (amended #22)

const REQUIRED = ["Trade date", "Booking date", "Debit", "Credit", "Description1"];

export const ubsParser: BankParser = {
  source: "ubs",

  detect(headers) {
    return REQUIRED.every((h) => headers.includes(h));
  },

  parse(headers, rows) {
    const col = (name: string) => headers.indexOf(name);
    const iTrade = col("Trade date");
    const iBooking = col("Booking date");
    const iDebit = col("Debit");
    const iCredit = col("Credit");
    const iTxnNo = col("Transaction no.");
    const iDesc1 = col("Description1");
    const iDesc2 = col("Description2");

    const txns: ParsedTxn[] = [];
    for (const row of rows) {
      const date = normalizeDate(row[iTrade] ?? "") ?? normalizeDate(row[iBooking] ?? "");
      if (!date) continue; // blank / summary line, not a transaction

      const debitRaw = (row[iDebit] ?? "").trim();
      const creditRaw = (row[iCredit] ?? "").trim();
      // -abs / +abs so both signed and unsigned exports normalize identically.
      const amount = debitRaw !== ""
        ? -Math.abs(parseSwissAmount(debitRaw))
        : Math.abs(parseSwissAmount(creditRaw));
      if (Number.isNaN(amount)) continue;

      const merchant = (row[iDesc1] ?? "").split(";")[0].trim();
      const note = (row[iDesc2] ?? "").split(";")[0].trim() || null;
      const txnNo = (row[iTxnNo] ?? "").trim();
      const dedupe_key = txnNo
        ? `ubs:${txnNo}`
        : `${date}|${amount.toFixed(2)}|${slug(merchant)}`;

      txns.push({ date, amount_chf: amount, merchant, note, dedupe_key });
    }
    return txns;
  },
};

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
