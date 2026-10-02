import { describe, expect, it } from "vitest";
import { evaluarRubrica, observacionesParaLaPersona } from "./rubrica";

describe("evaluarRubrica", () => {
  it("aprueba con 2 o más en las tres dimensiones", () => {
    expect(evaluarRubrica({ claridad: 2, ejecucion: 3, coherencia: 2 }, {})).toEqual({
      ok: true,
      decision: "aprobado",
      puntajes: { claridad: 2, ejecucion: 3, coherencia: 2 },
      observaciones: {},
    });
  });

  it("con un 1 pide cambios y guarda los comentarios sin espacios de más", () => {
    expect(evaluarRubrica({ claridad: 3, ejecucion: 1, coherencia: 2 }, { ejecucion: "  El notebook falla en la celda 4.  ", claridad: "   " })).toEqual({
      ok: true,
      decision: "observado",
      puntajes: { claridad: 3, ejecucion: 1, coherencia: 2 },
      observaciones: { ejecucion: "El notebook falla en la celda 4." },
    });
  });

  it("exige un puntaje de 1 a 3 en cada dimensión", () => {
    expect(evaluarRubrica({ claridad: 2, ejecucion: 2 }, {})).toEqual({ ok: false, motivo: "puntajes_incompletos", dimension: "coherencia" });
    expect(evaluarRubrica({ claridad: 4, ejecucion: 2, coherencia: 2 }, {})).toEqual({ ok: false, motivo: "puntajes_incompletos", dimension: "claridad" });
    expect(evaluarRubrica({ claridad: 0, ejecucion: 2, coherencia: 2 }, {})).toMatchObject({ ok: false, motivo: "puntajes_incompletos" });
  });

  it("una dimensión insuficiente necesita su comentario, de al menos 10 caracteres", () => {
    expect(evaluarRubrica({ claridad: 1, ejecucion: 2, coherencia: 2 }, {})).toEqual({ ok: false, motivo: "falta_observacion", dimension: "claridad" });
    expect(evaluarRubrica({ claridad: 1, ejecucion: 2, coherencia: 2 }, { claridad: "corto" })).toEqual({ ok: false, motivo: "falta_observacion", dimension: "claridad" });
    expect(evaluarRubrica({ claridad: 1, ejecucion: 2, coherencia: 2 }, { coherencia: "Este comentario está en otra dimensión." })).toMatchObject({ ok: false, motivo: "falta_observacion" });
  });
});

describe("observacionesParaLaPersona", () => {
  it("parte por lo que hay que corregir y termina con el comentario general", () => {
    const puntajes = { claridad: 3, ejecucion: 1, coherencia: 2 } as const;
    expect(observacionesParaLaPersona(puntajes, { claridad: "Muy buen README.", ejecucion: "El notebook falla en la celda 4." }, "Vas bien.")).toEqual([
      "Ejecución técnica del análisis (Insuficiente): El notebook falla en la celda 4.",
      "Claridad del README y la explicación (Destacado): Muy buen README.",
      "Comentario general: Vas bien.",
    ]);
    expect(observacionesParaLaPersona(puntajes, { ejecucion: "El notebook falla en la celda 4." }, null)).toHaveLength(1);
  });
});
