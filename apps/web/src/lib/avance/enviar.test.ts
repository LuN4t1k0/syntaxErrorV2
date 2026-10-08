import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, casos, misionProgreso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { enviarAvance, ESPERA_ENVIO_MS, ultimoEnvio } from "./enviar";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);
const AHORA = new Date(Date.UTC(2026, 9, 20, 12));

async function persona(email: string, rol = "student") {
  const [fila] = await db.insert(users).values({ email, role: rol, name: email === "ana@correo.cl" ? "Ana" : null }).returning({ id: users.id });
  return { id: fila.id, email };
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("enviarAvance", () => {
  it("encola el email con la nota recortada, deja la bitácora y no repite antes de 10 minutos", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl");
    const [excel] = await db.insert(casos).values({ slug: "excel", tipo: "clases", titulo: "Clases de Excel", cargo: "c", empresa: "e", entregable: "r", misiones: [{ slug: "01", titulo: "BUSCARV", tareas: ["t"] }] }).returning({ id: casos.id });
    await db.insert(misionProgreso).values({ userId: ana.id, casoId: excel.id, mision: "01", estado: "en_curso", intentos: 5, fallidos: 5, actualizadoEn: AHORA });

    expect(await enviarAvance(db, { admin, userId: ana.id, nota: "  Prueba la pista 2.  " }, { encolar, meta: SIN_META, ahora: AHORA })).toBe("ok");
    expect(enviados).toEqual([
      {
        tipo: "avance",
        para: "ana@correo.cl",
        nombre: "Ana",
        nota: "Prueba la pista 2.",
        rutas: [],
        enCurso: { caso: "Clases de Excel", leccion: "BUSCARV" },
        pasos: ["Llevas varios intentos en BUSCARV: abre las pistas o pregúntale al tutor."],
        enlace: expect.stringMatching(/\/dashboard\/avance$/),
      },
    ]);
    const bitacora = await db.select({ action: auditLog.action, targetId: auditLog.targetId, metadata: auditLog.metadata, actorEmail: auditLog.actorEmail }).from(auditLog);
    expect(bitacora).toEqual([{ action: "progress_sent", targetId: ana.id, metadata: { nota: "Prueba la pista 2.", email: "ana@correo.cl" }, actorEmail: "admin@correo.cl" }]);

    const despues = (ms: number) => new Date(AHORA.getTime() + ms);
    await db.update(auditLog).set({ createdAt: AHORA });
    expect(await enviarAvance(db, { admin, userId: ana.id, nota: null }, { encolar, meta: SIN_META, ahora: despues(ESPERA_ENVIO_MS - 1000) })).toBe("reciente");
    expect(enviados).toHaveLength(1);
    expect(await enviarAvance(db, { admin, userId: ana.id, nota: null }, { encolar, meta: SIN_META, ahora: despues(ESPERA_ENVIO_MS + 1000) })).toBe("ok");
    expect(await ultimoEnvio(db, ana.id)).toMatchObject({ actorEmail: "admin@correo.cl" });
  });

  it("una nota con solo espacios no se envía y una persona que no existe es no_existe", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl");
    await enviarAvance(db, { admin, userId: ana.id, nota: "   " }, { encolar, meta: SIN_META, ahora: AHORA });
    expect(enviados[0]).toMatchObject({ nota: null, pasos: ["Elige una ruta en tu panel y empieza el primer caso."], enCurso: null });
    expect(await enviarAvance(db, { admin, userId: "0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11", nota: null }, { encolar, meta: SIN_META, ahora: AHORA })).toBe("no_existe");
  });

  it("si la cola falla, el error sale y no queda bitácora", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl");
    const falla: Encolar = async () => {
      throw new Error("La cola de emails no responde.");
    };
    await expect(enviarAvance(db, { admin, userId: ana.id, nota: null }, { encolar: falla, meta: SIN_META, ahora: AHORA })).rejects.toThrow("no responde");
    expect(await db.select().from(auditLog)).toEqual([]);
  });
});
