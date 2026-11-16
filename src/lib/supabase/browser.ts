"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requireSupabasePublicEnv } from "@/lib/env/public";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

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
    client = createBrowserClient(url, publishableKey);
  }

  return client;
}
