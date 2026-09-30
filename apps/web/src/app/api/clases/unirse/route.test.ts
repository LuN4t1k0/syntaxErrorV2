import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clases, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { POST } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

const unirse = (codigo: unknown) =>
  POST(new Request("http://localhost:3000/api/clases/unirse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo }) }));

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("POST /api/clases/unirse", () => {
  it("responde 401 sin sesión, 404 con un código que no existe y 200 con uno válido", async () => {
    expect((await unirse("ABC234")).status).toBe(401);
    const [docente, ana] = await db
      .insert(users)
      .values([{ email: "rosa@correo.cl", role: "teacher" }, { email: `ana-${crypto.randomUUID()}@correo.cl` }])
      .returning({ id: users.id, email: users.email });
    const [ruta] = await db.insert(rutas).values({ slug: "r", titulo: "R", cargo: "A", descripcion: "R" }).returning({ id: rutas.id });
    await db.insert(clases).values({ profesorId: docente.id, rutaId: ruta.id, titulo: "3°A", codigo: "ABC234" });
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: ana.id, email: ana.email, nombre: null, rol: "student" });

    expect((await unirse(123)).status).toBe(400);
    expect((await unirse("ZZZZZZ")).status).toBe(404);
    const respuesta = await unirse("abc 234");
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ estado: "pendiente", clase: "3°A" });
  });
});
