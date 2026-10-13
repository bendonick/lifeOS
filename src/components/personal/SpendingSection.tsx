import { BudgetProposalPanel } from "@/components/personal/BudgetProposalPanel";
import { BudgetTable } from "@/components/personal/BudgetTable";
import { CategoryAverages } from "@/components/personal/CategoryAverages";
import { CategoryBreakdown, type BaselineConfig } from "@/components/personal/CategoryBreakdown";
import { ImportPanel } from "@/components/personal/ImportPanel";
import { MerchantsPanel } from "@/components/personal/MerchantsPanel";
import { MonthCard } from "@/components/personal/MonthCard";
import { SpendingDetails } from "@/components/personal/SpendingDetails";
import { SpendingHistory } from "@/components/personal/SpendingHistory";
import { TxnQuickAdd } from "@/components/personal/TxnQuickAdd";
import { dayLabel } from "@/lib/dates";
import { getConfigJSON } from "@/lib/db/config";
import {
  budgetOverview,
  groupedCategories,
  merchantGroups,
  monthlySpendHistory,
  variableCategorySpend,
} from "@/lib/db/money";
import { spendingInsights } from "@/lib/money/insights";
import { proposeBudget } from "@/lib/money/propose";
import { budgetStartDate } from "@/lib/money/window";

/**
 * Server half of the Spending section (decision #81: this month first, history
 * second).
 *
 *   1. **This month, always visible** — what is available, what has gone of
 *      the variable budget, the overall budget, the insights with something to
 *      say; and beside it what a month usually costs by category, labelled as
 *      history so it cannot be read as this month.
 *   2. **Behind one deliberate click**, in a row at the foot — the budget lines
 *      with this month's category spend and the proposal; the year of monthly
 *      bars with the budget's start date stated beside it; the bookkeeping
 *      (quick-add, CSV import, the merchant queue).
 *
 * Nothing was removed and no figure was redefined: the same functions feed the
 * same numbers, in a different order of prominence.
 */
export function SpendingSection({ today }: { today: string }) {
  const overview = budgetOverview();
  const merchants = merchantGroups();
  const categories = groupedCategories();
  const baseline = getConfigJSON<BaselineConfig | null>("budget.baseline", null);
  const categorySpend = variableCategorySpend(overview.month);
  // Composed here, in the server half, so the card stays a renderer and the
  // insight rules stay in one pure module (src/lib/money/insights.ts).
  const insights = spendingInsights({
    prospective: overview.prospective,
    dayOfMonth: overview.dayOfMonth,
    daysInMonth: overview.daysInMonth,
    variable: overview.variable,
    lines: overview.lines,
    categories: categorySpend,
    baseline,
  });

  const toReview = merchants.filter((m) => !m.category).length;
  const proposal = proposeBudget();
  const tierCounts = (["fixed", "variable", "annual"] as const)
    .map((t) => ({ t, n: overview.lines.filter((l) => l.tier === t).length }))
    .filter((x) => x.n > 0);
  const history = monthlySpendHistory();
  const startDate = budgetStartDate();

  return (
    <div className="flex flex-col gap-6">
      {/* 3:2, not 2:1: a third of the tile left the average bars narrower than
          the labels beside them. */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 lg:border-r lg:border-border lg:pr-6">
          <MonthCard o={overview} insights={insights} />
        </div>
        <div className="lg:col-span-2">
          <CategoryAverages baseline={baseline} />
        </div>
      </div>

      <SpendingDetails
        panels={[
          {
            key: "budget",
            summary: "Budget details",
            openSummary: "Hide budget details",
            detail: tierCounts.map((x) => `${x.n} ${x.t}`).join(" · "),
            children: (
              <div className="flex flex-col gap-6">
                <BudgetTable o={overview} categorySpend={categorySpend} />
                <CategoryBreakdown spend={categorySpend} baseline={baseline} />
                {proposal.proposals.length > 0 && <BudgetProposalPanel proposal={proposal} />}
              </div>
            ),
          },
          {
            key: "history",
            summary: "Spending history",
            openSummary: "Hide history",
            anchors: ["spending-history"],
            children: (
              <div id="spending-history" className="scroll-mt-24">
                {history.length < 2 ? (
                  <p className="text-sm text-muted">Not enough months imported for a history yet.</p>
                ) : (
                  <SpendingHistory months={history} startDate={startDate} showStartLabel={false} />
                )}
                <p className="tabular mt-2 text-xs text-faint">
                  Budget starts {dayLabel(startDate)} · months before it are history and sit outside every
                  budget figure above
                </p>
              </div>
            ),
          },
          {
            key: "merchants",
            summary: toReview > 0 ? `Review ${toReview} merchants` : "Manage transactions",
            openSummary: "Hide transaction tools",
            anchors: ["uncategorised", "new-expense"],
            children: (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                  <TxnQuickAdd categories={categories} today={today} inputId="new-expense" />
                  <ImportPanel />
                </div>
                <MerchantsPanel merchants={merchants} categories={categories} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
