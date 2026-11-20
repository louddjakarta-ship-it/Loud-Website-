import { publicEnv } from "@/lib/env/public";
import { buildWhatsAppContactUrl } from "@/lib/whatsapp";

const STEPS = [
  {
    title: "Follow the drop",
    body: "Follow LOUD JAKARTA on Instagram and share the event flyer to your story.",
  },
  {
    title: "Send your details",
    body: "Open the private guestlist link for the night and submit your name and two proof screenshots.",
  },
  {
    title: "Wait for approval",
    body: "Every registration is reviewed manually. You are only on the list once an admin approves it.",
  },
] as const;

export function HowItWorks() {
  const whatsappUrl = buildWhatsAppContactUrl(
    publicEnv.defaultWhatsappNumber,
  );
  const instagramUrl = publicEnv.instagramUrl.trim() || null;
  const contactUrl = whatsappUrl ?? instagramUrl;

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="scroll-mt-20 border-b border-line bg-bone"
    >
      <div className="shell py-[clamp(64px,9vw,120px)]">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-olive">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-accent"
            />
            02 — How it works
          </span>
          <h2
            id="how-heading"
            className="mt-5 font-display text-h1 uppercase"
          >
            Get on the list
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted">
            No public sign-up. Guestlist links are shared per event, and every
            entry is checked by the team.
          </p>
        </div>

        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col rounded-[1.75rem] border border-line bg-surface p-6 shadow-soft sm:p-7"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink font-mono text-[0.7rem] uppercase tracking-[0.08em] text-white">
                0{index + 1}
              </span>
              <h3 className="mt-6 font-display text-2xl uppercase leading-tight">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {contactUrl ? (
            <a
              href={contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 font-mono text-micro uppercase tracking-[0.12em] text-white transition-colors hover:bg-olive"
            >
              Ask the team <span aria-hidden="true">↗</span>
            </a>
          ) : null}
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-muted">
            Registration is reviewed manually
          </span>
        </div>
      </div>
    </section>
  );
}
