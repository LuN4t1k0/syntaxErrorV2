import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, tutorPreguntas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { MISION_ASISTENTE } from "@syntaxerror/ia/tutor";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/tutor/cola", () => ({ encolarTutor: vi.fn(async () => {}) }));
vi.mock("@/lib/tutor/proveedor", async () => {
  const { crearProveedorPrueba } = await import("@syntaxerror/ia/prueba");
  const proveedor = crearProveedorPrueba();
  return { proveedorIA: () => proveedor };
});

vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");

const preguntas = await import("./preguntas/route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { encolarTutor } = await import("@/lib/tutor/cola");
const { db, close } = createTestDb();

const preguntar = (cuerpo: unknown) =>
  preguntas.POST(new Request("http://localhost:3000/api/asistente/preguntas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));
const pregunta = (texto = "¿Qué es un JOIN?") => ({ caso: "demo-motor", pregunta: texto, clientId: "c1" });

async function iniciarSesion(): Promise<string> {
  const [usuario] = await db.insert(users).values({ email: `ana-${crypto.randomUUID()}@correo.cl` }).returning({ id: users.id });
  vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
  return usuario.id;
}

beforeEach(async () => {
  await truncateAll(db);
  vi.clearAllMocks();
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
  await db.insert(casos).values({ slug: "demo-motor", titulo: "Demo", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] });
});
afterAll(() => close());

describe("POST /api/asistente/preguntas", () => {
  it("pide sesión, valida la pregunta y responde 404 si el caso no existe", async () => {
    expect((await preguntar(pregunta())).status).toBe(401);
    await iniciarSesion();
    expect((await preguntar({ ...pregunta(), pregunta: "" })).status).toBe(400);
    expect((await preguntar({ ...pregunta(), caso: "no-existe" })).status).toBe(404);
  });

  it("no exige intentos fallidos: encola la pregunta para el asistente", async () => {
    const userId = await iniciarSesion();
    const respuesta = await preguntar(pregunta());
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toMatchObject({ estado: "en_cola" });
    expect(vi.mocked(encolarTutor).mock.calls[0][0]).toMatchObject({ rol: "asistente", mision: MISION_ASISTENTE });
    const [fila] = await db.select().from(tutorPreguntas);
    expect(fila).toMatchObject({ userId, mision: MISION_ASISTENTE });
  });

  it("desde la pregunta 21 en una hora responde 429", async () => {
    await iniciarSesion();
    for (let numero = 0; numero < 20; numero++) expect((await preguntar(pregunta(`¿Qué es la función número ${numero}?`))).status).toBe(200);
    const limitada = await preguntar(pregunta());
    expect(limitada.status).toBe(429);
    expect(Number(limitada.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});
