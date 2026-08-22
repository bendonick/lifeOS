"use client";

import { useEffect, useState } from "react";

/**
 * A confirmation that clears itself.
 *
 * Every add-form on the page emptied its fields and said nothing, so the only
 * evidence that a task had been created was noticing a new row somewhere else
 * on the screen. "Success after adding or logging something" needs a message,
 * and a message that never leaves becomes chrome — hence the timer.
 *
 * Pairs with `role="status"` at the call site so it is announced, not just seen.
 */
export function useTransientStatus(ms = 2600) {
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), ms);
    return () => clearTimeout(t);
  }, [status, ms]);
  return [status, setStatus] as const;
}
