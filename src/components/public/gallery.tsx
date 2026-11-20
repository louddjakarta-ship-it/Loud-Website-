import Image from "next/image";

import {
  getGalleryPublicUrl,
  type GalleryPhoto,
} from "@/lib/data/gallery";

export function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  if (photos.length === 0) {
    return null;
  }

  return (
    <section
      id="gallery"
      aria-labelledby="gallery-heading"
      className="scroll-mt-20 border-b border-line bg-bone"
    >
      <div className="shell py-[clamp(64px,9vw,120px)]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-olive">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-accent"
              />
              04 — Gallery
            </span>
            <h2
              id="gallery-heading"
              className="mt-5 font-display text-h1 uppercase"
            >
              The vibe speaks
            </h2>
          </div>

          <p className="max-w-sm text-sm leading-relaxed text-muted sm:text-right">
            Snapshots from the floor. Shot at LOUD JAKARTA nights.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {photos.map((photo) => {
            const url = getGalleryPublicUrl(photo.storage_path);

            if (!url) {
              return null;
            }

            return (
              <figure
                key={photo.id}
                className="group relative aspect-[4/3] overflow-hidden rounded-[1.5rem] border border-line bg-surface p-2 shadow-soft"
              >
                <div className="relative h-full w-full overflow-hidden rounded-[1.1rem]">
                  <Image
                    src={url}
                    alt={photo.caption ?? "LOUD JAKARTA gallery photo"}
                    fill
                    sizes="(min-width: 1024px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.04]"
                  />

                  {photo.caption ? (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent p-4 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-white">
                      {photo.caption}
                    </figcaption>
                  ) : null}
                </div>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
