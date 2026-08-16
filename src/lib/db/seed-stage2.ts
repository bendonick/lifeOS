import type Database from "better-sqlite3";

// Stage 2 seeds (docs/06-stage2-brief.md §2, §5c, §7). Same contract as seed()
// in index.ts: only runs against empty tables / missing keys — never overwrites
// user edits. Called inside the same BEGIN IMMEDIATE transaction.

// Every amount starts at 0: the owner enters their own in the app.
const BUDGET_LINES: Array<
  [name: string, tier: "fixed" | "variable" | "annual", amount: number, carryover: number, notes: string]
> = [
  // Fixed (monthly)
  ["Rent", "fixed", 0, 0, "Standing order"],
  ["Health insurance", "fixed", 0, 0, "Monthly premium"],
  ["Phone", "fixed", 0, 0, "Mobile plan"],
  ["Transit pass, city zones", "fixed", 0, 0, "Monthly pass"],
  ["House cleaning", "fixed", 0, 0, "Monthly"],
  // Variable (monthly)
  ["Food & drink", "variable", 0, 0, "Groceries, restaurants and bars"],
  ["Additional expenses", "variable", 0, 1, "Travel, social, clothes, supplements — spiky by nature"],
  ["Buffer / cushion", "variable", 0, 1, "Untouchable reserve; not for planned spending"],
  // Annual (amount is PER YEAR)
  ["University fees", "annual", 0, 0, "Per semester"],
  ["Electricity", "annual", 0, 0, "Billed quarterly"],
  ["Radio/TV licence", "annual", 0, 0, "One bill a year"],
  ["Rail half-fare card", "annual", 0, 0, "Renews yearly"],
  ["Gym", "annual", 0, 0, "Paid upfront"],
];

const CATEGORY_MAP: Array<[category: string, lineName: string]> = [
  ["groceries", "Food & drink"],
  ["restaurants", "Food & drink"],
  ["mensa", "Food & drink"],
  ["kiosk", "Food & drink"],
  ["coffee", "Food & drink"],
  ["clothing", "Additional expenses"],
  ["travel", "Additional expenses"],
  ["pharmacy", "Additional expenses"],
  ["nightlife", "Additional expenses"],
  ["payback", "Additional expenses"],
  ["barber", "Additional expenses"],
  ["apps_misc", "Additional expenses"],
  ["rent", "Rent"],
  ["insurance", "Health insurance"],
  ["phone", "Phone"],
  ["transit", "Transit pass, city zones"],
  ["cleaning", "House cleaning"],
  ["uni_fees", "University fees"],
  ["electricity", "Electricity"],
  ["serafe", "Radio/TV licence"],
  ["sbb", "Rail half-fare card"],
  ["gym", "Gym"],
];

// Bills = the fixed lines that are genuinely bills, all due on day 1.
const BILLS: Array<[name: string, dueDay: number, amount: number]> = [
  ["Rent", 1, 0],
  ["Health insurance", 1, 0],
  ["Phone", 1, 0],
  ["Transit pass, city zones", 1, 0],
];

const NOTES = ["Try a new running route", "Bill-split app idea", "Gift idea for a friend"];

