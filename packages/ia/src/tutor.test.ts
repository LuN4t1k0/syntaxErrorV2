import { describe, expect, it } from "vitest";
import { esDelTema, esFueraDeTema, instruccionesDelTutor, MARCA_FUERA_DE_TEMA, similitudCoseno } from "./tutor";

describe("similitudCoseno y esDelTema", () => {
  it("vale 1 para vectores iguales, 0 para ortogonales y 0 si uno es cero", () => {
    expect(similitudCoseno([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
    expect(similitudCoseno([1, 0], [0, 1])).toBe(0);
    expect(similitudCoseno([0, 0], [1, 1])).toBe(0);
  });

  it("una pregunta es del tema si se parece lo suficiente a alguno de los temas", () => {
    expect(esDelTema([1, 0.2], [[0, 1], [1, 0]])).toBe(true);
    expect(esDelTema([0, 1], [[1, 0]])).toBe(false);
  });
});

describe("instruccionesDelTutor", () => {
  it("incluye el contexto, prohíbe entregar la solución y define la marca de fuera de tema", () => {
    const instrucciones = instruccionesDelTutor("Misión: Filtrar clientes.");
    expect(instrucciones).toContain("Misión: Filtrar clientes.");
    expect(instrucciones).toContain("nunca entregues la solución completa");
    expect(instrucciones).toContain(MARCA_FUERA_DE_TEMA);
    expect(instrucciones).toContain("tuteando");
  });

  it("reconoce la marca de fuera de tema aunque venga con espacios", () => {
    expect(esFueraDeTema(`  ${MARCA_FUERA_DE_TEMA}`)).toBe(true);
    expect(esFueraDeTema("Usa WHERE")).toBe(false);
  });
});
