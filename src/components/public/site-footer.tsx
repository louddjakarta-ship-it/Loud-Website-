import Link from "next/link";

import { publicEnv } from "@/lib/env/public";
import { buildWhatsAppContactUrl } from "@/lib/whatsapp";

const FOOTER_LINKS = [
  { href: "/#events", label: "Upcoming events" },
  { href: "/#djs", label: "The DJs" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/privacy", label: "Privacy" },
] as const;

export function SiteFooter() {
  const instagramUrl = publicEnv.instagramUrl.trim() || null;
  const whatsappUrl = buildWhatsAppContactUrl(
    publicEnv.defaultWhatsappNumber,
  );
  const year = new Date().getFullYear();

  return (
    <footer className="site-light border-t border-line bg-bone">
      <div className="shell py-[clamp(56px,8vw,104px)] text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-display text-4xl uppercase leading-none transition-colors hover:text-olive"
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full bg-accent"
          />
          LOUD JAKARTA
        </Link>

        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted">
          Underground nightlife, electronic music and contemporary culture in
          Jakarta. We don&apos;t follow the noise. We make it.
        </p>

        <nav
          aria-label="Footer"
          className="mt-8 flex flex-wrap justify-center gap-2"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-line bg-surface px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-muted transition-colors hover:border-ink hover:bg-ink hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-ink px-5 py-2.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-white transition-colors hover:bg-olive"
            >
              Instagram ↗
            </a>
          ) : (
            <span className="rounded-full border border-line px-5 py-2.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-muted">
              Instagram — soon
            </span>
          )}

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line bg-surface px-5 py-2.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-paper transition-colors hover:border-ink hover:bg-ink hover:text-white"
            >
              WhatsApp ↗
            </a>
          ) : (
            <span className="rounded-full border border-line px-5 py-2.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-muted">
              WhatsApp — soon
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-line">
        <div className="shell flex flex-col gap-2 py-5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} LOUD JAKARTA. All rights reserved.</span>
          <span>Jakarta, Indonesia · WIB (UTC+7)</span>
        </div>
      </div>
    </footer>
  );
}
