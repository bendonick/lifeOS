# Page — Professional (`/professional`, blue)

Four zones settled during design: Day job, Learning, Projects, Network.
Job-hunt tracking was explicitly dropped — don't build pipeline/application features.

## Modules

1. **Left rail cards**: Navigation (AI Engineer & RL Learning Roadmap doc, project pages),
   Ideas (freeform bullets — seed: "Look into potential golf-AI intersection products"),
   Quick Actions (New Task defaulting domain=professional + project=Day job, New Contact,
   New Learning item).

2. **Day job — tasks** — `tasks` filtered to project=Day job, not done, soonest first.
   Caption: "day job · open tasks, soonest first". (An accomplishments/brag-doc log was
   discussed and *not* adopted — BACKLOG candidate, don't build unasked.)

3. **AI / RL Concepts (Learning)** — `learning_items` table: name, type pill
   (Concept / Course / Paper / Book / Module / Video — Concept listed first; it's the default
   reach), status, link, started/completed. Caption: "concepts to work through · papers,
   courses, modules". Starts empty by design — the user fills it.

4. **Projects** — `projects` filtered domain=professional, status != done, by deadline.
   Caption: "building · portfolio evidence". Seeds: SousChef, golf-AI. Project detail view
   shows its tasks and notes.

5. **Network** — `contacts` with computed next_followup; default view **Due for follow-up**
   (next_followup ascending, overdue highlighted), second view All contacts. Fields: name,
   company, role, how-met pill (Conference / Intro / Work / Online / University), LinkedIn,
   last contacted, interval (days), notes. Logging an interaction updates last_contacted →
   next_followup recomputes. Caption: "who to reach out to next".
   Later intelligence (Stage 6+): stale-contact nudges surfacing on LifeOS.

6. **Calendar (command center)** — Professional ICS calendar week view (toggle all) beside
   the professional task list.

## Data touched

`tasks`, `projects`, `learning_items`, `contacts`, ICS Professional feed.
