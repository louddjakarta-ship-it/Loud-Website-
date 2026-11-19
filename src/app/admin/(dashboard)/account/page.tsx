import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default async function AdminAccountPage() {
  const admin = await requireAdmin();

  return (
    <div className="space-y-10">
      <header className="border-b border-line pb-6">
        <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
          Account
        </p>
        <h1 className="mt-2 font-display text-h1 uppercase">Change password</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Signed in as{" "}
          <span className="font-mono text-paper">
            {admin.displayName || admin.email || "Admin"}
          </span>
          . Replace your temporary password with one only you know.
        </p>
      </header>

      <section
        aria-labelledby="change-password-heading"
        className="border border-line bg-surface p-5 sm:p-6"
      >
        <h2
          id="change-password-heading"
          className="font-display text-2xl uppercase"
        >
          Password
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Enter your current password once, then choose a new one. Other
          sessions stay signed in.
        </p>

        <div className="mt-5 max-w-xl">
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
