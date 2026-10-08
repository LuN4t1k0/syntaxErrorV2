import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { POST } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { encolarEmail } = await import("@/lib/emails");
const { db, close } = createTestDb();

async function persona(email: string, rol: Rol) {
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

const pedir = (id: string, cuerpo: unknown) =>
  POST(new Request(`http://localhost:3000/api/admin/usuarios/${id}/avance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }), { params: Promise.resolve({ id }) });

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
  vi.mocked(encolarEmail).mockReset().mockResolvedValue(undefined);
});
afterAll(() => close());

describe("POST /api/admin/usuarios/[id]/avance", () => {
  it("sin sesión 401; alumno o docente 403", async () => {
    const ana = await persona("ana@correo.cl", "student");
    expect((await pedir(ana.id, {})).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("rosa@correo.cl", "teacher"));
    expect((await pedir(ana.id, {})).status).toBe(403);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(ana);
    expect((await pedir(ana.id, {})).status).toBe(403);
    expect(encolarEmail).not.toHaveBeenCalled();
  });

  it("valida el id y la nota, envía una vez y el segundo envío seguido es 429", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl", "student");
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(admin);
    expect((await pedir("no-es-uuid", {})).status).toBe(404);
    expect((await pedir("0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11", {})).status).toBe(404);
    expect((await pedir(ana.id, { nota: "x".repeat(1001) })).status).toBe(400);
    expect((await pedir(ana.id, { nota: 5 })).status).toBe(400);
    expect((await pedir(ana.id, { nota: "Vas bien." })).status).toBe(200);
    const segundo = await pedir(ana.id, {});
    expect(segundo.status).toBe(429);
    expect(await segundo.json()).toEqual({ error: "reciente" });
    expect(encolarEmail).toHaveBeenCalledTimes(1);
  });

  it("si la cola falla responde 503 y no deja bitácora", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl", "student");
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(admin);
    vi.mocked(encolarEmail).mockRejectedValue(new Error("La cola de emails no responde."));
    const respuesta = await pedir(ana.id, {});
    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ error: "cola_no_disponible" });
    expect(await db.select().from(auditLog)).toEqual([]);
  });
});
