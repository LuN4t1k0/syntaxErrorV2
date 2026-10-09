import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "default" | "sm" | "icon" | "form" | "promo";

export function buttonVariants({
  variant = "primary",
  size = "default",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(
    "btn",
    {
      "btn-primary": variant === "primary",
      "btn-secondary": variant === "secondary",
      "btn-ghost": variant === "ghost",
      "btn-destructive": variant === "destructive",
      "btn-form": size === "form",
      "btn-promo": size === "promo",
      "min-h-10 px-4 py-2": size === "default",
      "min-h-9 px-3": size === "sm",
      "size-10 p-0": size === "icon",
    },
    className,
  );
}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
