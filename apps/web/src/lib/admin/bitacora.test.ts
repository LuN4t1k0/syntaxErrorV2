import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { auditLog } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { listarBitacora } from "./bitacora";

const { db, close } = createTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("listarBitacora", () => {
  it("lista lo más reciente primero y filtra por acción y por email, con % literal", async () => {
    await db.insert(auditLog).values([
      { actorEmail: "ana@correo.cl", action: "login_success", createdAt: new Date("2026-09-30T10:00:00Z") },
      { actorEmail: "admin@correo.cl", action: "role_changed", targetType: "user", metadata: { rolNuevo: "teacher" }, ipAddress: "10.0.0.1", createdAt: new Date("2026-09-30T11:00:00Z") },
      { actorEmail: "100%@correo.cl", action: "login_failed", createdAt: new Date("2026-09-30T12:00:00Z") },
    ]);

    const todo = await listarBitacora(db, { pagina: 1 });
    expect(todo.total).toBe(3);
    expect(todo.filas[0].accion).toBe("login_failed");
    expect(await listarBitacora(db, { accion: "role_changed", pagina: 1 })).toMatchObject({
      total: 1,
      filas: [{ accion: "role_changed", actorEmail: "admin@correo.cl", destino: "user", metadata: { rolNuevo: "teacher" }, ip: "10.0.0.1" }],
    });
    expect((await listarBitacora(db, { email: "ANA", pagina: 1 })).filas.map((fila) => fila.actorEmail)).toEqual(["ana@correo.cl"]);
    expect((await listarBitacora(db, { email: "%", pagina: 1 })).filas.map((fila) => fila.actorEmail)).toEqual(["100%@correo.cl"]);
  });
});
