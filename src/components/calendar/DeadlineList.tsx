import { dueInWeek, overdueBefore, type Deadline } from "@/lib/calendar/deadlines";
import { addDays, dayLabel, mondayOf, weekLabel } from "@/lib/dates";

/**
 * The deadline strip under the week grid (decisions #73, #94): open, dated work
 * in three labelled groups, each a run of "Wed 25 Nov: Stage 4 (ATAI)".
 *
 * The labels are relative to the week the grid is *showing*, and they move with
 * it: paging the grid pages this strip, label and items together.
 *
 *   Overdue        before today, whatever week is on screen
 *   This week      inside the displayed week, when that is the current week;
 *                  otherwise the displayed week's dates ("23 – 29 Nov 2026")
 *   Next week      the week after the displayed one, when the current week is
 *                  on screen; otherwise "Following week"
 *
 * So with 16–22 Nov on screen, deadlines on 25 and 29 Nov are "Next week"; page
 * forward and the same two sit under "This week"'s dates instead.
 */
export function DeadlineList({
  items,
  monday,
  today,
}: {
  items: Deadline[];
  monday: string;
  today: string;
}) {
  const isCurrent = monday === mondayOf(today);
  const overdue = overdueBefore(items, today);
  const inWeek = dueInWeek(items, monday).filter((d) => d.due.slice(0, 10) >= today);
  const after = dueInWeek(items, addDays(monday, 7)).filter((d) => d.due.slice(0, 10) >= today);

  const groups = [
    { key: "overdue", label: "Overdue", items: overdue, late: true },
    { key: "week", label: isCurrent ? "This week" : weekLabel(monday), items: inWeek, late: false },
    { key: "next", label: isCurrent ? "Next week" : "Following week", items: after, late: false },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <p className="mt-4 text-sm italic text-muted">
        Nothing due {isCurrent ? "this week or next" : "in this week or the one after"}.
      </p>
    );
  }

  return (
    <dl className="mt-4 flex flex-col gap-y-1.5" aria-label="Deadlines around the displayed week">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <dt className="w-32 shrink-0 text-sm italic text-muted">{g.label}</dt>
          <dd className="m-0 min-w-0 flex-1">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {g.items.map((d) => {
                const date = d.due.slice(0, 10);
                const time = d.due.length > 10 ? ` ${d.due.slice(11, 16)}` : "";
                return (
                  <li key={d.id} className="text-sm">
                    <span className={`tabular text-danger ${g.late ? "font-semibold" : ""}`}>
                      {dayLabel(date)}
                      {time}:
                    </span>{" "}
                    <span className="text-text">{d.title}</span>
                    {d.context && <span className="text-muted"> ({d.context})</span>}
                  </li>
                );
              })}
            </ul>
          </dd>
        </div>
      ))}
    </dl>
  );
}
