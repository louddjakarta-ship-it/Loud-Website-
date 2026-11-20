"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { saveDjPresskitAction } from "@/app/dj/actions";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  FieldHint,
  Input,
  Label,
  Textarea,
} from "@/components/ui/field";
import type { EventActionState } from "@/lib/admin/event-action-state";
import { formatFileSize } from "@/lib/format";
import { compressDjPhoto } from "@/lib/images/compress";
import { extensionForImageMime } from "@/lib/images/magic-bytes";
import { DJ_BUCKET } from "@/lib/storage/constants";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type DjPresskitInitialValues = {
  stageName: string;
  bio: string;
  genres: string[];
  venues: string[];
  instagramUrl: string | null;
  photoPath: string | null;
  photoUrl: string | null;
  isPublished: boolean;
  slug: string | null;
};

function instagramHandle(url: string | null): string {
  if (!url) {
    return "";
  }

  const match = url.match(/instagram\.com\/([^/?#]+)/i);

  return match ? `@${match[1]}` : "";
}

export function DjPresskitForm({
  userId,
  displayName,
  initial,
}: {
  userId: string;
  displayName: string | null;
  initial: DjPresskitInitialValues;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(initial.photoPath);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial.photoUrl);
  const [instagram, setInstagram] = useState(
    instagramHandle(initial.instagramUrl),
  );
  const [state, setState] = useState<EventActionState>({ status: "idle" });
  const [busy, setBusy] = useState(false);
  const fieldErrors = state.fields ?? {};

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setState({ status: "idle" });

    if (!next) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!ACCEPTED_TYPES.has(next.type)) {
      setState({ status: "error", message: "Use a JPG, PNG or WEBP image." });
      event.target.value = "";
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (next.size > MAX_SOURCE_BYTES) {
      setState({
        status: "error",
        message: "That file is larger than 20 MB. Choose a smaller photo.",
      });
      event.target.value = "";
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  }

  function handleRemovePhoto() {
    setFile(null);
    setPreviewUrl(null);
    setPhotoPath(null);
    setPhotoUrl(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "idle" });
    setBusy(true);

    const formData = new FormData(event.currentTarget);
    let nextPhotoPath = photoPath;
    let uploadedPath: string | null = null;

    try {
      if (file) {
        const compressed = await compressDjPhoto(file);

        if (compressed.blob.size > MAX_UPLOAD_BYTES) {
          setState({
            status: "error",
            message:
              "The compressed photo is still over 5 MB. Try another image.",
          });
          return;
        }

        const extension = extensionForImageMime(compressed.mimeType);
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;
        const supabase = createBrowserSupabaseClient();
        const { error: uploadError } = await supabase.storage
          .from(DJ_BUCKET)
          .upload(path, compressed.blob, {
            contentType: compressed.mimeType,
            upsert: false,
          });

        if (uploadError) {
          console.error("[dj] photo upload failed", uploadError.name);
          setState({
            status: "error",
            message: "The photo could not be uploaded. Please try again.",
          });
          return;
        }

        uploadedPath = path;
        nextPhotoPath = path;
      }

      const result = await saveDjPresskitAction({
        stageName: String(formData.get("stageName") ?? ""),
        bio: String(formData.get("bio") ?? ""),
        genres: String(formData.get("genres") ?? ""),
        venues: String(formData.get("venues") ?? ""),
        instagramUrl: instagram,
        isPublished: formData.get("isPublished") === "on",
        photoPath: nextPhotoPath,
      });

      if (result.status !== "success") {
        if (uploadedPath) {
          const supabase = createBrowserSupabaseClient();
          await supabase.storage.from(DJ_BUCKET).remove([uploadedPath]);
        }

        setState(result);
        return;
      }

      setPhotoPath(nextPhotoPath);
      setFile(null);
      setPreviewUrl(null);
      setState(result);

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      if (uploadedPath) {
        const supabase = createBrowserSupabaseClient();
        const { data } = supabase.storage.from(DJ_BUCKET).getPublicUrl(
          uploadedPath,
        );

        setPhotoUrl(data.publicUrl);
      }

      router.refresh();
    } catch {
      if (uploadedPath) {
        const supabase = createBrowserSupabaseClient();
        await supabase.storage.from(DJ_BUCKET).remove([uploadedPath]);
      }

      setState({
        status: "error",
        message: "Something went wrong while saving your presskit.",
      });
    } finally {
      setBusy(false);
    }
  }

  const shownPhotoUrl = previewUrl ?? photoUrl;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-8">
      {state.status === "error" ? (
        <div
          role="alert"
          className="border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          {state.message ?? "Your presskit could not be saved."}
        </div>
      ) : null}

      {state.status === "success" ? (
        <div
          role="status"
          className="border border-accent/50 bg-accent/5 p-4 text-sm leading-relaxed text-accent"
        >
          {state.message ?? "Presskit saved."}
          {state.redirectTo ? (
            <>
              {" "}
              <Link
                href={state.redirectTo}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                View your public page ↗
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div>
          <Label htmlFor="dj-photo">Presskit photo</Label>

          {shownPhotoUrl ? (
            <div className="relative mb-3 aspect-[4/5] overflow-hidden border border-line bg-line">
              <Image
                src={shownPhotoUrl}
                alt="Presskit photo preview"
                fill
                unoptimized={Boolean(previewUrl)}
                sizes="(min-width: 1024px) 20rem, 90vw"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="mb-3 flex aspect-[4/5] items-center justify-center border border-dashed border-line bg-surface p-6 text-center font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
              No photo yet
            </div>
          )}

          <input
            ref={fileRef}
            id="dj-photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={busy}
            className="block w-full cursor-pointer border border-line bg-surface px-4 py-3 text-sm text-muted file:mr-4 file:cursor-pointer file:border-0 file:bg-accent file:px-3 file:py-1.5 file:font-mono file:text-[0.65rem] file:uppercase file:tracking-[0.08em] file:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          />
          <FieldHint>
            JPG, PNG or WEBP up to 20 MB. Centre-cropped to 4:5 and converted to
            WebP.
          </FieldHint>
          {file ? (
            <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
              {file.name} · {formatFileSize(file.size)}
            </p>
          ) : null}

          {shownPhotoUrl ? (
            <button
              type="button"
              onClick={handleRemovePhoto}
              disabled={busy}
              className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted underline underline-offset-4 transition-colors hover:text-danger disabled:opacity-60"
            >
              Remove photo
            </button>
          ) : null}
          <FieldError>{fieldErrors.photo}</FieldError>
        </div>

        <div className="grid gap-5">
          <div>
            <Label htmlFor="dj-stage-name">Stage name</Label>
            <Input
              id="dj-stage-name"
              name="stageName"
              type="text"
              maxLength={80}
              required
              defaultValue={initial.stageName}
              disabled={busy}
              placeholder={displayName ?? "Your DJ name"}
              aria-invalid={fieldErrors.stageName ? true : undefined}
              aria-describedby={
                fieldErrors.stageName ? "dj-stage-name-error" : undefined
              }
            />
            <FieldHint>
              Shown on the homepage and your public presskit page.
            </FieldHint>
            <FieldError id="dj-stage-name-error">
              {fieldErrors.stageName}
            </FieldError>
          </div>

          <div>
            <Label htmlFor="dj-bio">Bio</Label>
            <Textarea
              id="dj-bio"
              name="bio"
              maxLength={2000}
              rows={5}
              defaultValue={initial.bio}
              disabled={busy}
              placeholder="Short introduction: sound, residencies, notable nights."
              aria-invalid={fieldErrors.bio ? true : undefined}
              aria-describedby={fieldErrors.bio ? "dj-bio-error" : undefined}
            />
            <FieldError id="dj-bio-error">{fieldErrors.bio}</FieldError>
          </div>

          <div>
            <Label htmlFor="dj-genres">Genres</Label>
            <Textarea
              id="dj-genres"
              name="genres"
              rows={3}
              defaultValue={initial.genres.join("\n")}
              disabled={busy}
              placeholder={"House\nDisco\nBreaks"}
              aria-invalid={fieldErrors.genres ? true : undefined}
              aria-describedby={
                fieldErrors.genres ? "dj-genres-error" : "dj-genres-hint"
              }
            />
            <FieldHint id="dj-genres-hint">
              One per line (or comma separated). Up to 12.
            </FieldHint>
            <FieldError id="dj-genres-error">{fieldErrors.genres}</FieldError>
          </div>

          <div>
            <Label htmlFor="dj-venues">Venues played</Label>
            <Textarea
              id="dj-venues"
              name="venues"
              rows={6}
              defaultValue={initial.venues.join("\n")}
              disabled={busy}
              placeholder={"LOUD JAKARTA\nOther venue, city"}
              aria-invalid={fieldErrors.venues ? true : undefined}
              aria-describedby={
                fieldErrors.venues ? "dj-venues-error" : "dj-venues-hint"
              }
            />
            <FieldHint id="dj-venues-hint">
              One venue per line. Up to 50.
            </FieldHint>
            <FieldError id="dj-venues-error">{fieldErrors.venues}</FieldError>
          </div>

          <div>
            <Label htmlFor="dj-instagram">Instagram (optional)</Label>
            <Input
              id="dj-instagram"
              name="instagramUrl"
              type="text"
              maxLength={200}
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
              disabled={busy}
              placeholder="@loudjakarta"
              aria-invalid={fieldErrors.instagramUrl ? true : undefined}
              aria-describedby={
                fieldErrors.instagramUrl ? "dj-instagram-error" : undefined
              }
            />
            <FieldError id="dj-instagram-error">
              {fieldErrors.instagramUrl}
            </FieldError>
          </div>

          <label className="flex items-start gap-3 border border-line bg-surface p-4 text-sm leading-relaxed text-muted">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={initial.isPublished}
              disabled={busy}
              className="mt-1 h-4 w-4 accent-accent"
            />
            <span>
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.08em] text-paper">
                Publish on the public DJ page
              </span>
              <span className="mt-1 block">
                Uncheck to hide your presskit from customers while you finish
                it.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save presskit"}
        </Button>

        {initial.slug && initial.isPublished ? (
          <Link
            href={`/djs/${initial.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted underline underline-offset-4 transition-colors hover:text-accent"
          >
            View public page ↗
          </Link>
        ) : null}
      </div>
    </form>
  );
}
