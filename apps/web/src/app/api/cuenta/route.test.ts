import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn(), cerrarSesion: vi.fn(async () => {}) }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => ({ allowed: true })) }));

const cuenta = await import("./route");
const clave = await import("./clave/route");
const email = await import("./email/route");
const confirmar = await import("./email/confirmar/route");
const datos = await import("./datos/route");
const { obtenerUsuarioId, cerrarSesion } = await import("@/lib/sesion");
const { encolarEmail } = await import("@/lib/emails");

const { db, close } = createTestDb();

function pedir(metodo: string, cuerpo?: unknown) {
  return new Request("http://localhost:3000/api/cuenta", {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

async function iniciarSesion(correo = "ana@correo.cl") {
  const { id } = await registerUser(db, { name: "Ana", email: correo, password: "clave-segura-123" });
  vi.mocked(obtenerUsuarioId).mockResolvedValue(id);
  return id;
}

beforeEach(async () => {
  await truncateAll(db);
  vi.clearAllMocks();
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});

afterAll(() => close());

describe("/api/cuenta", () => {
  it("todas las rutas piden sesión", async () => {
    expect((await cuenta.PATCH(pedir("PATCH", { nombre: "Ana" }))).status).toBe(401);
    expect((await cuenta.DELETE(pedir("DELETE", { confirmacion: "x" }))).status).toBe(401);
    expect((await clave.POST(pedir("POST", { claveActual: "x", claveNueva: "12345678" }))).status).toBe(401);
    expect((await email.POST(pedir("POST", { nuevoEmail: "a@b.cl" }))).status).toBe(401);
    expect((await datos.GET()).status).toBe(401);
  });

  it("PATCH cambia el nombre", async () => {
    const id = await iniciarSesion();
    expect((await cuenta.PATCH(pedir("PATCH", { nombre: "Ana Maria" }))).status).toBe(200);
    const [fila] = await db.select().from(users).where(eq(users.id, id));
    expect(fila.name).toBe("Ana Maria");
  });

  it("clave: 400 con la actual incorrecta y 200 con la correcta", async () => {
    await iniciarSesion();
    const mala = await clave.POST(pedir("POST", { claveActual: "mala", claveNueva: "otra-clave-456" }));
    expect(await mala.json()).toEqual({ error: "clave_incorrecta" });
    expect((await clave.POST(pedir("POST", { claveActual: "clave-segura-123", claveNueva: "otra-clave-456" }))).status).toBe(200);
  });

  it("email: 409 si lo usa otra cuenta y 200 encolando la confirmación", async () => {
    await registerUser(db, { name: "Otra", email: "tomado@correo.cl", password: "clave-segura-123" });
    await iniciarSesion();

    const tomado = await email.POST(pedir("POST", { nuevoEmail: "tomado@correo.cl", claveActual: "clave-segura-123" }));
    expect(tomado.status).toBe(409);

    expect((await email.POST(pedir("POST", { nuevoEmail: "nueva@correo.cl", claveActual: "clave-segura-123" }))).status).toBe(200);
    expect(vi.mocked(encolarEmail).mock.calls.map(([trabajo]) => trabajo.tipo)).toEqual([
      "confirmar-nuevo-email",
      "aviso-cambio-email",
    ]);
  });

  it("email: 503 si no se puede encolar la confirmación", async () => {
    await iniciarSesion();
    vi.mocked(encolarEmail).mockRejectedValueOnce(new Error("La cola de emails no responde."));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const respuesta = await email.POST(pedir("POST", { nuevoEmail: "nueva@correo.cl", claveActual: "clave-segura-123" }));

    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ error: "cola_no_disponible" });
    error.mockRestore();
  });

  it("confirmar: 400 con un token que no existe", async () => {
    const respuesta = await confirmar.POST(pedir("POST", { token: "y".repeat(43) }));
    expect(respuesta.status).toBe(400);
  });

  it("datos: descarga un JSON adjunto con la cuenta", async () => {
    await iniciarSesion();
    const respuesta = await datos.GET();
    expect(respuesta.headers.get("Content-Disposition")).toContain("attachment");
    expect(JSON.parse(await respuesta.text()).cuenta.email).toBe("ana@correo.cl");
  });

  it("DELETE: 400 con la clave incorrecta; con la correcta borra la cuenta y cierra la sesión", async () => {
    await iniciarSesion();

    expect((await cuenta.DELETE(pedir("DELETE", { confirmacion: "mala" }))).status).toBe(400);
    expect(cerrarSesion).not.toHaveBeenCalled();
    expect((await cuenta.DELETE(pedir("DELETE", { confirmacion: "clave-segura-123" }))).status).toBe(200);
    expect(cerrarSesion).toHaveBeenCalledTimes(1);
    expect(await db.select().from(users)).toEqual([]);
  });
});
