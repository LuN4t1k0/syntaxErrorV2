import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { accesoBeta, exigirAccesoBeta } from "./beta";

// Como en producción: sin borradores a la vista, la ruta Data Analyst (en beta) queda solo para probadores.
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "false");

const { db, close } = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
});
afterAll(() => close());

describe("acceso a las rutas en beta", () => {
  it("solo probadores y admins; el resto recibe 403 en un caso que solo está en una ruta beta", async () => {
    const [estudiante, probador, admin] = await db
      .insert(users)
      .values([{ email: "ana@correo.cl" }, { email: "beto@correo.cl", probador: true }, { email: "admin@correo.cl", role: "admin" }])
      .returning({ id: users.id });
    expect(await accesoBeta(db, estudiante.id)).toBe(false);
    expect(await accesoBeta(db, probador.id)).toBe(true);
    expect(await accesoBeta(db, admin.id)).toBe(true);

    const bloqueo = await exigirAccesoBeta(db, estudiante.id, "clases-de-sql");
    expect(bloqueo?.status).toBe(403);
    expect(await bloqueo?.json()).toEqual({ error: "ruta_no_disponible" });
    expect(await exigirAccesoBeta(db, probador.id, "clases-de-sql")).toBeNull();
    expect(await exigirAccesoBeta(db, admin.id, "clases-de-sql")).toBeNull();
  });

  it("con los borradores a la vista (desarrollo y e2e) no se bloquea a nadie", async () => {
    vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");
    const [estudiante] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    expect(await exigirAccesoBeta(db, estudiante.id, "clases-de-sql")).toBeNull();
    vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "false");
  });
});
