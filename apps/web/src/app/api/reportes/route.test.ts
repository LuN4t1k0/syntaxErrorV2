import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { reportes, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { POST } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

const reportar = (cuerpo: unknown) =>
  POST(new Request("http://localhost:3000/api/reportes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));
const valido = { tipo: "sugerencia", descripcion: "Me gustaría un caso de retail.", pagina: "/rutas" };

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

async function iniciarSesion() {
  const [persona] = await db.insert(users).values({ email: `ana-${crypto.randomUUID()}@correo.cl` }).returning({ id: users.id, email: users.email });
  vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: persona.id, email: persona.email, nombre: null, rol: "student" });
}

describe("POST /api/reportes", () => {
  it("sin sesión responde 401 y con datos inválidos 400", async () => {
    expect((await reportar(valido)).status).toBe(401);
    await iniciarSesion();
    expect((await reportar({ ...valido, descripcion: "corto" })).status).toBe(400);
    expect((await reportar({ ...valido, pagina: "https://otro.sitio" })).status).toBe(400);
  });

  it("guarda el reporte y desde el sexto en una hora responde 429", async () => {
    await iniciarSesion();
    for (let intento = 0; intento < 5; intento++) expect((await reportar(valido)).status).toBe(201);
    expect((await reportar(valido)).status).toBe(429);
    expect(await db.select().from(reportes)).toHaveLength(5);
  });
});
