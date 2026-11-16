import "server-only";

import { publicEnv } from "./public";

/**
 * Server-only Supabase credentials. The secret key bypasses Row Level
 * Security, so it must never reach the browser bundle.
 */
export function getSupabaseAdminEnv() {
  if (!publicEnv.supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.example to .env.local and fill it in.",
    );
  }

  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY. This value is server-only and must never be prefixed with NEXT_PUBLIC_.",
    );
  }

  return { url: publicEnv.supabaseUrl, secretKey };
}

/**
 * Salt used to hash submitter IP addresses for rate limiting. Raw IP
 * addresses are never stored.
 */
export function getRateLimitSalt() {
  const salt = process.env.RATE_LIMIT_SALT;

  if (!salt) {
    throw new Error(
      "Missing RATE_LIMIT_SALT. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }

  return salt;
}

export function getTurnstileSecret() {
  return process.env.TURNSTILE_SECRET_KEY ?? "";
}

/** Maximum size per proof image, in bytes. Defaults to 5 MB. */
export function getMaxProofFileBytes() {
  const raw = Number(process.env.GUESTLIST_MAX_FILE_MB ?? "5");
  const megabytes = Number.isFinite(raw) && raw > 0 ? raw : 5;

  return Math.floor(megabytes * 1024 * 1024);
}
