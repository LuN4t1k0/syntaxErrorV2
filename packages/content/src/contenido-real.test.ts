import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cargarContenido } from "./cargar";
import { crearRevisorPythonNode } from "./revisor-python";
import { validarContenido } from "./validar";

const CONTENIDO = fileURLToPath(new URL("../../../content", import.meta.url));

describe("content/ del repositorio", () => {
  it("es válido, incluidas las soluciones de Python", async () => {
    const contenido = await cargarContenido(CONTENIDO);
    expect(await validarContenido(contenido, { revisarPython: crearRevisorPythonNode() })).toEqual([]);
  }, 180_000);
});
