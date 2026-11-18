import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  archiveEventAction,
  deleteEventAction,
  restoreEventAction,
  toggleEventPublishedAction,
  toggleEventRegistrationAction,
} from "@/app/admin/actions/events";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { CopyGuestlistLink } from "@/components/admin/copy-guestlist-link";
import { ButtonLink } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import { getFlyerPublicUrl } from "@/lib/data/events";
import { formatEventDateTime } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
  robots: { index: false, follow: false },
};

type EventsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const banners: Record<string, { tone: "success" | "error"; message: string }> =
  {
    created: { tone: "success", message: "Event created." },
    updated: { tone: "success", message: "Event updated." },
    archived: { tone: "success", message: "Event archived." },
    restored: { tone: "success", message: "Event restored." },
    deleted: { tone: "success", message: "Event deleted." },
    "invalid-event": { tone: "error", message: "Invalid event." },
    "update-failed": {
      tone: "error",
      message: "The event could not be updated.",
    },
    "archive-failed": {
      tone: "error",
      message: "The event could not be archived.",
    },
    "delete-failed": {
      tone: "error",
      message: "The event could not be deleted.",
    },
    "event-has-guestlist": {
      tone: "error",
      message:
        "This event has guestlist registrations and cannot be deleted. Archive it instead.",
    },
  };

export default async function AdminEventsPage({
  searchParams,
}: EventsPageProps) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const successKey = ["created", "updated", "archived", "restored", "deleted"].find(
    (key) => firstValue(params[key]),
  );
  const errorKey = firstValue(params.error);
  const banner =
    (errorKey ? banners[errorKey] : undefined) ??
    (successKey ? banners[successKey] : undefined) ??
    null;

  const supabase = await createServerSupabaseClient();
  const { data: events, error } = await supabase
    .from("events")
    .select(
      "id,name,slug,event_date,venue,flyer_path,is_published,registration_open,archived_at,guestlist_token",
    )
    .order("event_date", { ascending: false });

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
            Manage
          </p>
          <h1 className="mt-2 font-display text-h1 uppercase">Events</h1>
        </div>

        <ButtonLink href="/admin/events/new" size="lg">
          + New event
        </ButtonLink>
      </header>

      {banner ? (
        <div
          role="status"
          className={
            banner.tone === "success"
              ? "border border-accent/40 bg-accent/5 p-4 text-sm leading-relaxed text-accent"
              : "border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
          }
        >
          {banner.message}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          Events could not be loaded. Refresh the page or check the database
          connection.
        </div>
      ) : null}

      {!events || events.length === 0 ? (
        <div className="border border-line bg-surface p-7 sm:p-10">
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
            No events
          </p>
          <h2 className="mt-3 font-display text-h1 uppercase">
            Start with the first one.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Create an event, upload the flyer and publish it when it is ready.
            Draft events never appear on the public site.
          </p>
          <ButtonLink href="/admin/events/new" className="mt-6">
            Create event
          </ButtonLink>
        </div>
      ) : (
        <div className="overflow-x-auto border border-line">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface">
                {["Event", "Date", "Venue", "Status", "Actions"].map(
                  (heading) => (
                    <th
                      key={heading}
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
              {events.map((event) => {
                const flyerUrl = getFlyerPublicUrl(event.flyer_path);
                const archived = Boolean(event.archived_at);

                return (
                  <tr key={event.id} className={archived ? "opacity-60" : ""}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-11 shrink-0 overflow-hidden border border-line bg-ink">
                          {flyerUrl ? (
                            <Image
                              src={flyerUrl}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center font-mono text-[0.5rem] uppercase text-muted">
                              TBA
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-display text-lg uppercase leading-tight">
                            {event.name}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
                            /{event.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                      {formatEventDateTime(event.event_date)}
                    </td>

                    <td className="px-4 py-4 text-sm text-muted">
                      {event.venue?.trim() || "TBA"}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={
                            event.is_published
                              ? "bg-accent px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.08em] text-ink"
                              : "border border-line px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.08em] text-muted"
                          }
                        >
                          {event.is_published ? "Published" : "Draft"}
                        </span>

                        <span
                          className={
                            event.registration_open
                              ? "border border-success/40 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.08em] text-success"
                              : "border border-line px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.08em] text-muted"
                          }
                        >
                          {event.registration_open
                            ? "Guestlist open"
                            : "Guestlist closed"}
                        </span>

                        {archived ? (
                          <span className="border border-danger/40 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.08em] text-danger">
                            Archived
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/events/${event.id}/edit`}
                          className="border border-line px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-paper transition-colors hover:border-accent hover:text-accent"
                        >
                          Edit
                        </Link>

                        <CopyGuestlistLink
                          url={absoluteUrl(`/guestlist/${event.guestlist_token}`)}
                        />

                        {!archived ? (
                          <>
                            <form action={toggleEventPublishedAction}>
                              <input
                                type="hidden"
                                name="eventId"
                                value={event.id}
                              />
                              <input
                                type="hidden"
                                name="value"
                                value={event.is_published ? "false" : "true"}
                              />
                              <button
                                type="submit"
                                className="border border-line px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-accent hover:text-accent"
                              >
                                {event.is_published ? "Unpublish" : "Publish"}
                              </button>
                            </form>

                            <form action={toggleEventRegistrationAction}>
                              <input
                                type="hidden"
                                name="eventId"
                                value={event.id}
                              />
                              <input
                                type="hidden"
                                name="value"
                                value={event.registration_open ? "false" : "true"}
                              />
                              <button
                                type="submit"
                                className="border border-line px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-accent hover:text-accent"
                              >
                                {event.registration_open
                                  ? "Close guestlist"
                                  : "Open guestlist"}
                              </button>
                            </form>
                          </>
                        ) : null}

                        {admin.role === "super_admin" ? (
                          <>
                            <ConfirmForm
                              action={
                                archived ? restoreEventAction : archiveEventAction
                              }
                              message={
                                archived
                                  ? "Restore this event to the active list?"
                                  : "Archive this event? It will disappear from the public site but guestlist data stays intact."
                              }
                            >
                              <input
                                type="hidden"
                                name="eventId"
                                value={event.id}
                              />
                              <button
                                type="submit"
                                className="border border-line px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-accent hover:text-accent"
                              >
                                {archived ? "Restore" : "Archive"}
                              </button>
                            </ConfirmForm>

                            <ConfirmForm
                              action={deleteEventAction}
                              message="Delete this event permanently? This cannot be undone and is blocked when guestlist registrations exist."
                            >
                              <input
                                type="hidden"
                                name="eventId"
                                value={event.id}
                              />
                              <button
                                type="submit"
                                className="border border-line px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-danger hover:text-danger"
                              >
                                Delete
                              </button>
                            </ConfirmForm>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
