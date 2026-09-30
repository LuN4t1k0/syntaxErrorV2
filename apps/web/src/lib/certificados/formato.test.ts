import { describe, expect, it } from "vitest";
import { descripcionCertificado, etiquetaTipoCertificado, fechaCertificado } from "./formato";

describe("formato de certificados", () => {
  it("expone etiquetas legibles por tipo", () => {
    expect(etiquetaTipoCertificado("caso")).toBe("Caso");
    expect(etiquetaTipoCertificado("ruta")).toBe("Ruta");
    expect(etiquetaTipoCertificado("curso")).toBe("Curso");
  });

  it("formatea fechas en español de Chile y en hora de Chile", () => {
    expect(fechaCertificado(new Date("2026-03-03T15:00:00Z"))).toBe("3 de marzo de 2026");
    // 02:00 UTC del 4 de marzo todavía es 3 de marzo en Santiago.
    expect(fechaCertificado(new Date("2026-03-04T02:00:00Z"))).toBe("3 de marzo de 2026");
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
