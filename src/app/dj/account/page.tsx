import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { requireDj } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default async function DjAccountPage() {
  await requireDj();

  return (
    <div className="max-w-xl space-y-8">
      <header className="border-b border-line pb-6">
        <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
          Access
        </p>
        <h1 className="mt-2 font-display text-h1 uppercase">Account</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Change the password you use to sign in and edit your presskit.
        </p>
      </header>

      <section
        aria-labelledby="password-heading"
        className="border border-line bg-surface p-5 sm:p-6"
      >
        <h2 id="password-heading" className="font-display text-2xl uppercase">
          Change password
        </h2>
        <div className="mt-5">
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
