import { rutaUsable, type EstadoRuta } from "@syntaxerror/content/publicacion";

type RutaCorta = { slug: string; titulo: string; estadoVigente: EstadoRuta; casos: string[] };

// Qué muestra la tarjeta "Continuar" del panel (spec 2026-10-06, sección 4):
// - paso: hay una misión o lección pendiente; va con la ruta que la contiene y su avance.
// - empezar: eligió ruta pero no empezó.
// - pausa: su ruta ya no está disponible (el admin la cerró).
// - elegir: no tiene ruta ni avance; el panel muestra el selector.
export type EstadoContinuar =
  | { tipo: "paso"; ruta: { slug: string; titulo: string; completos: number; total: number } | null }
  | { tipo: "empezar"; ruta: RutaCorta }
  | { tipo: "pausa"; ruta: RutaCorta }
  | { tipo: "elegir" };

export function estadoContinuar({
  casoPendiente,
  elegida,
  rutas,
  completosPorRuta,
  puedeBeta,
  todoVisible,
}: {
  casoPendiente: string | null;
  elegida: RutaCorta | null;
  rutas: RutaCorta[];
  completosPorRuta: ReadonlyMap<string, number>;
  puedeBeta: boolean;
  todoVisible: boolean;
}): EstadoContinuar {
  const usable = (ruta: RutaCorta) => todoVisible || rutaUsable(ruta.estadoVigente, puedeBeta);
  if (casoPendiente) {
    const candidatas = [...(elegida ? [elegida] : []), ...rutas].filter((ruta) => usable(ruta) && ruta.casos.includes(casoPendiente));
    const ruta = candidatas[0];
    return {
      tipo: "paso",
      ruta: ruta ? { slug: ruta.slug, titulo: ruta.titulo, completos: completosPorRuta.get(ruta.slug) ?? 0, total: ruta.casos.length } : null,
    };
  }
  if (elegida) return usable(elegida) ? { tipo: "empezar", ruta: elegida } : { tipo: "pausa", ruta: elegida };
  const disponibles = rutas.filter(usable);
  if (disponibles.length === 1) return { tipo: "empezar", ruta: disponibles[0] };
  return { tipo: "elegir" };
}
