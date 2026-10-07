import { eq, sql } from "drizzle-orm";
import { getDb, type AppDb, type DbClient } from "@syntaxerror/db/client";
import { casos, casoInscripciones, rutaCasos, rutas, users } from "@syntaxerror/db/schema";
import { estadoVigenteRuta, rutaUsable, type EstadoRuta, type RutaConEstado } from "@syntaxerror/content/publicacion";
import { casosSoloParaProbadores, obtenerContenido, incluirBorradores } from "@/lib/contenido";
import { accesoBeta } from "@/lib/beta";

export const ESTADOS_ADMIN_RUTA = ["publicada", "beta", "filtrada", "oculta"] as const;
export type EstadoAdminRuta = (typeof ESTADOS_ADMIN_RUTA)[number];

type EstadoDb = {
  slug: string;
  id: string;
  estadoAdmin: string | null;
  estadoCambiadoPor: string | null;
  estadoCambiadoEn: Date | null;
  estadoCambiadoPorEmail: string | null;
};

// Lo que cambió el admin. Se lee en cada pedido, sin caché: son pocas filas, y con unstable_cache + revalidateTag la
// primera página después de un cambio todavía podía mostrar el estado anterior.
async function filasEstadoRutas(): Promise<EstadoDb[]> {
  const db = getDb();
  return db
    .select({
      slug: rutas.slug,
      id: rutas.id,
      estadoAdmin: rutas.estadoAdmin,
      estadoCambiadoPor: rutas.estadoCambiadoPor,
      estadoCambiadoEn: rutas.estadoCambiadoEn,
      estadoCambiadoPorEmail: users.email,
    })
    .from(rutas)
    .leftJoin(users, eq(users.id, rutas.estadoCambiadoPor));
}

export function esEstadoAdminRuta(valor: unknown): valor is EstadoAdminRuta {
  return typeof valor === "string" && (ESTADOS_ADMIN_RUTA as readonly string[]).includes(valor);
}

// Lo que agrega la base: el id y quién cambió el estado.
export type RutaCatalogo = RutaConEstado & {
  id?: string;
  estadoCambiadoPor: string | null;
  estadoCambiadoPorEmail: string | null;
  estadoCambiadoEn: Date | null;
};

export async function listarRutasConEstado(): Promise<RutaCatalogo[]> {
  const [contenido, filas] = await Promise.all([obtenerContenido(), filasEstadoRutas()]);
  const porSlug = new Map(filas.map((fila) => [fila.slug, fila]));
  return contenido.rutas.map((ruta) => {
    const fila = porSlug.get(ruta.slug);
    const estadoAdmin = esEstadoAdminRuta(fila?.estadoAdmin) ? fila.estadoAdmin : null;
    return {
      ...ruta,
      id: fila?.id,
      estadoAdmin,
      estadoVigente: estadoVigenteRuta({ estado: ruta.estado, estadoAdmin }),
      estadoCambiadoPor: fila?.estadoCambiadoPor ?? null,
      estadoCambiadoPorEmail: fila?.estadoCambiadoPorEmail ?? null,
      estadoCambiadoEn: fila?.estadoCambiadoEn ?? null,
    };
  });
}

export async function rutasParaSelector(accesoBetaUsuario: boolean): Promise<RutaCatalogo[]> {
  const rutasConEstado = await listarRutasConEstado();
  return rutasConEstado.filter((ruta) => {
    if (incluirBorradores()) return true;
    if (ruta.estado === "borrador" || ruta.estadoVigente === "borrador" || ruta.estadoVigente === "oculta") return false;
    if (ruta.estadoVigente === "beta") return accesoBetaUsuario;
    return ruta.estadoVigente === "publicada" || ruta.estadoVigente === "filtrada";
  });
}

