"use client";

import { ErrorGlitch } from "@/components/error-glitch";

export default function MarketingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorGlitch
      code="500"
      eyebrow="ERROR_500"
      title="La señal se rompió de este lado."
      description="Puedes reintentar la operación o volver al inicio mientras estabilizamos el runtime."
      onReset={reset}
      homeHref="/"
      homeLabel="Volver al inicio"
    />
  );
}
