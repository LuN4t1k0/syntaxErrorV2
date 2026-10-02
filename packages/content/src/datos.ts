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
export function hojaDeTarea(
  caso: Caso,
  tarea: { hoja?: string; grilla?: (string | number | null)[][]; otras: string[]; inicial: Record<string, string | number> }
): { grilla: Grilla; opciones: OpcionesHoja } {
  const otras = Object.fromEntries(tarea.otras.map((nombre) => [nombre, grillaDeHoja(caso, nombre)]));
  // Una grilla escrita en la lección no viene de datos/: la hoja se llama como en una planilla nueva.
  if (tarea.grilla) return { grilla: tarea.grilla.map((fila) => fila.map((celda) => celda ?? "")), opciones: { nombre: "Hoja1", otras, inicial: tarea.inicial } };
  if (!tarea.hoja) throw new Error("La tarea de planilla necesita hoja o grilla");
  return { grilla: grillaDeHoja(caso, tarea.hoja), opciones: { nombre: tarea.hoja, otras, inicial: tarea.inicial } };
}

export function paquetesPython(mision: Mision): string[] {
  return [...new Set(mision.bloques.flatMap((bloque) => (bloque.tipo === "PythonTask" ? bloque.props.paquetes : [])))];
}
