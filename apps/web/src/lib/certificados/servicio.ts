import { randomInt } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import {
  casoInscripciones,
  casos,
  certificados,
  certificadosLegacy,
  rutaCasos,
  rutaInscripciones,
  rutas,
  users,
} from "@syntaxerror/db/schema";
import { esViolacionUnica } from "@/lib/errores-db";

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generarCodigo(largo = 12): string {
  return Array.from({ length: largo }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}

export type TipoCertificado = "caso" | "ruta";
export type CertificadoEmitido = { codigo: string; tipo: TipoCertificado; titulo: string };
export type CertificadoPublico = {
  codigo: string;
  tipo: TipoCertificado | "curso";
  titulo: string;
  cargo: string | null;
  nombreAlumno: string;
  emitidoEn: Date;
  legado: boolean;
};

function nombreParaCertificado(usuario: { name: string | null; email: string }): string {
  return usuario.name?.trim() || usuario.email.split("@")[0];
}

async function insertarCertificadoCaso(
  db: AppDb,
  datos: {
    userId: string;
    casoId: string;
    nombreAlumno: string;
    titulo: string;
    cargo: string | null;
  }
): Promise<string | null> {
  for (let intento = 0; intento < 5; intento += 1) {
    try {
      const [nuevo] = await db
        .insert(certificados)
        .values({
          ...datos,
          tipo: "caso",
          codigo: generarCodigo(),
        })
        .onConflictDoNothing({ target: [certificados.userId, certificados.tipo, certificados.casoId] })
        .returning({ codigo: certificados.codigo });
      return nuevo?.codigo ?? null;
    } catch (error) {
      if (esViolacionUnica(error)) continue;
      throw error;
    }
  }
  throw new Error("no_se_pudo_generar_codigo_certificado");
}

async function insertarCertificadoRuta(
  db: AppDb,
  datos: {
    userId: string;
    rutaId: string;
    nombreAlumno: string;
    titulo: string;
    cargo: string | null;
  }
): Promise<string | null> {
  for (let intento = 0; intento < 5; intento += 1) {
    try {
      const [nuevo] = await db
        .insert(certificados)
        .values({
          ...datos,
          tipo: "ruta",
          codigo: generarCodigo(),
        })
        .onConflictDoNothing({ target: [certificados.userId, certificados.tipo, certificados.rutaId] })
        .returning({ codigo: certificados.codigo });
      return nuevo?.codigo ?? null;
    } catch (error) {
      if (esViolacionUnica(error)) continue;
      throw error;
    }
  }
  throw new Error("no_se_pudo_generar_codigo_certificado");
}

export async function emitirCertificadosDelCaso(db: AppDb, userId: string, casoSlug: string): Promise<CertificadoEmitido[]> {
  const [caso] = await db.select().from(casos).where(eq(casos.slug, casoSlug));
  const [usuario] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId));
  if (!caso || !usuario) return [];

  const nombreAlumno = nombreParaCertificado(usuario);
  const emitidos: CertificadoEmitido[] = [];
  const [inscripcion] = await db
    .select({ completadoEn: casoInscripciones.completadoEn })
    .from(casoInscripciones)
    .where(and(eq(casoInscripciones.userId, userId), eq(casoInscripciones.casoId, caso.id)));

  // Las clases no tienen certificado propio: certifican los casos, que dejan evidencia de trabajo. Sí cuentan para
  // completar la ruta.
  if (inscripcion?.completadoEn && caso.tipo === "caso") {
    const codigo = await insertarCertificadoCaso(db, {
      userId,
      casoId: caso.id,
      nombreAlumno,
      titulo: caso.titulo,
      cargo: caso.cargo,
    });
    if (codigo) emitidos.push({ codigo, tipo: "caso", titulo: caso.titulo });
  }

  const rutasCompletas = await db
    .select({ id: rutas.id, titulo: rutas.titulo, cargo: rutas.cargo })
    .from(rutaCasos)
    .innerJoin(rutas, eq(rutas.id, rutaCasos.rutaId))
    .innerJoin(rutaInscripciones, and(eq(rutaInscripciones.rutaId, rutas.id), eq(rutaInscripciones.userId, userId)))
    .where(and(eq(rutaCasos.casoId, caso.id), isNotNull(rutaInscripciones.completadoEn)));

  for (const ruta of rutasCompletas) {
    const codigo = await insertarCertificadoRuta(db, {
      userId,
      rutaId: ruta.id,
      nombreAlumno,
      titulo: ruta.titulo,
      cargo: ruta.cargo,
    });
    if (codigo) emitidos.push({ codigo, tipo: "ruta", titulo: ruta.titulo });
  }

  return emitidos;
}

export async function buscarCertificado(db: AppDb, codigo: string): Promise<CertificadoPublico | null> {
  const [actual] = await db.select().from(certificados).where(eq(certificados.codigo, codigo));
  if (actual) {
    return {
      codigo: actual.codigo,
      tipo: actual.tipo === "ruta" ? "ruta" : "caso",
      titulo: actual.titulo,
      cargo: actual.cargo,
      nombreAlumno: actual.nombreAlumno,
      emitidoEn: actual.emitidoEn,
      legado: false,
    };
  }

  const [legado] = await db.select().from(certificadosLegacy).where(eq(certificadosLegacy.codigo, codigo));
  if (!legado) return null;
  return {
    codigo: legado.codigo,
    tipo: legado.tipo === "ruta" ? "ruta" : "curso",
    titulo: legado.titulo,
    cargo: null,
    nombreAlumno: legado.nombreAlumno,
    emitidoEn: legado.emitidoEn,
    legado: true,
  };
}

export async function listarCertificados(db: AppDb, userId: string): Promise<CertificadoPublico[]> {
  const filas = await db.select().from(certificados).where(eq(certificados.userId, userId)).orderBy(desc(certificados.emitidoEn));
  return filas.map((fila) => ({
    codigo: fila.codigo,
    tipo: fila.tipo === "ruta" ? "ruta" : "caso",
    titulo: fila.titulo,
    cargo: fila.cargo,
    nombreAlumno: fila.nombreAlumno,
    emitidoEn: fila.emitidoEn,
    legado: false,
  }));
}

export async function certificadosDelCaso(db: AppDb, userId: string, casoSlug: string): Promise<CertificadoEmitido[]> {
  const [caso] = await db.select({ id: casos.id }).from(casos).where(eq(casos.slug, casoSlug));
  if (!caso) return [];
  const rutasDelCaso = (await db.select({ rutaId: rutaCasos.rutaId }).from(rutaCasos).where(eq(rutaCasos.casoId, caso.id))).map((fila) => fila.rutaId);
  const delCaso = eq(certificados.casoId, caso.id);
  const filas = await db
    .select({ codigo: certificados.codigo, tipo: certificados.tipo, titulo: certificados.titulo })
    .from(certificados)
    .where(and(eq(certificados.userId, userId), rutasDelCaso.length > 0 ? or(delCaso, inArray(certificados.rutaId, rutasDelCaso)) : delCaso))
    .orderBy(asc(certificados.emitidoEn));
  return filas.map((fila) => ({ codigo: fila.codigo, tipo: fila.tipo as TipoCertificado, titulo: fila.titulo }));
}
