// El mapa de una ruta como un `git log --graph`: cada clase es una rama que sale de main y se fusiona en el caso que
// la aplica. Sin imports: este módulo corre en el navegador.

export type PiezaRuta = { slug: string; titulo: string; tipo: "caso" | "clases"; empresa: string; unidades: number };
export type AvanceCaso = { aprobadas: number; completo: boolean };
export type EstadoPieza = "completo" | "en_curso" | "en_revision" | "bloqueado" | "disponible";
export type PiezaMapa = PiezaRuta & { hash: string; numeroCaso: number | null; aprobadas: number; estado: EstadoPieza };
export type Etapa = { rama: string | null; clases: PiezaMapa | null; caso: PiezaMapa | null };
export type ResumenRuta = { leccionesAprobadas: number; lecciones: number; casosCompletos: number; casos: number; completa: boolean };

// Un hash corto y estable para mostrar junto a cada "commit" (FNV-1a de 32 bits).
export function hashCorto(texto: string): string {
  let hash = 0x811c9dc5;
  for (const caracter of texto) {
    hash ^= caracter.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

function rama(slug: string): string {
  return `clases/${slug.replace(/^clases-de-/, "")}`;
}

// Sin avance (sin sesión) todo queda disponible. Con avance, la ruta se recorre en orden: lo completo, después la
// primera pieza sin completar (en curso, o en revisión si es un caso con todas sus misiones y falta el entregable)
// y el resto bloqueado, igual que los requisitos del servidor.
export function armarMapa(piezas: PiezaRuta[], avance: Record<string, AvanceCaso> | null): { etapas: Etapa[]; resumen: ResumenRuta } {
  let actualEncontrada = false;
  let casosAntes = 0;
  const conEstado = piezas.map((pieza): PiezaMapa => {
    const propio = avance?.[pieza.slug];
    const aprobadas = Math.min(propio?.aprobadas ?? 0, pieza.unidades);
    let estado: EstadoPieza = "disponible";
    if (avance) {
      if (propio?.completo) estado = "completo";
      else if (!actualEncontrada) {
        actualEncontrada = true;
        estado = pieza.tipo === "caso" && pieza.unidades > 0 && aprobadas >= pieza.unidades ? "en_revision" : "en_curso";
      } else estado = "bloqueado";
    }
    const numeroCaso = pieza.tipo === "caso" ? casosAntes++ : null;
    return { ...pieza, hash: hashCorto(pieza.slug), numeroCaso, aprobadas, estado };
  });

  const etapas: Etapa[] = [];
  let pendiente: PiezaMapa | null = null;
  for (const pieza of conEstado) {
    if (pieza.tipo === "clases") {
      if (pendiente) etapas.push({ rama: rama(pendiente.slug), clases: pendiente, caso: null });
      pendiente = pieza;
    } else {
      etapas.push({ rama: pendiente ? rama(pendiente.slug) : null, clases: pendiente, caso: pieza });
      pendiente = null;
    }
  }
  if (pendiente) etapas.push({ rama: rama(pendiente.slug), clases: pendiente, caso: null });

  const clases = conEstado.filter((pieza) => pieza.tipo === "clases");
  const casos = conEstado.filter((pieza) => pieza.tipo === "caso");
  return {
    etapas,
    resumen: {
      leccionesAprobadas: clases.reduce((total, pieza) => total + pieza.aprobadas, 0),
      lecciones: clases.reduce((total, pieza) => total + pieza.unidades, 0),
      casosCompletos: casos.filter((pieza) => pieza.estado === "completo").length,
      casos: casos.length,
      completa: conEstado.length > 0 && conEstado.every((pieza) => pieza.estado === "completo"),
    },
  };
}
