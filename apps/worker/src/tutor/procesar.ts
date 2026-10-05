import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { tutorPreguntas } from "@syntaxerror/db/schema";
import { guardarRespuestaEnCache } from "@syntaxerror/db/tutor";
import { MENSAJE_ERROR_TUTOR, type ProveedorIA } from "@syntaxerror/ia/tutor";
import type { EventoTutor } from "@syntaxerror/queue/eventos";
import type { TrabajoTutor } from "@syntaxerror/queue/tutor";

export type EmisorTutor = (clientId: string, evento: EventoTutor) => void;

export function crearProcesadorTutor({
  db,
  proveedor,
  emitir,
}: {
  db: DbClient;
  proveedor: ProveedorIA;
  emitir: EmisorTutor;
}) {
  return async (job: Job<TrabajoTutor>): Promise<void> => {
    const trabajo = job.data;
    const { aceptada, texto } = await proveedor.responder({ rol: trabajo.rol ?? "tutor", contexto: trabajo.contexto, pregunta: trabajo.pregunta });
    if (aceptada) {
      await guardarRespuestaEnCache(db, {
        casoId: trabajo.casoId,
        mision: trabajo.mision,
        pregunta: trabajo.pregunta,
        respuesta: texto,
        embedding: trabajo.embedding,
      });
    }
    const estado = aceptada ? "respondida" : "fuera_de_tema";
    await db
      .update(tutorPreguntas)
      .set({ respuesta: texto, estado, respondidaEn: new Date() })
      .where(eq(tutorPreguntas.id, trabajo.preguntaId));
    emitir(trabajo.clientId, { preguntaId: trabajo.preguntaId, estado, respuesta: texto });
  };
}

export async function marcarErrorTutor(db: DbClient, emitir: EmisorTutor, trabajo: TrabajoTutor): Promise<void> {
  await db
    .update(tutorPreguntas)
    .set({ respuesta: MENSAJE_ERROR_TUTOR, estado: "error", respondidaEn: new Date() })
    .where(eq(tutorPreguntas.id, trabajo.preguntaId));
  emitir(trabajo.clientId, { preguntaId: trabajo.preguntaId, estado: "error", respuesta: MENSAJE_ERROR_TUTOR });
}
