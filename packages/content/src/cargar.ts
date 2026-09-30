import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import Papa from "papaparse";
import { parse as parsearYaml } from "yaml";
import type { z } from "zod";
import type { Fila } from "@syntaxerror/engines/tipos";
import { extraerBloques, type BloqueCrudo } from "./bloques";
import { bloqueSchemas, casoSchema, formatearErrorZod, frontmatterSchema, rutaSchema, type Bloque, type TipoBloque } from "./esquemas";
import type { Caso, Contenido, Mision, Ruta, Tabla } from "./tipos";

export class ErrorDeContenido extends Error {
  constructor(readonly problemas: string[]) {
    super(`Contenido inválido (${problemas.length} problema(s)):\n- ${problemas.join("\n- ")}`);
    this.name = "ErrorDeContenido";
  }
}

const NOMBRE_TABLA = /^[a-z_][a-z0-9_]*$/;

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function entradas(dir: string) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function listarArchivos(dir: string, extension: string): Promise<string[]> {
  return (await entradas(dir)).filter((entrada) => entrada.isFile() && entrada.name.endsWith(extension)).map((entrada) => entrada.name).sort();
}

async function listarCarpetas(dir: string): Promise<string[]> {
  return (await entradas(dir)).filter((entrada) => entrada.isDirectory()).map((entrada) => entrada.name).sort();
}

function validar<S extends z.ZodTypeAny>(esquema: S, datos: unknown, donde: string, problemas: string[]): z.output<S> | null {
  const resultado = esquema.safeParse(datos);
  if (resultado.success) return resultado.data;
  problemas.push(`${donde}: ${formatearErrorZod(resultado.error)}`);
  return null;
}

async function leerYaml(archivo: string, donde: string, problemas: string[]): Promise<unknown> {
  try {
    return parsearYaml(await readFile(archivo, "utf8"));
  } catch (error) {
    problemas.push(`${donde}: ${mensajeDe(error)}`);
    return null;
  }
}

async function cargarTablas(dirCaso: string, donde: string, problemas: string[]): Promise<Tabla[]> {
  const tablas: Tabla[] = [];
  for (const archivo of await listarArchivos(path.join(dirCaso, "datos"), ".csv")) {
    const nombre = archivo.slice(0, -".csv".length);
    const lugar = `${donde}/datos/${archivo}`;
    if (!NOMBRE_TABLA.test(nombre)) {
      problemas.push(`${lugar}: el nombre de la tabla debe usar solo minúsculas, números y _`);
      continue;
    }
    const csv = await readFile(path.join(dirCaso, "datos", archivo), "utf8");
    const resultado = Papa.parse<Fila>(csv, { header: true, dynamicTyping: true, skipEmptyLines: true });
    if (resultado.errors.length > 0) {
      const [primero] = resultado.errors;
      problemas.push(`${lugar}: ${primero.message} (fila ${primero.row})`);
      continue;
    }
    tablas.push({ nombre, filas: resultado.data, csv });
  }
  return tablas;
}

async function cargarMision(dirCaso: string, donde: string, slug: string, problemas: string[]): Promise<Mision | null> {
  const lugar = `${donde}/misiones/${slug}.mdx`;
  let texto: string;
  try {
    texto = await readFile(path.join(dirCaso, "misiones", `${slug}.mdx`), "utf8");
  } catch {
    problemas.push(`${lugar}: no existe, pero caso.yaml la lista en misiones`);
    return null;
  }

  let archivo: { data: unknown; content: string };
  try {
    archivo = matter(texto);
  } catch (error) {
    problemas.push(`${lugar}: ${mensajeDe(error)}`);
    return null;
  }
  const frontmatter = validar(frontmatterSchema, archivo.data, lugar, problemas);

  let crudos: BloqueCrudo[];
  try {
    crudos = await extraerBloques(archivo.content);
  } catch (error) {
    problemas.push(`${lugar}: ${mensajeDe(error)}`);
    return null;
  }

  const bloques: Bloque[] = [];
  for (const crudo of crudos) {
    const esquema = bloqueSchemas[crudo.tipo as TipoBloque];
    if (!esquema) {
      problemas.push(`${lugar}: componente desconocido ${crudo.tipo}`);
      continue;
    }
    const props = validar(esquema, crudo.props, `${lugar} <${crudo.tipo}>`, problemas);
    if (props) bloques.push({ tipo: crudo.tipo, props, texto: crudo.texto } as Bloque);
  }

  if (!frontmatter) return null;
  return { slug, titulo: frontmatter.titulo, tiempo: frontmatter.tiempo, fuente: archivo.content, bloques };
}

async function cargarCaso(dirCaso: string, carpeta: string, problemas: string[]): Promise<Caso | null> {
  const donde = `casos/${carpeta}`;
  const lugar = `${donde}/caso.yaml`;
  const datos = validar(casoSchema, await leerYaml(path.join(dirCaso, "caso.yaml"), lugar, problemas), lugar, problemas);
  if (!datos) return null;
  if (datos.slug !== carpeta) problemas.push(`${lugar}: el slug "${datos.slug}" debe ser igual al nombre de la carpeta`);

  for (const archivo of await listarArchivos(path.join(dirCaso, "misiones"), ".mdx")) {
    if (!datos.misiones.includes(archivo.slice(0, -".mdx".length))) {
      problemas.push(`${donde}/misiones/${archivo}: no está listada en misiones de caso.yaml`);
    }
  }

  const misiones: Mision[] = [];
  for (const slug of datos.misiones) {
    const mision = await cargarMision(dirCaso, donde, slug, problemas);
    if (mision) misiones.push(mision);
  }

  return {
    slug: datos.slug,
    titulo: datos.titulo,
    cargo: datos.cargo,
    empresa: datos.empresa,
    dataset: datos.dataset,
    entregable: datos.entregable,
    misiones,
    datos: await cargarTablas(dirCaso, donde, problemas),
  };
}

export async function cargarContenido(dir: string): Promise<Contenido> {
  const problemas: string[] = [];
  const casos: Caso[] = [];
  for (const carpeta of await listarCarpetas(path.join(dir, "casos"))) {
    const caso = await cargarCaso(path.join(dir, "casos", carpeta), carpeta, problemas);
    if (caso) casos.push(caso);
  }

  const rutas: Ruta[] = [];
  for (const archivo of await listarArchivos(path.join(dir, "rutas"), ".yaml")) {
    const donde = `rutas/${archivo}`;
    const ruta = validar(rutaSchema, await leerYaml(path.join(dir, "rutas", archivo), donde, problemas), donde, problemas);
    if (!ruta) continue;
    if (ruta.slug !== archivo.slice(0, -".yaml".length)) {
      problemas.push(`${donde}: el slug "${ruta.slug}" debe ser igual al nombre del archivo`);
    }
    for (const slug of ruta.casos) {
      if (!casos.some((caso) => caso.slug === slug)) problemas.push(`${donde}: el caso "${slug}" no existe en casos/`);
    }
    rutas.push(ruta);
  }

  if (problemas.length > 0) throw new ErrorDeContenido(problemas);
  return { rutas, casos };
}
