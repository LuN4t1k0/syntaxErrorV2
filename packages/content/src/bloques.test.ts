import { describe, expect, it } from "vitest";
import { compilarMision, extraerBloques } from "./bloques";

const fuente = `<Brief de="Paula">Necesito los clientes **fuera** de Santiago.</Brief>

<Concepto>
WHERE filtra filas.

<SqlEjemplo consulta="SELECT * FROM clientes" />
</Concepto>

<SqlTask id="filtro" solucion="SELECT 1" comparar="filas-en-orden" pistas={["Usa WHERE", "Otra"]} />
`;

describe("extraerBloques", () => {
  it("devuelve cada bloque con sus props, en orden de aparición", async () => {
    const bloques = await extraerBloques(fuente);
    expect(bloques.map((bloque) => bloque.tipo)).toEqual(["Brief", "Concepto", "SqlEjemplo", "SqlTask"]);
    expect(bloques[3].props).toEqual({
      id: "filtro",
      solucion: "SELECT 1",
      comparar: "filas-en-orden",
      pistas: ["Usa WHERE", "Otra"],
    });
  });

  it("guarda el texto plano de los hijos", async () => {
    const [brief] = await extraerBloques(fuente);
    expect(brief).toEqual({ tipo: "Brief", props: { de: "Paula" }, texto: "Necesito los clientes fuera de Santiago." });
  });

  it("falla con un componente desconocido", async () => {
    await expect(extraerBloques("<Grafico />")).rejects.toThrow(/Grafico/);
  });

  it("falla con un error de sintaxis", async () => {
    await expect(extraerBloques('<SqlTask id="x"')).rejects.toThrow();
  });
});

describe("compilarMision", () => {
  it("devuelve un componente", async () => {
    expect(typeof (await compilarMision("# Hola"))).toBe("function");
  });
});

describe("tareas de Markdown y GitHub", () => {
  it("leen sus requisitos y rechazan los desconocidos", async () => {
    const [markdown, github] = await extraerBloques(
      '<MarkdownTask id="readme" requisitos={["titulo", "subtitulos:2"]} solucion="# Hola" />\n\n<GithubTask id="repo" repositorio="{usuario}/{usuario}" requisitos={["publico", "readme:enlace", "commits:3"]} />'
    );
    expect(markdown.props).toEqual({ id: "readme", requisitos: ["titulo", "subtitulos:2"], solucion: "# Hola" });
    expect(github.props).toEqual({ id: "repo", repositorio: "{usuario}/{usuario}", requisitos: ["publico", "readme:enlace", "commits:3"] });
    const { bloqueSchemas } = await import("./esquemas");
    expect(bloqueSchemas.MarkdownTask.safeParse({ id: "x", requisitos: ["parrafo"], solucion: "a" }).success).toBe(false);
    expect(bloqueSchemas.GithubTask.safeParse({ id: "x", requisitos: ["readme:parrafo"] }).success).toBe(false);
    expect(bloqueSchemas.GithubTask.safeParse({ id: "x", repositorio: "ana/repo", requisitos: ["publico"] }).success).toBe(false);
    expect(bloqueSchemas.GithubTask.safeParse({ id: "x", requisitos: ["carpeta:datos", "extension:.csv", "nombres-limpios", "readme"] }).success).toBe(true);
  });
});

describe("tareas de planilla con varias hojas", () => {
  it("aceptan hojas de consulta, celdas iniciales y soluciones con rangos de una columna", async () => {
    const { bloqueSchemas } = await import("./esquemas");
    const base = { id: "x", hoja: "despachos", celdas: [{ celda: "I2", valor: 1 }] };
    const tarea = bloqueSchemas.SheetTask.parse({ ...base, otras: ["comunas"], inicial: { K2: 0.19, "I2:I10": "=1" }, solucion: { "I2:I63": "=G2" } });
    expect(tarea).toMatchObject({ otras: ["comunas"], inicial: { K2: 0.19, "I2:I10": "=1" } });
    expect(bloqueSchemas.SheetTask.parse({ ...base, solucion: { I2: "=1" } })).toMatchObject({ otras: [], inicial: {} });
    expect(bloqueSchemas.SheetTask.safeParse({ ...base, solucion: { i2: "=1" } }).success).toBe(false);
    expect(bloqueSchemas.SheetTask.safeParse({ ...base, otras: ["Comunas"], solucion: { I2: "=1" } }).success).toBe(false);
  });

  it("la planilla viene de un CSV (hoja) o escrita en la lección (grilla), una de las dos", async () => {
    const { bloqueSchemas } = await import("./esquemas");
    const base = { id: "x", celdas: [{ celda: "B3", valor: 310000 }], solucion: { B3: 310000 } };
    expect(bloqueSchemas.SheetTask.parse({ ...base, grilla: [["vendedor", "monto"], ["Diego", null]] })).toMatchObject({ grilla: [["vendedor", "monto"], ["Diego", null]] });
    expect(bloqueSchemas.SheetTask.safeParse(base).success).toBe(false);
    expect(bloqueSchemas.SheetTask.safeParse({ ...base, hoja: "ventas", grilla: [["a"]] }).success).toBe(false);
  });
});

describe("lecturas", () => {
  it("tienen una pregunta y la respuesta del curso", async () => {
    const { bloqueSchemas } = await import("./esquemas");
    expect(bloqueSchemas.LecturaTask.parse({ id: "x", pregunta: "¿Excel o una base?", respuesta: "Una base." })).toEqual({ id: "x", pregunta: "¿Excel o una base?", respuesta: "Una base.", pistas: [] });
    expect(bloqueSchemas.LecturaTask.safeParse({ id: "x", pregunta: "¿Excel o una base?" }).success).toBe(false);
  });
});
