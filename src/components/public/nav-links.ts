export const primaryNav = [
  { href: "/#events", label: "Upcoming Events" },
  { href: "/guestlist", label: "Guestlist" },
] as const;

export type PrimaryNavItem = (typeof primaryNav)[number];
