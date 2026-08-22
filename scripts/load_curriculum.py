#!/usr/bin/env python3
"""Bulk-load curriculum.json into the Learning table via the app's API.

One-off utility for the AI/RL learning roadmap (curriculum.json). POSTs each
row to /api/learning in REVERSE order: the table sorts newest-first within a status
group, so inserting the last item first makes /professional display the curriculum
in priority order. Stdlib only; needs the dev server running (`npm run dev`).

Writes nothing to the db directly — every row goes through the app's validation
(decision #36's spirit: scripts don't invent writes). The only db access is a
read-only name check so re-running never duplicates.
"""

import argparse
import json
import sqlite3
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent


def existing_names(db_path):
    """Names already in learning_items, via a read-only connection. Never writes."""
    if not db_path.exists():
        print(f"note: {db_path} not found; skipping duplicate check", file=sys.stderr)
        return set()
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        rows = con.execute("SELECT name FROM learning_items").fetchall()
    except sqlite3.OperationalError:
        return set()
    finally:
        con.close()
    return {r[0] for r in rows}


def main():
    ap = argparse.ArgumentParser(description="Load curriculum.json into the Learning table")
    ap.add_argument("--base-url", default="http://localhost:3000")
    ap.add_argument("--file", default=str(HERE / "curriculum.json"))
    args = ap.parse_args()

    rows = json.loads(Path(args.file).read_text(encoding="utf-8"))
    seen = existing_names(REPO / "data" / "lifeos.db")

    created, skipped, failed = [], [], []
    for row in reversed(rows):  # last first → page shows priority order
        if row["name"] in seen:
            skipped.append(row["name"])
            continue
        req = urllib.request.Request(
            f"{args.base_url}/api/learning",
            data=json.dumps(
                {"name": row["name"], "type": row["type"], "link": row["link"]}
            ).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as resp:
                if resp.status == 201:
                    created.append(row["name"])
                else:
                    failed.append([row["name"], resp.status])
        except urllib.error.HTTPError as e:
            failed.append([row["name"], e.code])
        except urllib.error.URLError as e:
            print(json.dumps({
                "error": f"cannot reach {args.base_url} — is `npm run dev` running?",
                "detail": str(e.reason),
                "created_before_failure": len(created),
            }))
            sys.exit(1)

    print(json.dumps({
        "created": len(created),
        "skipped_existing": len(skipped),
        "failed": failed,
    }))


if __name__ == "__main__":
    main()
