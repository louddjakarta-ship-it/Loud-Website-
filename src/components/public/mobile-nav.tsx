"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { PrimaryNavItem } from "./nav-links";

type MobileNavProps = {
  links: readonly PrimaryNavItem[];
  instagramUrl: string | null;
  whatsappUrl: string | null;
};

export function MobileNav({
  links,
  instagramUrl,
  whatsappUrl,
}: MobileNavProps) {
  const [openPath, setOpenPath] = useState<string | null>(null);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const open = openPath === pathname;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPath(null);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const container = overlayRef.current;

      if (!container) {
        return;
      }

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        ),
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    setOpenPath(null);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpenPath(pathname)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label="Open menu"
        className="flex h-11 w-11 items-center justify-center border border-line text-paper transition-colors hover:border-accent hover:text-accent md:hidden"
      >
        <span aria-hidden="true" className="flex flex-col gap-1.5">
          <span className="block h-px w-5 bg-current" />
          <span className="block h-px w-5 bg-current" />
        </span>
      </button>

      {open ? (
        <div
          ref={overlayRef}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-50 flex flex-col bg-ink md:hidden"
        >
          <div className="shell flex h-16 items-center justify-between border-b border-line">
            <span className="font-display text-xl uppercase tracking-tight">
              LOUD JAKARTA
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="flex h-11 w-11 items-center justify-center border border-line text-paper transition-colors hover:border-accent hover:text-accent"
            >
              <span aria-hidden="true" className="relative block h-4 w-4">
                <span className="absolute left-0 top-1/2 block h-px w-4 -translate-y-1/2 rotate-45 bg-current" />
                <span className="absolute left-0 top-1/2 block h-px w-4 -translate-y-1/2 -rotate-45 bg-current" />
              </span>
            </button>
          </div>

          <nav
            aria-label="Primary"
            className="shell flex flex-1 flex-col justify-center gap-2 py-10"
          >
            {links.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="group flex items-baseline gap-4 border-b border-line py-4"
              >
                <span className="font-mono text-micro text-accent">
                  0{index + 1}
                </span>
                <span className="font-display text-h1 uppercase transition-colors group-hover:text-accent">
                  {link.label}
                </span>
              </Link>
            ))}

            {instagramUrl ? (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="group flex items-baseline gap-4 border-b border-line py-4"
              >
                <span className="font-mono text-micro text-accent">0{links.length + 1}</span>
                <span className="font-display text-h1 uppercase transition-colors group-hover:text-accent">
                  Instagram
                </span>
              </a>
            ) : (
              <span className="flex items-baseline gap-4 border-b border-line py-4 text-muted">
                <span className="font-mono text-micro text-muted">0{links.length + 1}</span>
                <span className="font-display text-h1 uppercase">
                  Instagram
                  <span className="ml-3 align-middle font-mono text-micro normal-case tracking-[0.12em] text-muted">
                    soon
                  </span>
                </span>
              </span>
            )}
          </nav>

          <div className="shell border-t border-line py-6">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-micro uppercase tracking-[0.12em] text-accent"
              >
                WhatsApp us
              </a>
            ) : (
              <p className="font-mono text-micro uppercase tracking-[0.12em] text-muted">
                WhatsApp contact coming soon
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
