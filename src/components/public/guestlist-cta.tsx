import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { publicEnv } from "@/lib/env/public";
import { buildWhatsAppContactUrl } from "@/lib/whatsapp";

export function GuestlistCta() {
  const whatsappUrl = buildWhatsAppContactUrl(
    publicEnv.defaultWhatsappNumber,
  );
  const instagramUrl = publicEnv.instagramUrl.trim() || null;
  const contactUrl = whatsappUrl ?? instagramUrl;

  return (
    <section className="border-b border-line bg-bone">
      <div className="shell py-[clamp(56px,8vw,104px)]">
        <div className="theme-dark relative overflow-hidden rounded-[2rem] border border-white/10 bg-ink">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
          />

          <div className="relative grid gap-10 p-7 sm:p-10 lg:grid-cols-12 lg:items-center lg:gap-8 lg:p-12">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-white/70">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-accent"
                />
                Guestlist — invite only
              </span>

              <h2 className="mt-6 font-display text-h1 uppercase">
                Skip the
                <br />
                group chat.
              </h2>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
                Guestlist links are private and shared per event. Send your
                details once, then wait for the team to approve your spot.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {contactUrl ? (
                  <ButtonLink
                    href={contactUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="lg"
                  >
                    {whatsappUrl ? "Message us on WhatsApp" : "Follow on Instagram"}
                  </ButtonLink>
                ) : null}
                <ButtonLink
                  href="/#how-it-works"
                  size="lg"
                  variant="outline"
                >
                  How it works
                </ButtonLink>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative mx-auto w-full max-w-sm rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between font-mono text-[0.55rem] uppercase tracking-[0.16em] text-white/55">
                  <span>LOUD JAKARTA</span>
                  <span>Vol. 001</span>
                </div>

                <p className="mt-8 font-display text-[clamp(3rem,7vw,4.5rem)] uppercase leading-[0.82] text-accent">
                  LIST
                  <br />
                  ONLY
                </p>

                <div
                  aria-hidden="true"
                  className="my-6 border-t border-dashed border-white/15"
                />

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-white/55">
                      Entry
                    </p>
                    <p className="mt-1 font-display text-xl uppercase">
                      RSVP required
                    </p>
                  </div>
                  <span className="rounded-full bg-accent px-3 py-1.5 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-ink">
                    Private
                  </span>
                </div>
              </div>

              <p className="mt-4 text-center font-mono text-[0.55rem] uppercase tracking-[0.1em] text-white/55">
                Links are shared on Instagram and WhatsApp
              </p>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-muted">
          Have a question?{" "}
          <Link
            href="/privacy"
            className="text-olive underline decoration-olive/40 underline-offset-4 hover:text-paper"
          >
            Read how your data is handled.
          </Link>
        </p>
      </div>
    </section>
  );
}
