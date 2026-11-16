import { jsonError, jsonOk, readJsonBody, zodFieldErrors } from "@/lib/api";
import { getEventForSubmission } from "@/lib/data/events";
import { getMaxProofFileBytes } from "@/lib/env/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createProofUploadTarget } from "@/lib/storage/proofs";
import { createUploadUrlRequestSchema } from "@/lib/validation/guestlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issues one short-lived signed upload URL for a proof slot.
 *
 * The server owns the storage path. The browser only receives the path and
 * the single-use upload token.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);

  if (!body.ok) {
    return jsonError(400, "invalid_request", "Invalid request body.");
  }

  const maxBytes = getMaxProofFileBytes();
  const parsed = createUploadUrlRequestSchema(maxBytes).safeParse(body.value);

  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      "Check the form and try again.",
      { fields: zodFieldErrors(parsed.error) },
    );
  }

  const { eventId, mimeType } = parsed.data;

  try {
    const event = await getEventForSubmission(eventId);

    if (!event) {
      return jsonError(
        409,
        "event_unavailable",
        "Registration for this event is closed.",
      );
    }
  } catch {
    return jsonError(
      503,
      "service_unavailable",
      "Guestlist is temporarily unavailable. Please try again later.",
    );
  }

  try {
    const limit = await enforceRateLimit({
      request,
      kind: "upload",
      eventId,
    });

    if (!limit.ok) {
      return jsonError(
        429,
        "rate_limited",
        "Too many attempts. Please wait a few minutes and try again.",
        { retryAfterSeconds: limit.retryAfterSeconds },
      );
    }
  } catch {
    return jsonError(
      503,
      "service_unavailable",
      "Guestlist is temporarily unavailable. Please try again later.",
    );
  }

  try {
    const target = await createProofUploadTarget(eventId, mimeType);

    if (!target) {
      return jsonError(
        503,
        "upload_unavailable",
        "We could not prepare the upload. Please try again.",
      );
    }

    return jsonOk(target);
  } catch {
    return jsonError(
      503,
      "service_unavailable",
      "Guestlist is temporarily unavailable. Please try again later.",
    );
  }
}
