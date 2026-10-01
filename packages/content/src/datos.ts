import type { Archivo } from "@syntaxerror/engines/python";
import { grillaDesdeFilas, type Grilla, type OpcionesHoja } from "@syntaxerror/engines/sheet";
import type { Tablas } from "@syntaxerror/engines/sql";
import type { Caso, Mision } from "./tipos";

export function tablasSql(caso: Caso): Tablas {
  return Object.fromEntries(caso.datos.map((tabla) => [tabla.nombre, tabla.filas]));
}

export function archivosPython(caso: Caso): Archivo[] {
  return caso.datos.map((tabla) => ({ ruta: `datos/${tabla.nombre}.csv`, contenido: tabla.csv }));
}

export function grillaDeHoja(caso: Caso, hoja: string): Grilla {
  const tabla = caso.datos.find((dato) => dato.nombre === hoja);
  if (!tabla) throw new Error(`El caso ${caso.slug} no tiene la hoja "${hoja}"`);
  return grillaDesdeFilas(tabla.filas);
}

// La hoja principal de una tarea de planilla, con sus hojas de consulta y sus celdas iniciales.
export function hojaDeTarea(caso: Caso, tarea: { hoja: string; otras: string[]; inicial: Record<string, string | number> }): { grilla: Grilla; opciones: OpcionesHoja } {
  const otras = Object.fromEntries(tarea.otras.map((nombre) => [nombre, grillaDeHoja(caso, nombre)]));
  return { grilla: grillaDeHoja(caso, tarea.hoja), opciones: { nombre: tarea.hoja, otras, inicial: tarea.inicial } };
}

export function paquetesPython(mision: Mision): string[] {
  return [...new Set(mision.bloques.flatMap((bloque) => (bloque.tipo === "PythonTask" ? bloque.props.paquetes : [])))];
}
