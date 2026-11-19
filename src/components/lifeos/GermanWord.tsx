import { Disclosure } from "@/components/ui/Disclosure";
import { Markdown } from "@/components/ui/Markdown";
import { briefUpdatedLabel } from "@/lib/briefs/staleness";
import type { Brief } from "@/lib/db/briefs";
import { parseGermanWord } from "@/lib/personal/german";

// The German word of the day as a small feature at the foot of the Overview's
// left column (decision #90): label, the word in the display serif, its
// translation, and the example sentence in italics. Parsed by the same
// `parseGermanWord` Personal uses; a brief in another shape falls back to the
// markdown renderer rather than showing nothing.

export function GermanWord({ brief }: { brief?: Brief }) {
  if (!brief) return null;
  const word = parseGermanWord(brief.content_md);

  return (
    <section aria-labelledby="german-title" className="pt-4">
      {word ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 id="german-title" className="text-lg font-semibold text-muted">
              German word
            </h2>
            <span aria-hidden="true" className="hidden h-5 w-px self-center bg-border sm:block" />
            <p lang="de" className="t-serif text-[1.75rem] leading-none text-text">
              {word.word}
              {word.note && <span className="ml-2 font-sans text-sm font-normal tracking-normal text-muted">({word.note})</span>}
            </p>
            {word.translation && (
              <>
                <span aria-hidden="true" className="hidden h-5 w-px self-center bg-border sm:block" />
                <p className="text-text">{word.translation}</p>
              </>
            )}
          </div>
          {word.example && (
            <p className="mt-2">
              <span lang="de" className="italic text-text">
                {word.example}
              </span>
              {word.exampleEn && <span className="block text-sm text-muted">{word.exampleEn}</span>}
            </p>
          )}
          {word.context && (
            <Disclosure summary="More context" openSummary="Less context" className="mt-1">
              <Markdown text={word.context} className="mt-1 max-w-prose text-sm" />
            </Disclosure>
          )}
        </>
      ) : (
        <>
          <h2 id="german-title" className="text-lg font-semibold text-muted">
            German word
          </h2>
          <Markdown text={brief.content_md} className="mt-2" />
        </>
      )}
      <p className="mt-1.5 text-sm text-muted">{briefUpdatedLabel(brief.date)}</p>
    </section>
  );
}
