# Page — LifeOS (hub, `/`)

**Week plan pass, 2026-11-19 (decisions #82–#85; build brief `docs/08-week-plan-brief.md`, which
wins where it differs from this file).** The hub now opens with a full-width **Week plan**: a
plain-English note parsed into this week's checklist, with **Due soon** (overdue + next 7 days,
minus what the plan holds) beside it. Order: Week plan 12 → Domains 12 → Morning brief 12 →
Calendar 8 | Inbox 4. The **This week** module below is retired from the hub — its job is Due
soon — and the `ThisWeek` component lives on for Personal.

**Themed and re-laid-out 2026-08-17 (decision #59).** On `theme-editorial` as a twelve-column
bento of `Tile`s — Domains 12, brief row 12, This week 8 + Inbox 4 — with the calendar full width
below. (Domains moved from the bottom to the top on 2026-10-05 at the user's ask: the hub's job is
to send you to a page, so the doorways lead and the rollups follow.) **No left rail**, deliberately: the hub is the navigation, so a shortcuts column here would
point at the page you are already on. Everything takes the `hub` accent (Olive), the hub being
domain-less by definition. Order and content follow the sections below unchanged.


Neutral-toned home. Everything here is a rollup or a doorway; nothing is owned by this page.

## Modules

1. **Morning brief** — row of cards, one per brief kind (three since decision #35 dropped the
   *Email todos* card; the Stage 1 stub shows four until Stage 5 wires them):
   - *World brief* — "a few headline summaries worth knowing"
   - *AI research* — "suggested papers and articles, with links"
   - *German word of the day* — word, translation, example sentence
   Each renders `briefs` content for today (markdown), with generated_at; a stale/missing state
   when a script hasn't run. Stage 1: stubbed cards with placeholder copy. Stage 5: wired.

2. **This week** — cross-domain task table from `tasks` (joined to `courses`, so an academic
   row shows its course's short code as muted text beside the title — "Stage 1 · ATAI" — because
   on a page that lists every domain the title alone does not say which course, #77): due within
   the next 7 days OR overdue,
   not done. Columns: name, domain pill (colored), type pill, due, done checkbox. Inline add.
   This is the payoff of the single tasks store.

3. **Inbox** — quick-capture text box writing raw rows to `inbox`, plus the list of unprocessed
   captures with a "process" affordance (turn into task / note / dismiss). Phone-relay captures
   appear here too once Stage 5 lands.

4. **Calendar** — read-only week view over *all* ICS calendars, events tinted by domain
   (primary "Class" calendar in neutral). Stage 1: stub with fake events; wired when ICS lands
   (Stage 3). Beside or above it, **This week** serves as the command-center task half.

5. **Domain tiles** — three large tiles linking to sub-pages, each with icon, name, and a muted
   caption (Academic — "Courses · MSc project"; Personal — "health · habits · money";
   Professional — "Day job · learning · network"). Tile accent = domain color.

## Layout sketch

Top: domain tiles row. Then: Morning brief row (4 cards). Middle: two columns — This week (left,
wide) | Inbox (right, narrow). Below: Calendar full-width.

## Data touched

`briefs` (read), `tasks` (read/write), `inbox` (read/write), ICS feeds (read).
