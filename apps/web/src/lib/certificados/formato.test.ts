import { describe, expect, it } from "vitest";
import { descripcionCertificado, etiquetaTipoCertificado, fechaCertificado } from "./formato";

describe("formato de certificados", () => {
  it("expone etiquetas legibles por tipo", () => {
    expect(etiquetaTipoCertificado("caso")).toBe("Caso");
    expect(etiquetaTipoCertificado("ruta")).toBe("Ruta");
    expect(etiquetaTipoCertificado("curso")).toBe("Curso");
  });

  it("formatea fechas en español de Chile", () => {
    expect(fechaCertificado(new Date("2026-03-04T15:00:00Z"))).toContain("marzo");
  });

  it("describe el alcance del certificado", () => {
    expect(
      descripcionCertificado({
        codigo: "ABC",
        tipo: "caso",
        titulo: "Ventas",
        cargo: "Analista junior",
        nombreAlumno: "Ana",
        emitidoEn: new Date(),
        legado: false,
      })
    ).toBe("Certificado de caso para el rol Analista junior");
  });
});
