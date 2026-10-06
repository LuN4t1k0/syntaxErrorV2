import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clases, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));

const { PATCH } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function persona(email: string, rol: Rol) {
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

const cambiar = (id: string, cuerpo: unknown) =>
  PATCH(new Request(`http://localhost:3000/api/profesor/clases/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }), {
    params: Promise.resolve({ id }),
  });

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("PATCH /api/profesor/clases/[id]", () => {
  it("la docente archiva y restaura su clase; otra docente recibe 404 y sin sesión 401", async () => {
    const rosa = await persona("rosa@correo.cl", "teacher");
    const otra = await persona("otra@correo.cl", "teacher");
    const [ruta] = await db.insert(rutas).values({ slug: "r", titulo: "R", cargo: "A", descripcion: "R" }).returning({ id: rutas.id });
    const [clase] = await db.insert(clases).values({ profesorId: rosa.id, rutaId: ruta.id, titulo: "3°A", codigo: "ABC234" }).returning({ id: clases.id });
    const estado = async () => (await db.select({ estado: clases.estado }).from(clases).where(eq(clases.id, clase.id)))[0].estado;

    expect((await cambiar(clase.id, { estado: "archivada" })).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(otra);
    expect((await cambiar(clase.id, { estado: "archivada" })).status).toBe(404);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(rosa);
    expect((await cambiar(clase.id, { estado: "borrada" })).status).toBe(400);
    expect((await cambiar(clase.id, { estado: "archivada" })).status).toBe(200);
    expect(await estado()).toBe("archivada");
    expect((await cambiar(clase.id, { estado: "activa" })).status).toBe(200);
    expect(await estado()).toBe("activa");
  });
});
