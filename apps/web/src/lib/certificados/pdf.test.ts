import { describe, expect, it } from "vitest";
import { generarCertificadoPdf } from "./pdf";
import type { CertificadoPublico } from "./servicio";

const CERTIFICADO: CertificadoPublico = {
  codigo: "ABC123XYZ0",
  tipo: "ruta",
  titulo: "Data Analyst",
  cargo: "Analista de datos junior",
  nombreAlumno: "María José Fernández",
  emitidoEn: new Date("2026-10-04T15:00:00Z"),
  legado: false,
};

describe("generarCertificadoPdf", () => {
  it("genera un PDF A4 apaisado con el código y la dirección de verificación", async () => {
    const pdf = await generarCertificadoPdf(CERTIFICADO, "https://syntaxerror.cl");
    const texto = pdf.toString("latin1");
    expect(texto.startsWith("%PDF-")).toBe(true);
    expect(texto).toContain("Certificado ABC123XYZ0");
    expect(texto).toContain("https://syntaxerror.cl/verificar/ABC123XYZ0");
    expect(texto).toMatch(/\/MediaBox \[0 0 841\.89\d* 595\.28\d*\]/);
  });

  it("funciona con un certificado de la v1, sin cargo", async () => {
    const pdf = await generarCertificadoPdf({ ...CERTIFICADO, tipo: "curso", cargo: null, legado: true }, "https://syntaxerror.cl");
    expect(pdf.toString("latin1").startsWith("%PDF-")).toBe(true);
  });
});
