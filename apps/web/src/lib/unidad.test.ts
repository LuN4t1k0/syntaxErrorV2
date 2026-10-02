import { describe, expect, it } from "vitest";
import { unidad } from "./unidad";

describe("unidad", () => {
  it("un caso tiene misiones y unas clases tienen lecciones", () => {
    expect(unidad("caso")).toEqual({ nombre: "misión", Nombre: "Misión" });
    expect(unidad("clases")).toEqual({ nombre: "lección", Nombre: "Lección" });
  });
});
