import { and, desc, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { casoInscripciones, casos, misionProgreso } from "@syntaxerror/db/schema";
import { casoPendiente, type OpcionesRequisitos } from "./requisitos";

type CasoCorto = { slug: string; titulo: string };
type MisionCorta = { slug: string; titulo: string };

export type SiguientePaso =
  | { tipo: "mision"; caso: CasoCorto; mision: { slug: string; titulo: string }; href: string }
  | { tipo: "entregable"; caso: CasoCorto; href: string };

// Una ruta no tiene más casos que esto: el tope solo evita un ciclo si el contenido quedara mal armado.
const MAXIMO_REQUISITOS = 50;

// Dentro de un caso: la misión en curso, o la siguiente sin aprobar desde la última que tocaste (dando la vuelta).
function pasoDelCaso(caso: CasoCorto, misiones: MisionCorta[], aprobadas: ReadonlySet<string>, ultima: { mision: string; estado: string } | null): SiguientePaso {
  const indice = ultima ? misiones.findIndex((mision) => mision.slug === ultima.mision) : -1;
  const enCurso = indice >= 0 && ultima?.estado !== "aprobada" ? misiones[indice] : undefined;
  const orden = indice >= 0 ? [...misiones.slice(indice + 1), ...misiones.slice(0, indice + 1)] : misiones;
  const destino = enCurso ?? orden.find((mision) => !aprobadas.has(mision.slug));
  if (destino) return { tipo: "mision", caso, mision: { slug: destino.slug, titulo: destino.titulo }, href: `/casos/${caso.slug}/${destino.slug}` };
  return { tipo: "entregable", caso, href: `/casos/${caso.slug}` };
}

// Con opciones de orden, un caso bloqueado no es el siguiente paso: lo es el caso que lo desbloquea, siguiendo la
// cadena hasta uno abierto (la misma regla que aplica el servidor a las tareas). Sin opciones, no se mira el orden.
export async function siguientePaso(db: AppDb, userId: string, publicados: ReadonlySet<string>, opciones?: OpcionesRequisitos): Promise<SiguientePaso | null> {
  const filas = await db
    .select({
      casoId: casos.id,
      casoSlug: casos.slug,
      casoTitulo: casos.titulo,
      misiones: casos.misiones,
      mision: misionProgreso.mision,
      estado: misionProgreso.estado,
      completadoEn: casoInscripciones.completadoEn,
    })
    .from(misionProgreso)
    .innerJoin(casos, eq(casos.id, misionProgreso.casoId))
    .leftJoin(casoInscripciones, and(eq(casoInscripciones.userId, misionProgreso.userId), eq(casoInscripciones.casoId, misionProgreso.casoId)))
    .where(eq(misionProgreso.userId, userId))
    .orderBy(desc(misionProgreso.actualizadoEn));

  const aprobadasDe = (slug: string) => new Set(filas.filter((fila) => fila.casoSlug === slug && fila.estado === "aprobada").map((fila) => fila.mision));

  const revisados = new Set<string>();
  for (const ultima of filas) {
    if (revisados.has(ultima.casoSlug)) continue;
    revisados.add(ultima.casoSlug);
    if (!publicados.has(ultima.casoSlug) || ultima.completadoEn) continue;

    const bloqueo = opciones ? await casoPendiente(db, userId, ultima.casoId, opciones) : null;
    if (!bloqueo) return pasoDelCaso({ slug: ultima.casoSlug, titulo: ultima.casoTitulo }, ultima.misiones, aprobadasDe(ultima.casoSlug), ultima);
    const abierto = await casoQueDesbloquea(db, userId, bloqueo.slug, opciones!);
    if (abierto && publicados.has(abierto.slug)) {
      const reciente = filas.find((fila) => fila.casoSlug === abierto.slug) ?? null;
      return pasoDelCaso({ slug: abierto.slug, titulo: abierto.titulo }, abierto.misiones, aprobadasDe(abierto.slug), reciente);
    }
  }

  return null;
}

// Sube por los requisitos desde un caso hasta el primero que no tiene otro pendiente antes.
async function casoQueDesbloquea(db: AppDb, userId: string, slug: string, opciones: OpcionesRequisitos) {
  let actual = slug;
  for (let paso = 0; paso < MAXIMO_REQUISITOS; paso += 1) {
    const [caso] = await db.select({ id: casos.id, slug: casos.slug, titulo: casos.titulo, misiones: casos.misiones }).from(casos).where(eq(casos.slug, actual));
    if (!caso) return null;
    const anterior = await casoPendiente(db, userId, caso.id, opciones);
    if (!anterior) return caso;
    actual = anterior.slug;
  }
  return null;
}
