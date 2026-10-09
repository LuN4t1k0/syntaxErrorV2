import Link from "next/link";

export function SiteBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="site-brand" aria-label="syntaxError, inicio">
      <span className="site-brand__icon" aria-hidden="true">
        {"{}"}
      </span>
      <span className={compact ? "hidden sm:inline" : undefined}>
        syntaxError<span className="text-accent">.cl</span>
      </span>
    </Link>
  );
}
