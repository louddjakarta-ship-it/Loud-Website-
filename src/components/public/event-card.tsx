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
      className="absolute inset-0 flex flex-col justify-between overflow-hidden bg-ink p-5"
    >
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #F2F2ED 0 1px, transparent 1px 16px)",
        }}
      />
      <div className="relative flex items-start justify-between gap-4 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-white/50">
        <span>LOUD JAKARTA</span>
        <span className="text-right text-accent">Flyer TBA</span>
      </div>

      <p className="relative font-display text-[clamp(1.75rem,4vw,3rem)] uppercase leading-[0.86] text-white">
        {event.name}
      </p>

      <div className="relative flex items-end justify-between gap-4">
        <span className="block h-px flex-1 bg-accent/70" />
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-accent">
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
    <article className="group flex flex-col rounded-[1.75rem] border border-line bg-surface p-3 shadow-soft transition-transform duration-300 ease-out-expo hover:-translate-y-1">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-line">
        {flyerUrl ? (
          <Image
            src={flyerUrl}
            alt={`Flyer for ${event.name}`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.03]"
          />
        ) : (
          <FlyerPlaceholder event={event} />
        )}

        <span className="absolute left-3 top-3 rounded-full bg-ink/90 px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-white backdrop-blur">
          {formatEventDate(event.event_date)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-3 pt-4 sm:p-4">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-olive">
            {formatEventDateTime(event.event_date)}
          </p>

          <h3 className="mt-2 font-display text-3xl uppercase leading-[0.95]">
            {event.name}
          </h3>

          <p className="mt-1.5 text-sm text-muted">
            {event.venue?.trim() || "Venue TBA"}
          </p>
        </div>

        {event.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted">
            {event.description}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
          {rsvpUrl ? (
            <ButtonLink
              href={rsvpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-ink text-white hover:bg-olive hover:text-white"
              aria-label={`RSVP via WhatsApp for ${event.name}`}
            >
              RSVP via WhatsApp
            </ButtonLink>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex h-11 cursor-not-allowed items-center rounded-full border border-line px-5 font-mono text-micro uppercase tracking-[0.12em] text-muted"
            >
              RSVP coming soon
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
