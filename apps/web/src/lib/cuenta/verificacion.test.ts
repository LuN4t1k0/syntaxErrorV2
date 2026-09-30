import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";
import type { Encolar } from "@/lib/emails";
import { SIN_META } from "./meta";
import { confirmarVerificacion, enviarVerificacion, necesitaVerificar, reenviarVerificacion } from "./verificacion";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);

function tokenDe(trabajo: TrabajoEmail): string {
  if (!("enlace" in trabajo)) throw new Error(`El email ${trabajo.tipo} no tiene enlace`);
  return new URL(trabajo.enlace).searchParams.get("token") ?? "";
}

async function alumna() {
  const { id, email } = await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
  return { id, email, name: "Ana" };
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("verificación del email", () => {
  it("envía un enlace que confirma la cuenta y deja registro en la bitácora", async () => {
    const usuario = await alumna();
    await enviarVerificacion(db, usuario, encolar);
    expect(enviados[0]).toMatchObject({ tipo: "verificar-email", para: "ana@correo.cl", nombre: "Ana" });
    expect("enlace" in enviados[0] && enviados[0].enlace).toContain("/verificar-email?token=");
    expect(await necesitaVerificar(db, usuario.id)).toBe(true);

    expect(await confirmarVerificacion(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: true });
    expect(await necesitaVerificar(db, usuario.id)).toBe(false);
    const [registro] = await db.select().from(auditLog);
    expect(registro).toMatchObject({ action: "email_verified", actorId: usuario.id });
  });

  it("el mismo enlace no sirve dos veces", async () => {
    const usuario = await alumna();
    await enviarVerificacion(db, usuario, encolar);
    await confirmarVerificacion(db, tokenDe(enviados[0]), SIN_META);
    expect(await confirmarVerificacion(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: false, motivo: "invalido" });
  });

  it("un enlace viejo no confirma un email que la cuenta ya no tiene", async () => {
    const usuario = await alumna();
    await enviarVerificacion(db, usuario, encolar);
    await db.update(users).set({ email: "otra@correo.cl" }).where(eq(users.id, usuario.id));
    expect(await confirmarVerificacion(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: false, motivo: "invalido" });
    expect(await necesitaVerificar(db, usuario.id)).toBe(true);
  });

  it("reenviar no manda nada si el email ya está confirmado", async () => {
    const usuario = await alumna();
    await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, usuario.id));
    expect(await reenviarVerificacion(db, usuario.id, encolar)).toBe("ya_verificado");
    expect(enviados).toEqual([]);
  });

  it("las cuentas sin contraseña (Google) no necesitan verificar", async () => {
    const [google] = await db.insert(users).values({ email: "google@correo.cl" }).returning({ id: users.id });
    expect(await necesitaVerificar(db, google.id)).toBe(false);
  });
});
