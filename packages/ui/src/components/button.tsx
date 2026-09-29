import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "default" | "sm" | "icon";

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
    "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-bold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    {
      "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover":
        variant === "primary",
      "border-border bg-surface text-foreground hover:bg-surface-raised":
        variant === "secondary",
      "border-transparent bg-transparent text-muted-foreground hover:bg-surface-raised hover:text-foreground":
        variant === "ghost",
      "border-transparent bg-destructive text-white hover:bg-red-600":
        variant === "destructive",
      "min-h-10 px-4 py-2": size === "default",
      "min-h-9 px-3": size === "sm",
      "size-10 p-0": size === "icon",
    },
    className
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
