import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, reportes, resenasCaso, solicitudesDocente, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Rol } from "@/lib/roles";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioActual: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const solicitudes = await import("./solicitudes/[id]/route");
const resenas = await import("./resenas/[id]/route");
const reportesRuta = await import("./reportes/[id]/route");
const { obtenerUsuarioActual } = await import("@/lib/sesion");
const { db, close } = createTestDb();

async function persona(email: string, rol: Rol) {
  const [fila] = await db.insert(users).values({ email, role: rol }).returning({ id: users.id });
  return { id: fila.id, email, nombre: null, rol };
}

type Manejador = (request: Request, contexto: { params: Promise<{ id: string }> }) => Promise<Response>;
const enviar = (manejador: Manejador, id: string, cuerpo: unknown) =>
  manejador(
    new Request(`http://localhost:3000/api/admin/x/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }),
    { params: Promise.resolve({ id }) }
  );

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioActual).mockResolvedValue(null);
});
afterAll(() => close());

describe("API de moderación", () => {
  it("solo administración: 401 sin sesión y 403 a docentes", async () => {
    const id = "0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11";
    expect((await enviar(solicitudes.POST, id, { decision: "aprobada" })).status).toBe(401);
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("rosa@correo.cl", "teacher"));
    expect((await enviar(solicitudes.POST, id, { decision: "aprobada" })).status).toBe(403);
    expect((await enviar(resenas.POST, id, { decision: "aprobado" })).status).toBe(403);
    expect((await enviar(reportesRuta.POST, id, { util: false, respuesta: null })).status).toBe(403);
  });

  it("decide una vez y la segunda responde 404; ids y datos inválidos se rechazan", async () => {
    vi.mocked(obtenerUsuarioActual).mockResolvedValue(await persona("admin@correo.cl", "admin"));
    const ana = await persona("ana@correo.cl", "student");
    const [solicitud] = await db.insert(solicitudesDocente).values({ userId: ana.id }).returning({ id: solicitudesDocente.id });
    const [caso] = await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [] }).returning({ id: casos.id });
    const [resena] = await db
      .insert(resenasCaso)
      .values({ userId: ana.id, casoId: caso.id, estrellas: 5, comentario: "Bien", estadoComentario: "pendiente" })
      .returning({ id: resenasCaso.id });
    const [reporte] = await db
      .insert(reportes)
      .values({ userId: ana.id, tipo: "error", descripcion: "No carga la tabla", pagina: "/casos/ventas", caso: "ventas" })
      .returning({ id: reportes.id });

    expect((await enviar(solicitudes.POST, "no-es-uuid", { decision: "aprobada" })).status).toBe(404);
    expect((await enviar(solicitudes.POST, solicitud.id, { decision: "quizas" })).status).toBe(400);
    expect((await enviar(solicitudes.POST, solicitud.id, { decision: "aprobada" })).status).toBe(200);
    expect((await enviar(solicitudes.POST, solicitud.id, { decision: "aprobada" })).status).toBe(404);

    expect((await enviar(resenas.POST, resena.id, { decision: "aprobado" })).status).toBe(200);
    expect((await enviar(resenas.POST, resena.id, { decision: "rechazado" })).status).toBe(404);

    expect((await enviar(reportesRuta.POST, reporte.id, { util: true, respuesta: { asunto: "", cuerpo: "x" } })).status).toBe(400);
    expect((await enviar(reportesRuta.POST, reporte.id, { util: true, respuesta: { asunto: "Gracias", cuerpo: "Arreglado." } })).status).toBe(200);
    expect((await enviar(reportesRuta.POST, reporte.id, { util: true, respuesta: null })).status).toBe(404);
  });
});
