import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { getDjPhotoPublicUrl, type PublicDj } from "@/lib/data/djs";
import { getFlyerPublicUrl, type PublicEvent } from "@/lib/data/events";
import { publicEnv } from "@/lib/env/public";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { splitTagline } from "@/lib/site-settings";
import { buildWhatsAppContactUrl } from "@/lib/whatsapp";

function CollageTile({
  label,
  src,
  alt,
  className = "",
}: {
  label: string;
  src: string | null;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-surface ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 24vw, 80vw"
          className="object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col justify-between overflow-hidden p-4"
        >
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, #F2F2ED 0 1px, transparent 1px 14px)",
            }}
          />
          <span className="relative font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted">
            {label}
          </span>
          <span className="relative font-display text-3xl uppercase leading-none text-paper/80">
            LOUD
          </span>
        </div>
      )}
    </div>
  );
}

export function Hero({
  tagline,
  description,
  nextEvent,
  djs,
}: {
  tagline: string;
  description: string;
  nextEvent: PublicEvent | null;
  djs: PublicDj[];
}) {
  const whatsappUrl = buildWhatsAppContactUrl(
    publicEnv.defaultWhatsappNumber,
  );
  const taglineLines = splitTagline(tagline);
  const flyerUrl = getFlyerPublicUrl(nextEvent?.flyer_path ?? null);
  const djPhotoUrl = getDjPhotoPublicUrl(djs[0]?.photo_path ?? null);

  return (
    <section className="theme-dark relative overflow-hidden bg-ink">
      <div
        aria-hidden="true"
        className="hero-glow pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="shell relative py-[clamp(56px,8vw,112px)]">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-white/70">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-accent"
              />
              Jakarta · Indonesia
            </span>

            <h1 className="mt-7 font-display text-display-xl uppercase">
              {taglineLines.map((line, index) => (
                <span
                  key={`${index}-${line}`}
                  className={index === 0 ? "block" : "block text-accent"}
                >
                  {line}
                </span>
              ))}
            </h1>

            <p className="mt-7 max-w-xl text-balance text-lg leading-relaxed text-muted">
              {description}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href="/#events" size="lg">
                Explore the lineup
              </ButtonLink>
              {whatsappUrl ? (
                <ButtonLink
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="lg"
                  variant="outline"
                >
                  Join the guestlist
                </ButtonLink>
              ) : (
                <ButtonLink
                  href="/#djs"
                  size="lg"
                  variant="outline"
                >
                  Meet the DJs
                </ButtonLink>
              )}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-white/50">
              <span>Electronic / Nightlife</span>
              <span aria-hidden="true" className="h-px w-8 bg-white/20" />
              <span>Invite only guestlist</span>
              <span aria-hidden="true" className="h-px w-8 bg-white/20" />
              <span>Est. 2026</span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div
                aria-hidden="true"
                className="absolute -inset-6 -z-10 rounded-[3rem] bg-accent/10 blur-3xl"
              />
              <div className="grid grid-cols-2 gap-3">
                <CollageTile
                  label="Next flyer"
                  src={flyerUrl}
                  alt={
                    nextEvent
                      ? `Flyer for ${nextEvent.name}`
                      : "LOUD JAKARTA flyer"
                  }
                  className="col-span-2 aspect-[16/10]"
                />
                <CollageTile
                  label="Resident"
                  src={djPhotoUrl}
                  alt={
                    djs[0]
                      ? `Presskit photo of ${djs[0].stage_name}`
                      : "LOUD JAKARTA DJ"
                  }
                  className="aspect-[4/5]"
                />

                <div className="flex aspect-[4/5] flex-col justify-between rounded-[1.5rem] bg-accent p-4 text-ink">
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em]">
                    LOUD JAKARTA
                  </span>
                  <span className="font-display text-[clamp(2rem,4vw,3.25rem)] uppercase leading-[0.82]">
                    Make
                    <br />
                    noise.
                  </span>
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.14em]">
                    Vol. 001 — JKT
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <dl className="mt-12 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3 sm:gap-8">
          <div>
            <dt className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white/55">
              Next event
            </dt>
            <dd className="mt-2 font-display text-xl uppercase">
              {nextEvent ? formatEventDate(nextEvent.event_date) : "Announcing soon"}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white/55">
              Venue
            </dt>
            <dd className="mt-2 font-display text-xl uppercase">
              {nextEvent?.venue?.trim() || "Jakarta"}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white/55">
              Doors
            </dt>
            <dd className="mt-2 font-display text-xl uppercase">
              {nextEvent ? formatEventTime(nextEvent.event_date) : "See flyer"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="shell relative pb-6">
        <Link
          href="/#events"
          className="group inline-flex items-center gap-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-accent"
        >
          <span className="block h-px w-8 bg-current transition-all group-hover:w-12" />
          Scroll for the lineup
        </Link>
      </div>
    </section>
  );
}
