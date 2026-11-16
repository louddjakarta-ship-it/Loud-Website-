import Link from "next/link";

import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main id="main" className="flex-1">
        <div className="shell py-[clamp(72px,12vw,160px)]">
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
            Error 404
          </p>

          <p
            aria-hidden="true"
            className="mt-4 font-display text-display-xl uppercase leading-[0.8] text-line"
          >
            404
          </p>

          <h1 className="mt-6 font-display text-h1 uppercase">
            This page is off the map.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            The link may be broken, the event may have ended, or the page never
            existed. Head back to the noise.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center border border-accent bg-accent px-5 font-mono text-micro uppercase tracking-[0.12em] text-ink transition-colors hover:bg-paper"
            >
              Back to home
            </Link>
            <Link
              href="/guestlist"
              className="inline-flex h-11 items-center border border-line px-5 font-mono text-micro uppercase tracking-[0.12em] text-paper transition-colors hover:border-accent hover:text-accent"
            >
              Guestlist
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
