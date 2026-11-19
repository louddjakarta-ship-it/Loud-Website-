"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { zodFieldErrors } from "@/lib/api";
import type { LoginState } from "@/lib/auth/login-state";
import { normalizeUsername, USERNAME_PATTERN } from "@/lib/auth/username";
import { enforceLoginRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  username: z.preprocess(
    normalizeUsername,
    z
      .string()
      .min(3, "Enter your username.")
      .max(32, "Username is too long.")
      .regex(USERNAME_PATTERN, "That username is not valid."),
  ),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(200, "Password is too long."),
  next: z.string().optional(),
});

/** Only same-site admin paths are accepted as post-login destinations. */
function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//")) {
    return "/admin";
  }

  return value;
}

export async function signInAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fields: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createServerSupabaseClient();

  try {
    const limit = await enforceLoginRateLimit({
      headers: await headers(),
      username: parsed.data.username,
    });

    if (!limit.ok) {
      return {
        status: "error",
        message:
          "Too many sign-in attempts. Wait a few minutes before trying again.",
      };
    }
  } catch {
    return {
      status: "error",
      message: "Sign-in is temporarily unavailable. Please try again later.",
    };
  }

  const admin = createAdminSupabaseClient();
  const { data: profile, error: profileError } = await admin
    .from("admin_profiles")
    .select("id,is_active")
    .eq("username", parsed.data.username)
    .maybeSingle();

  if (profileError || !profile || !profile.is_active) {
    return {
      status: "error",
      message: "Invalid username or password.",
    };
  }

  const { data: authUser, error: authUserError } =
    await admin.auth.admin.getUserById(profile.id);

  if (authUserError || !authUser.user?.email) {
    return {
      status: "error",
      message: "Invalid username or password.",
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: authUser.user.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      status: "error",
      message: "Invalid username or password.",
    };
  }

  const { data: activeProfile, error: activeProfileError } = await supabase
    .from("admin_profiles")
    .select("role,is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (
    activeProfileError ||
    !activeProfile ||
    !activeProfile.is_active
  ) {
    await supabase.auth.signOut();

    return {
      status: "error",
      message:
        "This account does not have admin access. Contact the LOUD JAKARTA owner.",
    };
  }

  redirect(safeNextPath(parsed.data.next));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
