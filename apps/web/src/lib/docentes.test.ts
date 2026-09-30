import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, solicitudesDocente, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import type { Rol } from "@/lib/roles";
import { decidirSolicitud, estadoDocencia, solicitarDocencia } from "./docentes";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);
const ADMIN = { id: "", email: "admin@correo.cl" };

async function persona(rol: Rol = "student") {
  const [fila] = await db.insert(users).values({ email: `${rol}@correo.cl`, name: "Rosa Díaz", role: rol }).returning({ id: users.id });
  return { id: fila.id, email: `${rol}@correo.cl`, nombre: "Rosa Díaz", rol };
}

async function rolDe(id: string) {
  const [fila] = await db.select({ role: users.role }).from(users).where(eq(users.id, id));
  return fila.role;
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
  const [admin] = await db.insert(users).values({ email: "admin@correo.cl", name: "Admin", role: "admin" }).returning({ id: users.id });
  ADMIN.id = admin.id;
});
afterAll(() => close());

describe("solicitudes de acceso docente", () => {
  it("pedir acceso crea una sola solicitud pendiente y avisa a administración una vez", async () => {
    const rosa = await persona();
    expect(await estadoDocencia(db, rosa)).toBe("puede_solicitar");
    expect(await solicitarDocencia(db, rosa, { encolar })).toBe("pendiente");
    expect(await solicitarDocencia(db, rosa, { encolar })).toBe("pendiente");
    expect(await db.select().from(solicitudesDocente)).toHaveLength(1);
    expect(enviados).toEqual([
      { tipo: "solicitud-docente-nueva", para: "admin@correo.cl", nombre: "Admin", solicitante: "Rosa Díaz (student@correo.cl)" },
    ]);
  });

  it("aprobar cambia el rol a teacher y deja registro; decidir dos veces no hace nada", async () => {
    const rosa = await persona();
    await solicitarDocencia(db, rosa, { encolar });
    const [solicitud] = await db.select().from(solicitudesDocente);
    expect(await decidirSolicitud(db, { solicitudId: solicitud.id, admin: ADMIN, decision: "aprobada" }, SIN_META)).toBe(true);
    expect(await decidirSolicitud(db, { solicitudId: solicitud.id, admin: ADMIN, decision: "rechazada" }, SIN_META)).toBe(false);
    expect(await rolDe(rosa.id)).toBe("teacher");
    expect(await estadoDocencia(db, { id: rosa.id, rol: "teacher" })).toBe("docente");
    expect((await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action)).toEqual(["role_changed"]);
  });

  it("tras un rechazo se puede volver a pedir", async () => {
    const rosa = await persona();
    await solicitarDocencia(db, rosa, { encolar });
    const [solicitud] = await db.select().from(solicitudesDocente);
    await decidirSolicitud(db, { solicitudId: solicitud.id, admin: ADMIN, decision: "rechazada" }, SIN_META);
    expect(await rolDe(rosa.id)).toBe("student");
    expect(await estadoDocencia(db, rosa)).toBe("puede_solicitar");
    expect(await solicitarDocencia(db, rosa, { encolar })).toBe("pendiente");
  });

  it("una cuenta que ya es docente no crea solicitudes", async () => {
    const docente = await persona("teacher");
    expect(await solicitarDocencia(db, docente, { encolar })).toBe("docente");
    expect(await db.select().from(solicitudesDocente)).toEqual([]);
  });
});
