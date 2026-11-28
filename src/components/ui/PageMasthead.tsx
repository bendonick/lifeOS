import type { ReactNode } from "react";
import { ArtworkCaption, ArtworkControls, ArtworkImage, ArtworkProvider } from "@/components/lifeos/ArtworkFrame";
import type { ArtworkCollection } from "@/lib/overview/artwork";

// The masthead of a Maritime section page (decision #91; first built for
// Academic, shared when Personal adopted it): a small label, the page title
// and one live italic line on the left; a print in a shallow panoramic slot on
// the right; and under both, the page's section links. The print's controls
// sit at the end of that link row rather than under the image, so browsing and
// pinning cost the header no height. Without a print, the title block takes
// the full width and the link row ends at the links.

export interface SectionLink {
  id: string;
  label: string;
  /** A small count after the label (pending reminders), shown only above zero. */
  count?: number;
}

export interface MastheadArtwork {
  /** Whose prints these are, and whose pin is stored. */
  collection: ArtworkCollection;
  artworkId: string;
  dailyArtworkId: string;
  pinnedArtworkId: string | null;
}

export function PageMasthead({
  eyebrow,
  title,
  subtitle,
  sections,
  artwork,
}: {
  /** The small uppercase label above the title: "University", "Home". */
  eyebrow: string;
  title: string;
  /** The italic line under the title; null hides it. */
  subtitle: ReactNode;
  sections: SectionLink[];
  artwork?: MastheadArtwork;
}) {
  const head = (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
      <h1 className="t-serif mt-0.5 text-[clamp(2.25rem,4.2vw,3rem)] leading-none text-text">{title}</h1>
      {subtitle && <p className="t-serif !font-medium mt-1.5 text-lg italic text-text">{subtitle}</p>}
    </div>
  );

  const links = (
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
  );

  const rowClass =
    "mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-border pb-1.5";

  if (!artwork) {
    return (
      <>
        <div className="pt-3">{head}</div>
        <div className={rowClass}>{links}</div>
      </>
    );
  }

  return (
    <ArtworkProvider
      collection={artwork.collection}
      initialId={artwork.artworkId}
      dailyId={artwork.dailyArtworkId}
      pinnedId={artwork.pinnedArtworkId}
    >
      <div className="grid items-center gap-x-9 gap-y-4 pt-3 md:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
        {head}
        <ArtworkImage aspect="aspect-[5/1]" />
      </div>

      <div className={rowClass}>
        {links}
        <div className="ml-auto flex items-center gap-3">
          <ArtworkCaption className="hidden text-right sm:block" />
          <ArtworkControls />
        </div>
      </div>
    </ArtworkProvider>
  );
}
