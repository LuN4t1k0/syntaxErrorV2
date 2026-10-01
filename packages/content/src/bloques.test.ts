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
