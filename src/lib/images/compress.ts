import type { ProofMimeType } from "@/lib/validation/guestlist";

const PROOF_MAX_DIMENSION = 1600;
const PROOF_WEBP_QUALITY = 0.82;
const FLYER_MAX_DIMENSION = 2000;
const FLYER_WEBP_QUALITY = 0.85;
const GALLERY_MAX_DIMENSION = 2400;
const GALLERY_WEBP_QUALITY = 0.86;
const GALLERY_ASPECT_RATIO = 16 / 9;
const DJ_MAX_DIMENSION = 1600;
const DJ_WEBP_QUALITY = 0.85;
const DJ_ASPECT_RATIO = 4 / 5;
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

async function compressImage(
  file: File,
  {
    maxDimension,
    quality,
    aspectRatio,
  }: {
    maxDimension: number;
    quality: number;
    /**
     * When set, the image is centre-cropped to this ratio (width / height)
     * before scaling. Used to force gallery uploads to 16:9.
     */
    aspectRatio?: number;
  },
): Promise<CompressedImage> {
  const loaded = await loadImage(file);

  try {
    if (loaded.width < 1 || loaded.height < 1) {
      throw new Error("image_decode_failed");
    }

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = loaded.width;
    let sourceHeight = loaded.height;

    if (aspectRatio) {
      const currentRatio = loaded.width / loaded.height;

      if (currentRatio > aspectRatio) {
        // Too wide: trim the left/right edges evenly.
        sourceWidth = loaded.height * aspectRatio;
        sourceX = (loaded.width - sourceWidth) / 2;
      } else if (currentRatio < aspectRatio) {
        // Too tall: trim the top/bottom edges evenly.
        sourceHeight = loaded.width / aspectRatio;
        sourceY = (loaded.height - sourceHeight) / 2;
      }
    }

    const scale = Math.min(
      1,
      maxDimension / Math.max(sourceWidth, sourceHeight),
    );
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(
      1,
      Math.round(
        aspectRatio ? width / aspectRatio : sourceHeight * scale,
      ),
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("canvas_unavailable");
    }

    context.drawImage(
      loaded.source,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height,
    );

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
        quality,
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

/**
 * Compresses a guestlist proof in the browser: longest side max 1600 px,
 * WebP at quality 0.82. Keeps uploads fast and storage small.
 */
export function compressProofImage(file: File): Promise<CompressedImage> {
  return compressImage(file, {
    maxDimension: PROOF_MAX_DIMENSION,
    quality: PROOF_WEBP_QUALITY,
  });
}

/**
 * Compresses an event flyer in the browser: longest side max 2000 px, WebP at
 * quality 0.85. Keeps the server action body under Vercel's request limit.
 */
export function compressFlyerImage(file: File): Promise<CompressedImage> {
  return compressImage(file, {
    maxDimension: FLYER_MAX_DIMENSION,
    quality: FLYER_WEBP_QUALITY,
  });
}

/**
 * Compresses a gallery photo in the browser: centre-cropped to 16:9, longest
 * side max 2400 px, WebP at quality 0.86. Uploaded straight to Storage so the
 * action payload stays small.
 */
export function compressGalleryImage(file: File): Promise<CompressedImage> {
  return compressImage(file, {
    maxDimension: GALLERY_MAX_DIMENSION,
    quality: GALLERY_WEBP_QUALITY,
    aspectRatio: GALLERY_ASPECT_RATIO,
  });
}

/**
 * Compresses a DJ presskit portrait in the browser: centre-cropped to a 4:5
 * portrait, max 1600 px, WebP at quality 0.85.
 */
export function compressDjPhoto(file: File): Promise<CompressedImage> {
  return compressImage(file, {
    maxDimension: DJ_MAX_DIMENSION,
    quality: DJ_WEBP_QUALITY,
    aspectRatio: DJ_ASPECT_RATIO,
  });
}
