import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/admin/login/actions";
import { getAdminSession, getCurrentUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin access denied",
  robots: { index: false, follow: false },
};

type UnauthorizedPageProps = {
  searchParams: Promise<{ reason?: string | string[] }>;
};

export default async function AdminUnauthorizedPage({
  searchParams,
}: UnauthorizedPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  const admin = await getAdminSession();
  const params = await searchParams;
  const reason = Array.isArray(params.reason)
    ? params.reason[0]
    : params.reason;

  const content = !admin
    ? {
        title: "No admin access.",
        message:
          "This account is signed in, but it does not have an active admin profile. Ask the LOUD JAKARTA owner to grant access or reactivate your account.",
      }
    : reason === "role"
      ? {
          title: "Super admin only.",
          message:
            "This action requires the super admin role. Ask the owner to make the change, or use a super admin account.",
        }
      : {
          title: "Access denied.",
          message: "Your account cannot open that admin page.",
        };

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

      <main
        id="main"
        className="flex flex-1 items-center justify-center px-5 py-16"
      >
        <div className="w-full max-w-lg border border-danger/40 bg-surface p-6 sm:p-8">
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-danger">
            Access denied
          </p>

          <h1 className="mt-3 font-display text-h1 uppercase">
            {content.title}
          </h1>

          <p className="mt-4 text-base leading-relaxed text-muted">
            {content.message}
          </p>

          <p className="mt-5 border-t border-line pt-4 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
            Signed in as {user.email ?? "unknown account"}
            {admin ? ` · ${admin.role === "super_admin" ? "Super admin" : "Staff"}` : ""}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex h-11 items-center border border-accent bg-accent px-5 font-mono text-micro uppercase tracking-[0.12em] text-ink transition-colors hover:bg-paper"
              >
                Sign out
              </button>
            </form>

            <Link
              href="/"
              className="inline-flex h-11 items-center border border-line px-5 font-mono text-micro uppercase tracking-[0.12em] text-paper transition-colors hover:border-accent hover:text-accent"
            >
              Back to site
            </Link>
          </div>
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
