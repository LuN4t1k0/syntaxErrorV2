// Reemplaza a @sentry/nextjs cuando no hay DSN (ver el alias en next.config.ts). Sin DSN no hay nada
// que reportar, y el SDK real sumaba ~850 módulos a cada compilación del servidor de desarrollo.
export function init(): void {}
export function captureException(): void {}
export function captureRequestError(): void {}
