import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  deleteGuestlistAction,
  reviewGuestlistAction,
} from "@/app/admin/actions/guestlist";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/admin";
import { hasRole } from "@/lib/auth/roles";
import { formatEventDateTime } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guestlist detail",
  robots: { index: false, follow: false },
};

type GuestlistDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

const statusStyles = {
  pending: "border border-accent/40 text-accent",
  approved: "border border-success/40 text-success",
  rejected: "border border-danger/40 text-danger",
} as const;

const errorMessages: Record<string, string> = {
  "invalid-decision": "Choose approve or reject.",
  "note-too-long": "The admin note must be 1000 characters or fewer.",
  "review-failed": "The review could not be saved. Please try again.",
  "already-reviewed":
    "This registration was already reviewed. Refresh the page to see the latest status.",
  "delete-failed": "The registration could not be deleted.",
  "invalid-registration": "Invalid registration.",
};

export default async function GuestlistDetailPage({
  params,
  searchParams,
}: GuestlistDetailPageProps) {
  const admin = await requireAdmin();

  const { id } = await params;
  const parsedId = z.uuid().safeParse(id);

  if (!parsedId.success) {
    notFound();
  }

  const query = await searchParams;
  const reviewed = firstValue(query.reviewed);
  const errorKey = firstValue(query.error);

  const supabase = await createServerSupabaseClient();
  const { data: row, error } = await supabase
    .from("guestlist")
    .select(
      "id,full_name,instagram,reference_person,status,admin_note,reviewed_at,created_at,story_proof_path,comment_proof_path,event:events(id,name,event_date,venue),reviewer:admin_profiles(display_name,role)",
    )
    .eq("id", parsedId.data)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="border-b border-line pb-6">
        <Link
          href="/admin/guestlist"
          className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted transition-colors hover:text-accent"
        >
          ← Back to guestlist
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
              Registration
            </p>
            <h1 className="mt-2 font-display text-h1 uppercase">
              {row.full_name}
            </h1>
            <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-muted">
              @{row.instagram} · {formatEventDateTime(row.created_at)}
            </p>
          </div>

          <span
            className={`inline-block self-start px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.08em] ${statusStyles[row.status]}`}
          >
            {row.status}
          </span>
        </div>
      </header>

      {reviewed === "approved" || reviewed === "rejected" ? (
        <div
          role="status"
          className="border border-accent/40 bg-accent/5 p-4 text-sm leading-relaxed text-accent"
        >
          Registration marked {reviewed}. The guest will see this status when
          an admin confirms it manually.
        </div>
      ) : null}

      {errorKey ? (
        <div
          role="alert"
          className="border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          {errorMessages[errorKey] ?? "That action could not be completed."}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-7">
          <section
            aria-labelledby="details-heading"
            className="border border-line bg-surface"
          >
            <div className="border-b border-line px-5 py-4">
              <h2
                id="details-heading"
                className="font-display text-2xl uppercase"
              >
                Details
              </h2>
            </div>

            <dl className="divide-y divide-line">
              <div className="grid grid-cols-[8rem_1fr] gap-4 px-5 py-3">
                <dt className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                  Event
                </dt>
                <dd className="text-sm text-paper">
                  {row.event?.name ?? "Unknown event"}
                  {row.event ? (
                    <span className="mt-1 block font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
                      {formatEventDateTime(row.event.event_date)}
                      {row.event.venue ? ` · ${row.event.venue}` : ""}
                    </span>
                  ) : null}
                </dd>
              </div>

              <div className="grid grid-cols-[8rem_1fr] gap-4 px-5 py-3">
                <dt className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                  Full name
                </dt>
                <dd className="text-sm text-paper">{row.full_name}</dd>
              </div>

              <div className="grid grid-cols-[8rem_1fr] gap-4 px-5 py-3">
                <dt className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                  Instagram
                </dt>
                <dd className="text-sm text-paper">@{row.instagram}</dd>
              </div>

              <div className="grid grid-cols-[8rem_1fr] gap-4 px-5 py-3">
                <dt className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                  PR / reference
                </dt>
                <dd className="text-sm text-paper">{row.reference_person}</dd>
              </div>

              <div className="grid grid-cols-[8rem_1fr] gap-4 px-5 py-3">
                <dt className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                  Submitted
                </dt>
                <dd className="text-sm text-paper">
                  {formatEventDateTime(row.created_at)}
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-labelledby="proof-heading"
            className="border border-line bg-surface"
          >
            <div className="border-b border-line px-5 py-4">
              <h2
                id="proof-heading"
                className="font-display text-2xl uppercase"
              >
                Proof
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Links redirect to a signed URL that expires after 60 seconds.
              </p>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <a
                href={`/api/admin/guestlist/${row.id}/proof/story`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-24 flex-col justify-between border border-line bg-ink p-4 transition-colors hover:border-accent"
              >
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-accent">
                  Story proof ↗
                </span>
                <span className="mt-3 text-sm leading-relaxed text-muted">
                  Screenshot of the guest sharing the event flyer to their
                  Instagram story.
                </span>
              </a>

              <a
                href={`/api/admin/guestlist/${row.id}/proof/comment`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-24 flex-col justify-between border border-line bg-ink p-4 transition-colors hover:border-accent"
              >
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-accent">
                  Comment proof ↗
                </span>
                <span className="mt-3 text-sm leading-relaxed text-muted">
                  Screenshot of the guest commenting on the event post.
                </span>
              </a>
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:col-span-5">
          {row.status === "pending" ? (
            <section
              aria-labelledby="review-heading"
              className="border border-line bg-surface p-5"
            >
              <h2
                id="review-heading"
                className="font-display text-2xl uppercase"
              >
                Review
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-muted">
                Check both proofs, then approve or reject. This action is
                recorded with your admin account and cannot be undone from this
                page.
              </p>

              <ConfirmForm
                action={reviewGuestlistAction}
                message="Review this registration? Your admin account and the time will be recorded."
                messages={{
                  approved:
                    "Approve this registration? Your admin account and the time will be recorded.",
                  rejected:
                    "Reject this registration? Your admin account and the time will be recorded.",
                }}
                className="mt-5 space-y-4"
              >
                <input type="hidden" name="guestlistId" value={row.id} />

                <div>
                  <Label htmlFor="admin-note">Admin note (optional)</Label>
                  <Textarea
                    id="admin-note"
                    name="adminNote"
                    maxLength={1000}
                    placeholder="Internal note, e.g. proof unreadable or reference confirmed."
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="submit"
                    name="decision"
                    value="approved"
                    size="lg"
                  >
                    Approve
                  </Button>
                  <Button
                    type="submit"
                    name="decision"
                    value="rejected"
                    size="lg"
                    variant="outline"
                    className="border-danger/50 text-danger hover:border-danger hover:text-danger"
                  >
                    Reject
                  </Button>
                </div>
              </ConfirmForm>
            </section>
          ) : (
            <section
              aria-labelledby="reviewed-heading"
              className="border border-line bg-surface p-5"
            >
              <h2
                id="reviewed-heading"
                className="font-display text-2xl uppercase"
              >
                Reviewed
              </h2>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                    Status
                  </dt>
                  <dd className="text-paper">{row.status}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                    Reviewed at
                  </dt>
                  <dd className="text-right text-paper">
                    {row.reviewed_at
                      ? formatEventDateTime(row.reviewed_at)
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                    Reviewer
                  </dt>
                  <dd className="text-right text-paper">
                    {row.reviewer?.display_name || "Admin"}
                  </dd>
                </div>
              </dl>

              {row.admin_note ? (
                <div className="mt-5 border-t border-line pt-4">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
                    Admin note
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-paper">
                    {row.admin_note}
                  </p>
                </div>
              ) : null}
            </section>
          )}

          {hasRole(admin.roles, "super_admin") ? (
            <section className="border border-danger/30 bg-danger/5 p-5">
              <h2 className="font-display text-2xl uppercase text-danger">
                Danger zone
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Deleting a registration removes its proof files and frees the
                Instagram handle for a new submission. Only do this for an
                approved exception.
              </p>

              <ConfirmForm
                action={deleteGuestlistAction}
                message="Delete this registration and its proof files permanently?"
                className="mt-4"
              >
                <input type="hidden" name="guestlistId" value={row.id} />
                <button
                  type="submit"
                  className="border border-danger/60 px-4 py-2.5 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-danger transition-colors hover:bg-danger hover:text-ink"
                >
                  Delete registration
                </button>
              </ConfirmForm>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
