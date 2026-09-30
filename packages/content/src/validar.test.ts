import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cargarContenido } from "./cargar";
import { validarContenido, type RevisorPython } from "./validar";

const FIXTURE = fileURLToPath(new URL("../test/fixtures/valido", import.meta.url));
const aprueba: RevisorPython = async () => ({ aprobada: true, diagnostico: null });

describe("validarContenido", () => {
  it("el fixture no tiene problemas", async () => {
    expect(await validarContenido(await cargarContenido(FIXTURE), { revisarPython: aprueba })).toEqual([]);
  });
});
