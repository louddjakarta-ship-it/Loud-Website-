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
  | "whatsapp_number"
  | "registration_open"
>;

const PUBLIC_EVENT_COLUMNS =
  "id,name,slug,description,flyer_path,event_date,venue,whatsapp_number,registration_open";

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

/** Published events that are still accepting guestlist registrations. */
export async function getOpenGuestlistEvents(): Promise<PublicEvent[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select(PUBLIC_EVENT_COLUMNS)
    .eq("is_published", true)
    .eq("registration_open", true)
    .is("archived_at", null)
    .gte("event_date", nowIso())
    .order("event_date", { ascending: true });

  if (error) {
    throw new Error("events_unavailable");
  }

  return data ?? [];
}

/**
 * Server-side check used by both guestlist endpoints. Uses the service role so
 * a stale client cannot submit to an event that has just been closed.
 */
export async function getEventForSubmission(eventId: string): Promise<{
  id: string;
  event_date: string;
} | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("events")
    .select("id,event_date,is_published,registration_open,archived_at")
    .eq("id", eventId)
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
