import { jsonError, jsonOk, readJsonBody, zodFieldErrors } from "@/lib/api";
import { getEventForSubmission } from "@/lib/data/events";
import { getMaxProofFileBytes } from "@/lib/env/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { deleteProofObjects, verifyProofObject } from "@/lib/storage/proofs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { createGuestlistSubmissionSchema } from "@/lib/validation/guestlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function uniqueViolation(
  error: { code?: string; message?: string; details?: string } | null,
  constraint: string,
): boolean {
  if (!error || error.code !== "23505") {
    return false;
  }

  return `${error.message ?? ""} ${error.details ?? ""}`.includes(constraint);
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const body = await readJsonBody(request);

  if (!body.ok) {
    return jsonError(400, "invalid_request", "Invalid request body.");
  }

  const parsed = createGuestlistSubmissionSchema().safeParse(body.value);

  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      "Check the highlighted fields and try again.",
      { fields: zodFieldErrors(parsed.error) },
    );
  }

  const input = parsed.data;

  try {
    const event = await getEventForSubmission(input.eventId);

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
      kind: "submit",
      eventId: input.eventId,
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
    const maxBytes = getMaxProofFileBytes();
    const [story, comment] = await Promise.all([
      verifyProofObject(input.storyProofPath, maxBytes),
      verifyProofObject(input.commentProofPath, maxBytes),
    ]);

    if (!story.ok || !comment.ok) {
      await deleteProofObjects([
        input.storyProofPath,
        input.commentProofPath,
      ]);

      return jsonError(
        400,
        "proof_invalid",
        "We could not verify your proof images. Please upload them again.",
        {
          fields: {
            ...(story.ok
              ? {}
              : { storyProof: "Upload a valid JPG, PNG or WEBP image." }),
            ...(comment.ok
              ? {}
              : { commentProof: "Upload a valid JPG, PNG or WEBP image." }),
          },
        },
      );
    }

    const turnstileOk = await verifyTurnstileToken(input.turnstileToken);

    if (!turnstileOk) {
      await deleteProofObjects([
        input.storyProofPath,
        input.commentProofPath,
      ]);

      return jsonError(
        400,
        "turnstile_failed",
        "Verification failed. Refresh the page and try again.",
      );
    }

    const admin = createAdminSupabaseClient();
    const { data: inserted, error: insertError } = await admin
      .from("guestlist")
      .insert({
        submission_key: input.submissionKey,
        event_id: input.eventId,
        full_name: input.fullName,
        instagram: input.instagram,
        reference_person: input.referencePerson,
        story_proof_path: input.storyProofPath,
        comment_proof_path: input.commentProofPath,
      })
      .select("id,status")
      .single();

    if (insertError || !inserted) {
      if (uniqueViolation(insertError, "submission_key")) {
        // Network retry after a successful insert. Return the original row and
        // remove the freshly uploaded duplicates.
        const { data: existing } = await admin
          .from("guestlist")
          .select("id,status")
          .eq("submission_key", input.submissionKey)
          .maybeSingle();

        await deleteProofObjects([
          input.storyProofPath,
          input.commentProofPath,
        ]);

        if (existing) {
          return jsonOk({ id: existing.id, status: existing.status });
        }

        return jsonError(
          409,
          "duplicate_submission",
          "This submission was already received.",
        );
      }

      if (
        uniqueViolation(insertError, "guestlist_unique_instagram_per_event")
      ) {
        await deleteProofObjects([
          input.storyProofPath,
          input.commentProofPath,
        ]);

        return jsonError(
          409,
          "duplicate_instagram",
          "This Instagram is already registered for this event.",
          {
            fields: {
              instagram:
                "This Instagram is already registered for this event.",
            },
          },
        );
      }

      await deleteProofObjects([
        input.storyProofPath,
        input.commentProofPath,
      ]);

      console.error("[guestlist] insert failed", {
        requestId,
        code: insertError?.code ?? "unknown",
      });

      return jsonError(
        500,
        "server_error",
        "We could not save your registration. Please try again.",
      );
    }

    return jsonOk({ id: inserted.id, status: inserted.status });
  } catch (error) {
    console.error("[guestlist] submission failed", {
      requestId,
      reason: error instanceof Error ? error.message : "unknown",
    });

    return jsonError(
      500,
      "server_error",
      "We could not save your registration. Please try again.",
    );
  }
}
