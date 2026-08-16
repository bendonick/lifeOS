import type { ReactNode } from "react";
import Link from "next/link";

/** Page anatomy step 1 (docs/02-design-system.md): breadcrumb + page title. */
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
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="text-xs text-faint">
        {page ? (
          <>
            <Link href="/" className="hover:text-muted">
              LifeOS
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-muted">{page}</span>
          </>
        ) : (
          <span>LifeOS</span>
        )}
      </div>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-8 flex flex-col gap-10">{children}</div>
    </main>
  );
}
