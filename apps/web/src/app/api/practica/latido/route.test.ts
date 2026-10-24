import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { tiempoPractica, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));

const { POST } = await import("./route");
const { obtenerUsuarioId } = await import("@/lib/sesion");

const { db, close } = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await close();
});

describe("POST /api/practica/latido", () => {
  it("sin sesión no registra nada", async () => {
    vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
    const respuesta = await POST();
    expect(respuesta.status).toBe(401);
  });

  it("cuenta el primer latido y descarta uno repetido de inmediato", async () => {
    const [usuario] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
    expect(await (await POST()).json()).toEqual({ contado: true });
    expect(await (await POST()).json()).toEqual({ contado: false });
    const [fila] = await db.select().from(tiempoPractica);
    expect(fila.minutos).toBe(1);
  });
});
