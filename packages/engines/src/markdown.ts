import MarkdownIt from "markdown-it";
import { leerRequisito, NOMBRES, type ElementoMarkdown } from "./markdown-requisitos";
import type { ResultadoTarea } from "./tipos";

export { describirRequisitoMarkdown, ELEMENTOS_MARKDOWN, leerRequisito, PATRON_REQUISITO_MARKDOWN, type ElementoMarkdown } from "./markdown-requisitos";

// html: false escapa cualquier HTML escrito a mano; la vista previa nunca ejecuta nada de la persona.
const parser = new MarkdownIt({ html: false, linkify: false });

export type ResumenMarkdown = Record<ElementoMarkdown, number>;

export function renderizarMarkdown(texto: string): string {
  return parser.render(texto);
}

export function analizarMarkdown(texto: string): ResumenMarkdown {
  const resumen: ResumenMarkdown = { titulo: 0, subtitulos: 0, lista: 0, "lista-numerada": 0, tabla: 0, enlace: 0, imagen: 0, negrita: 0, codigo: 0 };
  const recorrer = (tokens: ReturnType<typeof parser.parse>) => {
    for (const token of tokens) {
      if (token.type === "heading_open" && token.tag === "h1") resumen.titulo += 1;
      else if (token.type === "heading_open" && token.tag === "h2") resumen.subtitulos += 1;
      else if (token.type === "bullet_list_open") resumen.lista += 1;
      else if (token.type === "ordered_list_open") resumen["lista-numerada"] += 1;
      else if (token.type === "table_open") resumen.tabla += 1;
      else if (token.type === "link_open") resumen.enlace += 1;
      else if (token.type === "image") resumen.imagen += 1;
      else if (token.type === "strong_open") resumen.negrita += 1;
      else if (token.type === "code_inline" || token.type === "fence" || token.type === "code_block") resumen.codigo += 1;
      if (token.children) recorrer(token.children);
    }
  };
  recorrer(parser.parse(texto, {}));
  return resumen;
}

const FALTA: Record<ElementoMarkdown, string> = {
  titulo: "Falta un título principal: una línea que empiece con «# », por ejemplo «# Análisis de despachos».",
  subtitulos: "Faltan subtítulos: cada uno empieza con «## », por ejemplo «## Datos».",
  lista: "Falta una lista: cada elemento va en su propia línea y empieza con «- ».",
  "lista-numerada": "Falta una lista numerada: «1. », «2. » y así, cada uno en su línea.",
  tabla: "Falta una tabla: una fila de encabezados, una línea de separación como «| --- | --- |» y al menos una fila de datos.",
  enlace: "Falta un enlace: [texto del enlace](https://…).",
  imagen: "Falta una imagen: ![descripción de la imagen](https://…).",
  negrita: "Falta texto en negrita: **así**.",
  codigo: "Falta código: entre comillas invertidas, `así`, o en un bloque que empieza y termina con ```.",
};

// Los errores más comunes al empezar con Markdown: se explican antes del requisito que falla.
function errorComun(elemento: ElementoMarkdown, texto: string): string | null {
  const lineas = texto.split(/\r?\n/);
  if ((elemento === "titulo" || elemento === "subtitulos") && lineas.some((linea) => /^#{1,6}[^#\s]/.test(linea.trim()))) {
    return "Después de los # va un espacio: escribe «# Título», no «#Título».";
  }
  if (elemento === "lista" && lineas.some((linea) => /^[-*][^\s*-]/.test(linea.trim()))) {
    return "Después del guion va un espacio: escribe «- elemento», no «-elemento».";
  }
  if (elemento === "tabla" && lineas.filter((linea) => linea.includes("|")).length >= 2) {
    return "Tu tabla necesita, bajo la fila de encabezados, una línea de separación como «| --- | --- |».";
  }
  if (elemento === "imagen" && /\]\([^)]+\.(png|jpe?g|gif|svg|webp)\)/i.test(texto)) {
    return "Para mostrar una imagen, el enlace lleva un ! adelante: ![descripción](url).";
  }
  return null;
}

export function problemasMarkdown(texto: string, requisitos: string[]): string[] {
  if (!texto.trim()) return ["Escribe tu Markdown antes de validar."];
  const resumen = analizarMarkdown(texto);
  const problemas: string[] = [];
  for (const requisito of requisitos) {
    const { elemento, minimo } = leerRequisito(requisito);
    const hay = resumen[elemento];
    if (hay >= minimo) continue;
    const base = hay === 0 || minimo === 1 ? FALTA[elemento] : `Se necesitan ${minimo} ${NOMBRES[elemento][1]} y hay ${hay}. ${FALTA[elemento]}`;
    const comun = hay === 0 ? errorComun(elemento, texto) : null;
    problemas.push(comun ? `${comun} ${base}` : base);
  }
  return problemas;
}

export function revisarMarkdown(texto: string, requisitos: string[]): ResultadoTarea {
  const [primero] = problemasMarkdown(texto, requisitos);
  return primero ? { aprobada: false, diagnostico: primero } : { aprobada: true, diagnostico: null };
}
