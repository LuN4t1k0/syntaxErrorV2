import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { SIN_META } from "@/lib/cuenta/meta";
import type { Encolar } from "@/lib/emails";
import { cambiarProbador, cambiarRol, detalleUsuario, eliminarUsuario, listarUsuarios } from "./usuarios";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);
const deps = { encolar, meta: SIN_META };

async function persona(email: string, rol = "student", nombre: string | null = null) {
  const [fila] = await db.insert(users).values({ email, role: rol, name: nombre }).returning({ id: users.id });
  return { id: fila.id, email };
}

async function acciones() {
  return (await db.select({ action: auditLog.action, metadata: auditLog.metadata }).from(auditLog)).map((fila) => [fila.action, fila.metadata]);
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("listarUsuarios", () => {
  it("busca por nombre o email tomando % y _ como texto literal", async () => {
    await persona("ana_1@correo.cl", "student", "Ana");
    await persona("anax1@correo.cl", "student", "Anax");
    await persona("cien%@correo.cl");
    expect((await listarUsuarios(db, { busqueda: "ana_1", pagina: 1 })).filas.map((fila) => fila.email)).toEqual(["ana_1@correo.cl"]);
    expect((await listarUsuarios(db, { busqueda: "%", pagina: 1 })).filas.map((fila) => fila.email)).toEqual(["cien%@correo.cl"]);
    expect((await listarUsuarios(db, { busqueda: "ANAX", pagina: 1 })).total).toBe(1);
    expect((await listarUsuarios(db, { busqueda: "\\", pagina: 1 })).total).toBe(0);
  });

  it("pagina de 25 en 25 y una página fuera de rango viene vacía", async () => {
    await db.insert(users).values(Array.from({ length: 30 }, (_, indice) => ({ email: `p${indice}@correo.cl` })));
    const primera = await listarUsuarios(db, { pagina: 1 });
    expect(primera).toMatchObject({ total: 30, pagina: 1, paginas: 2 });
    expect(primera.filas).toHaveLength(25);
    expect((await listarUsuarios(db, { pagina: 2 })).filas).toHaveLength(5);
    expect(await listarUsuarios(db, { pagina: 9 })).toMatchObject({ filas: [], total: 30, paginas: 2 });
  });
});

describe("cambiarRol", () => {
  it("cambia el rol de otra persona y deja registro; su propio rol no", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl");
    expect(await cambiarRol(db, { admin, userId: ana.id, rol: "teacher" }, SIN_META)).toBe("ok");
    expect(await cambiarRol(db, { admin, userId: ana.id, rol: "teacher" }, SIN_META)).toBe("ok");
    expect(await cambiarRol(db, { admin, userId: admin.id, rol: "student" }, SIN_META)).toBe("propio");
    expect(await cambiarRol(db, { admin, userId: "0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11", rol: "teacher" }, SIN_META)).toBe("no_existe");
    expect((await detalleUsuario(db, ana.id))?.rol).toBe("teacher");
    expect((await detalleUsuario(db, admin.id))?.rol).toBe("admin");
    expect(await acciones()).toEqual([["role_changed", { rolAnterior: "student", rolNuevo: "teacher", email: "ana@correo.cl" }]]);
  });
});

describe("cambiarProbador", () => {
  it("marca y desmarca a un probador, deja la bitácora y no repite si no cambia", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl");
    expect(await cambiarProbador(db, { admin, userId: ana.id, probador: true }, SIN_META)).toBe("ok");
    expect((await detalleUsuario(db, ana.id))?.probador).toBe(true);
    expect((await listarUsuarios(db, { busqueda: "ana", pagina: 1 })).filas[0].probador).toBe(true);
    expect(await cambiarProbador(db, { admin, userId: ana.id, probador: true }, SIN_META)).toBe("ok");
    expect(await cambiarProbador(db, { admin, userId: ana.id, probador: false }, SIN_META)).toBe("ok");
    expect(await acciones()).toEqual([
      ["tester_changed", { probador: true, email: "ana@correo.cl" }],
      ["tester_changed", { probador: false, email: "ana@correo.cl" }],
    ]);
    expect(await cambiarProbador(db, { admin, userId: crypto.randomUUID(), probador: true }, SIN_META)).toBe("no_existe");
  });
});

describe("eliminarUsuario", () => {
  it("exige escribir el email de la cuenta, la borra, avisa y deja registro", async () => {
    const admin = await persona("admin@correo.cl", "admin");
    const ana = await persona("ana@correo.cl", "student", "Ana");
    expect(await eliminarUsuario(db, { admin, userId: ana.id, confirmacion: "otra@correo.cl" }, deps)).toBe("confirmacion_incorrecta");
    expect(await eliminarUsuario(db, { admin, userId: admin.id, confirmacion: "admin@correo.cl" }, deps)).toBe("propio");
    expect(await eliminarUsuario(db, { admin, userId: ana.id, confirmacion: " ANA@correo.cl " }, deps)).toBe("ok");
    expect(await eliminarUsuario(db, { admin, userId: ana.id, confirmacion: "ana@correo.cl" }, deps)).toBe("no_existe");
    expect(await db.select().from(users).where(eq(users.id, ana.id))).toEqual([]);
    expect(enviados).toEqual([{ tipo: "cuenta-eliminada", para: "ana@correo.cl", nombre: "Ana" }]);
    expect(await acciones()).toEqual([["account_deleted", { porAdmin: true, email: "ana@correo.cl" }]]);
  });
});

describe("detalleUsuario", () => {
  it("incluye nivel, casos y certificados, o null si no existe", async () => {
    const ana = await persona("ana@correo.cl", "student", "Ana");
    expect(await detalleUsuario(db, ana.id)).toMatchObject({
      email: "ana@correo.cl",
      rol: "student",
      verificado: false,
      casos: [],
      certificados: 0,
      nivel: { puntos: 0, nivel: 1 },
    });
    expect(await detalleUsuario(db, "0b8e6f4c-3f5e-4d3b-9a57-2f7f1d0b8c11")).toBeNull();
  });
});
