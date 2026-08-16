"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CategoryOptions } from "@/components/personal/CategoryOptions";
import type { CategoryGroup } from "@/lib/db/money";

// Manual transaction entry (spend as a positive number; the server stores it
// bank-signed). Mirrors the ThisWeek add-form idiom; the category picker is
// grouped by budget line like the queue's.

export function TxnQuickAdd({ categories, today }: { categories: CategoryGroup[]; today: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!merchant.trim() || !Number.isFinite(value) || value <= 0) return;
    setError(null);
    const res = await fetch("/api/money/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        amount_chf: value,
        merchant: merchant.trim(),
        category: category || undefined,
      }),
    });
    if (!res.ok) {
      setError("could not add transaction");
      return;
    }
    setAmount("");
    setMerchant("");
    startTransition(() => router.refresh());
  }

  return (
    <form
      onSubmit={add}
      className={`flex flex-wrap items-center gap-2 ${isPending ? "opacity-60" : ""} transition-opacity`}
    >
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted [color-scheme:dark] focus:outline-none"
        aria-label="transaction date"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="CHF"
        inputMode="decimal"
        className="tabular w-20 rounded-md border border-border bg-surface px-2 py-1.5 text-right text-sm placeholder:text-faint focus:border-personal/50 focus:outline-none"
        aria-label="amount in CHF"
      />
      <input
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        placeholder="Merchant…"
        className="min-w-32 flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm placeholder:text-faint focus:border-personal/50 focus:outline-none"
        aria-label="merchant"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-muted focus:outline-none"
        aria-label="category"
      >
        <option value="">category…</option>
        <CategoryOptions groups={categories} />
      </select>
      <button
        type="submit"
        className="rounded-md border border-border bg-raised px-3 py-1.5 text-sm text-text transition-colors hover:border-personal/40"
      >
        Add
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </form>
  );
}
