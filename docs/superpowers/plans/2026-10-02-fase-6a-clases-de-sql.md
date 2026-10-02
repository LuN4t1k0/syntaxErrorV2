# Fase 6a: Clases antes de los casos, piloto con SQL. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Traer a la v2 el contenido de las aulas de la v1, no las aulas: una lección por tema, antes del caso que la aplica. El piloto convierte 18 lecciones del aula de SQL en "Clases de SQL", entre el Caso 1 (Despachos Rápidos) y el Caso 2 (Minimarkets del Sur). Deja listo el camino para Excel, Python, Power BI e IA para datos.

**Architecture:**
- **Un caso puede ser de tipo `clases`** (en `caso.yaml`, `tipo: clases`; sin `tipo` sigue siendo un caso de trabajo).
  - Unas clases solo tienen `slug`, `titulo`, `dataset` y `misiones`: no tienen empresa, entregable, rúbrica ni certificado propio.
  - Se completan al aprobar todas sus lecciones, habilitan el caso siguiente y cuentan para el certificado de la ruta. No van al portafolio.
  - Reutilizan todo lo que ya existe: consolas, errores en español, pistas, tutor, progreso y orden.
  - En pantalla se llaman "lecciones" en vez de "misiones", y la página muestra "Tu avance" en vez del entregable y la rúbrica.
- **Dos bloques cambian para las lecciones:**
  - `<Sintaxis>` muestra la forma general de una instrucción, sin ejecutarla;
  - el `<Debrief>` ya no exige el consejo de entrevista.
- **El validador agrega una regla para todo el contenido:** una pista no puede traer la solución completa.
- **Base de datos:** `casos.tipo` (`caso` por defecto), en una migración.
- **El importador** (`packages/content/src/importar/`) convierte un aula exportada a JSON en un borrador de clases:
  - `leccion.ts` es el formato común (escribe el MDX y corrige tildes con un diccionario);
  - `aula-sql.ts` es el adaptador de SQL; para las otras aulas se agrega su adaptador;
  - `scripts/exportar-aula-v1.mjs` exporta un aula con el Node del equipo, fuera de Docker;
  - el borrador pasa después por una revisión editorial: tildes que dependen del contexto y pistas nuevas.
- **El contenido del piloto:** 18 lecciones de consulta del aula de SQL, con las tablas `estudiantes`, `cursos` e `inscripciones` de la v1.
  - Todas las soluciones de la v1 pasaron el validador de la v2 sin cambios.
  - Las pistas de la v1 traían la consulta casi entera: se escribieron dos por lección, que orientan sin resolver.

**Tech Stack:** Zod (unión discriminada), MDX 3, Drizzle (migración), alasql 4.19.1, Vitest 4 y Playwright 1.55.

**Spec:** `docs/propuesta-pedagogica-data-analyst.md`, secciones 3 (cómo está organizado el contenido: clases) y 15 (decisión 6). Acuerdo del equipo del 2026-10-02: traer el contenido de las aulas, no las aulas; piloto con SQL; probar todo en local, sin despliegue.

**Pendiente de confirmar por el equipo** (decisión 6 de la propuesta):
- las clases son obligatorias, sin una prueba para saltarlas;
- las 11 lecciones de SQL que no son de análisis (INSERT, UPDATE, DELETE, CREATE y ALTER TABLE, restricciones, TRUNCATE, vistas, índices, transacciones y elegir motor) no entran al piloto.

## Global Constraints

**Copia literal:** cada archivo completo de este plan (`.ts`, `.tsx`, `.mjs`, `.yaml`, `.mdx`, `.csv`, `.sql`) se copia exactamente como está, con sus comentarios. Las 18 lecciones salen del importador y después tienen la revisión editorial: el plan trae la versión final, y cada `.mdx` se compara con `diff` contra el plan antes del commit.

**Entorno**
- Todo se ejecuta con `docker compose run --rm tools ...`, salvo la exportación del aula (Task 3), que lee `~/Documents/desarrollo/cursos` con el Node del equipo.
- El paquete de la app se llama `web`.
- No hay despliegue: todo se prueba en local.

**Texto:** español de Chile, tratando de tú, sin voseo y con lenguaje neutro. Los valores de los datos entre comillas simples (`'Sin inscripcion'`) quedan iguales a la solución, aunque les falte una tilde: si no, la persona escribe lo que dice el enunciado y la consulta no calza.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **El enunciado pide un texto distinto al de la solución,** porque al corregir tildes el texto entre comillas se arregla en el enunciado pero no en la consulta. El importador no corrige lo que va entre comillas simples. Probado en `leccion.test.ts`, y en la lección 7 (`'Sin inscripcion'`).
2. **Una pista que entrega la respuesta,** como las de la v1. El importador las descarta y el validador rechaza cualquier pista que contenga la solución completa, aunque cambien los espacios o las mayúsculas. Probado en `aula-sql.test.ts` y `validar.test.ts`.
3. **Alguien intenta enviar un entregable a unas clases** por la API. Responde 409 `sin_entregable`. Probado en `servicio.test.ts`.
4. **El Caso 2 queda bloqueado hasta completar las clases,** y las clases no emiten certificado propio pero sí cuentan para el de la ruta. Probado en `clases.spec.ts` y en `certificados/servicio.test.ts`.
5. **Un `caso.yaml` de clases con campos de caso** (`entregable`, `empresa`) o con un `tipo` desconocido: el cargador lo rechaza con un mensaje claro. Probado en `cargar.test.ts`.

## Estructura de archivos

```
packages/content/src/esquemas.ts, tipos.ts, cargar.ts, validar.ts, sincronizar.ts (+ tests)   tipo clases, Sintaxis, pistas
packages/db/src/schema.ts, drizzle/0009_tipo_de_caso.sql                                         casos.tipo
apps/web/src/lib/progreso/servicio.ts, certificados/servicio.ts, portafolio.ts (+ tests)         completar, certificar, portafolio
apps/web/src/lib/unidad.ts (+ test)                                                               misión o lección
apps/web/src/components/mision/debrief.tsx, componentes.tsx, panel-caso.tsx                       pantallas
apps/web/src/app/(misiones)/casos/[caso]/page.tsx, [caso]/[mision]/page.tsx, rutas/[ruta]/page.tsx
packages/content/src/importar/ (leccion, aula-sql, importar-cli + tests), scripts/exportar-aula-v1.mjs
content/casos/clases-de-sql/ (caso.yaml, datos/ y 18 lecciones), content/rutas/data-analyst.yaml
apps/web/src/db/release.test.ts                                                                    8 casos
e2e/tests/progreso.ts, clases.spec.ts, minimarkets, pewen, clinica y proyecto-final .spec.ts, e2e/calentar.ts
README.md
```

---

### Task 1: Clases en el contenido y en la base

**Files:**
- Modify: `packages/content/src/esquemas.ts`, `tipos.ts`, `cargar.ts`, `validar.ts`, `sincronizar.ts`
- Test: `packages/content/src/cargar.test.ts`, `validar.test.ts`, `sincronizar.test.ts`
- Modify: `packages/db/src/schema.ts`
- Create (generada): `packages/db/drizzle/0009_tipo_de_caso.sql` y su `meta/`

**Interfaces:**
- Produces:
  - `TipoCaso = "caso" | "clases"` y `Caso.tipo` en `@syntaxerror/content/tipos`. En unas clases, `cargo`, `empresa` y `entregable` quedan vacíos, `archivos` es `[]` y `rubrica` es `RUBRICA_BASE`;
  - el bloque `Sintaxis` (`{ codigo, lenguaje: "sql" | "python" }`), y `Debrief.entrevista` opcional;
  - la columna `casos.tipo` (`text`, `caso` por defecto), que llena la sincronización.

- [ ] **Step 1: Escribir las pruebas**

En `packages/content/src/cargar.test.ts`, antes de `it("la rúbrica describe las tres dimensiones estándar, ...)`, agrega:
```ts
  it("unas clases no tienen empresa, entregable ni rúbrica, y no aceptan esos campos", async () => {
    const clases = "slug: ventas\ntipo: clases\ntitulo: Clases de SQL\ndataset: Datos de práctica\nmisiones:\n  - 01-filtrar\n  - 02-hoja\n  - 03-python\n";
    const dir = await mkdtemp(path.join(tmpdir(), "contenido-"));
    try {
      await cp(FIXTURE, dir, { recursive: true });
      await writeFile(enCaso(dir, "caso.yaml"), clases);
      const { casos } = await cargarContenido(dir);
      expect(casos[0]).toMatchObject({ tipo: "clases", titulo: "Clases de SQL", cargo: "", empresa: "", entregable: "", archivos: [], rubrica: RUBRICA_BASE });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
    const conEntregable = await problemasCon((dir) => writeFile(enCaso(dir, "caso.yaml"), `${clases}entregable: Un repositorio\n`));
    expect(conEntregable.some((problema) => problema.startsWith("casos/ventas/caso.yaml: ") && problema.includes("entregable"))).toBe(true);
    const sinTipoValido = await problemasCon((dir) => writeFile(enCaso(dir, "caso.yaml"), clases.replace("tipo: clases", "tipo: taller")));
    expect(sinTipoValido).toContain("casos/ventas/caso.yaml: tipo: tipo debe ser caso o clases");
  });

  it("un caso sin tipo es un caso de trabajo", async () => {
    const { casos } = await cargarContenido(FIXTURE);
    expect(casos[0].tipo).toBe("caso");
  });
```

En `packages/content/src/validar.test.ts`, antes de `it("la última misión de un caso publicado debe ser sin guía; ...)`, agrega:
```ts
  it("una pista no puede traer la solución completa, aunque cambien los espacios o las mayúsculas", async () => {
    const tarea = bloque(mision("01-filtrar"), "SqlTask");
    tarea.props.pistas = ["Filtra con WHERE.", `Usa:   ${tarea.props.solucion.toUpperCase()};`];
    expect(await validar()).toContain('casos/ventas/misiones/01-filtrar.mdx: una pista de la tarea "fuera-de-santiago" trae la solución completa');
  });

  it("en unas clases publicadas la última lección no tiene que ser sin guía", async () => {
    mision("03-python").sinGuia = false;
    contenido.casos[0].tipo = "clases";
    expect(await validar()).toEqual([]);
  });
```

En `packages/content/src/sincronizar.test.ts`:
1. En el caso de `contenido()`, agrega `tipo: "caso",` antes de `slug: "ventas",`.
2. La prueba de actualizar queda:
```ts
  it("actualiza el tipo, los títulos y las tareas sin cambiar el id del caso", async () => {
    await sincronizarContenido(db, contenido());
    const [antes] = await db.select().from(casos);
    const cambiado = contenido();
    cambiado.casos[0].titulo = "Ventas de marzo";
    cambiado.casos[0].tipo = "clases";
    cambiado.casos[0].misiones[1].bloques.push(tarea("t4"));
    await sincronizarContenido(db, cambiado);
    const [despues] = await db.select().from(casos).where(eq(casos.slug, "ventas"));
    expect(antes.tipo).toBe("caso");
    expect(despues.id).toBe(antes.id);
    expect(despues).toMatchObject({ titulo: "Ventas de marzo", tipo: "clases" });
    expect(despues.misiones[1].tareas).toEqual(["t3", "t4"]);
  });
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/cargar.test.ts src/validar.test.ts src/sincronizar.test.ts`
Expected: FAIL. `tipo` no existe en `Caso`, y la regla de las pistas todavía no está.

- [ ] **Step 3: Implementar el contenido**

En `packages/content/src/esquemas.ts`:

1. `casoSchema` se reemplaza por:
```ts
const casoDeTrabajoSchema = z.object({
  tipo: z.literal("caso"),
  slug,
  titulo: texto,
  cargo: texto,
  empresa: texto,
  dataset: texto,
  entregable: z.string({ required_error: "el caso debe declarar su entregable" }).trim().min(1, "el caso debe declarar su entregable"),
  archivos: z.array(z.string().regex(/^\.[a-z0-9]+$/, "cada archivo requerido es una extensión, por ejemplo .sql")).default([]),
  rubrica: rubricaSchema.default(RUBRICA_BASE),
  misiones: z.array(slug).min(1, "el caso necesita al menos una misión"),
});

// Clases: una lección por tema, traídas de las aulas de la v1, antes del caso que las aplica. No tienen empresa,
// entregable ni rúbrica: se completan al aprobar todas sus lecciones.
const casoDeClasesSchema = z
  .object({
    tipo: z.literal("clases"),
    slug,
    titulo: texto,
    dataset: texto,
    misiones: z.array(slug).min(1, "las clases necesitan al menos una lección"),
  })
  .strict();

// Sin "tipo", es un caso de trabajo: así los caso.yaml anteriores siguen igual.
export const casoSchema = z.preprocess(
  (datos) => (datos && typeof datos === "object" && !("tipo" in datos) ? { ...datos, tipo: "caso" } : datos),
  z.discriminatedUnion("tipo", [casoDeTrabajoSchema, casoDeClasesSchema], { errorMap: () => ({ message: "tipo debe ser caso o clases" }) })
);
```
2. La línea de `Debrief` en `bloqueSchemas` se reemplaza por:
```ts
  // En una lección de clases, el cierre explica la solución sin consejo de entrevista.
  Debrief: z.object({ entrevista: texto.optional() }),
  // La forma general de una instrucción, con nombres de ejemplo: se muestra pero no se ejecuta.
  Sintaxis: z.object({ codigo: texto, lenguaje: z.enum(["sql", "python"]) }),
```

`packages/content/src/tipos.ts` completo:
```ts
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
```

`packages/content/src/cargar.ts` completo:
```ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import Papa from "papaparse";
import { parse as parsearYaml } from "yaml";
import type { z } from "zod";
import type { Fila } from "@syntaxerror/engines/tipos";
import { extraerBloques, type BloqueCrudo } from "./bloques";
import { bloqueSchemas, casoSchema, formatearErrorZod, frontmatterSchema, rutaSchema, type Bloque, type TipoBloque } from "./esquemas";
import { RUBRICA_BASE } from "./rubrica";
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
  return { slug, titulo: frontmatter.titulo, tiempo: frontmatter.tiempo, sinGuia: frontmatter.sinGuia, fuente: archivo.content, bloques };
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

  const trabajo = datos.tipo === "caso" ? datos : { cargo: "", empresa: "", entregable: "", archivos: [], rubrica: RUBRICA_BASE };
  return {
    tipo: datos.tipo,
    slug: datos.slug,
    titulo: datos.titulo,
    cargo: trabajo.cargo,
    empresa: trabajo.empresa,
    dataset: datos.dataset,
    entregable: trabajo.entregable,
    archivos: trabajo.archivos,
    rubrica: trabajo.rubrica,
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
```

`packages/content/src/validar.ts` completo:
```ts
import { revisarMarkdown } from "@syntaxerror/engines/markdown";
import { aplicarSolucion, revisarHoja } from "@syntaxerror/engines/sheet";
import { revisarSql } from "@syntaxerror/engines/sql";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { hojaDeTarea, tablasSql } from "./datos";
import type { BloqueTarea, PropsBloque } from "./esquemas";
import { tareasDeMision } from "./publicacion";
import type { Caso, Contenido } from "./tipos";

export type RevisorPython = (tarea: PropsBloque<"PythonTask">, caso: Caso) => Promise<ResultadoTarea>;

const MAXIMO_PALABRAS_BRIEF = 150;
const BLOQUES_DE_GUIA = new Set(["Concepto", "SqlEjemplo", "PythonEjemplo", "Sintaxis"]);

// Para comparar una pista con la solución sin que importen los espacios, el punto y coma final ni las mayúsculas.
const normalizarCodigo = (codigo: string) => codigo.replace(/\s+/g, " ").replace(/;\s*$/, "").trim().toLowerCase();

// Las pistas orientan; la respuesta la escribe la persona (propuesta pedagógica, sección 6). Las aulas de la v1 tenían
// pistas con la consulta completa: esta regla evita que se cuelen al importarlas.
function pistaConSolucion(tarea: BloqueTarea): string | undefined {
  if (tarea.tipo !== "SqlTask" && tarea.tipo !== "PythonTask") return undefined;
  const solucion = normalizarCodigo(tarea.props.solucion);
  return tarea.props.pistas.find((pista) => normalizarCodigo(pista).includes(solucion));
}

function contarPalabras(texto: string): number {
  return texto.split(/\s+/).filter(Boolean).length;
}

async function revisarSolucion(tarea: BloqueTarea, caso: Caso, revisarPython: RevisorPython): Promise<ResultadoTarea> {
  switch (tarea.tipo) {
    case "SqlTask": {
      const tablas = tablasSql(caso);
      if (Object.keys(tablas).length === 0) return { aprobada: false, diagnostico: "el caso no tiene tablas en datos/" };
      return revisarSql(tablas, tarea.props, tarea.props.solucion);
    }
    case "SheetTask": {
      if (tarea.props.otras.includes(tarea.props.hoja)) return { aprobada: false, diagnostico: `la hoja ${tarea.props.hoja} no puede ser también una hoja de consulta` };
      const { grilla, opciones } = hojaDeTarea(caso, tarea.props);
      return revisarHoja(aplicarSolucion(grilla, tarea.props.solucion, opciones), tarea.props);
    }
    case "PythonTask":
      return revisarPython(tarea.props, caso);
    case "MarkdownTask":
      return revisarMarkdown(tarea.props.solucion, tarea.props.requisitos);
    case "GithubTask":
      // Se revisa contra el repositorio de cada persona: no hay una solución que validar de antemano.
      return { aprobada: true, diagnostico: null };
  }
}

export async function validarContenido(contenido: Contenido, { revisarPython }: { revisarPython: RevisorPython }): Promise<string[]> {
  const problemas: string[] = [];
  for (const caso of contenido.casos) {
    for (const mision of caso.misiones) {
      const donde = `casos/${caso.slug}/misiones/${mision.slug}.mdx`;
      const tareas = tareasDeMision(mision);
      if (tareas.length === 0) problemas.push(`${donde}: la misión no tiene ninguna tarea práctica (SqlTask, PythonTask, SheetTask, MarkdownTask o GithubTask)`);
      for (const bloque of mision.bloques) {
        if (bloque.tipo !== "Brief") continue;
        const palabras = contarPalabras(bloque.texto ?? "");
        if (palabras > MAXIMO_PALABRAS_BRIEF) problemas.push(`${donde}: el Brief tiene ${palabras} palabras (máximo ${MAXIMO_PALABRAS_BRIEF})`);
      }
      const vistos = new Set<string>();
      for (const tarea of tareas) {
        if (vistos.has(tarea.props.id)) problemas.push(`${donde}: el id de tarea "${tarea.props.id}" está repetido`);
        vistos.add(tarea.props.id);
      }
      if (mision.sinGuia) {
        for (const bloque of mision.bloques) {
          if (BLOQUES_DE_GUIA.has(bloque.tipo)) problemas.push(`${donde}: una misión sin guía no puede tener <${bloque.tipo}>`);
        }
        for (const tarea of tareas) {
          if (tarea.props.pistas.length > 0) problemas.push(`${donde}: una misión sin guía no puede tener pistas (tarea "${tarea.props.id}")`);
        }
      }
      for (const tarea of tareas) {
        if (pistaConSolucion(tarea)) problemas.push(`${donde}: una pista de la tarea "${tarea.props.id}" trae la solución completa`);
        let resultado: ResultadoTarea;
        try {
          resultado = await revisarSolucion(tarea, caso, revisarPython);
        } catch (error) {
          resultado = { aprobada: false, diagnostico: error instanceof Error ? error.message : String(error) };
        }
        if (!resultado.aprobada) {
          problemas.push(`${donde}: la solución de la tarea "${tarea.props.id}" no pasa su propio validador: ${resultado.diagnostico ?? "sin detalle"}`);
        }
      }
    }
    const publicado = contenido.rutas.some((ruta) => ruta.estado === "publicada" && ruta.casos.includes(caso.slug));
    const ultima = caso.misiones.at(-1);
    // En unas clases no se exige: el caso que viene después hace de misión sin guía.
    if (publicado && caso.tipo === "caso" && ultima && !ultima.sinGuia) {
      problemas.push(`casos/${caso.slug}: la última misión (${ultima.slug}) debe ser sin guía: agrega sinGuia: true a su frontmatter`);
    }
  }
  return problemas;
}
```

