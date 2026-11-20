import type { Metadata } from "next";

import { updateUserRolesAction } from "@/app/admin/actions/users";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { requireSuperAdmin } from "@/lib/auth/admin";
import {
  hasRole,
  mergeRoles,
  ROLE_LABELS,
  type AdminRole,
} from "@/lib/auth/roles";
import { formatEventDateTime } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

const banners: Record<string, { tone: "success" | "error"; message: string }> =
  {
    updated: { tone: "success", message: "Roles updated." },
    "invalid-roles": {
      tone: "error",
      message: "Choose at least one role before saving.",
    },
    "self-admin": {
      tone: "error",
      message: "You cannot remove the Admin role from your own account.",
    },
    "last-admin": {
      tone: "error",
      message: "At least one active Admin account must remain.",
    },
    "not-found": { tone: "error", message: "That account no longer exists." },
    "update-failed": {
      tone: "error",
      message: "The roles could not be updated. Please try again.",
    },
  };

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function roleBadgeClass(role: AdminRole): string {
  if (role === "super_admin") {
    return "bg-accent px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.08em] text-ink";
  }

  if (role === "dj") {
    return "border border-success/40 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.08em] text-success";
  }

  return "border border-line px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.08em] text-muted";
}

type UsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({
  searchParams,
}: UsersPageProps) {
  const admin = await requireSuperAdmin();
  const params = await searchParams;
  const bannerKey = firstValue(params.updated)
    ? "updated"
    : firstValue(params.error);
  const banner = bannerKey ? banners[bannerKey] : undefined;

  const supabase = await createServerSupabaseClient();
  const { data: users, error } = await supabase
    .from("admin_profiles")
    .select("id,username,display_name,role,roles,is_active,created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-10">
      <header className="border-b border-line pb-6">
        <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
          Access
        </p>
        <h1 className="mt-2 font-display text-h1 uppercase">Users</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Admins sign in with a username and password. One account can hold
          several roles at once, for example Admin + DJ.
        </p>
      </header>

      {banner ? (
        <div
          role="status"
          className={
            banner.tone === "success"
              ? "border border-accent/40 bg-accent/5 p-4 text-sm leading-relaxed text-accent"
              : "border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
          }
        >
          {banner.message}
        </div>
      ) : null}

      <section
        aria-labelledby="create-user-heading"
        className="border border-line bg-surface p-5 sm:p-6"
      >
        <h2
          id="create-user-heading"
          className="font-display text-2xl uppercase"
        >
          Create user
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Set a username and password, choose roles, or leave the password blank
          to generate a temporary one. Show the credentials once, then ask the
          user to change the password from the Account page.
        </p>

        <div className="mt-5 max-w-2xl">
          <CreateUserForm />
        </div>
      </section>

      <section aria-labelledby="user-list-heading">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <h2
            id="user-list-heading"
            className="font-display text-3xl uppercase"
          >
            Admin accounts
          </h2>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
            {users?.length ?? 0} account{(users?.length ?? 0) === 1 ? "" : "s"}
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
          >
            Users could not be loaded. Refresh the page or check the database
            connection.
          </div>
        ) : null}

        {users && users.length > 0 ? (
          <div className="mt-6 overflow-x-auto border border-line">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface">
                  {[
                    "Username",
                    "Display name",
                    "Roles",
                    "Status",
                    "Created",
                    "Manage roles",
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {users.map((user) => {
                  const roles = mergeRoles(user.role, user.roles);

                  return (
                    <tr key={user.id} className="align-top">
                      <td className="px-4 py-4 font-mono text-sm text-paper">
                        {user.username ?? "—"}
                        {user.id === admin.userId ? (
                          <span className="ml-2 border border-accent/40 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.08em] text-accent">
                            You
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-muted">
                        {user.display_name ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {roles.map((role) => (
                            <span key={role} className={roleBadgeClass(role)}>
                              {ROLE_LABELS[role]}
                            </span>
                          ))}
                          {roles.length === 0 ? (
                            <span className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-danger">
                              No role
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            user.is_active
                              ? "border border-success/40 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.08em] text-success"
                              : "border border-line px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.08em] text-muted"
                          }
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                        {formatEventDateTime(user.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <form
                          action={updateUserRolesAction}
                          className="flex flex-wrap items-center gap-3"
                        >
                          <input type="hidden" name="userId" value={user.id} />

                          <label className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
                            <input
                              type="checkbox"
                              name="roles"
                              value="admin"
                              defaultChecked={hasRole(roles, "super_admin")}
                              className="h-3.5 w-3.5 accent-accent"
                            />
                            Admin
                          </label>

                          <label className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
                            <input
                              type="checkbox"
                              name="roles"
                              value="dj"
                              defaultChecked={hasRole(roles, "dj")}
                              className="h-3.5 w-3.5 accent-accent"
                            />
                            DJ
                          </label>

                          <button
                            type="submit"
                            className="border border-line px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-accent hover:text-accent"
                          >
                            Save
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
