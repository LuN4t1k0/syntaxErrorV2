import { describe, expect, it } from "vitest";
import { calcularNivel } from "./niveles";

describe("calcularNivel", () => {
  it("sube un nivel cada 100 puntos", () => {
    expect(calcularNivel(0)).toEqual({ puntos: 0, nivel: 1, faltan: 100 });
    expect(calcularNivel(99)).toEqual({ puntos: 99, nivel: 1, faltan: 1 });
    expect(calcularNivel(100)).toEqual({ puntos: 100, nivel: 2, faltan: 100 });
    expect(calcularNivel(265)).toEqual({ puntos: 265, nivel: 3, faltan: 35 });
  });

  it("nunca baja de nivel 1 con puntos negativos", () => {
    expect(calcularNivel(-20)).toEqual({ puntos: 0, nivel: 1, faltan: 100 });
  });
});
