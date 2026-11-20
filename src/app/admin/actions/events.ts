"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { EventActionState } from "@/lib/admin/event-action-state";
import { zodFieldErrors } from "@/lib/api";
import { getAdminSession, type AdminSession } from "@/lib/auth/admin";
import { hasRole } from "@/lib/auth/roles";
import { jakartaDateTimeLocalToIso, slugify } from "@/lib/format";
import {
  detectImageMime,
  extensionForImageMime,
} from "@/lib/images/magic-bytes";
import { FLYER_BUCKET } from "@/lib/storage/constants";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { eventFormSchema, normalizeEventWhatsapp } from "@/lib/validation/event";

const MAX_FLYER_BYTES = 4 * 1024 * 1024;
const eventIdSchema = z.uuid("Invalid event.");

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

function parseEventForm(formData: FormData) {
  const parsed = eventFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    eventDate: formData.get("eventDate"),
    venue: formData.get("venue") ?? "",
    mapsUrl: formData.get("mapsUrl") ?? "",
    whatsappNumber: formData.get("whatsappNumber") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      state: {
        status: "error" as const,
        message: "Check the highlighted fields and try again.",
        fields: zodFieldErrors(parsed.error),
      },
    };
  }

  const eventDateIso = jakartaDateTimeLocalToIso(parsed.data.eventDate);

  if (!eventDateIso) {
    return {
      ok: false as const,
      state: {
        status: "error" as const,
        message: "Choose a valid date and time.",
        fields: { eventDate: "Choose a valid date and time." },
      },
    };
  }

  const whatsappNumber = normalizeEventWhatsapp(parsed.data.whatsappNumber);

  if (parsed.data.whatsappNumber && !whatsappNumber) {
    return {
      ok: false as const,
      state: {
        status: "error" as const,
        message: "Use an Indonesian WhatsApp number.",
        fields: {
          whatsappNumber: "Use an Indonesian number, e.g. 6281234567890.",
        },
      },
    };
  }

  return {
    ok: true as const,
    values: {
      ...parsed.data,
      eventDateIso,
      whatsappNumber,
    },
  };
}

async function resolveUniqueSlug(
  supabase: ServerSupabase,
  requested: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(requested);
  let candidate = base;

  for (let suffix = 2; suffix <= 50; suffix += 1) {
    const { data, error } = await supabase
      .from("events")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error("slug_lookup_failed");
    }

    if (!data || data.id === excludeId) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
  }

  return `${base}-${Date.now().toString(36)}`;
}

async function uploadFlyer(
  eventId: string,
  file: File,
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  if (file.size > MAX_FLYER_BYTES) {
    return {
      ok: false,
      message: "Flyer must be 4 MB or smaller after compression.",
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectImageMime(bytes);

  if (!mime) {
    return { ok: false, message: "Use a JPG, PNG or WEBP image." };
  }

  const path = `${eventId}/${crypto.randomUUID()}.${extensionForImageMime(mime)}`;

  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin.storage
      .from(FLYER_BUCKET)
      .upload(path, bytes, { contentType: mime, upsert: false });

    if (error) {
      return {
        ok: false,
        message: "We could not upload the flyer. Please try again.",
      };
    }

    return { ok: true, path };
  } catch {
    return {
      ok: false,
      message: "We could not upload the flyer. Please try again.",
    };
  }
}

async function deleteFlyer(path: string): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    await admin.storage.from(FLYER_BUCKET).remove([path]);
  } catch {
    // Best-effort. Orphan flyers can be removed from the Supabase dashboard.
  }
}

