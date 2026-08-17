import { db } from "@/lib/db";
import { daysInMonth } from "@/lib/dates";
import { fullHistory } from "@/lib/money/window";

// The money map (Stage 6): where a period's outflow actually went, as a Sankey.
//
// Origin roots theirs at income. This one is rooted at **outflow**, because this
// account has no income to root at — every credit in the history is a transfer
// the user made to himself from another account, and drawing those as "income"
// would state something false in the most legible way available. Total spending
// is the honest source node.
//
// Depth: outflow → tier → budget line → category, with the last hop drawn only
// where a line owns more than one category. Rent's single category would
// otherwise render as a ribbon splitting into an identical ribbon.
//
// Uncategorised spend gets its own branch off the root rather than being
// dropped. It is real money — leaving it out would make the map's total
// disagree with every other total on the page, and quietly flatter the budget.

export interface FlowNode {
  name: string;
  depth: number; // 0 root · 1 tier · 2 line · 3 category
  tier: "fixed" | "variable" | "annual" | "none";
  value: number;
}

export interface FlowLink {
  source: number;
  target: number;
  value: number;
}

export interface MoneyFlow {
  from: string;
  to: string;
  total: number;
  nodes: FlowNode[];
  links: FlowLink[];
}

const TIERS = [
  ["fixed", "Fixed"],
  ["variable", "Variable"],
  ["annual", "Annual"],
] as const;

/** Net spend per (line, category) in a date range. Transfers and income resolve
 *  to no budget line and so cannot reach this — the same rule the budget uses. */
interface Row {
  tier: "fixed" | "variable" | "annual";
  line: string;
  category: string;
  spent: number;
}

export function moneyFlow(from: string, to: string): MoneyFlow {
  void fullHistory(); // the map's whole job is the year before the budget starts

  const rows = (
    db
      .prepare(
        `SELECT b.tier AS tier, b.name AS line, t.category AS category,
                ROUND(SUM(-t.amount_chf), 2) AS spent
         FROM transactions t
         JOIN category_map m ON m.category = t.category
         JOIN budget_lines b ON b.id = m.budget_line_id
         WHERE t.date >= ? AND t.date <= ?
         GROUP BY b.tier, b.name, t.category
         HAVING spent > 0
         ORDER BY spent DESC`
      )
      .all(from, to) as Row[]
  ).filter((r) => r.spent > 0);

  const uncategorised = (
    db
      .prepare(
        `SELECT COALESCE(ROUND(SUM(-amount_chf), 2), 0) AS spent
         FROM transactions
         WHERE date >= ? AND date <= ? AND category IS NULL`
      )
      .get(from, to) as { spent: number }
  ).spent;

  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];
  const index = new Map<string, number>();

  const node = (key: string, name: string, depth: number, tier: FlowNode["tier"]): number => {
    const existing = index.get(key);
    if (existing !== undefined) return existing;
    const id = nodes.length;
    nodes.push({ name, depth, tier, value: 0 });
    index.set(key, id);
    return id;
  };

  const link = (source: number, target: number, value: number) => {
    if (value <= 0) return;
    links.push({ source, target, value });
    nodes[target].value += value;
  };

  const root = node("root", "All spending", 0, "none");

  // How many categories each line actually has spend in, this period — the test
  // for whether the category hop is worth drawing.
  const categoriesPerLine = new Map<string, number>();
  for (const r of rows) {
    categoriesPerLine.set(r.line, (categoriesPerLine.get(r.line) ?? 0) + 1);
  }

  for (const [tier, tierLabel] of TIERS) {
    const tierRows = rows.filter((r) => r.tier === tier);
    if (tierRows.length === 0) continue;
    const tierTotal = tierRows.reduce((s, r) => s + r.spent, 0);
    const tierId = node(`tier:${tier}`, tierLabel, 1, tier);
    link(root, tierId, tierTotal);

    const lineNames = [...new Set(tierRows.map((r) => r.line))];
    for (const lineName of lineNames) {
      const lineRows = tierRows.filter((r) => r.line === lineName);
      const lineTotal = lineRows.reduce((s, r) => s + r.spent, 0);
      const lineId = node(`line:${lineName}`, lineName, 2, tier);
      link(tierId, lineId, lineTotal);

      if ((categoriesPerLine.get(lineName) ?? 0) < 2) continue;
      for (const r of lineRows) {
        link(lineId, node(`cat:${lineName}:${r.category}`, r.category, 3, tier), r.spent);
      }
    }
  }

  if (uncategorised > 0) {
    link(root, node("uncategorised", "Uncategorised", 1, "none"), uncategorised);
  }

  nodes[root].value = links.filter((l) => l.source === root).reduce((s, l) => s + l.value, 0);

  return { from, to, total: nodes[root].value, nodes, links };
}

/** The default window: the trailing 12 months ending today. Until the budget
 *  starts there is no budget month to draw, so history is what's real. */
export function trailingYear(today: string): { from: string; to: string } {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const fromYear = month === 12 ? year : year - 1;
  const fromMonth = month === 12 ? 1 : month + 1;
  return { from: `${fromYear}-${String(fromMonth).padStart(2, "0")}-01`, to: today };
}

/** A single calendar month, whole. */
export function monthWindow(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${month}-${daysInMonth(month)}` };
}
