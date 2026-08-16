import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setMonthOverride, updateBudgetLine } from "@/lib/db/money";
import type { BudgetLine } from "@/lib/types";

// Inline budget-line edit (§6): writes the standing line, unless the user picked
// "just this month" — then it becomes a month override in `budgets`.
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/money/budget-lines/[id]">) {
  const { id } = await ctx.params;
  const line = db.prepare("SELECT * FROM budget_lines WHERE id = ?").get(Number(id)) as
    | BudgetLine
    | undefined;
  if (!line) return NextResponse.json({ error: "unknown budget line" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const amount = body?.amount_chf;
  if (amount !== undefined && (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0)) {
    return NextResponse.json({ error: "amount_chf must be a non-negative number" }, { status: 400 });
  }

  if (body?.justThisMonth === true) {
    const month = typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month) ? body.month : null;
    if (!month || amount === undefined) {
      return NextResponse.json({ error: "month and amount_chf are required for a month override" }, { status: 400 });
    }
    setMonthOverride(month, line.name, amount);
    return NextResponse.json({ ok: true, override: { month, amount } });
  }

  const updated = updateBudgetLine(line.id, {
    amount_chf: amount,
    active: typeof body?.active === "boolean" ? body.active : undefined,
  });
  return NextResponse.json(updated);
}
