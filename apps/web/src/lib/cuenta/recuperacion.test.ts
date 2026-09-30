import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, tokensEmail, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";
import type { Encolar } from "@/lib/emails";
import { verifyPassword } from "@/lib/password";
import { SIN_META } from "./meta";
import { restablecerClave, solicitarRecuperacion } from "./recuperacion";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);
const deps = { encolar, meta: SIN_META };

function tokenDe(trabajo: TrabajoEmail | undefined): string {
  if (!trabajo || !("enlace" in trabajo)) throw new Error("El email no tiene enlace");
  return new URL(trabajo.enlace).searchParams.get("token") ?? "";
}

async function claveDe(email: string) {
  const [usuario] = await db.select().from(users).where(eq(users.email, email));
  return usuario.passwordHash;
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("recuperar la contraseña", () => {
  it("envía un enlace que deja entrar con la contraseña nueva, avisa y deja registro", async () => {
    await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    await solicitarRecuperacion(db, " ANA@Correo.cl ", encolar);
    expect(enviados[0]).toMatchObject({ tipo: "recuperar-clave", para: "ana@correo.cl", nombre: "Ana" });
    expect("enlace" in enviados[0] && enviados[0].enlace).toContain("/restablecer-clave?token=");

    expect(await restablecerClave(db, tokenDe(enviados[0]), "nueva-clave-789", deps)).toEqual({ ok: true, email: "ana@correo.cl" });
    expect(await verifyPassword("nueva-clave-789", (await claveDe("ana@correo.cl"))!)).toBe(true);
    expect(enviados[1]).toEqual({ tipo: "clave-cambiada", para: "ana@correo.cl", nombre: "Ana" });
    expect((await db.select().from(auditLog)).map((fila) => fila.action)).toEqual(["password_reset"]);
  });

  it("no envía nada ni falla si el email no tiene cuenta", async () => {
    await expect(solicitarRecuperacion(db, "nadie@correo.cl", encolar)).resolves.toBeUndefined();
    expect(enviados).toEqual([]);
  });

  it("el enlace sirve una sola vez y vence", async () => {
    await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    await solicitarRecuperacion(db, "ana@correo.cl", encolar);
    const token = tokenDe(enviados[0]);
    await restablecerClave(db, token, "nueva-clave-789", deps);
    expect(await restablecerClave(db, token, "otra-clave-000", deps)).toEqual({ ok: false, motivo: "invalido" });

    await solicitarRecuperacion(db, "ana@correo.cl", encolar);
    await db.update(tokensEmail).set({ expiraEn: new Date(Date.now() - 1_000) });
    expect(await restablecerClave(db, tokenDe(enviados.at(-1)), "otra-clave-000", deps)).toEqual({ ok: false, motivo: "vencido" });
  });

  it("un enlace viejo no sirve si la cuenta cambió de email", async () => {
    const { id } = await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    await solicitarRecuperacion(db, "ana@correo.cl", encolar);
    await db.update(users).set({ email: "otra@correo.cl" }).where(eq(users.id, id));
    expect(await restablecerClave(db, tokenDe(enviados[0]), "nueva-clave-789", deps)).toEqual({ ok: false, motivo: "invalido" });
    expect(await verifyPassword("clave-segura-123", (await claveDe("otra@correo.cl"))!)).toBe(true);
  });

  it("una cuenta de Google puede crear su contraseña así", async () => {
    await db.insert(users).values({ email: "google@correo.cl", name: "Gabriela" });
    await solicitarRecuperacion(db, "google@correo.cl", encolar);
    expect(await restablecerClave(db, tokenDe(enviados[0]), "nueva-clave-789", deps)).toMatchObject({ ok: true });
    expect(await claveDe("google@correo.cl")).not.toBeNull();
  });
});
