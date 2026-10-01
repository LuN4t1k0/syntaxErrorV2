import { describe, expect, it } from "vitest";
import { analizarMarkdown, describirRequisitoMarkdown, leerRequisito, problemasMarkdown, renderizarMarkdown, revisarMarkdown } from "./markdown";

const README = [
  "# Análisis de despachos",
  "",
  "Revisé los despachos de **marzo** con `SUMAR.SI`.",
  "",
  "## Datos",
  "",
  "- despachos.csv",
  "- comunas.csv",
  "",
  "## Resultados",
  "",
  "1. Maipú tiene más atrasos.",
  "2. Los lunes son el peor día.",
  "",
  "| Comuna | Despachos |",
  "| --- | --- |",
  "| Maipú | 120 |",
  "",
  "Más en [mi perfil](https://github.com/ana) y ![gráfico](https://ejemplo.cl/grafico.png).",
].join("\n");

describe("analizarMarkdown", () => {
  it("cuenta cada elemento", () => {
    expect(analizarMarkdown(README)).toEqual({ titulo: 1, subtitulos: 2, lista: 1, "lista-numerada": 1, tabla: 1, enlace: 1, imagen: 1, negrita: 1, codigo: 1 });
  });

  it("no cuenta lo que parece Markdown dentro de un bloque de código", () => {
    expect(analizarMarkdown("```\n# no es título\n- no es lista\n```")).toMatchObject({ titulo: 0, lista: 0, codigo: 1 });
  });
});

describe("leerRequisito", () => {
  it("lee el elemento y el mínimo", () => {
    expect(leerRequisito("lista")).toEqual({ elemento: "lista", minimo: 1 });
    expect(leerRequisito("subtitulos:3")).toEqual({ elemento: "subtitulos", minimo: 3 });
    expect(() => leerRequisito("parrafo")).toThrow("Requisito de Markdown desconocido: parrafo");
  });
});

describe("revisarMarkdown", () => {
  it("aprueba cuando están todos los requisitos", () => {
    expect(revisarMarkdown(README, ["titulo", "subtitulos:2", "lista", "tabla", "enlace", "imagen"])).toEqual({ aprobada: true, diagnostico: null });
  });

  it("pide escribir algo si está vacío", () => {
    expect(revisarMarkdown("  \n", ["titulo"])).toEqual({ aprobada: false, diagnostico: "Escribe tu Markdown antes de validar." });
  });

  it("explica el título sin espacio después del #", () => {
    expect(revisarMarkdown("#Mi proyecto", ["titulo"]).diagnostico).toBe(
      "Después de los # va un espacio: escribe «# Título», no «#Título». Falta un título principal: una línea que empiece con «# », por ejemplo «# Análisis de despachos»."
    );
  });

  it("dice cuántos subtítulos hay y cuántos faltan", () => {
    expect(revisarMarkdown("# T\n\n## Uno", ["subtitulos:2"]).diagnostico).toBe(
      "Se necesitan 2 subtítulos y hay 1. Faltan subtítulos: cada uno empieza con «## », por ejemplo «## Datos»."
    );
  });

  it("explica la lista sin espacio, la tabla sin separación y la imagen sin !", () => {
    expect(revisarMarkdown("-uno\n-dos", ["lista"]).diagnostico).toMatch(/^Después del guion va un espacio/);
    expect(revisarMarkdown("| a | b |\n| 1 | 2 |", ["tabla"]).diagnostico).toMatch(/^Tu tabla necesita, bajo la fila de encabezados/);
    expect(revisarMarkdown("[gráfico](https://ejemplo.cl/g.png)", ["imagen"]).diagnostico).toMatch(/^Para mostrar una imagen, el enlace lleva un !/);
  });

  it("lista todos los problemas en orden", () => {
    expect(problemasMarkdown("Solo un párrafo.", ["titulo", "lista"])).toHaveLength(2);
  });
});

describe("renderizarMarkdown", () => {
  it("escapa el HTML y no deja enlaces javascript:", () => {
    const html = renderizarMarkdown('<script>alert(1)</script>\n\n[clic](javascript:alert(1))');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('href="javascript:');
  });
});

describe("describirRequisitoMarkdown", () => {
  it("nombra el requisito en español", () => {
    expect(describirRequisitoMarkdown("tabla")).toBe("una tabla");
    expect(describirRequisitoMarkdown("subtitulos:2")).toBe("al menos 2 subtítulos");
  });
});
