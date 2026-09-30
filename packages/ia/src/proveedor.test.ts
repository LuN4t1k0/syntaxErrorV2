import { describe, expect, it } from "vitest";
import { crearProveedorDesdeEntorno } from "./proveedor";

describe("crearProveedorDesdeEntorno", () => {
  it("usa Gemini si hay clave, el de prueba si se pide y ninguno si no", () => {
    expect(crearProveedorDesdeEntorno({ GEMINI_API_KEY: "clave", TUTOR_PRUEBA: "true" })?.nombre).toBe("gemini");
    expect(crearProveedorDesdeEntorno({ TUTOR_PRUEBA: "true" })?.nombre).toBe("prueba");
    expect(crearProveedorDesdeEntorno({})).toBeNull();
  });
});
