import { EventGrid } from "@/components/public/event-grid";
import { Gallery } from "@/components/public/gallery";
import { Hero } from "@/components/public/hero";
import {
  getUpcomingPublicEvents,
  type PublicEvent,
} from "@/lib/data/events";
import { getGalleryPhotos, type GalleryPhoto } from "@/lib/data/gallery";
import { getSiteSettings } from "@/lib/data/site-settings";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let events: PublicEvent[] = [];
  let loadFailed = false;

  const [eventsResult, settings, photos] = await Promise.all([
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

  return (
    <>
      <Hero
        tagline={settings.heroTagline}
        description={settings.heroDescription}
      />
      <EventGrid events={events} loadFailed={loadFailed} />
      <Gallery photos={photos} />
    </>
  );
}
