import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

// Como en producción: la ruta Data Analyst está en beta, así que un estudiante no tiene acceso a ella.
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "false");

const { GET } = await import("./route");
const { POST } = await import("../route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { db, close } = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("GET /api/progreso/resumen", () => {
  it("sin sesión responde 401", async () => {
    expect((await GET()).status).toBe(401);
  });

  it("devuelve el avance de cada caso que la persona empezó, por slug", async () => {
    const [usuario] = await db.insert(users).values({ email: "alumna@correo.cl" }).returning({ id: users.id });
    await db.insert(casos).values({
      slug: "ventas",
      titulo: "Ventas",
      cargo: "Analista junior",
      empresa: "Distribuidora",
      entregable: "Repositorio",
      misiones: [
        { slug: "m1", titulo: "M1", tareas: ["t1"] },
        { slug: "m2", titulo: "M2", tareas: ["t2"] },
      ],
    });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
    expect(await (await GET()).json()).toEqual({ casos: {}, ordenLibre: false, accesoBeta: false });

    const aprobar = { caso: "ventas", mision: "m1", tarea: "t1", aprobada: true };
    await POST(new Request("http://localhost:3000/api/progreso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(aprobar) }));
    const respuesta = await GET();
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    expect(await respuesta.json()).toEqual({ casos: { ventas: { aprobadas: 1, completo: false } }, ordenLibre: false, accesoBeta: false });
  });

  it("avisa si la persona tiene el orden libre y acceso a las rutas en beta (probador)", async () => {
    const [probador] = await db.insert(users).values({ email: "probador@correo.cl", probador: true }).returning({ id: users.id });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(probador.id);
    expect(await (await GET()).json()).toEqual({ casos: {}, ordenLibre: true, accesoBeta: true });
  });
});
