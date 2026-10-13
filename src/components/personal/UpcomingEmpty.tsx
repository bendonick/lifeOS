"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DisclosureTrigger } from "@/components/ui/Disclosure";

/**
 * The Upcoming module's quiet week (decision #81): one line saying so, and the
 * two things you might do about it — add a task, or open the calendar — on the
 * right. Both panels open beneath the strip at full width, which is why the
 * triggers are controlled here rather than two `Disclosure`s side by side
 * (each would open inside its own narrow column).
 *
 * `#new-task` from the `+ Add` menu opens the task panel, the same way a
 * `Disclosure`'s `anchors` would.
 */
export function UpcomingEmpty({ taskForm, calendar }: { taskForm: ReactNode; calendar: ReactNode }) {
  const [task, setTask] = useState(false);
  const [cal, setCal] = useState(false);

  useEffect(() => {
    const openIfTargeted = () => {
      if (window.location.hash !== "#new-task") return;
      setTask(true);
      requestAnimationFrame(() => {
        const el = document.getElementById("new-task");
        el?.scrollIntoView({ block: "center" });
        if (el instanceof HTMLInputElement) el.focus();
      });
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, []);

  return (
    <div>
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-sm text-muted">Nothing scheduled this week.</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <DisclosureTrigger
            open={task}
            onToggle={() => setTask((v) => !v)}
            summary="Task"
            openSummary="Cancel"
            variant="add"
            accent="personal"
            controls="upcoming-task"
          />
          <span aria-hidden="true" className="hidden h-5 border-l border-border sm:block" />
          <DisclosureTrigger
            open={cal}
            onToggle={() => setCal((v) => !v)}
            summary="Open calendar"
            openSummary="Hide calendar"
            controls="upcoming-calendar"
          />
        </div>
      </div>
      {task && (
        <div id="upcoming-task" className="mt-3">
          {taskForm}
        </div>
      )}
      {cal && (
        <div id="upcoming-calendar" className="mt-4">
          {calendar}
        </div>
      )}
    </div>
  );
}
