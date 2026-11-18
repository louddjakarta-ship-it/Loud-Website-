"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";

import { ProofUpload, type ProofFile } from "@/components/public/proof-upload";
import { TurnstileWidget } from "@/components/public/turnstile-widget";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  FieldHint,
  Input,
  Label,
} from "@/components/ui/field";
import { zodFieldErrors } from "@/lib/api";
import { formatEventDateTime } from "@/lib/format";
import { PROOF_BUCKET } from "@/lib/storage/constants";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { guestlistFieldsSchema } from "@/lib/validation/guestlist";

export type GuestlistEventOption = {
  id: string;
  name: string;
  eventDate: string;
  venue: string | null;
};

type GuestlistFormProps = {
  event: GuestlistEventOption;
  guestlistToken: string;
  maxFileMb: number;
  turnstileSiteKey: string;
};

type SubmitState = "idle" | "uploading" | "submitting" | "success";

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = {
  ok: false;
  error: { code: string; message: string; fields?: Record<string, string> };
};
type ApiPayload<T> = ApiSuccess<T> | ApiFailure;

type SubmissionResult = {
  id: string;
  status: "pending" | "approved" | "rejected";
};

class GuestlistApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "GuestlistApiError";
  }
}

async function parseApiResponse<T>(
  response: Response,
): Promise<ApiPayload<T> | null> {
  try {
    return (await response.json()) as ApiPayload<T>;
  } catch {
    return null;
  }
}

function apiErrorFrom(
  payload: ApiPayload<unknown> | null,
  response: Response,
): GuestlistApiError {
  if (payload && !payload.ok) {
    if (response.status === 429) {
      return new GuestlistApiError(
        "Too many attempts. Please wait a few minutes and try again.",
        payload.error.code,
        429,
        payload.error.fields,
      );
    }

    return new GuestlistApiError(
      payload.error.message,
      payload.error.code,
      response.status,
      payload.error.fields,
    );
  }

  return new GuestlistApiError(
    "We could not process that request. Please check your connection and try again.",
    "request_failed",
    response.status,
  );
}