`packages/content/src/sincronizar.ts` completo:
```ts
import { eq, notInArray } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { casos, rutaCasos, rutas, type MisionResumen } from "@syntaxerror/db/schema";
import { tareasDeMision } from "./publicacion";
import type { Contenido } from "./tipos";

export async function sincronizarContenido(db: AppDb, contenido: Contenido): Promise<{ rutas: number; casos: number }> {
  return db.transaction(async (tx) => {
    const ahora = new Date();
    const idPorCaso = new Map<string, string>();

    for (const caso of contenido.casos) {
      const misiones: MisionResumen[] = caso.misiones.map((mision) => ({
        slug: mision.slug,
        titulo: mision.titulo,
        tareas: tareasDeMision(mision).map((tarea) => tarea.props.id),
      }));
      const datos = { tipo: caso.tipo, titulo: caso.titulo, cargo: caso.cargo, empresa: caso.empresa, entregable: caso.entregable, misiones, actualizadoEn: ahora };
      const [fila] = await tx.insert(casos).values({ slug: caso.slug, ...datos }).onConflictDoUpdate({ target: casos.slug, set: datos }).returning({ id: casos.id });
      idPorCaso.set(caso.slug, fila.id);
    }

    for (const ruta of contenido.rutas) {
      const datos = { titulo: ruta.titulo, cargo: ruta.cargo, descripcion: ruta.descripcion, estado: ruta.estado, actualizadoEn: ahora };
      const [fila] = await tx.insert(rutas).values({ slug: ruta.slug, ...datos }).onConflictDoUpdate({ target: rutas.slug, set: datos }).returning({ id: rutas.id });
      await tx.delete(rutaCasos).where(eq(rutaCasos.rutaId, fila.id));
      const orden = ruta.casos.map((slug, posicion) => {
        const casoId = idPorCaso.get(slug);
        if (!casoId) throw new Error(`La ruta ${ruta.slug} nombra el caso ${slug}, que no está en el contenido`);
        return { rutaId: fila.id, casoId, orden: posicion };
      });
      if (orden.length > 0) await tx.insert(rutaCasos).values(orden);
    }

    const vigentes = contenido.rutas.map((ruta) => ruta.slug);
    if (vigentes.length > 0) {
      await tx.update(rutas).set({ estado: "borrador", actualizadoEn: ahora }).where(notInArray(rutas.slug, vigentes));
    } else {
      await tx.update(rutas).set({ estado: "borrador", actualizadoEn: ahora });
    }

    return { rutas: contenido.rutas.length, casos: contenido.casos.length };
  });
}
```

- [ ] **Step 4: La base de datos**

En `packages/db/src/schema.ts`, en `casos`, después de `slug`, agrega:
```ts
    // "caso" (con entregable) o "clases" (lecciones de las aulas de la v1, sin entregable).
    tipo: text("tipo").notNull().default("caso"),
```

Run: `docker compose run --rm -T tools pnpm --filter @syntaxerror/db generate --name tipo_de_caso`
Expected: `packages/db/drizzle/0009_tipo_de_caso.sql`, con este contenido exacto:
```sql
ALTER TABLE "casos" ADD COLUMN "tipo" text DEFAULT 'caso' NOT NULL;
```

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/db migrate`

- [ ] **Step 5: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content test && pnpm --filter @syntaxerror/content exec tsc --noEmit && pnpm --filter @syntaxerror/db exec tsc --noEmit"`
Expected: PASS y sin errores de tipos. web todavía no compila: lo arregla la Task 2.

- [ ] **Step 6: Commit**

```bash
git add packages/content/src packages/db
git commit -m "feat(contenido): casos de tipo clases, bloque Sintaxis y pistas sin la solucion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Las clases en la plataforma

**Files:**
- Modify: `apps/web/src/lib/progreso/servicio.ts`, `apps/web/src/lib/certificados/servicio.ts`, `apps/web/src/lib/portafolio.ts`
- Test: `apps/web/src/lib/progreso/servicio.test.ts`, `apps/web/src/lib/certificados/servicio.test.ts`, `apps/web/src/lib/portafolio.test.ts`
- Create: `apps/web/src/lib/unidad.ts`, `apps/web/src/lib/unidad.test.ts`
- Modify: `apps/web/src/components/mision/debrief.tsx`, `componentes.tsx`, `panel-caso.tsx`
- Modify: `apps/web/src/app/(misiones)/casos/[caso]/page.tsx`, `apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx`, `apps/web/src/app/(misiones)/rutas/[ruta]/page.tsx`

**Interfaces:**
- Consumes: `Caso.tipo` y `casos.tipo` (Task 1).
- Produces:
  - unas clases se completan sin entregable; `enviarEntregable` responde `ErrorProgreso("sin_entregable")` (409);
  - unas clases completas no emiten certificado de caso, pero sí el de la ruta;
  - `obtenerPortafolio` lista solo los casos de tipo `caso`;
  - `unidad(tipo)` devuelve `{ nombre: "misión" | "lección", Nombre }`;
  - `<PanelCaso tipo>` y `<Debrief unidad>`.

- [ ] **Step 1: Escribir las pruebas**

`apps/web/src/lib/unidad.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { unidad } from "./unidad";

describe("unidad", () => {
  it("un caso tiene misiones y unas clases tienen lecciones", () => {
    expect(unidad("caso")).toEqual({ nombre: "misión", Nombre: "Misión" });
    expect(unidad("clases")).toEqual({ nombre: "lección", Nombre: "Lección" });
  });
});
```

En `apps/web/src/lib/progreso/servicio.test.ts`, antes de `it("rechaza intentos en una misión cuya anterior no está aprobada", ...)`, agrega:
```ts
  it("unas clases se completan al aprobar todas sus lecciones, sin entregable, y no aceptan uno", async () => {
    const { userId } = await prepararCaso();
    await db.update(casos).set({ tipo: "clases" });
    await aprobarM1(userId);
    expect(await registrarIntento(db, userId, intento("m2", "t3"))).toEqual({ misionAprobada: true, casoCompleto: true });
    expect(await obtenerProgresoCaso(db, userId, "ventas")).toMatchObject({ completo: true, entregable: null });
    await expect(enviarEntregable(db, userId, { caso: "ventas", url: "https://github.com/alumna/ventas", archivos: [] }, { verificar: verificadorPrueba })).rejects.toMatchObject({
      codigo: "sin_entregable",
    });
  });
```

En `apps/web/src/lib/certificados/servicio.test.ts`, antes de `it("un caso que no existe no emite nada", ...)`, agrega:
```ts
  it("unas clases completas no emiten certificado propio, pero sí el de la ruta", async () => {
    const userId = await escenario();
    await db.update(casos).set({ tipo: "clases" });
    expect((await emitirCertificadosDelCaso(db, userId, "ventas")).map((certificado) => certificado.tipo)).toEqual(["ruta"]);
  });
```

En `apps/web/src/lib/portafolio.test.ts`:
1. Agrega `import { eq } from "drizzle-orm";` como primera línea.
2. La prueba de los casos completos queda:
```ts
  it("muestra solo los casos completos, sin las clases, con su entregable y sus certificados", async () => {
    const id = await crearUsuaria();
    const completo = await crearCaso("ventas", "Ventas de marzo");
    const enCurso = await crearCaso("clientes", "Clientes de regiones");
    const clases = await crearCaso("clases-de-sql", "Clases de SQL");
    await db.update(casos).set({ tipo: "clases" }).where(eq(casos.id, clases));
    await db.insert(casoInscripciones).values([
      { userId: id, casoId: completo, completadoEn: new Date() },
      { userId: id, casoId: enCurso },
      { userId: id, casoId: clases, completadoEn: new Date() },
    ]);
    await db.insert(entregables).values({ userId: id, casoId: completo, url: "https://github.com/ana/ventas" });
    await emitirCertificadosDelCaso(db, id, "ventas");
    await actualizarPortafolio(db, id, { publico: true, usuario: "ana-rojas" }, SIN_META);

    const portafolio = await obtenerPortafolio(db, "Ana-Rojas");
    expect(portafolio).toMatchObject({ nombre: "Ana Rojas", usuario: "ana-rojas" });
    expect(portafolio?.casos.map((caso) => [caso.titulo, caso.entregable])).toEqual([
      ["Ventas de marzo", "https://github.com/ana/ventas"],
    ]);
    expect(portafolio?.certificados).toHaveLength(1);
  });
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/unidad.test.ts src/lib/progreso/servicio.test.ts src/lib/certificados src/lib/portafolio.test.ts`
Expected: FAIL. `./unidad` no existe, unas clases no se completan sin entregable, emiten certificado de caso y aparecen en el portafolio.

- [ ] **Step 3: Implementar el servidor**

`apps/web/src/lib/unidad.ts`:
```ts
import type { TipoCaso } from "@syntaxerror/content/tipos";

// Un caso se recorre en misiones; unas clases, en lecciones.
export function unidad(tipo: TipoCaso): { nombre: "misión" | "lección"; Nombre: "Misión" | "Lección" } {
  return tipo === "clases" ? { nombre: "lección", Nombre: "Lección" } : { nombre: "misión", Nombre: "Misión" };
}
```

En `apps/web/src/lib/progreso/servicio.ts`:
1. Agrega `| "sin_entregable"` al final de `CodigoErrorProgreso`.
2. En `actualizarCompletitud`, la condición queda:
```ts
  // Un caso se completa con todas las misiones aprobadas y el entregable aprobado por una persona con la rúbrica.
  // Unas clases no tienen entregable: se completan al aprobar todas sus lecciones.
  const misionesAprobadas = caso.misiones.length > 0 && caso.misiones.every((mision) => slugsAprobados.has(mision.slug));
  const completo = misionesAprobadas && (caso.tipo === "clases" || entregable?.estado === "aprobado");
```
3. En `enviarEntregable`, justo después de `const caso = await buscarCaso(db, entrada.caso);`, agrega:
```ts
  if (caso.tipo === "clases") throw new ErrorProgreso("sin_entregable");
