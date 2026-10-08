import type { Archivo } from "@syntaxerror/engines/python";
import { grillaDesdeFilas, type CeldaEsperada, type Grilla, type OpcionesHoja } from "@syntaxerror/engines/sheet";
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

// Si una celda cae dentro de una celda o un rango de una columna de la solución, como D2 en D2:D9.
function enRango(celda: string, rango: string): boolean {
  const [, columna, fila] = /^([A-Z]+)(\d+)$/.exec(celda) ?? [];
  const partes = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(rango);
  if (!columna || !partes) return false;
  const [, desde, filaDesde, hasta = desde, filaHasta = filaDesde] = partes;
  return columna >= desde && columna <= hasta && Number(fila) >= Number(filaDesde) && Number(fila) <= Number(filaHasta);
}

// Marca las celdas que tienen que calcularse con fórmula: las que en la solución empiezan con =. Así una tarea de
// planilla no se aprueba escribiendo el resultado a mano, y la solución no tiene que llegar al navegador.
export function celdasConFormula(tarea: { celdas: CeldaEsperada[]; solucion: Record<string, string | number> }): CeldaEsperada[] {
  const formulas = Object.entries(tarea.solucion).filter(([, contenido]) => typeof contenido === "string" && contenido.startsWith("="));
  return tarea.celdas.map((esperada) => ({ ...esperada, formula: formulas.some(([rango]) => enRango(esperada.celda, rango)) }));
}

export function paquetesPython(mision: Mision): string[] {
  return [...new Set(mision.bloques.flatMap((bloque) => (bloque.tipo === "PythonTask" ? bloque.props.paquetes : [])))];
}
