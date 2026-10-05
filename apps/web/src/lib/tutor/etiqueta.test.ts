import { describe, expect, it } from "vitest";
import { MISION_ASISTENTE } from "@syntaxerror/ia/tutor";
import { etiquetaDeMision } from "./etiqueta";

describe("etiquetaDeMision", () => {
  it("nombra al asistente del curso y deja el slug de las misiones del tutor", () => {
    expect(etiquetaDeMision(MISION_ASISTENTE)).toBe("Asistente del curso");
    expect(etiquetaDeMision("01-filtrar")).toBe("01-filtrar");
  });
});
