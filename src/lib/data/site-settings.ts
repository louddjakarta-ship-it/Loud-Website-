import "server-only";

import { cache } from "react";

import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/site-settings";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Reads the singleton site settings row. Cached per request so the homepage
 * and any layout component can ask without extra round-trips.
 *
 * Falls back to the built-in copy instead of breaking the public page.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("hero_tagline,hero_description")
      .eq("id", true)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_SITE_SETTINGS;
    }

    return {
      heroTagline: data.hero_tagline,
      heroDescription: data.hero_description,
    };
  } catch (error) {
    console.error(
      "[site-settings] unavailable",
      error instanceof Error ? error.message : "unknown",
    );
    return DEFAULT_SITE_SETTINGS;
  }
});
