"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAdminSession, type AdminSession } from "@/lib/auth/admin";
import { PROOF_BUCKET } from "@/lib/storage/constants";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const guestlistIdSchema = z.uuid("Invalid registration.");
const decisionSchema = z.enum(["approved", "rejected"], "Choose a decision.");
const noteSchema = z
  .string()
  .trim()
  .max(1000, "Note must be 1000 characters or fewer.")
  .transform((value) => (value.length > 0 ? value : null));

async function requireAdminForAction(): Promise<AdminSession> {
  const admin = await getAdminSession();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

export async function reviewGuestlistAction(
  formData: FormData,
): Promise<void> {
  await requireAdminForAction();

  const id = guestlistIdSchema.safeParse(formData.get("guestlistId"));
  const decision = decisionSchema.safeParse(formData.get("decision"));
  const note = noteSchema.safeParse(formData.get("adminNote") ?? "");

  if (!id.success) {
    redirect("/admin/guestlist?error=invalid-registration");
  }

  if (!decision.success) {
    redirect(`/admin/guestlist/${id.data}?error=invalid-decision`);
  }

  if (!note.success) {
    redirect(`/admin/guestlist/${id.data}?error=note-too-long`);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("guestlist")
    .update({ status: decision.data, admin_note: note.data })
    .eq("id", id.data)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin/guestlist] review failed", { code: error.code });
    redirect(`/admin/guestlist/${id.data}?error=review-failed`);
  }

  if (!data) {
    redirect(`/admin/guestlist/${id.data}?error=already-reviewed`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/guestlist");
  revalidatePath(`/admin/guestlist/${id.data}`);
  redirect(`/admin/guestlist/${id.data}?reviewed=${decision.data}`);
}

export async function deleteGuestlistAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminForAction();

  if (admin.role !== "super_admin") {
    redirect("/admin/unauthorized?reason=role");
  }

  const id = guestlistIdSchema.safeParse(formData.get("guestlistId"));

  if (!id.success) {
    redirect("/admin/guestlist?error=invalid-registration");
  }

  const supabase = await createServerSupabaseClient();
  const { data: row, error: readError } = await supabase
    .from("guestlist")
    .select("story_proof_path,comment_proof_path")
    .eq("id", id.data)
    .maybeSingle();

  if (readError || !row) {
    redirect("/admin/guestlist?error=invalid-registration");
  }

  const { error } = await supabase
    .from("guestlist")
    .delete()
    .eq("id", id.data);

  if (error) {
    console.error("[admin/guestlist] delete failed", { code: error.code });
    redirect(`/admin/guestlist/${id.data}?error=delete-failed`);
  }

  // Best effort: the row is already gone, and the orphan script can clean up
  // the storage objects if the service role is unavailable.
  try {
    const storage = createAdminSupabaseClient();
    await storage.storage
      .from(PROOF_BUCKET)
      .remove([row.story_proof_path, row.comment_proof_path]);
  } catch {
    // Ignored on purpose.
  }

  revalidatePath("/admin");
  revalidatePath("/admin/guestlist");
  redirect("/admin/guestlist?deleted=1");
}
