import type { Viewport } from "next";
import Link from "next/link";
import { PaymentsLedger } from "@/components/personal/PaymentsLedger";
import { SpendingSection } from "@/components/personal/SpendingSection";
import { SubscriptionsList } from "@/components/personal/SubscriptionsList";
import { AddMenu } from "@/components/ui/AddMenu";
import { Disclosure } from "@/components/ui/Disclosure";
import { newsreader } from "@/components/ui/fonts";
import { PageMasthead } from "@/components/ui/PageMasthead";
import { RuledSection } from "@/components/ui/RuledSection";
import { SiteNav } from "@/components/ui/SiteNav";
import { billsForMonth, cancelledSubscriptions } from "@/lib/db/bills";
import { monthOf, zurichToday } from "@/lib/dates";
import { tagSuggestions } from "@/lib/personal/payments";

export const dynamic = "force-dynamic";
export const metadata = { title: "Money" };

export const viewport: Viewport = { themeColor: "#efdfbb", colorScheme: "light" };

/*
 * Money: the detail behind Personal, rebuilt one module at a time. Personal
 * keeps one high-level check (the month's payments, ticked, with no figures);
 * the figures live here.
 *
 *   1. **Monthly payments** (`PaymentsLedger`): the same checklist with tags,
 *      due date, amount and status in columns. Core payments only: the ones
 *      you pay and tick.
 *   2. **Subscriptions** (`SubscriptionsList`): the payments that bill
 *      themselves, with no tick, the day each bills, in US dollars, what they
 *      cost a month and a year, and the ones cancelled in the last six months.
 *   3. **Details**, closed at rest: spending, budget, history and the
 *      transaction tools, as they stood on Personal, until each is rebuilt as
 *      a module of its own. `+ Add → Expense` and the "History" anchor still
 *      land inside it (`Disclosure.anchors`).
 */
export default function MoneyPage() {
  const today = zurichToday();
  const month = monthOf(today);
  const all = billsForMonth(month);
  const bills = all.filter((b) => b.kind === "core");
  const subscriptions = all.filter((b) => b.kind === "subscription");
  const cancelled = cancelledSubscriptions(today);
  // One tag vocabulary across both lists.
  const suggestions = tagSuggestions(all);

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
          <AddMenu
            accent="personal"
            variant="filled"
            items={[
              { label: "Payment", hash: "new-payment" },
              { label: "Subscription", hash: "new-subscription" },
              { label: "Expense", hash: "new-expense" },
            ]}
          />
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
                <span className="text-muted"> · payments and spending</span>
              </>
            }
            sections={[
              { id: "payments", label: "Monthly payments" },
              { id: "subscriptions", label: "Subscriptions" },
              { id: "details", label: "Details" },
            ]}
          />

          <RuledSection id="payments" title="Monthly payments" meta={monthName}>
            <PaymentsLedger bills={bills} month={month} today={today} tagSuggestions={suggestions} />
          </RuledSection>

          <RuledSection id="subscriptions" title="Subscriptions" meta="billed automatically">
            <SubscriptionsList
              subscriptions={subscriptions}
              cancelled={cancelled}
              month={month}
              today={today}
              tagSuggestions={suggestions}
            />
          </RuledSection>

          <section id="details" aria-label="Details" className="scroll-mt-24 border-b border-border py-4">
            <Disclosure
              summary="Details"
              openSummary="Hide details"
              detail="spending, budget, history and transactions"
              anchors={["new-expense", "spending-history", "uncategorised"]}
            >
              <div className="pt-4">
                <SpendingSection today={today} />
              </div>
            </Disclosure>
          </section>
        </main>
      </div>
    </div>
  );
}
