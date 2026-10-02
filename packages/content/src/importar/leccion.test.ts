import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { extraerBloques } from "../bloques";
import { corregirTildes, escaparTexto, leccionAMdx, type Leccion } from "./leccion";

const leccion: Leccion = {
  slug: "01-where",
  titulo: "Filtros con WHERE",
  minutos: 14,
  intro: ["WHERE decide qué filas pasan {siempre} y < todas."],
  sintaxis: { lenguaje: "sql", codigo: "SELECT columnas\nFROM tabla\nWHERE condicion;" },
  secciones: [
    { titulo: "Filtrar por texto", parrafos: ["Los textos van entre comillas."], ejemplo: "SELECT nombre FROM estudiantes WHERE ciudad = 'Santiago';" },
    { titulo: "Sin ejemplo", parrafos: ["Solo texto."], ejemplo: null },
  ],
  tarea: {
    tipo: "SqlTask",
    id: "where-filtros",
    enunciado: 'Muestra los de "Santiago".',
    inicial: "SELECT nombre FROM estudiantes;",
    solucion: "SELECT nombre FROM estudiantes WHERE ciudad = 'Santiago';",
    comparar: "filas-sin-orden",
    pistas: ["El filtro va en WHERE."],
  },
  cierre: "WHERE filtra filas.",
};

describe("corregirTildes", () => {
  it("corrige las palabras del diccionario y respeta las mayúsculas", () => {
    expect(corregirTildes("Despues de la leccion tambien hay informacion")).toBe("Después de la lección también hay información");
  });

  it("no toca los valores entre comillas simples ni los nombres de tablas y columnas", () => {
    expect(corregirTildes("Reemplaza NULL por 'Sin inscripcion' en la funcion")).toBe("Reemplaza NULL por 'Sin inscripcion' en la función");
    expect(corregirTildes("La columna codigo y el codigo", new Set(["codigo"]))).toBe("La columna codigo y el codigo");
  });

  it("pasa el voseo a tú y, si se pide, corrige también el texto entre comillas", () => {
    expect(corregirTildes("Segui los pasos: podes elegir, y si queres, hace clic. Lo genera por vos.")).toBe("Sigue los pasos: puedes elegir, y si quieres, haz clic. Lo genera por ti.");
    expect(corregirTildes("Anda a la tienda y seleccioná 'Segmentacion de datos'.", new Set(), { respetarComillas: false })).toBe("Ve a la tienda y selecciona 'Segmentación de datos'.");
  });

  it("«como» y «Para que sirve» solo se corrigen en títulos o preguntas", () => {
    expect(corregirTildes("Como pensarlo sin sufrir")).toBe("Cómo pensarlo sin sufrir");
    expect(corregirTildes("Es como una planilla")).toBe("Es como una planilla");
    expect(corregirTildes("¿como se usa?")).toBe("¿cómo se usa?");
    expect(corregirTildes("Para que sirve en la vida real")).toBe("Para qué sirve en la vida real");
  });
});

describe("leccionAMdx", () => {
  it("escapa lo que MDX leería como código", () => {
    expect(escaparTexto("usa {x} y a < b")).toBe("usa &#123;x&#125; y a &lt; b");
  });

  it("escribe concepto, sintaxis, ejemplos, la tarea y el cierre, y el MDX se puede leer de vuelta", async () => {
    const mdx = leccionAMdx(leccion);
    const archivo = matter(mdx);
    expect(archivo.data).toEqual({ titulo: "Filtros con WHERE", tiempo: 14 });
    const bloques = await extraerBloques(archivo.content);
    expect(bloques.map((bloque) => bloque.tipo)).toEqual(["Concepto", "Sintaxis", "SqlEjemplo", "SqlTask", "Debrief"]);
    const tarea = bloques.find((bloque) => bloque.tipo === "SqlTask");
    expect(tarea?.props).toMatchObject({ id: "where-filtros", enunciado: 'Muestra los de "Santiago".', solucion: "SELECT nombre FROM estudiantes WHERE ciudad = 'Santiago';", pistas: ["El filtro va en WHERE."] });
    expect(mdx).toContain("WHERE decide qué filas pasan &#123;siempre&#125; y &lt; todas.");
  });

  it("sin cierre no escribe Debrief", () => {
    expect(leccionAMdx({ ...leccion, cierre: null })).not.toContain("<Debrief>");
  });
});
