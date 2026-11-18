export const GUESTLIST_PAGE_SIZE = 25;

export type GuestlistStatus = "pending" | "approved" | "rejected";
export type GuestlistSort = "newest" | "oldest";

export type GuestlistFilters = {
  q: string;
  eventId: string;
  status: GuestlistStatus | "";
  sort: GuestlistSort;
  page: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Keeps LIKE wildcards and PostgREST operators out of the search input. */
export function sanitizeGuestlistSearch(value: string): string {
  return value
    .trim()
    .slice(0, 60)
    .replace(/[^a-zA-Z0-9 .@_-]/g, "")
    .replace(/\s+/g, " ");
}

export function parseGuestlistFilters(
  params: Record<string, string | string[] | undefined>,
): GuestlistFilters {
  const statusValue = firstValue(params.status);
  const status: GuestlistStatus | "" =
    statusValue === "pending" ||
    statusValue === "approved" ||
    statusValue === "rejected"
      ? statusValue
      : "";

  const eventIdValue = firstValue(params.event);
  const eventId = UUID_PATTERN.test(eventIdValue) ? eventIdValue : "";

  const pageValue = Number.parseInt(firstValue(params.page), 10);

  return {
    q: sanitizeGuestlistSearch(firstValue(params.q)),
    eventId,
    status,
    sort: firstValue(params.sort) === "oldest" ? "oldest" : "newest",
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

export function buildGuestlistQuery(
  filters: Partial<GuestlistFilters>,
): string {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.eventId) {
    params.set("event", filters.eventId);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.sort && filters.sort !== "newest") {
    params.set("sort", filters.sort);
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}
