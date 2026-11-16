"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabasePublicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database";

type BrowserSupabaseClient = SupabaseClient<Database>;

let client: BrowserSupabaseClient | undefined;

/**
 * Browser Supabase client using the publishable key.
 *
 * Only safe for public operations (reading published events, auth session
 * handling, signed uploads). Never use this to read guestlist data.
 */
export function createBrowserSupabaseClient() {
  if (!client) {
    const { url, publishableKey } = requireSupabasePublicEnv();
    client = createBrowserClient<Database>(url, publishableKey);
  }

  return client;
}
