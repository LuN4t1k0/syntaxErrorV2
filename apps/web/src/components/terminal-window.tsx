import type { ReactNode } from "react";

export function TerminalWindow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-3 border-b border-border bg-surface-raised px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-3 rounded-full bg-[#ff5f56]" />
          <span className="size-3 rounded-full bg-[#ffbd2e]" />
          <span className="size-3 rounded-full bg-[#27c93f]" />
        </div>
        <span className="font-mono text-xs text-muted-foreground">{title}</span>
      </div>
      <div className="bg-surface px-6 py-8 sm:px-10 sm:py-12">{children}</div>
    </div>
  );
}
