import { describe, expect, it } from "vitest";
import { resaltar } from "./resaltado";

describe("resaltar", () => {
  it("marca palabras clave, textos, números y comentarios de SQL", () => {
    const codigo = "SELECT nombre FROM clientes WHERE id > 2 AND ciudad = 'Temuco' -- nota";
    const segmentos = resaltar(codigo, "sql");
    expect(segmentos.map((segmento) => segmento.texto).join("")).toBe(codigo);
    expect(segmentos).toContainEqual({ texto: "SELECT", clase: "tok-keyword" });
    expect(segmentos).toContainEqual({ texto: "'Temuco'", clase: "tok-string" });
    expect(segmentos).toContainEqual({ texto: "2", clase: "tok-number" });
    expect(segmentos).toContainEqual({ texto: "-- nota", clase: "tok-comment" });
  });

  it("colorea Python y conserva los saltos de línea", () => {
    const codigo = 'import pandas as pd\ndef total(x):\n    return round(x["monto"].mean(), 2)  # promedio';
    const segmentos = resaltar(codigo, "python");
    expect(segmentos.map((segmento) => segmento.texto).join("")).toBe(codigo);
    expect(segmentos).toContainEqual({ texto: "def", clase: "tok-keyword" });
    expect(segmentos).toContainEqual({ texto: '"monto"', clase: "tok-string" });
    expect(segmentos).toContainEqual({ texto: "mean", clase: "tok-propertyName" });
    expect(segmentos).toContainEqual({ texto: "# promedio", clase: "tok-comment" });
  });
});
