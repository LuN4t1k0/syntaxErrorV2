import { describe, expect, it } from "vitest";
import type { Caso, Ruta } from "@syntaxerror/content/tipos";
import { buscar } from "./buscar";
import { construirIndice } from "./indice";

const RUTA: Ruta = {
  slug: "data-analyst",
  titulo: "Data Analyst",
  cargo: "Analista de datos junior",
  descripcion: "Resuelve casos reales con SQL.",
  estado: "publicada",
  casos: ["ventas"],
  tecnologias: [],
};

const CASO = {
  slug: "ventas",
  titulo: "Ventas de marzo",
  cargo: "Analista de datos junior",
  empresa: "Distribuidora Los Andes",
  dataset: "Clientes y ventas",
  entregable: "Un repositorio con la consulta",
  datos: [],
  misiones: [
    {
      slug: "01-clientes",
      titulo: "Clientes de regiones",
      tiempo: 10,
      fuente: "",
      bloques: [
        { tipo: "Brief", props: { de: "Paula" }, texto: "Necesito los clientes de fuera de Santiago." },
        { tipo: "Concepto", props: {}, texto: "WHERE filtra filas." },
        {
          tipo: "SqlTask",
          props: {
            id: "t1",
            enunciado: "Trae nombre y ciudad.",
            inicial: "",
            solucion: "SELECT zzsolucionsecreta FROM clientes",
            comparar: "filas-sin-orden",
            pistas: ["usa pistasecreta"],
          },
          texto: null,
        },
        { tipo: "Debrief", props: { entrevista: "preguntaentrevista" }, texto: "cierrerevelador con la respuesta" },
      ],
    },
  ],
} as unknown as Caso;

const CLASES = {
  slug: "clases-de-sql",
  tipo: "clases",
  titulo: "Clases de SQL",
  cargo: "Analista de datos junior",
  empresa: "syntaxError.cl",
  dataset: "Tablas de práctica",
  entregable: "",
  datos: [],
  misiones: [
    {
      slug: "01-que-es-sql",
      titulo: "Qué es SQL",
      tiempo: 10,
      fuente: "",
      bloques: [
        { tipo: "LecturaTask", props: { id: "l1", pregunta: "¿Para qué sirve una base relacional?", respuesta: "respuestasecreta", pistas: [] }, texto: null },
        {
          tipo: "QuizTask",
          props: {
            id: "q1",
            enunciado: "Responde sobre las llaves.",
            preguntas: [{ pregunta: "¿Qué identifica una fila?", opciones: ["opcionsecreta", "otra"], correcta: 0, explicacion: "explicacionsecreta" }],
            pistas: [],
          },
          texto: null,
        },
      ],
    },
  ],
} as unknown as Caso;

describe("construirIndice", () => {
  it("indexa rutas, casos y misiones con sus enlaces", () => {
    const indice = construirIndice([RUTA], [CASO]);
    expect(indice.map(({ tipo, titulo, contexto, href }) => ({ tipo, titulo, contexto, href }))).toEqual([
      { tipo: "ruta", titulo: "Data Analyst", contexto: "Analista de datos junior", href: "/rutas/data-analyst" },
      { tipo: "caso", titulo: "Ventas de marzo", contexto: "Distribuidora Los Andes · Analista de datos junior", href: "/casos/ventas" },
      { tipo: "mision", titulo: "Clientes de regiones", contexto: "Ventas de marzo", href: "/casos/ventas/01-clientes" },
    ]);
  });

  it("busca en el encargo, los conceptos y los enunciados, pero nunca en soluciones, pistas ni el cierre", () => {
    const indice = construirIndice([RUTA], [CASO]);
    expect(buscar(indice, "fuera de santiago").map((resultado) => resultado.titulo)).toEqual(["Clientes de regiones"]);
    expect(buscar(indice, "where filtra").map((resultado) => resultado.titulo)).toEqual(["Clientes de regiones"]);
    expect(buscar(indice, "nombre y ciudad").map((resultado) => resultado.titulo)).toEqual(["Clientes de regiones"]);
    for (const secreto of ["zzsolucionsecreta", "pistasecreta", "cierrerevelador", "preguntaentrevista"]) {
      expect(buscar(indice, secreto)).toEqual([]);
    }
  });

  it("marca las lecciones de unas clases como lecciones y busca en las preguntas de lecturas y quizzes, sin sus respuestas", () => {
    const indice = construirIndice([RUTA], [CLASES]);
    expect(indice.at(-1)).toMatchObject({ tipo: "leccion", titulo: "Qué es SQL", contexto: "Clases de SQL", href: "/casos/clases-de-sql/01-que-es-sql" });
    expect(buscar(indice, "base relacional").map((resultado) => resultado.titulo)).toEqual(["Qué es SQL"]);
    expect(buscar(indice, "identifica una fila").map((resultado) => resultado.titulo)).toEqual(["Qué es SQL"]);
    expect(buscar(indice, "llaves").map((resultado) => resultado.titulo)).toEqual(["Qué es SQL"]);
    for (const secreto of ["respuestasecreta", "opcionsecreta", "explicacionsecreta"]) {
      expect(buscar(indice, secreto)).toEqual([]);
    }
  });
});
