// Umbrales de la ayuda escalonada (propuesta pedagógica, sección 6), acordados por el equipo el 2026-10-02.
// Un intento fallido es un resultado incorrecto: un error de código (que no corre) se explica al instante y no cuenta.
export const INTENTOS_PARA_PISTA = 2;
export const INTENTOS_PARA_TUTOR = 5;

// La primera pista llega tras INTENTOS_PARA_PISTA fallidos; después, una más por cada intento fallido.
export function pistasDisponibles(fallidos: number, total: number): number {
  if (fallidos < INTENTOS_PARA_PISTA) return 0;
  return Math.min(total, fallidos - INTENTOS_PARA_PISTA + 1);
}

export function tutorHabilitado({ fallidos, aprobada }: { fallidos: number; aprobada: boolean }): boolean {
  return aprobada || fallidos >= INTENTOS_PARA_TUTOR;
}
