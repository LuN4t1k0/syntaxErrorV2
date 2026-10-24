import { describe, expect, it } from "vitest";
import type { Caso, Mision } from "@syntaxerror/content/tipos";
import { herramientaDelCaso, iniciales, minutosEstimados, resumenCaso, resumenLeccion } from "./contenido";

const mision = (bloques: { tipo: string; props: object; texto: string | null }[], tiempo = 10) =>
  ({ slug: "m", titulo: "M", tiempo, sinGuia: false, fuente: "", bloques }) as unknown as Mision;

const clases = (misiones: Mision[]) =>
  ({ tipo: "clases", slug: "clases-de-sql", titulo: "Clases de SQL", cargo: "", empresa: "", dataset: "estudiantes y cursos", entregable: "", archivos: [], misiones, datos: [] }) as unknown as Caso;

describe("resumenLeccion", () => {
  it("toma la primera frase del concepto", () => {
    const leccion = mision([{ tipo: "Concepto", props: {}, texto: "Una consulta puede calcular valores. Nada cambia la tabla." }]);
    expect(resumenLeccion(leccion)).toBe("Una consulta puede calcular valores.");
  });

  it("sin concepto no inventa nada", () => {
    expect(resumenLeccion(mision([]))).toBeNull();
  });
});

describe("resumenCaso", () => {
  it("describe unas clases por sus datos y un caso por su cargo y entregable", () => {
    expect(resumenCaso(clases([]))).toBe("Practica con datos de estudiantes y cursos.");
    const caso = { ...clases([]), tipo: "caso", cargo: "Analista junior", empresa: "Minimarkets del Sur", entregable: "Un repositorio con tus consultas" } as Caso;
    expect(resumenCaso(caso)).toBe("Analista junior en Minimarkets del Sur: un repositorio con tus consultas.");
  });
});

describe("minutosEstimados", () => {
  it("suma el tiempo de cada misión", () => {
    expect(minutosEstimados(clases([mision([], 12), mision([], 20)]))).toBe(32);
  });
});

describe("herramientaDelCaso", () => {
  it("elige la herramienta con más tareas", () => {
    const sql = { tipo: "SqlTask", props: {}, texto: null };
    const planilla = { tipo: "SheetTask", props: {}, texto: null };
    expect(herramientaDelCaso(clases([mision([sql, sql]), mision([planilla])]))).toBe("sql");
    expect(herramientaDelCaso(clases([mision([])]))).toBe("caso");
  });
});

describe("iniciales", () => {
  it("usa las dos primeras palabras", () => {
    expect(iniciales("Data Analyst")).toBe("DA");
    expect(iniciales("IA aplicada a datos")).toBe("IA");
  });
});
