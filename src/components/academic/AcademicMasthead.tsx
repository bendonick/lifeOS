import { ArtworkCaption, ArtworkControls, ArtworkImage, ArtworkProvider } from "@/components/lifeos/ArtworkFrame";

// The Academic page's masthead (decision #91): the institution, the page title
// and the live semester line on the left; a print in a shallow panoramic slot
// on the right; and under both, the page's section links. The print's controls
// sit at the end of that link row rather than under the image, so browsing and
// pinning cost the header no height.

export interface SectionLink {
  id: string;
  label: string;
  /** A small count after the label — pending reminders — shown only above zero. */
  count?: number;
}

export function AcademicMasthead({
  semester,
  week,
  sections,
  artworkId,
  dailyArtworkId,
  pinnedArtworkId,
}: {
  /** "Autumn semester 2026", from the enrolled courses. */
  semester: string;
  /** "week 10 of 17" — what the navigation rail's footer used to say. */
  week: string | null;
  sections: SectionLink[];
  artworkId: string;
  dailyArtworkId: string;
  pinnedArtworkId: string | null;
}) {
  return (
    <ArtworkProvider collection="academic" initialId={artworkId} dailyId={dailyArtworkId} pinnedId={pinnedArtworkId}>
      <div className="grid items-center gap-x-9 gap-y-4 pt-3 md:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">University</p>
          <h1 className="t-serif mt-0.5 text-[clamp(2.25rem,4.2vw,3rem)] leading-none text-text">Academic</h1>
          {(semester || week) && (
            <p className="t-serif !font-medium mt-1.5 text-lg italic text-text">
              {semester}
              {semester && week && <span className="text-muted"> · {week}</span>}
              {!semester && week}
            </p>
          )}
        </div>
        <ArtworkImage aspect="aspect-[5/1]" />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-border pb-1.5">
        <nav aria-label="Sections of this page">
          <ul className="flex flex-wrap items-center gap-y-1">
            {sections.map((s, i) => (
              <li key={s.id} className="flex items-center">
                {i > 0 && <span aria-hidden="true" className="mx-3 h-4 w-px bg-(--color-rust) sm:mx-4" />}
                <a
                  href={`#${s.id}`}
                  className="inline-flex min-h-7 items-center rounded px-1 text-sm text-text underline-offset-4 hover:underline"
                >
                  {s.label}
                  {s.count ? (
                    <span className="tabular ml-1.5 text-muted">
                      {s.count}
                      <span className="sr-only"> pending</span>
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ArtworkCaption className="hidden text-right sm:block" />
          <ArtworkControls />
        </div>
      </div>
    </ArtworkProvider>
  );
}
