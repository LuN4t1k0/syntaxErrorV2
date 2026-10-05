import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cargarContenido } from "@syntaxerror/content/cargar";
import type { Caso } from "@syntaxerror/content/tipos";
import { casos, tutorPreguntas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { guardarRespuestaEnCache } from "@syntaxerror/db/tutor";
import { crearProveedorPrueba, vectorDePrueba } from "@syntaxerror/ia/prueba";
import { MENSAJE_ERROR_TUTOR, MISION_ASISTENTE, type ProveedorIA } from "@syntaxerror/ia/tutor";
import type { TrabajoTutor } from "@syntaxerror/queue/tutor";
import { consultarPregunta, preguntarAlAsistente, preguntarAlTutor } from "./servicio";

const FIXTURE = fileURLToPath(new URL("../../../../../packages/content/test/fixtures/valido", import.meta.url));
const { db, close } = createTestDb();
const trabajos: TrabajoTutor[] = [];
const encolar = async (trabajo: TrabajoTutor) => void trabajos.push(trabajo);
const proveedor = crearProveedorPrueba();
let caso: Caso;
let userId: string;
let casoId: string;

beforeAll(async () => {
  [caso] = (await cargarContenido(FIXTURE)).casos;
});

beforeEach(async () => {
  await truncateAll(db);
  trabajos.length = 0;
  [{ id: userId }] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
  [{ id: casoId }] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: caso.titulo, cargo: caso.cargo, empresa: caso.empresa, entregable: caso.entregable, misiones: [] })
    .returning({ id: casos.id });
});
afterAll(() => close());

const preguntar = (pregunta: string, deps: { proveedor: ProveedorIA | null; encolar: typeof encolar } = { proveedor, encolar }) =>
  preguntarAlTutor(db, { userId, caso, mision: caso.misiones[0], pregunta, clientId: "c1" }, deps);

describe("preguntarAlTutor", () => {
  it("sin proveedor de IA el tutor no está disponible", async () => {
    expect(await preguntar("¿Cómo filtro?", { proveedor: null, encolar })).toEqual({ estado: "no_disponible" });
  });

  it("encola la pregunta con el contexto de la misión y la deja pendiente", async () => {
    const resultado = await preguntar("¿Cómo filtro por ciudad?");
    expect(resultado).toMatchObject({ estado: "en_cola" });
    expect(trabajos).toHaveLength(1);
    expect(trabajos[0]).toMatchObject({ clientId: "c1", casoId, mision: "01-filtrar", pregunta: "¿Cómo filtro por ciudad?" });
    expect(trabajos[0].contexto).toContain("Misión: Filtrar clientes.");
    expect(trabajos[0].embedding).toHaveLength(768);
    const [fila] = await db.select().from(tutorPreguntas);
    expect(fila).toMatchObject({ estado: "pendiente", respuesta: null });
  });

  it("una pregunta ya respondida en la misión sale de la caché sin encolar", async () => {
    await guardarRespuestaEnCache(db, {
      casoId,
      mision: "01-filtrar",
      pregunta: "¿Cómo filtro por ciudad?",
      respuesta: "Usa WHERE.",
      embedding: vectorDePrueba("¿Cómo filtro por ciudad?"),
    });
    expect(await preguntar("¿cómo filtro por ciudad?")).toMatchObject({ estado: "desde_cache", respuesta: "Usa WHERE." });
    expect(trabajos).toEqual([]);
  });


  it("si no se puede encolar, informa el error", async () => {
    const resultado = await preguntar("¿Cómo filtro?", {
      proveedor,
      encolar: async () => {
        throw new Error("La cola del tutor no responde.");
      },
    });
    expect(resultado).toMatchObject({ estado: "error", respuesta: MENSAJE_ERROR_TUTOR });
    const [fila] = await db.select().from(tutorPreguntas);
    expect(fila.estado).toBe("error");
  });
});

describe("preguntarAlAsistente", () => {
  const preguntarAsistente = (pregunta: string) => preguntarAlAsistente(db, { userId, caso, pregunta, clientId: "c1" }, { proveedor, encolar });

  it("encola con el rol del asistente y el contexto del caso, sin las tareas", async () => {
    expect(await preguntarAsistente("¿Qué es un JOIN?")).toMatchObject({ estado: "en_cola" });
    expect(trabajos[0]).toMatchObject({ rol: "asistente", mision: MISION_ASISTENTE, casoId, pregunta: "¿Qué es un JOIN?" });
    expect(trabajos[0].contexto).toContain("Caso: Ventas de marzo");
    expect(trabajos[0].contexto).not.toContain("Tarea SQL");
    const [fila] = await db.select().from(tutorPreguntas);
    expect(fila).toMatchObject({ mision: MISION_ASISTENTE, estado: "pendiente" });
  });

  it("su caché es aparte: una respuesta del tutor de una misión no le sirve", async () => {
    await guardarRespuestaEnCache(db, { casoId, mision: "01-filtrar", pregunta: "¿Qué es WHERE?", respuesta: "Pista de la misión.", embedding: vectorDePrueba("¿Qué es WHERE?") });
    expect(await preguntarAsistente("¿Qué es WHERE?")).toMatchObject({ estado: "en_cola" });
    await guardarRespuestaEnCache(db, { casoId, mision: MISION_ASISTENTE, pregunta: "¿Qué es WHERE?", respuesta: "WHERE filtra filas.", embedding: vectorDePrueba("¿Qué es WHERE?") });
    expect(await preguntarAsistente("¿qué es WHERE?")).toMatchObject({ estado: "desde_cache", respuesta: "WHERE filtra filas." });
  });
});

describe("consultarPregunta", () => {
  it("devuelve el estado de las preguntas propias y nada de las ajenas", async () => {
    const resultado = await preguntar("¿Cómo filtro?");
    if (resultado.estado !== "en_cola") throw new Error("debía quedar en cola");
    expect(await consultarPregunta(db, userId, resultado.preguntaId)).toEqual({ estado: "pendiente", respuesta: null });
    const [otra] = await db.insert(users).values({ email: "otra@correo.cl" }).returning({ id: users.id });
    expect(await consultarPregunta(db, otra.id, resultado.preguntaId)).toBeNull();
  });
});
