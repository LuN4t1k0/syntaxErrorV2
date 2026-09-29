import type { LabelHTMLAttributes } from "react";
import { cn } from "../cn";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("grid gap-2 text-sm font-bold text-foreground", className)}
      {...props}
    />
  );
}
