import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type AdminRole = Database["public"]["Enums"]["admin_role"];

export type AdminSession = {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: AdminRole;
  isActive: boolean;
};

export type AuthUser = {
  id: string;
  email: string | null;
};

/** Current Supabase Auth user, or null when signed out. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return { id: data.user.id, email: data.user.email ?? null };
});

/** Admin profile for the current user, or null when missing or inactive. */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("admin_profiles")
    .select("id,display_name,role,is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data || !data.is_active) {
    return null;
  }

  return {
    userId: data.id,
    email: user.email,
    displayName: data.display_name,
    role: data.role,
    isActive: data.is_active,
  };
});

/**
 * Layout guard. Redirects anonymous visitors to the login page and signed-in
 * non-admins to the unauthorized page.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  const admin = await getAdminSession();

  if (!admin) {
    redirect("/admin/unauthorized");
  }

  return admin;
}

export async function requireSuperAdmin(): Promise<AdminSession> {
  const admin = await requireAdmin();

  if (admin.role !== "super_admin") {
    redirect("/admin/unauthorized?reason=role");
  }

  return admin;
}
