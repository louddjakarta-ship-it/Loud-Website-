import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";
import { getFlyerPublicUrl, type PublicEvent } from "@/lib/data/events";
import { formatEventDate, formatEventDateTime } from "@/lib/format";
import { buildRsvpUrl } from "@/lib/whatsapp";
import { publicEnv } from "@/lib/env/public";

function FlyerPlaceholder({ event }: { event: PublicEvent }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex flex-col justify-between overflow-hidden bg-surface p-5"
    >
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #F2F2ED 0 1px, transparent 1px 16px)",
        }}
      />
      <div className="relative flex items-start justify-between gap-4 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">
        <span>LOUD JAKARTA</span>
        <span className="text-right">Flyer TBA</span>
      </div>

      <p className="relative font-display text-[clamp(1.75rem,4vw,3rem)] uppercase leading-[0.86] text-paper/90">
        {event.name}
      </p>

      <div className="relative flex items-end justify-between gap-4">
        <span className="block h-px flex-1 bg-accent/70" />
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-accent">
          {formatEventDate(event.event_date)}
        </span>
      </div>
    </div>
  );
}

export function EventCard({ event }: { event: PublicEvent }) {
  const flyerUrl = getFlyerPublicUrl(event.flyer_path);
  const rsvpUrl = buildRsvpUrl({
    eventName: event.name,
    eventNumber: event.whatsapp_number,
    fallbackNumber: publicEnv.defaultWhatsappNumber,
  });

  return (
    <article className="group flex flex-col border border-line bg-surface">
      <div className="relative aspect-[4/5] overflow-hidden border-b border-line bg-line">
        {flyerUrl ? (
          <Image
            src={flyerUrl}
            alt={`Flyer for ${event.name}`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.02]"
          />
        ) : (
          <FlyerPlaceholder event={event} />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div>
          <time
            dateTime={event.event_date}
            className="font-mono text-micro uppercase tracking-[0.12em] text-accent"
          >
            {formatEventDateTime(event.event_date)}
          </time>

          <h3 className="mt-3 font-display text-3xl uppercase leading-[0.95]">
            {event.name}
          </h3>

          <p className="mt-2 text-sm text-muted">
            {event.venue?.trim() || "Venue TBA"}
          </p>

          {event.maps_url ? (
            <a
              href={event.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open the location of ${event.name} in Google Maps`}
              className="mt-3 inline-flex items-center gap-1.5 border border-line px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted transition-colors hover:border-accent hover:text-accent"
            >
              Open in Google Maps ↗
            </a>
          ) : null}
        </div>

        {event.description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted">
            {event.description}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
          {rsvpUrl ? (
            <ButtonLink
              href={rsvpUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="md"
              aria-label={`RSVP via WhatsApp for ${event.name}`}
            >
              RSVP via WhatsApp
            </ButtonLink>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex h-11 cursor-not-allowed items-center border border-line px-5 font-mono text-micro uppercase tracking-[0.12em] text-muted"
            >
              RSVP contact coming soon
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
