"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Sin DSN el SDK no se carga: ver src/instrumentation.ts.
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) void import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui", padding: "3rem", background: "#0a0a0a", color: "#fafafa" }}>
        <h1>syntaxError: algo se rompió</h1>
        <p>Recarga la página. Si el problema sigue, vuelve a intentarlo en unos minutos.</p>
        <button type="button" onClick={() => reset()}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
