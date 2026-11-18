import "server-only";

import { publicEnv } from "@/lib/env/public";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

export type PublicEvent = Pick<
  EventRow,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "flyer_path"
  | "event_date"
  | "venue"
  | "maps_url"
  | "whatsapp_number"
  | "registration_open"
>;

const PUBLIC_EVENT_COLUMNS =
  "id,name,slug,description,flyer_path,event_date,venue,maps_url,whatsapp_number,registration_open";

function nowIso(): string {
  return new Date().toISOString();
}

/** Published, non-archived events that have not started yet. */
export async function getUpcomingPublicEvents(): Promise<PublicEvent[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select(PUBLIC_EVENT_COLUMNS)
    .eq("is_published", true)
    .is("archived_at", null)
    .gte("event_date", nowIso())
    .order("event_date", { ascending: true });

  if (error) {
    throw new Error("events_unavailable");
  }

  return data ?? [];
}

/**
 * Resolves a private guestlist share link through the token-scoped RPC. The
 * token column itself is never readable by anon, and the function filters out
 * events that are unpublished, archived, closed or already past.
 *
 * Returns null when the token is unknown or the event is not open.
 */
export async function getEventByGuestlistToken(
  token: string,
): Promise<PublicEvent | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_guestlist_event_link", {
    link_token: token,
  });

  if (error) {
    throw new Error("event_lookup_failed");
  }

  const row = data?.[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    flyer_path: row.flyer_path,
    event_date: row.event_date,
    venue: row.venue,
    maps_url: null,
    whatsapp_number: row.whatsapp_number,
    registration_open: true,
  };
}

/**
 * Server-side check used by both guestlist endpoints. Uses the service role so
 * a stale client cannot submit to an event that has just been closed, and
 * requires the event's share token so the API cannot be used without a link.
 */
export async function getEventForSubmission(
  eventId: string,
  guestlistToken: string,
): Promise<{
  id: string;
  event_date: string;
} | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("events")
    .select("id,event_date,is_published,registration_open,archived_at")
    .eq("id", eventId)
    .eq("guestlist_token", guestlistToken)
    .maybeSingle();

  if (error) {
    throw new Error("event_lookup_failed");
  }

  if (!data) {
    return null;
  }

  if (!data.is_published || data.archived_at || !data.registration_open) {
    return null;
  }

  if (new Date(data.event_date).getTime() < Date.now()) {
    return null;
  }

  return { id: data.id, event_date: data.event_date };
}

/** Public URL for a flyer stored in the public `event-flyers` bucket. */
export function getFlyerPublicUrl(path: string | null): string | null {
  if (!path || !publicEnv.supabaseUrl) {
    return null;
  }

  const base = publicEnv.supabaseUrl.replace(/\/+$/, "");
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${base}/storage/v1/object/public/event-flyers/${encodedPath}`;
}
