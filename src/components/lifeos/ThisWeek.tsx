"use client";

import { Calendar } from "lucide-react";
import { TaskForm } from "@/components/lifeos/TaskForm";
import { useTaskToggles } from "@/components/lifeos/TaskToggles";
import { Disclosure } from "@/components/ui/Disclosure";
import { Pill, TypePill } from "@/components/ui/Pill";
import { Table } from "@/components/ui/Table";
import { accentControl, accentHoverText, urgencyText, type Accent } from "@/components/ui/accents";
import { courseCode } from "@/lib/academic/semester";
import { googleEventUrl } from "@/lib/calendar/gcal";
import { addDays, dueInfo } from "@/lib/dates";
import type { Domain, Task } from "@/lib/types";

// Reads arrive as props from the server page; every mutation goes through the API
// routes, then router.refresh() re-reads server truth. The client never owns data.
//
// This list holds two kinds of row and distinguishes them with no tag at all: a
// row whose `due` carries a time ('2026-08-25T10:00') is an appointment, a row
// with only a date is a task. That is the whole mechanism — no new enum value,
// no pill. It also decides which rows get the Google hand-off, and it is the
// same test `weekTasksByDomain` uses in SQL to keep appointments visible past
// the week horizon.

/** Stamped into every event this page hands to Google, as the course link does. */
const PROVENANCE = "Created from LifeOS — this calendar stays the source of truth for time.";

/** A due value carrying a time, i.e. an appointment rather than a deadline. */
function isAppointment(task: Task): task is Task & { due: string } {
  return !!task.due && task.due.length > 10;
}

/** The course a row is filed against, when the caller's query joined it (the hub's does). */
type WithCourse = { course_name?: string | null; course_short_name?: string | null };

