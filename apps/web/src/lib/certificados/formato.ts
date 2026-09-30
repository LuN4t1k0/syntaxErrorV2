import type { CertificadoPublico } from "./servicio";

export function etiquetaTipoCertificado(tipo: CertificadoPublico["tipo"]): string {
  if (tipo === "ruta") return "Ruta";
  if (tipo === "curso") return "Curso";
  return "Caso";
}

export function fechaCertificado(fecha: Date): string {
  return fecha.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    timeZone: "America/Santiago",
    year: "numeric",
  });
}

export function descripcionCertificado(certificado: CertificadoPublico): string {
  const tipo = etiquetaTipoCertificado(certificado.tipo).toLowerCase();
  if (certificado.cargo) return `Certificado de ${tipo} para el rol ${certificado.cargo}`;
  return `Certificado de ${tipo}`;
}
