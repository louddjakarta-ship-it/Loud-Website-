"use server";

import { z } from "zod";

import { zodFieldErrors } from "@/lib/api";
import type { ChangePasswordState } from "@/lib/admin/account-action-state";
import { getCurrentUser } from "@/lib/auth/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Enter your current password.")
      .max(200, "Password is too long."),
    newPassword: z
      .string()
      .min(10, "Use at least 10 characters.")
      .max(72, "Password is too long."),
    confirmPassword: z.string().min(1, "Repeat the new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password you have not used here.",
  });

/** Changes the signed-in admin's own password after re-verifying it. */
export async function changePasswordAction(
  _previous: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await getCurrentUser();

  if (!user?.email) {
    return {
      status: "error",
      message: "Your session expired. Sign in again.",
    };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fields: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createServerSupabaseClient();

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return {
      status: "error",
      message: "The current password is incorrect.",
      fields: { currentPassword: "The current password is incorrect." },
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    console.error("[admin/account] password update failed", {
      code: updateError.code,
    });

    return {
      status: "error",
      message: "The password could not be changed. Please try again.",
    };
  }

  return {
    status: "success",
    message: "Password changed. Use the new password next time you sign in.",
  };
}
