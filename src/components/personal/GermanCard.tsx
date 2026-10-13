import { Disclosure } from "@/components/ui/Disclosure";
import { Markdown } from "@/components/ui/Markdown";
import type { Brief } from "@/lib/db/briefs";
import { utcToZurichLabel } from "@/lib/dates";
import { parseGermanWord } from "@/lib/personal/german";

/**
 * German (decision #81): the word, its note and translation, one example with
 * its English, and the rest behind "More context". No audio and no "next
 * word" — neither exists, and a control with nothing behind it is a lie.
 */
export function GermanCard({ brief }: { brief: Brief | null }) {
  if (!brief) return <p className="text-sm text-muted">No word yet.</p>;

  const parsed = parseGermanWord(brief.content_md);
  const generated = (
    <p className="mt-2 text-xs text-faint">generated {utcToZurichLabel(brief.generated_at)}</p>
  );

  if (!parsed) {
    return (
      <div>
        <Markdown text={brief.content_md} />
        {generated}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span lang="de" className="text-xl font-semibold text-text">
          {parsed.word}
        </span>
        {parsed.note && (
          <span lang="de" className="text-sm text-muted">
            ({parsed.note})
          </span>
        )}
      </div>
      {parsed.translation && <p className="mt-0.5 text-sm text-muted">{parsed.translation}</p>}
      {parsed.example && (
        <p lang="de" className="mt-3 text-sm text-text">
          {parsed.example}
        </p>
      )}
      {parsed.exampleEn && <p className="mt-0.5 text-sm text-muted italic">{parsed.exampleEn}</p>}
      <Disclosure summary="More context" openSummary="Less" className="mt-3">
        {parsed.context ? <Markdown text={parsed.context} /> : <p className="text-sm text-muted">Nothing more today.</p>}
        {generated}
      </Disclosure>
    </div>
  );
}
