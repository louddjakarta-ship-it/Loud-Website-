"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/admin/login/actions";
import type { AdminSession } from "@/lib/auth/admin";
import { cn } from "@/lib/cn";

const navItems = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/events", label: "Events", exact: false },
  { href: "/admin/gallery", label: "Gallery", exact: false },
  { href: "/admin/guestlist", label: "Guestlist", exact: false },
] as const;

export function AdminShell({
  admin,
  children,
}: {
  admin: AdminSession;
  children: ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-md">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="font-display text-xl uppercase leading-none tracking-tight transition-colors hover:text-accent"
            >
              LOUD JAKARTA
            </Link>
            <span className="hidden border border-line px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-accent sm:inline-block">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-paper">
                {admin.displayName || admin.email || "Admin"}
              </p>
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
                {admin.role === "super_admin" ? "Super admin" : "Staff"}
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
          aria-label="Admin"
          className="shell flex gap-1 overflow-x-auto border-t border-line/60 py-2"
        >
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 px-3 py-2 font-mono text-micro uppercase tracking-[0.12em] transition-colors",
                  active
                    ? "bg-accent text-ink"
                    : "text-muted hover:text-paper",
                )}
              >
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto shrink-0 px-3 py-2 font-mono text-micro uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent"
          >
            View site ↗
          </Link>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <div className="shell py-8 sm:py-10">{children}</div>
      </main>

      <footer className="border-t border-line">
        <div className="shell flex flex-col gap-1 py-4 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>LOUD JAKARTA · Internal tool</span>
          <span>Guestlist reviews are recorded with admin identity</span>
        </div>
      </footer>
    </div>
  );
}
