import { accentPill, type Accent } from "@/components/ui/accents";
import type { TaskType } from "@/lib/types";

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: Accent | "neutral";
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4 ${accentPill[tone]}`}
    >
      {children}
    </span>
  );
}

/* Palette rule (docs/02-design-system.md): warm colors signal urgency only —
   red = exam, orange = assignment; ordinary types stay neutral. */
const typeTone: Record<TaskType, Accent | "neutral"> = {
  task: "neutral",
  meeting: "neutral",
  assignment: "warn",
  exam: "danger",
};

export function TypePill({ type }: { type: TaskType }) {
  return <Pill tone={typeTone[type]}>{type}</Pill>;
}
