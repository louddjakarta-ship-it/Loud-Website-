import type { ProofMimeType } from "@/lib/validation/guestlist";

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;
const ALLOWED_OUTPUT_TYPES = new Set<ProofMimeType>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type CompressedImage = {
  blob: Blob;
  mimeType: ProofMimeType;
  width: number;
  height: number;
};

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to the <img> decoder.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("image_decode_failed"));
      element.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

/**
 * Compresses a proof image in the browser before upload: longest side max
 * 1600 px, WebP at quality 0.82. Keeps uploads fast and storage small.
 */
export async function compressProofImage(
  file: File,
): Promise<CompressedImage> {
  const loaded = await loadImage(file);

  try {
    if (loaded.width < 1 || loaded.height < 1) {
      throw new Error("image_decode_failed");
    }

    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(loaded.width, loaded.height),
    );
    const width = Math.max(1, Math.round(loaded.width * scale));
    const height = Math.max(1, Math.round(loaded.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("canvas_unavailable");
    }

    context.drawImage(loaded.source, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("image_encode_failed"));
          }
        },
        "image/webp",
        WEBP_QUALITY,
      );
    });

    if (!ALLOWED_OUTPUT_TYPES.has(blob.type as ProofMimeType)) {
      throw new Error("unsupported_output_type");
    }

    return {
      blob,
      mimeType: blob.type as ProofMimeType,
      width,
      height,
    };
  } finally {
    loaded.release();
  }
}
