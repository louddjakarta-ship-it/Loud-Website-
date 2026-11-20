"use server";

import { randomInt } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { zodFieldErrors } from "@/lib/api";
import type { CreateUserState } from "@/lib/admin/user-action-state";
import { getAdminSession } from "@/lib/auth/admin";
import {
  hasRole,
  mergeRoles,
  primaryRole,
  type AdminRole,
} from "@/lib/auth/roles";
import { usernameAuthEmail } from "@/lib/auth/username";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createAdminUserSchema } from "@/lib/validation/admin-user";

const PASSWORD_GROUPS = [
  "ABCDEFGHJKLMNPQRSTUVWXYZ",
  "abcdefghijkmnopqrstuvwxyz",
  "23456789",
  "!@#$%&*",
] as const;

const PASSWORD_ALPHABET = PASSWORD_GROUPS.join("");

const roleSelectionSchema = z
  .array(z.enum(["admin", "dj"]), "Choose at least one role.")
  .min(1, "Choose at least one role.");

const FORM_ROLE_MAP: Record<"admin" | "dj", AdminRole> = {
  admin: "super_admin",
  dj: "dj",
};

function selectedRoles(formData: FormData) {
  const raw = formData
    .getAll("roles")
    .filter((value): value is string => typeof value === "string");
  const parsed = roleSelectionSchema.safeParse(raw);

  if (!parsed.success) {
    return null;
  }

  return parsed.data.map((role) => FORM_ROLE_MAP[role]);
}

/** Generates a readable, strong temporary password. */
function generateTemporaryPassword(length = 16): string {
  const characters = PASSWORD_GROUPS.map(
    (group) => group[randomInt(group.length)],
  );

  while (characters.length < length) {
    characters.push(PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]);
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [characters[index], characters[swapIndex]] = [
      characters[swapIndex],
      characters[index],
    ];
  }

  return characters.join("");
}

/**
 * Creates a Supabase Auth user and its profile. An account can hold several
 * roles at once (for example admin + DJ).
 */
export async function createAdminUserAction(
  _previous: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const admin = await getAdminSession();

  if (!admin) {
    return {
      status: "error",
      message: "Your session expired. Sign in again.",
    };
  }

  if (!hasRole(admin.roles, "super_admin")) {
    return {
      status: "error",
      message: "Only a super admin can create new users.",
    };
  }

  const parsed = createAdminUserSchema.safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fields: zodFieldErrors(parsed.error),
    };
  }

  const roles = selectedRoles(formData);

  if (!roles) {
    return {
      status: "error",
      message: "Choose at least one role.",
      fields: { roles: "Choose at least one role." },
    };
  }

  const password =
    parsed.data.password.length > 0
      ? parsed.data.password
      : generateTemporaryPassword();

  const supabase = createAdminSupabaseClient();

  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email: usernameAuthEmail(parsed.data.username),
      password,
      email_confirm: true,
      user_metadata: {
        username: parsed.data.username,
        display_name: parsed.data.displayName,
        roles,
      },
    });

  if (createError || !created.user) {
    console.error("[admin/users] auth create failed", {
      code: createError?.code,
      status: createError?.status,
    });

    const taken =
      createError?.code === "email_exists" ||
      createError?.status === 422 ||
      createError?.code === "user_already_exists";

    return {
      status: "error",
      message: taken
        ? "That username is already taken."
        : "The user could not be created. Please try again.",
      fields: taken
        ? { username: "That username is already taken." }
        : undefined,
    };
  }

  const { error: profileError } = await supabase
    .from("admin_profiles")
    .insert({
      id: created.user.id,
      username: parsed.data.username,
      display_name: parsed.data.displayName,
      role: primaryRole(roles),
      roles,
      is_active: true,
    });

  if (profileError) {
    console.error("[admin/users] profile insert failed", {
      code: profileError.code,
    });

    // Never leave an auth user without a profile.
    await supabase.auth.admin.deleteUser(created.user.id);

    const taken = profileError.code === "23505";

    return {
      status: "error",
      message: taken
        ? "That username is already taken."
        : "The user profile could not be saved. Please try again.",
      fields: taken
        ? { username: "That username is already taken." }
        : undefined,
    };
  }

  revalidatePath("/admin/users");

  return {
    status: "success",
    message: "User created. Share these credentials securely.",
    created: {
      username: parsed.data.username,
      password,
      displayName: parsed.data.displayName,
    },
  };
}

/** Replaces the roles of an existing account. Super admin only. */
export async function updateUserRolesAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();

  if (!admin || !hasRole(admin.roles, "super_admin")) {
    redirect("/admin/unauthorized?reason=role");
  }

  const userId = z.uuid("Invalid user.").safeParse(formData.get("userId"));
  const roles = selectedRoles(formData);

  if (!userId.success || !roles) {
    redirect("/admin/users?error=invalid-roles");
  }

  if (userId.data === admin.userId && !hasRole(roles, "super_admin")) {
    redirect("/admin/users?error=self-admin");
  }

  const supabase = createAdminSupabaseClient();
  const { data: profiles, error } = await supabase
    .from("admin_profiles")
    .select("id,role,roles,is_active")
    .eq("is_active", true);

  if (error || !profiles) {
    redirect("/admin/users?error=update-failed");
  }

  const target = profiles.find((profile) => profile.id === userId.data);

  if (!target) {
    redirect("/admin/users?error=not-found");
  }

  const currentRoles = mergeRoles(target.role, target.roles);

  if (hasRole(currentRoles, "super_admin") && !hasRole(roles, "super_admin")) {
    const otherSuperAdmins = profiles.filter(
      (profile) =>
        profile.id !== target.id &&
        hasRole(mergeRoles(profile.role, profile.roles), "super_admin"),
    );

    if (otherSuperAdmins.length === 0) {
      redirect("/admin/users?error=last-admin");
    }
  }

  const { error: updateError } = await supabase
    .from("admin_profiles")
    .update({ role: primaryRole(roles), roles })
    .eq("id", userId.data);

  if (updateError) {
    console.error("[admin/users] role update failed", {
      code: updateError.code,
    });
    redirect("/admin/users?error=update-failed");
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}
