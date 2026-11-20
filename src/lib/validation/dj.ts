import { z } from "zod";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
/** Control characters that are never allowed in multi-line text. */
const CONTROL_CHARACTERS_EXCEPT_NEWLINE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

/**
 * Textareas can submit CRLF (pasted from Windows documents) or a lone CR.
 * Normalise first so line-based validation sees plain `\n`.
 */
function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

/** Splits a textarea value on newlines and commas, tidying whitespace. */
function splitList(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => item.length > 0);
}

/** Keeps the first spelling of each entry, case-insensitively. */
function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const key = value.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(value);
    }
  }

  return unique;
}

function listSchema({
  label,
  maxItems,
  maxItemLength,
}: {
  label: string;
  maxItems: number;
  maxItemLength: number;
}) {
  return z
    .string()
    .transform(normalizeNewlines)
    .refine(
      (value) => value.length <= maxItems * (maxItemLength + 2),
      `${label} are too long. Add at most ${maxItems}.`,
    )
    .transform((value) => dedupe(splitList(value)))
    .refine(
      (items) => items.every((item) => !CONTROL_CHARACTERS.test(item)),
      `${label} contain invalid characters.`,
    )
    .refine(
      (items) => items.length <= maxItems,
      `Add at most ${maxItems} ${label.toLowerCase()}.`,
    )
    .refine(
      (items) => items.every((item) => item.length <= maxItemLength),
      `Each entry must be ${maxItemLength} characters or fewer.`,
    );
}

export const djStageNameSchema = z
  .string()
  .transform(normalizeNewlines)
  .transform((value) => value.trim())
  .refine((value) => value.length >= 1, "Enter a stage name.")
  .refine(
    (value) => value.length <= 80,
    "Stage name must be 80 characters or fewer.",
  )
  .refine(
    (value) => !CONTROL_CHARACTERS.test(value),
    "Stage name contains invalid characters.",
  );

export const djBioSchema = z
  .string()
  .transform(normalizeNewlines)
  .transform((value) => value.trim())
  .refine(
    (value) => value.length <= 2000,
    "Bio must be 2000 characters or fewer.",
  )
  .refine(
    (value) => !CONTROL_CHARACTERS_EXCEPT_NEWLINE.test(value),
    "Bio contains invalid characters.",
  )
  .transform((value) => (value.length > 0 ? value : null));

export const djGenresSchema = listSchema({
  label: "Genres",
  maxItems: 12,
  maxItemLength: 40,
});

export const djVenuesSchema = listSchema({
  label: "Venues",
  maxItems: 50,
  maxItemLength: 120,
});

/**
 * Accepts `@handle`, `handle`, or a full Instagram profile URL and normalizes
 * it to `https://www.instagram.com/<handle>/`. Empty means "not set".
 */
export const djInstagramSchema = z
  .string()
  .trim()
  .max(200, "Instagram link is too long.")
  .transform((value, ctx) => {
    if (value.length === 0) {
      return null;
    }

    const urlMatch = value.match(
      /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?$/i,
    );
    const handle = urlMatch ? urlMatch[1] : value.replace(/^@/, "").trim();

    if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) {
      ctx.addIssue({
        code: "custom",
        message: "Use an Instagram handle, e.g. @loudjakarta.",
      });

      return z.NEVER;
    }

    return `https://www.instagram.com/${handle}/`;
  });

/** Storage object created by the browser upload: `<profileId>/<file>.webp`. */
export const djPhotoPathSchema = z
  .string()
  .trim()
  .max(300, "Photo path is too long.")
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_-]+\.(?:webp|jpg|jpeg|png)$/i,
    "Invalid photo upload.",
  );

export const djPresskitSchema = z.object({
  stageName: djStageNameSchema,
  bio: djBioSchema,
  genres: djGenresSchema,
  venues: djVenuesSchema,
  instagramUrl: djInstagramSchema,
});

export type DjPresskitInput = z.infer<typeof djPresskitSchema>;
