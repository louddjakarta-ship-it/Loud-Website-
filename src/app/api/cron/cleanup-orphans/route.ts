import { timingSafeEqual } from "node:crypto";

import { jsonError, jsonOk } from "@/lib/api";
import { cleanupOrphanProofs } from "@/lib/storage/orphan-cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_SECRET_LENGTH = 16;

/**
 * Scheduled cleanup of unreferenced guestlist proof files.
 *
 * Vercel Schedules calls this route with `Authorization: Bearer $CRON_SECRET`.
 * The route stays reachable at its public path, so the secret is checked before
 * any database or storage work happens. Without `CRON_SECRET` the route refuses
 * to run rather than falling open.
 *
 * `?dry=1` (still authenticated) previews the result without deleting.
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    return false;
  }

  const header = request.headers.get("authorization");

  if (!header) {
    return false;
  }

  const expected = `Bearer ${secret}`;
  const headerBytes = Buffer.from(header);
  const expectedBytes = Buffer.from(expected);

  if (headerBytes.length !== expectedBytes.length) {
    return false;
  }

  return timingSafeEqual(headerBytes, expectedBytes);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    console.error("[cron/cleanup-orphans] CRON_SECRET is missing or too short.");
    return jsonError(
      503,
      "cron_not_configured",
      "Scheduled cleanup is not configured.",
    );
  }

  if (!isAuthorized(request)) {
    return jsonError(401, "unauthorized", "Authentication required.");
  }

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";

  try {
    const summary = await cleanupOrphanProofs({ dryRun });

    // Counts only: never log storage paths or guestlist data.
    console.info("[cron/cleanup-orphans]", summary);

    return jsonOk(summary);
  } catch (error) {
    console.error(
      "[cron/cleanup-orphans] failed",
      error instanceof Error ? error.message : "unknown error",
    );

    return jsonError(
      500,
      "cleanup_failed",
      "The cleanup could not be completed.",
    );
  }
}
