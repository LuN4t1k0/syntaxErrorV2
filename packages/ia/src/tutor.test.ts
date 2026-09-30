import { describe, expect, it } from "vitest";
import { esFueraDeTema, instruccionesDelTutor, MARCA_FUERA_DE_TEMA, similitudCoseno } from "./tutor";

describe("similitudCoseno", () => {
  it("vale 1 para vectores iguales, 0 para ortogonales y 0 si uno es cero", () => {
    expect(similitudCoseno([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(similitudCoseno([1, 0], [0, 1])).toBe(0);
    expect(similitudCoseno([0, 0], [1, 1])).toBe(0);
  });
});

describe("instruccionesDelTutor", () => {
  it("incluye el contexto, prohíbe entregar la solución y define la marca de fuera de tema", () => {
    const instrucciones = instruccionesDelTutor("Misión: Filtrar clientes.");
    expect(instrucciones).toContain("Misión: Filtrar clientes.");
    expect(instrucciones).toContain("nunca entregues la solución completa");
    expect(instrucciones).toContain(MARCA_FUERA_DE_TEMA);
    expect(instrucciones).toContain("tuteando");
    expect(instrucciones).toContain("lenguaje neutro");
    // Gemini rechazaba "¿Qué es la mediana?" cuando el alcance decía solo "tecnología o datos".
    expect(instrucciones).toContain("estadística");
    expect(instrucciones).toContain("Ante la duda, responde");
    expect(instrucciones).toContain("el negocio, los datos");
  });

  it("reconoce la marca de fuera de tema aunque venga con espacios", () => {
    expect(esFueraDeTema(`  ${MARCA_FUERA_DE_TEMA}`)).toBe(true);
    expect(esFueraDeTema("Usa WHERE")).toBe(false);
    // Pasó con Gemini: respondió texto y agregó la marca al final.
    expect(esFueraDeTema(`Esa pregunta no es de la misión. ${MARCA_FUERA_DE_TEMA}`)).toBe(true);
  });
});
