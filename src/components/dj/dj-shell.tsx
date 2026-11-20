import Link from "next/link";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/admin/login/actions";
import type { AdminSession } from "@/lib/auth/admin";
import { hasAdminAccess } from "@/lib/auth/roles";

export function DjShell({
  admin,
  publicSlug,
  children,
}: {
  admin: AdminSession;
  /** Slug of the published presskit, when there is one. */
  publicSlug: string | null;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-md">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dj"
              className="font-display text-xl uppercase leading-none tracking-tight transition-colors hover:text-accent"
            >
              LOUD JAKARTA
            </Link>
            <span className="hidden border border-line px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-accent sm:inline-block">
              DJ
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-paper">
                {admin.displayName || admin.email || "DJ"}
              </p>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
                Presskit editor
              </p>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="border border-line px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-danger hover:text-danger"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <nav
          aria-label="DJ"
          className="shell flex gap-1 overflow-x-auto border-t border-line/60 py-2"
        >
          <Link
            href="/dj"
            className="shrink-0 px-3 py-2 font-mono text-micro uppercase tracking-[0.12em] text-muted transition-colors hover:text-paper"
          >
            My presskit
          </Link>
          <Link
            href="/dj/account"
            className="shrink-0 px-3 py-2 font-mono text-micro uppercase tracking-[0.12em] text-muted transition-colors hover:text-paper"
          >
            Account
          </Link>

          {publicSlug ? (
            <Link
              href={`/djs/${publicSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-3 py-2 font-mono text-micro uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent"
            >
              View public page ↗
            </Link>
          ) : null}

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {hasAdminAccess(admin.roles) ? (
              <Link
                href="/admin"
                className="px-3 py-2 font-mono text-micro uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent"
              >
                Admin dashboard
              </Link>
            ) : null}
            <Link
              href="/djs"
              className="px-3 py-2 font-mono text-micro uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent"
            >
              All DJs ↗
            </Link>
          </div>
        </nav>
      </header>

      <main id="main" className="shell py-10">
        {children}
      </main>
    </div>
  );
}
