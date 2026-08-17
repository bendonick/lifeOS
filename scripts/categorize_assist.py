#!/usr/bin/env python3
"""Categorisation assist — uncategorised merchants → a category proposal each.

Why this exists: `budget.rules` (decision #22) is a substring match, and it
handles the merchants that repeat. What it cannot handle is the tail — at the
time of writing, 122 uncategorised merchants of which 111 appear exactly once.
A rule for a merchant seen once will never fire again, so more rules is not the
answer; reading the name is. These names are Swiss and abbreviated by the bank
("Coop-1511 Stadelhofen", "Dr.Andres Apoth.Stadelho", "9122Transa Backpacking A"),
which is precisely where a model beats a substring.

What it does NOT do is categorise anything. It writes proposals to
`category_proposals` and stops; the app applies one only when the user accepts it
in the Merchants panel. That is decision #36, the same contract capture ingest
follows, and for the same reason: nothing is written that the user has not seen.

Privacy (decision #41): the request carries merchant *names* and the list of
valid categories. No amounts, no dates, no account numbers, no transaction
counts. Decision #35 drew a line about the user's own content leaving the
machine, so the line this crosses is stated rather than implied — a merchant
name is the minimum that makes the question answerable at all.

Not scheduled. This is on-demand only, from the Assist button or by hand;
launchd knows nothing about it.

Usage:
    python3 scripts/categorize_assist.py [--limit N] [--all] [--quiet]
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import traceback

from lifeos import claude
from lifeos.db import connect

# One call per chunk of merchants. Small enough that a refusal or a malformed
# reply costs one chunk rather than the run, large enough that the category list
# and instructions aren't re-sent per merchant.
CHUNK = 40

# A ceiling on one run, so a pathological import can't spend the month's budget
# in a single click. The next run picks up whatever is left.
DEFAULT_LIMIT = 200

SYSTEM = """You assign a spending category to each merchant name from a Swiss bank
statement (UBS). The names are as the bank printed them: abbreviated, truncated
mid-word, sometimes carrying a branch number or a terminal id.

You will be given the complete list of valid categories. Use only those names,
exactly as spelled. There is no "other" — every merchant gets your best category.

How to read these names:
- Swiss and German retail is the common case. Coop, Migros, Denner, Aldi, Lidl,
  SPAR and Volg are supermarkets. "Coop Pronto" is a petrol-station convenience
  shop. "Apotheke"/"Apoth." is a pharmacy, "Bäckerei" a bakery, "Metzgerei" a
  butcher, "Drogerie" a chemist.
- A branch number, postcode or street name is location, not meaning:
  "Coop-1511 Stadelhofen" and "Coop-2623 City SM" are both the same kind of shop.
- "Mensa" and "Cafeteria" are university sites — student canteens
  unless the name says otherwise.
- "SBB", "ZVV", "VBZ" are transport. Airlines, hotels, and foreign airport shops
  are travel.
- Judge what was bought, not who sold it: a bookshop in an airport is still the
  airport's context only if nothing better fits.

Set confidence honestly, because it decides how much the user has to read:
- "high": you recognise the merchant or the name states plainly what it is.
- "medium": the category is a reasonable inference from a partial name.
- "low": you are guessing. Say low rather than dressing a guess as knowledge —
  a low proposal costs one dropdown, a confident wrong one costs trust.

