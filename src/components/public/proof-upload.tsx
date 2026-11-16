"use client";

import Image from "next/image";
import { useRef, useState, type DragEvent } from "react";

import { FieldError, FieldHint } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatFileSize } from "@/lib/format";
import { compressProofImage } from "@/lib/images/compress";
import type { ProofMimeType } from "@/lib/validation/guestlist";

export type ProofFile = {
  blob: Blob;
  mimeType: ProofMimeType;
  previewUrl: string;
  size: number;
  width: number;
  height: number;
};

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ProofUploadProps = {
  id: string;
  label: string;
  hint: string;
  value: ProofFile | null;
  onChange: (value: ProofFile | null) => void;
  maxFileMb: number;
  error?: string;
  disabled?: boolean;
};

export function ProofUpload({
  id,
  label,
  hint,
  value,
  onChange,
  maxFileMb,
  error,
  disabled,
}: ProofUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);

  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hintId, error || localError ? errorId : null]
    .filter(Boolean)
    .join(" ");

  async function handleFile(file: File) {
    setLocalError(null);

    if (!ACCEPTED_TYPES.has(file.type)) {
      setLocalError("Use a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > maxFileMb * 1024 * 1024) {
      setLocalError(`Each image must be ${maxFileMb} MB or smaller.`);
      return;
    }

    setProcessing(true);

    try {
      const compressed = await compressProofImage(file);

      if (compressed.blob.size > maxFileMb * 1024 * 1024) {
        setLocalError(
          `The compressed image is still larger than ${maxFileMb} MB. Try a smaller screenshot.`,
        );
        return;
      }

      if (value) {
        URL.revokeObjectURL(value.previewUrl);
      }

      onChange({
        blob: compressed.blob,
        mimeType: compressed.mimeType,
        previewUrl: URL.createObjectURL(compressed.blob),
        size: compressed.blob.size,
        width: compressed.width,
        height: compressed.height,
      });
    } catch {
      setLocalError(
        "We could not read that image. Try another JPG, PNG or WEBP file.",
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleInputChange() {
    const file = inputRef.current?.files?.[0];

    if (file) {
      void handleFile(file);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    if (disabled || processing) {
      return;
    }

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void handleFile(file);
    }
  }

  function remove() {
    if (value) {
      URL.revokeObjectURL(value.previewUrl);
    }

    setLocalError(null);
    onChange(null);
  }

  const visibleError = error || localError;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="font-mono text-micro uppercase tracking-[0.12em] text-muted"
        >
          {label}
        </label>
        {value ? (
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-accent">
            Ready
          </span>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled || processing}
        aria-invalid={visibleError ? true : undefined}
        aria-describedby={describedBy || undefined}
      />

      {value ? (
        <div className="flex gap-4 border border-line bg-surface p-3">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden border border-line bg-ink">
            <Image
              src={value.previewUrl}
              alt={`Preview of ${label}`}
              width={value.width}
              height={value.height}
              unoptimized
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
            <div className="font-mono text-[0.65rem] uppercase leading-relaxed tracking-[0.08em] text-muted">
              <p>
                {value.width} × {value.height} px
              </p>
              <p>{formatFileSize(value.size)}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || processing}
                className="border border-line px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-paper transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={disabled || processing}
                className="border border-line px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border border-dashed transition-colors",
            dragging ? "border-accent bg-accent/5" : "border-line bg-surface",
          )}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || processing}
            aria-describedby={describedBy || undefined}
            className="flex min-h-36 w-full flex-col items-center justify-center gap-3 px-5 py-7 text-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center border border-line text-accent"
            >
              {processing ? (
                <span className="block h-4 w-4 animate-spin rounded-full border border-line border-t-accent" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5"
                >
                  <path d="M12 16V4m0 0L7 9m5-5 5 5" />
                  <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
              )}
            </span>

            <span className="font-mono text-micro uppercase tracking-[0.12em] text-paper">
              {processing ? "Processing image…" : "Choose image"}
            </span>

            <span className="text-sm text-muted">
              Drag &amp; drop or tap to open your gallery
            </span>
          </button>
        </div>
      )}

      <FieldHint id={hintId}>
        {hint} JPG, PNG or WEBP · max {maxFileMb} MB.
      </FieldHint>
      <FieldError id={errorId}>{visibleError}</FieldError>
    </div>
  );
}
