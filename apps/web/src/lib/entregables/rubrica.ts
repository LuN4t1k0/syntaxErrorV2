import { DIMENSIONES, NIVELES, NOMBRES_DIMENSION, PUNTAJE_PARA_APROBAR, PUNTAJES, type Dimension, type Puntaje } from "@syntaxerror/content/rubrica";

export type Puntajes = Partial<Record<Dimension, number>>;
export type Observaciones = Partial<Record<Dimension, string>>;
export type Evaluacion =
  | { ok: true; decision: "aprobado" | "observado"; puntajes: Record<Dimension, Puntaje>; observaciones: Observaciones }
  | { ok: false; motivo: "puntajes_incompletos" | "falta_observacion"; dimension: Dimension };

export const LARGO_MINIMO_OBSERVACION = 10;

const esPuntaje = (valor: unknown): valor is Puntaje => PUNTAJES.includes(valor as Puntaje);

// La regla del equipo (2026-10-02): se aprueba con 2 o más en las tres dimensiones. Con un 1 se piden cambios, y esa
// dimensión necesita un comentario puntual para que la persona sepa qué corregir antes de reenviar.
export function evaluarRubrica(puntajes: Puntajes, observaciones: Observaciones): Evaluacion {
  const completos = {} as Record<Dimension, Puntaje>;
  const limpias: Observaciones = {};
  for (const dimension of DIMENSIONES) {
    const puntaje = puntajes[dimension];
    if (!esPuntaje(puntaje)) return { ok: false, motivo: "puntajes_incompletos", dimension };
    completos[dimension] = puntaje;
    const texto = observaciones[dimension]?.trim();
    if (texto) limpias[dimension] = texto;
    if (puntaje < PUNTAJE_PARA_APROBAR && (texto ?? "").length < LARGO_MINIMO_OBSERVACION) return { ok: false, motivo: "falta_observacion", dimension };
  }
  const aprobado = DIMENSIONES.every((dimension) => completos[dimension] >= PUNTAJE_PARA_APROBAR);
  return { ok: true, decision: aprobado ? "aprobado" : "observado", puntajes: completos, observaciones: limpias };
}

// Lo que recibe la persona cuando se piden cambios: primero las dimensiones por corregir, después el resto de los
// comentarios y al final el comentario general.
export function observacionesParaLaPersona(puntajes: Record<Dimension, Puntaje>, observaciones: Observaciones, comentario: string | null): string[] {
  const ordenadas = [...DIMENSIONES].sort((a, b) => puntajes[a] - puntajes[b]);
  const lineas = ordenadas
    .filter((dimension) => observaciones[dimension])
    .map((dimension) => `${NOMBRES_DIMENSION[dimension]} (${NIVELES[puntajes[dimension]].nombre}): ${observaciones[dimension]}`);
  return comentario ? [...lineas, `Comentario general: ${comentario}`] : lineas;
}
