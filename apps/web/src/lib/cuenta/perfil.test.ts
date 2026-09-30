import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import {
  auditLog,
  casoInscripciones,
  casos,
  certificados,
  claseInscripciones,
  clases,
  entregables,
  mensajes,
  misionProgreso,
  preguntasProfesor,
  reportes,
  resenasCaso,
  rutaCasos,
  rutaInscripciones,
  rutas,
  solicitudesDocente,
  transaccionesPuntos,
  users,
} from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";
import type { Encolar } from "@/lib/emails";
import { verifyPassword } from "@/lib/password";
import { SIN_META } from "./meta";
import {
  actualizarNombre,
  cambiarClave,
  confirmarCambioEmail,
  eliminarCuenta,
  exportarDatos,
  obtenerPerfil,
  solicitarCambioEmail,
} from "./perfil";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);
const deps = { encolar, meta: SIN_META };

async function alumna(email = "ana@correo.cl") {
  const { id } = await registerUser(db, { name: "Ana", email, password: "clave-segura-123" });
  return id;
}

async function usuariaGoogle() {
  const [usuario] = await db
    .insert(users)
    .values({ email: "google@correo.cl", name: "Gabriela" })
    .returning({ id: users.id });
  return usuario.id;
}

function tokenDe(trabajo: TrabajoEmail | undefined): string {
  if (!trabajo || !("enlace" in trabajo)) throw new Error("El email no tiene enlace");
  return new URL(trabajo.enlace).searchParams.get("token") ?? "";
}

