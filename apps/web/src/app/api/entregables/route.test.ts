import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));

const { POST } = await import("./route");
const { obtenerUsuarioId } = await import("@/lib/sesion");

const { db, close } = createTestDb();

function enviar(cuerpo: unknown) {
  return POST(
    new Request("http://localhost:3000/api/entregables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  );
}

beforeEach(async () => {
  await truncateAll(db);
  const [usuario] = await db.insert(users).values({ email: "alumna@correo.cl" }).returning({ id: users.id });
  await db.insert(casos).values({
    slug: "ventas",
    titulo: "Ventas",
    cargo: "Analista junior",
    empresa: "Distribuidora",
    entregable: "Repositorio",
    misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }],
  });
  vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
});
afterAll(() => close());

describe("POST /api/entregables", () => {
  it("responde 401 sin sesión", async () => {
    vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
    expect((await enviar({ caso: "ventas", url: "https://github.com/alumna/ventas" })).status).toBe(401);
  });

  it("rechaza enlaces que no son https", async () => {
    expect((await enviar({ caso: "ventas", url: "http://github.com/alumna/ventas" })).status).toBe(400);
    expect((await enviar({ caso: "ventas", url: "mi repo" })).status).toBe(400);
  });

  it("guarda el entregable", async () => {
    const respuesta = await enviar({ caso: "ventas", url: "https://github.com/alumna/ventas" });
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ casoCompleto: false });
  });

  it("responde 404 si el caso no existe", async () => {
    expect((await enviar({ caso: "otro", url: "https://github.com/alumna/ventas" })).status).toBe(404);
  });
});