export function ThisWeek({
  tasks,
  today,
  fixedDomain,
  accent = "hub",
  showType = true,
  frameless = false,
  rows = "divided",
  addInputId,
  layout = "table",
}: {
  tasks: (Task & WithCourse)[];
  today: string;
  /** On a domain page the list is pre-filtered — fix the domain, and the
   *  redundant Domain column + select disappear. */
  fixedDomain?: Domain;
  /** Control tint. Defaults to the domain-less hub; a domain page passes its own
   *  so Personal doesn't render Academic-green checkboxes. */
  accent?: Accent;
  /** Personal writes only `type='task'`, so the pill there was a column of the
   *  same word repeated down the page. Explicit rather than inferred from the
   *  data, matching the `fixedDomain` idiom above. */
  showType?: boolean;
  /** Drop the table's own box when it already sits inside a `Tile`. */
  frameless?: boolean;
  /** Forwarded to Table — the main pages render row-cards (#70). */
  rows?: "divided" | "cards";
  /** Anchor id for the add form's title input, when this instance owns it. */
  addInputId?: string;
  /** `list` is the Overview's presentation (decision #89): ruled rows with the
   *  title leading and quiet metadata that wraps beneath it on a narrow screen,
   *  no column headers. `table` is what the domain pages render. */
  layout?: "table" | "list";
}) {
  // The page's shared toggles where a provider exists (the Overview, #89), else
  // this list's own — Personal renders it without one.
  const { toggle, valueFor, isPending, error, shared } = useTaskToggles();

  // The same horizon the query uses, from the same helper — the divider below
  // must fall exactly where "this week" stops or it is decoration.
  const horizon = addDays(today, 7);
  const firstLater = tasks.findIndex((t) => !!t.due && t.due.slice(0, 10) > horizon);
  // "Due" is the wrong word for a haircut. Ask the rows, so the header is right
  // on the hub too whenever a timed row happens to be in the list.
  const whenHeader = tasks.some(isAppointment) ? "When" : "Due";

  const columns = ["", "Task", ...(fixedDomain ? [] : ["Domain"]), ...(showType ? ["Type"] : []), whenHeader];

  const tableRows = tasks.flatMap((t, i) => {
    const info = t.due ? dueInfo(t.due) : null;
    const done = valueFor(t, !!t.done);
    const row = (
      <tr key={t.id} className="group">
        <td className="w-8 px-3 py-2 align-top">
          <input
            type="checkbox"
            checked={done}
            onChange={() => toggle(t, done)}
            className={`mt-0.5 h-4 w-4 cursor-pointer ${accentControl[accent]}`}
            aria-label={`done: ${t.title}`}
          />
        </td>
        <td className="px-3 py-2">
          <span className={done ? "text-muted line-through" : ""}>{t.title}</span>
          {/* The course's short code (decision #77), so "Stage 1" on a page that
              lists every domain says which course it is a stage of. Secondary
              text, not a pill: the Domain pill beside it already carries colour. */}
          {t.course_name && (
            <span className="ml-2 text-xs text-muted" title={t.course_name}>
              {courseCode({ name: t.course_name, short_name: t.course_short_name ?? null })}
            </span>
          )}
          {/* Where it is, or whatever else was worth typing. Never struck
              through — the appointment being over doesn't make the address
              wrong, and a struck-through second line reads as noise. */}
          {t.notes && <span className="mt-0.5 block text-[11px] text-faint">{t.notes}</span>}
        </td>
        {!fixedDomain && (
          <td className="px-3 py-2 align-top">
            <Pill tone={t.domain}>{t.domain}</Pill>
          </td>
        )}
        {showType && (
          <td className="px-3 py-2 align-top">
            <TypePill type={t.type} />
          </td>
        )}
        <td className={`tabular px-3 py-2 align-top text-xs ${info ? urgencyText[info.urgency] : "text-faint"}`}>
          <span className="whitespace-nowrap">{info?.label ?? "—"}</span>
          {isAppointment(t) && <GoogleLink task={t} label={info!.label} accent={accent} />}
        </td>
      </tr>
    );

    // Everything above the divider is this week's work; everything below is a
    // commitment far enough out that it would otherwise have disappeared.
    if (i === firstLater) {
      return [
        // data-section: a label row, not an item — the cards variant must not
        // draw an item-card around the word "Later".
        <tr key="later" data-section="">
          <td colSpan={columns.length} className="px-3 pt-3 pb-1 text-[11px] text-faint">
            Later
          </td>
        </tr>,
        row,
      ];
    }
    return [row];
  });


  if (layout === "list") {
    return (
      <div aria-busy={isPending}>
        {tasks.length === 0 ? (
          <p className="border-b border-border pb-3 text-sm text-muted">Nothing due this week.</p>
        ) : (
          <ul className="flex flex-col">
            {tasks.map((t, i) => {
              const info = t.due ? dueInfo(t.due) : null;
              const done = valueFor(t, !!t.done);
              return (
                <li key={t.id} className="border-b border-border">
                  {i === firstLater && <p className="pt-3 text-xs font-semibold uppercase tracking-wider text-muted">Later</p>}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                    {/* Title first and widest; the label makes the whole title a
                        target for the 24px box (decision #76). */}
                    <label className="flex min-w-[min(100%,14rem)] flex-1 cursor-pointer items-start gap-2.5">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => toggle(t, done)}
                          className="h-4.5 w-4.5 cursor-pointer"
                          aria-label={`done: ${t.title}`}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className={done ? "text-muted line-through" : "text-text"}>
                          {t.title}
                          {t.course_name && (
                            <span title={t.course_name}>
                              {" — "}
                              {courseCode({ name: t.course_name, short_name: t.course_short_name ?? null })}
                            </span>
                          )}
                        </span>
                        {t.notes && <span className="block text-sm text-faint">{t.notes}</span>}
                      </span>
                    </label>
                    {/* Muted on purpose: the title and the date are the row. */}
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-8.5 sm:pl-0">
                      {!fixedDomain && <QuietChip>{t.domain}</QuietChip>}
                      {showType && <QuietChip>{t.type}</QuietChip>}
                      {info ? (
                        <span
                          className={`tabular inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-danger ${
                            info.urgency === "overdue" ? "font-semibold" : ""
                          }`}
                        >
                          <Calendar size={15} aria-hidden="true" />
                          {info.label}
                        </span>
                      ) : (
                        <span className="text-sm text-faint">no date</span>
                      )}
                      {isAppointment(t) && <GoogleLink task={t} label={info!.label} accent={accent} inline />}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Disclosure
          variant="add"
          accent={accent}
          summary="Add task"
          openSummary="Cancel"
          anchors={addInputId ? [addInputId] : undefined}
          className="mt-2"
        >
          <TaskForm today={today} fixedDomain={fixedDomain} accent={accent} inputId={addInputId} autoFocus />
        </Disclosure>
        {!shared && error && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div aria-busy={isPending}>
      {!shared && error && (
        <p role="alert" className="mb-2 text-xs text-danger">
          {error}
        </p>
      )}
      <Table columns={columns} frameless={frameless} rows={rows} empty="nothing due this week — enjoy the quiet">
        {tableRows}
      </Table>

      {/* Editing behind intent: the page's default state is reading, and this
          form used to be four controls sitting open under every list. It is the
          same `TaskForm` the Quick add menu renders — one implementation. */}
      <Disclosure
        variant="add"
        accent={accent}
        summary="Add task or appointment"
        openSummary="Cancel"
        anchors={addInputId ? [addInputId] : undefined}
        className="mt-3"
      >
        <TaskForm
          today={today}
          fixedDomain={fixedDomain}
          accent={accent}
          inputId={addInputId}
          autoFocus
        />
      </Disclosure>
    </div>
  );
}

/**
 * The hand-off (decision #27): Google's own form, prefilled, which you press
 * Save on. The app never writes to Google, so Google still creates and owns
 * every event — decision #1 intact.
 *
 * One hour is a default, not a claim: the form never asks for an end time, and
 * saying so in the tooltip is cheaper than a control nobody wants.
 *
 * Sits under the date rather than beside it — in a half-width tile the two side
 * by side squeezed every task title into a two-line wrap, and stacked it costs
 * the column no width at all.
 */
/** A metadata chip that stays out of the title's way: one muted tint, no domain hue. */
function QuietChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded bg-(--color-slate)/22 px-2 py-0.5 text-[0.8125rem] capitalize leading-5 text-muted">
      {children}
    </span>
  );
}

function GoogleLink({
  task,
  label,
  accent,
  inline = false,
}: {
  task: Task & { due: string };
  label: string;
  accent: Accent;
  /** Sits beside the date in the list layout, under it in the table. */
  inline?: boolean;
}) {
  return (
    <a
      href={googleEventUrl({
        title: task.title,
        start: task.due,
        location: task.notes ?? undefined,
        details: PROVENANCE,
      })}
      target="_blank"
      rel="noopener noreferrer"
      title={`Opens Google Calendar with “${task.title}” prefilled for ${label} as a one-hour block${
        task.notes ? `, at ${task.notes}` : ""
      }. Pick the calendar you want, then Save — Google creates the event.`}
      className={`${inline ? "text-sm" : "mt-1 block"} whitespace-nowrap text-muted transition-colors ${accentHoverText[accent]}`}
    >
      calendar ↗
    </a>
  );
}
