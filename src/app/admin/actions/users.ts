"use server";

import { randomInt } from "node:crypto";

import { revalidatePath } from "next/cache";

import { zodFieldErrors } from "@/lib/api";
import type { CreateUserState } from "@/lib/admin/user-action-state";
import { getAdminSession } from "@/lib/auth/admin";
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
 * Creates a Supabase Auth user and its admin profile. Every admin has the same
 * role and the same access. Only signed-in admins may call this action.
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

  if (admin.role !== "super_admin") {
    return {
      status: "error",
      message: "Only an admin can create new users.",
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
      fields: taken ? { username: "That username is already taken." } : undefined,
    };
  }

  const { error: profileError } = await supabase
    .from("admin_profiles")
    .insert({
      id: created.user.id,
      username: parsed.data.username,
      display_name: parsed.data.displayName,
      role: "super_admin",
      is_active: true,
    });

  if (profileError) {
    console.error("[admin/users] profile insert failed", {
      code: profileError.code,
    });

    // Never leave an auth user without an admin profile.
    await supabase.auth.admin.deleteUser(created.user.id);

    const taken = profileError.code === "23505";

    return {
      status: "error",
      message: taken
        ? "That username is already taken."
        : "The user profile could not be saved. Please try again.",
      fields: taken ? { username: "That username is already taken." } : undefined,
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
