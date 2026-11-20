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
    <header className="theme-dark sticky top-0 z-40 border-b border-white/10 bg-ink/80 backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="LOUD JAKARTA home"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-accent transition-transform duration-300 group-hover:scale-125"
          />
          <span className="font-display text-xl uppercase leading-none tracking-tight transition-colors group-hover:text-accent">
            LOUD JAKARTA
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 md:flex"
        >
          {primaryNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 font-mono text-micro uppercase tracking-[0.12em] text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-10 items-center gap-2 rounded-full bg-accent px-5 font-mono text-micro uppercase tracking-[0.12em] text-ink transition-colors hover:bg-paper sm:inline-flex"
            >
              RSVP
              <span aria-hidden="true">↗</span>
            </a>
          ) : instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-10 items-center gap-2 rounded-full bg-accent px-5 font-mono text-micro uppercase tracking-[0.12em] text-ink transition-colors hover:bg-paper sm:inline-flex"
            >
              Instagram
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}

          <MobileNav
            links={primaryNav}
            instagramUrl={instagramUrl}
            whatsappUrl={whatsappUrl}
          />
        </div>
      </div>
    </header>
  );
}
