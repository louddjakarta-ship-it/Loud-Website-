import Image from "next/image";
import Link from "next/link";

import { getDjPhotoPublicUrl, type PublicDj } from "@/lib/data/djs";

function DjPhotoPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex flex-col justify-between overflow-hidden bg-ink p-5"
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
      <span className="relative font-display text-[clamp(2.5rem,6vw,4.5rem)] uppercase leading-none text-accent">
        {initials || "DJ"}
      </span>
      <span className="relative font-mono text-[0.55rem] uppercase tracking-[0.16em] text-white/50">
        Photo coming soon
      </span>
    </div>
  );
}

export function DjCard({ dj }: { dj: PublicDj }) {
  const photoUrl = getDjPhotoPublicUrl(dj.photo_path);
  const genres = dj.genres.slice(0, 3);

  return (
    <Link
      href={`/djs/${dj.slug}`}
      className="group flex flex-col rounded-[1.75rem] border border-line bg-surface p-3 shadow-soft transition-transform duration-300 ease-out-expo hover:-translate-y-1 focus-visible:-translate-y-1"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-line">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={`Presskit photo of ${dj.stage_name}`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.03]"
          />
        ) : (
          <DjPhotoPlaceholder name={dj.stage_name} />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 pt-4 sm:p-4">
        <div>
          <h3 className="font-display text-2xl uppercase leading-[0.95] transition-colors group-hover:text-olive">
            {dj.stage_name}
          </h3>
          {dj.venues.length > 0 ? (
            <p className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-muted">
              {dj.venues.length} venue{dj.venues.length === 1 ? "" : "s"} played
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5">
          {(genres.length > 0 ? genres : ["Genres TBA"]).map((genre) => (
            <span
              key={genre}
              className="rounded-full border border-line px-2.5 py-1 font-mono text-[0.5rem] uppercase tracking-[0.08em] text-muted"
            >
              {genre}
            </span>
          ))}
        </div>

        <span className="inline-flex items-center gap-2 font-mono text-[0.55rem] uppercase tracking-[0.12em] text-olive">
          View presskit <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
