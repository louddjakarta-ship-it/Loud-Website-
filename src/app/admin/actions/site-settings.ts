"use server";

import { revalidatePath } from "next/cache";

import type { EventActionState } from "@/lib/admin/event-action-state";
import { zodFieldErrors } from "@/lib/api";
import { getAdminSession } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { siteSettingsSchema } from "@/lib/validation/site-settings";

/**
 * Updates the homepage hero copy. Writes go through the authenticated client,
 * so RLS (`private.is_admin()`) and the column grants both apply.
 */
export async function updateSiteSettingsAction(
  formData: FormData,
): Promise<EventActionState> {
  const admin = await getAdminSession();

  if (!admin) {
    return {
      status: "error",
      message: "Your session expired. Sign in again.",
    };
  }

  const parsed = siteSettingsSchema.safeParse({
    heroTagline: formData.get("heroTagline") ?? "",
    heroDescription: formData.get("heroDescription") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fields: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("site_settings")
    .update({
      hero_tagline: parsed.data.heroTagline,
      hero_description: parsed.data.heroDescription,
      updated_by: admin.userId,
    })
    .eq("id", true);

  if (error) {
    console.error("[admin/site-settings] update failed", { code: error.code });

    return {
      status: "error",
      message: "We could not save the homepage text. Please try again.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return { status: "success", message: "Homepage text updated." };
}