```

En `apps/web/src/lib/certificados/servicio.ts`, en `emitirCertificadosDelCaso`, el certificado del caso queda:
```ts
  // Las clases no tienen certificado propio: certifican los casos, que dejan evidencia de trabajo. Sí cuentan para
  // completar la ruta.
  if (inscripcion?.completadoEn && caso.tipo === "caso") {
```

En `apps/web/src/lib/portafolio.ts`, el `where` de `casosCompletos` queda:
```ts
    // Las clases no van al portafolio: lo que se muestra son los casos, que dejan evidencia de trabajo.
    .where(and(eq(casoInscripciones.userId, dueno.id), isNotNull(casoInscripciones.completadoEn), eq(casos.tipo, "caso")))
```

- [ ] **Step 4: Implementar las pantallas**

`apps/web/src/components/mision/debrief.tsx` completo:
```tsx
"use client";

import type { ReactNode } from "react";
import { useMision } from "./mision-provider";

// El cierre aparece al aprobar. En una lección explica la solución; en una misión suma cómo contarlo en una entrevista.
export function Debrief({ entrevista, unidad = { nombre: "misión", Nombre: "Misión" }, children }: { entrevista?: string; unidad?: { nombre: string; Nombre: string }; children: ReactNode }) {
  const { completa } = useMision();
  if (!completa) return <section className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">{`Aprueba las tareas de esta ${unidad.nombre} para ver el cierre.`}</section>;
  return (
    <section className="card grid gap-3 border-l-4 border-l-primary p-5">
      <h2 className="text-xl font-black">{`${unidad.Nombre} aprobada`}</h2>
      <div className="grid gap-3 leading-7">{children}</div>
      {entrevista ? (
        <div className="rounded-md bg-surface-raised p-4 text-sm leading-6">
          <p className="font-bold">En una entrevista</p>
          <p>{entrevista}</p>
        </div>
      ) : null}
    </section>
  );
}
```

`apps/web/src/components/mision/componentes.tsx` completo:
```tsx
import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import { hojaDeTarea, tablasSql } from "@syntaxerror/content/datos";
import { bloqueSchemas } from "@syntaxerror/content/esquemas";
import type { Caso } from "@syntaxerror/content/tipos";
import { calcularEsperado } from "@syntaxerror/engines/sql";
import { CodigoResaltado } from "@/components/consola/codigo-resaltado";
import { unidad } from "@/lib/unidad";
import { Brief, Concepto } from "./bloques";
import { Debrief } from "./debrief";
import { Decision } from "./decision";
import { GithubTask } from "./github-task";
import { MarkdownTask } from "./markdown-task";
import { PythonEjemplo } from "./python-ejemplo";
import { PythonTask } from "./python-task";
import { SheetTask } from "./sheet-task";
import { SqlEjemplo } from "./sql-ejemplo";
import { SqlTask } from "./sql-task";

type PropsMdx = Record<string, unknown> & { children?: ReactNode };

export function componentesMision(caso: Caso): MDXComponents {
  const tablas = tablasSql(caso);
  return {
    Brief: ({ children, ...props }: PropsMdx) => <Brief {...bloqueSchemas.Brief.parse(props)}>{children}</Brief>,
    Concepto: ({ children }: PropsMdx) => <Concepto>{children}</Concepto>,
    SqlEjemplo: (props: PropsMdx) => {
      const ejemplo = bloqueSchemas.SqlEjemplo.parse(props);
      return <SqlEjemplo {...ejemplo} tablas={tablas} resaltado={<CodigoResaltado codigo={ejemplo.consulta} lenguaje="sql" />} />;
    },
    PythonEjemplo: (props: PropsMdx) => {
      const ejemplo = bloqueSchemas.PythonEjemplo.parse(props);
      return <PythonEjemplo {...ejemplo} resaltado={<CodigoResaltado codigo={ejemplo.codigo} lenguaje="python" />} />;
    },
    SqlTask: (props: PropsMdx) => {
      const { solucion, ...tarea } = bloqueSchemas.SqlTask.parse(props);
      const esperadas = calcularEsperado(tablas, { solucion, comparar: tarea.comparar, verificar: tarea.verificar });
      return <SqlTask {...tarea} esperadas={esperadas} tablas={tablas} />;
    },
    SheetTask: (props: PropsMdx) => {
      const { solucion: _solucion, ...resto } = bloqueSchemas.SheetTask.parse(props);
      const { grilla, opciones } = hojaDeTarea(caso, resto);
      const { hoja: _hoja, otras: _otras, inicial: _inicial, ...tarea } = resto;
      return <SheetTask {...tarea} grilla={grilla} opciones={opciones} />;
    },
    PythonTask: (props: PropsMdx) => {
      const { solucion: _solucion, paquetes: _paquetes, ...tarea } = bloqueSchemas.PythonTask.parse(props);
      return <PythonTask {...tarea} />;
    },
    MarkdownTask: (props: PropsMdx) => {
      const { solucion: _solucion, ...tarea } = bloqueSchemas.MarkdownTask.parse(props);
      return <MarkdownTask {...tarea} />;
    },
    GithubTask: (props: PropsMdx) => <GithubTask {...bloqueSchemas.GithubTask.parse(props)} />,
    Decision: (props: PropsMdx) => <Decision {...bloqueSchemas.Decision.parse(props)} />,
    Debrief: ({ children, ...props }: PropsMdx) => (
      <Debrief {...bloqueSchemas.Debrief.parse(props)} unidad={unidad(caso.tipo)}>
        {children}
      </Debrief>
    ),
    Sintaxis: (props: PropsMdx) => {
      const { codigo, lenguaje } = bloqueSchemas.Sintaxis.parse(props);
      return (
        <figure className="grid gap-2 rounded-md border border-dashed border-border p-4">
          <figcaption className="font-mono text-xs font-bold uppercase text-muted-foreground">Sintaxis</figcaption>
          <CodigoResaltado codigo={codigo} lenguaje={lenguaje} />
        </figure>
      );
    },
  };
}
```

`apps/web/src/components/mision/panel-caso.tsx` completo:
```tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { PLAZO_REVISION_DIAS_HABILES } from "@/lib/entregables/plazo";
import { cargarProgreso, dependenciasNavegador, type ProgresoVisible } from "@/lib/progreso/cliente";
import type { TipoCaso } from "@syntaxerror/content/tipos";
import type { CasoCorto } from "@/lib/progreso/requisitos";
import { unidad } from "@/lib/unidad";
import { ResultadoRevision } from "./resultado-revision";

type MisionDelCaso = { slug: string; titulo: string; tiempo: number; tareas: string[]; sinGuia: boolean };

const MENSAJES_409: Record<string, string> = {
  misiones_pendientes: "Aprueba todas las misiones antes de enviar tu entregable.",
  entregable_aprobado: "Tu entregable ya fue aprobado.",
  caso_bloqueado: "Primero completa el caso anterior de la ruta.",
};

function etiquetaEstado(estado: "en_curso" | "aprobada" | undefined): string {
  if (estado === "aprobada") return "Aprobada";
  if (estado === "en_curso") return "En curso";
  return "Pendiente";
}

export function PanelCaso({ caso, tipo = "caso", misiones, entregable, requisitos }: { caso: string; tipo?: TipoCaso; misiones: MisionDelCaso[]; entregable: string; requisitos: CasoCorto[] }) {
  const [progreso, setProgreso] = useState<ProgresoVisible | null>(null);
  const [url, setUrl] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const tareasPorMision = useMemo(() => Object.fromEntries(misiones.map((mision) => [mision.slug, mision.tareas])), [misiones]);

  useEffect(() => {
    let vigente = true;
    void cargarProgreso(caso, tareasPorMision, dependenciasNavegador()).then((cargado) => {
      if (!vigente) return;
      setProgreso(cargado);
      if (cargado.entregable) setUrl(cargado.entregable);
    });
    return () => {
      vigente = false;
    };
  }, [caso, tareasPorMision]);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje(null);
    setProblemas([]);
    try {
      const respuesta = await fetch("/api/entregables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caso, url }) });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string; problemas?: string[] };
      if (respuesta.ok) {
        setProgreso((actual) => (actual ? { ...actual, entregable: url, revision: { estado: "pendiente", puntajes: {}, observaciones: {}, comentario: null } } : actual));
        setMensaje("Recibimos tu entregable. Te avisaremos por email cuando lo revisen.");
      } else if (respuesta.status === 422) setProblemas(datos.problemas ?? []);
      else if (respuesta.status === 400) setMensaje("El enlace debe ser un repositorio de GitHub: https://github.com/tu-usuario/tu-repositorio");
      else if (respuesta.status === 409) setMensaje(MENSAJES_409[datos.error ?? ""] ?? "No pudimos enviar tu entregable.");
      else if (respuesta.status === 429) setMensaje("Enviaste varios entregables seguidos. Espera un rato antes de volver a intentarlo.");
      else setMensaje("No pudimos enviar tu entregable. Intenta de nuevo.");
    } catch {
      setMensaje("No pudimos enviar tu entregable. Revisa tu conexión.");
    } finally {
      setEnviando(false);
    }
  }

  const casoPendiente = progreso ? (progreso.sesion ? progreso.bloqueadoPor : (requisitos[0] ?? null)) : null;
  const todasAprobadas = misiones.every((mision) => progreso?.misiones[mision.slug]?.estado === "aprobada");
  const revision = progreso?.revision ?? null;
  const volverAqui = `/login?callbackUrl=${encodeURIComponent(`/casos/${caso}`)}`;

  const formulario = (
    <form className="grid gap-3" onSubmit={enviar}>
      <Label>
        Enlace a tu repositorio de GitHub
        <Input name="url" type="url" required placeholder="https://github.com/tu-usuario/tu-repositorio" value={url} onChange={(evento) => setUrl(evento.target.value)} />
      </Label>
      <div><Button type="submit" disabled={enviando}>{enviando ? "Revisando tu repositorio…" : "Enviar a revisión"}</Button></div>
    </form>
  );

  return (
    <div className="grid gap-8">
      {casoPendiente ? (
        <p role="status" className="card p-4 text-sm leading-6">
          Puedes recorrer este caso, pero sus tareas se habilitan al completar{" "}
          <Link className="font-bold text-primary hover:underline" href={`/casos/${casoPendiente.slug}`}>{`«${casoPendiente.titulo}»`}</Link>.
          {progreso && !progreso.sesion ? <> <Link className="font-bold text-primary hover:underline" href={volverAqui}>Entrar</Link></> : null}
        </p>
      ) : null}
      <ol className="grid gap-3">
        {misiones.map((mision, indice) => (
          <li key={mision.slug}>
            <Link href={`/casos/${caso}/${mision.slug}`} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
              <span>
                <span className="block font-mono text-xs text-muted-foreground">{`${unidad(tipo).Nombre} ${indice + 1} · ${mision.tiempo} min${mision.sinGuia ? " · sin guía" : ""}`}</span>
                <span className="block font-bold">{mision.titulo}</span>
              </span>
              <span data-testid={`estado-${mision.slug}`} className="badge">{etiquetaEstado(progreso?.misiones[mision.slug]?.estado)}</span>
            </Link>
          </li>
        ))}
      </ol>
      {tipo === "clases" ? (
        // Unas clases no tienen entregable: se completan al aprobar todas sus lecciones.
        <section className="card grid gap-3 p-5">
          <h2 className="text-xl font-black">Tu avance</h2>
          {progreso?.completo ? (
            <p role="status" className="font-bold text-primary">Clases completas: ya puedes seguir con el caso siguiente de la ruta.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Aprueba todas las lecciones para completar las clases y habilitar el caso siguiente.</p>
          )}
        </section>
      ) : (
      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-black">Tu entregable</h2>
        <p className="leading-7 text-muted-foreground">{entregable}</p>
        {progreso?.completo ? <p role="status" className="font-bold text-primary">Caso completo</p> : null}
        {progreso?.certificados.length ? (
          <ul className="grid gap-2">
            {progreso.certificados.map((certificado) => (
              <li key={certificado.codigo}>
                <Link className="font-bold text-primary hover:underline" href={`/certificados/${certificado.codigo}`}>
                  Ver certificado de {certificado.tipo === "ruta" ? "ruta" : "caso"}: {certificado.titulo}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {!progreso ? null : !progreso.sesion ? (
          <p className="text-sm">Para enviar tu entregable necesitas una cuenta. <Link className="font-bold text-primary hover:underline" href={volverAqui}>Entrar</Link></p>
        ) : revision?.estado === "aprobado" ? (
          <div className="grid gap-3 text-sm leading-6">
            <p>
              Entregable aprobado: <a className="font-bold text-primary hover:underline" href={progreso.entregable ?? "#"} target="_blank" rel="noopener noreferrer">{progreso.entregable}</a>
            </p>
            <ResultadoRevision revision={revision} />
          </div>
        ) : revision?.estado === "pendiente" ? (
          <p role="status" className="text-sm leading-6">
            {`Tu entregable está en revisión. Te responderemos en un plazo de ${PLAZO_REVISION_DIAS_HABILES} días hábiles y te avisaremos por email. Enviaste: `}
            <a className="font-bold text-primary hover:underline" href={progreso.entregable ?? "#"} target="_blank" rel="noopener noreferrer">{progreso.entregable}</a>
          </p>
        ) : !todasAprobadas ? (
          <p className="text-sm text-muted-foreground">Aprueba todas las misiones, incluida la misión sin guía, para enviar tu entregable a revisión.</p>
        ) : (
          <>
            {revision?.estado === "observado" ? (
              <div role="status" className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6">
                <p className="font-bold">Tu docente pidió cambios:</p>
                <ResultadoRevision revision={revision} />
                <p>Haz los ajustes en tu repositorio y vuelve a enviarlo, sin penalización.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Revisaremos que tu repositorio sea público, tenga un README y los archivos del caso. Luego, una persona lo revisa con la rúbrica del caso.</p>
            )}
            {formulario}
          </>
        )}

        {problemas.length > 0 ? (
          <div role="alert" className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <p className="font-bold">No pudimos aceptar tu entregable:</p>
            <ul className="list-disc pl-5">{problemas.map((problema) => <li key={problema}>{problema}</li>)}</ul>
          </div>
        ) : null}
        {mensaje ? <p role="status" className="text-sm font-bold">{mensaje}</p> : null}
      </section>
      )}
    </div>
  );
}
```

`apps/web/src/app/(misiones)/casos/[caso]/page.tsx` completo:
```tsx
import { notFound } from "next/navigation";
import { tareasDeMision } from "@syntaxerror/content/publicacion";
import { ResenasCaso } from "@/components/comunidad/resenas-caso";
import { DatosDelCaso } from "@/components/mision/datos-del-caso";
import { PanelCaso } from "@/components/mision/panel-caso";
import { RubricaDelCaso } from "@/components/mision/rubrica-del-caso";
import { casosParaPublicar, obtenerCaso, rutasParaPublicar } from "@/lib/contenido";
import { requisitosDelCaso } from "@/lib/progreso/requisitos-contenido";

export const dynamic = "error";
export const dynamicParams = false;
type Parametros = { params: Promise<{ caso: string }> };

export async function generateStaticParams() {
  return (await casosParaPublicar()).map((caso) => ({ caso: caso.slug }));
}

export async function generateMetadata({ params }: Parametros) {
  const caso = await obtenerCaso((await params).caso);
  return { title: caso?.titulo ?? "Caso" };
}

export default async function CasoPage({ params }: Parametros) {
  const caso = await obtenerCaso((await params).caso);
  if (!caso) notFound();
  const requisitos = requisitosDelCaso(await rutasParaPublicar(), await casosParaPublicar(), caso.slug);
  const esClases = caso.tipo === "clases";
  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-3">
        <p className="font-mono text-sm font-bold text-primary">{esClases ? "> clases" : `> caso: ${caso.empresa}`}</p>
        <h1 className="text-3xl font-black">{caso.titulo}</h1>
        <p className="leading-7 text-muted-foreground">
          {esClases
            ? `Una lección por tema, paso a paso y con datos de práctica: ${caso.dataset}. Al aprobarlas todas se habilita el caso siguiente, donde las usas en un trabajo real.`
            : `Llegas como ${caso.cargo.toLowerCase()} a ${caso.empresa}. Datos del caso: ${caso.dataset}.`}
        </p>
      </header>
      <PanelCaso
        caso={caso.slug}
        tipo={caso.tipo}
        entregable={caso.entregable}
        requisitos={requisitos}
        misiones={caso.misiones.map((mision) => ({ slug: mision.slug, titulo: mision.titulo, tiempo: mision.tiempo, sinGuia: mision.sinGuia, tareas: tareasDeMision(mision).map((tarea) => tarea.props.id) }))}
      />
      {esClases ? null : <RubricaDelCaso rubrica={caso.rubrica} />}
      <DatosDelCaso caso={caso.slug} datos={caso.datos} />
      <ResenasCaso caso={caso.slug} />
    </main>
  );
}
```

En `apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx`:
1. Agrega `import { unidad } from "@/lib/unidad";` después del import de `requisitos-contenido`.
2. El encabezado queda:
```tsx
        <p className="font-mono text-sm font-bold text-primary">{`> ${unidad(caso.tipo).nombre} ${indice + 1}/${caso.misiones.length} · ${mision.tiempo} min`}</p>
```

`apps/web/src/app/(misiones)/rutas/[ruta]/page.tsx` completo:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { casosDeRuta, obtenerRuta, rutasParaPublicar } from "@/lib/contenido";

export const dynamic = "error";
export const dynamicParams = false;
type Parametros = { params: Promise<{ ruta: string }> };

export async function generateStaticParams() {
  return (await rutasParaPublicar()).map((ruta) => ({ ruta: ruta.slug }));
}

export async function generateMetadata({ params }: Parametros) {
  const ruta = await obtenerRuta((await params).ruta);
  return { title: ruta?.titulo ?? "Ruta" };
}

export default async function RutaPage({ params }: Parametros) {
  const ruta = await obtenerRuta((await params).ruta);
  if (!ruta) notFound();
  const casos = await casosDeRuta(ruta);
  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-3">
        <p className="font-mono text-sm font-bold text-primary">{`> ruta: ${ruta.cargo}`}</p>
        <h1 className="text-3xl font-black">{ruta.titulo}</h1>
        <p className="leading-7 text-muted-foreground">{ruta.descripcion}</p>
      </header>
      <ol className="grid gap-3">
        {casos.map((caso, indice) => {
          // Las clases van antes del caso que las aplica y no cuentan en la numeración de los casos.
          const esClases = caso.tipo === "clases";
          const numero = casos.slice(0, indice + 1).filter((anterior) => anterior.tipo === "caso").length;
          return (
            <li key={caso.slug}>
              <Link href={`/casos/${caso.slug}`} className="card grid gap-1 p-5 hover:border-primary">
                <span className="font-mono text-xs text-muted-foreground">{esClases ? "Clases" : `Caso ${numero} · ${caso.empresa}`}</span>
                <span className="text-lg font-black">{caso.titulo}</span>
                <span className="text-sm text-muted-foreground">{`${caso.misiones.length} ${esClases ? "lecciones" : "misiones"}`}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
```

- [ ] **Step 5: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && pnpm --filter web exec tsc --noEmit"`
Expected: PASS y sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat(clases): se completan sin entregable, sin certificado propio ni portafolio, con lecciones en pantalla

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: El importador de aulas

**Files:**
- Create: `packages/content/src/importar/leccion.ts`, `aula-sql.ts`, `importar-cli.ts`
- Test: `packages/content/src/importar/leccion.test.ts`, `aula-sql.test.ts`
- Create: `packages/content/scripts/exportar-aula-v1.mjs`
- Modify: `packages/content/package.json`

**Interfaces:**
- Consumes: `aCsv` (`generadores/despachos-rapidos`), `extraerBloques` (`bloques`).
- Produces:
  - en `importar/leccion`:
    - el formato común: los tipos `Leccion`, `Seccion` y `TareaSql`;
    - `leccionAMdx(leccion)`, `corregirTildes(texto, excepto?)` y `escaparTexto(texto)`;
  - en `importar/aula-sql`: `convertirLeccionSql(v1, numero, excepto)`, `datosSql(aula, tablas)`, `identificadores(aula)`, `pistaUtil(pista, solucion)`, `corregirNombres(texto)` y `NOMBRES_SQL`;
  - el comando `pnpm --filter @syntaxerror/content importar sql <aula.json> <destino> <lecciones>`.

- [ ] **Step 1: Escribir las pruebas**

`packages/content/src/importar/leccion.test.ts`:
```ts
import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import { extraerBloques } from "../bloques";
import { corregirTildes, escaparTexto, leccionAMdx, type Leccion } from "./leccion";

const leccion: Leccion = {
  slug: "01-where",
  titulo: "Filtros con WHERE",
  minutos: 14,
  intro: ["WHERE decide qué filas pasan {siempre} y < todas."],
  sintaxis: { lenguaje: "sql", codigo: "SELECT columnas\nFROM tabla\nWHERE condicion;" },
  secciones: [
    { titulo: "Filtrar por texto", parrafos: ["Los textos van entre comillas."], ejemplo: "SELECT nombre FROM estudiantes WHERE ciudad = 'Santiago';" },
    { titulo: "Sin ejemplo", parrafos: ["Solo texto."], ejemplo: null },
  ],
  tarea: {
    tipo: "SqlTask",
    id: "where-filtros",
    enunciado: 'Muestra los de "Santiago".',
    inicial: "SELECT nombre FROM estudiantes;",
    solucion: "SELECT nombre FROM estudiantes WHERE ciudad = 'Santiago';",
    comparar: "filas-sin-orden",
    pistas: ["El filtro va en WHERE."],
  },
  cierre: "WHERE filtra filas.",
};

describe("corregirTildes", () => {
  it("corrige las palabras del diccionario y respeta las mayúsculas", () => {
    expect(corregirTildes("Despues de la leccion tambien hay informacion")).toBe("Después de la lección también hay información");
  });

  it("no toca los valores entre comillas simples ni los nombres de tablas y columnas", () => {
    expect(corregirTildes("Reemplaza NULL por 'Sin inscripcion' en la funcion")).toBe("Reemplaza NULL por 'Sin inscripcion' en la función");
    expect(corregirTildes("La columna codigo y el codigo", new Set(["codigo"]))).toBe("La columna codigo y el codigo");
  });

  it("«como» y «Para que sirve» solo se corrigen en títulos o preguntas", () => {
    expect(corregirTildes("Como pensarlo sin sufrir")).toBe("Cómo pensarlo sin sufrir");
    expect(corregirTildes("Es como una planilla")).toBe("Es como una planilla");
    expect(corregirTildes("¿como se usa?")).toBe("¿cómo se usa?");
    expect(corregirTildes("Para que sirve en la vida real")).toBe("Para qué sirve en la vida real");
  });
});

describe("leccionAMdx", () => {
  it("escapa lo que MDX leería como código", () => {
    expect(escaparTexto("usa {x} y a < b")).toBe("usa &#123;x&#125; y a &lt; b");
  });

  it("escribe concepto, sintaxis, ejemplos, la tarea y el cierre, y el MDX se puede leer de vuelta", async () => {
    const mdx = leccionAMdx(leccion);
    const archivo = matter(mdx);
    expect(archivo.data).toEqual({ titulo: "Filtros con WHERE", tiempo: 14 });
    const bloques = await extraerBloques(archivo.content);
    expect(bloques.map((bloque) => bloque.tipo)).toEqual(["Concepto", "Sintaxis", "SqlEjemplo", "SqlTask", "Debrief"]);
    const tarea = bloques.find((bloque) => bloque.tipo === "SqlTask");
    expect(tarea?.props).toMatchObject({ id: "where-filtros", enunciado: 'Muestra los de "Santiago".', solucion: leccion.tarea.solucion, pistas: ["El filtro va en WHERE."] });
    expect(mdx).toContain("WHERE decide qué filas pasan &#123;siempre&#125; y &lt; todas.");
  });

  it("sin cierre no escribe Debrief", () => {
    expect(leccionAMdx({ ...leccion, cierre: null })).not.toContain("<Debrief>");
  });
});
```

`packages/content/src/importar/aula-sql.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { convertirLeccionSql, corregirNombres, datosSql, identificadores, pistaUtil, type AulaV1, type LeccionSqlV1 } from "./aula-sql";

const aula: AulaV1 = {
  datasets: {
    estudiantes: [{ id: 1, nombre: "Tomas Muñoz", ciudad: "Concepcion", codigo: "A1" }],
    cursos: [{ id: 101, titulo: "SQL inicial", nivel: "Basico" }],
  },
  lessons: [],
};

const v1: LeccionSqlV1 = {
  slug: "where-filtros",
  title: "Filtros con WHERE",
  duration: "14 min",
  type: "exercise-select",
  intro: ["WHERE decide que filas pasan.", "Despues se ordena."],
  syntaxExample: "SELECT columnas\nFROM tabla\nWHERE condicion;",
  sections: [
    { heading: "Como pensarlo sin sufrir", body: ["Es como un filtro de la tabla codigo."], code: null },
    { heading: "Filtrar por texto", body: ["Compara con 'Concepcion'."], code: "SELECT nombre FROM estudiantes WHERE ciudad = 'Concepcion';" },
  ],
  starter: "SELECT nombre FROM estudiantes;",
  expected: "SELECT nombre FROM estudiantes WHERE ciudad = 'Concepcion' ORDER BY nombre;",
  prompt: "Muestra los estudiantes de Concepcion, en orden alfabetico.",
  explanation: "WHERE filtra y ORDER BY ordena despues.",
  hint: "Usa WHERE ciudad = 'Concepcion' ORDER BY nombre en un SELECT nombre FROM estudiantes.",
};

describe("convertirLeccionSql", () => {
  it("convierte una lección de consulta: tildes en el texto, nombres corregidos en todas partes y la tabla como identificador", () => {
    const leccion = convertirLeccionSql(v1, 3, identificadores(aula));
    expect(leccion).toMatchObject({
      slug: "03-where-filtros",
      titulo: "Filtros con WHERE",
      minutos: 14,
      intro: ["WHERE decide que filas pasan.", "Después se ordena."],
      sintaxis: { lenguaje: "sql", codigo: v1.syntaxExample },
      cierre: "WHERE filtra y ORDER BY ordena después.",
    });
    expect(leccion.secciones[0]).toEqual({ titulo: "Cómo pensarlo sin sufrir", parrafos: ["Es como un filtro de la tabla codigo."], ejemplo: null });
    expect(leccion.secciones[1].ejemplo).toBe("SELECT nombre FROM estudiantes WHERE ciudad = 'Concepción';");
    expect(leccion.tarea).toEqual({
      tipo: "SqlTask",
      id: "where-filtros",
      enunciado: "Muestra los estudiantes de Concepción, en orden alfabético.",
      inicial: "SELECT nombre FROM estudiantes;",
      solucion: "SELECT nombre FROM estudiantes WHERE ciudad = 'Concepción' ORDER BY nombre;",
      comparar: "filas-en-orden",
      pistas: [],
    });
  });

  it("sin ORDER BY compara sin importar el orden; una lección que no es de consulta no se importa", () => {
    const sinOrden = convertirLeccionSql({ ...v1, expected: "SELECT nombre FROM estudiantes;" }, 1, new Set());
    expect(sinOrden.tarea.comparar).toBe("filas-sin-orden");
    expect(() => convertirLeccionSql({ ...v1, type: "exercise-dml" }, 1, new Set())).toThrow("solo importa SELECT");
  });
});

describe("pistaUtil", () => {
  it("descarta las pistas que traen la consulta completa o casi", () => {
    expect(pistaUtil("Usa SELECT nombre FROM estudiantes.", "SELECT nombre FROM estudiantes;")).toEqual([]);
    expect(pistaUtil("select nombre   from estudiantes", "SELECT nombre FROM estudiantes;")).toEqual([]);
    expect(pistaUtil("Necesitas dos condiciones unidas por AND.", "SELECT 1;")).toEqual(["Necesitas dos condiciones unidas por AND."]);
    expect(pistaUtil(undefined, "SELECT 1;")).toEqual([]);
  });
});

describe("datos", () => {
  it("corrige los nombres propios de los datos de práctica y nombra cada tabla", () => {
    expect(corregirNombres("Tomas vive en Concepcion")).toBe("Tomás vive en Concepción");
    expect(datosSql(aula, ["estudiantes"])).toEqual({ estudiantes: [{ id: 1, nombre: "Tomás Muñoz", ciudad: "Concepción", codigo: "A1" }] });
    expect(() => datosSql(aula, ["profesores"])).toThrow("El aula no tiene la tabla profesores");
    expect(identificadores(aula)).toEqual(new Set(["estudiantes", "id", "nombre", "ciudad", "codigo", "cursos", "titulo", "nivel"]));
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/importar`
Expected: FAIL, "Failed to resolve import ./leccion".

- [ ] **Step 3: Implementar**

`packages/content/src/importar/leccion.ts`:
```ts
// Formato común de una lección importada desde un aula de la v1, y su escritura como MDX de la v2.
// Cada aula tiene su adaptador (aula-sql.ts, y después Excel, Python y Power BI) que llena este formato; el resto
// del camino (escribir el MDX, el caso.yaml y los datos) es el mismo para todas.
//
// Lo que sale de aquí es un borrador: después viene la revisión editorial (tildes que el diccionario no cubre, tono
// de tú, pistas que orientan sin dar la respuesta). El validador de contenido revisa que cada solución pase.

export type Seccion = { titulo: string; parrafos: string[]; ejemplo: string | null };

export type TareaSql = {
  tipo: "SqlTask";
  id: string;
  enunciado: string;
  inicial: string;
  solucion: string;
  comparar: "filas-en-orden" | "filas-sin-orden";
  pistas: string[];
};

export type Leccion = {
  slug: string;
  titulo: string;
  minutos: number;
  intro: string[];
  sintaxis: { lenguaje: "sql" | "python"; codigo: string } | null;
  secciones: Seccion[];
  tarea: TareaSql;
  // Se muestra al aprobar la lección: explica por qué la solución funciona.
  cierre: string | null;
};

// En el texto de MDX, «{» abre una expresión y «<» una etiqueta: se escriben como caracteres.
export function escaparTexto(texto: string): string {
  return texto.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;").replace(/</g, "&lt;");
}

// Los atributos van como expresión JavaScript ({"..."}): así pueden tener comillas y saltos de línea.
const atributo = (valor: string) => `{${JSON.stringify(valor)}}`;

function seccionMdx(seccion: Seccion): string {
  const partes = [`**${escaparTexto(seccion.titulo)}.** ${seccion.parrafos.map(escaparTexto).join(" ")}`];
  if (seccion.ejemplo) partes.push(`<SqlEjemplo consulta=${atributo(seccion.ejemplo)} />`);
  return partes.join("\n\n");
}

export function leccionAMdx(leccion: Leccion): string {
  const concepto = [
    ...leccion.intro.map(escaparTexto),
    ...(leccion.sintaxis ? [`<Sintaxis lenguaje="${leccion.sintaxis.lenguaje}" codigo=${atributo(leccion.sintaxis.codigo)} />`] : []),
    ...leccion.secciones.map(seccionMdx),
  ];
  const { tarea } = leccion;
  const lineas = [
    "---",
    `titulo: ${JSON.stringify(leccion.titulo)}`,
    `tiempo: ${leccion.minutos}`,
    "---",
    "",
    "<Concepto>",
    concepto.join("\n\n"),
    "</Concepto>",
    "",
    "<SqlTask",
    `  id="${tarea.id}"`,
    `  enunciado=${atributo(tarea.enunciado)}`,
    `  inicial=${atributo(tarea.inicial)}`,
    `  solucion=${atributo(tarea.solucion)}`,
    `  comparar="${tarea.comparar}"`,
    `  pistas={${JSON.stringify(tarea.pistas)}}`,
    "/>",
  ];
  if (leccion.cierre) lineas.push("", "<Debrief>", escaparTexto(leccion.cierre), "</Debrief>");
  return `${lineas.join("\n")}\n`;
}

// Tildes que faltan en los textos de la v1. Solo palabras sin ambigüedad («mas» puede ser «más» o «mas», y «practica»,
// verbo o sustantivo: quedan para la revisión). No se aplica a los nombres de tablas y columnas, que se escriben sin
// tilde a propósito.
const TILDES: Record<string, string> = {
  accion: "acción",
  ademas: "además",
  agregacion: "agregación",
  alfabetico: "alfabético",
  analisis: "análisis",
  analitica: "analítica",
  anio: "año",
  anios: "años",
  aqui: "aquí",
  aritmeticos: "aritméticos",
  basico: "básico",
  busqueda: "búsqueda",
  calculo: "cálculo",
  categoria: "categoría",
  cirugia: "cirugía",
  codigo: "código",
  como: "cómo",
  comun: "común",
  condicion: "condición",
  despues: "después",
  dia: "día",
  dias: "días",
  dificil: "difícil",
  dinamico: "dinámico",
  donde: "dónde",
  especifica: "específica",
  especificas: "específicas",
  evalua: "evalúa",
  expresion: "expresión",
  facil: "fácil",
  funcion: "función",
  informacion: "información",
  inscribio: "inscribió",
  inscripcion: "inscripción",
  leccion: "lección",
  logica: "lógica",
  manipulacion: "manipulación",
  maximo: "máximo",
  mayusculas: "mayúsculas",
  minimo: "mínimo",
  minusculas: "minúsculas",
  numerica: "numérica",
  numericas: "numéricas",
  numero: "número",
  numeros: "números",
  operacion: "operación",
  pagina: "página",
  quedarian: "quedarían",
  presentacion: "presentación",
  proximo: "próximo",
  rapido: "rápido",
  relacion: "relación",
  repeticion: "repetición",
  segun: "según",
  sesion: "sesión",
  tambien: "también",
  tendran: "tendrán",
  todavia: "todavía",
  ultima: "última",
  ultimo: "último",
  unica: "única",
  util: "útil",
  utiles: "útiles",
  vacia: "vacía",
  vacio: "vacío",
  valido: "válido",
};

// «como» y «donde» solo llevan tilde en preguntas o títulos: se corrigen al inicio del texto o después de «¿»
// (por ejemplo «Como pensarlo» → «Cómo pensarlo»). El resto de las palabras se corrige siempre.
const SOLO_AL_INICIO = new Set(["como", "donde"]);

// Frases fijas de las aulas de la v1 que el diccionario no puede corregir solo («que» lleva tilde solo en preguntas).
const FRASES: [RegExp, string][] = [[/\bPara que sirve\b/g, "Para qué sirve"]];

// El texto entre comillas simples es un valor de los datos ('Sin inscripcion', 'Santiago'): tiene que quedar igual
// que en la solución, así que no se corrige.
export function corregirTildes(texto: string, excepto: ReadonlySet<string> = new Set()): string {
  return texto
    .split(/('[^']*')/)
    .map((parte) => (parte.startsWith("'") ? parte : corregirTramo(parte, excepto)))
    .join("");
}

function corregirTramo(texto: string, excepto: ReadonlySet<string>): string {
  const conFrases = FRASES.reduce((actual, [patron, correcta]) => actual.replace(patron, correcta), texto);
  return conFrases.replace(/(^|[^\p{L}\p{N}_])([\p{L}]+)(?=$|[^\p{L}\p{N}_])/gu, (coincidencia, antes: string, palabra: string, desde: number) => {
    const minuscula = palabra.toLowerCase();
    const correcta = TILDES[minuscula];
    if (!correcta || excepto.has(minuscula)) return coincidencia;
    if (SOLO_AL_INICIO.has(minuscula) && !(desde === 0 || /¿\s*$/.test(conFrases.slice(0, desde + antes.length)))) return coincidencia;
    const conMayuscula = palabra[0] !== palabra[0].toLowerCase();
    return `${antes}${conMayuscula ? correcta[0].toUpperCase() + correcta.slice(1) : correcta}`;
  });
}
```

`packages/content/src/importar/aula-sql.ts`:
```ts
import { corregirTildes, type Leccion } from "./leccion";

// Adaptador del aula de SQL de la v1 (aula-sql/src/data/lessons.js y datasets.js, exportados a JSON).

export type SeccionV1 = { heading: string; body: string[]; code: string | null };
export type LeccionSqlV1 = {
  slug: string;
  title: string;
  duration: string;
  type: string;
  intro?: string[];
  syntaxExample?: string | null;
  datasetTables?: string[];
  sections?: SeccionV1[];
  starter?: string;
  expected?: string;
  prompt?: string;
  explanation?: string;
  hint?: string;
};
export type AulaV1 = { lessons: LeccionSqlV1[]; datasets: Record<string, Record<string, string | number | null>[]> };

// Nombres propios y valores de los datos de práctica que la v1 escribió sin tilde. Se corrigen en todas partes,
// también dentro de las consultas, para que los datos y los ejercicios calcen.
export const NOMBRES_SQL: Record<string, string> = {
  Concepcion: "Concepción",
  Valparaiso: "Valparaíso",
  Perez: "Pérez",
  Martin: "Martín",
  Diaz: "Díaz",
  Nicolas: "Nicolás",
  Sofia: "Sofía",
  Tomas: "Tomás",
  Analitica: "Analítica",
  Basico: "Básico",
};

export function corregirNombres(texto: string): string {
  return texto.replace(/\b[A-Z][a-z]+\b/g, (palabra) => NOMBRES_SQL[palabra] ?? palabra);
}

const normalizar = (codigo: string) => codigo.replace(/\s+/g, " ").replace(/;\s*$/, "").trim().toLowerCase();

// Las pistas de la v1 suelen traer la consulta completa o casi: esas no se importan (la revisión escribe pistas que
// orienten sin dar la respuesta).
export function pistaUtil(pista: string | undefined, solucion: string): string[] {
  if (!pista) return [];
  return normalizar(pista).includes(normalizar(solucion)) || /\bselect\b.*\bfrom\b/i.test(pista) ? [] : [pista];
}

// Las tablas y columnas se escriben sin tilde: el diccionario de tildes no las toca.
export function identificadores(aula: AulaV1): Set<string> {
  const nombres = new Set<string>();
  for (const [tabla, filas] of Object.entries(aula.datasets)) {
    nombres.add(tabla.toLowerCase());
    for (const fila of filas) for (const columna of Object.keys(fila)) nombres.add(columna.toLowerCase());
  }
  return nombres;
}

export function convertirLeccionSql(v1: LeccionSqlV1, numero: number, excepto: ReadonlySet<string>): Leccion {
  if (v1.type !== "exercise-select" || !v1.expected || !v1.prompt) {
    throw new Error(`La lección ${v1.slug} no es un ejercicio de consulta (${v1.type}): este adaptador solo importa SELECT`);
  }
  const texto = (valor: string) => corregirTildes(corregirNombres(valor), excepto);
  const solucion = corregirNombres(v1.expected);
  return {
    slug: `${String(numero).padStart(2, "0")}-${v1.slug}`,
    titulo: texto(v1.title),
    minutos: Number.parseInt(v1.duration, 10) || 15,
    intro: (v1.intro ?? []).map(texto),
    sintaxis: v1.syntaxExample ? { lenguaje: "sql", codigo: v1.syntaxExample } : null,
    secciones: (v1.sections ?? []).map((seccion) => ({
      titulo: texto(seccion.heading),
      parrafos: seccion.body.map(texto),
      ejemplo: seccion.code ? corregirNombres(seccion.code) : null,
    })),
    tarea: {
      tipo: "SqlTask",
      id: v1.slug,
      enunciado: texto(v1.prompt),
      inicial: corregirNombres(v1.starter ?? ""),
      solucion,
      comparar: /\border\s+by\b/i.test(solucion) ? "filas-en-orden" : "filas-sin-orden",
      pistas: pistaUtil(v1.hint, solucion).map(texto),
    },
    cierre: v1.explanation ? texto(v1.explanation) : null,
  };
}

// Los datos de práctica, con los nombres corregidos, listos para escribirse como CSV en datos/.
export function datosSql(aula: AulaV1, tablas: string[]): Record<string, Record<string, string | number | null>[]> {
  return Object.fromEntries(
    tablas.map((tabla) => {
      const filas = aula.datasets[tabla];
      if (!filas) throw new Error(`El aula no tiene la tabla ${tabla}`);
      return [tabla, filas.map((fila) => Object.fromEntries(Object.entries(fila).map(([columna, valor]) => [columna, typeof valor === "string" ? corregirNombres(valor) : valor])))];
    })
  );
}
```

`packages/content/src/importar/importar-cli.ts`:
```ts
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { aCsv } from "../generadores/despachos-rapidos";
import { convertirLeccionSql, datosSql, identificadores, type AulaV1 } from "./aula-sql";
import { leccionAMdx } from "./leccion";

// Escribe el borrador de unas clases a partir de un aula de la v1 exportada a JSON (scripts/exportar-aula-v1.mjs).
// Uso: pnpm --filter @syntaxerror/content importar sql <aula.json> <carpeta de destino> <lecciones separadas por coma>
// Escribe misiones/NN-<lección>.mdx, datos/<tabla>.csv con las tablas que usan y un caso.yaml para completar.
// No pisa contenido: la carpeta de destino no debe existir. Después del borrador viene la revisión editorial.

const [aula, entrada, destino, seleccion] = process.argv.slice(2);
if (aula !== "sql" || !entrada || !destino || !seleccion) {
  console.error("Uso: importar sql <aula.json> <carpeta de destino> <lección,lección,...>");
  process.exit(1);
}

const datos = JSON.parse(await readFile(entrada, "utf8")) as AulaV1;
const excepto = identificadores(datos);
const lecciones = seleccion
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean)
  .map((slug, indice) => {
    const v1 = datos.lessons.find((leccion) => leccion.slug === slug);
    if (!v1) throw new Error(`El aula no tiene la lección ${slug}`);
    return { leccion: convertirLeccionSql(v1, indice + 1, excepto), tablas: v1.datasetTables ?? [] };
  });

if (existsSync(destino)) throw new Error(`${destino} ya existe: el importador no pisa contenido`);
await mkdir(path.join(destino, "misiones"), { recursive: true });
await mkdir(path.join(destino, "datos"), { recursive: true });
for (const { leccion } of lecciones) await writeFile(path.join(destino, "misiones", `${leccion.slug}.mdx`), leccionAMdx(leccion));
const tablas = [...new Set(lecciones.flatMap(({ tablas: usadas }) => usadas))].sort();
for (const [tabla, filas] of Object.entries(datosSql(datos, tablas))) await writeFile(path.join(destino, "datos", `${tabla}.csv`), aCsv(filas));
await writeFile(
  path.join(destino, "caso.yaml"),
  `slug: ${path.basename(destino)}\ntipo: clases\ntitulo: "Clases de SQL"\ndataset: "Completar: qué datos de práctica usan las lecciones"\nmisiones:\n${lecciones.map(({ leccion }) => `  - ${leccion.slug}`).join("\n")}\n`
);
console.log(`[importar] ${lecciones.length} lecciones y ${tablas.length} tablas en ${destino}`);
```

`packages/content/scripts/exportar-aula-v1.mjs`:
```js
// Exporta un aula de la v1 a JSON para importarla (packages/content/src/importar). Corre con el Node del equipo, fuera
// de Docker, porque lee el repositorio de la v1: node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-sql
// > tmp/aula-sql.json. Solo lee los módulos de datos del aula (lecciones y datasets); no ejecuta la app.
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const aula = process.argv[2];
if (!aula) {
  console.error("Uso: node exportar-aula-v1.mjs <carpeta del aula de la v1>");
  process.exit(1);
}
const modulo = (nombre) => pathToFileURL(path.resolve(aula, "src", "data", nombre)).href;
const lecciones = await import(modulo("lessons.js"));
const datasets = existsSync(path.resolve(aula, "src", "data", "datasets.js")) ? (await import(modulo("datasets.js"))).datasets : {};
process.stdout.write(`${JSON.stringify({ modules: lecciones.modules ?? [], lessons: lecciones.lessons, datasets }, null, 2)}\n`);
```

En `packages/content/package.json`, en `scripts`, después de `generar`, agrega:
```json
    "importar": "tsx src/importar/importar-cli.ts",
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content exec vitest run src/importar && pnpm --filter @syntaxerror/content exec tsc --noEmit"`
Expected: PASS (10 pruebas) y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/importar packages/content/scripts packages/content/package.json
git commit -m "feat(contenido): importador de aulas de la v1 con adaptador de sql

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Las clases de SQL

**Files:**
- Create: `content/casos/clases-de-sql/caso.yaml`, `datos/cursos.csv`, `datos/estudiantes.csv`, `datos/inscripciones.csv` y 18 lecciones en `misiones/`
- Modify: `content/rutas/data-analyst.yaml`, `apps/web/src/db/release.test.ts`

**Interfaces:**
- Consumes: el importador (Task 3) y el tipo `clases` (Tasks 1 y 2).
- Produces: las clases `clases-de-sql`, terceras en la ruta. Las lecciones y sus ids de tarea (los que usa el e2e) son, en orden:

| Lección | Tarea |
|---|---|
| 01-select-basico | select-basico |
| 02-alias-expresiones | alias-expresiones |
| 03-where-filtros | where-filtros |
| 04-busqueda-orden-limite | busqueda-orden-limite |
| 05-join-inner | join-inner |
| 06-join-multiple-left | join-multiple-left |
| 07-null-coalesce | null-coalesce |
| 08-funciones-texto | funciones-texto |
| 09-funciones-numericas | funciones-numericas |
| 10-funciones-agregacion | funciones-agregacion |
| 11-group-by-having | group-by-having |
| 12-case-when | case-when |
| 13-subconsultas-where | subconsultas-where |
| 14-subconsultas-from | subconsultas-from |
| 15-cte-with | cte-with |
| 16-union | union |
| 17-exists | exists |
| 18-proyecto-final-sql | proyecto-final-sql |

- [ ] **Step 1: El borrador del importador**

Exporta el aula con el Node de tu equipo, desde la raíz de la v2:

Run: `mkdir -p tmp && node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-sql > tmp/aula-sql.json`
Expected: `tmp/aula-sql.json`, de unos 83 KB. `tmp/` ya está en `.gitignore`.

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content importar sql /app/tmp/aula-sql.json /app/content/casos/clases-de-sql select-basico,alias-expresiones,where-filtros,busqueda-orden-limite,join-inner,join-multiple-left,null-coalesce,funciones-texto,funciones-numericas,funciones-agregacion,group-by-having,case-when,subconsultas-where,subconsultas-from,cte-with,union,exists,proyecto-final-sql`
Expected: `[importar] 18 lecciones y 3 tablas en /app/content/casos/clases-de-sql`.

Los CSV que genera deben ser idénticos a estos.

`content/casos/clases-de-sql/datos/estudiantes.csv`:
```csv
id,nombre,correo,edad,ciudad
1,Camila Rojas,camila@colegio.cl,21,Santiago
2,Diego Soto,diego@colegio.cl,24,Valparaíso
3,Antonia Pérez,antonia@colegio.cl,20,Concepción
4,Martín Silva,martin@colegio.cl,23,Santiago
5,Javiera Díaz,javiera@colegio.cl,22,La Serena
6,Nicolás Fuentes,nicolas@colegio.cl,19,Santiago
7,Sofía Araya,sofia@colegio.cl,25,Temuco
8,Tomás Muñoz,tomas@colegio.cl,22,Concepción
```

`content/casos/clases-de-sql/datos/cursos.csv`:
```csv
id,titulo,nivel,horas
101,SQL inicial,Básico,18
102,Modelado relacional,Intermedio,24
103,Reportes con SQL,Intermedio,30
104,Consultas avanzadas,Avanzado,36
105,Datos para decisiones,Proyecto,28
```

`content/casos/clases-de-sql/datos/inscripciones.csv`:
```csv
id,estudiante_id,curso_id,nota,estado
1001,1,101,6.2,aprobado
1002,2,103,5.4,observacion
1003,3,101,6.8,aprobado
1004,4,102,4.9,riesgo
1005,5,104,5.9,aprobado
1006,6,101,6.5,aprobado
1007,7,105,5.1,observacion
1008,8,102,6,aprobado
1009,1,103,5.7,aprobado
1010,4,105,4.6,riesgo
```

- [ ] **Step 2: La revisión editorial (copia literal)**

La revisión ya está hecha: se cambió el título y el dataset de `caso.yaml`, se escribieron dos pistas por lección y se corrigieron las tildes que dependen del contexto ("más", "aún", "cuántos"). Reemplaza cada archivo por su versión final.

`content/casos/clases-de-sql/caso.yaml`:
```yaml
slug: clases-de-sql
tipo: clases
titulo: "Clases de SQL: de SELECT a CTE"
dataset: "estudiantes, cursos e inscripciones de una escuela de cursos en línea"
misiones:
  - 01-select-basico
  - 02-alias-expresiones
  - 03-where-filtros
  - 04-busqueda-orden-limite
  - 05-join-inner
  - 06-join-multiple-left
  - 07-null-coalesce
  - 08-funciones-texto
  - 09-funciones-numericas
  - 10-funciones-agregacion
  - 11-group-by-having
  - 12-case-when
  - 13-subconsultas-where
  - 14-subconsultas-from
  - 15-cte-with
  - 16-union
  - 17-exists
  - 18-proyecto-final-sql
```

`content/casos/clases-de-sql/misiones/01-select-basico.mdx`:
```mdx
---
titulo: "Fundamentos de SELECT"
tiempo: 12
---

<Concepto>
Una base de datos es un lugar organizado para guardar información. Los datos viven en tablas, cada tabla tiene columnas y cada fila representa un registro.

SELECT es la sentencia que usamos para hacer preguntas sobre esos datos. Casi todo lo demas que aprendas en SQL termina apoyandose en un SELECT.

<Sintaxis lenguaje="sql" codigo={"SELECT columnas\nFROM tabla;"} />

**Para qué sirve en la vida real.** SELECT es preguntar sin romper nada. Es como abrir una base de datos con modo espectador: miras la información, pero no la modificas.

**Cómo pensarlo sin sufrir.** Piensa en SELECT como pedir columnas de una planilla gigante. FROM dice de que tabla sale la información.

**Tu primera consulta.** Antes de escribir una consulta conviene mirar la estructura de la tabla. En esta lección trabajas con estudiantes.

**Seleccionar todas las columnas.** El asterisco trae todas las columnas. Es útil para explorar, pero en reportes reales conviene pedir solo lo necesario.

<SqlEjemplo consulta={"SELECT * FROM estudiantes;"} />

**Seleccionar columnas específicas.** Escribe los nombres de columna separados por comas después de SELECT para controlar exactamente que devuelve la consulta.

<SqlEjemplo consulta={"SELECT nombre, ciudad FROM estudiantes;"} />

**El orden del resultado.** El orden en que escribes las columnas es el orden en que aparecen en el resultado. No cambia la tabla original.

<SqlEjemplo consulta={"SELECT ciudad, nombre FROM estudiantes;"} />
</Concepto>

<SqlTask
  id="select-basico"
  enunciado={"Muestra todos los estudiantes con estas columnas: nombre y ciudad."}
  inicial={"SELECT * FROM estudiantes;"}
  solucion={"SELECT nombre, ciudad FROM estudiantes;"}
  comparar="filas-sin-orden"
  pistas={["SELECT dice qué columnas quieres y FROM, de qué tabla salen.", "Separa las columnas con comas, en el orden en que deben aparecer en el resultado."]}
/>

<Debrief>
La consulta debe traer solo las columnas necesarias para responder la pregunta.
</Debrief>
```

`content/casos/clases-de-sql/misiones/02-alias-expresiones.mdx`:
```mdx
---
titulo: "Alias y expresiones calculadas"
tiempo: 12
---

<Concepto>
AS permite darle a una columna o expresión un nombre más claro para el resultado de una consulta.

También puedes crear valores calculados al vuelo, sin guardarlos en la tabla.

<Sintaxis lenguaje="sql" codigo={"SELECT columna AS alias, columna + 1 AS calculo\nFROM tabla;"} />

**Para qué sirve en la vida real.** Los alias hacen que un resultado sea entendible para humanos. Sin alias, una columna calculada puede quedar con nombre de hechizo raro.

**Cómo pensarlo sin sufrir.** AS es una etiqueta temporal: no cambia la tabla, solo el nombre que se ve en el resultado.

**Renombrar una columna.** El alias aparece solo en el resultado y no cambia el nombre real de la columna.

<SqlEjemplo consulta={"SELECT nombre, edad AS edad_actual FROM estudiantes;"} />

**Crear una expresión.** Los operadores aritméticos calculan un valor nuevo por cada fila.

<SqlEjemplo consulta={"SELECT nombre, edad + 1 AS edad_proximo_anio FROM estudiantes;"} />

**Por que usar AS.** Sin alias, una expresión puede quedar con un titulo difícil de leer.

**AS como estilo.** Algunos motores dejan omitir AS, pero escribirlo mejora la lectura.
</Concepto>

<SqlTask
  id="alias-expresiones"
  enunciado={"Muestra el nombre, la edad actual (como edad_actual) y la edad que tendrán el próximo año (como edad_proximo_anio)."}
  inicial={"SELECT nombre, edad FROM estudiantes;"}
  solucion={"SELECT nombre, edad AS edad_actual, edad + 1 AS edad_proximo_anio FROM estudiantes;"}
  comparar="filas-sin-orden"
  pistas={["El alias va después de la columna o del cálculo, con AS y el nombre nuevo.", "La edad del próximo año es una expresión: la edad más 1."]}
/>

<Debrief>
edad_actual es un alias directo; edad_proximo_anio es una expresión calculada sumando 1.
</Debrief>
```

`content/casos/clases-de-sql/misiones/03-where-filtros.mdx`:
```mdx
---
titulo: "Filtros con WHERE"
tiempo: 14
---

<Concepto>
WHERE decide que filas pasan al resultado y cuales quedan fuera.

Cuando una pregunta tiene varias condiciones, AND exige que todas se cumplan al mismo tiempo.

<Sintaxis lenguaje="sql" codigo={"SELECT columnas\nFROM tabla\nWHERE condicion;"} />

**Para qué sirve en la vida real.** WHERE sirve para no traer toda la base cuando solo necesitas algunos casos. Es el guardia de la puerta.

**Cómo pensarlo sin sufrir.** Primero eliges la tabla, luego WHERE deja pasar solo las filas que cumplen la regla.

**Filtrar por texto.** Los textos se comparan entre comillas simples.

<SqlEjemplo consulta={"SELECT nombre, ciudad FROM estudiantes WHERE ciudad = 'Santiago';"} />

**Filtrar por número.** Con números puedes usar =, &lt;>, >, &lt;, >= y &lt;=.

<SqlEjemplo consulta={"SELECT nombre, edad FROM estudiantes WHERE edad >= 21;"} />

**Combinar con AND.** AND deja pasar solo filas que cumplen todas las condiciones.

<SqlEjemplo consulta={"SELECT nombre, edad, ciudad FROM estudiantes WHERE ciudad = 'Santiago' AND edad >= 21;"} />

**Usar OR.** OR deja pasar filas si se cumple al menos una condición.

<SqlEjemplo consulta={"SELECT nombre, ciudad FROM estudiantes WHERE ciudad = 'Santiago' OR ciudad = 'Concepción';"} />
</Concepto>

<SqlTask
  id="where-filtros"
  enunciado={"Encuentra estudiantes de Santiago que tengan 21 años o más. Muestra nombre, edad y ciudad."}
  inicial={"SELECT nombre, edad, ciudad FROM estudiantes;"}
  solucion={"SELECT nombre, edad, ciudad FROM estudiantes WHERE ciudad = 'Santiago' AND edad >= 21;"}
  comparar="filas-sin-orden"
  pistas={["El filtro va en WHERE, después de FROM.", "Las dos condiciones tienen que cumplirse a la vez: ¿qué operador exige eso? Ojo, que 21 también cuenta."]}
/>

<Debrief>
El filtro combina una condición de texto (ciudad) con una numérica (edad) usando AND.
</Debrief>
```

`content/casos/clases-de-sql/misiones/04-busqueda-orden-limite.mdx`:
```mdx
---
titulo: "Búsqueda, orden y limites"
tiempo: 14
---

<Concepto>
IN, LIKE, ORDER BY y LIMIT permiten buscar, ordenar y recortar resultados sin escribir consultas largas.

Primero se filtra, después se ordena y al final se limita la cantidad de filas.

<Sintaxis lenguaje="sql" codigo={"SELECT columnas\nFROM tabla\nWHERE columna IN (valor1, valor2)\nORDER BY columna\nLIMIT cantidad;"} />

**Para qué sirve en la vida real.** Buscar, ordenar y limitar es lo que haces cada vez que filtras una tienda online: ciudad, orden alfabético y primeros resultados.

**Cómo pensarlo sin sufrir.** IN filtra por una lista, ORDER BY ordena y LIMIT corta la cantidad final de filas.

**IN compara contra una lista.** IN reemplaza varios OR sobre la misma columna.

<SqlEjemplo consulta={"SELECT nombre, ciudad FROM estudiantes WHERE ciudad IN ('Santiago', 'Concepción');"} />

**LIKE busca patrones.** El comodin % representa cualquier cantidad de caracteres.

<SqlEjemplo consulta={"SELECT nombre FROM estudiantes WHERE nombre LIKE 'Ca%';"} />

**ORDER BY ordena.** ASC es ascendente y DESC descendente.

<SqlEjemplo consulta={"SELECT nombre, edad FROM estudiantes ORDER BY edad ASC;"} />

**LIMIT recorta filas.** LIMIT muestra solo las primeras filas según el orden actual.

<SqlEjemplo consulta={"SELECT nombre, edad FROM estudiantes ORDER BY edad ASC LIMIT 5;"} />
</Concepto>

<SqlTask
  id="busqueda-orden-limite"
  enunciado={"Lista, en orden alfabético, hasta 5 estudiantes que vivan en Santiago o Concepción. Muestra nombre y ciudad."}
  inicial={"SELECT nombre, ciudad FROM estudiantes;"}
  solucion={"SELECT nombre, ciudad FROM estudiantes WHERE ciudad IN ('Santiago', 'Concepción') ORDER BY nombre ASC LIMIT 5;"}
  comparar="filas-en-orden"
  pistas={["IN compara una columna contra una lista de valores entre paréntesis, separados por comas.", "El orden de las cláusulas es WHERE, después ORDER BY y al final LIMIT."]}
/>

<Debrief>
IN reemplaza una cadena de OR; ORDER BY ordena por nombre y LIMIT deja solo 5 filas.
</Debrief>
```

`content/casos/clases-de-sql/misiones/05-join-inner.mdx`:
```mdx
---
titulo: "Relaciones y JOIN"
tiempo: 22
---

<Concepto>
En una base relacional los datos se separan en tablas para evitar repetición.

JOIN reconecta esas tablas al consultar, usando una condición ON.

<Sintaxis lenguaje="sql" codigo={"SELECT columnas\nFROM tabla_a AS a\nJOIN tabla_b AS b ON a.columna = b.columna;"} />

**Para qué sirve en la vida real.** JOIN conecta tablas que guardan piezas distintas de la historia. Estudiantes, cursos e inscripciones son como personajes, misiones y resultados.

**Cómo pensarlo sin sufrir.** Inscripciones es la mesa puente: tiene estudiante_id para llegar a estudiantes y curso_id para llegar a cursos.

**Datos separados.** Inscripciones conecta estudiantes con cursos sin repetir todos los datos en una sola tabla.

**ON conecta claves.** La condición ON indica que columnas deben coincidir.

<SqlEjemplo consulta={"SELECT e.nombre, i.nota\nFROM inscripciones AS i\nJOIN estudiantes AS e ON e.id = i.estudiante_id;"} />

**Encadenar JOIN.** Puedes unir una tercera tabla agregando otro JOIN.

<SqlEjemplo consulta={"SELECT e.nombre, c.titulo, i.nota\nFROM inscripciones AS i\nJOIN estudiantes AS e ON e.id = i.estudiante_id\nJOIN cursos AS c ON c.id = i.curso_id;"} />

**Alias de tabla.** AS e, AS c y AS i hacen la consulta más corta y legible.
</Concepto>

<SqlTask
  id="join-inner"
  enunciado={"Lista cada inscripción con estas columnas: nombre del estudiante, titulo del curso y nota."}
  inicial={"SELECT e.nombre, c.titulo, i.nota\nFROM inscripciones AS i\nJOIN estudiantes AS e ON e.id = i.estudiante_id\nJOIN cursos AS c ON c.id = i.curso_id;"}
  solucion={"SELECT e.nombre, c.titulo, i.nota\nFROM inscripciones AS i\nJOIN estudiantes AS e ON e.id = i.estudiante_id\nJOIN cursos AS c ON c.id = i.curso_id;"}
  comparar="filas-sin-orden"
  pistas={["Parte desde la tabla que conecta a las otras dos: inscripciones.", "Cada JOIN necesita su ON: la columna de inscripciones que apunta al id de la otra tabla."]}
/>

<Debrief>
Inscripciones conecta estudiantes y cursos mediante estudiante_id y curso_id.
</Debrief>
```

`content/casos/clases-de-sql/misiones/06-join-multiple-left.mdx`:
```mdx
---
titulo: "JOIN multiple y LEFT JOIN"
tiempo: 20
---

<Concepto>
INNER JOIN solo conserva filas con coincidencia en ambas tablas.

LEFT JOIN conserva todas las filas de la tabla izquierda aunque no haya coincidencia.

<Sintaxis lenguaje="sql" codigo={"SELECT columnas\nFROM tabla_izquierda AS a\nLEFT JOIN tabla_derecha AS b ON a.columna = b.columna;"} />

**Para qué sirve en la vida real.** LEFT JOIN sirve cuando no quieres perder filas sin coincidencia. Es invitar a todos a la foto, incluso al que aún no se inscribió.

**Cómo pensarlo sin sufrir.** La tabla izquierda manda. Si no hay curso, SQL rellena las columnas del curso con NULL.

**El limite de INNER JOIN.** Un estudiante sin inscripción desaparece del resultado con INNER JOIN.

<SqlEjemplo consulta={"SELECT e.nombre, c.titulo\nFROM estudiantes AS e\nJOIN inscripciones AS i ON i.estudiante_id = e.id\nJOIN cursos AS c ON c.id = i.curso_id;"} />

**LEFT JOIN conserva filas.** Las columnas sin coincidencia quedan en NULL.

<SqlEjemplo consulta={"SELECT e.nombre, c.titulo\nFROM estudiantes AS e\nLEFT JOIN inscripciones AS i ON i.estudiante_id = e.id\nLEFT JOIN cursos AS c ON c.id = i.curso_id;"} />

**Varios LEFT JOIN.** Si encadenas relaciones opcionales, conserva LEFT JOIN en toda la cadena.

**Ordenar el resultado.** ORDER BY funciona igual sobre resultados unidos.

<SqlEjemplo consulta={"SELECT e.nombre, c.titulo\nFROM estudiantes AS e\nLEFT JOIN inscripciones AS i ON i.estudiante_id = e.id\nLEFT JOIN cursos AS c ON c.id = i.curso_id\nORDER BY e.nombre;"} />
</Concepto>

<SqlTask
  id="join-multiple-left"
  enunciado={"Lista todos los estudiantes con estas columnas: nombre y titulo del curso inscrito si existe. No pierdas a quienes aún no se inscriben y ordena por nombre."}
  inicial={"SELECT e.nombre, c.titulo\nFROM estudiantes AS e\nJOIN inscripciones AS i ON i.estudiante_id = e.id\nJOIN cursos AS c ON c.id = i.curso_id;"}
  solucion={"SELECT e.nombre, c.titulo\nFROM estudiantes AS e\nLEFT JOIN inscripciones AS i ON i.estudiante_id = e.id\nLEFT JOIN cursos AS c ON c.id = i.curso_id\nORDER BY e.nombre;"}
  comparar="filas-en-orden"
  pistas={["Un JOIN normal deja fuera a quien no tiene inscripciones. ¿Qué JOIN conserva todas las filas de la tabla de la izquierda?", "Si cambias solo el primer JOIN, el segundo vuelve a dejar fuera a esas personas."]}
/>

<Debrief>
Tomás Muñoz no tiene inscripciones; con INNER JOIN desaparece del resultado, con LEFT JOIN aparece con curso en NULL.
</Debrief>
```

`content/casos/clases-de-sql/misiones/07-null-coalesce.mdx`:
```mdx
---
titulo: "Valores NULL y COALESCE"
tiempo: 14
---

<Concepto>
NULL representa ausencia de dato, no texto vacío ni cero.

COALESCE reemplaza NULL por un valor de presentación sin modificar la tabla.

<Sintaxis lenguaje="sql" codigo={"SELECT COALESCE(columna, 'valor_por_defecto') FROM tabla;"} />

**Para qué sirve en la vida real.** NULL significa dato ausente. No es cero, no es texto vacío, es literalmente 'no tengo ese dato'.

**Cómo pensarlo sin sufrir.** COALESCE es el texto de reemplazo para que un resultado no se vea como un hueco misterioso.

**Detectar NULL.** Para buscar valores ausentes se usa IS NULL.

<SqlEjemplo consulta={"SELECT e.nombre\nFROM estudiantes AS e\nLEFT JOIN inscripciones AS i ON i.estudiante_id = e.id\nWHERE i.id IS NULL;"} />

**Usar COALESCE.** COALESCE devuelve el primer valor no nulo.

<SqlEjemplo consulta={"SELECT e.nombre, COALESCE(c.titulo, 'Sin inscripcion') AS curso\nFROM estudiantes AS e\nLEFT JOIN inscripciones AS i ON i.estudiante_id = e.id\nLEFT JOIN cursos AS c ON c.id = i.curso_id;"} />

**No cambia datos.** El reemplazo ocurre solo en el resultado.

**Filtrar y presentar.** IS NULL filtra casos; COALESCE hace el resultado más legible.
</Concepto>

<SqlTask
  id="null-coalesce"
  enunciado={"Muestra nombre y curso de cada estudiante. En la columna curso, reemplaza los valores NULL por el texto 'Sin inscripcion'."}
  inicial={"SELECT e.nombre, c.titulo\nFROM estudiantes AS e\nLEFT JOIN inscripciones AS i ON i.estudiante_id = e.id\nLEFT JOIN cursos AS c ON c.id = i.curso_id;"}
  solucion={"SELECT e.nombre, COALESCE(c.titulo, 'Sin inscripcion') AS curso\nFROM estudiantes AS e\nLEFT JOIN inscripciones AS i ON i.estudiante_id = e.id\nLEFT JOIN cursos AS c ON c.id = i.curso_id\nORDER BY e.nombre;"}
  comparar="filas-en-orden"
  pistas={["COALESCE devuelve el primer valor de su lista que no es NULL.", "Pon primero el título del curso y después el texto de reemplazo, tal como lo pide el enunciado, y nombra la columna curso."]}
/>

<Debrief>
COALESCE(c.titulo, 'Sin inscripcion') muestra el titulo del curso o el texto por defecto cuando es NULL.
</Debrief>
```

`content/casos/clases-de-sql/misiones/08-funciones-texto.mdx`:
```mdx
---
titulo: "Funciones de texto"
tiempo: 14
---

<Concepto>
SQL puede transformar texto al consultar.

UPPER y LOWER son útiles para presentar y comparar valores de forma consistente.

<Sintaxis lenguaje="sql" codigo={"SELECT UPPER(columna), LOWER(columna) FROM tabla;"} />

**Para qué sirve en la vida real.** Las funciones de texto limpian presentaciones sin tocar el dato original. Es maquillaje para reportes, no cirugía a la tabla.

**Cómo pensarlo sin sufrir.** UPPER y LOWER transforman cada fila al vuelo dentro del SELECT.

**UPPER.** Convierte texto a mayúsculas solo en el resultado.

<SqlEjemplo consulta={"SELECT UPPER(nombre) AS nombre_mayus FROM estudiantes;"} />

**LOWER.** Convierte texto a minúsculas.

<SqlEjemplo consulta={"SELECT LOWER(ciudad) AS ciudad_minus FROM estudiantes;"} />

**Varias funciones.** Puedes transformar varias columnas en el mismo SELECT.

<SqlEjemplo consulta={"SELECT UPPER(nombre) AS nombre_mayus, LOWER(ciudad) AS ciudad_minus FROM estudiantes;"} />

**No filtra filas.** Para filtrar siguen haciendo falta WHERE, LIKE o IN.
</Concepto>

<SqlTask
  id="funciones-texto"
  enunciado={"Muestra el nombre en mayúsculas (como nombre_mayus) y la ciudad en minúsculas (como ciudad_minus)."}
  inicial={"SELECT nombre, ciudad FROM estudiantes;"}
  solucion={"SELECT UPPER(nombre) AS nombre_mayus, LOWER(ciudad) AS ciudad_minus FROM estudiantes;"}
  comparar="filas-sin-orden"
  pistas={["Hay una función para pasar a mayúsculas y otra para minúsculas; reciben la columna entre paréntesis.", "Cada resultado necesita su propio alias con AS."]}
/>

<Debrief>
UPPER(nombre) y LOWER(ciudad) transforman el texto columna por columna.
</Debrief>
```

`content/casos/clases-de-sql/misiones/09-funciones-numericas.mdx`:
```mdx
---
titulo: "Funciones numéricas"
tiempo: 12
---

<Concepto>
ROUND redondea números al consultar.

Es útil para promedios y calculos con muchos decimales.

<Sintaxis lenguaje="sql" codigo={"SELECT ROUND(columna, decimales) FROM tabla;"} />

**Para qué sirve en la vida real.** ROUND evita reportes con decimales eternos. Nadie quiere leer una nota como si fuera coordenada espacial.

**Cómo pensarlo sin sufrir.** La nota exacta queda igual; la columna redondeada aparece solo en el resultado.

**ROUND con decimales.** El segundo argumento indica cuantos decimales conservar.

<SqlEjemplo consulta={"SELECT nota, ROUND(nota, 1) AS nota_un_decimal FROM inscripciones;"} />

**ROUND a entero.** Sin segundo argumento redondea al entero más cercano.

<SqlEjemplo consulta={"SELECT e.nombre, i.nota, ROUND(i.nota) AS nota_entera FROM inscripciones AS i JOIN estudiantes AS e ON e.id = i.estudiante_id;"} />

**No cambia datos.** La tabla conserva el valor original.

**Usarlo con AVG.** ROUND suele combinarse con promedios.
</Concepto>

<SqlTask
  id="funciones-numericas"
  enunciado={"Muestra el nombre, la nota exacta y la nota redondeada a entero (como nota_entera) de cada inscripción."}
  inicial={"SELECT e.nombre, i.nota FROM inscripciones AS i JOIN estudiantes AS e ON e.id = i.estudiante_id;"}
  solucion={"SELECT e.nombre, i.nota, ROUND(i.nota) AS nota_entera FROM inscripciones AS i JOIN estudiantes AS e ON e.id = i.estudiante_id;"}
  comparar="filas-sin-orden"
  pistas={["La nota está en inscripciones y el nombre en estudiantes: necesitas un JOIN.", "ROUND sin segundo argumento redondea a número entero."]}
/>

<Debrief>
ROUND(i.nota) sin segundo argumento redondea al entero más cercano.
</Debrief>
```

`content/casos/clases-de-sql/misiones/10-funciones-agregacion.mdx`:
```mdx
---
titulo: "Funciones de agregación"
tiempo: 16
---

<Concepto>
Las funciones de agregación resumen muchas filas en un valor.

COUNT, AVG, MIN y MAX responden preguntas distintas sobre un conjunto.

<Sintaxis lenguaje="sql" codigo={"SELECT COUNT(*), AVG(columna), MIN(columna), MAX(columna) FROM tabla;"} />

**Para qué sirve en la vida real.** Las agregaciones convierten muchas filas en una respuesta ejecutiva: cuántos, promedio, mínimo y máximo.

**Cómo pensarlo sin sufrir.** Sin GROUP BY, toda la tabla se resume en una sola fila.

**COUNT.** COUNT(*) cuenta filas.

<SqlEjemplo consulta={"SELECT COUNT(*) AS total_inscritos FROM inscripciones;"} />

**AVG.** AVG calcula promedio y ROUND lo hace más legible.

<SqlEjemplo consulta={"SELECT ROUND(AVG(nota), 2) AS promedio_general FROM inscripciones;"} />

**MIN y MAX.** Encuentran los extremos de una columna.

<SqlEjemplo consulta={"SELECT MIN(nota) AS nota_minima, MAX(nota) AS nota_maxima FROM inscripciones;"} />

**Combinar agregaciones.** Varias funciones pueden resumir la misma tabla en una fila.

<SqlEjemplo consulta={"SELECT COUNT(*) AS total_inscritos, ROUND(AVG(nota), 2) AS promedio_general, MIN(nota) AS nota_minima, MAX(nota) AS nota_maxima FROM inscripciones;"} />
</Concepto>

<SqlTask
  id="funciones-agregacion"
  enunciado={"Calcula una sola fila con estas columnas: total_inscritos, promedio_general, nota_minima y nota_maxima."}
  inicial={"SELECT * FROM inscripciones;"}
  solucion={"SELECT COUNT(*) AS total_inscritos, ROUND(AVG(nota), 2) AS promedio_general, MIN(nota) AS nota_minima, MAX(nota) AS nota_maxima FROM inscripciones;"}
  comparar="filas-sin-orden"
  pistas={["Sin GROUP BY, las funciones de agregación resumen toda la tabla en una sola fila.", "Contar filas se hace con COUNT(*), y el promedio va redondeado a 2 decimales."]}
/>

<Debrief>
Sin GROUP BY, cada función de agregación resume toda la tabla en una sola fila.
</Debrief>
```

`content/casos/clases-de-sql/misiones/11-group-by-having.mdx`:
```mdx
---
titulo: "GROUP BY y HAVING"
tiempo: 18
---

<Concepto>
GROUP BY calcula un resumen por cada grupo.

HAVING filtra grupos después de calcularlos.

<Sintaxis lenguaje="sql" codigo={"SELECT columna, COUNT(*)\nFROM tabla\nGROUP BY columna\nHAVING condicion;"} />

**Para qué sirve en la vida real.** GROUP BY arma resúmenes por grupo. Es pasar de lista de notas a ranking por curso.

**Cómo pensarlo sin sufrir.** WHERE filtra filas antes de agrupar; HAVING filtra grupos después de calcular COUNT o AVG.

**Un resumen por curso.** GROUP BY separa las filas por valor de una columna.

<SqlEjemplo consulta={"SELECT c.titulo, COUNT(*) AS inscritos\nFROM inscripciones AS i\nJOIN cursos AS c ON c.id = i.curso_id\nGROUP BY c.titulo;"} />

**Más agregaciones.** Cada función se calcula por grupo.

<SqlEjemplo consulta={"SELECT c.titulo, COUNT(*) AS inscritos, ROUND(AVG(i.nota), 2) AS promedio\nFROM inscripciones AS i\nJOIN cursos AS c ON c.id = i.curso_id\nGROUP BY c.titulo;"} />

**HAVING.** HAVING puede usar COUNT(*) porque se evalúa después de agrupar.

<SqlEjemplo consulta={"SELECT c.titulo, COUNT(*) AS inscritos, ROUND(AVG(i.nota), 2) AS promedio\nFROM inscripciones AS i\nJOIN cursos AS c ON c.id = i.curso_id\nGROUP BY c.titulo\nHAVING COUNT(*) > 1;"} />

**ORDER BY.** También puedes ordenar grupos por un alias calculado.

<SqlEjemplo consulta={"SELECT c.titulo, COUNT(*) AS inscritos, ROUND(AVG(i.nota), 2) AS promedio\nFROM inscripciones AS i\nJOIN cursos AS c ON c.id = i.curso_id\nGROUP BY c.titulo\nHAVING COUNT(*) > 1\nORDER BY promedio DESC;"} />
</Concepto>

<SqlTask
  id="group-by-having"
  enunciado={"Calcula titulo, inscritos y promedio por curso. Muestra solo cursos con más de una inscripción y ordena por promedio descendente."}
  inicial={"SELECT c.titulo, COUNT(*) AS inscritos, ROUND(AVG(i.nota), 2) AS promedio FROM inscripciones AS i JOIN cursos AS c ON c.id = i.curso_id GROUP BY c.titulo;"}
  solucion={"SELECT c.titulo, COUNT(*) AS inscritos, ROUND(AVG(i.nota), 2) AS promedio FROM inscripciones AS i JOIN cursos AS c ON c.id = i.curso_id GROUP BY c.titulo HAVING COUNT(*) > 1 ORDER BY promedio DESC;"}
  comparar="filas-en-orden"
  pistas={["Primero agrupa por curso; el JOIN con cursos trae el título.", "Para filtrar grupos según cuántas filas tienen no sirve WHERE: se usa la cláusula que va justo después de GROUP BY."]}
/>

<Debrief>
HAVING COUNT(*) > 1 descarta los cursos con una sola inscripción después de agrupar.
</Debrief>
```

`content/casos/clases-de-sql/misiones/12-case-when.mdx`:
```mdx
---
titulo: "CASE WHEN: crea categorias desde la consulta"
tiempo: 14
---

<Concepto>
CASE WHEN evalúa condiciones en orden y devuelve un valor distinto según cual se cumpla primero.

Es la forma de crear categorias o etiquetas directamente desde una consulta, sin tener que procesar los datos después.

<Sintaxis lenguaje="sql" codigo={"CASE\n  WHEN condicion1 THEN valor1\n  WHEN condicion2 THEN valor2\n  ELSE valor_por_defecto\nEND AS alias"} />

**Para qué sirve en la vida real.** CASE WHEN crea etiquetas útiles directamente en SQL: junior, intermedio, senior, riesgo, premium, lo que necesites.

**Cómo pensarlo sin sufrir.** SQL revisa los WHEN en orden y se queda con el primero verdadero. ELSE cubre todo lo que queda.

**CASE evalúa en orden.** Revisa cada WHEN de arriba hacia abajo y se queda con el primero que sea verdadero.

<SqlEjemplo consulta={"CASE WHEN edad < 21 THEN 'junior' WHEN edad <= 23 THEN 'intermedio' ELSE 'senior' END"} />

**ELSE cubre el resto.** Si ninguna condición se cumple, se usa el valor de ELSE. Sin ELSE, esas filas quedarían con NULL.

**Se usa como una columna más.** El resultado de CASE se puede nombrar con AS y aparece como cualquier otra columna del SELECT.

**Útil para segmentar.** Es la forma más común de crear categorias de negocio (alto, medio, bajo) directamente en SQL.
</Concepto>

<SqlTask
  id="case-when"
  enunciado={"Clasifica a cada estudiante por edad y muestra nombre, edad y grupo_edad: 'junior' si tiene menos de 21, 'intermedio' si tiene 21 a 23, y 'senior' si tiene más de 23. Ordena por edad."}
  inicial={"SELECT nombre, edad FROM estudiantes ORDER BY edad;"}
  solucion={"SELECT nombre, edad, CASE WHEN edad < 21 THEN 'junior' WHEN edad <= 23 THEN 'intermedio' ELSE 'senior' END AS grupo_edad FROM estudiantes ORDER BY edad;"}
  comparar="filas-en-orden"
  pistas={["CASE revisa las condiciones en orden y se queda con la primera que se cumple.", "Si la primera condición ya tomó a los menores de 21, la segunda solo necesita revisar el límite de arriba."]}
/>

<Debrief>
CASE evalúa las condiciones en orden: menor a 21 es junior, de 21 a 23 (inclusive) es intermedio por la segunda condición edad &lt;= 23, y el resto cae en ELSE como senior.
</Debrief>
```

`content/casos/clases-de-sql/misiones/13-subconsultas-where.mdx`:
```mdx
---
titulo: "Subconsultas en WHERE"
tiempo: 18
---

<Concepto>
Una subconsulta es un SELECT dentro de otro SELECT.

En WHERE puede usarse como umbral calculado desde los datos actuales.

<Sintaxis lenguaje="sql" codigo={"SELECT columnas FROM tabla\nWHERE columna > (SELECT AVG(columna) FROM tabla);"} />

**Para qué sirve en la vida real.** Una subconsulta permite comparar contra un valor que sale de la misma base. El promedio ya no lo inventas: lo calcula SQL.

**Cómo pensarlo sin sufrir.** Primero se calcula AVG(edad); después cada estudiante compite contra ese umbral.

**Umbral dinámico.** La subconsulta calcula un valor y la consulta principal lo usa para filtrar.

<SqlEjemplo consulta={"SELECT nombre, edad FROM estudiantes WHERE edad > (SELECT AVG(edad) FROM estudiantes);"} />

**Se ejecuta primero.** El promedio se calcula antes de comparar cada fila.

**Un solo valor.** Una subconsulta escalar debe devolver una fila y una columna.

**Otros usos.** También puede aparecer en SELECT, aunque WHERE es el caso más común al inicio.
</Concepto>

<SqlTask
  id="subconsultas-where"
  enunciado={"Encuentra estudiantes con edad mayor al promedio general de edad. Muestra nombre y edad."}
  inicial={"SELECT nombre, edad FROM estudiantes;"}
  solucion={"SELECT nombre, edad FROM estudiantes WHERE edad > (SELECT AVG(edad) FROM estudiantes);"}
  comparar="filas-sin-orden"
  pistas={["Piensa primero cómo calcularías el promedio de edad con una consulta aparte.", "Esa consulta, entre paréntesis, puede ir al lado derecho de la comparación en WHERE."]}
/>

<Debrief>
La subconsulta (SELECT AVG(edad) FROM estudiantes) calcula el promedio; la consulta externa lo usa como umbral.
</Debrief>
```

`content/casos/clases-de-sql/misiones/14-subconsultas-from.mdx`:
```mdx
---
titulo: "Subconsultas en FROM"
tiempo: 18
---

<Concepto>
Una subconsulta en FROM funciona como una tabla temporal.

Es útil para filtrar un resultado ya agrupado.

<Sintaxis lenguaje="sql" codigo={"SELECT columnas\nFROM (SELECT ... FROM tabla GROUP BY columna) AS alias\nWHERE condicion;"} />

**Para qué sirve en la vida real.** Una subconsulta en FROM crea una mini tabla temporal. Es como preparar ingredientes antes de cocinar el plato final.

**Cómo pensarlo sin sufrir.** El resumen calcula promedios por curso; la consulta externa filtra ese resumen.

**Resumen primero.** Calcula un promedio por curso como resultado intermedio.

<SqlEjemplo consulta={"SELECT curso_id, AVG(nota) AS promedio FROM inscripciones GROUP BY curso_id;"} />

**Alias obligatorio.** El resultado entre parentesis necesita un alias.

<SqlEjemplo consulta={"SELECT resumen.curso_id, resumen.promedio\nFROM (SELECT curso_id, AVG(nota) AS promedio FROM inscripciones GROUP BY curso_id) AS resumen;"} />

**Filtrar después.** WHERE puede filtrar columnas calculadas por la subconsulta.

<SqlEjemplo consulta={"SELECT resumen.curso_id, resumen.promedio\nFROM (SELECT curso_id, AVG(nota) AS promedio FROM inscripciones GROUP BY curso_id) AS resumen\nWHERE resumen.promedio >= 5.5;"} />

**Claridad.** Separar el resumen del filtro ayuda cuando la consulta crece.
</Concepto>

<SqlTask
  id="subconsultas-from"
  enunciado={"Usa una subconsulta en FROM para calcular el promedio por curso. Muestra curso_id y promedio solo para cursos con promedio 5.5 o más."}
  inicial={"SELECT curso_id, AVG(nota) AS promedio FROM inscripciones GROUP BY curso_id;"}
  solucion={"SELECT resumen.curso_id, resumen.promedio FROM (SELECT curso_id, AVG(nota) AS promedio FROM inscripciones GROUP BY curso_id) AS resumen WHERE resumen.promedio >= 5.5;"}
  comparar="filas-sin-orden"
  pistas={["La subconsulta agrupa inscripciones por curso_id y calcula el promedio; dale un alias como si fuera una tabla.", "El filtro por promedio va en el WHERE de la consulta de afuera."]}
/>

<Debrief>
La tabla derivada 'resumen' ya trae el promedio calculado; la consulta externa solo filtra sobre ese resultado.
</Debrief>
```

`content/casos/clases-de-sql/misiones/15-cte-with.mdx`:
```mdx
---
titulo: "CTE con WITH: ordena tu consulta antes de que explote"
tiempo: 16
---

<Concepto>
WITH define una tabla temporal con nombre, llamada CTE (common table expression), que solo existe durante esa consulta.

Es la misma idea que una subconsulta en FROM, pero más fácil de leer cuando la consulta tiene varios pasos.

<Sintaxis lenguaje="sql" codigo={"WITH nombre_cte AS (\n  SELECT columnas FROM tabla\n)\nSELECT * FROM nombre_cte;"} />

**Para qué sirve en la vida real.** WITH ordena consultas largas para que no parezcan spaghetti SQL. Le pones nombre a un paso intermedio.

**Cómo pensarlo sin sufrir.** Primero declaras resumen; luego haces SELECT desde resumen como si fuera una tabla.

**WITH declara la tabla temporal.** Todo lo que va entre parentesis después de AS es una consulta normal; su resultado se puede usar como si fuera una tabla en el SELECT de abajo.

<SqlEjemplo consulta={"WITH resumen AS (\n  SELECT curso_id, AVG(nota) AS promedio\n  FROM inscripciones\n  GROUP BY curso_id\n)\nSELECT * FROM resumen;"} />

**Se puede filtrar el resultado del CTE.** El SELECT final trata a resumen como cualquier tabla: puede filtrar con WHERE, ordenar, o unir con JOIN.

**Por que no es solo una subconsulta en FROM.** La diferencia es legibilidad: el nombre queda arriba, separado de la consulta final, en vez de anidado dentro del FROM.
</Concepto>

<SqlTask
  id="cte-with"
  enunciado={"Reescribe el promedio por curso usando WITH. Muestra curso_id y promedio solo para cursos con promedio 5.5 o más, ordenados de mayor a menor."}
  inicial={"SELECT curso_id, AVG(nota) AS promedio FROM inscripciones GROUP BY curso_id;"}
  solucion={"WITH resumen AS (SELECT curso_id, ROUND(AVG(nota), 2) AS promedio FROM inscripciones GROUP BY curso_id) SELECT curso_id, promedio FROM resumen WHERE promedio >= 5.5 ORDER BY promedio DESC;"}
  comparar="filas-en-orden"
  pistas={["WITH le pone nombre a la consulta del promedio por curso, antes del SELECT principal.", "Redondea el promedio a 2 decimales dentro del WITH; filtra y ordena en el SELECT de afuera."]}
/>

<Debrief>
El CTE resumen calcula el promedio por curso una sola vez; la consulta final solo filtra y ordena sobre ese resultado, igual que la subconsulta en FROM de la lección anterior pero más legible.
</Debrief>
```

`content/casos/clases-de-sql/misiones/16-union.mdx`:
```mdx
---
titulo: "UNION y UNION ALL"
tiempo: 16
---

<Concepto>
UNION apila filas de dos SELECT compatibles.

JOIN combina columnas lado a lado; UNION combina resultados uno debajo del otro.

<Sintaxis lenguaje="sql" codigo={"SELECT columna FROM tabla_a\nUNION\nSELECT columna FROM tabla_b;"} />

**Para qué sirve en la vida real.** UNION apila resultados de dos preguntas distintas. No une columnas, une listas.

**Cómo pensarlo sin sufrir.** JOIN pega información lado a lado; UNION pone una consulta debajo de la otra.

**UNION elimina duplicados.** El mismo valor aparece una sola vez en el resultado final.

<SqlEjemplo consulta={"SELECT nombre FROM estudiantes WHERE ciudad = 'Santiago'\nUNION\nSELECT e.nombre FROM estudiantes AS e JOIN inscripciones AS i ON i.estudiante_id = e.id WHERE i.nota >= 6.5;"} />

**UNION ALL conserva duplicados.** UNION ALL no revisa repetidos.

<SqlEjemplo consulta={"SELECT nombre FROM estudiantes WHERE ciudad = 'Santiago'\nUNION ALL\nSELECT e.nombre FROM estudiantes AS e JOIN inscripciones AS i ON i.estudiante_id = e.id WHERE i.nota >= 6.5;"} />

**Columnas compatibles.** Ambos SELECT deben devolver la misma cantidad de columnas.

**Cuando usarlo.** Es claro cuando las dos fuentes tienen logicas distintas.
</Concepto>

<SqlTask
  id="union"
  enunciado={"Combina, sin duplicados, los estudiantes de Santiago con los que tienen nota igual o mayor a 6.5. Devuelve una sola columna: nombre."}
  inicial={"SELECT nombre FROM estudiantes WHERE ciudad = 'Santiago';"}
  solucion={"SELECT nombre FROM estudiantes WHERE ciudad = 'Santiago' UNION SELECT e.nombre FROM estudiantes AS e JOIN inscripciones AS i ON i.estudiante_id = e.id WHERE i.nota >= 6.5;"}
  comparar="filas-sin-orden"
  pistas={["Son dos consultas separadas que devuelven la misma columna: nombre.", "UNION entre las dos quita los repetidos. La segunda necesita un JOIN para llegar a la nota."]}
/>

<Debrief>
UNION descarta los nombres que aparecen en ambas consultas, dejando cada estudiante una sola vez.
</Debrief>
```

`content/casos/clases-de-sql/misiones/17-exists.mdx`:
```mdx
---
titulo: "EXISTS y NOT EXISTS"
tiempo: 18
---

<Concepto>
EXISTS pregunta si una subconsulta devuelve al menos una fila.

Sirve para responder preguntas de existencia sin contar ni traer datos.

<Sintaxis lenguaje="sql" codigo={"SELECT columnas FROM tabla_a AS a\nWHERE EXISTS (SELECT 1 FROM tabla_b AS b WHERE b.columna = a.columna);"} />

**Para qué sirve en la vida real.** EXISTS responde si algo existe, sin traerlo todo. Es como preguntar: hay algun incendio en este curso?

**Cómo pensarlo sin sufrir.** Para cada curso, la subconsulta busca al menos una inscripción en riesgo.

**Subconsulta correlacionada.** La subconsulta usa una columna de la consulta externa.

<SqlEjemplo consulta={"SELECT c.titulo\nFROM cursos AS c\nWHERE EXISTS (SELECT 1 FROM inscripciones AS i WHERE i.curso_id = c.id AND i.estado = 'riesgo');"} />

**No cuenta filas.** EXISTS solo necesita encontrar una coincidencia.

**NOT EXISTS.** Invierte la pregunta: filas donde no existe coincidencia.

<SqlEjemplo consulta={"SELECT c.titulo\nFROM cursos AS c\nWHERE NOT EXISTS (SELECT 1 FROM inscripciones AS i WHERE i.curso_id = c.id AND i.estado = 'riesgo');"} />

**Frente a IN.** EXISTS suele ser más claro con condiciones correlacionadas.
</Concepto>

<SqlTask
  id="exists"
  enunciado={"Lista los cursos que tienen al menos un estudiante en estado 'riesgo'. Devuelve una sola columna: titulo."}
  inicial={"SELECT titulo FROM cursos;"}
  solucion={"SELECT c.titulo FROM cursos AS c WHERE EXISTS (SELECT 1 FROM inscripciones AS i WHERE i.curso_id = c.id AND i.estado = 'riesgo');"}
  comparar="filas-sin-orden"
  pistas={["EXISTS pregunta si una subconsulta devuelve al menos una fila.", "La subconsulta busca en inscripciones del mismo curso (compara con c.id) y con estado 'riesgo'."]}
/>

<Debrief>
La subconsulta busca inscripciones en riesgo para cada curso; EXISTS solo necesita que encuentre una.
</Debrief>
```

`content/casos/clases-de-sql/misiones/18-proyecto-final-sql.mdx`:
```mdx
---
titulo: "Proyecto final: segmentar estudiantes por rendimiento"
tiempo: 25
---

<Concepto>
Este es el proyecto final del curso: combinar WITH, JOIN y CASE WHEN en una sola consulta para responder una pregunta real de negocio.

No hay conceptos nuevos -- es integrar en una consulta lo que ya practicaste lección por lección.

**Para qué sirve en la vida real.** El proyecto final une lo importante: resumir, unir y clasificar. Ya no es sintaxis suelta, es una pregunta de negocio completa.

**Cómo pensarlo sin sufrir.** CTE calcula el resumen; JOIN trae nombres; CASE WHEN convierte promedios en segmentos.

**El plan de la consulta.** Primero un CTE resumen calcula cantidad de inscripciones y promedio de nota por estudiante. Después la consulta externa hace JOIN con estudiantes y clasifica cada uno con CASE WHEN.

**Por que un CTE primero.** Calcular el promedio antes, en su propio bloque con nombre, hace que la consulta final sea mucho más fácil de leer que anidar todo en un solo SELECT.
</Concepto>

<SqlTask
  id="proyecto-final-sql"
  enunciado={"Calcula, por estudiante, nombre, cantidad, promedio y segmento usando un CTE. Clasifica como 'alto rendimiento' si promedio >= 6.5, 'regular' si promedio >= 5.5 y 'en riesgo' en el resto. Ordena de mayor a menor promedio."}
  inicial={"SELECT e.nombre, i.nota FROM inscripciones AS i JOIN estudiantes AS e ON e.id = i.estudiante_id;"}
  solucion={"WITH resumen AS (SELECT estudiante_id, COUNT(*) AS cantidad, ROUND(AVG(nota), 2) AS promedio FROM inscripciones GROUP BY estudiante_id) SELECT e.nombre, r.cantidad, r.promedio, CASE WHEN r.promedio >= 6.5 THEN 'alto rendimiento' WHEN r.promedio >= 5.5 THEN 'regular' ELSE 'en riesgo' END AS segmento FROM resumen AS r JOIN estudiantes AS e ON e.id = r.estudiante_id ORDER BY r.promedio DESC;"}
  comparar="filas-en-orden"
  pistas={["Empieza por el resumen: agrupa inscripciones por estudiante_id, con la cantidad y el promedio redondeado a 2 decimales.", "Después une ese resumen con estudiantes para el nombre, y clasifica el promedio con CASE en el orden que pide el enunciado."]}
/>

<Debrief>
El CTE resumen agrupa por estudiante_id antes de unir con estudiantes; CASE WHEN clasifica el promedio ya calculado en 3 segmentos, evaluando las condiciones en orden.
</Debrief>
```

- [ ] **Step 3: La ruta y el release**

`content/rutas/data-analyst.yaml` completo:
```yaml
slug: data-analyst
titulo: Data Analyst
cargo: Analista de datos junior
descripcion: Resuelve casos reales de una empresa chilena con SQL, planillas, Python y Power BI, y termina con un portafolio que puedes mostrar en una entrevista.
estado: borrador
# Orden aprobado en la propuesta pedagógica (sección 7), del Caso 0 al proyecto final.
casos:
  - herramientas-del-oficio
  - despachos-rapidos
  - clases-de-sql
  - minimarkets-del-sur
  - tienda-online-pewen
  - clinica-cordillera-central
  - proyecto-final
```

En `apps/web/src/db/release.test.ts`, el contenido ahora es de 8 casos: `"[release] contenido: 2 rutas, 7 casos"` pasa a `"[release] contenido: 2 rutas, 8 casos"` (las dos veces), y `toHaveLength(7)` pasa a `toHaveLength(8)`.

- [ ] **Step 4: Validar**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content validate`
Expected: `[content] ok: 2 rutas, 8 casos, 69 misiones`.

Compara cada `.mdx` y `caso.yaml` con `diff` contra este plan: deben ser idénticos.

Run: `docker compose run --rm tools pnpm -r --if-present test`
Expected: PASS en todos los paquetes (619 pruebas; content 78, web 336).

- [ ] **Step 5: Commit**

```bash
git add content apps/web/src/db/release.test.ts
git commit -m "feat(contenido): clases de sql, dieciocho lecciones traidas del aula de la v1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: e2e y README

**Files:**
- Create: `e2e/tests/clases.spec.ts`
- Modify: `e2e/tests/progreso.ts`, `e2e/tests/minimarkets.spec.ts`, `e2e/tests/pewen.spec.ts`, `e2e/tests/clinica.spec.ts`, `e2e/tests/proyecto-final.spec.ts`, `e2e/calentar.ts`, `README.md`

**Interfaces:**
- Consumes: los ids de la Task 4.
- Produces:
  - `MISIONES["clases-de-sql"]` y `CLASES` en `progreso.ts`. `completarCaso` no envía entregable a unas clases;
  - `clases.spec.ts`, con 2 pruebas.

- [ ] **Step 1: Los helpers**

`e2e/tests/progreso.ts` completo:
```ts
import { expect, type Page } from "./fixtures";
import { entrarComoAdmin } from "./revision";

// Misiones y tareas de cada caso de la ruta, en orden: sirven para llegar a un caso con sus requisitos cumplidos.
export const MISIONES: Record<string, [string, string][]> = {
  "herramientas-del-oficio": [
    ["01-tu-primer-repositorio", "primer-repositorio"],
    ["02-escribe-un-readme", "readme-de-proyecto"],
    ["03-archivos-y-commits", "commits-propios"],
    ["04-ordena-tu-proyecto", "proyecto-ordenado"],
    ["05-el-readme-de-tu-proyecto", "readme-del-proyecto"],
    ["06-tu-perfil-de-github", "perfil"],
    ["07-tu-presentacion", "presentacion"],
  ],
  "despachos-rapidos": [
    ["01-conoce-la-planilla", "costo-con-iva"],
    ["02-totales-del-mes", "totales"],
    ["03-condiciones", "condiciones"],
    ["04-buscar-en-otra-tabla", "buscar-tarifas"],
    ["05-limpiar-los-datos", "marcar-problemas"],
    ["06-resumir-por-comuna", "resumen-por-comuna"],
    ["07-indicadores-de-entrega", "indicadores"],
    ["08-revisar-la-formula-de-la-ia", "corregir-buscarv"],
    ["09-resumen-para-la-duena", "resumen-de-marzo"],
  ],
  "clases-de-sql": [
    ["01-select-basico", "select-basico"],
    ["02-alias-expresiones", "alias-expresiones"],
    ["03-where-filtros", "where-filtros"],
    ["04-busqueda-orden-limite", "busqueda-orden-limite"],
    ["05-join-inner", "join-inner"],
    ["06-join-multiple-left", "join-multiple-left"],
    ["07-null-coalesce", "null-coalesce"],
    ["08-funciones-texto", "funciones-texto"],
    ["09-funciones-numericas", "funciones-numericas"],
    ["10-funciones-agregacion", "funciones-agregacion"],
    ["11-group-by-having", "group-by-having"],
    ["12-case-when", "case-when"],
    ["13-subconsultas-where", "subconsultas-where"],
    ["14-subconsultas-from", "subconsultas-from"],
    ["15-cte-with", "cte-with"],
    ["16-union", "union"],
    ["17-exists", "exists"],
    ["18-proyecto-final-sql", "proyecto-final-sql"],
  ],
  "minimarkets-del-sur": [
    ["01-conoce-las-tablas", "locales-y-ciudades"],
    ["01-conoce-las-tablas", "categorias"],
    ["02-filtrar", "lacteos-caros"],
    ["02-filtrar", "productos-de-queso"],
    ["02-filtrar", "locales-del-sur"],
    ["03-ordenar-y-limitar", "productos-mas-caros"],
    ["03-ordenar-y-limitar", "ventas-mas-grandes"],
    ["04-resumir-con-group-by", "ventas-por-local"],
    ["04-resumir-con-group-by", "ventas-por-medio-de-pago"],
    ["05-filtrar-grupos", "productos-populares"],
    ["05-filtrar-grupos", "locales-con-ticket-alto"],
    ["06-cruzar-tablas", "ventas-por-ciudad"],
    ["06-cruzar-tablas", "top-10-productos"],
    ["07-ventas-por-mes", "ventas-por-mes"],
    ["07-ventas-por-mes", "ranking-de-marzo"],
    ["08-preguntas-de-gerencia", "local-con-menos-ventas-en-marzo"],
    ["08-preguntas-de-gerencia", "ese-local-mes-a-mes"],
    ["08-preguntas-de-gerencia", "categoria-mas-vendida"],
    ["08-preguntas-de-gerencia", "ticket-por-ciudad"],
    ["08-preguntas-de-gerencia", "productos-de-50-unidades"],
  ],
  "tienda-online-pewen": [
    ["01-de-la-planilla-a-python", "totales-del-carrito"],
    ["01-de-la-planilla-a-python", "primera-tabla"],
    ["02-cargar-y-explorar", "explorar-pedidos"],
    ["03-filtrar-y-seleccionar", "devueltos"],
    ["03-filtrar-y-seleccionar", "envios-grandes"],
    ["04-limpiar", "limpiar-pedidos"],
    ["05-agrupar-y-resumir", "mejores-clientes"],
    ["06-cruzar-tablas", "ventas-por-categoria-y-region"],
    ["07-detectar-patrones", "devoluciones-y-meses"],
    ["08-revisar-el-codigo-de-la-ia", "corregir-codigo-ia"],
    ["09-recomendaciones-para-el-negocio", "cinco-respuestas"],
  ],
  "clinica-cordillera-central": [
    ["01-la-pregunta-del-dashboard", "ficha-del-dashboard"],
    ["02-preparar-los-datos", "atenciones-con-nombres"],
    ["02-preparar-los-datos", "control-por-tipo"],
    ["03-calcular-indicadores", "tasa-de-inasistencia"],
    ["03-calcular-indicadores", "espera-por-sede"],
    ["04-elegir-el-grafico", "serie-mensual-de-urgencias"],
    ["04-elegir-el-grafico", "ranking-de-inasistencia"],
    ["05-disenar-el-dashboard", "boceto-del-dashboard"],
    ["06-construir-el-dashboard", "dashboard-publicado"],
    ["07-presentar-en-cinco-minutos", "presentacion-al-directorio"],
  ],
};

export async function registrarse(page: Page, nombre: string): Promise<string> {
  const email = `ruta-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
  await page.goto("/registro?callbackUrl=%2Fdashboard");
  await page.locator('input[name="name"]').fill(nombre);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return email;
}

// Aprueba misiones por la API, en orden, como si se hubieran resuelto en la página.
export async function aprobar(page: Page, ip: string, caso: string, misiones: [string, string][]) {
  for (const [mision, tarea] of misiones) {
    const respuesta = await page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
      data: { caso, mision, tarea, aprobada: true },
    });
    expect(respuesta.ok(), `${caso}/${mision}`).toBe(true);
  }
}

// Las clases no tienen entregable: se completan al aprobar todas sus lecciones.
export const CLASES = new Set(["clases-de-sql"]);

// Completa un caso entero: todas sus misiones y, si es un caso, el entregable aprobado por administración.
export async function completarCaso(page: Page, admin: Page, ip: string, email: string, caso: string) {
  await aprobar(page, ip, caso, MISIONES[caso]);
  if (CLASES.has(caso)) return;
  await page.goto(`/casos/${caso}`);
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill(`https://github.com/e2e/${caso}`);
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();
  // Se aprueba por la API de revisión, con 2 en las tres dimensiones: es más rápido y no depende de que la página
  // hidrate. La revisión con clics en la rúbrica la prueba recorrido.spec.
  await admin.goto("/profesor/entregables");
  const tarjeta = admin.locator("li", { hasText: email });
  await expect(tarjeta).toHaveCount(1);
  const entregableId = await tarjeta.locator("[data-entregable-id]").getAttribute("data-entregable-id");
  expect(entregableId, `${caso}: entregable sin id`).not.toBeNull();
  const respuesta = await admin.request.post(`/api/revision/entregables/${entregableId}`, {
    headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
    data: { puntajes: { claridad: 2, ejecucion: 2, coherencia: 2 }, observaciones: {}, comentario: null },
  });
  expect(respuesta.ok(), `${caso}: aprobación de entregable`).toBe(true);
}

export { entrarComoAdmin };
```

Desde el Caso 2, la ruta exige completar antes las clases:
- en `e2e/tests/minimarkets.spec.ts`, después de `await completarCaso(page, admin, ip, email, "despachos-rapidos");`, agrega `await completarCaso(page, admin, ip, email, "clases-de-sql");`, y el nombre de la prueba empieza con "con los casos 0 y 1 y las clases de SQL completos:";
- en `pewen.spec.ts`, `clinica.spec.ts` y `proyecto-final.spec.ts`, en la lista de casos, `"despachos-rapidos", "minimarkets-del-sur"` pasa a `"despachos-rapidos", "clases-de-sql", "minimarkets-del-sur"`.

En `e2e/calentar.ts`, en `RUTAS`, antes de `"/casos/minimarkets-del-sur"`, agrega:
```ts
  "/casos/clases-de-sql",
  "/casos/clases-de-sql/01-select-basico",
```

- [ ] **Step 2: Las pruebas de las clases**

`e2e/tests/clases.spec.ts`:
```ts
import { expect, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, MISIONES, registrarse } from "./progreso";

const CLASES = "clases-de-sql";

test("la ruta muestra las clases antes del caso de SQL, sin entregable ni rúbrica", async ({ page }) => {
  await page.goto("/rutas/data-analyst");
  const clases = page.getByRole("link", { name: /Clases de SQL/ });
  await expect(clases).toContainText("18 lecciones");
  // Las clases no cuentan en la numeración: Minimarkets sigue siendo el tercer caso de la ruta.
  await expect(page.getByRole("link", { name: /Minimarkets del Sur/ })).toContainText("Caso 3 · Minimarkets del Sur");
  await page.goto(`/casos/${CLASES}`);
  await expect(page.getByText("> clases")).toBeVisible();
  await expect(page.getByText("Lección 1 · 12 min")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu avance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu entregable" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Cómo se revisa tu entregable" })).toHaveCount(0);
});

test("con los casos 0 y 1 completos: resuelve una lección y, al aprobarlas todas, se habilita el Caso 2", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(180_000);
  const email = await registrarse(page, "Valentina Soto");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "despachos-rapidos"]) await completarCaso(page, admin, ip, email, caso);

  await page.goto(`/casos/${CLASES}/01-select-basico`);
  await expect(page.getByText("> lección 1/18 · 12 min")).toBeVisible();
  await expect(page.getByText("Sintaxis", { exact: true })).toBeVisible();
  const consulta = page.getByLabel("Consulta SQL");
  await consulta.fill("SELECT nombre FROM estudiantes");
  await page.getByRole("button", { name: "Validar" }).click();
  await expect(page.getByText("Tu consulta debe devolver 2 columnas", { exact: false })).toBeVisible();
  await consulta.fill("SELECT nombre, ciudad FROM estudiantes");
  const aprobada = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;
  await expect(page.getByRole("heading", { name: "Lección aprobada" })).toBeVisible();

  await page.goto("/casos/minimarkets-del-sur");
  await expect(page.getByText("sus tareas se habilitan al completar", { exact: false })).toContainText("Clases de SQL");
  await aprobar(page, ip, CLASES, MISIONES[CLASES].slice(1));
  await page.goto(`/casos/${CLASES}`);
  await expect(page.getByText("Clases completas", { exact: false })).toBeVisible();
  await page.goto("/casos/minimarkets-del-sur");
  await expect(page.getByText("sus tareas se habilitan al completar", { exact: false })).toHaveCount(0);
});
```

Run: `npm run test:e2e -- tests/clases.spec.ts tests/minimarkets.spec.ts`
Expected: `3 passed`.

- [ ] **Step 3: README**

En `README.md`, antes de `## Caso 0: Herramientas del oficio`, agrega:
```markdown
## Clases

- **Qué son:** antes del caso que las aplica, una lección por tema, traída de las aulas de la v1. En `caso.yaml` llevan `tipo: clases` y solo `slug`, `titulo`, `dataset` y `misiones`: no tienen empresa, entregable, rúbrica ni certificado propio.
  - Se completan al aprobar todas sus lecciones y habilitan el caso siguiente de la ruta. Cuentan para el certificado de la ruta, pero no van al portafolio.
  - Cada lección es una misión con `<Concepto>`, `<Sintaxis>` (la forma general, que no se ejecuta), ejemplos, un ejercicio y un `<Debrief>` sin consejo de entrevista.
  - La última lección no tiene que ser sin guía: el caso siguiente cumple ese papel.
- **Importar un aula de la v1:**
  1. Exporta sus datos a JSON, con el Node de tu equipo: `node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-sql > tmp/aula-sql.json`.
  2. Escribe el borrador: `docker compose run --rm tools pnpm --filter @syntaxerror/content importar sql /app/tmp/aula-sql.json /app/content/casos/<carpeta> <lección,lección,...>`.
  3. Revisa el borrador: tildes que el diccionario no corrige solo (`mas`, `aun`, `que` en preguntas), dos pistas por lección que orienten sin dar la respuesta, y el título y el dataset de `caso.yaml`. Después corre `npm run content:validate`.
- **El importador** (`packages/content/src/importar/`) tiene un formato común (`leccion.ts`) y un adaptador por aula (`aula-sql.ts`). Para Excel, Python o Power BI se agrega su adaptador.
  - Corrige tildes con un diccionario y nombres propios de los datos (Concepción, Tomás), pero no toca los valores entre comillas simples ni los nombres de tablas y columnas, para que los ejercicios sigan calzando con sus soluciones.
  - Descarta las pistas de la v1 que traían la consulta: el validador rechaza una pista con la solución completa.
```

