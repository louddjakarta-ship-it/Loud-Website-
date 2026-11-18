import { z } from "zod";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export const galleryStoragePathSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:webp|jpg|jpeg|png)$/i,
    "Invalid upload path.",
  );

export const galleryCaptionSchema = z
  .string()
  .trim()
  .max(160, "Caption must be 160 characters or fewer.")
  .refine(
    (value) => !CONTROL_CHARACTERS.test(value),
    "Caption contains invalid characters.",
  )
  .transform((value) => (value.length > 0 ? value : null));

export const galleryPhotoSchema = z.object({
  storagePath: galleryStoragePathSchema,
  caption: galleryCaptionSchema,
});
