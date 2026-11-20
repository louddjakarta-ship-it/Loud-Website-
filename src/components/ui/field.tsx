import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

const controlClasses =
  "block w-full rounded-xl border border-line bg-surface px-4 text-base text-paper outline-none transition-colors duration-200 placeholder:text-muted/70 focus:border-accent aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-60";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-2 block font-mono text-micro uppercase tracking-[0.12em] text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, "h-12", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlClasses, "min-h-28 py-3", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        controlClasses,
        "h-12 cursor-pointer appearance-none bg-[length:0.7rem] bg-[right_1rem_center] bg-no-repeat pr-10",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%238A8A8A' stroke-width='1.5'/%3E%3C/svg%3E\")",
      }}
      {...props}
    />
  );
}

export function FieldError({
  id,
  children,
}: {
  id?: string;
  children?: ReactNode;
}) {
  if (!children) {
    return null;
  }

  return (
    <p
      id={id}
      className="mt-2 font-mono text-[0.7rem] uppercase leading-relaxed tracking-[0.08em] text-danger"
    >
      {children}
    </p>
  );
}

export function FieldHint({
  id,
  children,
}: {
  id?: string;
  children?: ReactNode;
}) {
  if (!children) {
    return null;
  }

  return (
    <p
      id={id}
      className="mt-2 text-sm leading-relaxed text-muted"
    >
      {children}
    </p>
  );
}
