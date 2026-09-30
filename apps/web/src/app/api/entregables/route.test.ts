import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, misionProgreso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

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
    expect(await respuesta.json()).toEqual({ casoCompleto: false, certificados: [] });
  });

  it("responde 404 si el caso no existe", async () => {
    expect((await enviar({ caso: "otro", url: "https://github.com/alumna/ventas" })).status).toBe(404);
  });

  it("al completar el caso responde con su certificado", async () => {
    const [usuario] = await db.select().from(users);
    const [caso] = await db.select().from(casos);
    await db.insert(misionProgreso).values({
      userId: usuario.id,
      casoId: caso.id,
      mision: "m1",
      estado: "aprobada",
      tareasAprobadas: ["t1"],
    });
    const respuesta = await enviar({ caso: "ventas", url: "https://github.com/alumna/ventas" });
    const cuerpo = await respuesta.json();
    expect(cuerpo.casoCompleto).toBe(true);
    expect(cuerpo.certificados).toEqual([{ codigo: expect.any(String), tipo: "caso", titulo: "Ventas" }]);
  });
});
