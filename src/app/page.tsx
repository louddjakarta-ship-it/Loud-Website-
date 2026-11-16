import { Button } from "@/components/ui/button";

const tokens = [
  { name: "ink", value: "#050505", className: "bg-ink" },
  { name: "surface", value: "#0B0B0B", className: "bg-surface" },
  { name: "line", value: "#1F1F1F", className: "bg-line" },
  { name: "muted", value: "#8A8A8A", className: "bg-muted" },
  { name: "paper", value: "#F2F2ED", className: "bg-paper" },
  { name: "accent", value: "#C6FF00", className: "bg-accent" },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-[clamp(20px,5vw,72px)] py-5">
          <span className="font-display text-xl uppercase tracking-tight">
            LOUD JAKARTA
          </span>
          <nav
            aria-label="Primary"
            className="hidden items-center gap-8 font-mono text-micro uppercase text-muted sm:flex"
          >
            <span>Upcoming Events</span>
            <span>Guestlist</span>
            <span>Instagram</span>
          </nav>
          <span className="font-mono text-micro uppercase text-accent sm:hidden">
            Jakarta
          </span>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-[1440px] px-[clamp(20px,5vw,72px)] py-[clamp(80px,12vw,160px)]">
          <p className="mb-6 font-mono text-micro uppercase text-accent">
            Phase 2 — Setup check
          </p>

          <h1 className="max-w-5xl font-display text-display-xl uppercase">
            We make noise.
          </h1>

          <div className="mt-10 grid gap-8 border-t border-line pt-8 md:grid-cols-2">
            <p className="max-w-xl text-balance text-lg leading-relaxed text-muted">
              We don&apos;t follow the noise. We make it. Underground nightlife,
              electronic music and contemporary culture in Jakarta.
            </p>

            <div className="flex flex-wrap items-start gap-3 md:justify-end">
              <Button size="lg">Join the guestlist</Button>
              <Button size="lg" variant="outline">
                Upcoming events
              </Button>
              <Button size="lg" variant="ghost">
                Instagram
              </Button>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="tokens-heading"
          className="mx-auto w-full max-w-[1440px] border-t border-line px-[clamp(20px,5vw,72px)] py-12"
        >
          <h2
            id="tokens-heading"
            className="mb-6 font-mono text-micro uppercase text-muted"
          >
            01 — Design tokens
          </h2>

          <ul className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
            {tokens.map((token) => (
              <li key={token.name} className="bg-surface">
                <div className={`h-20 ${token.className}`} />
                <div className="flex items-baseline justify-between gap-2 p-3">
                  <span className="font-mono text-micro uppercase text-paper">
                    {token.name}
                  </span>
                  <span className="font-mono text-[0.65rem] uppercase text-muted">
                    {token.value}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
            Typography: Anton (display) and Inter (body), self-hosted through
            next/font. Accent is a placeholder and can be changed from a single
            CSS variable.
          </p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-[clamp(20px,5vw,72px)] py-8 font-mono text-micro uppercase text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="text-paper">LOUD JAKARTA</span>
          <span>Placeholder build — no production data yet</span>
        </div>
      </footer>
    </div>
  );
}
