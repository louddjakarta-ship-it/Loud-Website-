export type SiteSettings = {
  heroTagline: string;
  heroDescription: string;
};

/** Fallback used when the settings row cannot be read. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  heroTagline: "We make\nnoise.",
  heroDescription:
    "Underground nightlife, electronic music and contemporary culture. We don't follow the noise. We make it.",
};

/**
 * Splits the editable tagline into hero lines. Line one renders in white, the
 * remaining line(s) in the accent color.
 */
export function splitTagline(tagline: string): string[] {
  const lines = tagline
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0
    ? lines
    : DEFAULT_SITE_SETTINGS.heroTagline.split("\n");
}
