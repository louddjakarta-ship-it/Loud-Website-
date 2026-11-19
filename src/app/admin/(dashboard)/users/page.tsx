import type { Metadata } from "next";

import { CreateUserForm } from "@/components/admin/create-user-form";
import { requireSuperAdmin } from "@/lib/auth/admin";
import { formatEventDateTime } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage() {
  const admin = await requireSuperAdmin();

  const supabase = await createServerSupabaseClient();
  const { data: users, error } = await supabase
    .from("admin_profiles")
    .select("id,username,display_name,role,is_active,created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-10">
      <header className="border-b border-line pb-6">
        <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
          Access
        </p>
        <h1 className="mt-2 font-display text-h1 uppercase">Users</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Admins sign in with a username and password. Every account created
          here has the same admin access.
        </p>
      </header>

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
          Set a username and password, or leave the password blank to generate
          a temporary one. Show the credentials once, then ask the user to keep
          them safe.
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
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface">
                  {["Username", "Display name", "Status", "Created"].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-4 py-3 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-line">
                {users.map((user) => (
                  <tr key={user.id}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
