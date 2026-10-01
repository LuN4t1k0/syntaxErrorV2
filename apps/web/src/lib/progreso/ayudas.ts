// Umbrales de la ayuda escalonada (propuesta pedagógica, sección 6). El equipo los ajusta aquí.
export const INTENTOS_PARA_PISTA = 2;
export const INTENTOS_PARA_TUTOR = 3;
export const INTENTOS_PARA_TUTOR_SIN_GUIA = 5;

// La primera pista llega tras INTENTOS_PARA_PISTA fallidos; después, una más por cada intento fallido.
export function pistasDisponibles(fallidos: number, total: number): number {
  if (fallidos < INTENTOS_PARA_PISTA) return 0;
  return Math.min(total, fallidos - INTENTOS_PARA_PISTA + 1);
}

export function umbralTutor(sinGuia: boolean): number {
  return sinGuia ? INTENTOS_PARA_TUTOR_SIN_GUIA : INTENTOS_PARA_TUTOR;
}

export function tutorHabilitado({ fallidos, aprobada, sinGuia }: { fallidos: number; aprobada: boolean; sinGuia: boolean }): boolean {
  return aprobada || fallidos >= umbralTutor(sinGuia);
}
