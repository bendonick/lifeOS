# Page — Money (`/personal/money`)

The detail behind Personal's Money module (decisions #110–#118). **Being rebuilt one module at a
time (2026-11-28); this doc describes what exists.** Maritime light theme (`.theme-maritime` +
`.page-personal`), `SiteNav` on Personal, the masthead label **← Personal** links back.

The page keeps its text to what is needed (#118): a section shows its totals and its rows, with
no counts, status lines, meta beside the title or hints.

Top to bottom:

1. **Navigation** — `+ Add` offers Payment `#new-payment` · Subscription `#new-subscription` ·
   Expense `#new-expense`.
2. **Masthead** — "← Personal", "Money", "{Month Year} · payments and spending", section links
   Monthly payments · Subscriptions · Details.
3. **Monthly payments** (`PaymentsLedger`) — the core payments (`bills.kind = 'core'`) for the
   current month (`billsForMonth`). Above the list, the monthly total ("CHF X a month"), the tag
   row and Sort. Columns from `sm`:
   - **Payment** — a bar: the name is the tick (outlined until paid, then a light rust ground,
     a rust edge and a check), and at the bar's right end, behind a divider, a chevron that opens
     the payment's **Details**: a note (`PaymentNote`), saved on blur or Cmd/Ctrl+Enter, cleared
     by emptying it. A rust dot on the chevron marks a note while the row is closed. Rows are
     closed at rest; several can be open.
   - **Tags** — one pill per tag; the column appears once any payment has a tag.
   - **Due** — this month's date (a due day past the month's end falls on its last day).
   - **Amount** — whole francs as "CHF 100", cents as "CHF 12.90", a dash when unset.
   - **Status** — Paid, Overdue, Missed last month (red; the previous tracked month rolled
     over unpaid and the payment existed then), Due today, or "In N days".
   - **Pencil** — the row becomes `PaymentForm`: name, due day, amount in francs, tags, Save,
     Cancel, Remove payment (asks once; `active = 0`, the paid log stays).

   **Add payment** under the list (or `+ Add → Payment`) opens the same form empty and creates a
   core payment. Below `sm` a row is two lines: the bar and the pencil, then due · amount · tags ·
   status.
4. **Subscriptions** (`SubscriptionsList`) — the payments that bill themselves
   (`bills.kind = 'subscription'`), so there is no tick. Every amount and sum is in **US dollars**
   (#116). Above the list, "USD X a month · USD Y a year", the tag row and Sort (Date, Amount,
   Name). Columns from `sm`: **Subscription** (a bar with a repeat mark; the whole bar opens its
   Details note, as above) · **Tags** · **Bills on** (this month's date; full ink while still to
   come, muted once billed) · **Amount** ("USD 20") · pencil.

   The pencil opens `PaymentForm` with a USD amount, tags, **Cancel subscription** and Remove.
   Cancel asks for the day it was cancelled (today by default, never later) and moves it to
   **Cancelled** (#117). Remove takes it off every list. **Add subscription** (or
   `+ Add → Subscription`) creates one.

   **Cancelled**, right under Add subscription and closed at rest, lists the subscriptions
   cancelled in the last six months, latest first: the name struck through, tags, "Cancelled
   15 Oct", the amount, and a restore arrow that puts it back in the list. Six months after its
   cancel date a subscription leaves this list. Nothing shows when none was cancelled.
5. **Details** — one `Disclosure`, closed at rest, holding `SpendingSection` as it stood on
   Personal (this month, budget details, history, transaction tools) until each part is rebuilt.
   `#new-expense`, `#spending-history` and `#uncategorised` open it.

**Tags** (#114) work the same in both lists. A payment takes up to 8 tags of up to 24 characters,
typed in the editor (Enter or comma adds one, Backspace takes the last off), with the tags in use
and six starters offered (Housing, Insurance, Transport, Food, Entertainment, Utility); a tag
typed with another tag's spelling takes the existing one. The tag row above a list is a filter:
"All · N", then each tag with its count. Pick any number; a row shows when it carries any picked
tag, and with none picked every row shows. While tags are picked, a line under the controls gives
what is shown and its monthly sum, with "Show all". Tags filter, never group, so nothing is
counted twice. Until a payment has a tag the row is empty.

## Data touched

`bills` (name, due_day, amount_chf, active, created_month, note, kind, tags, cancelled_on),
`bill_payments`, and through Details everything `SpendingSection` reads and writes.
`amount_chf` holds francs for a core payment and US dollars for a subscription.

API: `POST /api/bills` (`{ name, due_day, amount_chf?, kind?, tags? }`), `PATCH /api/bills/[id]`
with `{ name, due_day, amount_chf?, tags? }`, `{ note }`, `{ month, paid }` or
`{ cancelled_on }` (a date, or `null` to restore; refused for a core payment or a future date),
`DELETE /api/bills/[id]`.
