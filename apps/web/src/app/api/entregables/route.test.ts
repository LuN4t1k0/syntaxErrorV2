import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, entregables, misionProgreso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");
vi.stubEnv("ENTREGABLES_VERIFICACION", "prueba");

const { POST } = await import("./route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { db, close } = createTestDb();

const MISIONES = ["01-clientes-de-regiones", "02-total-de-ventas", "03-ticket-promedio"];

function enviar(cuerpo: unknown) {
  return POST(new Request("http://localhost:3000/api/entregables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));
}

async function iniciarSesion({ aprobarTodo }: { aprobarTodo: boolean }) {
  const [usuario] = await db.insert(users).values({ email: `alumna-${crypto.randomUUID()}@correo.cl` }).returning({ id: users.id });
  const [caso] = await db.select({ id: casos.id }).from(casos);
  if (aprobarTodo) {
    await db.insert(misionProgreso).values(MISIONES.map((mision) => ({ userId: usuario.id, casoId: caso.id, mision, estado: "aprobada" as const })));
  }
  vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
}

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
  await db.insert(casos).values({
    slug: "demo-motor",
    titulo: "Demo",
    cargo: "Analista",
    empresa: "Distribuidora",
    entregable: "Repositorio",
    misiones: MISIONES.map((slug) => ({ slug, titulo: slug, tareas: ["t"] })),
  });
});
afterAll(() => close());

describe("POST /api/entregables", () => {
  it("responde 401 sin sesión y 400 si no es un repositorio de GitHub", async () => {
    expect((await enviar({ caso: "demo-motor", url: "https://github.com/ana/demo" })).status).toBe(401);
    await iniciarSesion({ aprobarTodo: true });
    expect((await enviar({ caso: "demo-motor", url: "https://gitlab.com/ana/demo" })).status).toBe(400);
    expect((await enviar({ caso: "demo-motor", url: "mi repo" })).status).toBe(400);
  });

  it("responde 409 si faltan misiones y 404 si el caso no existe", async () => {
    await iniciarSesion({ aprobarTodo: false });
    const respuesta = await enviar({ caso: "demo-motor", url: "https://github.com/ana/demo" });
    expect(respuesta.status).toBe(409);
    expect(await respuesta.json()).toEqual({ error: "misiones_pendientes" });
    expect((await enviar({ caso: "otro", url: "https://github.com/ana/demo" })).status).toBe(404);
  });

  it("verificado, queda en revisión; si la verificación falla responde 422 con los problemas", async () => {
    await iniciarSesion({ aprobarTodo: true });
    const vacio = await enviar({ caso: "demo-motor", url: "https://github.com/ana/repo-vacio" });
    expect(vacio.status).toBe(422);
    expect(await vacio.json()).toEqual({ error: "no_verificado", problemas: ["Falta el README en la carpeta principal del repositorio."], reintentable: false });
    const respuesta = await enviar({ caso: "demo-motor", url: "https://github.com/ana/demo" });
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ estado: "en_revision" });
    const [fila] = await db.select().from(entregables);
    expect(fila).toMatchObject({ url: "https://github.com/ana/demo", estado: "pendiente" });
  });
});
