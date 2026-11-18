"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  createEventAction,
  updateEventAction,
} from "@/app/admin/actions/events";
import type { EventActionState } from "@/lib/admin/event-action-state";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  FieldHint,
  Input,
  Label,
  Textarea,
} from "@/components/ui/field";
import { toJakartaDateTimeLocal } from "@/lib/format";
import { compressFlyerImage } from "@/lib/images/compress";

export type EventFormInitial = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  eventDate: string;
  venue: string | null;
  mapsUrl: string | null;
  whatsappNumber: string | null;
  registrationOpen: boolean;
  isPublished: boolean;
  flyerUrl: string | null;
};

const MAX_FLYER_MB = 4;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function EventForm({
  mode,
  event,
}: {
  mode: "create" | "edit";
  event?: EventFormInitial;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<EventActionState>({ status: "idle" });
  const [clientError, setClientError] = useState<string | null>(null);
  const [flyerName, setFlyerName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [processing, setProcessing] = useState(false);
  const busy = pending || processing;

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setState({ status: "idle" });
    setClientError(null);

    const form = formRef.current;

    if (!form) {
      return;
    }

    const formData = new FormData(form);
    const file = fileRef.current?.files?.[0];

    if (file) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        setClientError("Use a JPG, PNG or WEBP image.");
        return;
      }

      setProcessing(true);

      try {
        const compressed = await compressFlyerImage(file);

        if (compressed.blob.size > MAX_FLYER_MB * 1024 * 1024) {
          setClientError(
            `The compressed flyer is still larger than ${MAX_FLYER_MB} MB. Try a smaller image.`,
          );
          return;
        }

        formData.set(
          "flyer",
          new File([compressed.blob], "flyer.webp", {
            type: compressed.mimeType,
          }),
        );
      } catch {
        setClientError(
          "We could not read that image. Try another JPG, PNG or WEBP file.",
        );
        return;
      } finally {
        setProcessing(false);
      }
    }

    const action = mode === "create" ? createEventAction : updateEventAction;

    startTransition(async () => {
      try {
        const result = await action(formData);

        if (result.status === "success" && result.redirectTo) {
          router.push(result.redirectTo);
          router.refresh();
          return;
        }

        setState(result);
      } catch {
        setClientError(
          "We could not save the event. Check your connection and try again.",
        );
      }
    });
  }

  const errorMessage = clientError || state.message;
  const fieldErrors = state.fields ?? {};

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-8"
      noValidate
    >
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}

      {errorMessage ? (
        <div
          role="alert"
          className="border border-danger/50 bg-danger/5 p-4 text-sm leading-relaxed text-danger"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="event-name">Event name</Label>
          <Input
            id="event-name"
            name="name"
            type="text"
            required
            maxLength={140}
            defaultValue={event?.name ?? ""}
            disabled={busy}
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={fieldErrors.name ? "event-name-error" : undefined}
            placeholder="LOUD JAKARTA 002"
          />
          <FieldError id="event-name-error">{fieldErrors.name}</FieldError>
        </div>

        <div>
          <Label htmlFor="event-date">Date &amp; time (WIB)</Label>
          <Input
            id="event-date"
            name="eventDate"
            type="datetime-local"
            required
            defaultValue={
              event ? toJakartaDateTimeLocal(event.eventDate) : ""
            }
            disabled={busy}
            aria-invalid={fieldErrors.eventDate ? true : undefined}
            aria-describedby={
              fieldErrors.eventDate ? "event-date-error" : "event-date-hint"
            }
          />
          <FieldHint id="event-date-hint">
            Interpreted as Asia/Jakarta (UTC+7) and stored as UTC.
          </FieldHint>
          <FieldError id="event-date-error">{fieldErrors.eventDate}</FieldError>
        </div>

        <div>
          <Label htmlFor="event-venue">Venue</Label>
          <Input
            id="event-venue"
            name="venue"
            type="text"
            maxLength={160}
            defaultValue={event?.venue ?? ""}
            disabled={busy}
            aria-invalid={fieldErrors.venue ? true : undefined}
            aria-describedby={
              fieldErrors.venue ? "event-venue-error" : undefined
            }
            placeholder="TBA — Jakarta"
          />
          <FieldError id="event-venue-error">{fieldErrors.venue}</FieldError>
        </div>

        <div>
          <Label htmlFor="event-maps">Google Maps link</Label>
          <Input
            id="event-maps"
            name="mapsUrl"
            type="url"
            inputMode="url"
            maxLength={500}
            defaultValue={event?.mapsUrl ?? ""}
            disabled={busy}
            aria-invalid={fieldErrors.mapsUrl ? true : undefined}
            aria-describedby={
              fieldErrors.mapsUrl ? "event-maps-error" : "event-maps-hint"
            }
            placeholder="https://maps.app.goo.gl/..."
          />
          <FieldHint id="event-maps-hint">
            Optional. Paste the share link from Google Maps; it becomes a map
            button on the public event card.
          </FieldHint>
          <FieldError id="event-maps-error">{fieldErrors.mapsUrl}</FieldError>
        </div>

        <div>
          <Label htmlFor="event-slug">Slug</Label>
          <Input
            id="event-slug"
            name="slug"
            type="text"
            maxLength={80}
            defaultValue={event?.slug ?? ""}
            disabled={busy}
            aria-invalid={fieldErrors.slug ? true : undefined}
            aria-describedby={
              fieldErrors.slug ? "event-slug-error" : "event-slug-hint"
            }
            placeholder="loud-jakarta-002"
          />
          <FieldHint id="event-slug-hint">
            Leave empty to generate from the name. Duplicates get a numeric
            suffix.
          </FieldHint>
          <FieldError id="event-slug-error">{fieldErrors.slug}</FieldError>
        </div>

        <div>
          <Label htmlFor="event-whatsapp">WhatsApp number</Label>
          <Input
            id="event-whatsapp"
            name="whatsappNumber"
            type="tel"
            maxLength={24}
            defaultValue={event?.whatsappNumber ?? ""}
            disabled={busy}
            aria-invalid={fieldErrors.whatsappNumber ? true : undefined}
            aria-describedby={
              fieldErrors.whatsappNumber
                ? "event-whatsapp-error"
                : "event-whatsapp-hint"
            }
            placeholder="6281234567890"
          />
          <FieldHint id="event-whatsapp-hint">
            Optional. Falls back to the site-wide number when empty.
          </FieldHint>
          <FieldError id="event-whatsapp-error">
            {fieldErrors.whatsappNumber}
          </FieldError>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="event-description">Description</Label>
          <Textarea
            id="event-description"
            name="description"
            maxLength={2000}
            defaultValue={event?.description ?? ""}
            disabled={busy}
            aria-invalid={fieldErrors.description ? true : undefined}
            aria-describedby={
              fieldErrors.description ? "event-description-error" : undefined
            }
            placeholder="Line-up, sound, door policy, anything guests should know."
          />
          <FieldError id="event-description-error">
            {fieldErrors.description}
          </FieldError>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="event-flyer">Flyer</Label>

          {event?.flyerUrl ? (
            <div className="mb-3 flex items-center gap-4 border border-line bg-surface p-3">
              <Image
                src={event.flyerUrl}
                alt={`Current flyer for ${event.name}`}
                width={80}
                height={100}
                unoptimized
                className="h-[100px] w-20 border border-line object-cover"
              />
              <div className="text-sm leading-relaxed text-muted">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-paper">
                  Current flyer
                </p>
                <p className="mt-1">
                  Upload a new image below to replace it. The old file is
                  removed after a successful save.
                </p>
              </div>
            </div>
          ) : null}

          <input
            ref={fileRef}
            id="event-flyer"
            name="flyer"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(changeEvent) => {
              const file = changeEvent.target.files?.[0];
              setFlyerName(file ? file.name : null);
            }}
            aria-invalid={fieldErrors.flyer ? true : undefined}
            aria-describedby={
              fieldErrors.flyer ? "event-flyer-error" : "event-flyer-hint"
            }
            className="block w-full border border-line bg-surface px-4 py-3 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-muted file:mr-4 file:border-0 file:bg-accent file:px-3 file:py-2 file:font-mono file:text-[0.65rem] file:uppercase file:tracking-[0.08em] file:text-ink"
          />
          <FieldHint id="event-flyer-hint">
            JPG, PNG or WEBP. Compressed in the browser to WebP, max{" "}
            {MAX_FLYER_MB} MB. Recommended portrait 4:5.
            {flyerName ? ` Selected: ${flyerName}` : ""}
          </FieldHint>
          <FieldError id="event-flyer-error">{fieldErrors.flyer}</FieldError>
        </div>
      </div>

      <fieldset className="grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
        <legend className="sr-only">Visibility</legend>

        <label className="flex cursor-pointer items-start gap-3 border border-line bg-surface p-4">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={event?.isPublished ?? false}
            disabled={busy}
            className="mt-0.5 h-4 w-4 accent-[#C6FF00]"
          />
          <span>
            <span className="block font-mono text-micro uppercase tracking-[0.12em] text-paper">
              Published
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-muted">
              Show this event on the public homepage.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 border border-line bg-surface p-4">
          <input
            type="checkbox"
            name="registrationOpen"
            defaultChecked={event?.registrationOpen ?? true}
            disabled={busy}
            className="mt-0.5 h-4 w-4 accent-[#C6FF00]"
          />
          <span>
            <span className="block font-mono text-micro uppercase tracking-[0.12em] text-paper">
              Guestlist open
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-muted">
              Accept new guestlist submissions for this event.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/events"
          className="font-mono text-micro uppercase tracking-[0.12em] text-muted transition-colors hover:text-paper"
        >
          Cancel
        </Link>

        <Button type="submit" size="lg" disabled={busy}>
          {processing
            ? "Processing flyer…"
            : pending
              ? "Saving…"
              : mode === "create"
                ? "Create event"
                : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
