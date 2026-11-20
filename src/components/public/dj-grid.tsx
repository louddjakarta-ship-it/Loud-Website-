import Link from "next/link";

import type { PublicDj } from "@/lib/data/djs";

import { DjCard } from "./dj-card";

export function DjGrid({
  djs,
  loadFailed,
}: {
  djs: PublicDj[];
  loadFailed?: boolean;
}) {
  return (
    <section
      id="djs"
      aria-labelledby="djs-heading"
      className="scroll-mt-20 border-b border-line"
    >
      <div className="shell py-[clamp(64px,9vw,120px)]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-olive">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-accent"
              />
              03 — The selectors
            </span>
            <h2 id="djs-heading" className="mt-5 font-display text-h1 uppercase">
              The DJs
            </h2>
          </div>

          <div className="flex max-w-sm flex-col items-start gap-4 sm:items-end">
            <p className="text-sm leading-relaxed text-muted sm:text-right">
              Presskits from the selectors on the LOUD JAKARTA floor — photo,
              sound and the venues they have played.
            </p>
            <Link
              href="/djs"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-paper transition-colors hover:border-ink hover:bg-ink hover:text-white"
            >
              All DJs <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {djs.length === 0 ? (
          <div className="mt-8 rounded-[1.75rem] border border-line bg-surface p-7 shadow-soft sm:p-10">
            <p className="font-mono text-micro uppercase tracking-[0.12em] text-olive">
              {loadFailed ? "Temporarily unavailable" : "Roster"}
            </p>
            <p className="mt-4 font-display text-h1 uppercase">
              {loadFailed
                ? "DJs are temporarily unavailable."
                : "DJs coming soon."}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              {loadFailed
                ? "We could not reach the DJ database. Refresh the page in a moment."
                : "Presskits are being prepared. Check back soon."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {djs.map((dj) => (
              <DjCard key={dj.id} dj={dj} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
