"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] render failed", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl border border-danger/50 bg-danger/5 p-6 sm:p-10">
      <p className="font-mono text-micro uppercase tracking-[0.12em] text-danger">
        Admin error
      </p>

      <h1 className="mt-3 font-display text-h1 uppercase">
        Something broke.
      </h1>

      <p className="mt-4 text-base leading-relaxed text-muted">
        The admin page could not be rendered. Try again, or go back to the
        dashboard. The internal error has been logged without guestlist data.
      </p>

      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center border border-accent bg-accent px-5 font-mono text-micro uppercase tracking-[0.12em] text-ink transition-colors hover:bg-paper"
        >
          Try again
        </button>
        <Link
          href="/admin"
          className="inline-flex h-11 items-center border border-line px-5 font-mono text-micro uppercase tracking-[0.12em] text-paper transition-colors hover:border-accent hover:text-accent"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
