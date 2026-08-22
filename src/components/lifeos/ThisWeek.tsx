"use client";

import { TaskForm } from "@/components/lifeos/TaskForm";
import { Disclosure } from "@/components/ui/Disclosure";
import { Pill, TypePill } from "@/components/ui/Pill";
import { Table } from "@/components/ui/Table";
import { accentControl, accentHoverText, urgencyText, type Accent } from "@/components/ui/accents";
import { googleEventUrl } from "@/lib/calendar/gcal";
import { addDays, dueInfo } from "@/lib/dates";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
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

export function ThisWeek({
  tasks,
  today,
  fixedDomain,
  accent = "hub",
  showType = true,
  frameless = false,
  rows = "divided",
  addInputId,
}: {
  tasks: Task[];
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
}) {
  const { toggle, valueFor, isPending, error } = useOptimisticToggle<Task>({
    idOf: (t) => t.id,
    labelOf: (t) => t.title,
    send: (t, next) =>
      fetch(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      }),
  });

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


  return (
    <div aria-busy={isPending}>
      {error && (
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
function GoogleLink({ task, label, accent }: { task: Task & { due: string }; label: string; accent: Accent }) {
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
      className={`mt-1 block whitespace-nowrap text-muted transition-colors ${accentHoverText[accent]}`}
    >
      calendar ↗
    </a>
  );
}
