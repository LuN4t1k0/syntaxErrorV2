import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cargarContenido } from "./cargar";
import { revisarIntentos } from "./intentos";
import { crearRevisorPythonNode } from "./revisor-python";
import { validarContenido } from "./validar";

const CONTENIDO = fileURLToPath(new URL("../../../content", import.meta.url));

describe("content/ del repositorio", () => {
  it("es válido, incluidas las soluciones de Python", async () => {
    const contenido = await cargarContenido(CONTENIDO);
    expect(await validarContenido(contenido, { revisarPython: crearRevisorPythonNode() })).toEqual([]);
  }, 180_000);

  // Cada error típico guardado en casos/*/intentos.yaml tiene que seguir reprobando con un mensaje que lo explique.
  it("cada intento equivocado de intentos.yaml reprueba y recibe su mensaje", async () => {
    const contenido = await cargarContenido(CONTENIDO);
    const { resultados, problemas } = await revisarIntentos(contenido, CONTENIDO, { revisarPython: crearRevisorPythonNode() });
    expect(problemas).toEqual([]);
    const fallidos = resultados.filter((resultado) => !resultado.ok).map((r) => `${r.caso}/${r.mision}: se esperaba «${r.espera}» y se obtuvo ${r.aprobada ? "APRUEBA" : `«${r.diagnostico}»`}`);
    expect(fallidos).toEqual([]);
  }, 300_000);
});
