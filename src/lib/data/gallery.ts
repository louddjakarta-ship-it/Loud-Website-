import "server-only";

import { publicEnv } from "@/lib/env/public";
import { GALLERY_BUCKET } from "@/lib/storage/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type GalleryRow = Database["public"]["Tables"]["gallery_photos"]["Row"];

export type GalleryPhoto = Pick<
  GalleryRow,
  "id" | "storage_path" | "caption" | "created_at"
>;

export async function getGalleryPhotos(limit = 12): Promise<GalleryPhoto[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id,storage_path,caption,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("gallery_unavailable");
  }

  return data ?? [];
}

/** Public URL for a gallery file in the public `gallery-photos` bucket. */
export function getGalleryPublicUrl(path: string | null): string | null {
  if (!path || !publicEnv.supabaseUrl) {
    return null;
  }

  const base = publicEnv.supabaseUrl.replace(/\/+$/, "");
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${base}/storage/v1/object/public/${GALLERY_BUCKET}/${encodedPath}`;
}
