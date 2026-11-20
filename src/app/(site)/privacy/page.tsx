import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "How LOUD JAKARTA collects, stores and deletes guestlist registration data and Instagram proof images.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="shell py-[clamp(56px,8vw,120px)]">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-olive">
          Privacy
        </span>

        <h1 className="mt-4 font-display text-display-lg uppercase">
          Privacy
          <br />
          notice.
        </h1>

        <p className="mt-6 text-base leading-relaxed text-muted">
          This notice explains what we collect when you submit a guestlist
          registration and how that information is handled. It is written for
          the current MVP, which has no third-party analytics or advertising
          trackers.
        </p>

        <div className="mt-10 space-y-8 border-t border-line pt-8">
          <section>
            <h2 className="font-display text-2xl uppercase">
              What we collect
            </h2>
            <ul className="mt-4 space-y-3 text-base leading-relaxed text-muted">
              <li>Your full name.</li>
              <li>
                Your Instagram username, stored without the leading @ symbol.
              </li>
              <li>The PR or reference person you enter.</li>
              <li>
                Two screenshots: your Instagram story proof and your comment
                proof.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl uppercase">
              Why we collect it
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              We use this information only to verify that you completed the
              guestlist requirements for the event you selected. We do not sell
              it, publish it, or use it for advertising.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl uppercase">
              Where it is stored
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Registration data is stored in our Supabase database. Proof
              screenshots are stored in a private Supabase Storage bucket. The
              bucket is not publicly readable; authorised admins receive
              short-lived signed links when they review a registration.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl uppercase">
              Who can see it
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Only authorised LOUD JAKARTA admins can view guestlist data and
              proof images. Other visitors cannot read the guestlist or access
              anyone else&apos;s proof. Public pages never display registration
              data.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl uppercase">Retention</h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              We keep guestlist data and proof images until 90 days after the
              event, after which they may be deleted. You can ask us to delete
              your registration earlier by contacting us on WhatsApp or
              Instagram once those links are published.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl uppercase">
              Rate limiting and security
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              To prevent spam, we store a one-way hash of your IP address with a
              server-side salt for a short period. We never store the raw IP
              address. Uploaded files are checked for their real image type and
              size before a registration is saved.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl uppercase">Contact</h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              For privacy questions or deletion requests, contact the LOUD
              JAKARTA team. Official WhatsApp and Instagram links will be added
              when the owner provides them.
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-8">
          <Link
            href="/"
            className="inline-flex h-11 items-center border border-accent bg-accent px-5 font-mono text-micro uppercase tracking-[0.12em] text-ink transition-colors hover:bg-paper"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
