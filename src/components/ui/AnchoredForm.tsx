"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * An editor with no trigger of its own: it opens when the page's hash names its
 * anchor and closes from inside. The Academic page's single `+ Add` menu
 * (decision #78) replaced the per-module add buttons, so the forms they opened
 * need a way in that is not a button under every list — the hash is that way,
 * and it is the same mechanism the rail's Quick-add anchors used.
 *
 * Closing clears the hash, so choosing the same entry again re-fires
 * `hashchange` and reopens the form; without that, a second pick of "Exam"
 * after Cancel would be a dead click.
 */
export function AnchoredForm({
  anchor,
  children,
}: {
  anchor: string;
  /** Receives `close` so the form can offer a Cancel. */
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openIfTargeted = () => {
      if (window.location.hash.slice(1) !== anchor) return;
      setOpen(true);
      requestAnimationFrame(() => {
        const el = document.getElementById(anchor);
        el?.scrollIntoView({ block: "center" });
        if (el instanceof HTMLInputElement) el.focus();
      });
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, [anchor]);

  const close = () => {
    setOpen(false);
    if (window.location.hash.slice(1) === anchor) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  if (!open) return null;
  return <div className="mt-3">{children(close)}</div>;
}
