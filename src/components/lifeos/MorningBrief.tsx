import { Disclosure } from "@/components/ui/Disclosure";
import { Markdown } from "@/components/ui/Markdown";
import { briefItems } from "@/lib/briefs/items";
import { briefUpdatedLabel } from "@/lib/briefs/staleness";
import { BRIEF_LABEL, type Brief, type BriefKind } from "@/lib/db/briefs";

// The Overview's morning reading (decision #90): the world brief and the AI
// research brief as two compact lists — headline or paper title first, a short
// excerpt where the section wants one — with the full stored text behind "Read
// brief". The scripts write; this only renders what is saved. The German word
// has its own feature beneath (GermanWord).

const SECTIONS: { kind: Exclude<BriefKind, "german_word">; excerpts: boolean }[] = [
  { kind: "world", excerpts: false },
  { kind: "ai_research", excerpts: true },
];

/** The age in words carries the staleness; on this page the warm tone is the
 *  link colour, so tinting an old date would only make it look clickable. */
function Freshness({ brief }: { brief: Brief }) {
  return <span className="text-sm text-muted">{briefUpdatedLabel(brief.date)}</span>;
}

export function MorningBrief({ briefs }: { briefs: Partial<Record<BriefKind, Brief>> }) {
  const present = SECTIONS.filter((s) => briefs[s.kind]);
  // One line in the heading when every brief has the same date; otherwise each
  // section states its own, so the heading never claims a freshness one of them
  // does not have.
  const dates = new Set(present.map((s) => briefs[s.kind]!.date));
  const shared = dates.size === 1 ? briefs[present[0].kind]! : null;

  return (
    <section aria-labelledby="brief-title" className="border-t border-border pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="brief-title" className="text-2xl font-bold tracking-tight text-text">
          Morning brief
        </h2>
        {shared && <Freshness brief={shared} />}
      </div>

      {present.length === 0 && <p className="mt-2 text-sm text-muted">No brief has been saved yet.</p>}

      {SECTIONS.map(({ kind, excerpts }) => {
        const brief = briefs[kind];
        if (!brief) {
          return present.length === 0 ? null : (
            <div key={kind} className="mt-4 border-b border-border pb-4">
              <h3 className="text-lg font-semibold text-muted">{BRIEF_LABEL[kind]}</h3>
              <p className="mt-1 text-sm text-muted">Nothing saved yet.</p>
            </div>
          );
        }
        const items = briefItems(brief.content_md);
        return (
          <div key={kind} className="mt-4 border-b border-border pb-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <h3 className="text-lg font-semibold text-muted">{BRIEF_LABEL[kind]}</h3>
              {!shared && <Freshness brief={brief} />}
            </div>
            {items.length === 0 ? (
              // A brief that does not follow the bullet shape is still readable.
              <Markdown text={brief.content_md} className="mt-2" />
            ) : (
              <>
                <ul className="mt-2 flex flex-col gap-2.5">
                  {items.map((item) => (
                    <li key={item.title} className="flex gap-3">
                      <span aria-hidden="true" className="mt-[0.5em] h-2 w-2 shrink-0 bg-(--color-rust)" />
                      <span className="min-w-0">
                        {item.href ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            // Underlined on hover and focus only: every headline in the
                            // list is a link, and a column of underlines reads as noise.
                            className={`inline-block min-h-6 rounded text-text decoration-1 underline-offset-[3px] hover:underline focus-visible:underline ${
                              excerpts ? "font-semibold" : ""
                            }`}
                          >
                            {item.title}
                          </a>
                        ) : (
                          <span className={`text-text ${excerpts ? "font-semibold" : ""}`}>{item.title}</span>
                        )}
                        {excerpts && item.excerpt && <span className="block text-sm text-muted">{item.excerpt}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <Disclosure summary="Read brief" openSummary="Hide brief" className="mt-2">
                  <Markdown text={brief.content_md} className="mt-1 max-w-prose text-sm" />
                </Disclosure>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
