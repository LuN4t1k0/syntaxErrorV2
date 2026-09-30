import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, tutorCache, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));

const { DELETE } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

const borrar = (id: string) => DELETE(new Request(`http://localhost:3000/api/admin/tutor/cache/${id}`, { method: "DELETE" }), { params: Promise.resolve({ id }) });

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("DELETE /api/admin/tutor/cache/[id]", () => {
  it("solo administración borra, una vez; ids inválidos 404", async () => {
    const [caso] = await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [] }).returning({ id: casos.id });
    const [entrada] = await db
      .insert(tutorCache)
      .values({ casoId: caso.id, mision: "m1", pregunta: "¿WHERE?", respuesta: "Filtra.", embedding: Array.from({ length: 768 }, () => 0.1) })
      .returning({ id: tutorCache.id });
    const [admin] = await db.insert(users).values({ email: "admin@correo.cl", role: "admin" }).returning({ id: users.id });

    expect((await borrar(entrada.id)).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: "u1", email: "rosa@correo.cl", nombre: null, rol: "teacher" });
    expect((await borrar(entrada.id)).status).toBe(403);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: admin.id, email: "admin@correo.cl", nombre: null, rol: "admin" });
    expect((await borrar("no-es-uuid")).status).toBe(404);
    expect((await borrar(entrada.id)).status).toBe(200);
    expect((await borrar(entrada.id)).status).toBe(404);
  });
});
