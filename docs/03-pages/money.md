# Page — Money (`/personal/money`)

The detail behind Personal's Money module (decisions #110–#113). **Being rebuilt one module at a
time (2026-11-28); this doc describes what exists.** Maritime light theme (`.theme-maritime` +
`.page-personal`), `SiteNav` on Personal, the masthead label **← Personal** links back.

Top to bottom:

1. **Navigation** — `+ Add` offers Payment `#new-payment` · Expense `#new-expense`.
2. **Masthead** — "← Personal", "Money", "{Month Year} · payments and spending", section links
   Monthly payments · Details.
3. **Monthly payments** (`PaymentsLedger`) — `bills`/`bill_payments` for the current month
   (`billsForMonth`). "N of M paid", then "CHF X still to pay · CHF Y a month". Columns from `sm`:
   - **Payment** — a bar: the name is the tick (outlined until paid, then a light rust ground,
     a rust edge and a check), and at the bar's right end, behind a divider, a chevron that opens
     the payment's **Details**: a note (`PaymentNote`), saved on blur or Cmd/Ctrl+Enter, cleared
     by emptying it. A rust dot on the chevron marks a note while the row is closed. Rows are
     closed at rest; several can be open.
   - **Due** — this month's date (a due day past the month's end falls on its last day).
   - **Amount** — whole francs as "CHF 70", cents as "CHF 12.90", a dash when unset.
   - **Status** — Paid, Overdue, Missed last month (red; the previous tracked month rolled
     over unpaid and the payment existed then), Due today, or "In N days".
   - **Pencil** — the row becomes `PaymentForm` with its amount field: name, due day, amount,
     Save, Cancel, Remove payment (asks once; `active = 0`, the paid log stays).

   **Add payment** under the list (or `+ Add → Payment`) opens the same form empty. Below `sm` a
   row is two lines: the bar and the pencil, then due · amount · status.
4. **Details** — one `Disclosure`, closed at rest, holding `SpendingSection` as it stood on
   Personal (this month, budget details, history, transaction tools) until each part is rebuilt.
   `#new-expense`, `#spending-history` and `#uncategorised` open it.

## Data touched

`bills` (name, due_day, amount_chf, active, created_month, note), `bill_payments`, and through
Details everything `SpendingSection` reads and writes.
