import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "accent" | "outline" | "ghost";
export type ButtonSize = "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  accent: "bg-accent text-ink hover:bg-paper",
  outline:
    "border border-line text-paper hover:border-accent hover:text-accent",
  ghost: "text-muted hover:text-paper",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-11 px-5",
  lg: "h-13 px-7",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-mono text-micro uppercase tracking-[0.12em] transition-colors duration-200 ease-out-expo disabled:cursor-not-allowed disabled:opacity-40";

export function buttonClassName({
  variant = "accent",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "accent",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}

export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({
  className,
  variant = "accent",
  size = "md",
  ...props
}: ButtonLinkProps) {
  return (
    <a className={buttonClassName({ variant, size, className })} {...props} />
  );
}
