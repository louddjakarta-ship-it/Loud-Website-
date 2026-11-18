import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import {
  GuestlistForm,
  type GuestlistEventOption,
} from "@/components/public/guestlist-form";
import { ButtonLink } from "@/components/ui/button";
import { getEventByGuestlistToken } from "@/lib/data/events";
import { getMaxProofFileBytes } from "@/lib/env/server";
import { publicEnv } from "@/lib/env/public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guestlist",
  description:
    "Private LOUD JAKARTA guestlist registration. Submit your Instagram story and comment proof for review.",
  robots: { index: false, follow: false },
};

type GuestlistLinkPageProps = {
  params: Promise<{ token: string }>;
};

const tokenSchema = z.uuid();

export default async function GuestlistLinkPage({
  params,
}: GuestlistLinkPageProps) {
  const { token } = await params;
  const parsedToken = tokenSchema.safeParse(token);

  if (!parsedToken.success) {
    notFound();
  }

  let event: GuestlistEventOption | null = null;
  let guestlistToken = "";
  let loadFailed = false;

  try {
    const row = await getEventByGuestlistToken(parsedToken.data);

    if (row) {
      event = {
        id: row.id,
        name: row.name,
        eventDate: row.event_date,
        venue: row.venue,
      };
      guestlistToken = parsedToken.data;
    }
  } catch (error) {
    loadFailed = true;
    console.error(
      "[guestlist] event unavailable",
      error instanceof Error ? error.message : "unknown",
    );
  }

  if (!event && !loadFailed) {
    notFound();
  }

  const maxFileMb = Math.max(
    1,
    Math.floor(getMaxProofFileBytes() / (1024 * 1024)),
  );
  const instagramUrl = publicEnv.instagramUrl.trim() || null;

  return (
    <div className="shell py-[clamp(56px,8vw,120px)]">
      <header className="max-w-4xl">
        <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
          Private guestlist invite
        </p>

        <h1 className="mt-4 font-display text-display-lg uppercase">
          Get on
          <br />
          the list.
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Send your details and upload two proof screenshots. Every registration
          is reviewed manually — you are not on the guestlist until an admin
          approves it.
        </p>
      </header>

      {loadFailed || !event ? (
        <div className="mt-12 border border-line bg-surface p-7 sm:p-10">
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
            Temporarily unavailable
          </p>
          <h2 className="mt-4 font-display text-h1 uppercase">
            Guestlist is offline.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            We could not reach the event database. Refresh the page in a moment,
            or check our Instagram for the latest announcement.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/" variant="outline">
              Back to home
            </ButtonLink>
            {instagramUrl ? (
              <ButtonLink
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="ghost"
              >
                Instagram
              </ButtonLink>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-8">
          <aside className="lg:col-span-4">
            <div className="border-t border-line pt-6">
              <h2 className="font-display text-2xl uppercase">
                Before you submit
              </h2>

              <ol className="mt-5 space-y-4">
                {[
                  "Follow the event post and share the flyer to your Instagram story.",
                  "Leave a comment on the event post from the same Instagram account.",
                  "Screenshot both proofs — they must be readable.",
                  "Enter the PR or reference person who invited you.",
                ].map((item, index) => (
                  <li
                    key={item}
                    className="grid grid-cols-[auto_1fr] gap-4 border-b border-line pb-4"
                  >
                    <span className="font-mono text-micro text-accent">
                      0{index + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-muted">
                      {item}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 border border-line bg-surface p-4">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-paper">
                  One Instagram per event
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  A rejected registration still counts. If you were rejected,
                  contact us on WhatsApp instead of submitting again.
                </p>
              </div>

              <p className="mt-6 text-sm leading-relaxed text-muted">
                Read the{" "}
                <Link
                  href="/privacy"
                  className="text-accent underline decoration-accent/40 underline-offset-4 hover:text-paper"
                >
                  privacy notice
                </Link>{" "}
                for how proof images are stored and deleted.
              </p>
            </div>
          </aside>

          <div className="lg:col-span-8">
            <div className="border border-line bg-surface p-5 sm:p-8">
              <GuestlistForm
                event={event}
                guestlistToken={guestlistToken}
                maxFileMb={maxFileMb}
                turnstileSiteKey={publicEnv.turnstileSiteKey}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
