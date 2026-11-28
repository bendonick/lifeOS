import type { Viewport } from "next";
import Link from "next/link";
import { BillsAttention } from "@/components/personal/BillsAttention";
import { SpendingSection } from "@/components/personal/SpendingSection";
import { AddMenu } from "@/components/ui/AddMenu";
import { newsreader } from "@/components/ui/fonts";
import { PageMasthead } from "@/components/ui/PageMasthead";
import { RuledSection } from "@/components/ui/RuledSection";
import { SiteNav } from "@/components/ui/SiteNav";
import { billsForMonth } from "@/lib/db/bills";
import { monthOf, zurichToday } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Money" };

export const viewport: Viewport = { themeColor: "#efdfbb", colorScheme: "light" };

/*
 * Money: the detail behind Personal. Personal keeps one high-level check (the
 * month's payments, ticked, with no figures); every amount lives here. Bills
 * first, with their amounts and the outstanding total, then Spending as it
 * stood on Personal: this month, the budget, the history and the bookkeeping
 * (quick-add, CSV import, the merchant queue).
 *
 * The components moved as they were; reworking them is the next step.
 */
export default function MoneyPage() {
  const today = zurichToday();
  const month = monthOf(today);
  const bills = billsForMonth(month);

  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(`${month}-15T12:00:00Z`)
  );
  const monthYear = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-15T12:00:00Z`)
  );

  return (
    <div className={`theme-maritime page-personal ${newsreader.variable} min-h-screen`}>
      <div className="mx-auto max-w-[76rem] px-5 pb-20 sm:px-8">
        <SiteNav current="personal">
          <AddMenu accent="personal" variant="filled" items={[{ label: "Expense", hash: "new-expense" }]} />
        </SiteNav>

        <main>
          <PageMasthead
            eyebrow={
              <Link href="/personal" className="rounded hover:text-text">
                ← Personal
              </Link>
            }
            title="Money"
            subtitle={
              <>
                {monthYear}
                <span className="text-muted"> · bills, budget and spending</span>
              </>
            }
            sections={[
              { id: "bills", label: "Bills" },
              { id: "spending", label: "Spending" },
            ]}
          />

          <RuledSection id="bills" title="Bills" className="min-w-0">
            <BillsAttention bills={bills} month={month} today={today} />
          </RuledSection>

          <RuledSection
            id="spending"
            title="Spending"
            meta={
              <>
                {monthName}
                <span aria-hidden="true"> · </span>
                <a href="#spending-history" className="rounded text-link hover:text-text">
                  History →
                </a>
              </>
            }
          >
            <SpendingSection today={today} />
          </RuledSection>
        </main>
      </div>
    </div>
  );
}
