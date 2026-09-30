import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casoInscripciones, casos, entregables, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { emitirCertificadosDelCaso } from "@/lib/certificados/servicio";
import { SIN_META } from "@/lib/cuenta/meta";
import { actualizarPortafolio, obtenerPortafolio, sugerirUsuario } from "./portafolio";

const { db, close } = createTestDb();

async function crearUsuaria(email = "ana@correo.cl", nombre: string | null = "Ana Rojas") {
  const [usuario] = await db.insert(users).values({ email, name: nombre }).returning({ id: users.id });
  return usuario.id;
}

async function crearCaso(slug: string, titulo: string) {
  const [caso] = await db
    .insert(casos)
    .values({ slug, titulo, cargo: "Analista de datos junior", empresa: "Distribuidora Los Andes", entregable: "Repo", misiones: [] })
    .returning({ id: casos.id });
  return caso.id;
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("sugerirUsuario", () => {
  it("arma un usuario válido desde el nombre o el email", () => {
    expect(sugerirUsuario("Camila Rojas", "c@correo.cl")).toBe("camila-rojas");
    expect(sugerirUsuario("José Pérez Muñoz", "j@correo.cl")).toBe("jose-perez-munoz");
    expect(sugerirUsuario(null, "valentina.m@correo.cl")).toBe("valentina-m");
    expect(sugerirUsuario(null, "an@correo.cl")).toBe("an-cl");
  });
});

describe("actualizarPortafolio", () => {
  it("pide un usuario para publicar y valida su formato", async () => {
    const id = await crearUsuaria();
    expect(await actualizarPortafolio(db, id, { publico: true }, SIN_META)).toEqual({ ok: false, motivo: "usuario_requerido" });
    expect(await actualizarPortafolio(db, id, { publico: true, usuario: "Ana Rojas" }, SIN_META)).toEqual({
      ok: false,
      motivo: "usuario_invalido",
    });
    expect(await actualizarPortafolio(db, id, { publico: true, usuario: " Ana-Rojas " }, SIN_META)).toEqual({
      ok: true,
      usuario: "ana-rojas",
    });
  });

  it("no deja tomar un usuario ajeno", async () => {
    const ana = await crearUsuaria();
    const otra = await crearUsuaria("otra@correo.cl", "Otra");
    await actualizarPortafolio(db, ana, { publico: true, usuario: "ana-rojas" }, SIN_META);
    expect(await actualizarPortafolio(db, otra, { publico: true, usuario: "ana-rojas" }, SIN_META)).toEqual({
      ok: false,
      motivo: "usuario_en_uso",
    });
  });

  it("despublicar conserva el usuario elegido", async () => {
    const id = await crearUsuaria();
    await actualizarPortafolio(db, id, { publico: true, usuario: "ana-rojas" }, SIN_META);
    expect(await actualizarPortafolio(db, id, { publico: false }, SIN_META)).toEqual({ ok: true, usuario: "ana-rojas" });
    expect(await obtenerPortafolio(db, "ana-rojas")).toBeNull();
  });
});

describe("obtenerPortafolio", () => {
  it("muestra solo los casos completos, con su entregable y sus certificados", async () => {
    const id = await crearUsuaria();
    const completo = await crearCaso("ventas", "Ventas de marzo");
    const enCurso = await crearCaso("clientes", "Clientes de regiones");
    await db.insert(casoInscripciones).values([
      { userId: id, casoId: completo, completadoEn: new Date() },
      { userId: id, casoId: enCurso },
    ]);
    await db.insert(entregables).values({ userId: id, casoId: completo, url: "https://github.com/ana/ventas" });
    await emitirCertificadosDelCaso(db, id, "ventas");
    await actualizarPortafolio(db, id, { publico: true, usuario: "ana-rojas" }, SIN_META);

    const portafolio = await obtenerPortafolio(db, "Ana-Rojas");
    expect(portafolio).toMatchObject({ nombre: "Ana Rojas", usuario: "ana-rojas" });
    expect(portafolio?.casos.map((caso) => [caso.titulo, caso.entregable])).toEqual([
      ["Ventas de marzo", "https://github.com/ana/ventas"],
    ]);
    expect(portafolio?.certificados).toHaveLength(1);
  });

  it("un portafolio privado o inexistente no se muestra", async () => {
    const id = await crearUsuaria();
    await actualizarPortafolio(db, id, { publico: false, usuario: "ana-rojas" }, SIN_META);
    expect(await obtenerPortafolio(db, "ana-rojas")).toBeNull();
    expect(await obtenerPortafolio(db, "nadie")).toBeNull();
  });
});
