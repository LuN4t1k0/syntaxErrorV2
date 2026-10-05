import type { Caso, Mision } from "@syntaxerror/content/tipos";

const LARGO_MAXIMO = 4_000;
const TIPO_DE_TAREA = { SqlTask: "SQL", PythonTask: "Python", SheetTask: "de planilla", MarkdownTask: "de Markdown", GithubTask: "en GitHub" } as const;

export function contextoDeMision(caso: Caso, mision: Mision): string {
  const lineas = [
    `Caso: ${caso.titulo} (${caso.empresa}). El alumno trabaja como ${caso.cargo.toLowerCase()}.`,
    `Misión: ${mision.titulo}.`,
    ...(mision.sinGuia
      ? [
          "Esta es una misión sin guía: la persona debe demostrar lo aprendido en el caso. No le indiques qué función, cláusula o paso usar; responde con preguntas que la hagan pensar y revisar lo que ya aprendió.",
        ]
      : []),
  ];
  for (const bloque of mision.bloques) {
    if (bloque.tipo === "Brief") lineas.push(`Encargo de ${bloque.props.de}: ${bloque.texto ?? ""}`);
    else if (bloque.tipo === "Concepto") lineas.push(`Concepto de la misión: ${bloque.texto ?? ""}`);
    else if (bloque.tipo === "SqlTask" || bloque.tipo === "PythonTask" || bloque.tipo === "SheetTask" || bloque.tipo === "MarkdownTask" || bloque.tipo === "GithubTask") {
      lineas.push(`Tarea ${TIPO_DE_TAREA[bloque.tipo]}: ${bloque.props.enunciado ?? "resolver la tarea de la misión"}`);
    }
  }
  lineas.push(...tablasDelCaso(caso));
  return lineas.join("\n").slice(0, LARGO_MAXIMO);
}

function tablasDelCaso(caso: Caso): string[] {
  if (caso.datos.length === 0) return [];
  const tablas = caso.datos.map((tabla) => `${tabla.nombre}(${Object.keys(tabla.filas[0] ?? {}).join(", ")})`);
  return [`Tablas del caso: ${tablas.join("; ")}.`];
}

// El contexto del asistente del curso: de qué trata el caso o las clases, sin encargos ni tareas, para que no pueda
// resolverlas (eso queda para las pistas y el tutor, que se habilitan al intentar).
export function contextoDelCaso(caso: Caso): string {
  const unidades = caso.tipo === "clases" ? "Lecciones" : "Misiones";
  const lineas = [
    caso.tipo === "clases" ? `Caso: ${caso.titulo}. Son clases: una lección por tema, antes del caso que las aplica.` : `Caso: ${caso.titulo} (${caso.empresa}). El alumno trabaja como ${caso.cargo.toLowerCase()}.`,
    `${unidades}: ${caso.misiones.map((mision) => mision.titulo).join("; ")}.`,
    ...tablasDelCaso(caso),
  ];
  return lineas.join("\n").slice(0, LARGO_MAXIMO);
}
