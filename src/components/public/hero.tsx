import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div
        aria-hidden="true"
        className="hero-glow pointer-events-none absolute inset-0"
      />

      <div className="shell relative grid gap-12 py-[clamp(72px,11vw,150px)] lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8">
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
            Jakarta · Indonesia
          </p>

          <h1 className="mt-6 font-display text-display-xl uppercase">
            <span className="block">We make</span>
            <span className="block text-accent">noise.</span>
          </h1>

          <p className="mt-8 max-w-xl text-balance text-lg leading-relaxed text-muted">
            Underground nightlife, electronic music and contemporary culture.
            We don&apos;t follow the noise. We make it.
          </p>

          <div className="mt-10 flex flex-wrap items-start gap-3">
            <ButtonLink href="/guestlist" size="lg">
              Join the guestlist
            </ButtonLink>
            <ButtonLink href="/#events" size="lg" variant="outline">
              Upcoming events
            </ButtonLink>
          </div>
        </div>

        <aside className="flex flex-col justify-end gap-8 border-t border-line pt-8 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <dl className="grid gap-0 font-mono text-micro uppercase tracking-[0.12em]">
            <div className="flex items-baseline justify-between gap-4 border-b border-line py-3">
              <dt className="text-muted">Based</dt>
              <dd>Jakarta, ID</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-line py-3">
              <dt className="text-muted">Sound</dt>
              <dd className="text-right">Electronic / Nightlife</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b border-line py-3">
              <dt className="text-muted">Est.</dt>
              <dd>2026</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Access</dt>
              <dd className="text-accent">Guestlist only</dd>
            </div>
          </dl>

          <Link
            href="/#events"
            className="group inline-flex items-center gap-3 font-mono text-micro uppercase tracking-[0.12em] text-muted transition-colors hover:text-accent"
          >
            <span className="block h-px w-8 bg-current transition-all group-hover:w-12" />
            Scroll for events
          </Link>
        </aside>
      </div>
    </section>
  );
}
