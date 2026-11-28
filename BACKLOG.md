# BACKLOG.md

Ideas flagged during sessions that were out of the current stage's scope. Review occasionally;
promote to a stage deliberately, never by drift.

## Seeds (from the design session)

- Streak visualizations / habit heatmap (log data exists from Stage 2; visualize later).
- Day job accomplishments log ("brag doc") — discussed, not adopted.
- Google Calendar write-back via OAuth (create/edit events from the app).
- Cross-check ICS class blocks against course schedule metadata; flag mismatches.
- Stale-contact nudges surfacing on the LifeOS hub (early version lands in Stage 6).
- Job-hunt module (only if the user brings it back).
- Alternative capture channels, now that the Shortcut is the primary one (decision #33): Apple
  Reminders read via AppleScript/EventKit (Siri-native, needs a macOS automation grant), Telegram
  bot, or the original Notion relay (decision #7, superseded — recoverable from the ledger).

## Stage 2 (2026-08-16)

- Health device adapters — Oura (official PAT, easy) when the ring arrives; Garmin sidecar
  (python-garminconnect, fragile) if wanted. Both write through `ingestMetrics`.
- ~~Per-transaction recategorisation UI~~ — **closed 2026-08-17, decision #42.** The user's
  call: merchant granularity is the right level ("if it is Migros it should be under
  groceries"), and no merchant in the data has ever had rows under two categories. What the
  item was really pointing at — that an already-categorised merchant could not be changed at
  all — was a bug, and Stage 6 fixed it in the Merchants panel.
- ~~"Re-apply rules" button~~ — **closed 2026-08-17 as obsoleted.** The categorisation assist
  sweeps the whole uncategorised tail in one click, which is what this button was for. With
  111 of 122 merchants seen exactly once, retroactive rules had almost nothing to catch
  anyway.
- Undo an import batch from the UI (`import_batches` provenance exists; no button yet). Still
  open, and untouched by Stage 6 — it is about imports, not categorisation.

## Stage 3 (2026-08-16)

- Checked-in ICS regression fixture + a `npm run check:ics` script. The Stage 3 fixture
  (recurring class across a DST switch, EXDATE skip, moved occurrence, all-day, UTC-expressed
  event) proved the expander and was then discarded — the repo has no test framework, and
  adopting one is a deliberate choice, not a side effect of this stage.
- Cross-check ICS class blocks against `courses` schedule metadata and flag mismatches — the
  metadata (`schedule_days`, `start_hour`, `end_hour`) is now captured for exactly this, but
  nothing compares it to the feed yet. (Also listed under the design-session seeds.)
- Course rename leaves its materials folder behind: the slug is derived from the name, so the
  old `data/academic/courses/<old-slug>/` keeps the PDFs. Offer a rename/move, or store the
  slug on the row.
- Calendar event detail: clicking a block currently does nothing (tooltip only). A popover with
  description/attendees would need those fields carried through the expander.
- Month view / day view for the calendar. The week grid is the only view; the command center
  only ever needed the week.
- Materials: upload from the browser instead of dropping files into the folder by hand.

## Stage 4 (2026-08-17)

- Edit or delete a logged interaction — there is no undo. The *queue* is always correctable
  (`last_contacted` stays editable on the contact); only the history row isn't.
- `notes.project_id` for a real per-project note feed. Stage 4 uses the `projects.notes` text
  field, and the detail page's caption says so ("one field, not a feed").
- Migrate the four private tab implementations (`AcademicTasks`, `NotesPanel`, `TrendsView`,
  `WeekCalendar`) onto `src/components/ui/Tabs.tsx`. Built and used by Network; the migration
  touches three finished pages, so it wasn't done inside the build stage.
- `PATCH /api/tasks/[id]` accepting `project_id` — re-filing a task between projects. The db layer
  supports it; nothing in the UI needs it yet.
- A learning **target** date (offered and declined 2026-08-17 in favour of started/completed) and a
  type filter — only once the table is big enough to need them.
- `contact_interactions.channel` (call/email/coffee) if a pill turns out to be wanted. Left out for
  decision #25's reason.
- Contact import from a LinkedIn or CSV export, instead of hand entry.
- The "AI Engineer & RL Learning Roadmap" link in the Navigation rail card, once that doc exists —
  the user is still writing it, and no dead link ships.

## Deferred from Stage 6 — waiting on data, not on code (2026-08-17)

Moved out of Stage 6 at the user's ask: build a module fully or not at all, and three of the
four had nothing to run against. None of them is blocked by design or by another stage — each
becomes a session the day its data exists.

- **RAG over lecture PDFs.** `data/academic/` holds zero PDFs and both F26 courses start
  14–16 Sep, so "a question about a lecture PDF returns a correct cited answer" is unverifiable
  today. Brings decision **G** with it (embeddings: API vs local model; sqlite-vec vs Chroma),
  which should be decided against a real corpus rather than a hypothetical one. The indexer's
  shape is already written down in `docs/01-architecture.md` → RAG.
- **Health trends and nudges.** `health_metrics` is empty — Stage 2 shipped manual entry, CSV
  import and the trends page, and nothing has been logged. Needs a week or two of real data
  before a nudge can be judged useful rather than merely correct.
- **Stale-contact nudge on the hub.** `contacts` is empty by design (Stage 4's fixtures were
  deleted). Cheap to unblock — a handful of real contacts — and the follow-up maths already
  exists in `src/lib/professional/followup.ts`.

## Stage 5 (2026-08-17)

- **Build the capture Shortcut on the phone** — deferred 2026-08-17 at the user's ask. The Mac
  half is finished and verified against hand-written lines in the Shortcut's format: ingest runs
  every 15 minutes under launchd, dedupes, parses, and proposes. Until the Shortcut exists the
  only way in is the app's own capture box, and `capture.jsonl` stays empty. Steps are in
  `docs/07-capture-shortcut.md`; nothing in the codebase is waiting on it.

- **A `sleep_hours` metric.** The parser handled "slept 7 and a half hours" by
  reporting that no sleep-duration metric exists — the registry has
  `sleep_score` (a device number) and nothing for hours slept, which is the most natural thing
  to dictate. Adding it touches the metric registry, the health page and the trends charts, so
  it is a deliberate change rather than a side effect of Stage 5.
- Re-parse a capture whose proposal is wrong or missing. Today the fix is to use the manual
  "→ task" / "→ note" buttons; clearing `inbox.parsed_json` by hand makes the next ingest run
  re-propose it.
- Edit a proposal before accepting. A *task* proposal prefills the manual form, so it is
  correctable; metric and note proposals are accept-or-redo.
- A brief archive view. `data/briefs/YYYY-MM-DD-kind.md` accumulates every brief ever
  generated and nothing in the UI reads it — "what did the world brief say last Tuesday" is
  currently a `cat`.
- A per-brief "regenerate" button on the hub. The scripts are re-runnable by hand and the
  upsert is idempotent; there is just no UI for it.
- Schedule in `config` rather than baked into `install_launchd.sh` — changing 07:00 or adding
  weekends currently means editing the installer and re-running it.
- Trim the capture file. `capture.jsonl` grows forever and every ingest re-reads it whole;
  the dedupe makes that harmless but not free. Rotating it means keeping the ids of trimmed
  lines somewhere, or accepting that a trimmed line could re-ingest if its inbox row is gone.
- Surface a failed scheduled job in the UI. A brief that fails shows as a stale card, which is
  honest but indirect; the reason is only in `data/logs/`.
- **The world brief leaks the model's scratch-prose into the card** — seen 2026-08-23 on the hub:
  "…That gives me a solid third international story. I have enough solid material now. Let me
  write the brief." rendered above the bullets as if it were the brief. The shared prompt
  contract (#38) constrains the markdown subset but evidently not *what counts as output*; a
  wording fix in the brief scripts' shared prompt, one scripts session.

## Removed on 2026-08-17 — recoverable from commit 6625ba3

- **Schedule check panel** — compared each course's days/times against the Academic ICS feed
  and reported matched / moved / missing, offering a prefilled add-link where a block was
  absent. Removed as chrome: it had something to say only when a class had drifted. If it comes
  back, render it *only* in that case rather than always. `src/lib/academic/drift.ts` held the
  pure logic and was verified against all four states.
- ~~**"Up next" work list** beside the timetable~~ — **built 2026-10-05 as the due strip + deadline
  list on the Academic timetable (decision #73).** Tied to the visible week without hoisting the
  week state: every open deadline is a prop and `WeekCalendar` filters the week itself. Not
  built: the optimistic checkboxes (chips are tooltip-only; ticking stays in the tables).
- **Deadline strip on the hub.** The Academic timetable's due strip and list are wired as props;
  the hub would pass `openDeadlines()` (every domain) and `expanded` to its `CalendarTile`. Not
  done — the user asked for the hub to stay as it is for now. Open question for then: the chips
  are one colour (Olive) by design, and the Class calendar's blocks are also Olive on the
  *All calendars* tab — fine on Academic's default tab, worth a second look on the hub, which
  shows every calendar by default.

## Stage 6 (2026-08-17)

- **Category-level budget proposals.** `proposeBudget()` computes per-category medians and
  renders them as the basis line, but the budget is stated at line level (decision #20) so
  there is nothing to write a category figure to. If `budget_lines` ever gains leaves, the
  numbers are already there.
- **A month picker on the money map.** It renders the trailing 12 months, which is the only
  window with anything in it until September. `monthWindow()` exists in `src/lib/money/flow.ts`
  and is currently unused — wiring a tab to it is small, and worth doing once real budget
  months exist to compare.
- **Recurring-charge detection.** Deliberately not built (see the Stage 6 roadmap entry): the
  only true recurrers in a year of data are rent, the phone plan and an eSIM, and the first two are
  already fixed budget lines. Worth revisiting only if the user starts paying subscriptions
  from this account. The useful half — a fixed line that did not get paid — shipped as an
  insight instead.
- **Re-run the assist for a single merchant.** Today a bad proposal is corrected by picking a
  category by hand, which is one click and usually faster; `--all` re-proposes everything.
- **`budget.baseline` is still hand-computed.** `CategoryBreakdown`'s historical-average ticks
  read a config key seeded in Stage 2, while `proposeBudget()` computes the same idea from the
  live table. Two sources for one concept — the config key should eventually be derived, or
  dropped in favour of the computed one.
- **Sparse-month detection is local to the proposal.** `MIN_COVERAGE_RATIO` in `propose.ts`
  drops a month with implausibly few transactions (July 2026 has 6, against a median of 49).
  The money map and the history chart do not apply the same test, so a sparse month still reads
  as a quiet month there.

## Personal appointment flow (2026-08-18)

- ~~`npm run build` type-checks four API routes into failure~~ — **closed 2026-08-22 as
  resolved upstream.** Re-verified: the build exits 0 and `npx tsc --noEmit` is clean, with all
  four `read*Body()` exports still in place — nothing here changed, so the Next version's
  generated route types evidently stopped rejecting non-handler exports. For the record, the
  failure was `TS2344 … Property 'readContactBody' is incompatible with index signature` in
  `src/app/api/{contacts,courses,learning,projects}/route.ts`.
- **Editing an appointment in place.** Today a wrong time or address means ticking the row off
  and re-adding it. `PATCH /api/tasks/[id]` already accepts `due` and `notes`, so this is UI
  only — but the row has no edit affordance and `BudgetTable`'s inline-editor idiom is the
  obvious thing to copy.
- **No end time.** The Google hand-off assumes one hour and says so in the tooltip. A real
  end-time field is easy; whether it earns a fourth control in that add row is the question.
- **Recurring personal appointments.** `googleEventUrl()` already takes a `recur` RRULE (the
  course link uses it); nothing on Personal produces one.
- **Nothing reconciles a LifeOS row against the Google event once it exists** — the same gap
  decision #28 accepted on Academic when it removed the schedule check. Two places now.
- **`input[type=date|time]` shows no `:focus-visible` ring on its host in Chromium** (it
  highlights the focused sub-field instead). Affects `due date`, `time`, `metric date` and
  Academic's `due time`. Pre-existing platform behaviour; a custom ring would be app-wide chrome.

## Personal hierarchy pass (2026-08-18)

- **Focused views instead of inline expansion.** The redesign used disclosures because a routing
  change mid-pass would have been disruptive. `/personal/health` already proves the pattern; a
  `/personal/money` holding the budget table, proposal and merchant queue would let the Spending
  tile drop to a headline and a trend, and the same argument applies to a `/personal/calendar`.
  Worth doing when the sections next need work, not before.
- **Two pill-tab copies left.** `NotesPanel` migrated to `ui/Tabs` in this pass; `AcademicTasks`,
  `TrendsView` and `WeekCalendar` still carry their own.
- **`TodayBand` calls `budgetOverview()` a second time** (the page already computes it inside
  `SpendingSection`). Sub-millisecond on local SQLite and correctness is preserved — both read the
  same function — but the tidy version passes it down from the page.
- **The habit ring renders a full-size 0%** when nothing is ticked. Honest, and the brief wanted
  progress visible, but a 104px ring is a lot of rail for one zero.

## UI-polish pass follow-ups (2026-08-23)

- **Control-chrome strings still drift.** ~14 selects and many inputs hand-copy their classes
  instead of importing `controls.ts` (five slightly different control sizes exist; the
  inventory lives in this pass's audit). The select *chevron* is now an element rule so it
  can't drift, but the size/padding consolidation onto `selectChrome`/`inputChrome` remains.
- **Domain-fixed accent literals.** `hover:border-<domain>/40` on Add/submit buttons inside
  single-domain components was left hardcoded (matches by construction); worth moving to
  `accentHoverBorder` only if a component ever changes domain.
- **`title=` tooltips carrying sole information** (8 sites: the Google hand-off contract,
  DateCell semantics, back-dating rules…) — invisible to touch and keyboard; needs a visible
  affordance decision, not a mechanical fix.

## Curriculum load (2026-08-22)

- **Wire the Professional rail's reserved learning-roadmap link** — its target now exists:
  `scripts/curriculum.json` (loaded via `scripts/load_curriculum.py`). This was the deliberately-unbuilt link waiting for the
  document; small build task.
- **Learning-table structure the curriculum wished it had** (from the roadmap's build notes;
  none blocking — the flat table + roadmap prose carry the plan fine): a phase/area tag or
  grouping, a type filter above the table, a "% complete" signal on the Learning tile.
  (Still deferred after the 2026-08-23 phase-line pass, which was the banner only. Phase
  membership + priority order now live in `src/lib/professional/curriculum.ts` — decision
  #68 — so a promoted phase tag would supersede that module and use it as the backfill
  source, and a % complete signal can be computed from `curriculumState()` as it stands.)

## Academic redesign (2026-10-05)

- **A `course_slots` table.** A `courses` row still holds one weekly slot, so a twice-weekly
  course is two rows; decision #77 groups them by name in the UI. The table would make the
  grouping structural (one course, N slots), let tasks file against the course rather than
  one of its rows, and retire the name fold in `groupCourses()`.
- **Map cell → filtered list.** A cell links to the course page today; the audit's ask was a
  click that filters Assignments & tasks to that course and week. Needs the list to take a
  filter from the URL or a shared store.
- **The overdue item is named three times** — rail Now, the list, and the timetable's deadline
  list (#73) — and the deadline list's Overdue/This week rows repeat the horizon list's groups
  exactly. One of the two lists should go once the horizon grouping has been lived with.
- **Edge states exercised only in the brief.** Before term start (the current-week column is off
  the axis — `now` is −1 and no tint renders), after the last exam (every mark done or past), a
  cell with more than three marks (the row grows; no count fallback), the Today group and the
  amber "today · tomorrow" mark (nothing was due that soon at build time).
- **`term_end` doubles as the exam date on FoC II**, which stretches "week N of 17" past the
  teaching term. Either a convention (term_end = last lecture) or a separate field.
- **Start-by dates** worked back from due dates by a per-type lead time, drawn as ghost marks on
  the map and a "start X by Thu" line in Now. Needs the lead-time config and a type richer than
  task/assignment. **Free-day / lightest-day insight** from the slots, same place.
- **Hub adoption.** `semesterMap()`, `AcademicNow`'s shape and the horizon grouping are pure
  and domain-agnostic in their inputs; the hub's deadline strip item above is the first client.
- `AcademicTasks` still owns a private `ViewTab` (the `ui/Tabs` migration item under
  UI-polish follow-ups stands).

## Academic v3 (2026-10-10)

- **Task deletion.** Editing landed 2026-10-13 (an inline editor behind a pencil on every row;
  `PATCH` accepts `course_id`). The API still has no task DELETE, so removing a task means the
  database; a delete action with a confirm, mirroring courses, would close the loop.
- **The three other pages still carry a rail of modules** (#57/#63) while Academic has a
  navigation rail (#78). Decide whether the hub, Personal and Professional follow; `NavRail`'s
  section list is the only Academic-specific part.
- **The timetable's deadline list repeats Upcoming work's Overdue/This week rows** (#73 vs #80)
  — still two lists of the same items on one page.
- **Mark overflow ("+N") is untested on real data** — no cell has more than two marks this term.
- **Exam-only course rows** show a single diamond and an em dash; a course row that is exams
  only could instead sit in the "without deadlines" disclosure with its exam noted.
- **`AcademicTasks` still owns a private `ViewTab`**; the `ui/Tabs` migration item stands.
- **Reminders landed as a NotesCard at the page's foot** so the rail link has a target; a
  compact reminders surface nearer the top (or a popover from the rail badge) may read better.

## Personal v2 (2026-10-10)

- **Bill editor.** Bills are seeded rows with a monthly paid box; the design's "edit, delete,
  recurrence" actions have nothing to open. A bills API (name, amount, due day, active) and a
  small form inside Manage bills would close it.
- **Health code paths left in place** on purpose (#81): `lib/db/health.ts`, `/api/health/*`,
  `/personal/health` + `TrendsView`, `charts/Sparkline`, the `health.*` config keys and the
  Python scripts' `health.metric_keys` contract. Delete when the user decides the data is not
  coming back; until then the route is unlinked, not removed.
- **Rail shell on the hub and Professional** — Academic and Personal now share `ui/NavRail`;
  the other two pages still carry the rail of modules (#57/#63).
- **Spending month control.** `budgetOverview()` reads the current month only; the design's
  month selector needs a month parameter through the overview, the category spend and the
  insights before the header control can exist.
- **Category averages' period.** `budget.baseline` carries no "over N months" — the label says
  "(historical)" and nothing more honest is available without storing the window it was built
  over.

## Week plan (2026-11-19)

- **Verify a real parse once the API key works.** Draft rendering of groups, matches and reasons
  has only been seen through accepted rows; run one note through *Plan it* and check the draft,
  then time it (the progress steps assume a few seconds).
- **Edit or remove one plan item after Add.** Today only the whole apply can be undone, within
  the status line's few seconds; a per-row `RowAction` (pencil / remove) is the obvious next step.
- **Parse feedback.** HIG generative-AI: let people say a draft was wrong. Store the user's edits
  against the proposal (`plan_notes` already has both sides) and use them to tune
  `lifeos/plan_prompt.py`.
- **Phone captures into the plan.** A capture that reads like a week intention could be offered
  to the plan instead of the Inbox.
- **The rest of the hub.** Inbox, briefs, calendar and the Domain tiles are next in the hub
  rework — the Domain tiles carry no live state yet (overdue work, unpaid bills, habits today).
- **Undo ids.** If undo ever needs to outlive a page view, give `tasks` stable ids (AUTOINCREMENT
  needs a table rebuild) rather than relying on the title check.

## Overview redesign (2026-11-19)

- **Sharper coast and Lake Tahoe prints.** Both are ~550px crops from the mockups; the header
  slot wants ~1,300px at Retina. Replace the two files in `public/artwork/` with standalone 3:1
  prints (and update `width`/`height` in `lib/overview/artwork.ts`) when they exist.
- **Search, an account avatar and domain sub-menus** were in the reference and are not built —
  the app has no search, no accounts and no sub-pages to list. Each is its own feature.
- **Un-complete from the Overview.** A task ticked in Due soon or This week leaves both lists on
  refresh (they list open work), so a mis-click is undone on the domain page. An "Undo" on the
  status line, as the Week plan has, would close that.
- **The other three pages are still dark.** Moving from the light Overview to a dark domain page
  is a hard cut; decide whether they follow the Overview theme or stay as they are.
- **`generated_images/` is untracked** (17 source PNGs, ~34 MB). Either delete it, or add it to
  `.gitignore`; the five prints the app uses are already in `public/artwork/`.

## Academic on the Maritime theme (2026-11-20)

- **Course detail pages are still dark.** A course link from the light Academic page lands on
  the dark `/academic/courses/[id]`. Moving it means `SiteNav`, `RuledSection` and the theme
  wrapper on that route, and a pass over `SectionBanner` there.
- **Professional is still dark,** with the rail-and-bento. The shared parts it would need now
  exist (Personal moved 2026-11-28, #103).
- **Centre the timetable's week range between its arrows,** as the reference draws it. It is a
  change to `WeekCalendar`, which four pages share; held back for that reason.
- **Scroll-spy on the section links.** The navigation rail marked the section in view; the link
  row does not.
- **Migrate the private pill tabs to `ui/Tabs`** (AcademicTasks' `ViewTab`, WeekCalendar's
  `Tab`) and give `Tabs` the filled variant, so the Maritime filter style is a prop, not a
  `data-view-tab` rule.
- **`generated_images/`** now holds 24 source PNGs, untracked.

## Personal on the Maritime theme (2026-11-28)

- **Personal prints.** The masthead has no print until the user's three Personal prints exist
  (1800×600 webp, 3:1, into `public/artwork/`). Then: add `"personal"` to `ArtworkCollection`,
  entries in `ARTWORKS`, allow it in `/api/overview/prefs`, and pass `artwork` to
  `PageMasthead`.
- **Habits, not chosen yet:** a weekly target per habit (e.g. 3 of 7 for Workout), and a
  week-on-week line. Streaks stay out for now (#106).
- **`time_of_day` is unread.** Drop the column in a table rebuild if it stays unused.
- **Drag on touch** has been exercised with a mouse only; check it on a phone.

## Personal money split (2026-11-28)

- **Rework the Money page.** Bills and Spending moved to `/personal/money` unchanged (#110);
  its own layout is the next step.
- **Say when spending was last imported.** Nothing on either page says the data stops at the
  last CSV import, so a stale month reads as "CHF 0 spent · under pace". The mocks had a
  "Spending up to {date} · N days without an import" line.
- **Bills and the budget's Fixed tier track the same payments twice** (Budget details
  counts a fixed line as paid from transactions; Bills from the tick). Decide which one owns "paid".
- **One fixed budget line has no monthly payment.** Add it with "Add payment" if it should be
  checked off too.
- **Amounts with cents** show rounded to whole francs on the Money page.
