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

/** Append a rule (from the queue's "always categorise <merchant> as <category>"). */
export function appendRule(match: string, category: string) {
  const rules = loadRules();
  rules.push({ match, category });
  setConfig("budget.rules", JSON.stringify(rules));
}
