import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));
// Como en producción: la ruta Data Analyst está en beta y sus casos son solo para probadores.
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "false");

const { GET, POST } = await import("./route");
const { POST: SINCRONIZAR } = await import("./sync/route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { db, close } = createTestDb();

const intento = { caso: "clases-de-sql", mision: "01-select-basico", tarea: "select-basico", aprobada: true };
const enviar = (handler: (request: Request) => Promise<Response>, cuerpo: unknown) =>
  handler(new Request("http://localhost:3000/api/progreso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));

beforeEach(async () => {
  await truncateAll(db);
});
afterAll(() => close());

describe("/api/progreso en una ruta beta", () => {
  it("un estudiante recibe 403 al consultar y registrar, y su sincronización se rechaza", async () => {
    const [ana] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(ana.id);
    const consulta = await GET(new Request("http://localhost:3000/api/progreso?caso=clases-de-sql"));
    expect(consulta.status).toBe(403);
    expect(await consulta.json()).toEqual({ error: "solo_probadores" });
    expect((await enviar(POST, intento)).status).toBe(403);
    expect(await (await enviar(SINCRONIZAR, { intentos: [intento] })).json()).toMatchObject({ aplicados: 0, rechazados: 1 });
  });

  it("un probador pasa el control (el caso no está en esta base, así que responde 404 y no 403)", async () => {
    const [beto] = await db.insert(users).values({ email: "beto@correo.cl", probador: true }).returning({ id: users.id });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(beto.id);
    expect((await GET(new Request("http://localhost:3000/api/progreso?caso=clases-de-sql"))).status).toBe(404);
  });
});
