import type { Job } from "bullmq";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos, tutorCache, tutorPreguntas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { crearProveedorPrueba } from "@syntaxerror/ia/prueba";
import { MENSAJE_ERROR_TUTOR, RESPUESTA_FUERA_DE_TEMA, type ProveedorIA } from "@syntaxerror/ia/tutor";
import type { EventoTutor } from "@syntaxerror/queue/eventos";
import type { TrabajoTutor } from "@syntaxerror/queue/tutor";
import { crearProcesadorTutor, marcarErrorTutor, type EmisorTutor } from "./procesar";

const { db, close } = createTestDb();
const emitidos: Array<[string, EventoTutor]> = [];
const emitir: EmisorTutor = (clientId, evento) => void emitidos.push([clientId, evento]);

async function preparar(): Promise<TrabajoTutor> {
  const [usuario] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
  const [caso] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
    .returning({ id: casos.id });
  const [pregunta] = await db
    .insert(tutorPreguntas)
    .values({ userId: usuario.id, casoId: caso.id, mision: "m1", pregunta: "¿Cómo filtro?", estado: "pendiente" })
    .returning({ id: tutorPreguntas.id });
  return {
    preguntaId: pregunta.id,
    clientId: "c1",
    casoId: caso.id,
    mision: "m1",
    pregunta: "¿Cómo filtro?",
    contexto: "Misión: Filtrar clientes.",
    embedding: new Array(768).fill(0).map((_, indice) => (indice === 0 ? 1 : 0)),
  };
}

const job = (data: TrabajoTutor) => ({ data }) as Job<TrabajoTutor>;

beforeEach(async () => {
  await truncateAll(db);
  emitidos.length = 0;
});
afterAll(() => close());

describe("crearProcesadorTutor", () => {
  it("responde, guarda en caché, marca la pregunta y avisa al navegador", async () => {
    const trabajo = await preparar();
    await crearProcesadorTutor({ db, proveedor: crearProveedorPrueba(), emitir })(job(trabajo));

    const [pregunta] = await db.select().from(tutorPreguntas).where(eq(tutorPreguntas.id, trabajo.preguntaId));
    expect(pregunta.estado).toBe("respondida");
    expect(pregunta.respuesta).toContain('misión "Filtrar clientes"');
    expect(pregunta.respondidaEn).toBeInstanceOf(Date);
    expect(await db.select().from(tutorCache)).toHaveLength(1);
    expect(emitidos).toEqual([["c1", { preguntaId: trabajo.preguntaId, estado: "respondida", respuesta: pregunta.respuesta! }]]);
  });

  it("una pregunta fuera de tema no se guarda en caché", async () => {
    const trabajo = await preparar();
    const fueraDeTema: ProveedorIA = {
      nombre: "prueba",
      vectorizar: async () => [],
      responder: async () => ({ aceptada: false, texto: RESPUESTA_FUERA_DE_TEMA }),
    };
    await crearProcesadorTutor({ db, proveedor: fueraDeTema, emitir })(job(trabajo));
    expect(await db.select().from(tutorCache)).toEqual([]);
    expect(emitidos[0][1].estado).toBe("fuera_de_tema");
  });

  it("una pregunta del asistente se responde con el rol del asistente", async () => {
    const trabajo = { ...(await preparar()), rol: "asistente" as const, mision: "@asistente", contexto: "Caso: Ventas (Distribuidora)." };
    await crearProcesadorTutor({ db, proveedor: crearProveedorPrueba(), emitir })(job(trabajo));
    const [pregunta] = await db.select().from(tutorPreguntas).where(eq(tutorPreguntas.id, trabajo.preguntaId));
    expect(pregunta.respuesta).toBe('Respuesta de prueba del asistente para el caso "Ventas": ¿Cómo filtro?');
    const [enCache] = await db.select().from(tutorCache);
    expect(enCache.mision).toBe("@asistente");
  });

  it("si la IA falla, el error sube para que BullMQ reintente y la pregunta sigue pendiente", async () => {
    const trabajo = await preparar();
    const caida: ProveedorIA = {
      nombre: "prueba",
      vectorizar: async () => [],
      responder: async () => {
        throw new Error("503 de Gemini");
      },
    };
    await expect(crearProcesadorTutor({ db, proveedor: caida, emitir })(job(trabajo))).rejects.toThrow("503 de Gemini");
    const [pregunta] = await db.select().from(tutorPreguntas);
    expect(pregunta.estado).toBe("pendiente");
    expect(emitidos).toEqual([]);
  });

  it("marcarErrorTutor deja un mensaje claro y avisa", async () => {
    const trabajo = await preparar();
    await marcarErrorTutor(db, emitir, trabajo);
    const [pregunta] = await db.select().from(tutorPreguntas);
    expect(pregunta).toMatchObject({ estado: "error", respuesta: MENSAJE_ERROR_TUTOR });
    expect(emitidos[0][1]).toEqual({ preguntaId: trabajo.preguntaId, estado: "error", respuesta: MENSAJE_ERROR_TUTOR });
  });
});
