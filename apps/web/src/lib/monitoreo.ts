export const MUESTREO_TRAZAS = 0.1;

// Sin DSN (local, tests) Sentry queda apagado. Nunca envía IP ni cookies.
export function opcionesSentry(dsn: string | undefined) {
  const limpio = dsn?.trim() || undefined;
  return { dsn: limpio, enabled: Boolean(limpio), tracesSampleRate: MUESTREO_TRAZAS, sendDefaultPii: false as const };
}
