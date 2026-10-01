import { describe, expect, it } from "vitest";
import { explicarPalabra, GLOSARIO_PYTHON, GLOSARIO_SQL, palabraEn } from "./glosario";

describe("glosario", () => {
  it("cada entrada tiene título, explicación y ejemplo", () => {
    for (const entrada of [...Object.values(GLOSARIO_SQL), ...Object.values(GLOSARIO_PYTHON)]) {
      expect(entrada.titulo.length, entrada.titulo).toBeGreaterThan(0);
      expect(entrada.explicacion.length, entrada.titulo).toBeGreaterThan(20);
      expect(entrada.ejemplo.length, entrada.titulo).toBeGreaterThan(0);
    }
  });

  it("encuentra la palabra bajo el cursor", () => {
    expect(palabraEn("SELECT nombre", 9)).toEqual({ desde: 7, hasta: 13, palabra: "nombre" });
    expect(palabraEn("a = 1", 2)).toBeNull();
  });

  it("explica palabras de SQL sin importar mayúsculas", () => {
    expect(explicarPalabra("sql", "select nombre from clientes", 2)).toMatchObject({ titulo: "SELECT", desde: 0, hasta: 6 });
    expect(explicarPalabra("sql", "SELECT ciudad FROM clientes GROUP BY ciudad", 30)?.titulo).toBe("GROUP BY");
  });

  it("en Python distingue un método de pandas de una función", () => {
    expect(explicarPalabra("python", 'ventas.groupby("ciudad")', 9)?.titulo).toBe(".groupby()");
    expect(explicarPalabra("python", "ventas.sum()", 8)?.titulo).toBe(".sum()");
    expect(explicarPalabra("python", "sum([1, 2])", 1)?.titulo).toBe("sum()");
  });

  it("no explica nombres propios del caso", () => {
    expect(explicarPalabra("sql", "SELECT nombre", 9)).toBeNull();
    expect(explicarPalabra("python", "ventas = 1", 2)).toBeNull();
  });
});
