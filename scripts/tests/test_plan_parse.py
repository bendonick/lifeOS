"""Tests for the Week plan parser's validation and its note bookkeeping (decision #84).

The API is never called: `claude.client` is replaced by a fake that returns a
canned structured-output response, and the database is an in-memory copy of the
app's real schema, so the queries run against the columns the app creates.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from types import SimpleNamespace

import pytest

import plan_parse
from lifeos import claude

SCHEMA_SQL = Path(__file__).resolve().parents[2] / "src" / "lib" / "db" / "schema.sql"


@pytest.fixture
def conn() -> sqlite3.Connection:
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.executescript(SCHEMA_SQL.read_text(encoding="utf-8"))
    db.executescript(
        """
        INSERT INTO courses (id, name, short_name) VALUES
          (1, 'Advanced Topics in AI', 'ATAI'),
          (4, 'The Effects of AI on Individuals and Society', 'Effects'),
          (5, 'The Effects of AI on Individuals and Society', 'Effects');
        INSERT INTO projects (id, name, domain) VALUES (1, 'Day job', 'professional');
        INSERT INTO tasks (id, title, domain, type, due, done, course_id) VALUES
          (10, 'Stage 4', 'academic', 'assignment', '2026-11-25', 0, 1),
          (11, 'Stage 3', 'academic', 'assignment', '2026-11-11', 1, 1);
        INSERT INTO tasks (id, title, domain, week) VALUES (20, 'Buy a mop', 'personal', '2026-W47');
        INSERT INTO plan_notes (id, week, text) VALUES (1, '2026-W47', 'polish ATAI chatbot');
        """
    )
    return db


def ids_of(conn: sqlite3.Connection) -> dict:
    return plan_parse.valid_ids(conn)


def item(**overrides) -> dict:
    base = {
        "title": "Polish the ATAI chatbot",
        "domain": "academic",
        "course_id": None,
        "project_id": None,
        "group": None,
        "due": None,
        "match_task_id": None,
        "reason": None,
    }
    return {**base, **overrides}


# --- clean_due -------------------------------------------------------------


@pytest.mark.parametrize(
    "value, expected",
    [
        ("2026-11-20", "2026-11-20"),
        ("2026-11-20T14:30", "2026-11-20T14:30"),
        ("2026-02-30", None),  # not a real date
        ("2026-11-20T25:00", None),  # not a real time
        ("20.11.2026", None),  # the app's shapes only
        ("friday", None),
        (None, None),
        (20261120, None),
    ],
)
def test_clean_due(value, expected) -> None:
    assert plan_parse.clean_due(value) == expected


# --- normalize -------------------------------------------------------------


def test_keeps_note_order_and_assigns_keys(conn) -> None:
    raw = {"items": [item(title="A thing"), item(title="B thing")]}
    out = plan_parse.normalize(raw, ids_of(conn), [])
    assert [i["title"] for i in out] == ["A thing", "B thing"]
    assert [i["key"] for i in out] == ["i0", "i1"]


def test_unknown_course_and_project_become_null(conn) -> None:
    raw = {"items": [item(course_id=99, project_id=99, domain="professional")]}
    [out] = plan_parse.normalize(raw, ids_of(conn), [])
    assert out["course_id"] is None
    assert out["project_id"] is None
    assert out["domain"] == "professional"


def test_a_course_forces_the_academic_domain(conn) -> None:
    raw = {"items": [item(course_id=1, domain="personal")]}
    [out] = plan_parse.normalize(raw, ids_of(conn), [])
    assert (out["course_id"], out["domain"]) == (1, "academic")


def test_second_slot_of_a_multi_slot_course_is_accepted(conn) -> None:
    raw = {"items": [item(course_id=5)]}
    [out] = plan_parse.normalize(raw, ids_of(conn), [])
    assert out["course_id"] == 5


def test_invalid_domain_falls_back_to_personal(conn) -> None:
    raw = {"items": [item(domain="hobby")]}
    [out] = plan_parse.normalize(raw, ids_of(conn), [])
    assert out["domain"] == "personal"


def test_match_carries_the_open_tasks_title_and_due(conn) -> None:
    raw = {"items": [item(title="Finish ATAI stage 4", match_task_id=10)]}
    [out] = plan_parse.normalize(raw, ids_of(conn), [])
    assert out["match"] == {"id": 10, "title": "Stage 4", "due": "2026-11-25"}


def test_a_finished_or_unknown_task_is_not_a_match(conn) -> None:
    raw = {"items": [item(title="Stage 3 again", match_task_id=11), item(title="Other", match_task_id=999)]}
    out = plan_parse.normalize(raw, ids_of(conn), [])
    assert [i["match"] for i in out] == [None, None]


def test_one_task_is_matched_at_most_once(conn) -> None:
    raw = {"items": [item(title="Stage 4 part one", match_task_id=10), item(title="Stage 4 part two", match_task_id=10)]}
    out = plan_parse.normalize(raw, ids_of(conn), [])
    assert out[0]["match"]["id"] == 10
    assert out[1]["match"] is None


def test_titles_are_cleaned_and_empty_ones_dropped(conn) -> None:
    raw = {"items": [item(title="  Buy   a\nlamp  "), item(title="   "), item(title=None), "junk"]}
    out = plan_parse.normalize(raw, ids_of(conn), [])
    assert [i["title"] for i in out] == ["Buy a lamp"]


def test_titles_already_planned_or_repeated_are_dropped(conn) -> None:
    raw = {"items": [item(title="buy a MOP"), item(title="Water plants"), item(title="water plants")]}
    out = plan_parse.normalize(raw, ids_of(conn), ["Buy a mop"])
    assert [i["title"] for i in out] == ["Water plants"]


def test_a_group_of_one_is_removed(conn) -> None:
    raw = {
        "items": [
            item(title="Link Fitbit data", group="LifeSTREAMS"),
            item(title="Update the Fitbit UI", group="LifeSTREAMS"),
            item(title="Buy a mop", group="Apartment"),
        ]
    }
    out = plan_parse.normalize(raw, ids_of(conn), [])
    assert [i["group"] for i in out] == ["LifeSTREAMS", "LifeSTREAMS", None]


def test_bad_shapes_give_an_empty_proposal(conn) -> None:
    assert plan_parse.normalize({}, ids_of(conn), []) == []
    assert plan_parse.normalize({"items": "nope"}, ids_of(conn), []) == []
    assert plan_parse.normalize([], ids_of(conn), []) == []


# --- load_context ----------------------------------------------------------


def test_context_names_each_course_once_and_lists_only_open_tasks(conn) -> None:
    ctx = plan_parse.load_context(conn, "2026-W47")
    assert [c["code"] for c in ctx["courses"]] == ["ATAI", "Effects"]
    assert [c["id"] for c in ctx["courses"]] == [1, 4]
    open_ids = [t["id"] for t in ctx["open_tasks"]]
    assert 10 in open_ids and 11 not in open_ids
    assert ctx["already_in_this_weeks_plan"] == ["Buy a mop"]


# --- the note bookkeeping, with a fake API ---------------------------------


class FakeMessages:
    def __init__(self, payload: dict) -> None:
        self.payload = payload
        self.calls: list[dict] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(
            content=[SimpleNamespace(type="text", text=json.dumps(self.payload))],
            stop_reason="end_turn",
            usage=SimpleNamespace(input_tokens=1, output_tokens=1, server_tool_use=None),
        )


def fake_api(payload: dict) -> SimpleNamespace:
    messages = FakeMessages(payload)
    return SimpleNamespace(messages=messages, beta=SimpleNamespace(messages=messages))


def test_parse_note_stores_a_proposal_and_never_writes_tasks(conn, monkeypatch) -> None:
    api = fake_api({"items": [item(course_id=1)]})
    monkeypatch.setattr(claude, "client", lambda: api)
    before = conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]

    assert plan_parse.parse_note(conn, 1) == 1

    note = conn.execute("SELECT * FROM plan_notes WHERE id = 1").fetchone()
    assert note["status"] == "proposed"
    assert json.loads(note["proposal_json"])["items"][0]["course_id"] == 1
    assert conn.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] == before
    call = api.messages.calls[0]
    assert call["model"] == claude.PLAN_MODEL
    assert call["output_config"]["format"]["type"] == "json_schema"
    assert call["fallbacks"] == "default"


def test_a_failed_parse_marks_the_note_and_keeps_its_text(conn, monkeypatch, capsys) -> None:
    def no_key():
        raise SystemExit("ANTHROPIC_API_KEY is not set")

    monkeypatch.setattr(claude, "client", no_key)
    monkeypatch.setattr(plan_parse, "connect", lambda: conn)
    monkeypatch.setattr("sys.argv", ["plan_parse.py", "--note", "1"])

    assert plan_parse.main() == 1

    note = conn.execute("SELECT * FROM plan_notes WHERE id = 1").fetchone()
    assert note["status"] == "failed"
    assert "ANTHROPIC_API_KEY" in note["error"]
    assert note["text"] == "polish ATAI chatbot"
    assert json.loads(capsys.readouterr().out)["ok"] is False
