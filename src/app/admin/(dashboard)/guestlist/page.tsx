import type { Metadata } from "next";
import Link from "next/link";

import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import {
  GUESTLIST_PAGE_SIZE,
  buildGuestlistQuery,
  parseGuestlistFilters,
  type GuestlistStatus,
} from "@/lib/admin/guestlist-filters";
import { requireAdmin } from "@/lib/auth/admin";
import { hasRole } from "@/lib/auth/roles";
import { formatEventDateTime } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guestlist",
  robots: { index: false, follow: false },
};

type GuestlistPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const statusLabels: Record<GuestlistStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

function statusClasses(status: GuestlistStatus): string {
  switch (status) {
    case "approved":
      return "border border-success/40 text-success";
    case "rejected":
      return "border border-danger/40 text-danger";
    case "pending":
      return "border border-accent/40 text-accent";
  }
}

export default async function AdminGuestlistPage({
  searchParams,
}: GuestlistPageProps) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const filters = parseGuestlistFilters(params);
  const from = (filters.page - 1) * GUESTLIST_PAGE_SIZE;
  const to = from + GUESTLIST_PAGE_SIZE - 1;

  const supabase = await createServerSupabaseClient();

  const eventsQuery = supabase
    .from("events")
    .select("id,name,event_date")
    .order("event_date", { ascending: false });

  let rowsQuery = supabase
    .from("guestlist")
    .select(
      "id,full_name,instagram,reference_person,status,created_at,event:events(id,name,event_date)",
      { count: "exact" },
    );

  if (filters.q) {
    const term = filters.q.replace(/[%]/g, "");
    rowsQuery = rowsQuery.or(
      `full_name.ilike.%${term}%,instagram.ilike.%${term}%`,
    );
  }

  if (filters.eventId) {
    rowsQuery = rowsQuery.eq("event_id", filters.eventId);
  }

  if (filters.status) {
    rowsQuery = rowsQuery.eq("status", filters.status);
  }

  rowsQuery = rowsQuery
    .order("created_at", { ascending: filters.sort === "oldest" })
    .range(from, to);

  const [{ data: events }, { data: rows, count, error }] = await Promise.all([
    eventsQuery,
    rowsQuery,
  ]);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / GUESTLIST_PAGE_SIZE));
  const hasFilters = Boolean(
    filters.q || filters.eventId || filters.status || filters.sort !== "newest",
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
            Review
          </p>
          <h1 className="mt-2 font-display text-h1 uppercase">Guestlist</h1>
          <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
            {total} registration{total === 1 ? "" : "s"}
            {hasFilters ? " matching filters" : " total"}
          </p>
        </div>

        {hasRole(admin.roles, "super_admin") ? (
          <ButtonLink
            href={`/api/admin/guestlist/export${buildGuestlistQuery({
              ...filters,
              page: 1,
            })}`}
            variant="outline"
            size="lg"
          >
            Export CSV
          </ButtonLink>
        ) : (
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
            CSV export is super admin only
          </span>
        )}
      </header>

      {params.deleted ? (
        <div
          role="status"
          className="border border-accent/40 bg-accent/5 p-4 text-sm leading-relaxed text-accent"
        >
          Registration deleted. The Instagram handle can now submit again.
        </div>
      ) : null}

      {params.error ? (
        <div
          role="alert"
          className="border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          {params.error === "invalid-registration"
            ? "Invalid registration."
            : "That action could not be completed."}
        </div>
      ) : null}

      <form
        action="/admin/guestlist"
        method="get"
        className="grid gap-4 border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-12"
      >
        <div className="lg:col-span-4">
          <Label htmlFor="filter-q">Search</Label>
          <Input
            id="filter-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Name or Instagram"
            maxLength={60}
          />
        </div>

        <div className="lg:col-span-3">
          <Label htmlFor="filter-event">Event</Label>
          <Select
            id="filter-event"
            name="event"
            defaultValue={filters.eventId}
          >
            <option value="">All events</option>
            {(events ?? []).map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} — {formatEventDateTime(event.event_date)}
              </option>
            ))}
          </Select>
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="filter-status">Status</Label>
          <Select
            id="filter-status"
            name="status"
            defaultValue={filters.status}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="filter-sort">Sort</Label>
          <Select id="filter-sort" name="sort" defaultValue={filters.sort}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </Select>
        </div>

        <div className="flex items-end gap-3 lg:col-span-1">
          <Button type="submit" className="w-full">
            Apply
          </Button>
        </div>

        {hasFilters ? (
          <div className="lg:col-span-12">
            <Link
              href="/admin/guestlist"
              className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-accent"
            >
              Reset filters
            </Link>
          </div>
        ) : null}
      </form>

      {error ? (
        <div
          role="alert"
          className="border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          Registrations could not be loaded. Refresh the page or check the
          database connection.
        </div>
      ) : null}

      {!rows || rows.length === 0 ? (
        <div className="border border-line bg-surface p-7 sm:p-10">
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
            Empty
          </p>
          <h2 className="mt-3 font-display text-h1 uppercase">
            No registrations found.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            {hasFilters
              ? "Try a different search, event or status filter."
              : "New guestlist submissions will appear here as soon as they arrive."}
          </p>
          {hasFilters ? (
            <ButtonLink href="/admin/guestlist" variant="outline" className="mt-6">
              Reset filters
            </ButtonLink>
          ) : null}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface">
                  {["Guest", "Event", "Reference", "Status", "Submitted", ""].map(
                    (heading, index) => (
                      <th
                        key={`${heading}-${index}`}
                        scope="col"
                        className="px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="font-display text-lg uppercase leading-tight">
                        {row.full_name}
                      </p>
                      <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                        @{row.instagram}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm text-paper">
                        {row.event?.name ?? "Unknown event"}
                      </p>
                      {row.event ? (
                        <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
                          {formatEventDateTime(row.event.event_date)}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 text-sm text-muted">
                      {row.reference_person}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-block px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.08em] ${statusClasses(row.status)}`}
                      >
                        {statusLabels[row.status]}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
                      {formatEventDateTime(row.created_at)}
                    </td>

                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/guestlist/${row.id}`}
                        className="border border-line px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-paper transition-colors hover:border-accent hover:text-accent"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav
            aria-label="Pagination"
            className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
              Page {filters.page} of {totalPages}
            </p>

            <div className="flex gap-2">
              {filters.page > 1 ? (
                <Link
                  href={`/admin/guestlist${buildGuestlistQuery({
                    ...filters,
                    page: filters.page - 1,
                  })}`}
                  className="border border-line px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-paper transition-colors hover:border-accent hover:text-accent"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="border border-line px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted/40">
                  ← Previous
                </span>
              )}

              {filters.page < totalPages ? (
                <Link
                  href={`/admin/guestlist${buildGuestlistQuery({
                    ...filters,
                    page: filters.page + 1,
                  })}`}
                  className="border border-line px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-paper transition-colors hover:border-accent hover:text-accent"
                >
                  Next →
                </Link>
              ) : (
                <span className="border border-line px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted/40">
                  Next →
                </span>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
