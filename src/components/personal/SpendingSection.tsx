import { BudgetTable } from "@/components/personal/BudgetTable";
import { ImportPanel } from "@/components/personal/ImportPanel";
import { SpendingCard } from "@/components/personal/SpendingCard";
import { SpendingHistory } from "@/components/personal/SpendingHistory";
import { TxnQuickAdd } from "@/components/personal/TxnQuickAdd";
import { UncategorisedQueue } from "@/components/personal/UncategorisedQueue";
import {
  assignableCategories,
  budgetOverview,
  monthlySpendHistory,
  uncategorisedGroups,
} from "@/lib/db/money";
import { budgetStartDate } from "@/lib/money/window";

// Server half of the Spending section (§6): card → budget rows → quick add +
// import → review queue → full-history chart. Reads via the db modules; the
// client components mutate through /api/money/* and router.refresh().

export function SpendingSection({ today }: { today: string }) {
  const overview = budgetOverview();
  const groups = uncategorisedGroups();
  const categories = assignableCategories();

  return (
    <div className="flex flex-col gap-4">
      <SpendingCard o={overview} />
      <BudgetTable o={overview} />
      <TxnQuickAdd categories={categories} today={today} />
      <ImportPanel />
      {groups.length > 0 && <UncategorisedQueue groups={groups} categories={categories} />}
      <SpendingHistory months={monthlySpendHistory()} startDate={budgetStartDate()} />
    </div>
  );
}
