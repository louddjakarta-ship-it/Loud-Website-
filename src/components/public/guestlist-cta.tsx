import { ButtonLink } from "@/components/ui/button";

const steps = [
  {
    title: "Follow the signal",
    body: "Find the event on our Instagram and keep the flyer handy.",
  },
  {
    title: "Post + comment",
    body: "Share the flyer to your story and leave a comment on the event post.",
  },
  {
    title: "Send the proof",
    body: "Upload two screenshots with your name, Instagram and PR reference.",
  },
] as const;

export function GuestlistCta() {
  return (
    <section aria-labelledby="guestlist-heading" className="border-b border-line">
      <div className="shell grid gap-12 py-[clamp(72px,10vw,140px)] lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <p className="font-mono text-micro uppercase tracking-[0.12em] text-accent">
            02 — Guestlist
          </p>

          <h2
            id="guestlist-heading"
            className="mt-3 font-display text-display-lg uppercase"
          >
            Get on
            <br />
            the list.
          </h2>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted">
            Every registration is reviewed manually. Submit your Instagram
            proof and wait for approval — a submission is not a confirmed spot
            until our team says so.
          </p>

          <ButtonLink href="/guestlist" size="lg" className="mt-8">
            Open guestlist form
          </ButtonLink>
        </div>

        <ol className="flex flex-col justify-end border-t border-line lg:col-span-5">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[auto_1fr] gap-5 border-b border-line py-5"
            >
              <span className="font-mono text-micro text-accent">
                0{index + 1}
              </span>
              <div>
                <h3 className="font-display text-xl uppercase leading-none">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
