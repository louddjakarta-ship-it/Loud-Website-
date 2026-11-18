import { z } from "zod";

// Strict CSP has no 'unsafe-eval'. Zod's JIT probe calls Function("") during
// validation, which browsers report as a CSP violation even though it is
// caught internally. Disabling the JIT keeps the policy clean.
z.config({ jitless: true });

export const PROOF_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ProofMimeType = (typeof PROOF_MIME_TYPES)[number];

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const INSTAGRAM_PATTERN = /^[a-z0-9._]{1,30}$/;
const PROOF_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|jpeg|png|webp)$/i;

export const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(120, "Full name must be 120 characters or fewer.")
  .refine(
    (value) => !CONTROL_CHARACTERS.test(value),
    "Full name contains invalid characters.",
  );

export const instagramSchema = z
  .string()
  .trim()
  .min(1, "Enter your Instagram username.")
  .transform((value) => value.replace(/^@+/, "").toLowerCase())
  .refine(
    (value) => INSTAGRAM_PATTERN.test(value),
    "Use 1–30 letters, numbers, dots or underscores.",
  );

export const referencePersonSchema = z
  .string()
  .trim()
  .min(1, "Enter your PR or reference person.")
  .max(120, "Reference person must be 120 characters or fewer.")
  .refine(
    (value) => !CONTROL_CHARACTERS.test(value),
    "Reference person contains invalid characters.",
  );

export const eventIdSchema = z.uuid("Choose a valid event.");
export const guestlistTokenSchema = z.uuid("Invalid guestlist link.");
export const submissionKeySchema = z.uuid("Invalid submission key.");

export const proofPathSchema = z
  .string()
  .regex(PROOF_PATH_PATTERN, "Invalid proof image reference.");

/** Fields validated in the browser before any upload starts. */
export const guestlistFieldsSchema = z.object({
  fullName: fullNameSchema,
  instagram: instagramSchema,
  referencePerson: referencePersonSchema,
});

export type GuestlistFields = z.infer<typeof guestlistFieldsSchema>;

export function createUploadUrlRequestSchema(maxBytes: number) {
  const maxMegabytes = Math.max(1, Math.floor(maxBytes / (1024 * 1024)));

  return z.object({
    eventId: eventIdSchema,
    guestlistToken: guestlistTokenSchema,
    slot: z.enum(["story", "comment"], "Choose a proof slot."),
    mimeType: z.enum(PROOF_MIME_TYPES, "Use a JPG, PNG or WEBP image."),
    size: z
      .number()
      .int("Invalid file size.")
      .positive("Invalid file size.")
      .max(
        maxBytes,
        `Each image must be ${maxMegabytes} MB or smaller after compression.`,
      ),
  });
}

export type UploadUrlRequest = z.infer<
  ReturnType<typeof createUploadUrlRequestSchema>
>;

export function createGuestlistSubmissionSchema() {
  return z
    .object({
      eventId: eventIdSchema,
      guestlistToken: guestlistTokenSchema,
      submissionKey: submissionKeySchema,
      fullName: fullNameSchema,
      instagram: instagramSchema,
      referencePerson: referencePersonSchema,
      storyProofPath: proofPathSchema,
      commentProofPath: proofPathSchema,
      turnstileToken: z.string().max(4096).optional(),
    })
    .superRefine((value, ctx) => {
      if (value.storyProofPath === value.commentProofPath) {
        ctx.addIssue({
          code: "custom",
          path: ["commentProofPath"],
          message: "Story and comment proof must be different images.",
        });
      }

      for (const [field, path] of [
        ["storyProofPath", value.storyProofPath],
        ["commentProofPath", value.commentProofPath],
      ] as const) {
        if (!path.startsWith(`${value.eventId}/`)) {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: "Invalid proof image reference.",
          });
        }
      }
    });
}

export type GuestlistSubmission = z.infer<
  ReturnType<typeof createGuestlistSubmissionSchema>
>;
