import { Card } from "@/components/ui/Card";

// Stage 1: stubbed cards with the spec's placeholder copy (docs/03-pages/lifeos.md §1).
// Staleness is honest — these say plainly that no script has run yet.
const BRIEFS = [
  { label: "Email todos", copy: "invoices and replies pulled from Gmail, weekday mornings" },
  { label: "World brief", copy: "a few headline summaries worth knowing" },
  { label: "AI research", copy: "suggested papers and articles, with links" },
  { label: "German word of the day", copy: "word, translation, example sentence" },
];

export function BriefRow() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {BRIEFS.map((b) => (
        <Card key={b.label} label={b.label} accent="hub">
          <p className="mt-2 text-sm text-muted">{b.copy}</p>
          <p className="mt-3 text-[11px] text-faint">no brief yet · scripts land in Stage 5</p>
        </Card>
      ))}
    </div>
  );
}
