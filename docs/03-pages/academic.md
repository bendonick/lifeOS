# Page — Academic (`/academic`)

**Maritime redesign, 2026-11-20 (decisions #91–#94) — this section is current; where the text
below differs, this wins.** Light theme (`.theme-maritime` + `.page-academic`), no navigation
rail, no tiles. Top to bottom:

1. **Navigation** — `ui/SiteNav current="academic"` with the filled **+ Add** menu (Course ·
   Assignment or task · Exam · Reminder; same hashes and forms as before).
2. **Masthead** — "University", "Academic", "Autumn semester 2026 · week N of M"; a
   print in a 5:1 slot; then the section links Semester · Assignments · Exams · Courses ·
   Timetable · Reminders (pending count on the last) with the print's previous / pin / next.
3. **Semester map** — full width, a `<table>`; every column a Monday–Sunday range (#92); three
   marks; the current week tinted rust; Weekly load = open assignments and exams due.
4. **Upcoming work | Exams** — ~60/40 with one rule. Filters, horizon groups, Later, done boxes,
   the inline editor and course links unchanged. Exams ends after "N more exams" (#93).
5. **Courses** — the two-column index of expandable rows (unchanged behaviour).
6. **Timetable** — open, full width; slate event blocks, Exam Prep blocks with a rust left
   edge; the deadline strip labelled against the displayed week (#94).
7. **Reminders** — full width, `NotesCard bare`.


**Laid out to the approved v3 design 2026-10-10 (decisions #78–#80).** A 13rem navigation rail
(`NavRail`) beside the page; a header of serif title, semester subtitle and one `+ Add` menu;
then four modules on `Tile frame="quiet"` in need order — **Semester** (full width) · **Upcoming
work** beside **Exams** (8 + 4, stacked below `xl`) · **Courses** (full width) — followed by the
timetable at full width (#28/#58/#73 unchanged) and the Reminders list the rail links to. No
captions (#67). Everything the earlier layouts could do is still reachable: creation through
`+ Add`, course edit/delete and links inside an expanded course row, exam done boxes inside the
expanded exams list, overdue work as a conditional group, the course page for details.

The MSc command center: courses, deadlines, timetable, and (later) course-content RAG.

## Modules

1. **Navigation rail** (`NavRail`, client): LifeOS wordmark → `/`; **Academic** (current page)
   with Overview `#semester` · Courses `#courses` · Assignments `#assignments` · Timetable
   `#timetable`, the active one following the scroll; a divider; Personal · Professional ·
   Reminders `#reminders` with a pending-count badge; at the foot "Week N of M" over the olive
   bar from `termOf()` / `weekOfTerm()`, with the term end as its tooltip. Below `lg`: a bar
   with a toggle, the same links beneath it.

   **Header**: "Academic" (serif), the semester as `semesterLabel()` of the enrolled courses'
   code ("Autumn semester 2026"), and **`+ Add`** (`AddMenu`): Course `#new-course` ·
   Assignment or task `#new-assignment` · Exam `#new-exam` · Reminder `#new-reminder`. Each
   entry is the hash an existing form listens for; the three forms that lost their buttons open
   through `ui/AnchoredForm` and clear the hash on Cancel. Reminders keeps `NotesCard`'s own
   trigger.

2. **Semester** — the hero (#74, semantics #79). `SemesterMap` (client) renders the model from
   `semesterMap()` in `src/lib/academic/semester.ts`: one row per course (grouped by name, #77)
   ranked by earliest open item, an **Unassigned** row only when unfiled items exist, one column
   per Monday-start week from the earliest `term_start` to the last dated item. Marks, exactly
   four: hollow rose circle = upcoming assignment (overdue included, named in its status), filled
   grey = completed, filled amber = due today (completion wins; tomorrow is not today), hollow
   rose diamond = exam (stays a diamond on its day). Each 12px mark is a 24px `Link` to the
   course named "title · course · exact date/time · status"; hover or focus writes that line
   under the grid; a cell with more than four marks folds the rest behind "+N". Header: "Week
   of" once, month tier above, "This week" above the current Monday's numeral on a neutral
   `.map-now` band. **Remaining**: incomplete assignment records per course — 0 when all done, —
   when none exist. **Weekly deadlines · Includes assignments and exams**: incomplete
   assignments plus open exams, blank at zero, tinted from `BUSY_WEEK_THRESHOLD` (3). Tile meta:
   "N open · N completed · N exams" over every assignment record, exams separate. Footer: the
   four-entry legend left, "N course(s) without deadlines" disclosure right (links to the course
   pages). Absent when no enrolled course carries a term start.

3. **Upcoming work** (`AcademicTasks mode="work"`, #80) — `tasks` filtered domain=academic, type
   in (task, assignment). Tile meta "N this week · M next week". Filters: Upcoming (grouped by
   horizon — Overdue only when any · Today · This week to Sunday · Next week · Later collapsed
   with "N tasks · next date" · No date) · All N (every incomplete row, flat) · Completed. A row:
   24px done box · title (a neutral `task` pill when the type is not assignment) · course code
   pill · one due label via `dueLabel()` — Today / Tomorrow in amber, the date otherwise, "·
   overdue" in red, with the time when set — · a pencil · a chevron to the course page. Hairline
   rows. No add button: `+ Add` opens the form by hash. **Editing (2026-10-13):** the pencil opens
   an inline editor under the row — title, type, course, date, time, details — saved through one
   `PATCH /api/tasks/:id` (which now accepts `course_id`, validated like POST), so the map, the
   groups and the counts move together. One editor at a time; the course page gets the same
   editor without the course picker.

4. **Exams** (`ExamsPanel`, #80) — the nearest open exam (course code → course page, date ·
   time · title), tile meta `firstExamLabel()` ("First in N days", Today, Tomorrow); the rest
   behind "N more exams" → `AcademicTasks mode="exams"` with done boxes and the hash-opened add
   form. Beneath: **Next busy week** from the map's `nextBusy`, with peak week and term end as a
   quiet second line; hidden when no future week qualifies. Exams carry no midterm/final split
   (#25).

5. **Courses** (`CoursesSection`, #80) — compact rows in two columns (one below `md`): code ·
   full name · chevron, a status pill only when not enrolled. Expanding reveals each slot's
   Mo–Fr strip, time, calendar ↗ (#27), edit and delete (per slot, `CourseForm` inline);
   credits, semester, professor (mailto), room, term; the OLAT link (`courseLinkLabel()`); Open
   course →. Tile meta "6 courses · 33 credits · 17.25 h/week", credits once per course. The add
   form has no button here — `#new-course` opens it. Credits are the only score; no grades, no
   GPA (#10). Each course opens the detail view (metadata incl. the short name, its
   assignments/exams with their own add buttons, materials).

6. **Timetable** — read-only week view of the **Academic** and **Exam Prep** ICS calendars
   (tabs: Academic, which shows both, Exam Prep alone, and All calendars; Exam Prep added
   2026-11-26 through `calendarHome`, its own tab 2026-11-27; its blocks
   carry a rust left edge so study time reads apart from classes), full width with nothing beside it (decision #28). Built in Stage 3 on the shared
   `WeekCalendar`, which also serves the hub and Personal. Class blocks come from Google
   recurring events the user creates once per course — from Stage 3 the course row links out to
   a prefilled Google form to save the retyping (decision #27).
   The work half of decision #2's command center is the Assignments and Exams tables *directly
   above* it on the same page; a companion column only restated them. An "Up next" list and a
   "Schedule check" drift panel both shipped here on 2026-08-16 and were removed on 2026-08-17
   — see BACKLOG if either is wanted back.

   **Deadlines on the grid (2026-10-05, decision #73).** The open, dated rows of the two
   tables above — assignments, tasks, exams — also draw on the timetable: as Olive chips in a
   **due strip** between the day headers and the hours (title and course only, one colour, the
   full line as a tooltip), and as a **bulleted list under the grid**, overdue first, where the
   date and days-left figure appear in the tables' urgency colours. Both follow the week being
   paged. The grid renders **open by default on this page** — the one exception to #66 — and
   the "next four classes" summary list is not shown here. Nothing is written to Google: the
   strip is a date lane this system owns, the hour grid stays the calendar's. Wiring:
   `openDeadlines("academic")` → `CalendarTile deadlines expanded` → `WeekCalendar deadlines`
   → `DeadlineList`; the hub can adopt it by passing `openDeadlines()` with no domain.

7. **Materials & RAG (Stage 6)** — per-course lecture PDF listing from the folder tree; a chat
   box ("ask your courses") hitting the local RAG pipeline, answers with file+page citations.
   Until Stage 6: show the folder contents read-only so the filing habit starts early.

## Data touched

`courses` (rw), `tasks` (rw), ICS Academic feed (read), course folders (read),
`index/` (Stage 6).

## Carry-overs from the Notion design

No grading/GPA; credits matter. (The green identity became lifted Merlot with the editorial
theme, #57, and the banner+caption pairs went with the captions, #67/#74.)
