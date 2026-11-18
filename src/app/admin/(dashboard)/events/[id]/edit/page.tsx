import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { CopyGuestlistLink } from "@/components/admin/copy-guestlist-link";
import { EventForm } from "@/components/admin/event-form";
import { requireAdmin } from "@/lib/auth/admin";
import { getFlyerPublicUrl } from "@/lib/data/events";
import { absoluteUrl } from "@/lib/site";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit event",
  robots: { index: false, follow: false },
};

type EditEventPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: EditEventPageProps) {
  await requireAdmin();

  const { id } = await params;
  const parsedId = z.uuid().safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id,name,slug,description,event_date,venue,maps_url,whatsapp_number,flyer_path,registration_open,is_published,guestlist_token",
    )
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error || !event) {
    notFound();
  }

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
          Edit
        </p>
        <h1 className="mt-2 font-display text-h1 uppercase">{event.name}</h1>
        <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
          /{event.slug}
        </p>
      </header>

      <section
        aria-labelledby="guestlist-link-heading"
        className="border border-line bg-surface p-5"
      >
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-accent">
          Private
        </p>
        <h2
          id="guestlist-link-heading"
          className="mt-2 font-display text-2xl uppercase"
        >
          Guestlist link
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Only guests with this link can open the registration form. The link
          works while the event is published, not archived, registration is open,
          and the event date has not passed.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            aria-label="Guestlist share link"
            value={absoluteUrl(`/guestlist/${event.guestlist_token}`)}
            className="min-w-0 flex-1 border border-line bg-ink px-3 py-2 font-mono text-[0.65rem] text-paper outline-none focus:border-accent"
          />
          <CopyGuestlistLink
            url={absoluteUrl(`/guestlist/${event.guestlist_token}`)}
            label="Copy link"
            className="border border-accent bg-accent px-4 py-2 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-paper"
          />
          <a
            href={absoluteUrl(`/guestlist/${event.guestlist_token}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-line px-4 py-2 text-center font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Open
          </a>
        </div>
      </section>

      <EventForm
        mode="edit"
        event={{
          id: event.id,
          name: event.name,
          slug: event.slug,
          description: event.description,
          eventDate: event.event_date,
          venue: event.venue,
          mapsUrl: event.maps_url,
          whatsappNumber: event.whatsapp_number,
          registrationOpen: event.registration_open,
          isPublished: event.is_published,
          flyerUrl: getFlyerPublicUrl(event.flyer_path),
        }}
      />
    </div>
  );
}
