import type { Caso, Mision, Ruta } from "@syntaxerror/content/tipos";
import { normalizar, type EntradaBusqueda } from "./buscar";

export const MAXIMO_TEXTO_MISION = 1500;

// Solo lo que la persona ve antes de resolver. Nunca soluciones, pruebas,
// pistas ni Debrief, para que el buscador no revele respuestas: de una lectura
// entra la pregunta y no la respuesta; de un quiz, las preguntas y no sus
// opciones ni explicaciones.
function textoDeMision(mision: Mision): string {
  const partes: string[] = [];
  for (const bloque of mision.bloques) {
    if ((bloque.tipo === "Brief" || bloque.tipo === "Concepto") && bloque.texto) partes.push(bloque.texto);
    if (bloque.tipo === "Decision") partes.push(bloque.props.pregunta);
    if ((bloque.tipo === "SqlTask" || bloque.tipo === "PythonTask" || bloque.tipo === "SheetTask" || bloque.tipo === "MarkdownTask" || bloque.tipo === "GithubTask") && bloque.props.enunciado) {
      partes.push(bloque.props.enunciado);
    }
    if (bloque.tipo === "LecturaTask") partes.push(bloque.props.pregunta);
    if (bloque.tipo === "QuizTask") partes.push(bloque.props.enunciado ?? "", ...bloque.props.preguntas.map((pregunta) => pregunta.pregunta));
  }
  return normalizar(partes.join(" ")).slice(0, MAXIMO_TEXTO_MISION);
}

export function construirIndice(rutas: Ruta[], casos: Caso[]): EntradaBusqueda[] {
  const rutasDelCaso = (slug: string) =>
    rutas
      .filter((ruta) => ruta.casos.includes(slug))
      .map((ruta) => ruta.titulo)
      .join(" ");

  return [
    ...rutas.map((ruta) => ({
      tipo: "ruta" as const,
      titulo: ruta.titulo,
      contexto: ruta.cargo,
      href: `/rutas/${ruta.slug}`,
      texto: normalizar(ruta.descripcion),
    })),
    ...casos.flatMap((caso) => [
      {
        tipo: "caso" as const,
        titulo: caso.titulo,
        contexto: `${caso.empresa} · ${caso.cargo}`,
        href: `/casos/${caso.slug}`,
        texto: normalizar(`${caso.dataset} ${caso.entregable} ${rutasDelCaso(caso.slug)}`),
      },
      ...caso.misiones.map((mision) => ({
        tipo: caso.tipo === "clases" ? ("leccion" as const) : ("mision" as const),
        titulo: mision.titulo,
        contexto: caso.titulo,
        href: `/casos/${caso.slug}/${mision.slug}`,
        texto: textoDeMision(mision),
      })),
    ]),
  ];
}
