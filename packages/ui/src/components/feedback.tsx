import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export function Feedback({
  tipo,
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { tipo: "success" | "error" }) {
  return (
    <p
      role={tipo === "error" ? "alert" : "status"}
      className={cn(
        "notice",
        tipo === "error" ? "notice-error" : "notice-success",
        className,
      )}
      {...props}
    />
  );
}
