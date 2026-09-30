import { opcionesSentry } from "@/lib/monitoreo";

// NEXT_PUBLIC_SENTRY_DSN se reemplaza por su valor en el build: sin DSN esta rama es código muerto
// y webpack ni siquiera incluye el SDK en el navegador.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs").then((Sentry) => Sentry.init(opcionesSentry(process.env.NEXT_PUBLIC_SENTRY_DSN)));
}
