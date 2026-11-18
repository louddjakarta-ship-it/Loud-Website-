"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { EventActionState } from "@/lib/admin/event-action-state";
import { zodFieldErrors } from "@/lib/api";
import { getAdminSession } from "@/lib/auth/admin";
import { GALLERY_BUCKET } from "@/lib/storage/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { galleryPhotoSchema } from "@/lib/validation/gallery";

const photoIdSchema = z.uuid("Invalid photo.");

/**
 * Records an uploaded gallery photo. The file itself is uploaded from the
 * browser straight to Storage (admin-only RLS), so this action accepts only
 * metadata and verifies the object exists before inserting the row.
 */
export async function createGalleryPhotoAction(input: {
  storagePath: string;
  caption: string;
}): Promise<EventActionState> {
  const admin = await getAdminSession();

  if (!admin) {
    return {
      status: "error",
      message: "Your session expired. Sign in again.",
    };
  }

  const parsed = galleryPhotoSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: "That upload is not valid. Choose the photo again.",
      fields: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createServerSupabaseClient();

  const { error: verifyError } = await supabase.storage
    .from(GALLERY_BUCKET)
    .createSignedUrl(parsed.data.storagePath, 60);

  if (verifyError) {
    return {
      status: "error",
      message: "The upload could not be verified. Please try again.",
    };
  }

  const { error } = await supabase.from("gallery_photos").insert({
    storage_path: parsed.data.storagePath,
    caption: parsed.data.caption,
    created_by: admin.userId,
  });

  if (error) {
    console.error("[admin/gallery] insert failed", { code: error.code });

    return {
      status: "error",
      message:
        error.code === "23505"
          ? "This photo is already in the gallery."
          : "We could not save the photo. Please try again.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin/gallery");

  return { status: "success", message: "Photo added to the gallery." };
}

/** Removes the photo row and its Storage object. */
export async function deleteGalleryPhotoAction(
  formData: FormData,
): Promise<void> {
  const admin = await getAdminSession();

  if (!admin) {
    redirect("/admin/login");
  }

  const photoId = photoIdSchema.safeParse(formData.get("photoId"));

  if (!photoId.success) {
    redirect("/admin/gallery");
  }

  const supabase = await createServerSupabaseClient();
  const { data: photo, error: readError } = await supabase
    .from("gallery_photos")
    .select("id,storage_path")
    .eq("id", photoId.data)
    .maybeSingle();

  if (readError || !photo) {
    redirect("/admin/gallery");
  }

  const { error: storageError } = await supabase.storage
    .from(GALLERY_BUCKET)
    .remove([photo.storage_path]);

  if (storageError) {
    console.error("[admin/gallery] storage delete failed", {
      statusCode: storageError.name,
    });
  }

  const { error: deleteError } = await supabase
    .from("gallery_photos")
    .delete()
    .eq("id", photo.id);

  if (deleteError) {
    console.error("[admin/gallery] delete failed", { code: deleteError.code });
  }

  revalidatePath("/");
  revalidatePath("/admin/gallery");
  redirect("/admin/gallery");
}
