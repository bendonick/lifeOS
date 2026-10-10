# 02 — Design system

Distilled from the Notion build the user iterated on and liked. The goal is *that* feel —
minimal, dark, professional — rendered better than Notion could. These tokens
and patterns constrain every UI change.

## Mood

Dark theme, calm, uncluttered. Information-dense but never busy. No purple-gradient AI-slop,
no decorative illustrations. The reference aesthetic is "clean Notion dashboard, dark mode" —
restrained color, deliberate spacing, nothing random.

**Translucent materials are allowed** (reopened by the user 2026-08-16, decision #24): chrome
that floats over scrolling content — the sticky page header, the left rail — may use
`backdrop-filter` blur over a semi-transparent surface. Rules that come with it: never stack a
light translucent surface on another; bigger surfaces read as thicker (stronger blur); keep it
off dense data rows, where it costs legibility; and always ship the
`prefers-reduced-transparency` / `prefers-contrast` fallbacks (see `globals.css`). Use the
`.material` class so those fallbacks apply.

## Color

> **Superseded for the four main pages by the editorial theme (decisions #48/#55).** The palette
> below is still what `:root` holds and what the two detail pages render with; everything under
> `.theme-editorial` overrides it. Both are live — read the theme block in `globals.css` before
> changing a colour.

**Editorial theme (shipped, all four main pages).** Grounds: Graphite `#121212` page, Midnight
Blue `#1C2430` tiles, Merlot `#4B1E23` field (page header only). Ink: Bone `#E6E0D6`, with
`muted`/`faint` stepped down from it. Accents are split **by layout, not only by domain**: the
left rail is Olive `#9aa075` on every page, and the main column carries the domain —
Tobacco `#c68a4a` (Personal) · Merlot `#cc7480` (Academic) · blue `#5590cc` (Professional) ·
Olive (hub, which is domain-less). Budget categories get exactly **three** validated slots plus a
neutral remainder — a fourth has failed the ΔE 15 floor on both reference palettes, each time on
the green against the warm yellow-brown.

**Original theme (`:root`, detail pages).**
- Background: near-black; cards one step lighter; hairline borders.
- **Domain colors are the identity of the system** — used for section banners, tags, calendar
  event tints, and page accents:
  - Academic → green
  - Personal → purple
  - Professional → blue
  - LifeOS/hub → neutral warm gray (the hub is domain-less)
- Warm colors are **reserved for urgency only**: red = exam / overdue / high priority,
  orange = assignment / due-soon. If everything is colored, nothing signals — this rule came
  directly from the Notion tag-palette work.

## Page anatomy (every page follows this)

1. Breadcrumb (LifeOS / <Page>) + page title.
2. **Tiles** (`src/components/ui/Tile.tsx`) — the card shell with the section header inside it:
   icon, serif title, caption, optional trailing `action` link or `meta` stat, and a caller-set
   grid `span`. **`accent` is required, not defaulted** (#59): it defaulted once, and three pages
   silently rendered in a fourth page's colour with nothing failing.

   Tiles replaced `SectionBanner` on the four main pages in the design pass. The banner was the
   signature carried over from Notion, and seven identical ones stacked down a page turned out to
   be the single strongest reason it read as generated — every section at the same volume, so the
   page had no subject. Hierarchy now comes from **tile size**, which needs no decoration to
   express. `SectionBanner` is unchanged and still serves the two detail pages; the description
   below applies there.
   The banner takes an optional trailing **link** (`action`) or **stat** (`meta`, e.g. Courses →
   "1 course · 6 credits"). A single headline number belongs there rather than in its own card —
   two stat cards above a short table cost more room than the table itself.
3. **Rail + bento** on wide screens: a sticky **19rem** left rail of the ways out of the page
   and the day's small state (Go to, Quick add, Reminders/Ideas, on Personal also Habits and
   German), beside a **twelve-column** grid of tiles with `items-start`. **Academic is the
   exception (#78):** a 13rem *navigation* rail — wordmark, the page's sections as scroll-spied
   anchors, the other pages, Reminders with a badge, week-of-term at the foot — beside modules on
   `Tile frame="quiet"`, with one `+ Add` menu in the header instead of per-module add buttons. Set spans from the
   content, not from symmetry. The hub has **no rail** — it is the navigation. The week calendar
   sits **outside** the rail grid at full page width: `WeekCalendar` has a 52rem floor and the
   main column beside a 19rem rail is narrower than that (#58).
   Full-width sections below where a module needs the room (calendar, big tables).

## Surfaces (decision #65)

A border must mean **grouping or interaction**. When every element has one, none of them does —
`/personal` reached fourteen outlined rectangles at equal weight before this was written down.

- **One border per section.** The `Tile` is it — `border-2` in `--color-border-strong` on the
  pages with a rail of modules; `frame="quiet"` (a hairline at 20px padding) on Academic, where
  the modules sit beside a navigation rail and four 2px outlines read as the outline (#78). A `Card` inside a `Tile` is a card inside a card:
  use `<Card bare>`, which keeps the label/value/context grammar and drops the box. A `Table`
  already inside a `Tile` takes `frameless`. Since 2026-08-23 this holds on **every** page, and
  by weight **and tone**: the module shell (`Tile`, and `NotesCard`'s rail shell) is `border-2`
  in `--color-border-strong` (2.6:1 on Midnight, 3.0:1 on Graphite) at `rounded-xl` — the
  page's one strong border — while inner structure stays hairline `--color-border` (~1.5:1).
  The strong tone is its own token because the first attempt thickened the hairline colour and
  2px of an invisible line was still invisible.
- **Subordinate containment is allowed; same-style nesting never** (#70). Repeated items inside
  a module may be contained — as row-cards: `--color-inset` ground, 1px hairline, `rounded-md`
  (6px), 6px gaps — because the levels differ in radius, weight and tone, so page → module →
  row reads at a glance. Spellings: `Table rows="cards"` for `<tr>`s (`.table-cards` in
  `globals.css`; `data-empty` and `data-section` rows are never carded — a message or a group
  label is not an item), `.row-card` for non-table items (hub briefs), and the utility spelling
  `bg-(--color-inset)` where a hover ground swap must beat the un-layered class (Domains nav).
  `ThisWeek`, `ProjectTasks` and `AcademicTasks` take a `frameless` prop rather than hardcoding
  it, because the two detail pages have no Tile and keep the table's own frame.
- **Rows use dividers or spacing**, never individual boxes (`divide-y divide-border`).
- **Accent colour marks meaning, not category.** `Card` defaults to an accent label; pass
  `labelTone="muted"` for anything that is a caption. Four accent labels over four empty metrics
  is the page's whole colour budget spent on "no data yet".
- **Control chrome lives in `src/components/ui/controls.ts`** — `inputChrome`, `fieldChrome`,
  `selectChrome`, `buttonChrome`. Copying the strings is fine for the second form and stops
  scaling at the fifth.

## Text (decision #67)

**Every line has to earn its place.** The page reached seven tile captions and a dozen
explanatory footnotes, and none of them told the user anything the module beneath them wasn't
already showing.

- **Tiles carry no caption on `/personal` or `/academic`.** "today's metrics" over four metrics, "this month"
  over a column of due dates, "resets at midnight" over a list of checkboxes — a caption that
  restates the content is noise wearing the costume of guidance. `Tile`'s `caption` prop remains
  for a caption that carries a *fact* the tile cannot show.
- **Never explain how the interface works.** No "bars fill as you spend", no "the line marks where
  spending should be by day 12", no "assigning unifies them". The user built this; a control that
  needs a sentence underneath it is a control to fix, not to annotate.
- **Do keep**: data and its units, *caveats about trustworthiness* (which months a median skipped,
  that a total mixes smoothed annual figures, `generated_at` on anything generated), and empty
  states — but at one clause, not two ("All caught up.", not "Nothing to review — all caught up.").
- **Two numbers on one surface must share a scope, not explain it.** The Calendar tile counted
  every feed above a list filtered to one, and the fix was to count the same set — not to append
  "all calendars".

## Progressive disclosure (decision #63)

Three levels, and the rule that makes it work: **status stays visible, only detail collapses.**

- `src/components/ui/Disclosure.tsx` is the one control (`variant="chevron"` reveals detail,
  `variant="add"` opens an editor). `DisclosureTrigger` is the same button for the controlled
  case, where the detail is spread across rows rather than in one block.
- **A collapsed disclosure must say what is behind it** — `detail` carries the count or total, so
  a real backlog is never hidden behind a control that looks inert.
- `anchors` opens the panel when a hash targets something inside it, then scrolls and focuses it.
  The browser cannot: while the panel is shut, the element is not in the DOM.
  (`scroll-margin-top` covers `[id^="new-"]`, so an opened input clears the sticky header.)
- **Editing is behind intent (#64 — app-wide since #72).** Default state is reading. No form is
  open at rest on any page; the hub's capture box is the one standing exception (the hub's
  primary action). Add-forms carry no `detail` count — an editor has no backlog to disclose.
- **`variant="add"` requires an `accent`** (the section's own) — identity, never defaulted: it
  shipped hardcoded to Personal's hue and the hub hovered Tobacco with nothing failing.
- **Week grids are collapsed everywhere (#66/#72) — except on `/academic` (#73).** `CalendarTile`
  leads with what's coming and holds the grid behind `Open week · N this week` on the hub,
  Personal and Professional. On Academic the grid carries the page's deadlines — a *due strip*
  of Olive chips above the hours and a bulleted list beneath, overdue first — so it is the
  week's work rather than empty rows, and it renders open with no summary list. The chips name
  the item and its course only; urgency (days left, overdue) appears once, in the list.

## Glance widgets (decisions #74–#76)

The Academic redesign is the reference for a page that is read rather than scanned. Three
forms, each for one kind of question; the rules under them hold on every page.

- **A map for distribution** — entities down, time across, one mark per dated item
  (`SemesterMap`). Position on a shared axis is the encoding people read most accurately, so
  "when does it get heavy" and "who owns the load" are answered without reading a row. The
  axis comes from the data's spread, not from a pattern library: a 21-day strip would have
  shown five of 21 items. Exactly four marks (#79): hollow rose circle = upcoming assignment,
  filled grey = completed, filled amber = due today, hollow rose diamond = exam; overdue is a
  status word, not a glyph. Each 12px mark sits in a 24px link whose name is the full
  description, echoed in a live line on hover or focus. The current week is a neutral band;
  a "Weekly deadlines" row counts the same set the marks draw, blank at zero, tinted from a
  fixed threshold; "Remaining" is one integer per row, with an em dash for no records.
- **A list grouped by horizon for "what next"** — Overdue · Today · This week · Next week ·
  Later (collapsed, saying its count and next date) · No date. Resolution decays with
  distance. A group renders only when it has rows. The table is never deleted — it is one
  chip away — because tables win for lookup, comparison and editing.
- **Cards for few, heterogeneous entities** (≤ ~6), **four facts each at most**: an identity,
  a shape (the Mo–Fr day strip), a figure, the ways out. The whole card is the link; controls
  sit above it. Everything else goes to a header total or the detail page.
- **The rail carries standing state** as well as the day's: what is next with a big day count,
  the overdue item as a link, a relative "heavier than usual" week, where in the term we are,
  and the fixed points (exams) with a countdown only once it can change behaviour (≤ 30 d).

Rules that travel with these (binding; measured, not eyeballed):

| Rule | Measured on Academic |
|---|---|
| Non-text marks clear **3:1** on their ground. | Done mark at 45% opacity was 2.26:1; 70% is 3.55:1. |
| Pointer targets **≥ 24×24** — a label box around a checkbox, `RowAction`, the grid cell. | 14px checkboxes and a 12px pencil had passed four mock reviews. |
| A colour-driving threshold lives in one helper — relative to the user's data unless the user fixes it. | The semester map's busy week is a fixed `BUSY_WEEK_THRESHOLD` = 3 at the user's ask (#79); the median rule it replaced could not be predicted from the page. |
| A legend is the fixed vocabulary, nothing more; a count row counts the set the marks draw. | Four entries on the semester map (#79); the "due" row once counted coursework under exam diamonds. |
| A progress figure is one integer with one definition; absent data is an em dash, not a zero. | "Remaining" (#79): incomplete records, 0 when all done, — when the row has none. The earlier "5 left / 2 of 7" mixed two framings. |
| Shape carries type/state; colour carries urgency only; filled states differ by lightness. | Rose ring vs red fill, ΔE 17.8, kept apart by shape. |
| Nothing lives only in a tooltip. | 10px marks with `title` → named 24px links plus a live detail line on hover/focus (#79). |
| One due label per row — never a date and a countdown side by side. | "Tomorrow" and "1d" in one row say one thing twice (#80). |

## Recurring patterns

- **Command center**: read-only calendar (time) and an interactive task list (work) on the same
  page. The user reads free time on one surface and picks tasks on the other. Never merge them
  into a single list. In practice every page built so far **stacks** the two as full-width
  sections rather than placing them in columns — Academic tried a side column and it read as a
  duplicate of the tables above it (decision #28). "Beside" means on the same page, not
  necessarily in the same row.
- **Cards**: small stat/brief cards with a title row (icon + label), one big value, one muted
  context line — e.g. "Sleep · 55 / −22 vs 7d avg", "HRV · N ms / above range · low–high",
  "Steps · N / M% of goal", "CHF X / Y · N% · day D · on pace". This exact card
  grammar comes from the user's Personal page; reuse it for health, budget, and briefs.
- **Tags/pills** for enum values (domain, type, status, schedule day) using the palette rules.
- **Tables**: minimal chrome, sortable where it matters, empty states with a one-line hint
  rather than blank space.
- **View tabs** on data sections (e.g. Open / Overdue / Completed / All on assignments — Open is
  grouped by horizon inside, #74; own-domain / All domains on calendars) — small pill tabs above the table, one
  active. A tab names a **state**, never a noun that could read as the name of a list: the
  Academic page once had a "To do" tab beside a "To do" card and showed "nothing open" next to
  "1 open". Lists beside a filtered table say what they carry.
- **Quick Action buttons** in the left rail: New Task / New Assignment / New Exam / New Course
  etc., opening prefilled forms (the page's domain is the default — editable).
- Staleness is honest: anything generated (briefs, synced data) shows generated_at or a
  "stale" badge instead of pretending to be live.

## Typography & spacing

- One clean sans (system stack or a single webfont) for everything functional — tables, labels,
  controls, data. Clear hierarchy: page title > section banner > card title > body. Generous
  line-height; sections breathe.
- **Display type (decision #48, `.theme-warm` only for now):** one high-contrast editorial serif
  (Instrument Serif, self-hosted via `next/font`) for page titles, section names and hero
  numerals — never for tables or controls, which need the sans's tabular figures and its
  legibility at 11px. The `.t-serif` class is the hook. A single serif paired against a
  functional sans is the strongest "authored rather than generated" signal available, and it is
  what the user's own reference is built on.
- No more than two font weights per view. Numbers in stat cards may be larger/tabular.
- **The scale is five steps and nothing between them** (`globals.css`): page title (2rem serif) >
  section title (1.125rem serif, `Tile`'s h2) > metric (`.t-metric`, 1.5–2rem, tabular) > body
  (0.875rem) > metadata (0.75rem). **0.75rem is the floor** for anything a reader has to parse;
  11px survives only inside dense tabular chrome. `.t-eyebrow` is the small label above a metric.

## Craft standards (added 2026-08-16 — decision #24)

These are the non-negotiable mechanics; the aesthetic above is guidance, not law.

- **Focus.** One `:focus-visible` outline defined in `globals.css`. Components must never
  re-suppress it with `outline-none`.
- **Contrast.** `--color-faint` is a *text* tone and must clear 4.5:1 on `--color-surface`;
  decorative hairlines use `--color-border` instead. Re-measure after any token change.
- **Native controls.** `color-scheme: dark` on `:root` — `accent-color` only styles the checked
  state, so without it checkboxes/selects/scrollbars render light.
- **Motion.** Under 300ms, `ease-out` (never `ease-in`), transform/opacity only. Buttons get a
  ~120ms `scale(0.97)` press. `prefers-reduced-motion` is honored globally.
- **Never dim text to signal pending.** Use `aria-busy` plus a hairline; panel-wide opacity
  drops muted text below AA while the user is reading it.
- **Type.** Large numerals take negative tracking and tight leading (`.t-display`); avoid
  inventing new sub-12px sizes — 11px is the floor.
- **State honesty.** Don't render a status that cannot yet be true, and don't color anything
  warm unless it is genuinely urgent.

## Don'ts

- No light theme work until asked.
- No emoji noise in chrome (emoji fine inside user content).
- Don't introduce new accent colors; extend within the domain palette (or, under
  `.theme-editorial`, within its six). Domain colors remain the
  identity of the system.
