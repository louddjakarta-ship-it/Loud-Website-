import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requireSupabasePublicEnv } from "@/lib/env/public";

/**
 * Server Supabase client bound to the request cookies.
 *
 * Uses the publishable key, so Row Level Security still applies. This is the
 * correct client for reading public data and checking the admin session.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = requireSupabasePublicEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh is handled by `src/proxy.ts`.
        }
      },
    },
  });
}
