"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";

import { zodFieldErrors } from "@/lib/api";
import type { LoginState } from "@/lib/auth/login-state";
import { enforceLoginRateLimit } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().max(254),
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
    email: formData.get("email"),
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
      email: parsed.data.email,
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      status: "error",
      message: "Invalid email or password.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("role,is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.is_active) {
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
