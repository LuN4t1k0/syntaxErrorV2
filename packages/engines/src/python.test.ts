import { readFileSync } from "node:fs";
import { loadPyodide } from "pyodide";
import { beforeAll, describe, expect, it } from "vitest";
import { crearSesionPython, PYODIDE_VERSION, type SesionPython, type TareaPython } from "./python";

let sesion: SesionPython;

beforeAll(async () => {
  const py = await loadPyodide();
  sesion = await crearSesionPython(py, {
    paquetes: [],
    archivos: [{ ruta: "datos/ventas.csv", contenido: "id,monto\n1,100\n2,250\n" }],
  });
}, 120_000);

const totalTarea: TareaPython = {
  preparacion: "precio = 450000\nstock = 3",
  pruebas: 'assert total == 1350000, "total debe ser el precio por el stock"',
};

describe("crearSesionPython", () => {
  it("la versión del CDN coincide con la de pyodide instalada", () => {
    const paquete = JSON.parse(
      readFileSync(new URL("../node_modules/pyodide/package.json", import.meta.url), "utf8")
    ) as { version: string };
    expect(paquete.version).toBe(PYODIDE_VERSION);
  });

  it("ejecutar devuelve lo impreso", async () => {
    expect(await sesion.ejecutar("", 'print("hola")')).toEqual({ ok: true, salida: "hola" });
  });

  it("deja los archivos del caso disponibles con ruta relativa", async () => {
    const resultado = await sesion.ejecutar("", 'print(open("datos/ventas.csv").read().splitlines()[1])');
    expect(resultado).toEqual({ ok: true, salida: "1,100" });
  });

  it("aprueba cuando pasan las pruebas", async () => {
    expect(await sesion.revisar(totalTarea, "total = precio * stock")).toEqual({
      aprobada: true,
      diagnostico: null,
      salida: "",
    });
  });

  it("muestra el mensaje del assert que falla", async () => {
    const resultado = await sesion.revisar(totalTarea, "total = precio + stock");
    expect(resultado.diagnostico).toBe("total debe ser el precio por el stock");
  });

  it("da un mensaje genérico si el assert no tiene mensaje", async () => {
    const resultado = await sesion.revisar({ preparacion: "", pruebas: "assert total == 1" }, "total = 2");
    expect(resultado.diagnostico).toBe("Una prueba no pasó. Revisa el resultado de tu código.");
  });

  it("informa el error de sintaxis del alumno", async () => {
    const resultado = await sesion.revisar(totalTarea, "total = (");
    expect(resultado.diagnostico).toMatch(/^Tu código tiene un error: SyntaxError/);
  });

  it("no arrastra variables de una ejecución anterior", async () => {
    await sesion.ejecutar("", "total = 1350000");
    const resultado = await sesion.revisar(totalTarea, "x = 1");
    expect(resultado.diagnostico).toBe("Falta algo: NameError: name 'total' is not defined");
  });
});