function SuccessPanel({ result }: { result: SubmissionResult }) {
  const reference = result.id.slice(0, 8).toUpperCase();
  const isPending = result.status === "pending";
  const heading = isPending
    ? "Pending review."
    : result.status === "approved"
      ? "Already approved."
      : "Not approved.";

  return (
    <div
      role="status"
      aria-live="polite"
      className="border border-accent/40 bg-surface p-6 sm:p-10"
    >
      <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
        Submission received
      </p>

      <h2 className="mt-4 font-display text-h1 uppercase">{heading}</h2>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="font-mono text-micro uppercase tracking-[0.12em] text-muted">
          Status
        </span>
        <span className="bg-accent px-2.5 py-1 font-mono text-micro uppercase tracking-[0.12em] text-ink">
          {result.status}
        </span>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
          Ref {reference}
        </span>
      </div>

      {isPending ? (
        <div className="mt-6 space-y-4 text-base leading-relaxed text-muted">
          <p className="text-paper">
            You are <strong className="text-accent">not</strong> on the
            guestlist until an admin approves your proof.
          </p>
          <p>
            We review every submission manually. Do not submit again for this
            event — one Instagram account can only register once per event.
          </p>
          <p>
            If you have questions or your registration was rejected, contact us
            on WhatsApp.
          </p>
        </div>
      ) : (
        <p className="mt-6 text-base leading-relaxed text-muted">
          This submission key was already processed. If you need to change
          anything, contact the LOUD JAKARTA team directly.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center border border-accent bg-accent px-5 font-mono text-micro uppercase tracking-[0.12em] text-ink transition-colors hover:bg-paper"
        >
          Back to home
        </Link>
        <Link
          href="/#events"
          className="inline-flex h-11 items-center border border-line px-5 font-mono text-micro uppercase tracking-[0.12em] text-paper transition-colors hover:border-accent hover:text-accent"
        >
          Upcoming events
        </Link>
      </div>
    </div>
  );
}

export function GuestlistForm({
  event,
  guestlistToken,
  maxFileMb,
  turnstileSiteKey,
}: GuestlistFormProps) {
  const baseId = useId();
  const eventId = event.id;
  const [fullName, setFullName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [referencePerson, setReferencePerson] = useState("");
  const [storyProof, setStoryProof] = useState<ProofFile | null>(null);
  const [commentProof, setCommentProof] = useState<ProofFile | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [state, setState] = useState<SubmitState>("idle");
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [submissionKey] = useState(() => crypto.randomUUID());

  const busy = state === "uploading" || state === "submitting";
  const prefix = `${baseId}-`;

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function resetTurnstile() {
    if (!turnstileSiteKey) {
      return;
    }

    setTurnstileToken("");
    setTurnstileKey((key) => key + 1);
  }

  async function uploadProof(
    slot: "story" | "comment",
    proof: ProofFile,
  ): Promise<{ path: string }> {
    const response = await fetch("/api/guestlist/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventId,
        guestlistToken,
        slot,
        mimeType: proof.mimeType,
        size: proof.size,
      }),
    });

    const payload = await parseApiResponse<{ path: string; token: string }>(
      response,
    );

    if (!response.ok || !payload?.ok) {
      throw apiErrorFrom(payload, response);
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.storage
      .from(PROOF_BUCKET)
      .uploadToSignedUrl(payload.data.path, payload.data.token, proof.blob, {
        contentType: proof.mimeType,
        upsert: false,
      });

    if (error) {
      throw new GuestlistApiError(
        "Upload failed. Check your connection and try again.",
        "upload_failed",
        0,
      );
    }

    return { path: payload.data.path };
  }

  function handleApiFailure(
    payload: ApiPayload<unknown> | null,
    response: Response,
  ) {
    if (payload && !payload.ok) {
      if (payload.error.code === "duplicate_instagram") {
        setFieldErrors({ instagram: payload.error.message });
      } else if (payload.error.fields) {
        setFieldErrors(payload.error.fields);
      }

      setFormError(payload.error.message);
    } else if (response.status === 429) {
      setFormError(
        "Too many attempts. Please wait a few minutes and try again.",
      );
    } else {
      setFormError(
        "We could not submit your registration. Check your connection and try again.",
      );
    }

    resetTurnstile();
    setState("idle");
    setProgress(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setFormError(null);
    setFieldErrors({});

    const parsed = guestlistFieldsSchema.safeParse({
      fullName,
      instagram,
      referencePerson,
    });

    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error));
      setFormError("Check the highlighted fields and try again.");
      return;
    }

    const missing: Record<string, string> = {};

    if (!storyProof) {
      missing.storyProof = "Upload your Instagram story proof.";
    }

    if (!commentProof) {
      missing.commentProof = "Upload your Instagram comment proof.";
    }

    if (Object.keys(missing).length > 0) {
      setFieldErrors(missing);
      setFormError("Check the highlighted fields and try again.");
      return;
    }

    if (turnstileSiteKey && !turnstileToken) {
      setFormError(
        "Complete the verification check before submitting your registration.",
      );
      return;
    }

    if (!storyProof || !commentProof) {
      return;
    }

    setState("uploading");
    setProgress("Uploading Instagram story proof…");
    let finalSubmitStarted = false;

    try {
      const story = await uploadProof("story", storyProof);
      setProgress("Uploading Instagram comment proof…");
      const comment = await uploadProof("comment", commentProof);

      setState("submitting");
      setProgress("Submitting your registration…");
      finalSubmitStarted = true;

      const response = await fetch("/api/guestlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventId,
          guestlistToken,
          submissionKey,
          fullName: parsed.data.fullName,
          instagram: parsed.data.instagram,
          referencePerson: parsed.data.referencePerson,
          storyProofPath: story.path,
          commentProofPath: comment.path,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const payload = await parseApiResponse<SubmissionResult>(response);

      if (!response.ok || !payload?.ok) {
        handleApiFailure(payload, response);
        return;
      }

      setResult(payload.data);
      setState("success");
      setProgress(null);
    } catch (error) {
      if (error instanceof GuestlistApiError) {
        if (error.code === "duplicate_instagram") {
          setFieldErrors({ instagram: error.message });
        } else if (error.fields) {
          setFieldErrors(error.fields);
        }

        setFormError(error.message);
      } else {
        setFormError(
          "Something went wrong while uploading. Check your connection and try again.",
        );
      }

      if (finalSubmitStarted) {
        resetTurnstile();
      }

      setState("idle");
      setProgress(null);
    }
  }

  if (state === "success" && result) {
    return <SuccessPanel result={result} />;
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={busy}>
      {formError ? (
        <div
          role="alert"
          className="mb-6 border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          {formError}
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="border border-line bg-ink p-4 sm:col-span-2">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-accent">
            Guestlist for
          </p>
          <p className="mt-2 font-display text-xl uppercase leading-tight">
            {event.name}
          </p>
          <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted">
            {formatEventDateTime(event.eventDate)}
            {event.venue ? ` · ${event.venue}` : ""}
          </p>
        </div>

        <div>
          <Label htmlFor={`${prefix}name`}>Full name</Label>
          <Input
            id={`${prefix}name`}
            name="fullName"
            type="text"
            autoComplete="name"
            maxLength={120}
            value={fullName}
            onChange={(event) => {
              setFullName(event.target.value);
              clearFieldError("fullName");
            }}
            disabled={busy}
            aria-invalid={fieldErrors.fullName ? true : undefined}
            aria-describedby={
              fieldErrors.fullName ? `${prefix}name-error` : undefined
            }
            placeholder="Your full name"
          />
          <FieldError id={`${prefix}name-error`}>
            {fieldErrors.fullName}
          </FieldError>
        </div>

        <div>
          <Label htmlFor={`${prefix}instagram`}>Instagram username</Label>
          <Input
            id={`${prefix}instagram`}
            name="instagram"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={31}
            value={instagram}
            onChange={(event) => {
              setInstagram(event.target.value);
              clearFieldError("instagram");
            }}
            disabled={busy}
            aria-invalid={fieldErrors.instagram ? true : undefined}
            aria-describedby={
              fieldErrors.instagram
                ? `${prefix}instagram-error`
                : `${prefix}instagram-hint`
            }
            placeholder="@username"
          />
          <FieldHint id={`${prefix}instagram-hint`}>
            With or without @. Stored without the @ symbol.
          </FieldHint>
          <FieldError id={`${prefix}instagram-error`}>
            {fieldErrors.instagram}
          </FieldError>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor={`${prefix}reference`}>
            PR / Reference person
          </Label>
          <Input
            id={`${prefix}reference`}
            name="referencePerson"
            type="text"
            maxLength={120}
            value={referencePerson}
            onChange={(event) => {
              setReferencePerson(event.target.value);
              clearFieldError("referencePerson");
            }}
            disabled={busy}
            aria-invalid={fieldErrors.referencePerson ? true : undefined}
            aria-describedby={
              fieldErrors.referencePerson
                ? `${prefix}reference-error`
                : undefined
            }
            placeholder="Who referred you?"
          />
          <FieldError id={`${prefix}reference-error`}>
            {fieldErrors.referencePerson}
          </FieldError>
        </div>

        <ProofUpload
          id={`${prefix}story`}
          label="Instagram story proof"
          hint="Screenshot of your story sharing the event flyer."
          value={storyProof}
          onChange={(value) => {
            setStoryProof(value);
            clearFieldError("storyProof");
          }}
          maxFileMb={maxFileMb}
          error={fieldErrors.storyProof}
          disabled={busy}
        />

        <ProofUpload
          id={`${prefix}comment`}
          label="Instagram comment proof"
          hint="Screenshot of your comment on the event post."
          value={commentProof}
          onChange={(value) => {
            setCommentProof(value);
            clearFieldError("commentProof");
          }}
          maxFileMb={maxFileMb}
          error={fieldErrors.commentProof}
          disabled={busy}
        />
      </div>

      <div className="mt-6 border border-line bg-ink p-4 text-sm leading-relaxed text-muted">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-paper">
          Privacy notice
        </p>
        <p className="mt-2">
          Your name, Instagram username, reference person and two proof
          screenshots are used only to verify this guestlist registration. Proof
          images are stored in a private bucket and are only visible to
          authorised admins. Read the{" "}
          <Link
            href="/privacy"
            className="text-accent underline decoration-accent/40 underline-offset-4 hover:text-paper"
          >
            full privacy notice
          </Link>
          .
        </p>
      </div>

      <div className="mt-6">
        <TurnstileWidget
          key={turnstileKey}
          siteKey={turnstileSiteKey}
          onToken={setTurnstileToken}
        />
      </div>

      {progress ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 flex items-center gap-3 font-mono text-micro uppercase tracking-[0.12em] text-accent"
        >
          <span
            aria-hidden="true"
            className="block h-3 w-3 animate-spin rounded-full border border-line border-t-accent"
          />
          {progress}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-5 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-sm leading-relaxed text-muted">
          Submitting does not guarantee entry. Your registration stays pending
          until an admin approves your proof.
        </p>

        <Button type="submit" size="lg" disabled={busy} className="shrink-0">
          {state === "uploading"
            ? "Uploading proof…"
            : state === "submitting"
              ? "Submitting…"
              : "Submit guestlist"}
        </Button>
      </div>
    </form>
  );
}
