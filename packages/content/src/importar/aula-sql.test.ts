import { describe, expect, it } from "vitest";
import { convertirLeccionSql, corregirNombres, datosSql, identificadores, pistaUtil, type AulaV1, type LeccionSqlV1 } from "./aula-sql";

const aula: AulaV1 = {
  datasets: {
    estudiantes: [{ id: 1, nombre: "Tomas Muñoz", ciudad: "Concepcion", codigo: "A1" }],
    cursos: [{ id: 101, titulo: "SQL inicial", nivel: "Basico" }],
  },
  lessons: [],
};

const v1: LeccionSqlV1 = {
  slug: "where-filtros",
  title: "Filtros con WHERE",
  duration: "14 min",
  type: "exercise-select",
  intro: ["WHERE decide que filas pasan.", "Despues se ordena."],
  syntaxExample: "SELECT columnas\nFROM tabla\nWHERE condicion;",
  sections: [
    { heading: "Como pensarlo sin sufrir", body: ["Es como un filtro de la tabla codigo."], code: null },
    { heading: "Filtrar por texto", body: ["Compara con 'Concepcion'."], code: "SELECT nombre FROM estudiantes WHERE ciudad = 'Concepcion';" },
  ],
  starter: "SELECT nombre FROM estudiantes;",
  expected: "SELECT nombre FROM estudiantes WHERE ciudad = 'Concepcion' ORDER BY nombre;",
  prompt: "Muestra los estudiantes de Concepcion, en orden alfabetico.",
  explanation: "WHERE filtra y ORDER BY ordena despues.",
  hint: "Usa WHERE ciudad = 'Concepcion' ORDER BY nombre en un SELECT nombre FROM estudiantes.",
};

describe("convertirLeccionSql", () => {
  it("convierte una lección de consulta: tildes en el texto, nombres corregidos en todas partes y la tabla como identificador", () => {
    const leccion = convertirLeccionSql(v1, 3, identificadores(aula));
    expect(leccion).toMatchObject({
      slug: "03-where-filtros",
      titulo: "Filtros con WHERE",
      minutos: 14,
      intro: ["WHERE decide que filas pasan.", "Después se ordena."],
      sintaxis: { lenguaje: "sql", codigo: v1.syntaxExample },
      cierre: "WHERE filtra y ORDER BY ordena después.",
    });
    expect(leccion.secciones[0]).toEqual({ titulo: "Cómo pensarlo sin sufrir", parrafos: ["Es como un filtro de la tabla codigo."], ejemplo: null });
    expect(leccion.secciones[1].ejemplo).toBe("SELECT nombre FROM estudiantes WHERE ciudad = 'Concepción';");
    expect(leccion.tarea).toEqual({
      tipo: "SqlTask",
      id: "where-filtros",
      enunciado: "Muestra los estudiantes de Concepción, en orden alfabético.",
      inicial: "SELECT nombre FROM estudiantes;",
      solucion: "SELECT nombre FROM estudiantes WHERE ciudad = 'Concepción' ORDER BY nombre;",
      comparar: "filas-en-orden",
      pistas: [],
    });
  });

  it("sin ORDER BY compara sin importar el orden; una lección que no es de consulta no se importa", () => {
    const sinOrden = convertirLeccionSql({ ...v1, expected: "SELECT nombre FROM estudiantes;" }, 1, new Set());
    expect(sinOrden.tarea).toMatchObject({ comparar: "filas-sin-orden" });
    expect(() => convertirLeccionSql({ ...v1, type: "exercise-dml" }, 1, new Set())).toThrow("solo importa SELECT");
  });
});

describe("pistaUtil", () => {
  it("descarta las pistas que traen la consulta completa o casi", () => {
    expect(pistaUtil("Usa SELECT nombre FROM estudiantes.", "SELECT nombre FROM estudiantes;")).toEqual([]);
    expect(pistaUtil("select nombre   from estudiantes", "SELECT nombre FROM estudiantes;")).toEqual([]);
    expect(pistaUtil("Necesitas dos condiciones unidas por AND.", "SELECT 1;")).toEqual(["Necesitas dos condiciones unidas por AND."]);
    expect(pistaUtil(undefined, "SELECT 1;")).toEqual([]);
  });
});

describe("datos", () => {
  it("corrige los nombres propios de los datos de práctica y nombra cada tabla", () => {
    expect(corregirNombres("Tomas vive en Concepcion")).toBe("Tomás vive en Concepción");
    expect(datosSql(aula, ["estudiantes"])).toEqual({ estudiantes: [{ id: 1, nombre: "Tomás Muñoz", ciudad: "Concepción", codigo: "A1" }] });
    expect(() => datosSql(aula, ["profesores"])).toThrow("El aula no tiene la tabla profesores");
    expect(identificadores(aula)).toEqual(new Set(["estudiantes", "id", "nombre", "ciudad", "codigo", "cursos", "titulo", "nivel"]));
  });
});