- [ ] **Step 4: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes (619 pruebas).

Run: `npm run test:e2e`
Expected: `41 passed`. Dos corridas seguidas deben dar lo mismo.

- [ ] **Step 5: Recorrer las clases como estudiante**

Con `npm run dev`, entra a http://localhost:3000/rutas/data-analyst. Completa los casos 0 y 1, o apruébalos como admin, y recorre algunas lecciones de las clases de SQL. Revisa cuatro cosas:
- que "Probar ejemplo" muestre las tablas;
- que las pistas aparezcan tras dos resultados incorrectos;
- que el cierre explique la solución;
- que el texto se lea natural.

Anota lo que el equipo quiera reescribir: es el insumo para revisar las otras aulas.

- [ ] **Step 6: Commit**

```bash
git add e2e README.md
git commit -m "test(e2e): clases de sql antes del caso 2; los casos siguientes las completan primero

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**El camino para las otras aulas,** con el mismo importador:
1. **Excel (23 lecciones):** un adaptador `aula-excel.ts` que convierte los ejercicios en `SheetTask`. Van antes del Caso 1, y la primera tarea es ver cómo valida celdas el aula de la v1.
2. **Python (34 lecciones):** un adaptador a `PythonTask`, antes del Caso 3.
3. **Power BI (34 lecciones):** se practican en Power BI Desktop, así que van como lecturas con práctica guiada y una decisión, sin validación automática. Van antes del Caso 4.
4. **IA para datos (14 lecciones):** con quiz; hay que definir si va como clases propias o repartida en los casos 1, 3 y 5.

**Antes de seguir, del equipo:**
- confirmar las dos decisiones pendientes (clases obligatorias, y temas de SQL fuera del piloto);
- recorrer las clases de SQL y decir cuánto texto quieren reescribir;
- con eso se ajusta el trabajo editorial de las aulas siguientes.
