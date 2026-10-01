import { describirRequisitoMarkdown } from "@syntaxerror/engines/markdown-requisitos";

// Liviano a propósito: lo usa el navegador (GithubTask) y no debe arrastrar markdown-it.

// Las reglas de GitHub para un usuario: alfanumérico y guiones, sin empezar con guion, hasta 39.
export const PATRON_USUARIO = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;

export function describirRequisito(requisito: string): string {
  if (requisito === "publico") return "El repositorio es público.";
  if (requisito === "readme") return "Tiene un README en la carpeta principal.";
  if (requisito === "nombres-limpios") return "Los nombres de carpetas y archivos no tienen espacios ni tildes.";
  const [tipo, valor] = requisito.split(/:(.*)/s);
  if (tipo === "commits") return `Tiene al menos ${valor} commits con mensajes escritos por ti.`;
  if (tipo === "carpeta") return `Tiene una carpeta «${valor}».`;
  if (tipo === "extension") return `Tiene al menos un archivo ${valor}.`;
  if (tipo === "readme") return `El README tiene ${describirRequisitoMarkdown(valor)}.`;
  throw new Error(`Requisito de GitHub desconocido: ${requisito}`);
}
