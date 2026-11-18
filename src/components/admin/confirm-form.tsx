"use client";

import type { ReactNode } from "react";

export function ConfirmForm({
  action,
  message,
  messages,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** Confirmation text used when no per-submitter message matches. */
  message?: string;
  /**
   * Optional per-button confirmation text keyed by the submit button's
   * `value`. Lets one form confirm "Approve" and "Reject" differently.
   */
  messages?: Record<string, string>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter as
          | HTMLButtonElement
          | null;
        const text = (submitter?.value && messages?.[submitter.value]) || message;

        if (text && !window.confirm(text)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </form>
  );
}
