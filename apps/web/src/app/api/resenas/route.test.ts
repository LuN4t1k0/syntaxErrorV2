import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casoInscripciones, casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { GET, POST } = await import("./route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function alumnaQueCompleto(): Promise<string> {
  const [alumna] = await db.insert(users).values({ email: "ana@correo.cl", name: "Ana" }).returning({ id: users.id });
  const [caso] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
    .returning({ id: casos.id });
  await db.insert(casoInscripciones).values({ userId: alumna.id, casoId: caso.id, completadoEn: new Date() });
  return alumna.id;
}

const consultar = (caso: string) => GET(new Request(`http://localhost:3000/api/resenas?caso=${caso}`));
const publicar = (cuerpo: unknown) =>
  POST(new Request("http://localhost:3000/api/resenas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("/api/resenas", () => {
  it("GET es público y dice si la persona puede reseñar", async () => {
    const id = await alumnaQueCompleto();
    expect(await (await consultar("ventas")).json()).toEqual({ promedio: 0, cantidad: 0, comentarios: [], mia: { estado: "sin_sesion" } });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(id);
    expect((await (await consultar("ventas")).json()).mia).toEqual({ estado: "puede_resenar" });
    expect((await consultar("otro")).status).toBe(404);
    expect((await GET(new Request("http://localhost:3000/api/resenas"))).status).toBe(400);
  });

  it("POST publica una reseña y la segunda responde 409", async () => {
    expect((await publicar({ caso: "ventas", estrellas: 5 })).status).toBe(401);
    vi.mocked(obtenerUsuarioId).mockResolvedValue(await alumnaQueCompleto());
    expect((await publicar({ caso: "ventas", estrellas: 6 })).status).toBe(400);
    expect((await publicar({ caso: "ventas", estrellas: 4.5 })).status).toBe(400);
    expect((await publicar({ caso: "otro", estrellas: 5 })).status).toBe(404);
    expect((await publicar({ caso: "ventas", estrellas: 5, comentario: "Buenísimo" })).status).toBe(201);
    expect((await publicar({ caso: "ventas", estrellas: 3 })).status).toBe(409);
  });

  it("POST sin completar el caso responde 403", async () => {
    const [persona] = await db.insert(users).values({ email: "b@correo.cl" }).returning({ id: users.id });
    await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "D", entregable: "R", misiones: [] });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(persona.id);
    expect((await publicar({ caso: "ventas", estrellas: 5 })).status).toBe(403);
  });
});
