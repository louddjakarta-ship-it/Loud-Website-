import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDjPhotoPublicUrl, getPublishedDjBySlug } from "@/lib/data/djs";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type DjPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: DjPageProps): Promise<Metadata> {
  const { slug } = await params;
  const dj = await getPublishedDjBySlug(slug).catch(() => null);

  if (!dj) {
    return { title: "DJ not found" };
  }

  const genres = dj.genres.length > 0 ? ` — ${dj.genres.join(", ")}` : "";

  return {
    title: dj.stage_name,
    description:
      dj.bio?.slice(0, 160) ??
      `Presskit for ${dj.stage_name}${genres}. Venues played and genres, from LOUD JAKARTA.`,
    alternates: { canonical: `/djs/${dj.slug}` },
    openGraph: {
      title: `${dj.stage_name} — LOUD JAKARTA`,
      description:
        dj.bio?.slice(0, 200) ??
        `Presskit for ${dj.stage_name}${genres}, from LOUD JAKARTA.`,
      url: absoluteUrl(`/djs/${dj.slug}`),
      images: getDjPhotoPublicUrl(dj.photo_path)
        ? [{ url: getDjPhotoPublicUrl(dj.photo_path) as string }]
        : undefined,
    },
  };
}

export default async function DjPresskitPage({ params }: DjPageProps) {
  const { slug } = await params;
  const dj = await getPublishedDjBySlug(slug).catch((error: unknown) => {
    console.error(
      "[djs] presskit lookup failed",
      error instanceof Error ? error.message : "unknown",
    );
    return null;
  });

  if (!dj) {
    notFound();
  }

  const photoUrl = getDjPhotoPublicUrl(dj.photo_path);

  return (
    <article className="shell py-[clamp(48px,7vw,104px)]">
      <Link
        href="/djs"
        className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted transition-colors hover:border-ink hover:bg-ink hover:text-white"
      >
        <span aria-hidden="true">←</span> All DJs
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <div className="rounded-[2rem] border border-line bg-surface p-3 shadow-soft">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-line">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt={`Presskit photo of ${dj.stage_name}`}
                  fill
                  priority
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex flex-col justify-between overflow-hidden bg-ink p-6"
                >
                  <div
                    className="absolute inset-0 opacity-[0.12]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(135deg, #F2F2ED 0 1px, transparent 1px 16px)",
                    }}
                  />
                  <span className="relative font-mono text-[0.55rem] uppercase tracking-[0.2em] text-white/50">
                    LOUD JAKARTA
                  </span>
                  <span className="relative font-display text-[clamp(3rem,8vw,6rem)] uppercase leading-none text-accent">
                    {dj.stage_name.slice(0, 2)}
                  </span>
                  <span className="relative font-mono text-[0.55rem] uppercase tracking-[0.16em] text-white/50">
                    Photo coming soon
                  </span>
                </div>
              )}
            </div>
          </div>

          {dj.instagram_url ? (
            <a
              href={dj.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink font-mono text-micro uppercase tracking-[0.12em] text-white transition-colors hover:bg-olive"
            >
              Instagram <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>

        <div className="lg:col-span-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-olive">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-accent"
            />
            DJ presskit
          </span>

          <h1 className="mt-5 font-display text-display-lg uppercase">
            {dj.stage_name}
          </h1>

          {dj.genres.length > 0 ? (
            <ul aria-label="Genres" className="mt-6 flex flex-wrap gap-2">
              {dj.genres.map((genre) => (
                <li
                  key={genre}
                  className="rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-paper"
                >
                  {genre}
                </li>
              ))}
            </ul>
          ) : null}

          {dj.bio ? (
            <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-relaxed text-muted">
              {dj.bio}
            </p>
          ) : null}

          <section
            aria-labelledby="venues-heading"
            className="mt-10 rounded-[1.75rem] border border-line bg-surface p-6 shadow-soft sm:p-7"
          >
            <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
              <h2
                id="venues-heading"
                className="font-display text-3xl uppercase"
              >
                Venues played
              </h2>
              <p className="font-mono text-[0.55rem] uppercase tracking-[0.08em] text-muted">
                {dj.venues.length} venue{dj.venues.length === 1 ? "" : "s"}
              </p>
            </div>

            {dj.venues.length > 0 ? (
              <ol className="mt-2 divide-y divide-line">
                {dj.venues.map((venue, index) => (
                  <li
                    key={`${venue}-${index}`}
                    className="flex items-baseline gap-4 py-3"
                  >
                    <span className="w-8 shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.08em] text-olive">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm leading-relaxed text-paper">
                      {venue}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Venue list coming soon.
              </p>
            )}
          </section>

          <div className="mt-8">
            <Link
              href="/#events"
              className="group inline-flex items-center gap-3 font-mono text-micro uppercase tracking-[0.12em] text-muted transition-colors hover:text-olive"
            >
              <span className="block h-px w-8 bg-current transition-all group-hover:w-12" />
              See upcoming events
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
