"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useOptimisticToggle } from "@/lib/useOptimisticToggle";
import type { Task } from "@/lib/types";

// One optimistic "done" state for every task list on a page (decision #89). The
// Overview shows the same stored task in up to three places — the Week plan, Due
// soon and This week — and each list used to hold its own overlay, so a box
// ticked in one stayed empty in the others until the refresh landed. Under this
// provider they share one overlay and flip together, at once.
//
// A list that renders outside a provider (Personal's ThisWeek) keeps its own
// state: `useTaskToggles()` falls back to a private toggle.

type Toggles = ReturnType<typeof useOptimisticToggle<Task>>;

const TaskTogglesContext = createContext<Toggles | null>(null);

function useOwnToggles(): Toggles {
  return useOptimisticToggle<Task>({
    idOf: (t) => t.id,
    labelOf: (t) => t.title,
    send: (t, next) =>
      fetch(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      }),
  });
}

export function TaskTogglesProvider({ children }: { children: ReactNode }) {
  const toggles = useOwnToggles();
  return (
    <TaskTogglesContext.Provider value={toggles}>
      {/* Said once for the page, not once per list. */}
      {toggles.error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {toggles.error}
        </p>
      )}
      {children}
    </TaskTogglesContext.Provider>
  );
}

/**
 * The page's shared toggle when there is one, else a private one. `shared`
 * tells the caller whether the provider already reports errors.
 */
export function useTaskToggles(): Toggles & { shared: boolean } {
  const shared = useContext(TaskTogglesContext);
  // Hooks cannot be conditional, so the private toggle always exists; it is
  // simply unused under a provider.
  const own = useOwnToggles();
  return shared ? { ...shared, shared: true } : { ...own, shared: false };
}
