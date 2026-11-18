import "server-only";

import { randomUUID } from "node:crypto";

import {
  detectImageMime,
  extensionForImageMime,
} from "@/lib/images/magic-bytes";
import { PROOF_BUCKET } from "@/lib/storage/constants";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  PROOF_MIME_TYPES,
  type ProofMimeType,
} from "@/lib/validation/guestlist";

const UUID_SEGMENT =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PROOF_PATH_REGEX = new RegExp(
  `^(${UUID_SEGMENT})/(${UUID_SEGMENT})\\.(jpg|jpeg|png|webp)$`,
  "i",
);

export function isProofMimeType(value: string): value is ProofMimeType {
  return (PROOF_MIME_TYPES as readonly string[]).includes(value);
}

export function parseProofPath(path: string) {
  const match = PROOF_PATH_REGEX.exec(path);

  if (!match) {
    return null;
  }

  return {
    eventId: match[1],
    fileId: match[2],
    extension: match[3].toLowerCase(),
  };
}

/**
 * Server-owned storage path: `{event_id}/{random_uuid}.{ext}`.
 * The client never chooses a filename.
 */
export function createProofPath(
  eventId: string,
  mimeType: ProofMimeType,
): string {
  return `${eventId}/${randomUUID()}.${extensionForImageMime(mimeType)}`;
}

/**
 * Creates a short-lived signed upload URL for one proof slot.
 * The storage bucket still enforces MIME type and size limits.
 */
export async function createProofUploadTarget(
  eventId: string,
  mimeType: ProofMimeType,
): Promise<{ path: string; token: string } | null> {
  const admin = createAdminSupabaseClient();
  const path = createProofPath(eventId, mimeType);
  const { data, error } = await admin.storage
    .from(PROOF_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return null;
  }

  return { path: data.path, token: data.token };
}

/** @deprecated Use `detectImageMime` from `@/lib/images/magic-bytes`. */
export const detectProofMime = detectImageMime;

export type ProofVerification =
  | { ok: true; mimeType: ProofMimeType; size: number }
  | {
      ok: false;
      reason: "invalid_path" | "missing" | "too_large" | "invalid_type";
    };

/**
 * Downloads a just-uploaded proof and verifies its real content. The file is
 * deleted by the caller when the submission is rejected.
 */
export async function verifyProofObject(
  path: string,
  maxBytes: number,
): Promise<ProofVerification> {
  const parsed = parseProofPath(path);

  if (!parsed) {
    return { ok: false, reason: "invalid_path" };
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.storage
    .from(PROOF_BUCKET)
    .download(path);

  if (error || !data) {
    return { ok: false, reason: "missing" };
  }

  if (data.size > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  const mimeType = detectProofMime(bytes);

  if (!mimeType) {
    return { ok: false, reason: "invalid_type" };
  }

  const expectedExtension = extensionForImageMime(mimeType);
  const actualExtension =
    parsed.extension === "jpeg" ? "jpg" : parsed.extension;

  if (actualExtension !== expectedExtension) {
    return { ok: false, reason: "invalid_type" };
  }

  return { ok: true, mimeType, size: data.size };
}

/** Best-effort cleanup. Never throws, so it cannot mask the real response. */
export async function deleteProofObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  try {
    const admin = createAdminSupabaseClient();
    await admin.storage.from(PROOF_BUCKET).remove(paths);
  } catch {
    // Orphan cleanup is handled by the documented maintenance script.
  }
}
