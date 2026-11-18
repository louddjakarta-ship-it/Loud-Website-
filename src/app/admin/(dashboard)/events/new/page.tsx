import type { Metadata } from "next";
import Link from "next/link";

import { EventForm } from "@/components/admin/event-form";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New event",
  robots: { index: false, follow: false },
};

export default async function NewEventPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="border-b border-line pb-6">
        <Link
          href="/admin/events"
          className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted transition-colors hover:text-accent"
        >
          ← Back to events
        </Link>

        <p className="mt-4 font-mono text-micro uppercase tracking-[0.12em] text-accent">
          Create
        </p>
        <h1 className="mt-2 font-display text-h1 uppercase">New event</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Draft by default. Publish only when the flyer, date and venue are
          final.
        </p>
      </header>

      <EventForm mode="create" />
    </div>
  );
}
