import { BudgetTable } from "@/components/personal/BudgetTable";
import { CategoryBreakdown, type BaselineConfig } from "@/components/personal/CategoryBreakdown";
import { ImportPanel } from "@/components/personal/ImportPanel";
import { SpendGauge } from "@/components/personal/SpendGauge";
import { SpendingCard } from "@/components/personal/SpendingCard";
import { SpendingHistory } from "@/components/personal/SpendingHistory";
import { TxnQuickAdd } from "@/components/personal/TxnQuickAdd";
import { UncategorisedQueue } from "@/components/personal/UncategorisedQueue";
import { getConfigJSON } from "@/lib/db/config";
import {
  budgetOverview,
  groupedCategories,
  monthlySpendHistory,
  uncategorisedGroups,
  variableCategorySpend,
} from "@/lib/db/money";
import { budgetStartDate } from "@/lib/money/window";

// Server half of the Spending section (§6): dashboard row (card · left-to-spend
// gauge · category breakdown vs baseline) → budget rows → quick add + import →
// review queue → full-history chart. Reads via the db modules; the client
// components mutate through /api/money/* and router.refresh().

export function SpendingSection({ today }: { today: string }) {
  const overview = budgetOverview();
  const groups = uncategorisedGroups();
  const categories = groupedCategories();
  const baseline = getConfigJSON<BaselineConfig | null>("budget.baseline", null);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <SpendingCard o={overview} />
        <SpendGauge o={overview} />
        <CategoryBreakdown spend={variableCategorySpend(overview.month)} baseline={baseline} />
      </div>
      <BudgetTable o={overview} />
      <TxnQuickAdd categories={categories} today={today} />
      <ImportPanel />
      {groups.length > 0 && <UncategorisedQueue groups={groups} categories={categories} />}
      <SpendingHistory months={monthlySpendHistory()} startDate={budgetStartDate()} />
    </div>
  );
}
