import { describe, expect, it } from "vitest";
import { generarCodigo, normalizarCodigo } from "./codigo";

describe("código de clase", () => {
  it("tiene 6 caracteres sin letras ni números que se confundan", () => {
    for (let vuelta = 0; vuelta < 200; vuelta++) expect(generarCodigo()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  });

  it("acepta el código escrito en minúsculas, con espacios o guiones", () => {
    expect(normalizarCodigo(" abc-234 ")).toBe("ABC234");
    expect(normalizarCodigo("ab c2 34")).toBe("ABC234");
  });
});