export async function createEventAction(
  formData: FormData,
): Promise<EventActionState> {
  const admin = await getAdminSession();

  if (!admin) {
    return {
      status: "error",
      message: "Your session expired. Sign in again.",
    };
  }

  const parsed = parseEventForm(formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const eventId = crypto.randomUUID();
  const flyer = formData.get("flyer");
  let flyerPath: string | null = null;

  if (flyer instanceof File && flyer.size > 0) {
    const upload = await uploadFlyer(eventId, flyer);

    if (!upload.ok) {
      return {
        status: "error",
        message: upload.message,
        fields: { flyer: upload.message },
      };
    }

    flyerPath = upload.path;
  }

  const supabase = await createServerSupabaseClient();

  try {
    const slug = await resolveUniqueSlug(
      supabase,
      parsed.values.slug || parsed.values.name,
    );

    const { error } = await supabase.from("events").insert({
      id: eventId,
      name: parsed.values.name,
      slug,
      description: parsed.values.description,
      event_date: parsed.values.eventDateIso,
      venue: parsed.values.venue,
      maps_url: parsed.values.mapsUrl,
      whatsapp_number: parsed.values.whatsappNumber,
      registration_open: formData.get("registrationOpen") === "on",
      is_published: formData.get("isPublished") === "on",
      flyer_path: flyerPath,
      created_by: admin.userId,
    });

    if (error) {
      if (flyerPath) {
        await deleteFlyer(flyerPath);
      }

      if (error.code === "23505") {
        return {
          status: "error",
          message: "That slug is already used.",
          fields: { slug: "That slug is already used." },
        };
      }

      console.error("[admin/events] create failed", { code: error.code });

      return {
        status: "error",
        message: "We could not save the event. Please try again.",
      };
    }
  } catch (error) {
    if (flyerPath) {
      await deleteFlyer(flyerPath);
    }

    console.error("[admin/events] create failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });

    return {
      status: "error",
      message: "We could not save the event. Please try again.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin/events");

  return { status: "success", redirectTo: "/admin/events?created=1" };
}

export async function updateEventAction(
  formData: FormData,
): Promise<EventActionState> {
  const admin = await getAdminSession();

  if (!admin) {
    return {
      status: "error",
      message: "Your session expired. Sign in again.",
    };
  }

  const eventId = eventIdSchema.safeParse(formData.get("eventId"));

  if (!eventId.success) {
    return { status: "error", message: "Invalid event." };
  }

  const parsed = parseEventForm(formData);

  if (!parsed.ok) {
    return parsed.state;
  }

  const supabase = await createServerSupabaseClient();
  const { data: existing, error: readError } = await supabase
    .from("events")
    .select("id,flyer_path")
    .eq("id", eventId.data)
    .maybeSingle();

  if (readError || !existing) {
    return { status: "error", message: "That event no longer exists." };
  }

  const flyer = formData.get("flyer");
  let newFlyerPath: string | null = null;

  if (flyer instanceof File && flyer.size > 0) {
    const upload = await uploadFlyer(eventId.data, flyer);

    if (!upload.ok) {
      return {
        status: "error",
        message: upload.message,
        fields: { flyer: upload.message },
      };
    }

    newFlyerPath = upload.path;
  }

  try {
    const slug = await resolveUniqueSlug(
      supabase,
      parsed.values.slug || parsed.values.name,
      eventId.data,
    );

    const { error } = await supabase
      .from("events")
      .update({
        name: parsed.values.name,
        slug,
        description: parsed.values.description,
        event_date: parsed.values.eventDateIso,
        venue: parsed.values.venue,
        maps_url: parsed.values.mapsUrl,
        whatsapp_number: parsed.values.whatsappNumber,
        registration_open: formData.get("registrationOpen") === "on",
        is_published: formData.get("isPublished") === "on",
        ...(newFlyerPath ? { flyer_path: newFlyerPath } : {}),
      })
      .eq("id", eventId.data);

    if (error) {
      if (newFlyerPath) {
        await deleteFlyer(newFlyerPath);
      }

      if (error.code === "23505") {
        return {
          status: "error",
          message: "That slug is already used.",
          fields: { slug: "That slug is already used." },
        };
      }

      console.error("[admin/events] update failed", { code: error.code });

      return {
        status: "error",
        message: "We could not save the event. Please try again.",
      };
    }
  } catch (error) {
    if (newFlyerPath) {
      await deleteFlyer(newFlyerPath);
    }

    console.error("[admin/events] update failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });

    return {
      status: "error",
      message: "We could not save the event. Please try again.",
    };
  }

  if (newFlyerPath && existing.flyer_path) {
    await deleteFlyer(existing.flyer_path);
  }

  revalidatePath("/");
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId.data}/edit`);

  return { status: "success", redirectTo: "/admin/events?updated=1" };
}

async function requireAdminForForm(): Promise<AdminSession> {
  const admin = await getAdminSession();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

export async function toggleEventPublishedAction(
  formData: FormData,
): Promise<void> {
  await requireAdminForForm();

  const eventId = eventIdSchema.safeParse(formData.get("eventId"));
  const value = formData.get("value") === "true";

  if (!eventId.success) {
    redirect("/admin/events?error=invalid-event");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("events")
    .update({ is_published: value })
    .eq("id", eventId.data);

  if (error) {
    redirect("/admin/events?error=update-failed");
  }

  revalidatePath("/");
  revalidatePath("/admin/events");
  redirect("/admin/events?updated=1");
}

export async function toggleEventRegistrationAction(
  formData: FormData,
): Promise<void> {
  await requireAdminForForm();

  const eventId = eventIdSchema.safeParse(formData.get("eventId"));
  const value = formData.get("value") === "true";

  if (!eventId.success) {
    redirect("/admin/events?error=invalid-event");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("events")
    .update({ registration_open: value })
    .eq("id", eventId.data);

  if (error) {
    redirect("/admin/events?error=update-failed");
  }

  revalidatePath("/");
  revalidatePath("/admin/events");
  redirect("/admin/events?updated=1");
}

async function setEventArchived(
  formData: FormData,
  archived: boolean,
): Promise<void> {
  const admin = await requireAdminForForm();

  if (!hasRole(admin.roles, "super_admin")) {
    redirect("/admin/unauthorized?reason=role");
  }

  const eventId = eventIdSchema.safeParse(formData.get("eventId"));

  if (!eventId.success) {
    redirect("/admin/events?error=invalid-event");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("events")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", eventId.data);

  if (error) {
    redirect("/admin/events?error=archive-failed");
  }

  revalidatePath("/");
  revalidatePath("/admin/events");
  redirect(archived ? "/admin/events?archived=1" : "/admin/events?restored=1");
}

export async function archiveEventAction(formData: FormData): Promise<void> {
  await setEventArchived(formData, true);
}

export async function restoreEventAction(formData: FormData): Promise<void> {
  await setEventArchived(formData, false);
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const admin = await requireAdminForForm();

  if (!hasRole(admin.roles, "super_admin")) {
    redirect("/admin/unauthorized?reason=role");
  }

  const eventId = eventIdSchema.safeParse(formData.get("eventId"));

  if (!eventId.success) {
    redirect("/admin/events?error=invalid-event");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId.data);

  if (error) {
    if (error.code === "23503") {
      redirect("/admin/events?error=event-has-guestlist");
    }

    redirect("/admin/events?error=delete-failed");
  }

  revalidatePath("/");
  revalidatePath("/admin/events");
  redirect("/admin/events?deleted=1");
}
