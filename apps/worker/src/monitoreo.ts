import * as Sentry from "@sentry/node";

export const MUESTREO_TRAZAS = 0.1;

export function opcionesSentry(dsn: string | undefined) {
  const limpio = dsn?.trim() || undefined;
  return { dsn: limpio, enabled: Boolean(limpio), tracesSampleRate: MUESTREO_TRAZAS, sendDefaultPii: false as const };
}

export function iniciarMonitoreo(dsn: string | undefined = process.env.SENTRY_DSN): boolean {
  const opciones = opcionesSentry(dsn);
  if (!opciones.enabled) return false;
  Sentry.init(opciones);
  return true;
}

export function reportarError(error: unknown, etiquetas: Record<string, string>): void {
  Sentry.captureException(error, { tags: etiquetas });
}
