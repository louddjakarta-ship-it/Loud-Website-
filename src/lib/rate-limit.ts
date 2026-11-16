import "server-only";

import { createHash } from "node:crypto";

import { getRateLimitSalt } from "@/lib/env/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type RateLimitKind = "upload" | "submit";

type RateLimitRule = {
  windowMs: number;
  limit: number;
};

const RULES: Record<RateLimitKind, RateLimitRule> = {
  // Signed upload URLs are cheap but each one can create an object.
  upload: { windowMs: 10 * 60 * 1000, limit: 10 },
  // Final submissions are stricter. Failed attempts count too, which is
  // intentional: it stops repeated guessing and proof re-upload loops.
  submit: { windowMs: 60 * 60 * 1000, limit: 5 },
};

const ATTEMPT_RETENTION_MS = 24 * 60 * 60 * 1000;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function hashClientIp(ip: string): string {
  return createHash("sha256")
    .update(`${ip}:${getRateLimitSalt()}`)
    .digest("hex");
}

function maybeCleanupOldAttempts(): void {
  // Opportunistic cleanup keeps the table small without a separate cron.
  if (Math.random() > 0.02) {
    return;
  }

  const cutoff = new Date(Date.now() - ATTEMPT_RETENTION_MS).toISOString();
  const admin = createAdminSupabaseClient();

  void admin
    .from("submission_attempts")
    .delete()
    .lt("created_at", cutoff)
    .then(
      () => undefined,
      () => undefined,
    );
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

/**
 * Counts recent attempts for this IP hash, then records a new attempt.
 * Raw IP addresses are never stored.
 *
 * Throws when the ledger is unavailable; callers should fail closed with a
 * generic 503 instead of allowing unlimited submissions.
 */
export async function enforceRateLimit({
  request,
  kind,
  eventId,
}: {
  request: Request;
  kind: RateLimitKind;
  eventId: string;
}): Promise<RateLimitResult> {
  const ipHash = hashClientIp(getClientIp(request));
  const rule = RULES[kind];
  const since = new Date(Date.now() - rule.windowMs).toISOString();
  const admin = createAdminSupabaseClient();

  const { count, error } = await admin
    .from("submission_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("kind", kind)
    .gte("created_at", since);

  if (error) {
    throw new Error("rate_limit_unavailable");
  }

  if ((count ?? 0) >= rule.limit) {
    const { data: oldest } = await admin
      .from("submission_attempts")
      .select("created_at")
      .eq("ip_hash", ipHash)
      .eq("kind", kind)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const oldestTime = oldest?.created_at
      ? new Date(oldest.created_at).getTime()
      : Date.now();
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestTime + rule.windowMs - Date.now()) / 1000),
    );

    return { ok: false, retryAfterSeconds };
  }

  const { error: insertError } = await admin
    .from("submission_attempts")
    .insert({ ip_hash: ipHash, event_id: eventId, kind });

  if (insertError) {
    throw new Error("rate_limit_unavailable");
  }

  maybeCleanupOldAttempts();

  return { ok: true };
}
