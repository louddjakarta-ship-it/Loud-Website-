import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "accent" | "outline" | "ghost";
type ButtonSize = "md" | "lg";

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
      className={cn(
        "inline-flex items-center justify-center gap-2 font-mono text-micro uppercase transition-colors duration-200 ease-out-expo disabled:cursor-not-allowed disabled:opacity-40",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
