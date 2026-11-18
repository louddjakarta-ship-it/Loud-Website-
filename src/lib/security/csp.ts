import { publicEnv } from "@/lib/env/public";

/**
 * Per-request nonce for the Content-Security-Policy.
 *
 * A UUID has enough entropy for a single page view; browsers only require the
 * value to be unguessable and unique per response.
 */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}

function supabaseOrigin(): string | null {
  if (!publicEnv.supabaseUrl) {
    return null;
  }

  try {
    return new URL(publicEnv.supabaseUrl).origin;
  } catch {
    return null;
  }
}

/**
 * Strict CSP for App Router pages.
 *
 * - Scripts use a nonce plus `strict-dynamic`, matching the Next.js guide.
 * - `style-src` keeps `'unsafe-inline'` because `next/image` renders inline
 *   style attributes and nonces cannot be applied to style attributes.
 * - Supabase Storage/Auth origins are allowed for images and XHR/fetch.
 * - Turnstile needs its script and iframe origins.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const origin = supabaseOrigin();
  const connectOrigins = origin
    ? [origin, origin.replace(/^https:/, "wss:")]
    : [];
  const imageOrigins = ["https://*.supabase.co", origin].filter(Boolean);

  const directives = [
    "default-src 'self'",
    [
      "script-src 'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "https://challenges.cloudflare.com",
      isDev ? "'unsafe-eval'" : "",
    ]
      .filter(Boolean)
      .join(" "),
    "style-src 'self' 'unsafe-inline'",
    ["img-src 'self' blob: data:", ...imageOrigins].join(" "),
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      ...connectOrigins,
      isDev ? "http://127.0.0.1:54321 http://localhost:54321" : "",
    ]
      .filter(Boolean)
      .join(" "),
    "frame-src https://challenges.cloudflare.com",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isDev ? "" : "upgrade-insecure-requests",
  ].filter(Boolean);

  return directives.join("; ");
}
