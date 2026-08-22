import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Page anatomy step 1 (docs/02-design-system.md): breadcrumb + page title.
 *
 * The header is a sticky translucent layer with content scrolling underneath
 * rather than an opaque bar consuming a fixed strip. `.material` is the hook the
 * prefers-reduced-transparency / prefers-contrast fallbacks in globals.css use
 * to make it solid.
 */
export function PageShell({
  page,
  title,
  subtitle,
  theme,
  children,
}: {
  /** Sub-page name for the breadcrumb; omit on the hub itself. */
  page?: string;
  title: string;
  subtitle?: string;
  /** Opt-in theme class (currently `theme-editorial`, prototyped on /personal).
   *  Applied here rather than on <body> so two themes can coexist while one is
   *  being judged, and so the page paints its own ground. */
  theme?: string;
  children: ReactNode;
}) {
  // The theme wrapper is full-bleed and the column sits inside it: painting the
  // ground on the centred <main> left the page's own background showing down
  // both margins, which read as a slab rather than a page.
  // The theme wrapper is full-bleed and the column sits inside it: painting the
  // ground on the centred <main> left the page's own background showing down
  // both margins, and the sticky header read as a floating slab because it
  // stopped at the column's edge. The header now spans the viewport and centres
  // its own content, which is what a sticky bar has to do to look attached.
  return (
    <div className={`min-h-screen ${theme ?? ""}`}>
      <header
        data-page-header=""
        className="material sticky top-0 z-20 border-b border-border/80 bg-bg/70 backdrop-blur-xl"
      >
        {/* 120rem, not 6xl: at 72rem the column read as a slab with dead
            gutters the moment the effective viewport widened (80% browser
            zoom ≈ 1,800px). The ceiling only exists to bound prose measure on
            ultra-wide displays; header and main share it so the sticky bar's
            content stays aligned with the column. */}
        <div className="mx-auto max-w-[120rem] px-6 py-4">
          <nav aria-label="Breadcrumb" className="text-xs text-faint">
            {page ? (
              <>
                <Link href="/" className="hover:text-muted">
                  LifeOS
                </Link>
                <span className="mx-1.5" aria-hidden="true">
                  /
                </span>
                <span className="text-muted">{page}</span>
              </>
            ) : (
              <span>LifeOS</span>
            )}
          </nav>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <h1 className="t-serif text-3xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[120rem] px-6 pt-8 pb-16">
        <div className="flex flex-col gap-10">{children}</div>
      </main>
    </div>
  );
}
