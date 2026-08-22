import { urgencyText } from "@/components/ui/accents";
import { hasMetricsOn } from "@/lib/db/health";
import { budgetOverview, uncategorisedMerchantCount } from "@/lib/db/money";
import type { BillStatus } from "@/lib/db/bills";

/**
 * The two status blocks that used to be a full-width `TodayBand` across the top
 * of the page, dissolved into rail modules at the user's ask.
 *
 * The band's fourth column, *Next up*, is deliberately not here: the Schedule
 * tile is the first thing in the main column and its first row is that same
 * task. Repeating it 200px to the left would be the "To do" beside "To do"
 * collision decision #28's page already made once.
 *
 * Both read their own figures from the same functions the sections below use,
 * so the rail and the tile can never disagree about a number. They are server
 * components — no state, just a read and a render.
 */

const chf = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/**
 * What is asking for something. Warm only when a bill is genuinely late:
 * categorising merchants is housekeeping, and the palette rule is that warm
 * means urgency or it means nothing.
 */
export function AttentionList({
  bills,
  dayOfMonth,
  notesToReview,
}: {
  bills: BillStatus[];
  dayOfMonth: number;
  notesToReview: number;
}) {
  const unpaid = bills.filter((b) => !b.paid);
  const unpaidTotal = unpaid.reduce((s, b) => s + (b.amount_chf ?? 0), 0);
  const anyLate = unpaid.some((b) => dayOfMonth > b.due_day);
  const merchants = uncategorisedMerchantCount();

  const items: { key: string; label: string; href: string; urgent: boolean }[] = [];
  if (unpaid.length > 0) {
    items.push({
      key: "bills",
      label: `${unpaid.length} bill${unpaid.length === 1 ? "" : "s"} unpaid · CHF ${chf.format(unpaidTotal)}`,
      href: "#bills",
      urgent: anyLate,
    });
  }
  if (notesToReview > 0) {
    items.push({
      key: "notes",
      label: `${notesToReview} note${notesToReview === 1 ? "" : "s"} to review`,
      href: "#notes",
      urgent: false,
    });
  }
  if (merchants > 0) {
    items.push({
      key: "merchants",
      label: `${merchants} merchants to categorise`,
      href: "#uncategorised",
      urgent: false,
    });
  }

  if (items.length === 0) return <p className="text-sm text-muted">Nothing outstanding.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {items.map((a) => (
        <li key={a.key}>
          <a
            href={a.href}
            className={`text-sm transition-colors hover:text-text ${
              a.urgent ? urgencyText.overdue : "text-muted"
            }`}
          >
            {a.urgent && (
              <span
                aria-hidden="true"
                className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-danger align-middle"
              />
            )}
            {a.label}
            {a.urgent && <span className="sr-only"> — overdue</span>}
            <span aria-hidden="true" className="text-faint"> →</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Money and health at a glance, kept in view by the sticky rail while you scroll
 * past their sections.
 *
 * No habits row: the Habits tile sits directly beneath this one with a
 * completion ring, and two statements of the same fraction 100px apart is not a
 * summary, it is a duplicate.
 */
export function SignalsList({ today }: { today: string }) {
  const o = budgetOverview();
  const logged = hasMetricsOn(today);

  return (
    <dl className="flex flex-col gap-2">
      <Signal
        label={o.prospective ? "Budget" : "Left to spend"}
        value={`CHF ${chf.format(
          o.prospective ? o.variable.budget : o.variable.budget - o.variable.spent
        )}`}
        note={o.prospective ? "planned" : "this month"}
        href="#spending"
      />
      <Signal
        label="Health"
        value={logged ? "logged" : "—"}
        note={logged ? "today" : "nothing today"}
        href="#health"
      />
    </dl>
  );
}

function Signal({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string;
  note?: string;
  href: string;
}) {
  return (
    <a href={href} className="group flex items-baseline justify-between gap-3 rounded">
      <dt className="text-xs text-muted transition-colors group-hover:text-text">{label}</dt>
      <dd className="tabular t-metric text-sm">
        {value}
        {note && <span className="ml-1 text-xs font-normal text-faint">{note}</span>}
      </dd>
    </a>
  );
}