export async function rutaDisponibleParaUsuario(db: DbClient, userId: string | null, slug: string): Promise<RutaCatalogo | null> {
  const puedeBeta = userId ? await accesoBeta(db, userId) : false;
  const ruta = (await listarRutasConEstado()).find((candidata) => candidata.slug === slug);
  if (!ruta?.id) return null;
  if (incluirBorradores()) return ruta;
  return rutaUsable(ruta.estadoVigente, puedeBeta) ? ruta : null;
}

// Sin ruta (`explorar` en la terminal) solo se marca la bienvenida: la ruta elegida antes se conserva. La bienvenida
// guarda la primera vez que se vio; volver a verla no la cambia.
export async function guardarRutaElegida(db: AppDb, userId: string, slug: string | null, marcarBienvenida: boolean): Promise<"ok" | "no_disponible"> {
  const ruta = slug ? await rutaDisponibleParaUsuario(db, userId, slug) : null;
  if (slug && !ruta?.id) return "no_disponible";
  const datos = {
    updatedAt: new Date(),
    ...(ruta?.id ? { rutaElegida: ruta.id } : {}),
    ...(marcarBienvenida ? { bienvenidaVistaEn: sql`coalesce(${users.bienvenidaVistaEn}, now())` } : {}),
  };
  await db
    .update(users)
    .set(datos)
    .where(eq(users.id, userId));
  return "ok";
}

// Las rutas sobre las que un docente arma una clase: las que tienen casos y puede usar (en desarrollo, todas con casos).
export async function rutasParaClases(db: DbClient, userId: string): Promise<RutaCatalogo[]> {
  const puedeBeta = await accesoBeta(db, userId);
  return (await listarRutasConEstado()).filter((ruta) => ruta.casos.length > 0 && mapaVisible(ruta.estadoVigente, puedeBeta, incluirBorradores()));
}

// El mapa de una ruta: en desarrollo y e2e se ven todas; en producción, solo las que la persona puede usar.
export function mapaVisible(estado: EstadoRuta, puedeBeta: boolean, todoVisible: boolean): boolean {
  return todoVisible || rutaUsable(estado, puedeBeta);
}

export async function puedeUsarCaso(db: DbClient, userId: string, casoSlug: string): Promise<boolean> {
  if (incluirBorradores()) return true;
  const puedeBeta = await accesoBeta(db, userId);
  const filas = await db
    .select({ estado: rutas.estado, estadoAdmin: rutas.estadoAdmin })
    .from(casos)
    .innerJoin(rutaCasos, eq(rutaCasos.casoId, casos.id))
    .innerJoin(rutas, eq(rutas.id, rutaCasos.rutaId))
    .where(eq(casos.slug, casoSlug));
  if (filas.length === 0) {
    const soloBetaContenido = await casosSoloParaProbadores();
    return soloBetaContenido.has(casoSlug) ? puedeBeta : true;
  }
  return filas.some((fila) => {
    const estado = estadoVigenteRuta({ estado: fila.estado as RutaConEstado["estado"], estadoAdmin: esEstadoAdminRuta(fila.estadoAdmin) ? fila.estadoAdmin : null });
    return rutaUsable(estado, puedeBeta);
  });
}

export async function progresoPorRuta(db: DbClient, userId: string): Promise<Map<string, { completos: number; iniciados: number }>> {
  const filas = await db
    .select({ rutaSlug: rutas.slug, casoId: rutaCasos.casoId, completadoEn: casoInscripciones.completadoEn })
    .from(casoInscripciones)
    .innerJoin(rutaCasos, eq(rutaCasos.casoId, casoInscripciones.casoId))
    .innerJoin(rutas, eq(rutas.id, rutaCasos.rutaId))
    .where(eq(casoInscripciones.userId, userId));
  const mapa = new Map<string, { completos: number; iniciados: number }>();
  for (const fila of filas) {
    const actual = mapa.get(fila.rutaSlug) ?? { completos: 0, iniciados: 0 };
    actual.iniciados += 1;
    if (fila.completadoEn) actual.completos += 1;
    mapa.set(fila.rutaSlug, actual);
  }
  return mapa;
}
