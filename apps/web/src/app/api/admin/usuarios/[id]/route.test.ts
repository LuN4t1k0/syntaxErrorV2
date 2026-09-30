import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { PATCH, DELETE } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function persona(email: string, rol: Rol) {
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

const pedir = (metodo: "PATCH" | "DELETE", id: string, cuerpo: unknown) => {
  const request = new Request(`http://localhost:3000/api/admin/usuarios/${id}`, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  return (metodo === "PATCH" ? PATCH : DELETE)(request, { params: Promise.resolve({ id }) });
};

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("/api/admin/usuarios/[id]", () => {
  it("sin sesión 401 y sin rol admin 403", async () => {
    const ana = await persona("ana@correo.cl", "student");
    expect((await pedir("PATCH", ana.id, { rol: "teacher" })).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("rosa@correo.cl", "teacher"));
    expect((await pedir("PATCH", ana.id, { rol: "teacher" })).status).toBe(403);
    expect((await pedir("DELETE", ana.id, { confirmacion: "ana@correo.cl" })).status).toBe(403);
  });

  it("administración cambia roles y elimina cuentas con las validaciones", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl", "student");
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(admin);
    expect((await pedir("PATCH", "no-es-uuid", { rol: "teacher" })).status).toBe(404);
    expect((await pedir("PATCH", ana.id, { rol: "superadmin" })).status).toBe(400);
    expect((await pedir("PATCH", admin.id, { rol: "student" })).status).toBe(400);
    expect((await pedir("PATCH", ana.id, { rol: "teacher" })).status).toBe(200);
    expect((await pedir("DELETE", ana.id, { confirmacion: "otra@correo.cl" })).status).toBe(400);
    expect((await pedir("DELETE", admin.id, { confirmacion: "admin@correo.cl" })).status).toBe(400);
    expect((await pedir("DELETE", ana.id, { confirmacion: "ana@correo.cl" })).status).toBe(200);
    expect((await pedir("DELETE", ana.id, { confirmacion: "ana@correo.cl" })).status).toBe(404);
  });
});
