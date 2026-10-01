import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Mision } from "@syntaxerror/content/tipos";
import { casos, entregables, transaccionesPuntos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { recalcularCaso, registrarIntento } from "@/lib/progreso/servicio";
import { obtenerNivel, responderDecision } from "./servicio";

const { db, close } = createTestDb();

const MISION: Mision = {
  slug: "m1",
  titulo: "M1",
  tiempo: 10,
  fuente: "",
  bloques: [
    {
      tipo: "Decision",
      texto: null,
      props: {
        pregunta: "¿Qué haces si falta un dato?",
        opciones: [
          { texto: "Pregunto a quien pidió el reporte", correcta: true, porque: "Aclara el criterio." },
          { texto: "Invento un criterio", correcta: false, porque: "Nadie puede revisarlo." },
        ],
      },
    },
  ],
  sinGuia: false,
} as Mision;

async function preparar(): Promise<string> {
  const [usuario] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
  await db.insert(casos).values({
    slug: "ventas",
    titulo: "Ventas",
    cargo: "Analista",
    empresa: "Distribuidora",
    entregable: "Repo",
    misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }],
  });
  return usuario.id;
}

const aprobar = (userId: string) => registrarIntento(db, userId, { caso: "ventas", mision: "m1", tarea: "t1", aprobada: true });

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("puntos por progreso", () => {
  it("aprobar una misión suma 10 puntos una sola vez", async () => {
    const userId = await preparar();
    await aprobar(userId);
    await aprobar(userId);
    expect(await obtenerNivel(db, userId)).toEqual({ puntos: 10, nivel: 1, faltan: 90 });
  });

  it("completar el caso suma 50 más, una sola vez", async () => {
    const userId = await preparar();
    await aprobar(userId);
    const [caso] = await db.select({ id: casos.id }).from(casos);
    await db.insert(entregables).values({ userId, casoId: caso.id, url: "https://github.com/ana/ventas", estado: "aprobado" });
    await recalcularCaso(db, userId, "ventas");
    await recalcularCaso(db, userId, "ventas");
    expect((await obtenerNivel(db, userId)).puntos).toBe(60);
  });

  it("un intento fallido no suma", async () => {
    const userId = await preparar();
    await registrarIntento(db, userId, { caso: "ventas", mision: "m1", tarea: "t1", aprobada: false });
    expect((await obtenerNivel(db, userId)).puntos).toBe(0);
  });
});

describe("responderDecision", () => {
  const responder = (userId: string, opcion: string, pregunta = "¿Qué haces si falta un dato?") =>
    responderDecision(db, userId, { casoSlug: "ventas", mision: MISION, pregunta, opcion });

  it("la opción correcta suma 5 puntos la primera vez y nada después", async () => {
    const userId = await preparar();
    expect(await responder(userId, "Pregunto a quien pidió el reporte")).toEqual({ estado: "registrada", correcta: true, puntos: 5 });
    expect(await responder(userId, "Pregunto a quien pidió el reporte")).toEqual({ estado: "registrada", correcta: true, puntos: 0 });
    expect((await obtenerNivel(db, userId)).puntos).toBe(5);
  });

  it("si la primera respuesta es incorrecta, acertar después no suma", async () => {
    const userId = await preparar();
    expect(await responder(userId, "Invento un criterio")).toEqual({ estado: "registrada", correcta: false, puntos: 0 });
    expect(await responder(userId, "Pregunto a quien pidió el reporte")).toEqual({ estado: "registrada", correcta: true, puntos: 0 });
    expect(await db.select().from(transaccionesPuntos)).toHaveLength(1);
  });

  it("una decisión u opción que no está en la misión no registra nada", async () => {
    const userId = await preparar();
    expect(await responder(userId, "Pregunto a quien pidió el reporte", "¿Otra pregunta?")).toEqual({ estado: "decision_no_existe" });
    expect(await responder(userId, "Una opción inventada")).toEqual({ estado: "decision_no_existe" });
    expect(await db.select().from(transaccionesPuntos)).toEqual([]);
  });
});
