export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: JAKARTA_TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: JAKARTA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Example: `SAT, 21 NOV 2026`. */
export function formatEventDate(value: string | Date): string {
  return dateFormatter.format(new Date(value)).toUpperCase();
}

/** Example: `22:00 WIB`. */
export function formatEventTime(value: string | Date): string {
  return `${timeFormatter.format(new Date(value))} WIB`;
}

/** Example: `SAT, 21 NOV 2026 · 22:00 WIB`. */
export function formatEventDateTime(value: string | Date): string {
  return `${formatEventDate(value)} · ${formatEventTime(value)}`;
}

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

/** `YYYY-MM-DDTHH:mm` in Asia/Jakarta, for `<input type="datetime-local">`. */
export function toJakartaDateTimeLocal(value: string | Date): string {
  return new Date(new Date(value).getTime() + JAKARTA_OFFSET_MS)
    .toISOString()
    .slice(0, 16);
}

/**
 * Converts a `datetime-local` value interpreted as Asia/Jakarta (UTC+7, no
 * DST) to an ISO timestamp. Returns null for malformed values.
 */
export function jakartaDateTimeLocalToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}:00+07:00`);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Lowercase, ASCII-only slug used for event URLs. */
export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || "event";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const megabytes = bytes / (1024 * 1024);

  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}
