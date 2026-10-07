import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sincronizarContenido } from "@syntaxerror/content/sincronizar";
import { rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { obtenerContenido } from "@/lib/contenido";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "false");

const { POST } = await import("./route");
const { PUT } = await import("../ruta/route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

const pedir = (handler: typeof POST, metodo: string, cuerpo: unknown) =>
  handler(new Request("http://localhost:3000/api/cuenta", { method: metodo, headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" }, body: JSON.stringify(cuerpo) }) as never);

async function probadora() {
  const [fila] = await db.insert(users).values({ email: "beto@correo.cl", probador: true }).returning({ id: users.id });
  vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: fila.id, email: "beto@correo.cl", nombre: null, rol: "student" });
  return fila.id;
}

const cuenta = async (id: string) => (await db.select().from(users).where(eq(users.id, id)))[0];

beforeEach(async () => {
  await truncateAll(db);
  await sincronizarContenido(db, await obtenerContenido());
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("POST /api/cuenta/bienvenida y PUT /api/cuenta/ruta", () => {
  it("piden sesión y datos válidos", async () => {
    expect((await pedir(POST, "POST", { ruta: null })).status).toBe(401);
    expect((await pedir(PUT, "PUT", { ruta: "data-analyst" })).status).toBe(401);
    await probadora();
    expect((await pedir(POST, "POST", { ruta: "Data Analyst" })).status).toBe(400);
    expect((await pedir(PUT, "PUT", { ruta: null })).status).toBe(400);
  });

  it("la bienvenida guarda la ruta elegida; explorar solo marca que la vio", async () => {
    const id = await probadora();
    expect((await pedir(POST, "POST", { ruta: null })).status).toBe(200);
    expect(await cuenta(id)).toMatchObject({ rutaElegida: null, bienvenidaVistaEn: expect.any(Date) });

    expect((await pedir(POST, "POST", { ruta: "data-analyst" })).status).toBe(200);
    const [ruta] = await db.select({ id: rutas.id }).from(rutas).where(eq(rutas.slug, "data-analyst"));
    expect((await cuenta(id)).rutaElegida).toBe(ruta.id);

    const filtrada = await pedir(POST, "POST", { ruta: "ciberseguridad" });
    expect(filtrada.status).toBe(400);
    expect(await filtrada.json()).toEqual({ error: "ruta_no_disponible" });
    expect((await cuenta(id)).rutaElegida).toBe(ruta.id);
  });

  it("cambiar de ruta desde /rutas también marca la bienvenida, para que no aparezca después", async () => {
    const id = await probadora();
    expect((await pedir(PUT, "PUT", { ruta: "data-analyst" })).status).toBe(200);
    expect(await cuenta(id)).toMatchObject({ bienvenidaVistaEn: expect.any(Date), rutaElegida: expect.any(String) });
  });
});
