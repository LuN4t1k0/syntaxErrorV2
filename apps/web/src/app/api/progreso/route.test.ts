import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { GET, POST } = await import("./route");
const { POST: SINCRONIZAR } = await import("./sync/route");
const { obtenerUsuarioId } = await import("@/lib/sesion");

const { db, close } = createTestDb();

async function iniciarSesion() {
  const [usuario] = await db.insert(users).values({ email: "alumna@correo.cl" }).returning({ id: users.id });
  await db.insert(casos).values({
    slug: "ventas",
    titulo: "Ventas",
    cargo: "Analista junior",
    empresa: "Distribuidora",
    entregable: "Repositorio",
    misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }],
  });
  vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
}

function enviar(handler: (request: Request) => Promise<Response>, cuerpo: unknown) {
  return handler(
    new Request("http://localhost:3000/api/progreso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  );
}

const consultar = (caso: string) => GET(new Request(`http://localhost:3000/api/progreso?caso=${caso}`));
const aprobado = { caso: "ventas", mision: "m1", tarea: "t1", aprobada: true };

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("/api/progreso", () => {
  it("responde 401 sin sesión", async () => {
    expect((await consultar("ventas")).status).toBe(401);
    expect((await enviar(POST, aprobado)).status).toBe(401);
    expect((await enviar(SINCRONIZAR, { intentos: [aprobado] })).status).toBe(401);
  });

  it("registra un intento y devuelve el progreso del caso", async () => {
    await iniciarSesion();
    const respuesta = await enviar(POST, aprobado);
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ misionAprobada: true, casoCompleto: false, certificados: [] });
    expect(await (await consultar("ventas")).json()).toEqual({
      misiones: { m1: { estado: "aprobada", tareasAprobadas: ["t1"], fallidos: 0 } },
      entregable: null,
      revision: null,
      completo: false,
      bloqueadoPor: null,
      certificados: [],
    });
  });

  it("responde 400 con datos inválidos y 404 si el caso no existe", async () => {
    await iniciarSesion();
    expect((await enviar(POST, { caso: "ventas" })).status).toBe(400);
    expect((await enviar(POST, { ...aprobado, caso: "otro" })).status).toBe(404);
    expect((await consultar("otro")).status).toBe(404);
  });

  it("sync aplica el lote y cuenta los rechazados", async () => {
    await iniciarSesion();
    const respuesta = await enviar(SINCRONIZAR, { intentos: [aprobado, { ...aprobado, caso: "otro" }] });
    expect(await respuesta.json()).toEqual({ aplicados: 1, rechazados: 1, certificados: [] });
  });

  it("responde 409 si la misión anterior no está aprobada", async () => {
    await iniciarSesion();
    await db.update(casos).set({ misiones: [{ slug: "m0", titulo: "M0", tareas: ["t0"] }, { slug: "m1", titulo: "M1", tareas: ["t1"] }] });
    const respuesta = await enviar(POST, aprobado);
    expect(respuesta.status).toBe(409);
    expect(await respuesta.json()).toEqual({ error: "mision_bloqueada" });
  });
});
