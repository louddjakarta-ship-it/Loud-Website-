import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guestlist",
  robots: { index: false, follow: false },
};

/**
 * The public guestlist index is intentionally closed. Guests reach the form
 * only through the private, per-event link an admin shares.
 */
export default function GuestlistIndexPage(): never {
  notFound();
}
