import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { buttonVariants } from "@syntaxerror/ui/components/button";

export function ErrorGlitch({
  code,
  eyebrow,
  title,
  description,
  onReset,
  homeHref,
  homeLabel,
  secondaryHref,
  secondaryLabel,
}: {
  code: "404" | "500";
  eyebrow: string;
  title: string;
  description: string;
  onReset?: () => void;
  homeHref: string;
  homeLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <main className="page-container py-12 sm:py-16">
      <section className="error-glitch-shell">
        <div className="error-glitch-copy">
          <p className="section-kicker">{eyebrow}</p>
          <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {onReset ? (
              <button
                type="button"
                onClick={onReset}
                className={buttonVariants()}
              >
                <RotateCcw size={16} />
                Reintentar
              </button>
            ) : null}
            <Link
              href={homeHref}
              className={buttonVariants({
                variant: onReset ? "secondary" : "primary",
              })}
            >
              <Home size={16} />
              {homeLabel}
            </Link>
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className={buttonVariants({ variant: "secondary" })}
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="error-glitch-code" aria-hidden="true">
          <span className="error-glitch-status">
            {code === "500" ? "runtime_fault" : "route_not_found"}
          </span>
          <span className="typographic-glitch error-glitch-number" data-text={code}>
            {code}
          </span>
          <span className="error-glitch-trace">
            {code === "500"
              ? "./syntax-error/runtime: exception_captured"
              : "./syntax-error/router: unresolved_segment"}
          </span>
          <span className="error-glitch-cursor">
            {code === "500" ? "stabilize_signal()" : "recover_path()"}
            <AlertTriangle size={16} />
          </span>
        </div>
      </section>
    </main>
  );
}
