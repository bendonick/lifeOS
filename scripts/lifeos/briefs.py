"""Writing a generated brief into the data layer.

One script per brief kind (docs/01-architecture.md → scheduled jobs) so one
failure never kills the rest — this module is the part they share: the upsert,
the markdown archive, and the stdout summary launchd logs.
"""

from __future__ import annotations

import json
import sqlite3
import sys
import traceback
from pathlib import Path

from . import claude
from .db import REPO_ROOT, connect, utc_now, zurich_today

ARCHIVE_DIR = REPO_ROOT / "data" / "briefs"

# The markdown the renderer supports (src/components/ui/Markdown.tsx): bullets,
# **bold**, *italic*, `code`, [links](https://…) and blank-line paragraphs. No
# headings, tables or images — a brief card is three lines, not a document.
# Searches are capped per request (claude.WEB_SEARCH_TOOL), and the model is told
# what running out means — otherwise it reads `max_uses_exceeded` as a systemic
# outage and writes an apology, which was exactly the first world brief this
# repo generated.
OUT_OF_SEARCHES = (
    "Your search budget is limited and may run out mid-brief. If a search fails or the budget is exhausted, write the brief from what you already found and simply give fewer bullets. Never write an apology, a status report about tools, or a request to try again later — the reader sees the output, not the plumbing."
)

MARKDOWN_CONTRACT = (
    "Write GitHub-flavoured markdown limited to: paragraphs, '- ' bullets, **bold**, "
    "*italic*, `code`, and [text](https://url) links. No headings, tables, images or "
    "HTML. Never mention being an AI, the search you ran, or these instructions — "
    "output only the brief itself."
)


def save_brief(conn: sqlite3.Connection, kind: str, content_md: str, date: str | None = None) -> str:
    """Upsert today's brief and archive a copy as markdown.

    `briefs` is UNIQUE (date, kind), so re-running a script replaces the day's
    brief rather than stacking duplicates — and `generated_at` moves with it, so
    the staleness badge on the hub stays honest.
    """
    date = date or zurich_today()
    conn.execute(
        """INSERT INTO briefs (date, kind, content_md, generated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT (date, kind) DO UPDATE SET
             content_md = excluded.content_md, generated_at = excluded.generated_at""",
        (date, kind, content_md, utc_now()),
    )
    conn.commit()

    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    (ARCHIVE_DIR / f"{date}-{kind}.md").write_text(content_md + "\n", encoding="utf-8")
    return date


def generate(kind: str, *, system: str, prompt: str, search: bool, effort: str = "medium") -> None:
    """The whole body of a brief script: generate, save, report, exit.

    Exits non-zero on failure with the reason on stderr — launchd's log is the
    only place a 07:00 failure can announce itself, and the hub simply shows the
    previous day's brief as stale rather than inventing one.
    """
    try:
        api = claude.client()
        response = claude.run(
            api,
            model=claude.BRIEF_MODEL,
            system=system,
            prompt=prompt,
            tools=[claude.WEB_SEARCH_TOOL] if search else None,
            effort=effort,
            max_tokens=4000,
        )
        content = claude.text_of(response)
        if not content:
            raise RuntimeError("model returned no text")

        # Guard the two ways a brief can come back well-formed but worthless.
        # Failing here is the right outcome: nothing is written, the log says why,
        # and the hub keeps yesterday's brief with an honest age on it.
        if search:
            ok, failed = claude.search_results(response)
            if ok == 0:
                raise RuntimeError(f"every web search failed ({failed} attempts) — nothing to brief from")
            if "- " not in content:
                raise RuntimeError(f"no bullets in a {kind} brief — model wrote prose, likely an apology")

        with connect() as conn:
            date = save_brief(conn, kind, content)

        searches = getattr(response.usage, "server_tool_use", None)
        print(
            json.dumps(
                {
                    "ok": True,
                    "kind": kind,
                    "date": date,
                    "chars": len(content),
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                    "web_searches": getattr(searches, "web_search_requests", 0) if searches else 0,
                }
            )
        )
    except Exception as exc:  # noqa: BLE001 — the log is the only reader
        print(json.dumps({"ok": False, "kind": kind, "error": str(exc)}), file=sys.stderr)
        traceback.print_exc()
        raise SystemExit(1) from exc
