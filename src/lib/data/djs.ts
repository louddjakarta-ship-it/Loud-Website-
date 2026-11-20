import "server-only";

import { publicEnv } from "@/lib/env/public";
import { DJ_BUCKET } from "@/lib/storage/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type DjRow = Database["public"]["Tables"]["djs"]["Row"];

export type PublicDj = Pick<
  DjRow,
  | "id"
  | "stage_name"
  | "slug"
  | "bio"
  | "photo_path"
  | "genres"
  | "venues"
  | "instagram_url"
>;

const PUBLIC_DJ_COLUMNS =
  "id,stage_name,slug,bio,photo_path,genres,venues,instagram_url";

/** Published presskits, alphabetically. RLS hides drafts from visitors. */
export async function getPublishedDjs(limit = 48): Promise<PublicDj[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("djs")
    .select(PUBLIC_DJ_COLUMNS)
    .eq("is_published", true)
    .order("stage_name", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error("djs_unavailable");
  }

  return data ?? [];
}

/** One published presskit by URL slug. Returns null for drafts and unknowns. */
export async function getPublishedDjBySlug(
  slug: string,
): Promise<PublicDj | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("djs")
    .select(PUBLIC_DJ_COLUMNS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    throw new Error("dj_lookup_failed");
  }

  return data;
}

/** The signed-in DJ's own presskit, including drafts. */
export async function getOwnDj(profileId: string): Promise<DjRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("djs")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error("dj_lookup_failed");
  }

  return data;
}

/** Public URL for a file in the public `dj-photos` bucket. */
export function getDjPhotoPublicUrl(path: string | null): string | null {
  if (!path || !publicEnv.supabaseUrl) {
    return null;
  }

  const base = publicEnv.supabaseUrl.replace(/\/+$/, "");
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${base}/storage/v1/object/public/${DJ_BUCKET}/${encodedPath}`;
}
