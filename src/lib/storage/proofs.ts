import "server-only";

import { randomUUID } from "node:crypto";

import { PROOF_BUCKET } from "@/lib/storage/constants";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  PROOF_MIME_TYPES,
  type ProofMimeType,
} from "@/lib/validation/guestlist";

const EXTENSION_BY_MIME: Record<ProofMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
  return `${eventId}/${randomUUID()}.${EXTENSION_BY_MIME[mimeType]}`;
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

/** Detects the real image type from magic bytes, ignoring the claimed MIME. */
export function detectProofMime(bytes: Uint8Array): ProofMimeType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

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

  const expectedExtension = EXTENSION_BY_MIME[mimeType];
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
