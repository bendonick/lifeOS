# scripts/ — the intelligence layer

Standalone Python. launchd runs these; they read and write `data/lifeos.db` directly and
the webapp renders what they produced. **The app never calls an LLM on the render path**
(docs/01-architecture.md).

Nothing here imports from `src/`, and nothing in `src/` imports from here. The two sides
meet in exactly two places: the database, and `config` keys (`capture.file_path`,
`health.metric_keys`).

## Setup

```sh
./setup.sh              # creates .venv, installs `anthropic` (the only dependency)
./install_launchd.sh    # schedules everything below
```

`ANTHROPIC_API_KEY` comes from the repo's `.env` — `lifeos/claude.py` reads it directly,
so nothing needs to be exported in the shell.

### macOS will block these jobs until you grant Full Disk Access

A launchd agent inherits none of the Files-and-Folders consent your terminal has, and
**both `~/Desktop` and iCloud Drive are protected**. Denied, a job does not fail usefully:
the interpreter hangs during startup reading its own `pyvenv.cfg`, writes an empty log,
and never exits. `install_launchd.sh` probes for this and prints the exact path to grant —
System Settings → Privacy & Security → Full Disk Access → **+** → ⌘⇧G → paste the real
interpreter path (`readlink` of `.venv/bin/python`). Running the same scripts by hand from
a terminal works either way, which is what makes the failure so quiet.

## What runs, and when

| Script | Schedule | Model | Cost per run |
|---|---|---|---|
| `capture_ingest.py` | every 15 min | Opus 5 (per capture) | ~$0.01 per capture; nothing when the file is unchanged |
| `brief_world.py` | 07:00 Mon–Fri | Sonnet 5 + web search | ~$0.05–0.15 |
| `brief_ai_research.py` | 07:05 Mon–Fri | Sonnet 5 + web search | ~$0.05–0.15 |
| `brief_german.py` | 07:10 Mon–Fri | Sonnet 5, no search | fractions of a cent |
| `categorize_assist.py` | **on demand only** | Opus 5, low effort | ~$0.02 for a 120-merchant backlog |

`categorize_assist.py` has no schedule on purpose: there is no recurring backlog to drain,
only the tail of an import, so it runs from the Assist button (`POST /api/money/assist`) or by
hand. It is the second script to follow decision #36 — it writes **only** to
`category_proposals` and never touches `transactions`; the app files a merchant when the user
accepts. It sends merchant names and the valid category list to the API and nothing else
(decision #41): no amounts, no dates, no account data.

Briefs are one script per kind so one failure never kills the rest, and so a fourth brief
is a new file rather than a refactor. They are staggered five minutes apart rather than
fired together: same model, same rate limit, and nobody is waiting at 07:05. A failed run leaves yesterday's brief on the hub,
labelled with its age — the UI never invents a brief that didn't generate.

Every script prints a one-line JSON summary; launchd writes it to `data/logs/<label>.log`.

## Running them by hand

```sh
.venv/bin/python capture_ingest.py            # ingest + parse
.venv/bin/python capture_ingest.py --no-parse # ingest only, no API calls
.venv/bin/python brief_world.py               # regenerate today's world brief
.venv/bin/python categorize_assist.py         # propose categories for uncategorised merchants
.venv/bin/python categorize_assist.py --all   # re-propose, including merchants already proposed
```

Re-running a brief replaces today's row (`briefs` is UNIQUE on date+kind) and re-stamps
`generated_at`. Re-running ingest is free: it dedupes on the capture id.

## The one rule about writes

`capture_ingest.py` writes **only** to `inbox`. It proposes a task / metrics / note in
`inbox.parsed_json` and stops there; the app applies the proposal through `createTask`,
`ingestMetrics` and `createNote` when you accept it (decision #36). That is what keeps
the health-ingest quarantine (decision #17) and "no module invents its own storage"
true with two languages in the repo.

Brief scripts write only to `briefs` and `data/briefs/`.

## Layout

```
lifeos/db.py       connection, config reads, Zurich/UTC date helpers
lifeos/claude.py   the API client, model choices, pause_turn handling
lifeos/briefs.py   brief upsert + archive + the shared script body
capture_ingest.py  synced file → inbox → parse proposal
brief_*.py         one per brief kind: a system prompt, a prompt, one call
```

## One-off utilities

`load_curriculum.py` bulk-loads `curriculum.json` — the flat list behind the AI/RL learning
roadmap — into the Learning table **through the app's API**, not
the db: each row is POSTed to `/api/learning` in reverse order, so the table's newest-first
sort displays the curriculum in priority order on /professional. Its only db access is a
read-only name check against `data/lifeos.db`, so re-running never duplicates. Needs the dev
server up. No launchd schedule; stdlib only — plain `python3` works, no venv needed.

```sh
python3 load_curriculum.py                                # load, skipping rows already present
python3 load_curriculum.py --base-url http://localhost:3000
```
