import { afterAll, describe, expect, it, vi } from "vitest";
import { casos, preguntasProfesor, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

// Sin mocks de emails ni avisos: se usan las colas reales contra un Redis que no existe.
process.env.REDIS_URL = "redis://127.0.0.1:6390";
vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));

const preguntas = await import("./route");
const respuesta = await import("../profesor/preguntas/[id]/respuesta/route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

afterAll(() => close());

const json = (url: string, cuerpo: unknown) =>
  new Request(`http://localhost:3000${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });

describe("preguntas a docentes con Redis caído", () => {
  it("preguntar y responder funcionan aunque no se puedan encolar emails ni avisos", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await truncateAll(db);
    const [alumna, admin] = await db
      .insert(users)
      .values([{ email: "ana@correo.cl" }, { email: "admin@correo.cl", role: "admin" }])
      .returning({ id: users.id });
    await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }] });

    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: alumna.id, email: "ana@correo.cl", nombre: null, rol: "student" });
    const creada = await preguntas.POST(json("/api/preguntas-profesor", { caso: "ventas", mision: "m1", texto: "¿Cómo agrupo?" }));
    expect(creada.status).toBe(201);
    const { id } = (await creada.json()) as { id: string };

    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: admin.id, email: "admin@correo.cl", nombre: null, rol: "admin" });
    expect((await respuesta.POST(json(`/api/profesor/preguntas/${id}/respuesta`, { respuesta: "Con GROUP BY." }), { params: Promise.resolve({ id }) })).status).toBe(200);
    expect(await db.select({ estado: preguntasProfesor.estado }).from(preguntasProfesor)).toEqual([{ estado: "respondida" }]);
  }, 30_000);
});
