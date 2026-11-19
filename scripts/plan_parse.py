#!/usr/bin/env python3
"""Week plan parser — one `plan_notes` row → a draft proposal (decision #84).

The hub's Week plan writes the user's brain dump into `plan_notes` first, then
runs this script on it. The script sends the note, plus the courses, projects and
open tasks it may be filed against, to the Anthropic API with a JSON schema;
validates every field against the database; and writes the result into
`plan_notes.proposal_json`. It never writes `tasks` — the app does that when the
user accepts the draft (#36, extended by #84).

Usage:
    scripts/.venv/bin/python scripts/plan_parse.py --note ID

Prints one JSON line: {"ok": true, "note": ID, "items": N} or {"ok": false, ...}.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from datetime import date, datetime, timedelta

from lifeos import claude
from lifeos.db import connect, zurich_today
from lifeos.plan_prompt import DOMAINS, SCHEMA, system_prompt, user_prompt

# Enough open tasks for any real week; soonest first, undated last.
MAX_OPEN_TASKS = 80
MAX_TITLE = 200
MAX_GROUP = 60
MAX_REASON = 160

DUE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$")


def load_context(conn: sqlite3.Connection, week: str) -> dict:
    """The facts the note may be filed against, as the model sees them.

    Multi-slot courses share a name across rows (decision #77); the model gets
    one entry per name — the lowest id — and validation accepts any real id.
    """
    courses = conn.execute(
        """SELECT MIN(id) AS id, name, short_name FROM courses
           WHERE status = 'enrolled' GROUP BY name ORDER BY id"""
    ).fetchall()
    projects = conn.execute(
        "SELECT id, name FROM projects WHERE status = 'active' ORDER BY id"
    ).fetchall()
    open_tasks = conn.execute(
        """SELECT tasks.id, tasks.title, tasks.due, tasks.domain,
                  COALESCE(courses.short_name, courses.name, projects.name) AS filed_under
           FROM tasks
           LEFT JOIN courses ON courses.id = tasks.course_id
           LEFT JOIN projects ON projects.id = tasks.project_id
           WHERE tasks.done = 0
           ORDER BY tasks.due IS NULL, tasks.due, tasks.id
           LIMIT ?""",
        (MAX_OPEN_TASKS,),
    ).fetchall()
    plan = conn.execute(
        "SELECT title FROM tasks WHERE week = ? ORDER BY id", (week,)
    ).fetchall()
    return {
        "courses": [
            {"id": r["id"], "code": r["short_name"], "name": r["name"]} for r in courses
        ],
        "projects": [{"id": r["id"], "name": r["name"]} for r in projects],
        "open_tasks": [
            {
                "id": r["id"],
                "title": r["title"],
                "due": r["due"],
                "domain": r["domain"],
                "filed_under": r["filed_under"],
            }
            for r in open_tasks
        ],
        "already_in_this_weeks_plan": [r["title"] for r in plan],
    }


def valid_ids(conn: sqlite3.Connection) -> dict:
    """Every id a proposal may name, read fresh — never trusted from the model."""
    return {
        "courses": {r["id"] for r in conn.execute("SELECT id FROM courses")},
        "projects": {r["id"] for r in conn.execute("SELECT id FROM projects")},
        "open_tasks": {
            r["id"]: {"id": r["id"], "title": r["title"], "due": r["due"]}
            for r in conn.execute("SELECT id, title, due FROM tasks WHERE done = 0")
        },
    }


def clean_text(value, limit: int) -> str | None:
    """A trimmed, whitespace-collapsed string, or None when there is nothing."""
    if not isinstance(value, str):
        return None
    text = " ".join(value.split())[:limit].strip()
    return text or None


def clean_due(value) -> str | None:
    """A due value in the app's two shapes that names a real date (and time)."""
    if not isinstance(value, str) or not DUE_RE.match(value):
        return None
    try:
        if "T" in value:
            datetime.strptime(value, "%Y-%m-%dT%H:%M")
        else:
            date.fromisoformat(value)
    except ValueError:
        return None
    return value


def normalize(raw: dict, ids: dict, plan_titles: list[str]) -> list[dict]:
    """Validate the model's items against the database and the app's shapes.

    Args:
        raw: The model's output, `{"items": [...]}`.
        ids: `valid_ids()` — real course and project ids, and open tasks by id.
        plan_titles: Titles already in this week's plan; repeats are dropped.

    Returns:
        Proposal items in note order, each with a stable `key`. Anything the
        database cannot back — an unknown course, a finished task, a date that
        does not exist — becomes null rather than an error at accept time.
    """
    items = raw.get("items") if isinstance(raw, dict) else None
    if not isinstance(items, list):
        return []

    seen_titles = {t.casefold() for t in plan_titles}
    used_matches: set[int] = set()
    out: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        title = clean_text(item.get("title"), MAX_TITLE)
        if not title or title.casefold() in seen_titles:
            continue
        seen_titles.add(title.casefold())

        domain = item.get("domain") if item.get("domain") in DOMAINS else "personal"
        course_id = item.get("course_id")
        course_id = course_id if isinstance(course_id, int) and course_id in ids["courses"] else None
        if course_id is not None:
            domain = "academic"
        project_id = item.get("project_id")
        project_id = project_id if isinstance(project_id, int) and project_id in ids["projects"] else None

        match = None
        match_id = item.get("match_task_id")
        if isinstance(match_id, int) and match_id in ids["open_tasks"] and match_id not in used_matches:
            match = ids["open_tasks"][match_id]
            used_matches.add(match_id)

        out.append(
            {
                "key": f"i{len(out)}",
                "title": title,
                "domain": domain,
                "course_id": course_id,
                "project_id": project_id,
                "group": clean_text(item.get("group"), MAX_GROUP),
                "due": clean_due(item.get("due")),
                "match": match,
                "reason": clean_text(item.get("reason"), MAX_REASON),
            }
        )

    # A group of one is noise: it would draw a heading over a single row.
    counts: dict[str, int] = {}
    for item in out:
        if item["group"]:
            counts[item["group"]] = counts.get(item["group"], 0) + 1
    for item in out:
        if item["group"] and counts[item["group"]] < 2:
            item["group"] = None
    return out


def week_span(today: str) -> str:
    d = date.fromisoformat(today)
    monday = d - timedelta(days=d.weekday())
    sunday = monday + timedelta(days=6)
    return f"{monday:%a %d %b} – {sunday:%a %d %b %Y}"


def parse_note(conn: sqlite3.Connection, note_id: int) -> int:
    note = conn.execute("SELECT * FROM plan_notes WHERE id = ?", (note_id,)).fetchone()
    if note is None:
        raise LookupError(f"no plan note {note_id}")

    context = load_context(conn, note["week"])
    today = zurich_today()
    weekday = date.fromisoformat(today).strftime("%A")

    api = claude.client()
    response = claude.run(
        api,
        model=claude.PLAN_MODEL,
        system=system_prompt(today, weekday, week_span(today)),
        prompt=user_prompt(note["text"], context),
        effort="low",
        max_tokens=4000,
        output_format={"type": "json_schema", "schema": SCHEMA},
        fallbacks="default",
    )
    raw = json.loads(claude.text_of(response))
    items = normalize(raw, valid_ids(conn), context["already_in_this_weeks_plan"])

    conn.execute(
        "UPDATE plan_notes SET proposal_json = ?, status = 'proposed', error = NULL WHERE id = ?",
        (json.dumps({"items": items}, ensure_ascii=False), note_id),
    )
    conn.commit()
    return len(items)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--note", type=int, required=True, help="plan_notes.id to parse")
    args = parser.parse_args()

    with connect() as conn:
        try:
            count = parse_note(conn, args.note)
        # SystemExit too: `claude.client()` exits with a readable message when the
        # API key is missing, and the note must still be marked failed.
        except (Exception, SystemExit) as exc:  # noqa: BLE001 — every failure is recorded on the note
            message = f"{type(exc).__name__}: {exc}"[:500]
            conn.execute(
                "UPDATE plan_notes SET status = 'failed', error = ? WHERE id = ?",
                (message, args.note),
            )
            conn.commit()
            print(json.dumps({"ok": False, "note": args.note, "error": message}))
            return 1

    print(json.dumps({"ok": True, "note": args.note, "items": count}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
