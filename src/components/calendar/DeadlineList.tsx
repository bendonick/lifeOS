import { accentText, urgencyText } from "@/components/ui/accents";
import { dueInWeek, overdueBefore, type Deadline } from "@/lib/calendar/deadlines";
import { dayLabel, daysLeftLabel, dueInfo } from "@/lib/dates";

/**
 * The deadline list under the week grid (decision #73): one bullet per item,
 * overdue first. This is where urgency lives — the chips in the due strip
 * carry only a title and a course, by the user's call, so the days-left
 * figure and its warm colour appear exactly once, here, on the same
 * `dueInfo` / `urgencyText` pair the Academic tables use.
 *
 * It follows the grid's visible week: paging the grid pages this list.
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
  const overdue = overdueBefore(items, today);
  const week = dueInWeek(items, monday).filter((d) => d.due.slice(0, 10) >= today);
  const rows = [...overdue, ...week];

  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-muted">Nothing due this week.</p>;
  }

  return (
    // Same cap as the upcoming-events list: at full page width a title and its
    // date sit 900px apart and read as two unrelated things.
    <ul className="mt-4 flex max-w-3xl flex-col divide-y divide-border border-y border-border">
      {rows.map((d) => (
        <Row key={d.id} item={d} />
      ))}
    </ul>
  );
}

function Row({ item }: { item: Deadline }) {
  const { urgency } = dueInfo(item.due);
  const date = item.due.slice(0, 10);
  const time = item.due.length > 10 ? ` ${item.due.slice(11, 16)}` : "";
  return (
    <li className="flex items-baseline gap-3 py-2">
      <span
        aria-hidden="true"
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current ${
          urgency === "overdue" ? accentText.danger : accentText.hub
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{item.title}</span>
        {item.context && <span className="block truncate text-xs text-faint">{item.context}</span>}
      </span>
      <span className="tabular shrink-0 text-xs text-muted whitespace-nowrap">
        {dayLabel(date)}
        {time}
        <span className={urgencyText[urgency]}> · {daysLeftLabel(item.due)}</span>
      </span>
    </li>
  );
}
