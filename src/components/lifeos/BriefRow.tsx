import { Card } from "@/components/ui/Card";
import { Markdown } from "@/components/ui/Markdown";
import { briefStaleness, briefToneText } from "@/lib/briefs/staleness";
import { BRIEF_KINDS, BRIEF_LABEL, BRIEF_PLACEHOLDER, type Brief, type BriefKind } from "@/lib/db/briefs";

// Three cards, not four: decision #35 dropped the Gmail email-todos brief, and a
// card promising a brief that isn't coming is worse than no card.
//
// The scripts write; this only renders (docs/01-architecture.md — the webapp never
// calls an LLM on the render path). A card whose script hasn't run today shows the
// last brief it did produce, labelled with its age, because blanking it would hide
// both the content and the fact that a scheduled job has stopped.

export function BriefRow({ briefs }: { briefs: Partial<Record<BriefKind, Brief>> }) {
  return (
    // items-start, not the grid's default stretch: brief lengths differ by the
    // day, and a short card stretched to a long neighbour reads as content that
    // failed to load rather than a brief that was simply shorter.
    <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {BRIEF_KINDS.map((kind) => (
        <BriefCard key={kind} kind={kind} brief={briefs[kind]} />
      ))}
    </div>
  );
}

function BriefCard({ kind, brief }: { kind: BriefKind; brief?: Brief }) {
  if (!brief) {
    return (
      <Card label={BRIEF_LABEL[kind]} accent="hub">
        <p className="mt-2 text-sm text-muted">{BRIEF_PLACEHOLDER[kind]}</p>
        <p className="mt-3 text-[11px] text-faint">no brief yet · runs weekday mornings at 07:00</p>
      </Card>
    );
  }

  const { label, tone } = briefStaleness(brief.date, brief.generated_at);
  return (
    <Card label={BRIEF_LABEL[kind]} accent="hub" className="flex flex-col">
      <Markdown text={brief.content_md} className="mt-2" />
      <p className={`mt-3 pt-1 text-[11px] ${briefToneText[tone]}`}>{label}</p>
    </Card>
  );
}
