import type { Metadata } from "next";

import { DjCard } from "@/components/public/dj-card";
import { getPublishedDjs, type PublicDj } from "@/lib/data/djs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DJs",
  description:
    "Presskits from the DJs on the LOUD JAKARTA floor: photos, genres and the venues they have played.",
  alternates: { canonical: "/djs" },
};

export default async function DjsPage() {
  let djs: PublicDj[] = [];
  let loadFailed = false;

  try {
    djs = await getPublishedDjs();
  } catch (error) {
    loadFailed = true;
    console.error(
      "[djs] directory unavailable",
      error instanceof Error ? error.message : "unknown",
    );
  }

  return (
    <div className="shell py-[clamp(56px,8vw,112px)]">
      <header className="border-b border-line pb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-olive">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-accent"
          />
          Roster
        </span>
        <h1 className="mt-5 font-display text-display-lg uppercase">
          The DJs
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
          Presskits from the selectors on the LOUD JAKARTA floor. Tap a name for
          their photo, sound and the venues they have played.
        </p>
      </header>

      {djs.length === 0 ? (
        <div className="mt-10 rounded-[1.75rem] border border-line bg-surface p-7 shadow-soft sm:p-10">
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-olive">
            {loadFailed ? "Temporarily unavailable" : "Roster"}
          </p>
          <p className="mt-4 font-display text-h1 uppercase">
            {loadFailed ? "DJs are temporarily unavailable." : "DJs coming soon."}
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            {loadFailed
              ? "We could not reach the DJ database. Refresh the page in a moment."
              : "Presskits are being prepared. Check back soon."}
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {djs.map((dj) => (
            <DjCard key={dj.id} dj={dj} />
          ))}
        </div>
      )}
    </div>
  );
}
