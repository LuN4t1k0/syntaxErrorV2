import { and, eq } from "drizzle-orm";
import type { Caso, Mision } from "@syntaxerror/content/tipos";
import type { AppDb } from "@syntaxerror/db/client";
import { casos, tutorPreguntas } from "@syntaxerror/db/schema";
import { buscarRespuestaEnCache } from "@syntaxerror/db/tutor";
import {
  esDelTema,
  MENSAJE_ERROR_TUTOR,
  RESPUESTA_FUERA_DE_TEMA,
  TEMAS_DEL_TUTOR,
  type ProveedorIA,
} from "@syntaxerror/ia/tutor";
import type { TrabajoTutor } from "@syntaxerror/queue/tutor";
import { contextoDeMision } from "./contexto";

export type EstadoPregunta = "pendiente" | "respondida" | "desde_cache" | "fuera_de_tema" | "error";

export type ResultadoPregunta =
  | { estado: "no_disponible" }
  | { estado: "en_cola"; preguntaId: string }
  | { estado: "desde_cache" | "fuera_de_tema" | "error"; preguntaId: string; respuesta: string };

type Dependencias = { proveedor: ProveedorIA | null; encolar: (trabajo: TrabajoTutor) => Promise<void> };

const temasPorProveedor = new WeakMap<ProveedorIA, Promise<number[][]>>();

function temasVectorizados(proveedor: ProveedorIA): Promise<number[][]> {
  let temas = temasPorProveedor.get(proveedor);
  if (!temas) {
    temas = Promise.all(TEMAS_DEL_TUTOR.map((tema) => proveedor.vectorizar(tema)));
    temas.catch(() => temasPorProveedor.delete(proveedor));
    temasPorProveedor.set(proveedor, temas);
  }
  return temas;
}

export async function preguntarAlTutor(
  db: AppDb,
  { userId, caso, mision, pregunta, clientId }: { userId: string; caso: Caso; mision: Mision; pregunta: string; clientId: string },
  { proveedor, encolar }: Dependencias
): Promise<ResultadoPregunta> {
  if (!proveedor) return { estado: "no_disponible" };
  const [fila] = await db.select({ id: casos.id }).from(casos).where(eq(casos.slug, caso.slug));
  if (!fila) return { estado: "no_disponible" };

  let embedding: number[];
  try {
    embedding = await proveedor.vectorizar(pregunta);
  } catch (error) {
    console.error("[tutor] no se pudo vectorizar la pregunta", error);
    return { estado: "no_disponible" };
  }

  const registrar = async (estado: EstadoPregunta, respuesta: string | null) => {
    const [nueva] = await db
      .insert(tutorPreguntas)
      .values({ userId, casoId: fila.id, mision: mision.slug, pregunta, respuesta, estado, respondidaEn: respuesta ? new Date() : null })
      .returning({ id: tutorPreguntas.id });
    return nueva.id;
  };

  if (proveedor.nombre === "gemini" && !esDelTema(embedding, await temasVectorizados(proveedor))) {
    return {
      estado: "fuera_de_tema",
      preguntaId: await registrar("fuera_de_tema", RESPUESTA_FUERA_DE_TEMA),
      respuesta: RESPUESTA_FUERA_DE_TEMA,
    };
  }

  const enCache = await buscarRespuestaEnCache(db, { casoId: fila.id, mision: mision.slug, embedding });
  if (enCache) return { estado: "desde_cache", preguntaId: await registrar("desde_cache", enCache), respuesta: enCache };

  const preguntaId = await registrar("pendiente", null);
  try {
    await encolar({ preguntaId, clientId, casoId: fila.id, mision: mision.slug, pregunta, contexto: contextoDeMision(caso, mision), embedding });
  } catch (error) {
    console.error("[tutor] no se pudo encolar la pregunta", error);
    await db
      .update(tutorPreguntas)
      .set({ estado: "error", respuesta: MENSAJE_ERROR_TUTOR, respondidaEn: new Date() })
      .where(eq(tutorPreguntas.id, preguntaId));
    return { estado: "error", preguntaId, respuesta: MENSAJE_ERROR_TUTOR };
  }
  return { estado: "en_cola", preguntaId };
}

export async function consultarPregunta(
  db: AppDb,
  userId: string,
  preguntaId: string
): Promise<{ estado: EstadoPregunta; respuesta: string | null } | null> {
  const [fila] = await db
    .select({ estado: tutorPreguntas.estado, respuesta: tutorPreguntas.respuesta })
    .from(tutorPreguntas)
    .where(and(eq(tutorPreguntas.id, preguntaId), eq(tutorPreguntas.userId, userId)));
  return fila ? { estado: fila.estado as EstadoPregunta, respuesta: fila.respuesta } : null;
}
