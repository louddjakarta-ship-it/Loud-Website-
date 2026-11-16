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
