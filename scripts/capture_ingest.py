#!/usr/bin/env python3
"""Capture ingest — synced file → `inbox`, then a parse proposal for each row.

The path (decision #33): an iOS Shortcut appends one JSON line per capture to a
file in iCloud Drive; iCloud syncs it to the Mac; this script reads it. Ingest is
idempotent on the capture `id`, never on file offsets — iCloud rewrites the file
wholesale and offsets are meaningless across a sync.

Parsing (decision #34) happens here, at ingest, because the phone end has no LLM.
What this script does NOT do is create the task, the metrics or the note: it
writes a *proposal* into `inbox.parsed_json` and leaves the row unprocessed. The
app applies it through `createTask` / `ingestMetrics` / `createNote`, so the
health-ingest quarantine (decision #17) and "no module invents its own storage"
both survive a second language in the codebase.

Usage:
    python3 scripts/capture_ingest.py [--no-parse] [--limit N] [--quiet]
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
import traceback
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from lifeos import claude
from lifeos.db import TZ, connect, get_config, get_config_json, utc_now, zurich_today

# Bounded so a pathological file (or a bad prompt) can't quietly spend the month's
# API budget in one run; the next run picks up where this one stopped.
DEFAULT_PARSE_LIMIT = 25

DOMAINS = ["academic", "personal", "professional"]
TASK_TYPES = ["task", "assignment", "exam", "meeting"]
NOTE_KINDS = ["note", "reminder", "idea"]

SYSTEM = """You turn one line of captured text into one structured row for a personal
system. The text was dictated or typed on a phone in a hurry: it is fragmentary,
unpunctuated, and sometimes autocorrected into nonsense.

Decide which of four things it is:

- "task": something to do. Includes reminders, deadlines, errands and appointments.
- "metrics": a health measurement — sleep, weight, steps, heart rate, or food macros.
- "note": a thought, idea, link, or fact to keep. Anything worth storing but not doing.
- "unknown": you cannot tell, or the text is too garbled to act on. Say so rather
  than guessing — an unknown costs one click to sort out, a wrong row is worse.

Rules:
- Rewrite a task title as a short imperative ("Email Prof. Meier about the exam"),
  fixing obvious dictation errors. Keep a note close to the original words.
- Domain: academic = coursework, lectures, exams, the MSc. professional = the day
  job, side projects, learning, networking. personal = health, money,
  home, friends, admin. Choose the one that fits; if genuinely none does, use
  "personal".
- Dates: resolve relative language ("friday", "tomorrow", "in two weeks") against
  today's date, given below. Output "YYYY-MM-DD", or "YYYY-MM-DDTHH:MM" when a
  time is stated. Leave due empty when no deadline is implied — do not invent one.
- Metrics: only the metric names listed below, in their stated units. "slept 7h15"
  is 7.25 hours. Several
  measurements in one line are several entries. Use today's date unless the text
  says otherwise ("yesterday", a date).
- Fields that do not apply to your chosen kind stay empty ("" or []).
- `reason` is one short clause for a human reading the proposal, e.g. "friday =
  2026-08-21" or "no metric name recognised".
"""


def parse_schema(metric_keys: list[str]) -> dict:
    """Strict schema for the structured-outputs call.

    Flat with empty-string sentinels rather than nullable sub-objects: strict
    JSON-schema support excludes recursion and most constraint keywords, and a
    flat shape with `kind` as the discriminator is the one the model fills in
    most reliably. The app ignores every field that `kind` doesn't select.
    """
    metric_field: dict = {"type": "string"}
    if metric_keys:
        metric_field["enum"] = metric_keys
    return {
        "type": "object",
        "properties": {
            "kind": {"type": "string", "enum": ["task", "metrics", "note", "unknown"]},
            # task, and (for kind = note) the note's text
            "title": {"type": "string"},
            "domain": {"type": "string", "enum": [*DOMAINS, ""]},
            "task_type": {"type": "string", "enum": [*TASK_TYPES, ""]},
            "due": {"type": "string"},
            "note_kind": {"type": "string", "enum": [*NOTE_KINDS, ""]},
            "metrics": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "metric": metric_field,
                        "value": {"type": "number"},
                        "date": {"type": "string"},
                    },
                    "required": ["metric", "value", "date"],
                    "additionalProperties": False,
                },
            },
            "reason": {"type": "string"},
        },
        "required": ["kind", "title", "domain", "task_type", "due", "note_kind", "metrics", "reason"],
        "additionalProperties": False,
    }


def to_utc_stamp(raw: str | None) -> str:
    """Shortcut timestamp → the UTC 'YYYY-MM-DD HH:MM:SS' the schema stores.

    The Shortcut writes an ISO 8601 stamp with the phone's offset. Anything
    unparseable falls back to now, because a capture with a strange clock is
    still a capture worth keeping.
    """
    if raw:
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=TZ)
            return parsed.astimezone(ZoneInfo("UTC")).strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            pass
    return utc_now()


def read_capture_file(path: Path) -> tuple[list[dict], int]:
    """Every well-formed JSON line, plus a count of the ones that weren't."""
    if not path.exists():
        return [], 0
    captures, malformed = [], 0
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            malformed += 1
            continue
        text = str(item.get("text", "")).strip()
        if not isinstance(item, dict) or not text:
            malformed += 1
            continue
        captures.append(
            {
                "external_id": str(item.get("id") or "").strip() or None,
                "text": text,
                "created_at": to_utc_stamp(item.get("at")),
            }
        )
    return captures, malformed


