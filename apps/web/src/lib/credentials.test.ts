import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";
import { authorizeCredentials } from "./credentials";
import { getRedis } from "./redis";

const { db, close } = createTestDb();

let counter = 0;
function unique() {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

async function createStudent() {
  const email = `alumna-${unique()}@correo.cl`;
  await registerUser(db, { name: "Ana", email, password: "clave-segura-123" });
  return email;
}

describe("authorizeCredentials", () => {
  beforeEach(() => truncateAll(db));
  afterAll(async () => {
    getRedis().disconnect();
    await close();
  });

  it("devuelve el usuario con su rol cuando la clave es correcta", async () => {
    const email = await createStudent();
    const result = await authorizeCredentials(db, { email: email.toUpperCase(), password: "clave-segura-123", ip: unique() });
    expect(result).toMatchObject({ status: "ok", user: { email, role: "student" } });
  });

  it("los logins exitosos no gastan intentos", async () => {
    const email = await createStudent();
    for (let i = 0; i < 7; i += 1) {
      const result = await authorizeCredentials(db, { email, password: "clave-segura-123", ip: unique() });
      expect(result.status).toBe("ok");
    }
  });

  it("bloquea el email despues de 5 intentos fallidos", async () => {
    const email = await createStudent();
    for (let i = 0; i < 5; i += 1) {
      expect(await authorizeCredentials(db, { email, password: "mala", ip: unique() })).toEqual({ status: "invalid" });
    }
    expect(
      await authorizeCredentials(db, { email, password: "clave-segura-123", ip: unique() })
    ).toEqual({ status: "rate_limited" });
  });

  it("un login exitoso limpia los intentos fallidos previos", async () => {
    const email = await createStudent();
    for (let i = 0; i < 4; i += 1) {
      await authorizeCredentials(db, { email, password: "mala", ip: unique() });
    }
    expect((await authorizeCredentials(db, { email, password: "clave-segura-123", ip: unique() })).status).toBe("ok");
    for (let i = 0; i < 4; i += 1) {
      expect(await authorizeCredentials(db, { email, password: "mala", ip: unique() })).toEqual({ status: "invalid" });
    }
    expect((await authorizeCredentials(db, { email, password: "clave-segura-123", ip: unique() })).status).toBe("ok");
  });

  it("bloquea la IP despues de 10 intentos fallidos, aunque cambie el email", async () => {
    const ip = unique();
    for (let i = 0; i < 10; i += 1) {
      await authorizeCredentials(db, { email: `nadie-${unique()}@correo.cl`, password: "mala", ip });
    }
    const email = await createStudent();
    expect(await authorizeCredentials(db, { email, password: "clave-segura-123", ip })).toEqual({ status: "rate_limited" });
  });
});
