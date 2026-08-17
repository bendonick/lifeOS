import { BudgetProposalPanel } from "@/components/personal/BudgetProposalPanel";
import { BudgetTable } from "@/components/personal/BudgetTable";
import { CategoryBreakdown, type BaselineConfig } from "@/components/personal/CategoryBreakdown";
import { ImportPanel } from "@/components/personal/ImportPanel";
import { MerchantsPanel } from "@/components/personal/MerchantsPanel";
import { MoneyMap } from "@/components/personal/MoneyMap";
import { SpendGauge } from "@/components/personal/SpendGauge";
import { SpendingCard } from "@/components/personal/SpendingCard";
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
import { moneyFlow, trailingYear } from "@/lib/money/flow";
import { spendingInsights } from "@/lib/money/insights";
import { proposeBudget } from "@/lib/money/propose";
import { budgetStartDate } from "@/lib/money/window";

// Server half of the Spending section (§6): dashboard row (card · left-to-spend
// gauge · category breakdown vs baseline) → budget rows → quick add + import →
// merchants (review + correct) → full-history chart. Reads via the db modules;
// the client components mutate through /api/money/* and router.refresh().

export function SpendingSection({ today }: { today: string }) {
  const overview = budgetOverview();
  const merchants = merchantGroups();
  const categories = groupedCategories();
  const baseline = getConfigJSON<BaselineConfig | null>("budget.baseline", null);
  const categorySpend = variableCategorySpend(overview.month);
  const window = trailingYear(today);
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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <SpendingCard o={overview} insights={insights} />
        <SpendGauge o={overview} />
        <CategoryBreakdown spend={categorySpend} baseline={baseline} />
      </div>
      <BudgetTable o={overview} />
      <BudgetProposalPanel proposal={proposeBudget()} />
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <TxnQuickAdd categories={categories} today={today} />
        <ImportPanel />
      </div>
      <MerchantsPanel merchants={merchants} categories={categories} />
      <MoneyMap flow={moneyFlow(window.from, window.to)} label="trailing 12 months" />
      <SpendingHistory months={monthlySpendHistory()} startDate={budgetStartDate()} />
    </div>
  );
}
