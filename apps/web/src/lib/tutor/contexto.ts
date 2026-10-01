import type { Caso, Mision } from "@syntaxerror/content/tipos";

const LARGO_MAXIMO = 4_000;
const TIPO_DE_TAREA = { SqlTask: "SQL", PythonTask: "Python", SheetTask: "de planilla" } as const;

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
    else if (bloque.tipo === "SqlTask" || bloque.tipo === "PythonTask" || bloque.tipo === "SheetTask") {
      lineas.push(`Tarea ${TIPO_DE_TAREA[bloque.tipo]}: ${bloque.props.enunciado ?? "resolver la tarea de la misión"}`);
    }
  }
  if (caso.datos.length > 0) {
    const tablas = caso.datos.map((tabla) => `${tabla.nombre}(${Object.keys(tabla.filas[0] ?? {}).join(", ")})`);
    lineas.push(`Tablas del caso: ${tablas.join("; ")}.`);
  }
  return lineas.join("\n").slice(0, LARGO_MAXIMO);
}
