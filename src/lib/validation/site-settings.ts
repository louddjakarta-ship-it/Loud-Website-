import { z } from "zod";

const CONTROL_EXCEPT_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f]/;

export const siteSettingsSchema = z.object({
  heroTagline: z
    .string()
    .trim()
    .min(1, "Enter a tagline.")
    .max(120, "Tagline must be 120 characters or fewer.")
    .refine(
      (value) => !CONTROL_EXCEPT_NEWLINE.test(value),
      "Tagline contains invalid characters.",
    )
    .refine(
      (value) => value.split(/\r?\n/).length <= 2,
      "Use at most two lines: first line white, second line accent.",
    ),
  heroDescription: z
    .string()
    .trim()
    .min(1, "Enter a description.")
    .max(400, "Description must be 400 characters or fewer.")
    .refine(
      (value) => !CONTROL_EXCEPT_NEWLINE.test(value),
      "Description contains invalid characters.",
    ),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;
