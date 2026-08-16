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
  children,
}: {
  /** Sub-page name for the breadcrumb; omit on the hub itself. */
  page?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-16">
      <div className="material sticky top-0 z-20 -mx-6 mb-8 border-b border-border/80 bg-bg/70 px-6 py-4 backdrop-blur-xl">
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
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-10">{children}</div>
    </main>
  );
}