def insert_new(conn: sqlite3.Connection, captures: list[dict]) -> int:
    """Insert unseen captures. The unique index on external_id does the deduping,
    so re-reading a file whose earlier lines are already in is the normal case
    and costs nothing. A line with no id is skipped rather than duplicated on
    every run."""
    inserted = 0
    for capture in captures:
        if not capture["external_id"]:
            continue
        cursor = conn.execute(
            """INSERT OR IGNORE INTO inbox (text, source, created_at, external_id)
               VALUES (?, 'phone_relay', ?, ?)""",
            (capture["text"], capture["created_at"], capture["external_id"]),
        )
        inserted += cursor.rowcount
    conn.commit()
    return inserted


def parse_one(api, text: str, schema: dict, today: str, weekday: str) -> dict:
    response = claude.run(
        api,
        model=claude.PARSER_MODEL,
        system=f"{SYSTEM}\nToday is {weekday} {today} (Europe/Zurich).",
        prompt=text,
        effort="low",
        max_tokens=2000,
        output_format={"type": "json_schema", "schema": schema},
    )
    return json.loads(claude.text_of(response))


def parse_pending(conn: sqlite3.Connection, limit: int) -> tuple[int, int]:
    """Attach a proposal to every unprocessed capture that lacks one."""
    rows = conn.execute(
        """SELECT id, text FROM inbox
           WHERE processed = 0 AND parsed_json IS NULL
           ORDER BY created_at, id LIMIT ?""",
        (limit,),
    ).fetchall()
    if not rows:
        return 0, 0

    metric_keys = get_config_json(conn, "health.metric_keys", [])
    schema = parse_schema(metric_keys)
    today = zurich_today()
    weekday = datetime.now(TZ).strftime("%A")
    api = claude.client()

    parsed, failed = 0, 0
    for row in rows:
        try:
            proposal = parse_one(api, row["text"], schema, today, weekday)
        except Exception as exc:  # noqa: BLE001 — one bad capture must not stop the batch
            print(f"parse failed for capture {row['id']}: {exc}", file=sys.stderr)
            failed += 1
            continue
        conn.execute(
            "UPDATE inbox SET parsed_json = ? WHERE id = ? AND processed = 0",
            (json.dumps(proposal), row["id"]),
        )
        conn.commit()
        parsed += 1
    return parsed, failed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-parse", action="store_true", help="ingest lines only, no API calls")
    parser.add_argument("--limit", type=int, default=DEFAULT_PARSE_LIMIT)
    parser.add_argument("--quiet", action="store_true", help="print nothing when nothing happened")
    args = parser.parse_args()

    with connect() as conn:
        configured = get_config(conn, "capture.file_path")
        if not configured:
            print(json.dumps({"ok": False, "error": "config key capture.file_path is unset"}))
            return 1
        path = Path(configured).expanduser()

        captures, malformed = read_capture_file(path)
        ingested = insert_new(conn, captures)
        parsed = failed = 0
        if not args.no_parse:
            parsed, failed = parse_pending(conn, args.limit)

        summary = {
            "ok": True,
            "file": str(path),
            "file_exists": path.exists(),
            "lines": len(captures),
            "ingested": ingested,
            "parsed": parsed,
            "parse_failed": failed,
            "malformed": malformed,
        }

    if not (args.quiet and ingested == 0 and parsed == 0 and failed == 0):
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
