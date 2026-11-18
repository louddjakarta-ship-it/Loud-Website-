"use client";

import { useState } from "react";

/**
 * Copies a private guestlist link. The full URL is shown in the edit page and
 * only the button is shown in dense tables.
 */
export function CopyGuestlistLink({
  url,
  label = "Copy guestlist link",
  className,
}: {
  url: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this guestlist link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={
        className ??
        "border border-line px-2.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-accent hover:text-accent"
      }
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
