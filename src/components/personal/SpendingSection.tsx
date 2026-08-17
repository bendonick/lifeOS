import { BudgetProposalPanel } from "@/components/personal/BudgetProposalPanel";
import { BudgetTable } from "@/components/personal/BudgetTable";
import { CategoryBreakdown, type BaselineConfig } from "@/components/personal/CategoryBreakdown";
import { ImportPanel } from "@/components/personal/ImportPanel";
import { ManagePanel } from "@/components/personal/ManagePanel";
import { MerchantsPanel } from "@/components/personal/MerchantsPanel";
import { MonthCard } from "@/components/personal/MonthCard";
import { SpendingHistory } from "@/components/personal/SpendingHistory";
import { TxnQuickAdd } from "@/components/personal/TxnQuickAdd";
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

// Server half of the Spending section. The order is the order the questions get
// asked: how is the month going (hero, and what needs attention) → where is it
// going (categories) → what was the plan (budget) → is the plan right (propose)
// → how does this month compare (history) → and, last and folded away, the
// bookkeeping.
//
// The section used to lead with two cards stating the same number and put a
// 122-row merchant queue in the middle of the daily read; the money map that
// closed it was cut as not insightful (decision #46).
//
// Reads via the db modules; the client components mutate through /api/money/*
// and router.refresh().

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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <MonthCard o={overview} insights={insights} />
        <CategoryBreakdown spend={categorySpend} baseline={baseline} />
      </div>
      <BudgetTable o={overview} />
      <BudgetProposalPanel proposal={proposeBudget()} />
      <SpendingHistory months={monthlySpendHistory()} startDate={budgetStartDate()} />
      <ManagePanel pendingLabel={toReview > 0 ? `${toReview} merchants to review` : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
          <TxnQuickAdd categories={categories} today={today} />
          <ImportPanel />
        </div>
        <MerchantsPanel merchants={merchants} categories={categories} />
      </ManagePanel>
    </div>
  );
}
