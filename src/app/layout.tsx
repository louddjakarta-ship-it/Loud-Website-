import type { Metadata, Viewport } from "next";
import { Anton, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { publicEnv } from "@/lib/env/public";

import "@/styles/globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "LOUD JAKARTA",
    template: "%s — LOUD JAKARTA",
  },
  description:
    "Underground nightlife, electronic music and contemporary culture in Jakarta. Upcoming events, WhatsApp RSVP and guestlist registration.",
  applicationName: "LOUD JAKARTA",
  openGraph: {
    type: "website",
    siteName: "LOUD JAKARTA",
    title: "LOUD JAKARTA",
    description:
      "Underground nightlife, electronic music and contemporary culture in Jakarta.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "LOUD JAKARTA",
    description:
      "Underground nightlife, electronic music and contemporary culture in Jakarta.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:font-mono focus:text-micro focus:uppercase focus:text-ink"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
