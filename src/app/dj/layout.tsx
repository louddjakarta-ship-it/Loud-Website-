import { DjShell } from "@/components/dj/dj-shell";
import { requireDj } from "@/lib/auth/admin";
import { getOwnDj } from "@/lib/data/djs";

export const dynamic = "force-dynamic";

export default async function DjLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireDj();
  const dj = await getOwnDj(admin.userId).catch((error: unknown) => {
    console.error(
      "[dj] layout lookup failed",
      error instanceof Error ? error.message : "unknown",
    );
    return null;
  });

  return (
    <DjShell
      admin={admin}
      publicSlug={dj?.is_published ? dj.slug : null}
    >
      {children}
    </DjShell>
  );
}
