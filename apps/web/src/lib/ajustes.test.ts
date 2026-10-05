import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ajustes, auditLog, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import { cambiarOrdenLibreParaTodos, ordenLibreParaTodos } from "./ajustes";

const { db, close } = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
});
afterAll(() => close());

describe("orden libre para todos", () => {
  it("parte apagado; un admin lo enciende y lo apaga, y queda en la bitácora", async () => {
    const [admin] = await db.insert(users).values({ email: "admin@correo.cl", role: "admin" }).returning({ id: users.id, email: users.email });
    expect(await ordenLibreParaTodos(db)).toBe(false);

    await cambiarOrdenLibreParaTodos(db, { admin, activo: true }, SIN_META);
    expect(await ordenLibreParaTodos(db)).toBe(true);
    const [fila] = await db.select().from(ajustes);
    expect(fila).toMatchObject({ clave: "orden_libre", valor: true, actualizadoPor: admin.id });

    await cambiarOrdenLibreParaTodos(db, { admin, activo: true }, SIN_META);
    await cambiarOrdenLibreParaTodos(db, { admin, activo: false }, SIN_META);
    expect(await ordenLibreParaTodos(db)).toBe(false);
    // Repetir el mismo valor no deja otra entrada en la bitácora.
    expect((await db.select({ action: auditLog.action, metadata: auditLog.metadata }).from(auditLog)).map((entrada) => [entrada.action, entrada.metadata])).toEqual([
      ["setting_changed", { clave: "orden_libre", anterior: false, nuevo: true }],
      ["setting_changed", { clave: "orden_libre", anterior: true, nuevo: false }],
    ]);
  });
});
