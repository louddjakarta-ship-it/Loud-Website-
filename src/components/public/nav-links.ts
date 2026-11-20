export const primaryNav = [
  { href: "/#events", label: "Upcoming Events" },
  { href: "/#djs", label: "DJs" },
  { href: "/#gallery", label: "Gallery" },
] as const;

export type PrimaryNavItem = (typeof primaryNav)[number];
