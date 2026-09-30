import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, preguntasProfesor, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));
vi.mock("@/lib/avisos", () => ({ avisarSinFallar: vi.fn(async () => {}) }));

const preguntas = await import("./route");
const respuesta = await import("../profesor/preguntas/[id]/respuesta/route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function persona(rol: Rol) {
  const email = `${rol}-${crypto.randomUUID()}@correo.cl`;
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

const json = (url: string, cuerpo: unknown) =>
  new Request(`http://localhost:3000${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
const preguntar = (cuerpo: unknown) => preguntas.POST(json("/api/preguntas-profesor", cuerpo));
const responder = (id: string, cuerpo: unknown) =>
  respuesta.POST(json(`/api/profesor/preguntas/${id}/respuesta`, cuerpo), { params: Promise.resolve({ id }) });
const valida = { caso: "ventas", mision: "m1", texto: "¿Cómo agrupo por mes?" };

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
  await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }] });
});
afterAll(() => close());

describe("API de preguntas a docentes", () => {
  it("preguntar: 401 sin sesión, 400 inválida, 404 misión ajena, 201 y 429 desde la sexta en una hora", async () => {
    expect((await preguntar(valida)).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("student"));
    expect((await preguntar({ ...valida, texto: "?" })).status).toBe(400);
    expect((await preguntar({ ...valida, mision: "m9" })).status).toBe(404);
    for (let vez = 0; vez < 3; vez++) expect((await preguntar(valida)).status).toBe(201);
    expect((await preguntar(valida)).status).toBe(429);
  });

  it("responder: 403 a estudiantes, 404 a ids inválidos o respondidos, 200 a administración", async () => {
    const alumna = await persona("student");
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(alumna);
    const { id } = (await (await preguntar(valida)).json()) as { id: string };

    expect((await responder(id, { respuesta: "Hola" })).status).toBe(403);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("admin"));
    expect((await responder("no-es-uuid", { respuesta: "Hola" })).status).toBe(404);
    expect((await responder(id, { respuesta: "" })).status).toBe(400);
    expect((await responder(id, { respuesta: "Usa date_trunc." })).status).toBe(200);
    expect((await responder(id, { respuesta: "Otra vez" })).status).toBe(404);
    const [fila] = await db.select().from(preguntasProfesor);
    expect(fila).toMatchObject({ estado: "respondida", respuesta: "Usa date_trunc." });
  });

  it("una docente sin la pregunta asignada recibe 403", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("student"));
    const { id } = (await (await preguntar(valida)).json()) as { id: string };
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("teacher"));
    expect((await responder(id, { respuesta: "Hola" })).status).toBe(403);
  });
});
