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
      className="scroll-mt-20 border-b border-line"
    >
      <div className="shell py-[clamp(72px,10vw,140px)]">
        <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
              02 — Gallery
            </p>
            <h2
              id="gallery-heading"
              className="mt-3 font-display text-h1 uppercase"
            >
              Gallery
            </h2>
          </div>

          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Snapshots from the floor. Shot at LOUD JAKARTA nights.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {photos.map((photo) => {
            const url = getGalleryPublicUrl(photo.storage_path);

            if (!url) {
              return null;
            }

            return (
              <figure
                key={photo.id}
                className="group relative aspect-video overflow-hidden border border-line bg-surface"
              >
                <Image
                  src={url}
                  alt={photo.caption ?? "LOUD JAKARTA gallery photo"}
                  fill
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  className="object-cover transition-transform duration-500 ease-out-expo group-hover:scale-[1.03]"
                />

                {photo.caption ? (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent p-4 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-paper">
                    {photo.caption}
                  </figcaption>
                ) : null}
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
