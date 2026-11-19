# 08 — Week plan build brief (hub)

Not a roadmap stage — a hub pass, like the use-flow and hierarchy passes. Designed with the user on
2026-11-19: a plain-English brain dump at the top of the hub that is parsed into this week's
checklist. Mock: the "LifeOS week plan mock" Design canvas (two artboards: the interactive flow and
four other states). Decisions **#82–#86** record what was settled. Where this brief and
`docs/03-pages/lifeos.md` disagree, this brief wins — it is newer.

---

## 1. What it does

1. You write what you want to get done this week, the way you think it ("polish ATAI chatbot,
   link fitbit to lifeSTREAMS and update the UI for it, buy a mop…").
2. **Plan it** sends the note to `scripts/plan_parse.py`, which returns a **draft**: clean titles
   (verb first, your nouns kept), a domain and course/project per item, groups for items about one
   thing, a due date when the note names one, and a **match** when an item is a task you already
   have.
3. You edit titles, change a domain, remove items, then **Add N items**. Only then is anything
   written. "N items added · Undo" stays for a few seconds.
4. Items show as a checklist. A checked item strikes through and stays in place. Above the
   list, "N of M done" with one box per item — counted in the client component, beside the
   optimistic boxes, so it moves with the click.
5. A second note mid-week **adds** to the plan. A matched task is pulled into the plan, never
   created twice.
6. On a new week the box is empty and what you did not finish waits **under it**: "3 left from
   last week" — checked by default — **Carry over** / **Drop all**. Nothing moves by itself.
7. Beside the plan, **Due soon** keeps what "This week" showed: overdue and the next 7 days from
   every page, minus anything already in the plan.

Week numbers are never shown. The app stores the ISO week (`2026-W47`); the screen says
"This week · Mon 16 – Sun 22 Nov" and "last week".

## 2. Flow

```
 WeekPlan ──POST /api/plan/notes──▶ plan_notes row (raw text, always kept)
    ▲                                   │ execFile — same runner shape as capture/sync.ts
    │                                   ▼
    │                       scripts/plan_parse.py ──▶ Anthropic API (json_schema output)
    │                                   │ writes ONLY plan_notes.proposal_json / status
    │◀─────────── draft ────────────────┘
    │
    └──POST /api/plan/notes/:id/accept──▶ tasks (week = current, plan_group)
```

The parser proposes; the app applies (#36, extended by #84). The script never writes `tasks`.

## 3. Data (decision #83)

- `tasks.week TEXT` — ISO week `YYYY-Www` when the task is in a week plan; NULL otherwise.
- `tasks.plan_group TEXT` — the group label ("LifeSTREAMS") copied onto each member. No header
  row, so no group leaks into the domain lists as a task.
- `plan_notes(id, week, text, status, proposal_json, applied_json, error, created_at)` —
  `status` ∈ `proposed · failed · accepted · discarded · undone`.
- Plan order is insertion order (`id`); carried and matched tasks are older, so they lead.
- Drop **deletes** the items; Undo re-inserts the snapshot the server returned.

## 4. The proposal contract

The model fills this schema (`scripts/lifeos/plan_prompt.py`):

```json
{ "items": [ { "title": "…", "domain": "academic|personal|professional",
               "course_id": 1 | null, "project_id": 2 | null,
               "group": "LifeSTREAMS" | null, "due": "YYYY-MM-DD[THH:MM]" | null,
               "match_task_id": 123 | null, "reason": "…" | null } ] }
```

The model picks ids from the context it was given (one entry per course name — multi-slot
courses share a name). The script then validates and normalises before storing:

- `course_id` must exist; unknown → NULL, and the item keeps its domain. A course forces
  `domain = academic`. Labels (the course code, the project name) are added by the app when it
  reads the proposal, so a rename between parse and render still shows the current name.
- `project_id` must exist; unknown → NULL.
- A group with one member loses its group. Titles already in this week's plan are dropped.
- `due` must be a real date in the accepted shapes; otherwise NULL.
- `match_task_id` must name an **open** task; otherwise NULL. A match carries its current title
  and due date so the draft can say "Already on your list, due Wed 25 Nov".
- Empty titles are dropped. Titles are trimmed to 200 characters.

## 5. What is sent to the API

The note, course names and short names, project names, open task titles with their due dates and
ids, and this week's plan titles. Nothing else. (A line under the box said so at first; the user removed it,
with the placeholder, on seeing the build — the box is bare at rest.)

## 6. AI UX rules (decision #85, from Apple's Human Interface Guidelines)

- Draft before save; every item editable or removable; Undo after Add.
- Specific progress text while the parser runs, not "Processing…". Pending = `aria-busy` plus a
  2px hairline; the panel is never dimmed.
- When the parser fails, the note is kept and **Split it myself** turns it into items locally
  (commas, semicolons, new lines). The week still gets planned.
- The note is never lost: it is in `plan_notes` before the parser starts.

## 7. Out of scope

The rest of the hub (Inbox, briefs, calendar, the Domain tiles) keeps its content in this pass;
only its order moved — Calendar (8) | Inbox (4) now share the last row where This week | Inbox
sat. Editing
or removing a single item after Add, a parse-feedback button, and phone captures into the plan are
in BACKLOG.