// Merchant→category rules, ordered — first match wins, case-insensitive
// substring on the merchant. Specific rules must precede generic ones
// (coop pronto before coop). 'transfer' has no
// category_map row on purpose: self-transfers and income roll into no line.
const STARTER_RULES: Array<{ match: string; category: string }> = [
  { match: "coop pronto", category: "kiosk" },
  { match: "k kiosk", category: "kiosk" },
  { match: "migros", category: "groceries" },
  { match: "coop", category: "groceries" },
  { match: "spar ", category: "groceries" },
  { match: "aldi", category: "groceries" },
  { match: "lidl", category: "groceries" },
  { match: "denner", category: "groceries" },
  { match: "elektrizitätswerk", category: "electricity" },
  { match: "sbb cff ffs", category: "travel" },
  { match: "zvv", category: "transit" },
  { match: "apoth", category: "pharmacy" },
  { match: "amavita", category: "pharmacy" },
  { match: "airalo", category: "travel" },
  { match: "lime*ride", category: "travel" },
  { match: "itx retail", category: "clothing" },
  { match: "zalando", category: "clothing" },
  { match: "mcdonalds", category: "restaurants" },
  { match: "brezelkonig", category: "restaurants" },
  { match: "pret a manger", category: "restaurants" },
  { match: "bistro", category: "restaurants" },
  { match: "rest.", category: "restaurants" },
  { match: "restaur", category: "restaurants" },
  { match: "pizzeria", category: "restaurants" },
  { match: "starbucks", category: "coffee" },
  { match: "irish pub", category: "nightlife" },
  { match: "digitec", category: "apps_misc" },
  { match: "galaxus", category: "apps_misc" },
  { match: "amzn", category: "apps_misc" },
  { match: "amazon", category: "apps_misc" },
  { match: "fust", category: "apps_misc" },
  { match: "ikea", category: "apps_misc" },
  { match: "balance closing", category: "apps_misc" },
];

// Targets start at 0 until the owner sets them. budget.baseline holds
// semester-month averages, so the UI can say "vs your historical average".
const CONFIG_DEFAULTS: Record<string, string> = {
  "health.target.kcal": "0",
  "health.target.protein": "0",
  "health.target.carbs": "0",
  "health.target.fat": "0",
  "health.target.steps": "0",
  "health.range.hrv": JSON.stringify({ low: 0, high: 0 }),
  "health.csv_mappings": JSON.stringify({
    generic: {
      dateColumn: "date",
      columns: {
        sleep_score: "sleep_score",
        hrv: "hrv",
        steps: "steps",
        kcal: "kcal",
        protein: "protein",
        carbs: "carbs",
        fat: "fat",
        weight: "weight",
        resting_hr: "resting_hr",
      },
    },
  }),
  "budget.start_date": "2026-09-01",
  "budget.baseline": JSON.stringify({
    food: { groceries: 0, restaurants: 0, mensa: 0, kiosk: 0, coffee: 0, total: 0 },
    additional: { avg: 0, min: 0, max: 0 },
  }),
  "budget.rules": JSON.stringify(STARTER_RULES),
};

export function seedStage2(db: Database.Database) {
  const budgetLineCount = db.prepare("SELECT COUNT(*) AS n FROM budget_lines").get() as { n: number };
  if (budgetLineCount.n === 0) {
    const insert = db.prepare(
      "INSERT INTO budget_lines (name, tier, amount_chf, carryover, sort_order, notes) VALUES (?, ?, ?, ?, ?, ?)"
    );
    BUDGET_LINES.forEach(([name, tier, amount, carryover, notes], i) => {
      insert.run(name, tier, amount, carryover, i, notes);
    });
  }

  const mapCount = db.prepare("SELECT COUNT(*) AS n FROM category_map").get() as { n: number };
  if (mapCount.n === 0) {
    const insert = db.prepare(
      "INSERT INTO category_map (category, budget_line_id) SELECT ?, id FROM budget_lines WHERE name = ?"
    );
    for (const [category, lineName] of CATEGORY_MAP) insert.run(category, lineName);
  }

  const billCount = db.prepare("SELECT COUNT(*) AS n FROM bills").get() as { n: number };
  if (billCount.n === 0) {
    const insert = db.prepare("INSERT INTO bills (name, due_day, amount_chf) VALUES (?, ?, ?)");
    for (const [name, dueDay, amount] of BILLS) insert.run(name, dueDay, amount);
  }

  const noteCount = db.prepare("SELECT COUNT(*) AS n FROM notes").get() as { n: number };
  if (noteCount.n === 0) {
    const insert = db.prepare("INSERT INTO notes (text, domain, kind) VALUES (?, 'personal', 'note')");
    for (const text of NOTES) insert.run(text);
  }

  // Per-key so a later release can add defaults without re-seeding everything;
  // OR IGNORE keeps user edits.
  const insertConfig = db.prepare("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)");
  for (const [key, value] of Object.entries(CONFIG_DEFAULTS)) insertConfig.run(key, value);
}
