import Link from "next/link";

import { publicEnv } from "@/lib/env/public";
import { buildWhatsAppContactUrl } from "@/lib/whatsapp";

export function SiteFooter() {
  const instagramUrl = publicEnv.instagramUrl.trim() || null;
  const whatsappUrl = buildWhatsAppContactUrl(
    publicEnv.defaultWhatsappNumber,
  );
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line">
      <div className="shell grid gap-10 py-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="font-display text-3xl uppercase leading-none">
            LOUD JAKARTA
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Underground nightlife, electronic music and contemporary culture
            in Jakarta. We don&apos;t follow the noise. We make it.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="flex flex-col gap-3 font-mono text-micro uppercase tracking-[0.12em] lg:col-span-3"
        >
          <span className="text-muted/60">Explore</span>
          <Link href="/#events" className="text-paper hover:text-accent">
            Upcoming events
          </Link>
          <Link href="/guestlist" className="text-paper hover:text-accent">
            Guestlist
          </Link>
          <Link href="/privacy" className="text-paper hover:text-accent">
            Privacy
          </Link>
        </nav>

        <div className="flex flex-col gap-3 font-mono text-micro uppercase tracking-[0.12em] lg:col-span-4">
          <span className="text-muted/60">Contact</span>

          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-paper hover:text-accent"
            >
              Instagram
            </a>
          ) : (
            <span className="text-muted" aria-disabled="true">
              Instagram — coming soon
            </span>
          )}

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-paper hover:text-accent"
            >
              WhatsApp
            </a>
          ) : (
            <span className="text-muted" aria-disabled="true">
              WhatsApp — coming soon
            </span>
          )}

          <span className="text-muted">
            Jakarta, Indonesia · WIB (UTC+7)
          </span>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="shell flex flex-col gap-2 py-5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} LOUD JAKARTA. All rights reserved.</span>
          <span>Built for the noise.</span>
        </div>
      </div>
    </footer>
  );
}
