import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { purgarBitacora, purgarPreguntasTutor } from "./mantenimiento";
import { auditLog, casos, tutorPreguntas, users } from "./schema";
import { createTestDb, truncateAll } from "./testing";

const { db, close } = createTestDb();
const CORTE = new Date("2026-01-01T00:00:00Z");
const antes = new Date("2025-06-01T00:00:00Z");
const despues = new Date("2026-06-01T00:00:00Z");

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("mantenimiento", () => {
  it("borra la bitácora anterior al corte, pero nunca los registros ARCO", async () => {
    await db.insert(auditLog).values([
      { action: "login_success", createdAt: antes },
      { action: "role_changed", createdAt: antes },
      { action: "data_exported", createdAt: antes },
      { action: "account_deleted", createdAt: antes },
      { action: "login_success", createdAt: despues },
    ]);
    expect(await purgarBitacora(db, CORTE)).toBe(2);
    expect((await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action).sort()).toEqual([
      "account_deleted",
      "data_exported",
      "login_success",
    ]);
  });

  it("borra las preguntas al tutor anteriores al corte", async () => {
    const [ana] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    const [caso] = await db
      .insert(casos)
      .values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [] })
      .returning({ id: casos.id });
    await db.insert(tutorPreguntas).values([
      { userId: ana.id, casoId: caso.id, mision: "m1", pregunta: "¿Vieja?", estado: "respondida", creadoEn: antes },
      { userId: ana.id, casoId: caso.id, mision: "m1", pregunta: "¿Nueva?", estado: "respondida", creadoEn: despues },
    ]);
    expect(await purgarPreguntasTutor(db, CORTE)).toBe(1);
    expect((await db.select({ pregunta: tutorPreguntas.pregunta }).from(tutorPreguntas)).map((fila) => fila.pregunta)).toEqual(["¿Nueva?"]);
  });
});
