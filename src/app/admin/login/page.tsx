import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

type AdminLoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next =
    rawNext && rawNext.startsWith("/admin") && !rawNext.startsWith("//")
      ? rawNext
      : undefined;

  return (
    <div className="flex min-h-dvh flex-col bg-ink">
      <header className="border-b border-line">
        <div className="shell flex h-16 items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl uppercase leading-none tracking-tight transition-colors hover:text-accent"
          >
            LOUD JAKARTA
          </Link>
          <span className="font-mono text-micro uppercase tracking-[0.12em] text-muted">
            Admin
          </span>
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md border border-line bg-surface p-6 sm:p-8">
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
            Restricted access
          </p>

          <h1 className="mt-3 font-display text-h1 uppercase">Sign in.</h1>

          <p className="mt-3 text-sm leading-relaxed text-muted">
            Admin dashboard for events, guestlist review and CSV export.
          </p>

          <LoginForm next={next} />
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="shell py-5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted">
          LOUD JAKARTA · Internal tool
        </div>
      </footer>
    </div>
  );
}
