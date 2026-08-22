"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CategoryOptions } from "@/components/personal/CategoryOptions";
import { accentHoverBorder } from "@/components/ui/accents";
import { buttonChrome, fieldChrome, inputChrome, selectChrome } from "@/components/ui/controls";
import { useTransientStatus } from "@/lib/useTransientStatus";
import type { CategoryGroup } from "@/lib/db/money";

// Manual transaction entry (spend as a positive number; the server stores it
// bank-signed). Mirrors the ThisWeek add-form idiom; the category picker is
// grouped by budget line like the queue's.

export function TxnQuickAdd({
  categories,
  today,
  inputId,
  autoFocus = false,
}: {
  categories: CategoryGroup[];
  today: string;
  /** Only the on-page instance claims `#new-expense`; the Quick add copy must
   *  not, or the anchor would resolve to whichever mounted last. */
  inputId?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useTransientStatus();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    // Used to return silently: pressing Add with a bad amount did nothing at
    // all, with no way to learn why.
    if (!Number.isFinite(value) || value <= 0) {
      setError("enter an amount");
      return;
    }
    if (!merchant.trim()) {
      setError("enter a merchant");
      return;
    }
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
    setStatus(`Added CHF ${value} · ${merchant.trim()}`);
    setAmount("");
    setMerchant("");
    startTransition(() => router.refresh());
  }

  return (
    <form
      onSubmit={add}
      className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
      aria-busy={isPending}
    >
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={fieldChrome}
        aria-label="transaction date"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="CHF"
        id={inputId}
        autoFocus={autoFocus}
        inputMode="decimal"
        aria-invalid={!!error}
        className={`tabular w-24 text-right ${fieldChrome}`}
        aria-label="amount in CHF"
      />
      <input
        value={merchant}
        onChange={(e) => setMerchant(e.target.value)}
        placeholder="Merchant…"
        className={`min-w-32 flex-1 ${inputChrome}`}
        aria-label="merchant"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={`w-36 ${selectChrome}`}
        aria-label="category"
      >
        <option value="">category…</option>
        <CategoryOptions groups={categories} />
      </select>
      <button type="submit" className={`${buttonChrome} ${accentHoverBorder.personal}`}>
        Add
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
      {status && !error && (
        <span role="status" className="text-xs text-muted">
          {status}
        </span>
      )}
    </form>
  );
}
