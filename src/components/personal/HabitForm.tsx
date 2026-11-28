"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { filledButtonChrome, inputChrome } from "@/components/ui/controls";
import { HABIT_NAME_MAX, checkHabitName } from "@/lib/personal/habits";

/**
 * One form for a habit's name, used to add a habit (under the
 * list, and from the page's `+ Add` menu) and to edit one in place of its row.
 * Editing also offers Remove, which asks once in the row before it acts: the
 * habit leaves the page and its past ticks stay in the log.
 */
export function HabitForm({
  habit,
  inputId,
  onDone,
}: {
  /** The habit being edited; absent when adding. */
  habit?: { id: number; name: string };
  inputId?: string;
  /** Editing: called after a save or removal, and by Cancel. Adding keeps the
   *  form open and empty for the next habit; its Disclosure trigger is the
   *  Cancel. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(habit?.name ?? "");
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
    const checked = checkHabitName(name);
    if ("error" in checked) {
      setError(checked.error);
      return;
    }
    const ok = habit
      ? await send(`/api/habits/${habit.id}`, "PATCH", { name: checked.name })
      : await send("/api/habits", "POST", { name: checked.name }, "could not add the habit");
    if (!ok) return;
    if (habit) onDone?.();
    else setName("");
  }

  async function remove() {
    if (!habit) return;
    if (await send(`/api/habits/${habit.id}`, "DELETE", undefined, "could not remove the habit")) onDone?.();
  }

  if (habit && confirmRemove) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-busy={busy || isPending}>
        <p className="text-sm text-text">
          Remove “{habit.name}”? <span className="text-muted">Its past ticks stay in the log.</span>
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
        placeholder={habit ? undefined : "New habit…"}
        maxLength={HABIT_NAME_MAX}
        autoFocus
        aria-label="habit name"
        aria-invalid={!!error}
        className={`min-w-40 flex-1 ${inputChrome}`}
      />
      <button type="submit" disabled={busy} className={filledButtonChrome}>
        {habit ? "Save" : "Add"}
      </button>
      {habit && (
        <button type="button" onClick={onDone} className="px-1 text-sm text-link hover:text-text">
          Cancel
        </button>
      )}
      {habit && (
        <button
          type="button"
          onClick={() => setConfirmRemove(true)}
          className="ml-auto px-1 text-sm text-muted hover:text-danger"
        >
          Remove habit
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
