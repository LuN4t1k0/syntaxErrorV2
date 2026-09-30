import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, claseInscripciones, rutaCasos, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");

const { POST } = await import("./route");
const casosRuta = await import("./[id]/casos/[caso]/route");
const estudiantesRuta = await import("./[id]/estudiantes/[userId]/route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function persona(email: string, rol: Rol) {
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

async function contenido() {
  const [ruta] = await db
    .insert(rutas)
    .values({ slug: "data-analyst", titulo: "Data Analyst", cargo: "Analista", descripcion: "Ruta" })
    .returning({ id: rutas.id });
  const [caso] = await db
    .insert(casos)
    .values({ slug: "demo-motor", titulo: "Demo", cargo: "A", empresa: "D", entregable: "R", misiones: [] })
    .returning({ id: casos.id });
  await db.insert(rutaCasos).values({ rutaId: ruta.id, casoId: caso.id, orden: 0 });
}

const json = (metodo: string, url: string, cuerpo: unknown) =>
  new Request(`http://localhost:3000${url}`, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
const crear = (cuerpo: unknown) => POST(json("POST", "/api/profesor/clases", cuerpo));

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("API de clases del docente", () => {
  it("sin sesión 401, una cuenta estudiante 403", async () => {
    expect((await crear({ titulo: "3°A", ruta: "data-analyst" })).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("ana@correo.cl", "student"));
    expect((await crear({ titulo: "3°A", ruta: "data-analyst" })).status).toBe(403);
  });

  it("una docente crea la clase con una ruta del catálogo y no con otra", async () => {
    await contenido();
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("rosa@correo.cl", "teacher"));
    expect((await crear({ titulo: "3°A", ruta: "no-existe" })).status).toBe(400);
    expect((await crear({ titulo: "", ruta: "data-analyst" })).status).toBe(400);
    const respuesta = await crear({ titulo: "3°A", ruta: "data-analyst" });
    expect(respuesta.status).toBe(201);
    expect(await respuesta.json()).toEqual({ id: expect.any(String), codigo: expect.stringMatching(/^[A-Z2-9]{6}$/) });
  });

  it("ids inválidos o de otra docente responden 404", async () => {
    await contenido();
    const rosa = await persona("rosa@correo.cl", "teacher");
    const ana = await persona("ana@correo.cl", "student");
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(rosa);
    const { id } = (await (await crear({ titulo: "3°A", ruta: "data-analyst" })).json()) as { id: string };
    await db.insert(claseInscripciones).values({ claseId: id, userId: ana.id });

    const habilitar = (claseId: string, caso: string) =>
      casosRuta.PATCH(json("PATCH", `/api/profesor/clases/${claseId}/casos/${caso}`, { habilitado: false }), { params: Promise.resolve({ id: claseId, caso }) });
    const decidir = (claseId: string, userId: string) =>
      estudiantesRuta.PATCH(json("PATCH", `/api/profesor/clases/${claseId}/estudiantes/${userId}`, { estado: "activa" }), {
        params: Promise.resolve({ id: claseId, userId }),
      });

    expect((await habilitar("no-es-uuid", "demo-motor")).status).toBe(404);
    expect((await decidir(id, "no-es-uuid")).status).toBe(404);
    expect((await habilitar(id, "demo-motor")).status).toBe(200);
    expect((await decidir(id, ana.id)).status).toBe(200);

    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("otra@correo.cl", "teacher"));
    expect((await habilitar(id, "demo-motor")).status).toBe(404);
    expect((await decidir(id, ana.id)).status).toBe(404);
  });
});
