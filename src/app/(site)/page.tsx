import { EventGrid } from "@/components/public/event-grid";
import { GuestlistCta } from "@/components/public/guestlist-cta";
import { Hero } from "@/components/public/hero";
import {
  getUpcomingPublicEvents,
  type PublicEvent,
} from "@/lib/data/events";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let events: PublicEvent[] = [];
  let loadFailed = false;

  try {
    events = await getUpcomingPublicEvents();
  } catch (error) {
    loadFailed = true;
    console.error(
      "[home] events unavailable",
      error instanceof Error ? error.message : "unknown",
    );
  }

  return (
    <>
      <Hero />
      <EventGrid events={events} loadFailed={loadFailed} />
      <GuestlistCta />
    </>
  );
}