async function acciones() {
  return (await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action);
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("obtenerPerfil y actualizarNombre", () => {
  it("devuelve el perfil y cambia el nombre dejando registro", async () => {
    const id = await alumna();
    await actualizarNombre(db, id, "Ana María", SIN_META);
    expect(await obtenerPerfil(db, id)).toEqual({
      nombre: "Ana María",
      email: "ana@correo.cl",
      tieneClave: true,
      emailVerificado: false,
      usuario: null,
      portafolioPublico: false,
    });
    expect(await acciones()).toEqual(["profile_updated"]);
  });
});

describe("cambiarClave", () => {
  it("cambia la contraseña, avisa por email y deja registro", async () => {
    const id = await alumna();
    expect(await cambiarClave(db, id, { claveActual: "clave-segura-123", claveNueva: "otra-clave-456" }, deps)).toEqual({
      ok: true,
    });
    const [fila] = await db.select().from(users).where(eq(users.id, id));
    expect(await verifyPassword("otra-clave-456", fila.passwordHash!)).toBe(true);
    expect(enviados).toEqual([{ tipo: "clave-cambiada", para: "ana@correo.cl", nombre: "Ana" }]);
    expect(await acciones()).toEqual(["password_changed"]);
  });

  it("rechaza la clave actual incorrecta sin cambiar nada", async () => {
    const id = await alumna();
    expect(await cambiarClave(db, id, { claveActual: "mala", claveNueva: "otra-clave-456" }, deps)).toEqual({
      ok: false,
      motivo: "clave_incorrecta",
    });
    expect(enviados).toEqual([]);
  });

  it("una cuenta de Google no tiene clave que cambiar", async () => {
    const id = await usuariaGoogle();
    expect(await cambiarClave(db, id, { claveActual: "x", claveNueva: "otra-clave-456" }, deps)).toEqual({
      ok: false,
      motivo: "sin_clave",
    });
  });
});

describe("cambio de email", () => {
  it("pide confirmación al email nuevo, avisa al actual y cambia al confirmar", async () => {
    const id = await alumna();
    expect(await solicitarCambioEmail(db, id, { nuevoEmail: " Nueva@Correo.CL ", claveActual: "clave-segura-123" }, deps)).toEqual({
      ok: true,
    });
    expect(enviados.map((email) => [email.tipo, email.para])).toEqual([
      ["confirmar-nuevo-email", "nueva@correo.cl"],
      ["aviso-cambio-email", "ana@correo.cl"],
    ]);

    expect(await confirmarCambioEmail(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: true, email: "nueva@correo.cl" });
    const perfil = await obtenerPerfil(db, id);
    expect(perfil).toMatchObject({ email: "nueva@correo.cl", emailVerificado: true });
    expect(await acciones()).toEqual(["email_change_requested", "email_changed"]);
  });

  it("el enlace de confirmación no sirve dos veces", async () => {
    const id = await alumna();
    await solicitarCambioEmail(db, id, { nuevoEmail: "nueva@correo.cl", claveActual: "clave-segura-123" }, deps);
    await confirmarCambioEmail(db, tokenDe(enviados[0]), SIN_META);
    expect(await confirmarCambioEmail(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: false, motivo: "invalido" });
  });

  it("rechaza el mismo email, uno en uso y la clave incorrecta", async () => {
    const id = await alumna();
    await alumna("tomado@correo.cl");
    const pedir = (nuevoEmail: string, claveActual = "clave-segura-123") =>
      solicitarCambioEmail(db, id, { nuevoEmail, claveActual }, deps);
    expect(await pedir("ANA@correo.cl")).toEqual({ ok: false, motivo: "mismo_email" });
    expect(await pedir("tomado@correo.cl")).toEqual({ ok: false, motivo: "email_en_uso" });
    expect(await pedir("nueva@correo.cl", "mala")).toEqual({ ok: false, motivo: "clave_incorrecta" });
    expect(enviados).toEqual([]);
  });

  it("si otra cuenta toma el email antes de confirmar, avisa que está en uso", async () => {
    const id = await alumna();
    await solicitarCambioEmail(db, id, { nuevoEmail: "nueva@correo.cl", claveActual: "clave-segura-123" }, deps);
    await alumna("nueva@correo.cl");
    expect(await confirmarCambioEmail(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: false, motivo: "email_en_uso" });
    expect(await obtenerPerfil(db, id)).toMatchObject({ email: "ana@correo.cl" });
  });

  it("una cuenta de Google cambia su email sin contraseña", async () => {
    const id = await usuariaGoogle();
    expect(await solicitarCambioEmail(db, id, { nuevoEmail: "nueva@correo.cl" }, deps)).toEqual({ ok: true });
  });

  it("si falla el aviso al email actual, no falla la solicitud", async () => {
    const id = await alumna();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const encolarConAvisoCaido: Encolar = async (trabajo) => {
      if (trabajo.tipo === "aviso-cambio-email") throw new Error("cola caída");
      enviados.push(trabajo);
    };
    expect(
      await solicitarCambioEmail(db, id, { nuevoEmail: "nueva@correo.cl", claveActual: "clave-segura-123" }, { ...deps, encolar: encolarConAvisoCaido })
    ).toEqual({ ok: true });
    expect(enviados).toHaveLength(1);
    expect(await confirmarCambioEmail(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: true, email: "nueva@correo.cl" });
    error.mockRestore();
  });

  it("si falla el email obligatorio, no invalida un token anterior", async () => {
    const id = await alumna();
    await solicitarCambioEmail(db, id, { nuevoEmail: "primera@correo.cl", claveActual: "clave-segura-123" }, deps);
    const tokenAnterior = tokenDe(enviados[0]);
    const encolarCaido: Encolar = async () => {
      throw new Error("La cola de emails no responde.");
    };
    await expect(
      solicitarCambioEmail(db, id, { nuevoEmail: "segunda@correo.cl", claveActual: "clave-segura-123" }, { ...deps, encolar: encolarCaido })
    ).rejects.toThrow("La cola de emails no responde.");
    expect(await confirmarCambioEmail(db, tokenAnterior, SIN_META)).toEqual({ ok: true, email: "primera@correo.cl" });
  });

  it("detecta emails ocupados aunque otra cuenta los tenga con mayúsculas", async () => {
    const id = await alumna();
    await db.insert(users).values({ email: "Tomado@Correo.cl", name: "Tomada" });
    expect(await solicitarCambioEmail(db, id, { nuevoEmail: "tomado@correo.cl", claveActual: "clave-segura-123" }, deps)).toEqual({
      ok: false,
      motivo: "email_en_uso",
    });
  });
});

describe("exportarDatos", () => {
  it("incluye la cuenta, progreso, casos, rutas, entregables y certificados, y deja registro", async () => {
    const id = await alumna();
    const [ruta] = await db
      .insert(rutas)
      .values({ slug: "analista", titulo: "Analista", cargo: "Analista", descripcion: "Ruta", estado: "publicada" })
      .returning({ id: rutas.id });
    const [caso] = await db
      .insert(casos)
      .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
      .returning({ id: casos.id });
    await db.insert(rutaCasos).values({ rutaId: ruta.id, casoId: caso.id, orden: 0 });
    await db.insert(casoInscripciones).values({ userId: id, casoId: caso.id });
    await db.insert(rutaInscripciones).values({ userId: id, rutaId: ruta.id });
    await db.insert(misionProgreso).values({ userId: id, casoId: caso.id, mision: "m1", intentos: 3, tareasAprobadas: ["t1"] });
    await db.insert(entregables).values({ userId: id, casoId: caso.id, url: "https://github.com/ana/ventas" });
    await db
      .insert(certificados)
      .values({ userId: id, tipo: "caso", casoId: caso.id, codigo: "CERT-1", nombreAlumno: "Ana", titulo: "Ventas" });

    const datos = await exportarDatos(db, id, SIN_META);
    expect(datos?.cuenta).toMatchObject({ nombre: "Ana", email: "ana@correo.cl", rol: "student" });
    expect(datos?.misiones).toEqual([
      { caso: "ventas", mision: "m1", estado: "en_curso", intentos: 3, tareasAprobadas: ["t1"], aprobadaEn: null },
    ]);
    expect(datos?.casos).toHaveLength(1);
    expect(datos?.rutas).toHaveLength(1);
    expect(datos?.entregables).toEqual([{ caso: "ventas", url: "https://github.com/ana/ventas", actualizadoEn: expect.any(Date) }]);
    expect(datos?.certificados).toEqual([{ codigo: "CERT-1", tipo: "caso", titulo: "Ventas", emitidoEn: expect.any(Date) }]);
    expect(await acciones()).toEqual(["data_exported"]);
  });

  it("incluye los datos de comunidad", async () => {
    const id = await alumna();
    const [docente] = await db.insert(users).values({ email: "rosa@correo.cl", role: "teacher" }).returning({ id: users.id });
    const [ruta] = await db
      .insert(rutas)
      .values({ slug: "analista", titulo: "Analista", cargo: "Analista", descripcion: "Ruta" })
      .returning({ id: rutas.id });
    const [caso] = await db
      .insert(casos)
      .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
      .returning({ id: casos.id });
    const [clase] = await db.insert(clases).values({ profesorId: docente.id, rutaId: ruta.id, titulo: "3°A", codigo: "ABC234" }).returning({ id: clases.id });
    await db.insert(claseInscripciones).values({ claseId: clase.id, userId: id, estado: "activa" });
    await db.insert(transaccionesPuntos).values({ userId: id, casoId: caso.id, clave: "m1", motivo: "mision_aprobada", cantidad: 10 });
    await db.insert(preguntasProfesor).values({ alumnoId: id, casoId: caso.id, mision: "m1", texto: "¿Cómo filtro?" });
    await db.insert(resenasCaso).values({ userId: id, casoId: caso.id, estrellas: 5, comentario: "Muy bueno", estadoComentario: "pendiente" });
    await db.insert(reportes).values({ userId: id, tipo: "error", descripcion: "No carga la tabla", pagina: "/casos/ventas" });
    await db.insert(mensajes).values({ userId: id, asunto: "Hola", cuerpo: "Gracias por tu reporte" });
    await db.insert(solicitudesDocente).values({ userId: id });

    const datos = await exportarDatos(db, id, SIN_META);
    expect(datos?.puntos).toEqual([{ caso: "ventas", motivo: "mision_aprobada", cantidad: 10, creadoEn: expect.any(Date) }]);
    expect(datos?.preguntasDocentes).toEqual([
      { caso: "ventas", mision: "m1", texto: "¿Cómo filtro?", respuesta: null, estado: "pendiente", creadaEn: expect.any(Date) },
    ]);
    expect(datos?.resenas).toEqual([{ caso: "ventas", estrellas: 5, comentario: "Muy bueno", creadaEn: expect.any(Date) }]);
    expect(datos?.reportes).toEqual([
      { tipo: "error", descripcion: "No carga la tabla", pagina: "/casos/ventas", estado: "pendiente", creadoEn: expect.any(Date) },
    ]);
    expect(datos?.mensajes).toEqual([{ asunto: "Hola", cuerpo: "Gracias por tu reporte", leidoEn: null, creadoEn: expect.any(Date) }]);
    expect(datos?.clases).toEqual([{ clase: "3°A", estado: "activa", solicitadaEn: expect.any(Date) }]);
    expect(datos?.solicitudesDocente).toEqual([{ estado: "pendiente", creadaEn: expect.any(Date) }]);
  });
});

describe("eliminarCuenta", () => {
  it("con la contraseña borra la cuenta y su progreso, avisa y conserva la bitácora", async () => {
    const id = await alumna();
    const [caso] = await db
      .insert(casos)
      .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
      .returning({ id: casos.id });
    await db.insert(misionProgreso).values({ userId: id, casoId: caso.id, mision: "m1" });

    expect(await eliminarCuenta(db, id, "clave-segura-123", deps)).toEqual({ ok: true });
    expect(await db.select().from(users)).toEqual([]);
    expect(await db.select().from(misionProgreso)).toEqual([]);
    expect(enviados).toEqual([{ tipo: "cuenta-eliminada", para: "ana@correo.cl", nombre: "Ana" }]);
    expect(await acciones()).toEqual(["account_deleted"]);
  });

  it("con la contraseña incorrecta no borra nada", async () => {
    const id = await alumna();
    expect(await eliminarCuenta(db, id, "mala", deps)).toEqual({ ok: false, motivo: "clave_incorrecta" });
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it("una cuenta de Google se confirma escribiendo su email", async () => {
    const id = await usuariaGoogle();
    expect(await eliminarCuenta(db, id, "otra@correo.cl", deps)).toEqual({ ok: false, motivo: "confirmacion_incorrecta" });
    expect(await eliminarCuenta(db, id, " Google@Correo.cl ", deps)).toEqual({ ok: true });
  });

  it("una cuenta de Google con email guardado en mayúsculas se confirma normalizado", async () => {
    const [usuario] = await db.insert(users).values({ email: "Google@Correo.cl", name: "Gabriela" }).returning({ id: users.id });
    expect(await eliminarCuenta(db, usuario.id, "google@correo.cl", deps)).toEqual({ ok: true });
  });
});
