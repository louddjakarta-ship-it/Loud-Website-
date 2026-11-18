import { ButtonLink } from "@/components/ui/button";
import { publicEnv } from "@/lib/env/public";
import type { PublicEvent } from "@/lib/data/events";

import { EventCard } from "./event-card";

type EventGridProps = {
  events: PublicEvent[];
  loadFailed?: boolean;
};

function EmptyState({ loadFailed }: { loadFailed?: boolean }) {
  const instagramUrl = publicEnv.instagramUrl.trim() || null;

  return (
    <div className="border border-line bg-surface p-7 sm:p-10">
      <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
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
            variant="outline"
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
  return (
    <section
      id="events"
      aria-labelledby="events-heading"
      className="scroll-mt-20 border-b border-line"
    >
      <div className="shell py-[clamp(72px,10vw,140px)]">
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
              01 — Upcoming
            </p>
            <h2
              id="events-heading"
              className="mt-3 font-display text-h1 uppercase"
            >
              Upcoming events
            </h2>
          </div>

          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Flyer first. Details second. RSVP directly on WhatsApp — guestlist is
            invite only.
          </p>
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
