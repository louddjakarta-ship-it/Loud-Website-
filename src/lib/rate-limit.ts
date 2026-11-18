import "server-only";

import { createHash } from "node:crypto";

import { getRateLimitSalt } from "@/lib/env/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type RateLimitKind = "upload" | "submit" | "login";

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
  // Admin sign-in: 10 attempts per 15 minutes per IP + email pair.
  login: { windowMs: 15 * 60 * 1000, limit: 10 },
};

const ATTEMPT_RETENTION_MS = 24 * 60 * 60 * 1000;

function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return headers.get("x-real-ip")?.trim() || "unknown";
}

function hashValue(value: string): string {
  return createHash("sha256")
    .update(`${value}:${getRateLimitSalt()}`)
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

type RecordAttemptInput = {
  kind: RateLimitKind;
  key: string;
  eventId: string | null;
};

/**
 * Counts recent attempts for this hashed key, then records a new attempt.
 * Raw IP addresses (and admin emails) are never stored.
 *
 * Throws when the ledger is unavailable; callers should fail closed with a
 * generic 503 instead of allowing unlimited attempts.
 */
async function checkAndRecord({
  kind,
  key,
  eventId,
}: RecordAttemptInput): Promise<RateLimitResult> {
  const rule = RULES[kind];
  const since = new Date(Date.now() - rule.windowMs).toISOString();
  const admin = createAdminSupabaseClient();

  const { count, error } = await admin
    .from("submission_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", key)
    .eq("kind", kind)
    .gte("created_at", since);

  if (error) {
    throw new Error("rate_limit_unavailable");
  }

  if ((count ?? 0) >= rule.limit) {
    const { data: oldest } = await admin
      .from("submission_attempts")
      .select("created_at")
      .eq("ip_hash", key)
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
    .insert({ ip_hash: key, event_id: eventId, kind });

  if (insertError) {
    throw new Error("rate_limit_unavailable");
  }

  maybeCleanupOldAttempts();

  return { ok: true };
}

export async function enforceRateLimit({
  request,
  kind,
  eventId,
}: {
  request: Request;
  kind: Exclude<RateLimitKind, "login">;
  eventId: string;
}): Promise<RateLimitResult> {
  const key = hashValue(getClientIp(request.headers));

  return checkAndRecord({ kind, key, eventId });
}

/**
 * Admin sign-in limiter. The key combines IP and email so one noisy IP cannot
 * lock every admin out, and one email cannot be brute-forced from many IPs.
 */
export async function enforceLoginRateLimit({
  headers,
  email,
}: {
  headers: Headers;
  email: string;
}): Promise<RateLimitResult> {
  const key = hashValue(
    `login:${getClientIp(headers)}:${email.trim().toLowerCase()}`,
  );

  return checkAndRecord({ kind: "login", key, eventId: null });
}
