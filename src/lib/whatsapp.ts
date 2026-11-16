/**
 * Normalizes a phone number to the digits-only international format required
 * by wa.me. Accepts `+62...`, `62...`, `08...` and `8...`.
 *
 * Returns `null` when the value is missing or does not look like a valid
 * international number (8–15 digits, no leading zero).
 */
export function normalizeWhatsAppNumber(
  raw: string | null | undefined,
): string | null {
  if (!raw) {
    return null;
  }

  let digits = raw.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith("8")) {
    digits = `62${digits}`;
  }

  if (!/^[1-9][0-9]{7,14}$/.test(digits)) {
    return null;
  }

  return digits;
}

export function buildRsvpMessage(eventName: string): string {
  return `Hi LOUD JAKARTA! I would like to RSVP for ${eventName}. Please provide me with more information.`;
}

/**
 * Builds a wa.me link. The event number wins, then the site-wide fallback.
 * Returns `null` when no valid number exists, so the UI can render an honest
 * disabled state instead of a fake link.
 */
export function buildRsvpUrl({
  eventName,
  eventNumber,
  fallbackNumber,
}: {
  eventName: string;
  eventNumber: string | null;
  fallbackNumber: string | null;
}): string | null {
  const number =
    normalizeWhatsAppNumber(eventNumber) ??
    normalizeWhatsAppNumber(fallbackNumber);

  if (!number) {
    return null;
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(
    buildRsvpMessage(eventName),
  )}`;
}

/** Builds a plain WhatsApp chat link for the footer contact block. */
export function buildWhatsAppContactUrl(
  number: string | null | undefined,
): string | null {
  const normalized = normalizeWhatsAppNumber(number);

  return normalized ? `https://wa.me/${normalized}` : null;
}
