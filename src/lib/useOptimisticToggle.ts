"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// Shared optimistic toggle for the page's checkbox lists (habits, bills, notes,
// tasks). Only HabitList used to do this: the others were controlled purely by
// server state, so a click did nothing visible until the refresh landed, and a
// failed request was indistinguishable from a successful one.
//
// The overlay holds the optimistic value until server truth arrives via
// router.refresh(); a failed request reverts it and surfaces the error rather
// than swallowing it.

export function useOptimisticToggle<T>({
  idOf,
  labelOf,
  send,
}: {
  idOf: (item: T) => number;
  labelOf: (item: T) => string;
  send: (item: T, next: boolean) => Promise<Response>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [overlay, setOverlay] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  async function toggle(item: T, current: boolean) {
    const id = idOf(item);
    const next = !current;
    setError(null);
    setOverlay((o) => ({ ...o, [id]: next }));

    const res = await send(item, next).catch(() => null);
    if (!res?.ok) {
      setOverlay((o) => ({ ...o, [id]: !next }));
      setError(`could not save “${labelOf(item)}” — try again`);
      return;
    }
    startTransition(() => router.refresh());
  }

  /** Optimistic value if we have one, else server truth. */
  function valueFor(item: T, serverValue: boolean): boolean {
    return overlay[idOf(item)] ?? serverValue;
  }

  return { toggle, valueFor, isPending, error };
}
