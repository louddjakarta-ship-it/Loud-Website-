import Link from "next/link";

import { publicEnv } from "@/lib/env/public";
import { buildWhatsAppContactUrl } from "@/lib/whatsapp";

import { MobileNav } from "./mobile-nav";
import { primaryNav } from "./nav-links";

export function SiteHeader() {
  const instagramUrl = publicEnv.instagramUrl.trim() || null;
  const whatsappUrl = buildWhatsAppContactUrl(
    publicEnv.defaultWhatsappNumber,
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/85 backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="font-display text-xl uppercase leading-none tracking-tight transition-colors hover:text-accent"
        >
          LOUD JAKARTA
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 font-mono text-micro uppercase tracking-[0.12em] text-muted md:flex"
        >
          {primaryNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-paper"
            >
              {link.label}
            </Link>
          ))}

          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-paper"
            >
              Instagram
            </a>
          ) : (
            <span
              aria-disabled="true"
              title="Official Instagram link coming soon"
              className="cursor-not-allowed text-muted/50"
            >
              Instagram
              <span className="sr-only"> (coming soon)</span>
            </span>
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-micro uppercase tracking-[0.12em] text-accent transition-colors hover:text-paper"
            >
              WhatsApp
            </a>
          ) : null}
          <Link
            href="/guestlist"
            className="border border-accent bg-accent px-4 py-2.5 font-mono text-micro uppercase tracking-[0.12em] text-ink transition-colors hover:bg-paper"
          >
            Join guestlist
          </Link>
        </div>

        <MobileNav
          links={primaryNav}
          instagramUrl={instagramUrl}
          whatsappUrl={whatsappUrl}
        />
      </div>
    </header>
  );
}
