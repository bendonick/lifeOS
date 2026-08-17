"""SQLite access for the scripts layer.

The app owns the schema (`src/lib/db/schema.sql`, applied at startup); scripts
only read and write rows. `PRAGMA foreign_keys` is off per connection in
sqlite3 just as it is in the CLI, so it is set explicitly here — cascade
behaviour verified without it is not evidence about anything.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

REPO_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = REPO_ROOT / "data" / "lifeos.db"
TZ = ZoneInfo("Europe/Zurich")


def connect() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise SystemExit(
            f"no database at {DB_PATH} — run `npm run dev` once so the app creates it"
        )
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def get_config(conn: sqlite3.Connection, key: str, default: str | None = None) -> str | None:
    row = conn.execute("SELECT value FROM config WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else default


def get_config_json(conn: sqlite3.Connection, key: str, default):
    raw = get_config(conn, key)
    if raw is None:
        return default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return default


def zurich_today() -> str:
    """'YYYY-MM-DD' in the timezone the whole system speaks (decision #12)."""
    return datetime.now(TZ).strftime("%Y-%m-%d")


def utc_now() -> str:
    """UTC 'YYYY-MM-DD HH:MM:SS' — the format SQLite's datetime('now') writes."""
    return datetime.now(ZoneInfo("UTC")).strftime("%Y-%m-%d %H:%M:%S")
