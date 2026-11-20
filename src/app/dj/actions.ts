"use server";

import { revalidatePath } from "next/cache";

import type { EventActionState } from "@/lib/admin/event-action-state";
import { zodFieldErrors } from "@/lib/api";
import { getAdminSession } from "@/lib/auth/admin";
import { hasRole } from "@/lib/auth/roles";
import { slugify } from "@/lib/format";
import { DJ_BUCKET } from "@/lib/storage/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  djPhotoPathSchema,
  djPresskitSchema,
} from "@/lib/validation/dj";

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** Rows are limited by RLS to the signed-in DJ's own presskit. */
async function removePhoto(
  supabase: SupabaseClient,
  path: string,
): Promise<void> {
  const { error } = await supabase.storage.from(DJ_BUCKET).remove([path]);

  if (error) {
    console.error("[dj] old photo cleanup failed", { name: error.name });
  }
}

/**
 * Creates or updates the signed-in DJ's own presskit. The photo is uploaded
 * from the browser straight to Storage, so this action receives only its path
 * and verifies the object exists before saving.
 */
export async function saveDjPresskitAction(input: {
  stageName: string;
  bio: string;
  genres: string;
  venues: string;
  instagramUrl: string;
  isPublished: boolean;
  photoPath: string | null;
}): Promise<EventActionState> {
  const admin = await getAdminSession();

  if (!admin) {
    return { status: "error", message: "Your session expired. Sign in again." };
  }

  if (!hasRole(admin.roles, "dj")) {
    return {
      status: "error",
      message: "Only an account with the DJ role can edit a presskit.",
    };
  }

  const parsed = djPresskitSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fields: zodFieldErrors(parsed.error),
    };
  }

  let photoPath: string | null = null;

  if (input.photoPath) {
    const parsedPath = djPhotoPathSchema.safeParse(input.photoPath);

    if (!parsedPath.success || !parsedPath.data.startsWith(`${admin.userId}/`)) {
      return {
        status: "error",
        message: "That photo upload is not valid. Choose the photo again.",
        fields: { photo: "Choose the photo again." },
      };
    }

    photoPath = parsedPath.data;
  }

  const supabase = await createServerSupabaseClient();

  if (photoPath) {
    const { error: verifyError } = await supabase.storage
      .from(DJ_BUCKET)
      .createSignedUrl(photoPath, 60);

    if (verifyError) {
      return {
        status: "error",
        message: "The photo upload could not be verified. Try again.",
        fields: { photo: "Upload the photo again." },
      };
    }
  }

  const { data: existing, error: readError } = await supabase
    .from("djs")
    .select("id,slug,photo_path")
    .eq("profile_id", admin.userId)
    .maybeSingle();

  if (readError) {
    return {
      status: "error",
      message: "Your presskit could not be loaded. Please try again.",
    };
  }

  const record = {
    stage_name: parsed.data.stageName,
    bio: parsed.data.bio,
    genres: parsed.data.genres,
    venues: parsed.data.venues,
    instagram_url: parsed.data.instagramUrl,
    photo_path: photoPath,
    is_published: input.isPublished,
  };

  let slug: string;

  if (existing) {
    const { error: updateError } = await supabase
      .from("djs")
      .update(record)
      .eq("id", existing.id);

    if (updateError) {
      console.error("[dj] update failed", { code: updateError.code });

      return {
        status: "error",
        message: "Your presskit could not be saved. Please try again.",
      };
    }

    slug = existing.slug;
  } else {
    const base = slugify(parsed.data.stageName).slice(0, 72) || "dj";
    let inserted = false;

    slug = base;

    for (let attempt = 1; attempt <= 20 && !inserted; attempt += 1) {
      const candidate = attempt === 1 ? base : `${base}-${attempt}`;
      const { error: insertError } = await supabase
        .from("djs")
        .insert({ ...record, profile_id: admin.userId, slug: candidate });

      if (!insertError) {
        slug = candidate;
        inserted = true;
        break;
      }

      if (insertError.code !== "23505") {
        console.error("[dj] insert failed", { code: insertError.code });

        return {
          status: "error",
          message: "Your presskit could not be saved. Please try again.",
        };
      }
    }

    if (!inserted) {
      return {
        status: "error",
        message:
          "That stage name is already in use. Try a slightly different name.",
        fields: { stageName: "That stage name is already in use." },
      };
    }
  }

  // Replacing or removing a portrait should not leave orphans behind.
  if (existing?.photo_path && existing.photo_path !== photoPath) {
    await removePhoto(supabase, existing.photo_path);
  }

  revalidatePath("/");
  revalidatePath("/djs");
  revalidatePath(`/djs/${slug}`);
  revalidatePath("/dj");

  return {
    status: "success",
    message: "Presskit saved.",
    redirectTo: input.isPublished ? `/djs/${slug}` : undefined,
  };
}
