"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { updateSiteSettingsAction } from "@/app/admin/actions/site-settings";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  FieldHint,
  Label,
  Textarea,
} from "@/components/ui/field";
import type { EventActionState } from "@/lib/admin/event-action-state";
import type { SiteSettings } from "@/lib/site-settings";

export function SiteSettingsForm({
  initialValues,
}: {
  initialValues: SiteSettings;
}) {
  const router = useRouter();
  const [state, setState] = useState<EventActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();
  const fieldErrors = state.fields ?? {};

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const next = await updateSiteSettingsAction(formData);
      setState(next);

      if (next.status === "success") {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6">
      {state.message ? (
        <div
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
              : "border border-accent/50 bg-accent/5 p-4 text-sm leading-relaxed text-accent"
          }
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <Label htmlFor="site-tagline">Hero tagline</Label>
        <Textarea
          id="site-tagline"
          name="heroTagline"
          rows={2}
          maxLength={120}
          defaultValue={initialValues.heroTagline}
          disabled={pending}
          aria-invalid={fieldErrors.heroTagline ? true : undefined}
          aria-describedby={
            fieldErrors.heroTagline
              ? "site-tagline-error"
              : "site-tagline-hint"
          }
          placeholder={"We make\nnoise."}
        />
        <FieldHint id="site-tagline-hint">
          Two lines max. First line is white, second line is the accent colour.
        </FieldHint>
        <FieldError id="site-tagline-error">
          {fieldErrors.heroTagline}
        </FieldError>
      </div>

      <div>
        <Label htmlFor="site-description">Hero description</Label>
        <Textarea
          id="site-description"
          name="heroDescription"
          rows={4}
          maxLength={400}
          defaultValue={initialValues.heroDescription}
          disabled={pending}
          aria-invalid={fieldErrors.heroDescription ? true : undefined}
          aria-describedby={
            fieldErrors.heroDescription
              ? "site-description-error"
              : "site-description-hint"
          }
          placeholder="Underground nightlife, electronic music and contemporary culture."
        />
        <FieldHint id="site-description-hint">
          Shown under the tagline on the public homepage.
        </FieldHint>
        <FieldError id="site-description-error">
          {fieldErrors.heroDescription}
        </FieldError>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save homepage text"}
        </Button>
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
          Changes are live on the homepage immediately.
        </span>
      </div>
    </form>
  );
}
