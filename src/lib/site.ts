import { publicEnv } from "@/lib/env/public";

/** Joins a path to the configured public site URL without duplicate slashes. */
export function absoluteUrl(path = "/"): string {
  const base = publicEnv.siteUrl.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;

  return `${base}${suffix}`;
}
