# Page — Academic (`/academic`, green)

The MSc command center: courses, deadlines, timetable, and (later) course-content RAG.

## Modules

1. **Left rail cards**: Quick Actions (New Course / New Assignment / New Exam / New Task —
   forms defaulting domain=academic and, where relevant, a course picker), Navigation
   (links to course pages / materials), Reminders (lightweight checklist).

2. **Courses** — gallery or table over `courses`: name, professor, credits, room, schedule-day
   pills, time label, semester (F26/S27), status. A **credits counter** sums credits by status
   (enrolled / completed) — the user tracks credits, not grades (grading system was explicitly
   removed in the Notion design; do not add GPA features).
   Each course opens a detail view: metadata, its assignments/exams (tasks filtered by
   course_id), and its materials folder listing (`data/academic/courses/<slug>/lectures`).
   An enrolled course with days, a start time and a term start also links out to a **prefilled
   Google Calendar form** (decision #27) — the app fills the series, Google creates and owns
   the event.

3. **Assignments & Tasks** — `tasks` filtered domain=academic, type in (task, assignment).
   View tabs: Open / Upcoming / Overdue / By course / Completed / All. Columns: name, course,
   type, due, days-left (computed, color-shifts as due approaches), done.
   Due takes an **optional time** beside the date (`tasks.due` is
   `'YYYY-MM-DD'` or `'YYYY-MM-DDTHH:MM'` — a 23:59 hand-in and a whole-day
   deadline are different things). Same on exams.

4. **Exams** — `tasks` filtered type=exam. **No midterm/final split and no view tabs**
   (decision #25 — the ledger's OPEN C, closed against this line). Red accent per design
   system, carried by the exam type pill.

5. **Timetable (command center)** — read-only week view of the **Academic** ICS calendar
   (toggle: all calendars) beside the **Up next** list (open academic tasks *and exams*,
   soonest first — named apart from the Assignments "Open" filter, and captioned with its
   wider scope, so two surfaces can honestly show different counts). Full-width section: the week grid needs the room. Built in Stage 3 on the shared
   `WeekCalendar`, which also serves the hub and Personal.
   Class blocks come from Google recurring events the user creates once per course; the app
   *may* cross-check ICS blocks against `courses` schedule metadata and flag mismatches
   (nice-to-have, not core).

6. **Materials & RAG (Stage 6)** — per-course lecture PDF listing from the folder tree; a chat
   box ("ask your courses") hitting the local RAG pipeline, answers with file+page citations.
   Until Stage 6: show the folder contents read-only so the filing habit starts early.

## Data touched

`courses` (rw), `tasks` (rw), ICS Academic feed (read), course folders (read),
`index/` (Stage 6).

## Carry-overs from the Notion design

Green everywhere; banner+caption pairs ("Exams" / "midterms · finals", "Calendar" /
"blocked-off time · lives in Google Calendar"); no grading/GPA; credits matter.
