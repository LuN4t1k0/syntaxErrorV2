import { and, eq } from "drizzle-orm";
import type { Caso, Mision } from "@syntaxerror/content/tipos";
import type { AppDb } from "@syntaxerror/db/client";
import { casos, tutorPreguntas } from "@syntaxerror/db/schema";
import { buscarRespuestaEnCache } from "@syntaxerror/db/tutor";
import { MENSAJE_ERROR_TUTOR, type ProveedorIA } from "@syntaxerror/ia/tutor";
import type { TrabajoTutor } from "@syntaxerror/queue/tutor";
import { contextoDeMision } from "./contexto";

export type EstadoPregunta = "pendiente" | "respondida" | "desde_cache" | "fuera_de_tema" | "error";

export type ResultadoPregunta =
  | { estado: "no_disponible" }
  | { estado: "en_cola"; preguntaId: string }
  | { estado: "desde_cache" | "fuera_de_tema" | "error"; preguntaId: string; respuesta: string };

type Dependencias = { proveedor: ProveedorIA | null; encolar: (trabajo: TrabajoTutor) => Promise<void> };

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

  // Lo fuera de tema lo decide el modelo con las instrucciones del tutor. El filtro por embeddings
  // de la v1 no separaba (medido con Gemini: se superponían preguntas legítimas y ajenas) y
  // arriesgaba bloquear dudas válidas. El costo lo contienen el límite por usuario y la caché.
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
