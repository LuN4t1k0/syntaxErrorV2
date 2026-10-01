import { describe, expect, it } from "vitest";
import { completarPython, completarSql, variablesDe, type DatosPython } from "./completado";

const esquema = { clientes: ["id", "nombre", "ciudad"], ventas: ["id", "cliente_id", "monto"] };
const etiquetas = (resultado: ReturnType<typeof completarSql>) => resultado?.opciones.map((opcion) => opcion.label);

describe("completarSql", () => {
  it("sugiere tablas, columnas, palabras clave y funciones del caso", () => {
    const texto = "SELECT * FROM cli";
    const resultado = completarSql(texto, texto.length, esquema);
    expect(resultado?.desde).toBe(14);
    expect(resultado?.opciones).toContainEqual({ label: "clientes", type: "class", detail: "tabla del caso" });
    expect(resultado?.opciones).toContainEqual({ label: "id", type: "property", detail: "columna de clientes, ventas" });
    expect(resultado?.opciones.find((opcion) => opcion.label === "GROUP BY")).toMatchObject({ type: "keyword", info: expect.stringContaining("GROUP BY") });
    expect(resultado?.opciones.find((opcion) => opcion.label === "COUNT")).toMatchObject({ type: "function" });
  });

  it("después de una tabla o alias con punto, sugiere solo sus columnas", () => {
    expect(completarSql("SELECT v. FROM ventas v", 9, esquema)).toEqual({
      desde: 9,
      opciones: [
        { label: "id", type: "property", detail: "columna de ventas" },
        { label: "cliente_id", type: "property", detail: "columna de ventas" },
        { label: "monto", type: "property", detail: "columna de ventas" },
      ],
    });
    expect(etiquetas(completarSql("SELECT c.no FROM clientes AS c", 11, esquema))).toEqual(["id", "nombre", "ciudad"]);
    expect(completarSql("SELECT clientes.no", 18, esquema)?.desde).toBe(16);
    expect(completarSql("SELECT x.", 9, esquema)).toBeNull();
  });

  it("no sugiere dentro de un texto ni sin haber escrito nada", () => {
    expect(completarSql("WHERE ciudad = 'San", 19, esquema)).toBeNull();
    expect(completarSql("SELECT ", 7, esquema)).toBeNull();
  });
});

const datos: DatosPython = { columnas: ["id", "fecha", "monto"], archivos: ["datos/ventas.csv"], variables: ["pd", "ventas"] };

describe("completarPython", () => {
  it("dentro de corchetes con comillas sugiere las columnas", () => {
    const texto = 'ventas["mo';
    expect(completarPython(texto, texto.length, datos)).toEqual({
      desde: texto.length - 2,
      opciones: [
        { label: "id", type: "property", detail: "columna de los datos" },
        { label: "fecha", type: "property", detail: "columna de los datos" },
        { label: "monto", type: "property", detail: "columna de los datos" },
      ],
    });
  });

  it("dentro de read_csv sugiere los archivos del caso", () => {
    const texto = "pd.read_csv('da";
    expect(completarPython(texto, texto.length, datos)).toEqual({ desde: texto.length - 2, opciones: [{ label: "datos/ventas.csv", type: "text", detail: "archivo del caso" }] });
  });

  it("después de un punto sugiere métodos de pandas con su explicación", () => {
    const texto = "ventas.gro";
    const resultado = completarPython(texto, texto.length, datos);
    expect(resultado?.desde).toBe(7);
    expect(resultado?.opciones).toContainEqual({ label: "groupby", type: "method", detail: "agrupar por columna", info: expect.stringContaining("agrupa") });
  });

  it("al escribir un nombre sugiere variables del caso, las propias, palabras y funciones", () => {
    const texto = "total = 1\nto";
    const resultado = completarPython(texto, texto.length, datos);
    expect(resultado?.desde).toBe(10);
    expect(resultado?.opciones).toContainEqual({ label: "ventas", type: "variable", detail: "variable del caso" });
    expect(resultado?.opciones).toContainEqual({ label: "total", type: "variable", detail: "tu variable" });
    expect(resultado?.opciones.find((opcion) => opcion.label === "print")).toMatchObject({ type: "function" });
    expect(resultado?.opciones.find((opcion) => opcion.label === "def")).toMatchObject({ type: "keyword" });
  });

  it("no sugiere en comentarios ni en textos que no son columnas ni archivos", () => {
    expect(completarPython("# ven", 5, datos)).toBeNull();
    expect(completarPython('print("hol', 10, datos)).toBeNull();
  });
});

describe("variablesDe", () => {
  it("encuentra asignaciones e imports con alias, en orden y sin repetir", () => {
    expect(variablesDe('import pandas as pd\nventas = pd.read_csv("x")\nif ventas.empty == False:\n    total = 2\nventas = ventas.head()')).toEqual(["pd", "ventas", "total"]);
  });
});
