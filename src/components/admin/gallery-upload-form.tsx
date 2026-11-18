"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { createGalleryPhotoAction } from "@/app/admin/actions/gallery";
import { Button } from "@/components/ui/button";
import { FieldHint, Input, Label } from "@/components/ui/field";
import { formatFileSize } from "@/lib/format";
import { compressGalleryImage } from "@/lib/images/compress";
import { extensionForImageMime } from "@/lib/images/magic-bytes";
import { GALLERY_BUCKET } from "@/lib/storage/constants";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function GalleryUploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Free the blob URL whenever the preview changes or the form unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearPreview() {
    setPreviewUrl(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setError(null);
    setSuccess(null);

    if (!next) {
      setFile(null);
      clearPreview();
      return;
    }

    if (!ACCEPTED_TYPES.has(next.type)) {
      setError("Use a JPG, PNG or WEBP image.");
      event.target.value = "";
      setFile(null);
      clearPreview();
      return;
    }

    if (next.size > MAX_SOURCE_BYTES) {
      setError("That file is larger than 20 MB. Choose a smaller photo.");
      event.target.value = "";
      setFile(null);
      clearPreview();
      return;
    }

    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("Choose a photo first.");
      return;
    }

    setBusy(true);

    try {
      const compressed = await compressGalleryImage(file);

      if (compressed.blob.size > MAX_UPLOAD_BYTES) {
        setError("The compressed photo is still over 5 MB. Try another image.");
        return;
      }

      const extension = extensionForImageMime(compressed.mimeType);
      const path = `${crypto.randomUUID()}.${extension}`;
      const supabase = createBrowserSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from(GALLERY_BUCKET)
        .upload(path, compressed.blob, {
          contentType: compressed.mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error("[admin/gallery] upload failed", uploadError.name);
        setError("The photo could not be uploaded. Please try again.");
        return;
      }

      const result = await createGalleryPhotoAction({
        storagePath: path,
        caption,
      });

      if (result.status !== "success") {
        await supabase.storage.from(GALLERY_BUCKET).remove([path]);
        setError(result.message ?? "The photo could not be saved.");
        return;
      }

      setSuccess(result.message ?? "Photo added to the gallery.");
      setFile(null);
      setCaption("");
      clearPreview();

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      router.refresh();
    } catch {
      setError("Something went wrong while processing the photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      {error ? (
        <div
          role="alert"
          className="border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="border border-accent/50 bg-accent/5 p-4 text-sm leading-relaxed text-accent"
        >
          {success}
        </div>
      ) : null}

      <div>
        <Label htmlFor="gallery-file">Photo</Label>
        <input
          ref={fileRef}
          id="gallery-file"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={busy}
          className="block w-full cursor-pointer border border-line bg-surface px-4 py-3 text-sm text-muted file:mr-4 file:cursor-pointer file:border-0 file:bg-accent file:px-3 file:py-1.5 file:font-mono file:text-[0.65rem] file:uppercase file:tracking-[0.08em] file:text-ink disabled:cursor-not-allowed disabled:opacity-60"
        />
        <FieldHint>
          JPG, PNG or WEBP up to 20 MB. Photos are centre-cropped to 16:9 and
          converted to WebP before upload.
        </FieldHint>
        {file ? (
          <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
            {file.name} · {formatFileSize(file.size)}
          </p>
        ) : null}
        {previewUrl ? (
          <div className="mt-3 w-full max-w-sm">
            <div className="relative aspect-video overflow-hidden border border-line bg-line">
              <Image
                src={previewUrl}
                alt="16:9 crop preview"
                fill
                unoptimized
                sizes="(min-width: 640px) 24rem, 90vw"
                className="object-cover"
              />
            </div>
            <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
              16:9 preview — centre of the photo is kept
            </p>
          </div>
        ) : null}
      </div>

      <div>
        <Label htmlFor="gallery-caption">Caption (optional)</Label>
        <Input
          id="gallery-caption"
          name="caption"
          type="text"
          maxLength={160}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          disabled={busy}
          placeholder="LOUD JAKARTA 002 — main room"
        />
        <FieldHint>
          Shown over the photo on the homepage. Leave empty for no caption.
        </FieldHint>
      </div>

      <div>
        <Button type="submit" disabled={busy || !file}>
          {busy ? "Uploading…" : "Upload photo"}
        </Button>
      </div>
    </form>
  );
}
