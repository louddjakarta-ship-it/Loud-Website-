import type { Metadata } from "next";
import Link from "next/link";

import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { requireAdmin } from "@/lib/auth/admin";
import { hasRole, rolesLabel } from "@/lib/auth/roles";
import { getSiteSettings } from "@/lib/data/site-settings";
import { formatEventDateTime } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

type CountQuery = PromiseLike<{ count: number | null; error: unknown }>;

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const siteSettings = await getSiteSettings();

  const eventsCount = supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null) as unknown as CountQuery;
  const publishedCount = supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .is("archived_at", null) as unknown as CountQuery;
  const totalCount = supabase
    .from("guestlist")
    .select("id", { count: "exact", head: true }) as unknown as CountQuery;
  const pendingCount = supabase
    .from("guestlist")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending") as unknown as CountQuery;
  const approvedCount = supabase
    .from("guestlist")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved") as unknown as CountQuery;
  const rejectedCount = supabase
    .from("guestlist")
    .select("id", { count: "exact", head: true })
    .eq("status", "rejected") as unknown as CountQuery;

  const [events, published, total, pending, approved, rejected, recent] =
    await Promise.all([
      eventsCount,
      publishedCount,
      totalCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      supabase
        .from("guestlist")
        .select("id,full_name,instagram,created_at,event:events(name,event_date)")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(5),
    ]);

  const failed =
    events.error ||
    published.error ||
    total.error ||
    pending.error ||
    approved.error ||
    rejected.error ||
    recent.error;

  const stats = [
    { label: "Events", value: events.count ?? 0, href: "/admin/events" },
    {
      label: "Published",
      value: published.count ?? 0,
      href: "/admin/events",
    },
    {
      label: "Registrations",
      value: total.count ?? 0,
      href: "/admin/guestlist",
    },
    {
      label: "Pending",
      value: pending.count ?? 0,
      href: "/admin/guestlist?status=pending",
      accent: true,
    },
    {
      label: "Approved",
      value: approved.count ?? 0,
      href: "/admin/guestlist?status=approved",
    },
    {
      label: "Rejected",
      value: rejected.count ?? 0,
      href: "/admin/guestlist?status=rejected",
    },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-3 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
            Overview
          </p>
          <h1 className="mt-2 font-display text-h1 uppercase">Dashboard</h1>
        </div>

        <p className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
          {admin.displayName || admin.email} · {rolesLabel(admin.roles)}
        </p>
      </header>

      {failed ? (
        <div
          role="alert"
          className="border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          Some dashboard data could not be loaded. Refresh the page or check the
          database connection.
        </div>
      ) : null}

      <section aria-label="Statistics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group border border-line bg-surface p-5 transition-colors hover:border-accent/60"
          >
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-muted">
              {stat.label}
            </p>
            <p
              className={
                stat.accent
                  ? "mt-3 font-display text-4xl uppercase leading-none text-accent"
                  : "mt-3 font-display text-4xl uppercase leading-none text-paper"
              }
            >
              {stat.value}
            </p>
          </Link>
        ))}
      </section>

      <section
        aria-labelledby="site-copy-heading"
        className="border border-line bg-surface p-5 sm:p-6"
      >
        <div className="border-b border-line pb-4">
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
            Content
          </p>
          <h2
            id="site-copy-heading"
            className="mt-2 font-display text-3xl uppercase"
          >
            Homepage copy
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Edit the tagline and description shown in the hero section of the
            public homepage.
          </p>
        </div>

        <div className="mt-6 max-w-3xl">
          <SiteSettingsForm initialValues={siteSettings} />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-8" aria-labelledby="pending-heading">
          <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
                Queue
              </p>
              <h2
                id="pending-heading"
                className="mt-2 font-display text-3xl uppercase"
              >
                Pending review
              </h2>
            </div>

            <Link
              href="/admin/guestlist?status=pending"
              className="font-mono text-micro uppercase tracking-[0.12em] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-accent"
            >
              View all
            </Link>
          </div>

          {recent.data && recent.data.length > 0 ? (
            <ul className="divide-y divide-line border-b border-line">
              {recent.data.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/guestlist/${row.id}`}
                    className="flex flex-col gap-1 py-4 transition-colors hover:text-accent sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display text-xl uppercase">
                        {row.full_name}
                      </span>
                      <span className="mt-1 block font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                        @{row.instagram}
                        {row.event ? ` · ${row.event.name}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                      {formatEventDateTime(row.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-b border-line py-8 text-sm leading-relaxed text-muted">
              Nothing waiting. New guestlist submissions appear here as soon as
              they arrive.
            </p>
          )}
        </section>

        <aside className="lg:col-span-4" aria-labelledby="actions-heading">
          <div className="border-b border-line pb-4">
            <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
              Shortcuts
            </p>
            <h2
              id="actions-heading"
              className="mt-2 font-display text-3xl uppercase"
            >
              Actions
            </h2>
          </div>

          <div className="flex flex-col divide-y divide-line border-b border-line">
            <Link
              href="/admin/events/new"
              className="py-4 font-mono text-micro uppercase tracking-[0.12em] text-paper transition-colors hover:text-accent"
            >
              + Create event
            </Link>
            <Link
              href="/admin/guestlist?status=pending"
              className="py-4 font-mono text-micro uppercase tracking-[0.12em] text-paper transition-colors hover:text-accent"
            >
              Review pending guestlist
            </Link>
            {hasRole(admin.roles, "super_admin") ? (
              <a
                href="/api/admin/guestlist/export"
                download
                className="py-4 font-mono text-micro uppercase tracking-[0.12em] text-paper transition-colors hover:text-accent"
              >
                Export guestlist CSV
              </a>
            ) : (
              <span className="py-4 font-mono text-micro uppercase tracking-[0.12em] text-muted">
                CSV export is super admin only
              </span>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
