import { BudgetProposalPanel } from "@/components/personal/BudgetProposalPanel";
import { BudgetTable } from "@/components/personal/BudgetTable";
import { CategoryBreakdown, type BaselineConfig } from "@/components/personal/CategoryBreakdown";
import { ImportPanel } from "@/components/personal/ImportPanel";
import { MerchantsPanel } from "@/components/personal/MerchantsPanel";
import { MonthCard } from "@/components/personal/MonthCard";
import { SpendingHistory } from "@/components/personal/SpendingHistory";
import { TxnQuickAdd } from "@/components/personal/TxnQuickAdd";
import { Disclosure } from "@/components/ui/Disclosure";
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
 * Server half of the Spending section.
 *
 * Three levels, in the order the questions get asked:
 *
 *   1. **Status, always visible** — the headline, its pace, the insights that
 *      have something to say, and where the money is going by category.
 *   2. **Context, always visible** — a year of monthly bars, which is what
 *      answers "is this month unusual" before any figure does.
 *   3. **Detail, one deliberate click** — the fourteen budget lines, the
 *      history-derived proposal, and the bookkeeping (quick-add, CSV import,
 *      the 120-merchant queue).
 *
 * Level 3 used to be level 1. The section rendered four bordered containers
 * inside a bordered tile and every budget row at once, so the number the user
 * actually opens the page for — what is left — competed with a fourteen-row
 * table for the same attention. Nothing was removed; the table is one click
 * away and says how many lines it holds while shut.
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

  return (
    <div className="flex flex-col gap-6">
      {/* 1 — status. The hero and the category split, side by side, separated by
          a rule rather than by two more boxes. */}
      {/* 3:2, not 2:1. Inside the rail grid the tile is ~776px, and a third of
          that left the category bars ~100px of track — narrower than the labels
          beside them. */}
      <div className="grid gap-6 lg:grid-cols-5">
        <MonthCard o={overview} insights={insights} />
        <CategoryBreakdown spend={categorySpend} baseline={baseline} />
      </div>

      {/* 2 — context. */}
      <SpendingHistory months={monthlySpendHistory()} startDate={budgetStartDate()} />

      {/* 3 — detail, stacked so each opens at full width. Every collapsed
          summary carries the one fact worth knowing while it is shut. */}
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <Disclosure
          summary="Budget lines"
          openSummary="Hide budget lines"
          detail={tierCounts.map((x) => `${x.n} ${x.t}`).join(" · ")}
        >
          <BudgetTable o={overview} categorySpend={categorySpend} />
        </Disclosure>

        {proposal.proposals.length > 0 && (
          <Disclosure
            summary="Propose from history"
            openSummary="Hide proposal"
            detail={`${proposal.months.length} complete months`}
          >
            <BudgetProposalPanel proposal={proposal} />
          </Disclosure>
        )}

        <Disclosure
          summary="Manage transactions"
          openSummary="Hide transaction tools"
          detail={toReview > 0 ? `${toReview} merchants to review` : undefined}
          anchors={["uncategorised", "new-expense"]}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
              <TxnQuickAdd categories={categories} today={today} inputId="new-expense" />
              <ImportPanel />
            </div>
            <MerchantsPanel merchants={merchants} categories={categories} />
          </div>
        </Disclosure>
      </div>
    </div>
  );
}
