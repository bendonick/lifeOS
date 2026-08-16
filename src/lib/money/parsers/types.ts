// One parser file per bank behind this interface (decision #22): a second bank
// is a second file, not a refactor.

export interface ParsedTxn {
  date: string; // 'YYYY-MM-DD'
  amount_chf: number; // bank-signed: debits negative, credits positive
  merchant: string;
  note: string | null;
  /** 'ubs:<txn no>' when the bank supplies a stable id (amended #22 — the
   *  date|amount|merchant fallback collides on real same-day repeat purchases). */
  dedupe_key: string;
}

export interface BankParser {
  /** Lands in transactions.source as 'csv:<source>' and import_batches.source. */
  source: string;
  /** Is this row this bank's header row? Called while scanning past preambles. */
  detect(headers: string[]): boolean;
  /** Data rows (everything after the detected header row) → normalized txns. */
  parse(headers: string[], rows: string[][]): ParsedTxn[];
}
