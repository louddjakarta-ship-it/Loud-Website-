import type { Metadata } from "next";
import Image from "next/image";

import { deleteGalleryPhotoAction } from "@/app/admin/actions/gallery";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { GalleryUploadForm } from "@/components/admin/gallery-upload-form";
import { requireAdmin } from "@/lib/auth/admin";
import { getGalleryPublicUrl } from "@/lib/data/gallery";
import { formatEventDateTime } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gallery",
  robots: { index: false, follow: false },
};

export default async function AdminGalleryPage() {
  await requireAdmin();

  const supabase = await createServerSupabaseClient();
  const { data: photos, error } = await supabase
    .from("gallery_photos")
    .select("id,storage_path,caption,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-10">
      <header className="border-b border-line pb-6">
        <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
          Content
        </p>
        <h1 className="mt-2 font-display text-h1 uppercase">Gallery</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Photos uploaded here appear in the public homepage gallery. Only
          admins can upload or delete images.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          The gallery could not be loaded. Refresh the page or check the
          database connection.
        </div>
      ) : null}

      <section
        aria-labelledby="gallery-upload-heading"
        className="border border-line bg-surface p-5 sm:p-6"
      >
        <h2
          id="gallery-upload-heading"
          className="font-display text-2xl uppercase"
        >
          Upload photo
        </h2>
        <div className="mt-5 max-w-2xl">
          <GalleryUploadForm />
        </div>
      </section>

      <section aria-labelledby="gallery-list-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <h2
            id="gallery-list-heading"
            className="font-display text-3xl uppercase"
          >
            Photos
          </h2>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
            {photos?.length ?? 0} in gallery
          </p>
        </div>

        {photos && photos.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => {
              const url = getGalleryPublicUrl(photo.storage_path);

              return (
                <figure
                  key={photo.id}
                  className="flex flex-col border border-line bg-surface"
                >
                  <div className="relative aspect-video overflow-hidden bg-line">
                    {url ? (
                      <Image
                        src={url}
                        alt={photo.caption ?? "LOUD JAKARTA gallery photo"}
                        fill
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-4 text-center font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
                        Image unavailable
                      </div>
                    )}
                  </div>

                  <figcaption className="flex flex-1 items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-paper">
                        {photo.caption ?? "No caption"}
                      </p>
                      <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
                        {formatEventDateTime(photo.created_at)}
                      </p>
                    </div>

                    <ConfirmForm
                      action={deleteGalleryPhotoAction}
                      message="Remove this photo from the gallery? The image file is deleted too."
                    >
                      <input type="hidden" name="photoId" value={photo.id} />
                      <button
                        type="submit"
                        className="border border-line px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-danger hover:text-danger"
                      >
                        Delete
                      </button>
                    </ConfirmForm>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        ) : (
          <p className="border-b border-line py-10 text-sm leading-relaxed text-muted">
            No photos yet. Upload the first one above — it will show up on the
            homepage immediately.
          </p>
        )}
      </section>
    </div>
  );
}
