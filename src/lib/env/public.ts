/**
 * Public environment variables.
 *
 * These values are inlined into the browser bundle by Next.js, so they must
 * never contain secrets. Access them through static `process.env.NEXT_PUBLIC_*`
 * references (dynamic lookups are not inlined in client code).
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000",
  defaultWhatsappNumber:
    process.env.NEXT_PUBLIC_DEFAULT_WHATSAPP_NUMBER ?? "",
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
} as const;

/**
 * Validates that the Supabase browser credentials exist.
 * Called lazily so a missing .env.local only fails when Supabase is used.
 */
export function requireSupabasePublicEnv() {
  if (!publicEnv.supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.example to .env.local and fill it in.",
    );
  }

  if (!publicEnv.supabasePublishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill it in.",
    );
  }

  return {
    url: publicEnv.supabaseUrl,
    publishableKey: publicEnv.supabasePublishableKey,
  };
}
