import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mensajes, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));

const { PATCH } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

const marcar = (id: string) => PATCH(new Request(`http://localhost:3000/api/mensajes/${id}`, { method: "PATCH" }), { params: Promise.resolve({ id }) });

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("PATCH /api/mensajes/[id]", () => {
  it("marca como leído un mensaje propio y responde 404 para uno ajeno o un id inválido", async () => {
    const [ana, otra] = await db.insert(users).values([{ email: "ana@correo.cl" }, { email: "otra@correo.cl" }]).returning({ id: users.id });
    const [mensaje] = await db.insert(mensajes).values({ userId: ana.id, asunto: "Hola", cuerpo: "Hola" }).returning({ id: mensajes.id });

    expect((await marcar(mensaje.id)).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: otra.id, email: "otra@correo.cl", nombre: null, rol: "student" });
    expect((await marcar(mensaje.id)).status).toBe(404);
    expect((await marcar("no-es-un-uuid")).status).toBe(404);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue({ id: ana.id, email: "ana@correo.cl", nombre: null, rol: "student" });
    expect((await marcar(mensaje.id)).status).toBe(200);
  });
});
