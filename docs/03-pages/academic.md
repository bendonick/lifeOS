# Page — Academic (`/academic`, Merlot)

**Redesigned for glance reading 2026-10-05 (decisions #74–#77).** On `theme-editorial` with the
sticky 19rem Olive rail beside a twelve-column bento in Academic's lifted Merlot. The rail now
opens with **Now** and **Exams**; the main column has a subject — the **semester map** — followed
by course cards and the horizon-grouped list; the timetable keeps its full-width place outside
the rail grid (#28/#58/#73). No tile carries a caption (#67). Every capability of the table
layout is preserved: add/edit/delete courses per slot, the view tabs, optimistic done boxes,
the quick-add anchors, the Google and OLAT links.

The MSc command center: courses, deadlines, timetable, and (later) course-content RAG.

## Modules

1. **Left rail** (Olive, in this order): **Now** (`AcademicNow` — the next dated item with its
   day count, the overdue item as a link into the list, "N due this week · M next week", the
   next week heavier than the user's median and the term's peak, and "F26 · week N of M" over a
   thin bar); **Exams** (#75 — `AcademicTasks layout="rail"`: one line per open exam, a 24px done
   box, the course code linking to the course, date and time; a day count only inside
   `EXAM_COUNTDOWN_DAYS` = 30, "first in Nd" in the tile header meanwhile; `+ Add exam` behind a
   Disclosure, anchor `#new-exam`); **Go to** (one link per enrolled course by its short code,
   then the other pages); **Quick add** (Course / Assignment / Exam / Reminder anchors);
   **Reminders** (`NotesCard`).

2. **Semester** — the hero (#74). `SemesterMap` renders the model from `semesterMap()` in
   `src/lib/academic/semester.ts`: one row per course (grouped by name, #77) plus a "no course"
   row for unfiled items, one column per week from the earliest `term_start` to the last dated
   item, one mark per item (ring open · filled-quiet done · filled red overdue · filled amber
   today/tomorrow · diamond exam). The current week is a `.map-now` column. A cell with marks is
   a `Link` to the course page with an accessible name listing its items. The right column reads
   "5 left" until a course has a completion, then "2 of 7"; the bottom row counts open items per
   week, exams included, bold when at or above `heavyThreshold()` (median non-empty week + 1)
   and rose on the peak. Courses with nothing dated are named in a footnote. The legend lists
   only states present. Absent entirely when no enrolled course carries a term start.

3. **Courses** — cards, one per course (`CoursesSection`, `groupCourses()`): code and name, a
   Mo–Fr day strip (two-letter days; the T's were ambiguous), each slot's `time_label` with its
   own calendar ↗ / edit / delete and the OLAT link once, a status pill only when not enrolled.
   The whole card opens the course page. The tile header carries "6 courses · 33 credits ·
   17.25 h/week" — credits summed once per course. Credits are the only score; no grades, no GPA
   (decision #10). `+ New course` opens `CourseForm`, which gained **Short name** (placeholder =
   the derived code). Each course opens the detail view: metadata (now including the short name,
   marked "derived" until set), its assignments/exams, and its materials folder. Enrolled
   courses with days, a start time and a term start link to a prefilled Google Calendar form
   (#27); `courses.url` renders as "OLAT page ↗" (`courseLinkLabel()`).

4. **Assignments & tasks** — `tasks` filtered domain=academic, type in (task, assignment).
   View tabs: Open · N / Overdue · N / Completed / All. **Open is grouped by horizon** —
   Overdue · Today · This week (to Sunday) · Next week · Later (collapsed, "16 · next Wed 21 Oct")
   · No date — via `horizonOf()`; a group renders only when it has rows. Columns: a 24px done
   box, Item (with a neutral type pill only when the type is not `assignment`), Course as its
   short code, Due (date and time, urgency-coloured, no "overdue" word — the Left pill says it),
   Left (days-left pill). Due takes an optional time (`'YYYY-MM-DD'` or `'YYYY-MM-DDTHH:MM'`).
   `+ Add assignment or task` behind a Disclosure, anchor `#new-assignment`.

5. **Timetable** — read-only week view of the **Academic** ICS calendar (toggle: all
   calendars), full width with nothing beside it (decision #28). Built in Stage 3 on the shared
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

6. **Materials & RAG (Stage 6)** — per-course lecture PDF listing from the folder tree; a chat
   box ("ask your courses") hitting the local RAG pipeline, answers with file+page citations.
   Until Stage 6: show the folder contents read-only so the filing habit starts early.

## Data touched

`courses` (rw), `tasks` (rw), ICS Academic feed (read), course folders (read),
`index/` (Stage 6).

## Carry-overs from the Notion design

No grading/GPA; credits matter. (The green identity became lifted Merlot with the editorial
theme, #57, and the banner+caption pairs went with the captions, #67/#74.)
