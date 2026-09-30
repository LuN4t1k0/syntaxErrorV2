import type { Archivo } from "@syntaxerror/engines/python";
import { grillaDesdeFilas, type Grilla } from "@syntaxerror/engines/sheet";
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

export function paquetesPython(mision: Mision): string[] {
  return [...new Set(mision.bloques.flatMap((bloque) => (bloque.tipo === "PythonTask" ? bloque.props.paquetes : [])))];
}
