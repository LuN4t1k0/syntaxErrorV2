import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sincronizarContenido } from "@syntaxerror/content/sincronizar";
import { auditLog, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { obtenerContenido } from "@/lib/contenido";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));

const { PATCH } = await import("./route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function persona(email: string, rol: Rol) {
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

const cambiar = (slug: string, cuerpo: unknown) =>
  PATCH(
    new Request(`http://localhost:3000/api/admin/rutas/${slug}`, { method: "PATCH", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" }, body: JSON.stringify(cuerpo) }) as never,
    { params: Promise.resolve({ slug }) }
  );

const ruta = async (slug: string) => (await db.select().from(rutas).where(eq(rutas.slug, slug)))[0];

beforeEach(async () => {
  await truncateAll(db);
  await sincronizarContenido(db, await obtenerContenido());
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("PATCH /api/admin/rutas/[slug]", () => {
  it("solo administración cambia el estado", async () => {
    expect((await cambiar("data-analyst", { estado: "publicada" })).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("rosa@correo.cl", "teacher"));
    expect((await cambiar("data-analyst", { estado: "publicada" })).status).toBe(403);
  });

  it("cambia el estado, lo registra en la bitácora y vuelve al del contenido", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(admin);
    expect((await cambiar("data-analyst", { estado: "cerrada" })).status).toBe(400);

    expect((await cambiar("data-analyst", { estado: "publicada" })).status).toBe(200);
    expect(await ruta("data-analyst")).toMatchObject({ estado: "beta", estadoAdmin: "publicada", estadoCambiadoPor: admin.id });
    const [registro] = await db.select().from(auditLog).where(eq(auditLog.action, "ruta_estado_cambiado"));
    expect(registro).toMatchObject({ actorId: admin.id, targetType: "route", metadata: { slug: "data-analyst", estado: "publicada" } });

    expect((await cambiar("data-analyst", { estado: null })).status).toBe(200);
    expect(await ruta("data-analyst")).toMatchObject({ estadoAdmin: null, estadoCambiadoPor: null, estadoCambiadoEn: null });
  });

  it("no abre una ruta sin casos ni toca una que no existe o está en desarrollo", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("admin@correo.cl", "admin"));
    const sinCasos = await cambiar("ciberseguridad", { estado: "publicada" });
    expect(sinCasos.status).toBe(400);
    expect(await sinCasos.json()).toEqual({ error: "ruta_sin_casos" });
    expect((await cambiar("ciberseguridad", { estado: "oculta" })).status).toBe(200);
    expect((await cambiar("no-existe", { estado: "oculta" })).status).toBe(404);
    expect((await cambiar("demo", { estado: "publicada" })).status).toBe(404);
  });
});
