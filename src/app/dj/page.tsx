import type { Metadata } from "next";

import { DjPresskitForm } from "@/components/dj/dj-presskit-form";
import { requireDj } from "@/lib/auth/admin";
import { getDjPhotoPublicUrl, getOwnDj } from "@/lib/data/djs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My presskit",
  robots: { index: false, follow: false },
};

export default async function DjPresskitPage() {
  const admin = await requireDj();
  const dj = await getOwnDj(admin.userId).catch((error: unknown) => {
    console.error(
      "[dj] presskit lookup failed",
      error instanceof Error ? error.message : "unknown",
    );
    return null;
  });

  return (
    <div className="space-y-8">
      <header className="border-b border-line pb-6">
        <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
          DJ
        </p>
        <h1 className="mt-2 font-display text-h1 uppercase">My presskit</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          This is what customers see on the LOUD JAKARTA website: your photo,
          the venues you have played, and your genres. Only your account can
          edit it.
        </p>
      </header>

      <DjPresskitForm
        userId={admin.userId}
        displayName={admin.displayName ?? admin.email}
        initial={{
          stageName: dj?.stage_name ?? "",
          bio: dj?.bio ?? "",
          genres: dj?.genres ?? [],
          venues: dj?.venues ?? [],
          instagramUrl: dj?.instagram_url ?? null,
          photoPath: dj?.photo_path ?? null,
          photoUrl: getDjPhotoPublicUrl(dj?.photo_path ?? null),
          isPublished: dj?.is_published ?? true,
          slug: dj?.slug ?? null,
        }}
      />
    </div>
  );
}
