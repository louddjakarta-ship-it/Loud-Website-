import { Contact } from "@/components/public/contact";
import { EventGrid } from "@/components/public/event-grid";
import { DjGrid } from "@/components/public/dj-grid";
import { Gallery } from "@/components/public/gallery";
import { GuestlistCta } from "@/components/public/guestlist-cta";
import { Hero } from "@/components/public/hero";
import { HowItWorks } from "@/components/public/how-it-works";
import { Marquee } from "@/components/public/marquee";
import {
  getUpcomingPublicEvents,
  type PublicEvent,
} from "@/lib/data/events";
import { getPublishedDjs, type PublicDj } from "@/lib/data/djs";
import { getGalleryPhotos, type GalleryPhoto } from "@/lib/data/gallery";
import { getSiteSettings } from "@/lib/data/site-settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let events: PublicEvent[] = [];
  let loadFailed = false;
  let djs: PublicDj[] = [];
  let djsFailed = false;

  const [eventsResult, settings, photos, djsResult] = await Promise.all([
    getUpcomingPublicEvents().then(
      (rows) => ({ ok: true as const, rows }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
    getSiteSettings(),
    getGalleryPhotos().catch((error: unknown) => {
      console.error(
        "[home] gallery unavailable",
        error instanceof Error ? error.message : "unknown",
      );
      return [] as GalleryPhoto[];
    }),
    getPublishedDjs(8).then(
      (rows) => ({ ok: true as const, rows }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
  ]);

  if (eventsResult.ok) {
    events = eventsResult.rows;
  } else {
    loadFailed = true;
    console.error(
      "[home] events unavailable",
      eventsResult.error instanceof Error
        ? eventsResult.error.message
        : "unknown",
    );
  }

  if (djsResult.ok) {
    djs = djsResult.rows;
  } else {
    djsFailed = true;
    console.error(
      "[home] djs unavailable",
      djsResult.error instanceof Error
        ? djsResult.error.message
        : "unknown",
    );
  }

  return (
    <>
      <Hero
        tagline={settings.heroTagline}
        description={settings.heroDescription}
        nextEvent={events[0] ?? null}
        djs={djs}
      />
      <Marquee phrase="LOUD JAKARTA" />
      <EventGrid events={events} loadFailed={loadFailed} />
      <HowItWorks />
      <DjGrid djs={djs} loadFailed={djsFailed} />
      <GuestlistCta />
      <Gallery photos={photos} />
      <Contact />
    </>
  );
}