`reason` is one short clause for a human scanning the queue ("Swiss supermarket
chain", "Apotheke = pharmacy", "unrecognised — guessing from 'Backpacking'").
Never restate the merchant name back as the reason.
"""


def proposal_schema(categories: list[str]) -> dict:
    """Strict schema for the structured-outputs call.

    `category` is an enum of the real category list, so an invented category is
    impossible rather than merely discouraged — the app trusts these values
    enough to prefill a dropdown with them.
    """
    return {
        "type": "object",
        "properties": {
            "proposals": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "merchant": {"type": "string"},
                        "category": {"type": "string", "enum": categories},
                        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
                        "reason": {"type": "string"},
                    },
                    "required": ["merchant", "category", "confidence", "reason"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["proposals"],
        "additionalProperties": False,
    }


def valid_categories(conn: sqlite3.Connection) -> list[str]:
    """The categories that roll up to a budget line.

    `category_map` is the app's own definition of assignable (transfer/income are
    deliberately absent from it — they map to no line and are not spend), so the
    model is offered exactly what the dropdown offers and no more.
    """
    rows = conn.execute("SELECT category FROM category_map ORDER BY category").fetchall()
    return [r["category"] for r in rows]


def pending_merchants(conn: sqlite3.Connection, limit: int, redo: bool) -> list[str]:
    """Uncategorised merchants without a proposal, most rows first.

    Ordering by row count means a truncated run has still retired the merchants
    that account for the most transactions.
    """
    having = "" if redo else "AND t.merchant NOT IN (SELECT merchant FROM category_proposals)"
    rows = conn.execute(
        f"""SELECT t.merchant AS merchant, COUNT(*) AS n
            FROM transactions t
            WHERE (t.category IS NULL OR t.category = '')
              AND t.merchant IS NOT NULL AND TRIM(t.merchant) <> ''
              {having}
            GROUP BY t.merchant
            ORDER BY n DESC, t.merchant
            LIMIT ?""",
        (limit,),
    ).fetchall()
    return [r["merchant"] for r in rows]


def propose_chunk(api, merchants: list[str], schema: dict, categories: list[str]) -> list[dict]:
    prompt = (
        "Valid categories:\n"
        + "\n".join(f"- {c}" for c in categories)
        + "\n\nMerchants:\n"
        + "\n".join(f"- {m}" for m in merchants)
        + "\n\nReturn one proposal per merchant, echoing each merchant name exactly as given."
    )
    response = claude.run(
        api,
        model=claude.PARSER_MODEL,
        system=SYSTEM,
        prompt=prompt,
        effort="low",
        max_tokens=8000,
        output_format={"type": "json_schema", "schema": schema},
    )
    return json.loads(claude.text_of(response)).get("proposals", [])


def store(conn: sqlite3.Connection, proposals: list[dict], expected: set[str]) -> int:
    """Write proposals back, dropping any merchant we did not ask about.

    The model echoes the merchant name and an echo can drift (a trimmed space, a
    normalised dash). A proposal whose merchant does not match a real row would
    sit in the table forever matching nothing, so it is discarded here rather
    than becoming a silent orphan.
    """
    written = 0
    for p in proposals:
        merchant = str(p.get("merchant", ""))
        if merchant not in expected:
            print(f"skipped unrecognised merchant echo: {merchant!r}", file=sys.stderr)
            continue
        conn.execute(
            """INSERT INTO category_proposals (merchant, category, confidence, reason)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(merchant) DO UPDATE SET
                 category = excluded.category,
                 confidence = excluded.confidence,
                 reason = excluded.reason,
                 created_at = datetime('now')""",
            (merchant, p["category"], p["confidence"], p.get("reason", "")),
        )
        written += 1
    conn.commit()
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT)
    parser.add_argument(
        "--all", action="store_true", help="re-propose merchants that already have a proposal"
    )
    parser.add_argument("--quiet", action="store_true", help="print nothing when nothing happened")
    args = parser.parse_args()

    with connect() as conn:
        categories = valid_categories(conn)
        if not categories:
            print(json.dumps({"ok": False, "error": "category_map is empty"}))
            return 1

        merchants = pending_merchants(conn, args.limit, args.all)
        schema = proposal_schema(categories)
        proposed = failed = 0

        if merchants:
            api = claude.client()
            for start in range(0, len(merchants), CHUNK):
                chunk = merchants[start : start + CHUNK]
                try:
                    proposals = propose_chunk(api, chunk, schema, categories)
                except Exception as exc:  # noqa: BLE001 — one bad chunk must not stop the run
                    print(f"chunk at {start} failed: {exc}", file=sys.stderr)
                    failed += len(chunk)
                    continue
                proposed += store(conn, proposals, set(chunk))

        summary = {
            "ok": True,
            "merchants": len(merchants),
            "proposed": proposed,
            "failed": failed,
        }

    if not (args.quiet and proposed == 0 and failed == 0):
        print(json.dumps(summary))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stderr)
        traceback.print_exc()
        raise SystemExit(1) from exc
