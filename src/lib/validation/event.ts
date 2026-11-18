import { z } from "zod";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(80, "Slug must be 80 characters or fewer.")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single dashes.",
  );

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .refine(
      (value) => !CONTROL_CHARACTERS.test(value),
      `${label} contains invalid characters.`,
    )
    .transform((value) => (value.length > 0 ? value : null));

export const eventNameSchema = z
  .string()
  .trim()
  .min(1, "Enter an event name.")
  .max(140, "Event name must be 140 characters or fewer.")
  .refine(
    (value) => !CONTROL_CHARACTERS.test(value),
    "Event name contains invalid characters.",
  );

export const eventDateInputSchema = z
  .string()
  .trim()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    "Choose a valid date and time.",
  );

export const whatsappNumberSchema = z
  .string()
  .trim()
  .max(24, "WhatsApp number is too long.")
  .transform((value) => value.replace(/[\s().-]/g, ""))
  .refine(
    (value) =>
      value === "" || /^(\+?62|0|8)[0-9]{7,15}$/.test(value),
    "Use an Indonesian number, e.g. 6281234567890.",
  )
  .transform((value) => (value.length > 0 ? value : null));

/** Normalizes an accepted Indonesian number to digits-only `62...`. */
export function normalizeEventWhatsapp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith("8")) {
    digits = `62${digits}`;
  }

  return /^[1-9][0-9]{7,14}$/.test(digits) ? digits : null;
}

const GOOGLE_MAPS_HOST =
  /^(?:(?:www\.)?google\.(?:com|co\.[a-z]{2}|[a-z]{2})|maps\.google\.(?:com|co\.[a-z]{2}|[a-z]{2})|maps\.app\.goo\.gl|goo\.gl)$/;

/**
 * Only accepts HTTPS links on Google's own Maps hosts so the value can never
 * become an arbitrary outbound link on the public event card.
 */
export function isGoogleMapsUrl(value: string): boolean {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    return false;
  }

  if (!GOOGLE_MAPS_HOST.test(url.hostname)) {
    return false;
  }

  if (url.hostname === "maps.app.goo.gl") {
    return url.pathname.length > 1;
  }

  if (url.hostname === "goo.gl") {
    return url.pathname.startsWith("/maps/");
  }

  if (/^(?:www\.)?google\./.test(url.hostname)) {
    return url.pathname.startsWith("/maps");
  }

  return true;
}

export const googleMapsUrlSchema = z
  .string()
  .trim()
  .max(500, "Maps link must be 500 characters or fewer.")
  .refine(
    (value) => value === "" || isGoogleMapsUrl(value),
    "Paste a Google Maps link, e.g. https://maps.app.goo.gl/...",
  )
  .transform((value) => (value.length > 0 ? value : null));

export const eventFormSchema = z.object({
  name: eventNameSchema,
  slug: z.union([slugSchema, z.literal("")]).optional(),
  description: optionalText(2000, "Description"),
  eventDate: eventDateInputSchema,
  venue: optionalText(160, "Venue"),
  mapsUrl: googleMapsUrlSchema,
  whatsappNumber: whatsappNumberSchema,
});

export type EventFormValues = z.infer<typeof eventFormSchema>;
