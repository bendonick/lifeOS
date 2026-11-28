"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TagField } from "@/components/personal/TagField";
import { filledButtonChrome, inputChrome } from "@/components/ui/controls";
import { zurichToday } from "@/lib/dates";
import { PAYMENT_NAME_MAX, SUBSCRIPTION_CURRENCY, checkPayment, type PaymentKind } from "@/lib/personal/payments";

/**
 * One form for a monthly payment or a subscription: its name and the day of
 * the month it is due, and on the Money page its amount and tags (`TagField`).
 * Used to add one (under its list, and from the page's `+ Add` menu) and to
 * edit one in place of its row. Personal's copy has no amount or tags, so the
 * page that shows no figures never shows one in its editor either; saving
 * there leaves them as they were.
 *
 * There is no type switch: the list a form belongs to decides it (`kind`), and
 * a payment is created under the right one rather than moved later. A monthly
 * payment's amount is in francs and a subscription's in US dollars. Editing a
 * subscription also offers **Cancel subscription**, which asks for the day it
 * was cancelled and moves it to the Cancelled list.
 *
 * Editing also offers Remove, which asks once in the row before it acts: the
 * entry leaves every list (a payment's paid months stay in the log).
 */
export function PaymentForm({
  payment,
  kind = "core",
  withAmount = false,
  withLabels = false,
  tagSuggestions = [],
  inputId,
  onDone,
}: {
  /** The entry being edited; absent when adding. */
  payment?: {
    id: number;
    name: string;
    due_day: number;
    amount_chf: number | null;
    tags?: string[];
  };
  /** Which list the form belongs to: a new entry is created as this. */
  kind?: PaymentKind;
  /** Show the amount field (the Money page). */
  withAmount?: boolean;
  /** Show the tags (the Money page), with these tags offered. */
  withLabels?: boolean;
  tagSuggestions?: string[];
  inputId?: string;
  /** Editing: called after a save, cancel or removal, and by Cancel. Adding
   *  keeps the form open and empty for the next one. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const subscription = kind === "subscription";
  const [name, setName] = useState(payment?.name ?? "");
  const [dueDay, setDueDay] = useState(payment ? String(payment.due_day) : "");
  const [amount, setAmount] = useState(payment?.amount_chf != null ? String(payment.amount_chf) : "");
  const [tags, setTags] = useState<string[]>(payment?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "remove" | "cancel">(null);
  const [cancelDate, setCancelDate] = useState("");
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
      ...(withLabels ? { tags: tagDraft.trim() ? [...tags, tagDraft] : tags } : {}),
      // The type is set once, when it is created.
      ...(payment ? {} : { kind }),
    });
    if ("error" in checked) {
      setError(checked.error);
      return;
    }
    const ok = payment
      ? await send(`/api/bills/${payment.id}`, "PATCH", checked)
      : await send("/api/bills", "POST", checked, `could not add the ${subscription ? "subscription" : "payment"}`);
    if (!ok) return;
    if (payment) onDone?.();
    else {
      setName("");
      setDueDay("");
      setAmount("");
      setTags([]);
      setTagDraft("");
    }
  }

  async function remove() {
    if (!payment) return;
    if (await send(`/api/bills/${payment.id}`, "DELETE", undefined, "could not remove it")) onDone?.();
  }

  async function cancelSubscription() {
    if (!payment) return;
    if (await send(`/api/bills/${payment.id}`, "PATCH", { cancelled_on: cancelDate }, "could not cancel it")) {
      onDone?.();
    }
  }

  const alert = error && (
    <span role="alert" className="basis-full text-xs text-danger">
      {error}
    </span>
  );

  if (payment && confirm === "remove") {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-busy={busy || isPending}>
        <p className="text-sm text-text">
          Remove “{payment.name}”?{" "}
          <span className="text-muted">
            {subscription
              ? "It leaves every list; to keep it under Cancelled, cancel it instead."
              : "Its paid months stay in the log."}
          </span>
        </p>
        <span className="flex items-center gap-3">
          <button type="button" onClick={remove} disabled={busy} className={filledButtonChrome}>
            Remove
          </button>
          <button type="button" onClick={() => setConfirm(null)} className="text-sm text-link hover:text-text">
            Keep it
          </button>
        </span>
        {alert}
      </div>
    );
  }

  if (payment && confirm === "cancel") {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-busy={busy || isPending}>
        <p className="text-sm text-text">
          Cancel “{payment.name}”? <span className="text-muted">It moves to Cancelled and stops counting.</span>
        </p>
        <label className="flex items-center gap-1.5 text-sm text-muted">
          Cancelled on
          <input
            type="date"
            value={cancelDate}
            max={zurichToday()}
            onChange={(e) => setCancelDate(e.target.value)}
            className={`text-text ${inputChrome}`}
          />
        </label>
        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={cancelSubscription}
            disabled={busy || !cancelDate}
            className={filledButtonChrome}
          >
            Cancel subscription
          </button>
          <button type="button" onClick={() => setConfirm(null)} className="text-sm text-link hover:text-text">
            Keep it
          </button>
        </span>
        {alert}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2" aria-busy={busy || isPending}>
      <input
        id={inputId}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={payment ? undefined : subscription ? "New subscription…" : "New payment…"}
        maxLength={PAYMENT_NAME_MAX}
        autoFocus
        aria-label={subscription ? "subscription name" : "payment name"}
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
          {subscription ? SUBSCRIPTION_CURRENCY : "CHF"}
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
          {/* The tags take a line of their own. */}
          <span aria-hidden="true" className="h-0 basis-full" />
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
        <span className="ml-auto flex items-center gap-3">
          {subscription && (
            <button
              type="button"
              onClick={() => {
                setCancelDate(zurichToday());
                setConfirm("cancel");
              }}
              className="px-1 text-sm text-text underline decoration-border-strong underline-offset-4 hover:decoration-text"
            >
              Cancel subscription
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirm("remove")}
            className="px-1 text-sm text-muted hover:text-danger"
          >
            {subscription ? "Remove" : "Remove payment"}
          </button>
        </span>
      )}
      {alert}
    </form>
  );
}
