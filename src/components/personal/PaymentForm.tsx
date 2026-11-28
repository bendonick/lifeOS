"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TagField } from "@/components/personal/TagField";
import { filledButtonChrome, inputChrome } from "@/components/ui/controls";
import { PAYMENT_NAME_MAX, checkPayment, type PaymentKind } from "@/lib/personal/payments";

/**
 * One form for a monthly payment (a bill or a subscription): its name and the
 * day of the month it is due, and on the Money page its amount. Used to add a
 * payment (under the list, and from the page's `+ Add` menu) and to edit one
 * in place of its row. Personal's copy has no amount field, so the page that
 * shows no figures never shows one in its editor either; saving there leaves
 * the amount as it was. The Money page's copy also sets the payment's type
 * (Core or Subscription) and its tags (`TagField`); Personal's leaves both as
 * they were.
 *
 * Editing also offers Remove, which asks once in the row before it acts: the
 * payment leaves the lists and its paid months stay in the log.
 */
export function PaymentForm({
  payment,
  withAmount = false,
  withLabels = false,
  tagSuggestions = [],
  inputId,
  onDone,
}: {
  /** The payment being edited; absent when adding. */
  payment?: {
    id: number;
    name: string;
    due_day: number;
    amount_chf: number | null;
    kind?: PaymentKind;
    tags?: string[];
  };
  /** Show the amount field (the Money page). */
  withAmount?: boolean;
  /** Show the type and tags (the Money page), with these tags offered. */
  withLabels?: boolean;
  tagSuggestions?: string[];
  inputId?: string;
  /** Editing: called after a save or removal, and by Cancel. Adding keeps the
   *  form open and empty for the next payment. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(payment?.name ?? "");
  const [dueDay, setDueDay] = useState(payment ? String(payment.due_day) : "");
  const [amount, setAmount] = useState(payment?.amount_chf != null ? String(payment.amount_chf) : "");
  const [kind, setKind] = useState<PaymentKind>(payment?.kind ?? "core");
  const [tags, setTags] = useState<string[]>(payment?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(url: string, method: string, body?: object, failure = "could not save") {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const msg = await res?.json().then((j) => j?.error).catch(() => null);
      setError(typeof msg === "string" ? msg : failure);
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const checked = checkPayment({
      name,
      due_day: dueDay,
      ...(withAmount ? { amount_chf: amount } : {}),
      // A tag typed but not yet added is kept, not lost on Save.
      ...(withLabels ? { kind, tags: tagDraft.trim() ? [...tags, tagDraft] : tags } : {}),
    });
    if ("error" in checked) {
      setError(checked.error);
      return;
    }
    const ok = payment
      ? await send(`/api/bills/${payment.id}`, "PATCH", checked)
      : await send("/api/bills", "POST", checked, "could not add the payment");
    if (!ok) return;
    if (payment) onDone?.();
    else {
      setName("");
      setDueDay("");
      setAmount("");
      setKind("core");
      setTags([]);
      setTagDraft("");
    }
  }

  async function remove() {
    if (!payment) return;
    if (await send(`/api/bills/${payment.id}`, "DELETE", undefined, "could not remove the payment")) onDone?.();
  }

  if (payment && confirmRemove) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-busy={busy || isPending}>
        <p className="text-sm text-text">
          Remove “{payment.name}”? <span className="text-muted">Its paid months stay in the log.</span>
        </p>
        <span className="flex items-center gap-3">
          <button type="button" onClick={remove} disabled={busy} className={filledButtonChrome}>
            Remove
          </button>
          <button type="button" onClick={() => setConfirmRemove(false)} className="text-sm text-link hover:text-text">
            Keep it
          </button>
        </span>
        {error && (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2" aria-busy={busy || isPending}>
      <input
        id={inputId}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={payment ? undefined : "New payment…"}
        maxLength={PAYMENT_NAME_MAX}
        autoFocus
        aria-label="payment name"
        aria-invalid={!!error}
        className={`min-w-40 flex-1 ${inputChrome}`}
      />
      <label className="flex items-center gap-1.5 text-sm text-muted">
        Due day
        <input
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
          inputMode="numeric"
          placeholder="1"
          maxLength={2}
          className={`w-12 text-center ${inputChrome}`}
        />
      </label>
      {withAmount && (
        <label className="flex items-center gap-1.5 text-sm text-muted">
          CHF
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="—"
            className={`tabular w-20 text-right ${inputChrome}`}
          />
        </label>
      )}
      {withLabels && (
        <>
          {/* The type and tags take a line of their own. */}
          <span aria-hidden="true" className="h-0 basis-full" />
          <span className="flex items-center gap-1.5 text-sm text-muted">
            Type
            <span role="group" aria-label="Type" className="inline-flex overflow-hidden rounded-md border border-border">
              {(["core", "subscription"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={`px-3 py-1.5 text-sm transition-colors first:border-r first:border-border ${
                    kind === k ? "bg-(--color-ink) text-(--color-paper)" : "bg-surface text-muted hover:text-text"
                  }`}
                >
                  {k === "core" ? "Core" : "Subscription"}
                </button>
              ))}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted">
            Tags
            <TagField tags={tags} onTags={setTags} draft={tagDraft} onDraft={setTagDraft} suggestions={tagSuggestions} />
          </span>
        </>
      )}
      <button type="submit" disabled={busy} className={filledButtonChrome}>
        {payment ? "Save" : "Add"}
      </button>
      {payment && (
        <button type="button" onClick={onDone} className="px-1 text-sm text-link hover:text-text">
          Cancel
        </button>
      )}
      {payment && (
        <button
          type="button"
          onClick={() => setConfirmRemove(true)}
          className="ml-auto px-1 text-sm text-muted hover:text-danger"
        >
          Remove payment
        </button>
      )}
      {error && (
        <span role="alert" className="basis-full text-xs text-danger">
          {error}
        </span>
      )}
    </form>
  );
}
