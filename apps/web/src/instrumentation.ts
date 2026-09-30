import type { Instrumentation } from "next";

// Sin DSN, next.config.ts resuelve @sentry/nextjs a src/lib/sentry-apagado.ts y nada de esto pesa.
export async function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    if (process.env.NEXT_RUNTIME === "nodejs") await import("../sentry.server.config");
    if (process.env.NEXT_RUNTIME === "edge") await import("../sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (...argumentos) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(...argumentos);
  }
};
