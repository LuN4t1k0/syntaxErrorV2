import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { crearProcesadorMantenimiento, leerRetencion } from "./procesar";

const { db, close } = createTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("mantenimiento del worker", () => {
  it("lee la retención con un mínimo de 30 días y 365 por defecto", () => {
    expect(leerRetencion(undefined)).toBe(365);
    expect(leerRetencion("")).toBe(365);
    expect(leerRetencion("abc")).toBe(365);
    expect(leerRetencion("0")).toBe(365);
    expect(leerRetencion("-1")).toBe(365);
    expect(leerRetencion("1.5")).toBe(365);
    expect(leerRetencion("5")).toBe(30);
    expect(leerRetencion("90")).toBe(90);
  });

  it("borra lo anterior a la retención contando desde ahora", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const ahora = new Date("2026-09-30T00:00:00Z");
    await db.insert(auditLog).values([
      { action: "login_success", createdAt: new Date("2026-06-01T00:00:00Z") },
      { action: "login_success", createdAt: new Date("2026-09-01T00:00:00Z") },
    ]);
    const limpiar = crearProcesadorMantenimiento({ db, retencionDias: 90, ahora: () => ahora });
    expect(await limpiar()).toEqual({ bitacora: 1, preguntas: 0 });
    expect(await db.select().from(auditLog)).toHaveLength(1);
  });
});
