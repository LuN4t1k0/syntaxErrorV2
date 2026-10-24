import { describe, expect, it } from "vitest";
import { calcularNivel, nombreNivel } from "./niveles";

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

describe("nombreNivel", () => {
  it("nombra cada tramo con una unidad de información", () => {
    expect(nombreNivel(1)).toBe("Bit");
    expect(nombreNivel(2)).toBe("Bit");
    expect(nombreNivel(3)).toBe("Byte");
    expect(nombreNivel(9)).toBe("Kilobyte");
    expect(nombreNivel(10)).toBe("Megabyte");
    expect(nombreNivel(19)).toBe("Gigabyte");
    expect(nombreNivel(23)).toBe("Terabyte");
    expect(nombreNivel(24)).toBe("Petabyte");
    expect(nombreNivel(80)).toBe("Petabyte");
  });

  it("un nivel fuera de rango usa el primer tramo", () => {
    expect(nombreNivel(0)).toBe("Bit");
  });
});
