import { ButtonLink } from "@/components/ui/button";
import { publicEnv } from "@/lib/env/public";
import type { PublicEvent } from "@/lib/data/events";
import { buildWhatsAppContactUrl } from "@/lib/whatsapp";

import { EventCard } from "./event-card";

type EventGridProps = {
  events: PublicEvent[];
  loadFailed?: boolean;
};

function EmptyState({ loadFailed }: { loadFailed?: boolean }) {
  const instagramUrl = publicEnv.instagramUrl.trim() || null;

  return (
    <div className="rounded-[1.75rem] border border-line bg-surface p-7 shadow-soft sm:p-10">
      <p className="font-mono text-micro uppercase tracking-[0.12em] text-olive">
        {loadFailed ? "Temporarily unavailable" : "Next announcement"}
      </p>

      <p className="mt-4 font-display text-h1 uppercase">
        {loadFailed
          ? "Events are temporarily unavailable."
          : "No events yet."}
      </p>

      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        {loadFailed
          ? "We could not reach the event database. Refresh the page in a moment, or check our Instagram for the latest announcement."
          : "We are cooking something. Follow us or check back soon for the next LOUD JAKARTA night."}
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        {instagramUrl ? (
          <ButtonLink
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-ink text-white hover:bg-olive hover:text-white"
          >
            Instagram
          </ButtonLink>
        ) : (
          <span className="font-mono text-micro uppercase tracking-[0.12em] text-muted">
            Instagram link coming soon
          </span>
        )}
      </div>
    </div>
  );
}

export function EventGrid({ events, loadFailed }: EventGridProps) {
  const whatsappUrl = buildWhatsAppContactUrl(
    publicEnv.defaultWhatsappNumber,
  );

  return (
    <section
      id="events"
      aria-labelledby="events-heading"
      className="scroll-mt-20 border-b border-line"
    >
      <div className="shell py-[clamp(64px,9vw,120px)]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-olive">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-accent"
              />
              01 — The lineup
            </span>
            <h2
              id="events-heading"
              className="mt-5 font-display text-h1 uppercase"
            >
              Upcoming events
            </h2>
          </div>

          <div className="flex max-w-sm flex-col items-start gap-4 sm:items-end">
            <p className="text-sm leading-relaxed text-muted sm:text-right">
              Flyer first. Details second. RSVP directly on WhatsApp — guestlist
              is invite only.
            </p>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-paper transition-colors hover:border-ink hover:bg-ink hover:text-white"
              >
                RSVP on WhatsApp <span aria-hidden="true">↗</span>
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {["All nights", "Invite only", "Jakarta, ID"].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-muted"
            >
              {chip}
            </span>
          ))}
        </div>

        {events.length === 0 ? (
          <div className="mt-8">
            <EmptyState loadFailed={loadFailed} />
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
