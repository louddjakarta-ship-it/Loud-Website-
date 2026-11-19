export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;

/** Lowercases and trims a login handle before validation or lookup. */
export function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Internal auth email for a username. Supabase Auth still requires an email,
 * but admins never see or type it. The domain is never monitored or used to
 * send mail.
 */
export function usernameAuthEmail(username: string): string {
  return `${username}@admin.loudjakarta.com`;
}
