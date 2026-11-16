import "server-only";

import { getTurnstileSecret } from "@/lib/env/server";

export function isTurnstileEnabled(): boolean {
  return getTurnstileSecret().length > 0;
}

/**
 * Verifies a Cloudflare Turnstile token server-side.
 *
 * When no secret is configured, verification is skipped so local development
 * and small deployments work without an account. If a secret is configured,
 * the token is mandatory.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
): Promise<boolean> {
  const secret = getTurnstileSecret();

  if (!secret) {
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({ secret, response: token }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as { success?: boolean };

    return result.success === true;
  } catch {
    return false;
  }
}
