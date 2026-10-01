import { describe, expect, it } from "vitest";
import { distancia, errorSimple, sugerirNombre, textoDeError } from "./consola";

describe("distancia", () => {
  it("cuenta inserciones, borrados y cambios sin distinguir mayúsculas", () => {
    expect(distancia("venta", "ventas")).toBe(1);
    expect(distancia("SELEC", "select")).toBe(1);
    expect(distancia("grupby", "groupby")).toBe(1);
    expect(distancia("", "abc")).toBe(3);
    expect(distancia("Clientes", "clientes")).toBe(0);
  });
});

describe("sugerirNombre", () => {
  it("sugiere el candidato más parecido", () => {
    expect(sugerirNombre("venta", ["clientes", "ventas"])).toBe("ventas");
    expect(sugerirNombre("montos", ["id", "monto", "fecha"])).toBe("monto");
    expect(sugerirNombre("datos/venta.csv", ["datos/clientes.csv", "datos/ventas.csv"])).toBe("datos/ventas.csv");
  });

  it("prefiere el mismo nombre con otras mayúsculas", () => {
    expect(sugerirNombre("Clientes", ["cliente", "clientes"])).toBe("clientes");
  });

  it("no sugiere nada si no hay uno parecido, si es idéntico o si el nombre está vacío", () => {
    expect(sugerirNombre("xyz", ["clientes", "ventas"])).toBeNull();
    expect(sugerirNombre("monto", ["monto"])).toBeNull();
    expect(sugerirNombre("", ["a"])).toBeNull();
    expect(sugerirNombre("ab", [])).toBeNull();
  });

  it("en nombres cortos acepta solo una letra de diferencia", () => {
    expect(sugerirNombre("WHER", ["WHERE"])).toBe("WHERE");
    expect(sugerirNombre("WHR", ["WHERE"])).toBeNull();
  });
});

describe("textoDeError", () => {
  it("une línea, mensaje y sugerencia", () => {
    expect(textoDeError({ mensaje: "No existe nada llamado «venta».", sugerencia: "¿Quisiste decir «ventas»?", linea: 2, original: "NameError" })).toBe(
      "Línea 2: No existe nada llamado «venta». ¿Quisiste decir «ventas»?"
    );
    expect(textoDeError(errorSimple("Escribe una consulta antes de ejecutar."))).toBe("Escribe una consulta antes de ejecutar.");
  });
});
