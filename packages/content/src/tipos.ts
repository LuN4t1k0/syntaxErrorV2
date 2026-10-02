import type { z } from "zod";
import type { Fila } from "@syntaxerror/engines/tipos";
import type { Bloque, rutaSchema } from "./esquemas";
import type { Rubrica } from "./rubrica";

export type Ruta = z.output<typeof rutaSchema>;
export type Tabla = { nombre: string; filas: Fila[]; csv: string };
export type Mision = { slug: string; titulo: string; tiempo: number; sinGuia: boolean; fuente: string; bloques: Bloque[] };
export type TipoCaso = "caso" | "clases";
// En unas clases, cargo, empresa y entregable quedan vacíos, sin archivos y con la rúbrica base: la interfaz no los muestra.
export type Caso = {
  tipo: TipoCaso;
  slug: string;
  titulo: string;
  cargo: string;
  empresa: string;
  dataset: string;
  entregable: string;
  archivos: string[];
  rubrica: Rubrica;
  misiones: Mision[];
  datos: Tabla[];
};
export type Contenido = { rutas: Ruta[]; casos: Caso[] };
