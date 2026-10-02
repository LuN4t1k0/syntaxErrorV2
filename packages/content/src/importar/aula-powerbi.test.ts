import { describe, expect, it } from "vitest";
import { columnasDeDatasets, convertirLeccionPowerBi, type LeccionPowerBiV1 } from "./aula-powerbi";
import { leccionAMdx } from "./leccion";

const practica: LeccionPowerBiV1 = {
  slug: "instalar-y-conectar-datos",
  title: "Instalar Power BI y conectar datos",
  duration: "10 min",
  type: "practice",
  intro: ["En esta leccion conectas tu primer CSV."],
  sections: [{ heading: "El lenguaje M", body: ["El editor genera el M por vos."], code: '= Table.SelectRows(ventas, each [region] = "norte")' }],
  prompt: "Segui los pasos y despues confirma cuantas columnas tiene la tabla.",
  practiceSteps: ["En la pestana Inicio, hace clic en 'Obtener datos'.", "Verifica las columnas fecha, producto, region y monto."],
  datasetFile: "ventas.csv",
  selfCheck: { question: "Cuantas columnas tiene la tabla ventas?", answer: "4 columnas." },
};

describe("convertirLeccionPowerBi", () => {
  it("una práctica lleva sus pasos y su dataset al concepto, y la autocorrección pasa a LecturaTask", () => {
    const leccion = convertirLeccionPowerBi(practica, 2, "clases-de-power-bi", columnasDeDatasets({ "ventas.csv": "fecha,producto,region,monto\n" }));
    expect(leccion).toMatchObject({
      slug: "02-instalar-y-conectar-datos",
      intro: ["En esta lección conectas tu primer CSV."],
      practica: {
        enunciado: "Sigue los pasos y después confirma cuantas columnas tiene la tabla.",
        pasos: ["En la pestaña Inicio, haz clic en 'Obtener datos'.", "Verifica las columnas fecha, producto, region y monto."],
        datos: { nombre: "ventas.csv", enlace: "/casos/clases-de-power-bi/datos/ventas.csv" },
      },
      tarea: { tipo: "LecturaTask", id: "instalar-y-conectar-datos", pregunta: "Cuantas columnas tiene la tabla ventas?", respuesta: "4 columnas." },
    });
    expect(leccion.secciones[0]).toMatchObject({ parrafos: ["El editor genera el M por ti."], codigo: practica.sections?.[0].code, lenguaje: "text" });
  });

  it("el MDX trae la práctica numerada con el enlace al dataset, y el código de M sin ejecutar", () => {
    const mdx = leccionAMdx(convertirLeccionPowerBi(practica, 2, "clases-de-power-bi"));
    expect(mdx).toContain("[ventas.csv](/casos/clases-de-power-bi/datos/ventas.csv)");
    expect(mdx).toContain("1. En la pestaña Inicio, haz clic en 'Obtener datos'.\n2. Verifica");
    expect(mdx).toContain('```text\n= Table.SelectRows(ventas, each [region] = "norte")\n```');
    expect(mdx).toContain("<LecturaTask");
  });

  it("una lectura pasa a LecturaTask; una práctica sin autocorrección no se importa", () => {
    const lectura = convertirLeccionPowerBi({ slug: "que-es", title: "Que es Power BI", duration: "6 min", type: "reading", prompt: "Que instalarias?", explanation: "Desktop." }, 1, "clases");
    expect(lectura.tarea).toEqual({ tipo: "LecturaTask", id: "que-es", pregunta: "Que instalarias?", respuesta: "Desktop." });
    expect(lectura.practica).toBeUndefined();
    expect(() => convertirLeccionPowerBi({ ...practica, selfCheck: undefined }, 1, "clases")).toThrow("no tiene enunciado, pasos o autocorrección");
  });
});
