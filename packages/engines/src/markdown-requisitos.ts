// Requisitos de Markdown sin depender de markdown-it: los usan el navegador (listas de requisitos) y los esquemas de contenido.
export const ELEMENTOS_MARKDOWN = ["titulo", "subtitulos", "lista", "lista-numerada", "tabla", "enlace", "imagen", "negrita", "codigo"] as const;
export type ElementoMarkdown = (typeof ELEMENTOS_MARKDOWN)[number];

// Un requisito es un elemento con un mínimo opcional: "lista" o "subtitulos:2".
export const PATRON_REQUISITO_MARKDOWN = new RegExp(`^(${ELEMENTOS_MARKDOWN.join("|")})(?::([1-9]))?$`);

export function leerRequisito(requisito: string): { elemento: ElementoMarkdown; minimo: number } {
  const coincidencia = PATRON_REQUISITO_MARKDOWN.exec(requisito);
  if (!coincidencia) throw new Error(`Requisito de Markdown desconocido: ${requisito}`);
  return { elemento: coincidencia[1] as ElementoMarkdown, minimo: Number(coincidencia[2] ?? 1) };
}

// Cómo se nombra cada elemento: [uno, varios].
export const NOMBRES: Record<ElementoMarkdown, [string, string]> = {
  titulo: ["un título principal", "títulos principales"],
  subtitulos: ["un subtítulo", "subtítulos"],
  lista: ["una lista", "listas"],
  "lista-numerada": ["una lista numerada", "listas numeradas"],
  tabla: ["una tabla", "tablas"],
  enlace: ["un enlace", "enlaces"],
  imagen: ["una imagen", "imágenes"],
  negrita: ["texto en negrita", "textos en negrita"],
  codigo: ["código", "fragmentos de código"],
};

export function describirRequisitoMarkdown(requisito: string): string {
  const { elemento, minimo } = leerRequisito(requisito);
  return minimo === 1 ? NOMBRES[elemento][0] : `al menos ${minimo} ${NOMBRES[elemento][1]}`;
}
