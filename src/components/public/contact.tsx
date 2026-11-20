import { ButtonLink } from "@/components/ui/button";
import { publicEnv } from "@/lib/env/public";
import { buildWhatsAppContactUrl } from "@/lib/whatsapp";

export function Contact() {
  const whatsappUrl = buildWhatsAppContactUrl(
    publicEnv.defaultWhatsappNumber,
  );
  const instagramUrl = publicEnv.instagramUrl.trim() || null;

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="scroll-mt-20 border-b border-line bg-bone"
    >
      <div className="shell py-[clamp(64px,9vw,120px)]">
        <div className="grid overflow-hidden rounded-[2rem] border border-line bg-surface shadow-soft lg:grid-cols-12">
          <div className="p-7 sm:p-10 lg:col-span-7 lg:p-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-bone px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-olive">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-accent"
              />
              05 — Contact
            </span>

            <h2 id="contact-heading" className="mt-5 font-display text-h1 uppercase">
              Come say hi.
            </h2>

            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted">
              Questions about a night, the guestlist or a collab? Message the
              team — we answer between setup and soundcheck.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {whatsappUrl ? (
                <ButtonLink
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-ink text-white hover:bg-olive hover:text-white"
                >
                  WhatsApp us <span aria-hidden="true">↗</span>
                </ButtonLink>
              ) : null}
              {instagramUrl ? (
                <ButtonLink
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                >
                  Instagram <span aria-hidden="true">↗</span>
                </ButtonLink>
              ) : null}
            </div>

            <dl className="mt-10 grid gap-4 border-t border-line pt-6 font-mono text-[0.6rem] uppercase tracking-[0.1em] sm:grid-cols-3">
              <div>
                <dt className="text-muted">Based</dt>
                <dd className="mt-2 text-paper">Jakarta, ID</dd>
              </div>
              <div>
                <dt className="text-muted">Nights</dt>
                <dd className="mt-2 text-paper">Event calendar</dd>
              </div>
              <div>
                <dt className="text-muted">Time zone</dt>
                <dd className="mt-2 text-paper">WIB (UTC+7)</dd>
              </div>
            </dl>
          </div>

          <div className="relative min-h-[18rem] overflow-hidden border-t border-line bg-ink p-7 sm:p-10 lg:col-span-5 lg:border-l lg:border-t-0">
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
            />
            <div className="relative flex h-full flex-col justify-between">
              <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white/55">
                LOUD JAKARTA — EST. 2026
              </span>

              <p className="font-display text-[clamp(3.5rem,8vw,6rem)] uppercase leading-[0.8] text-white">
                MAKE
                <br />
                <span className="text-accent">NOISE.</span>
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-accent px-3 py-1.5 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-ink">
                  Electronic
                </span>
                <span className="rounded-full border border-white/15 px-3 py-1.5 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-white/60">
                  Nightlife
                </span>
                <span className="rounded-full border border-white/15 px-3 py-1.5 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-white/60">
                  Jakarta
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
