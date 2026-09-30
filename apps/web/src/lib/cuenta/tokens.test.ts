import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { tokensEmail, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { consumirTokenEmail, crearTokenEmail } from "./tokens";

const { db, close } = createTestDb();

async function crearUsuario(): Promise<string> {
  const [usuario] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
  return usuario.id;
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("tokens de email", () => {
  it("un token se usa una sola vez", async () => {
    const userId = await crearUsuario();
    const token = await crearTokenEmail(db, { userId, tipo: "verificar", email: "ana@correo.cl" });
    expect(await consumirTokenEmail(db, "verificar", token)).toEqual({ ok: true, userId, email: "ana@correo.cl" });
    expect(await consumirTokenEmail(db, "verificar", token)).toEqual({ ok: false, motivo: "invalido" });
  });

  it("guarda solo el hash del token", async () => {
    const userId = await crearUsuario();
    const token = await crearTokenEmail(db, { userId, tipo: "verificar", email: "ana@correo.cl" });
    const [fila] = await db.select().from(tokensEmail);
    expect(fila.tokenHash).not.toBe(token);
    expect(fila.tokenHash).toHaveLength(64);
  });

  it("un token vencido no sirve", async () => {
    const userId = await crearUsuario();
    const token = await crearTokenEmail(db, { userId, tipo: "cambiar", email: "nueva@correo.cl" });
    await db.update(tokensEmail).set({ expiraEn: new Date(Date.now() - 1_000) });
    expect(await consumirTokenEmail(db, "cambiar", token)).toEqual({ ok: false, motivo: "vencido" });
  });

  it("pedir un token nuevo invalida el anterior del mismo tipo", async () => {
    const userId = await crearUsuario();
    const viejo = await crearTokenEmail(db, { userId, tipo: "cambiar", email: "una@correo.cl" });
    await crearTokenEmail(db, { userId, tipo: "cambiar", email: "otra@correo.cl" });
    expect(await consumirTokenEmail(db, "cambiar", viejo)).toEqual({ ok: false, motivo: "invalido" });
  });

  it("un token de verificación no sirve para cambiar el email", async () => {
    const userId = await crearUsuario();
    const token = await crearTokenEmail(db, { userId, tipo: "verificar", email: "ana@correo.cl" });
    expect(await consumirTokenEmail(db, "cambiar", token)).toEqual({ ok: false, motivo: "invalido" });
  });
});
