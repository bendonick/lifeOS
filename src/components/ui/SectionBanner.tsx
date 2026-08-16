import { accentBanner, type Accent } from "@/components/ui/accents";

/**
 * The banner + caption pair — the strongest visual signature carried over from
 * Notion (docs/02-design-system.md). Full-width strip tinted with the domain
 * color, small muted caption line beneath.
 */
export function SectionBanner({
  accent = "hub",
  title,
  caption,
}: {
  accent?: Accent;
  title: string;
  caption?: string;
}) {
  return (
    <div>
      <div className={`rounded-md px-4 py-2 text-sm font-semibold tracking-wide ${accentBanner[accent]}`}>
        {title}
      </div>
      {caption && <p className="mt-1.5 px-4 text-xs text-muted">{caption}</p>}
    </div>
  );
}
