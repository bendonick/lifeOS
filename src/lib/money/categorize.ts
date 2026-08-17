import { getConfigJSON, setConfig } from "@/lib/db/config";

// Merchant→category rules live in config under budget.rules as an ordered
// array — first match wins, case-insensitive substring on the merchant
// (decision #22). The user retrains the importer by editing config or via the
// uncategorised queue's "always categorise" — never by changing code.
// LLM categorisation is Stage 6.

export interface Rule {
  match: string;
  category: string;
}

export function loadRules(): Rule[] {
  return getConfigJSON<Rule[]>("budget.rules", []);
}

export function categorize(merchant: string, rules: Rule[]): string | null {
  const m = merchant.toLowerCase();
  for (const rule of rules) {
    if (m.includes(rule.match.toLowerCase())) return rule.category;
  }
  return null;
}

/**
 * Save a rule from the queue's "always categorise <merchant> as <category>".
 * Returns whether the rules list actually changed.
 *
 * Three behaviours, each fixing a way the old `appendRule` lost a correction —
 * all of them consequences of `categorize()` being first-match-wins:
 *
 * 1. **Upsert, don't append.** Re-categorising a merchant used to leave the old
 *    rule in front of the new one, so the UI showed the fix and the next import
 *    quietly undid it. Updating in place keeps one rule per merchant, and
 *    preserves its position — resolution order is meaningful, and re-ranking a
 *    rule as a side effect of editing it is its own bug.
 *
 * 2. **A new merchant rule goes to the front.** A hand-written pattern in config
 *    is broad (`spar `, `coop`); a rule derived from a full merchant name is as
 *    specific as rules get. Appending it behind a broader pattern would mean the
 *    broad rule keeps winning and the correction never takes effect on import.
 *    Most specific first is the only ordering that makes a correction stick.
 *
 * 3. **Skip a rule the existing ones already imply.** With 111 of 122 merchants
 *    seen exactly once, saving a rule per merchant would bury 46 curated
 *    patterns under a hundred that can never fire again. If the current rules
 *    already resolve this merchant to this category, there is nothing to add.
 */
export function upsertRule(match: string, category: string): boolean {
  const rules = loadRules();
  const at = rules.findIndex((r) => r.match.toLowerCase() === match.toLowerCase());
  if (at >= 0) {
    if (rules[at].category === category) return false;
    rules[at] = { match: rules[at].match, category };
  } else if (categorize(match, rules) === category) {
    return false;
  } else {
    rules.unshift({ match, category });
  }
  setConfig("budget.rules", JSON.stringify(rules));
  return true;
}
