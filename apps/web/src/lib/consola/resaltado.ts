import { pythonLanguage } from "@codemirror/lang-python";
import { StandardSQL } from "@codemirror/lang-sql";
import { classHighlighter, highlightCode } from "@lezer/highlight";
import type { Lenguaje } from "./glosario";

export type Segmento = { texto: string; clase: string };

// Mismos parsers y clases (tok-*) que el editor: los ejemplos se ven igual que lo que escribe la persona.
export function resaltar(codigo: string, lenguaje: Lenguaje): Segmento[] {
  const parser = lenguaje === "sql" ? StandardSQL.language.parser : pythonLanguage.parser;
  const segmentos: Segmento[] = [];
  highlightCode(
    codigo,
    parser.parse(codigo),
    classHighlighter,
    (texto, clase) => segmentos.push({ texto, clase }),
    () => segmentos.push({ texto: "\n", clase: "" })
  );
  return segmentos;
}
