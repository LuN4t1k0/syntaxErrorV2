import { describe, expect, it } from "vitest";
import { convertirLeccionIa, type MejoraIaV1 } from "./aula-ia";
import { leccionAMdx } from "./leccion";

const v1 = { slug: "calidad-de-datos", title: "Calidad de datos", objective: "Reconocer problemas antes de analizar.", explanation: ["La calidad de datos determina el resultado."] };
const mejora: MejoraIaV1 = {
  concepts: ["Duplicado: registro repetido.", "Valor faltante: dato que no esta informado."],
  caseStudy: "La categoria 'Ventas' aparece como Ventas, venta y Vtas.",
  activity: { questions: [{ question: "Que causa una categoria mezclada?", options: ["Conteos incorrectos.", "Mas precision."], answerIndex: 0, explanation: "Se cuenta por separado." }], hint: "Revisa las categorias." },
};

describe("convertirLeccionIa", () => {
  it("lleva el objetivo, los conceptos y el caso al concepto, y el quiz a un QuizTask", () => {
    const leccion = convertirLeccionIa(v1, mejora, 3);
    expect(leccion).toMatchObject({ slug: "03-calidad-de-datos", minutos: 10, intro: ["**Objetivo:** Reconocer problemas antes de analizar.", "La calidad de datos determina el resultado."] });
    expect(leccion.secciones).toEqual([
      { titulo: "Conceptos clave", parrafos: [], ejemplo: null, lista: ["Duplicado: registro repetido.", "Valor faltante: dato que no esta informado."] },
      { titulo: "Un caso", parrafos: ["La categoría 'Ventas' aparece como Ventas, venta y Vtas."], ejemplo: null },
    ]);
    expect(leccion.tarea).toEqual({
      tipo: "QuizTask",
      id: "calidad-de-datos",
      preguntas: [{ pregunta: "Que causa una categoría mezclada?", opciones: ["Conteos incorrectos.", "Mas precisión."], correcta: 0, explicacion: "Se cuenta por separado." }],
      pistas: ["Revisa las categorías."],
    });
  });

  it("el MDX trae la lista de conceptos y el quiz; una lección sin quiz no se importa", () => {
    const mdx = leccionAMdx(convertirLeccionIa(v1, mejora, 3));
    expect(mdx).toContain("**Conceptos clave.**\n\n- Duplicado: registro repetido.\n- Valor faltante");
    expect(mdx).toContain('<QuizTask\n  id="calidad-de-datos"');
    expect(() => convertirLeccionIa(v1, undefined, 1)).toThrow("no tiene quiz");
  });
});
