import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminEnv } from "@/lib/env/server";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. Bypasses Row Level Security.
 *
 * Rules:
 * - Only import from server-side modules (route handlers, server actions,
 *   server-only helpers).
 * - Always authenticate and authorize the caller before using it.
 * - Never return raw errors or storage paths to the browser.
 */
export function createAdminSupabaseClient() {
  const { url, secretKey } = getSupabaseAdminEnv();

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
