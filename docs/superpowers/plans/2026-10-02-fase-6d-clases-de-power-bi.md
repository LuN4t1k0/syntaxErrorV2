# Fase 6d: Clases de Power BI. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Traer las 34 lecciones del aula de Power BI de la v1 como "Clases de Power BI", entre el Caso 3 (Tienda Online Pewen) y el Caso 4 (Clínica Cordillera Central), sin reescribirlas.

**Architecture:**
- **No cambia la plataforma.** Power BI se practica en Power BI Desktop, fuera de la plataforma, así que no hay nada que validar automáticamente. Las lecciones usan lo que ya existe:
  - **26 prácticas.** En la v1 traen un enunciado, pasos a seguir, un dataset y una autocorrección ("Ver respuesta"). En la v2:
    - el enunciado y los pasos van al final del concepto, como lista numerada;
    - el dataset se enlaza en «Datos del caso» (`/casos/clases-de-power-bi/datos/<archivo>.csv`);
    - la autocorrección es una `LecturaTask`: muestra la respuesta al marcarla y aprueba la lección.
  - **8 lecturas:** también son `LecturaTask`.
- **El exportador trae los datasets del aula** (`public/datasets/*.csv`: ventas, productos y ventas_sucio). El importador los copia tal cual a `datos/`.
- **El formato común suma `Leccion.practica`** (enunciado, pasos y dataset) y `Seccion.lenguaje`, para mostrar el código de M y DAX sin ejecutarlo.
- **Corrección de texto:**
  - **El voseo pasa a tú:** el aula de Power BI estaba escrita con voseo ("podés", "seguí", "hacé clic", "por vos") y el proyecto trata de tú. El importador corrige las formas que no son ambiguas; las demás quedan para la revisión.
  - **Las comillas:** en Power BI encierran nombres de menús ('Segmentación de datos'), no valores de datos, así que también se corrigen (`respetarComillas: false`).
  - **Los nombres de columna:** los de los datasets (`region`, `categoria`) se protegen, como en SQL.
- **Revisión editorial,** sin reescribir el contenido:
  - tildes de contexto ("cuántas", "cuál", "está", "más");
  - los "¿" de las 34 preguntas de autocorrección;
  - el voseo que queda ("anda al panel", "sentís").

**Tech Stack:** MDX 3, Vitest 4 y Playwright 1.55. Fuera de la plataforma: Power BI Desktop (gratis, Windows).

**Spec:** `docs/propuesta-pedagogica-data-analyst.md`, sección 3 (clases) y decisión 6, actualizada con el orden Caso 3 → clases de Power BI → Caso 4. La sección 11 (tono: tratar de tú, sin voseo) justifica la corrección del voseo.

## Global Constraints

**Copia literal:** cada archivo completo de este plan se copia exactamente como está, con sus comentarios. Las 34 lecciones son la versión final después de la revisión editorial: compáralas con `diff` contra el plan antes del commit.

**Entorno**
- Todo se ejecuta con `docker compose run --rm tools ...`, salvo la exportación del aula (Task 2), que usa el Node del equipo.
- El paquete de la app se llama `web`.

**Contenido:** no se reescribe el texto de la v1. Los datasets se copian sin cambios: son los que se usan en Power BI Desktop, y las respuestas de la autocorrección dependen de ellos.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Voseo que queda en el texto:** las formas del importador son las que no se confunden con otra palabra. Antes del commit, busca `podés|querés|tenés|sentís|hacé|andá|fijate|vos\b` en las lecciones: no debe quedar ninguna. Probado en `leccion.test.ts`, y revisado en la Task 2.
2. **Un nombre de menú entre comillas sin tilde** ('Segmentacion'): en Power BI se corrige; en SQL, Excel y Python el texto entre comillas sigue protegido. Probado en `leccion.test.ts`.
3. **El enlace al dataset de una práctica:** apunta a `/casos/clases-de-power-bi/datos/<archivo>`, que existe porque el CSV está en `datos/`. Probado en `aula-powerbi.test.ts` y en `clases.spec.ts`, que lo descarga.
4. **Una práctica sin autocorrección** no se importa: el importador falla con un mensaje claro. Probado en `aula-powerbi.test.ts`.
5. **El Caso 4 queda bloqueado hasta completar las 34 lecciones.** Probado en `clinica.spec.ts`, que ahora completa las clases antes.

## Estructura de archivos

```
packages/content/scripts/exportar-aula-v1.mjs                                           trae public/datasets
packages/content/src/importar/leccion.ts (+ test), aula-powerbi.ts (+ test), importar-cli.ts   práctica, voseo y adaptador
content/casos/clases-de-power-bi/ (caso.yaml, datos/ y 34 lecciones), content/rutas/data-analyst.yaml
apps/web/src/db/release.test.ts                                                          11 casos
e2e/tests/progreso.ts, clases.spec.ts, clinica y proyecto-final .spec.ts, e2e/calentar.ts
README.md
```

---

### Task 1: El adaptador de Power BI

**Files:**
- Modify: `packages/content/scripts/exportar-aula-v1.mjs`, `packages/content/src/importar/leccion.ts`, `packages/content/src/importar/importar-cli.ts`
- Create: `packages/content/src/importar/aula-powerbi.ts`
- Test: `packages/content/src/importar/aula-powerbi.test.ts`, `packages/content/src/importar/leccion.test.ts`

**Interfaces:**
- Consumes: el formato común (Fases 6a a 6c).
- Produces:
  - en `importar/leccion`:
    - los tipos `Practica` y `Leccion.practica`, y `Seccion.lenguaje`;
    - `corregirTildes(texto, excepto?, { respetarComillas? })`, que también pasa el voseo a tú;
  - en `importar/aula-powerbi`: `LeccionPowerBiV1`, `convertirLeccionPowerBi(v1, numero, casoSlug, excepto?)` y `columnasDeDatasets(archivos)`;
  - el JSON exportado suma `archivos: { "<nombre>.csv": "<contenido>" }`;
  - el comando `importar <sql|excel|python|powerbi> ...`.

- [ ] **Step 1: Escribir las pruebas**

`packages/content/src/importar/aula-powerbi.test.ts`:
~~~~ts
import { describe, expect, it } from "vitest";
import { columnasDeDatasets, convertirLeccionPowerBi, type LeccionPowerBiV1 } from "./aula-powerbi";
import { leccionAMdx } from "./leccion";

const practica: LeccionPowerBiV1 = {
  slug: "instalar-y-conectar-datos",
  title: "Instalar Power BI y conectar datos",
  duration: "10 min",
  type: "practice",
  intro: ["En esta leccion conectas tu primer CSV."],
  sections: [{ heading: "El lenguaje M", body: ["El editor genera el M por vos."], code: '= Table.SelectRows(ventas, each [region] = "norte")' }],
  prompt: "Segui los pasos y despues confirma cuantas columnas tiene la tabla.",
  practiceSteps: ["En la pestana Inicio, hace clic en 'Obtener datos'.", "Verifica las columnas fecha, producto, region y monto."],
  datasetFile: "ventas.csv",
  selfCheck: { question: "Cuantas columnas tiene la tabla ventas?", answer: "4 columnas." },
};

describe("convertirLeccionPowerBi", () => {
  it("una práctica lleva sus pasos y su dataset al concepto, y la autocorrección pasa a LecturaTask", () => {
    const leccion = convertirLeccionPowerBi(practica, 2, "clases-de-power-bi", columnasDeDatasets({ "ventas.csv": "fecha,producto,region,monto\n" }));
    expect(leccion).toMatchObject({
      slug: "02-instalar-y-conectar-datos",
      intro: ["En esta lección conectas tu primer CSV."],
      practica: {
        enunciado: "Sigue los pasos y después confirma cuantas columnas tiene la tabla.",
        pasos: ["En la pestaña Inicio, haz clic en 'Obtener datos'.", "Verifica las columnas fecha, producto, region y monto."],
        datos: { nombre: "ventas.csv", enlace: "/casos/clases-de-power-bi/datos/ventas.csv" },
      },
      tarea: { tipo: "LecturaTask", id: "instalar-y-conectar-datos", pregunta: "Cuantas columnas tiene la tabla ventas?", respuesta: "4 columnas." },
    });
    expect(leccion.secciones[0]).toMatchObject({ parrafos: ["El editor genera el M por ti."], codigo: practica.sections?.[0].code, lenguaje: "text" });
  });

  it("el MDX trae la práctica numerada con el enlace al dataset, y el código de M sin ejecutar", () => {
    const mdx = leccionAMdx(convertirLeccionPowerBi(practica, 2, "clases-de-power-bi"));
    expect(mdx).toContain("[ventas.csv](/casos/clases-de-power-bi/datos/ventas.csv)");
    expect(mdx).toContain("1. En la pestaña Inicio, haz clic en 'Obtener datos'.\n2. Verifica");
    expect(mdx).toContain('```text\n= Table.SelectRows(ventas, each [region] = "norte")\n```');
    expect(mdx).toContain("<LecturaTask");
  });

  it("una lectura pasa a LecturaTask; una práctica sin autocorrección no se importa", () => {
    const lectura = convertirLeccionPowerBi({ slug: "que-es", title: "Que es Power BI", duration: "6 min", type: "reading", prompt: "Que instalarias?", explanation: "Desktop." }, 1, "clases");
    expect(lectura.tarea).toEqual({ tipo: "LecturaTask", id: "que-es", pregunta: "Que instalarias?", respuesta: "Desktop." });
    expect(lectura.practica).toBeUndefined();
    expect(() => convertirLeccionPowerBi({ ...practica, selfCheck: undefined }, 1, "clases")).toThrow("no tiene enunciado, pasos o autocorrección");
  });
});
~~~~

En `packages/content/src/importar/leccion.test.ts`, antes de `it("«como» y «Para que sirve» ...")`, agrega:
```ts
  it("pasa el voseo a tú y, si se pide, corrige también el texto entre comillas", () => {
    expect(corregirTildes("Segui los pasos: podes elegir, y si queres, hace clic. Lo genera por vos.")).toBe("Sigue los pasos: puedes elegir, y si quieres, haz clic. Lo genera por ti.");
    expect(corregirTildes("Anda a la tienda y seleccioná 'Segmentacion de datos'.", new Set(), { respetarComillas: false })).toBe("Ve a la tienda y selecciona 'Segmentación de datos'.");
  });
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/importar`
Expected: FAIL. `./aula-powerbi` no existe y el voseo no se corrige.

- [ ] **Step 3: Implementar**

`packages/content/scripts/exportar-aula-v1.mjs` completo:
```js
// Exporta un aula de la v1 a JSON para importarla (packages/content/src/importar), con sus datasets descargables. Corre con el Node del equipo, fuera
// de Docker, porque lee el repositorio de la v1: node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-sql
// > tmp/aula-sql.json. Solo lee los módulos de datos del aula (lecciones y datasets); no ejecuta la app.
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
// Los CSV que el aula ofrecía para descargar (por ejemplo, las prácticas de Power BI), tal cual.
const carpeta = path.resolve(aula, "public", "datasets");
const archivos = existsSync(carpeta)
  ? Object.fromEntries(readdirSync(carpeta).filter((nombre) => nombre.endsWith(".csv")).sort().map((nombre) => [nombre, readFileSync(path.join(carpeta, nombre), "utf8")]))
  : {};
process.stdout.write(`${JSON.stringify({ modules: lecciones.modules ?? [], lessons: lecciones.lessons, datasets, archivos }, null, 2)}\n`);
```

`packages/content/src/importar/leccion.ts` completo:
~~~~ts
// Formato común de una lección importada desde un aula de la v1, y su escritura como MDX de la v2.
// Cada aula tiene su adaptador (aula-sql.ts, y después Excel, Python y Power BI) que llena este formato; el resto
// del camino (escribir el MDX, el caso.yaml y los datos) es el mismo para todas.
//
// Lo que sale de aquí es un borrador: después viene la revisión editorial (tildes que el diccionario no cubre, tono
// de tú, pistas que orientan sin dar la respuesta). El validador de contenido revisa que cada solución pase.

// Una sección del concepto: párrafos y, si la tiene, una consulta que se puede probar (ejemplo), una fórmula de
// planilla que solo se muestra (formula) o código de Python que solo se muestra (codigo), porque usa los datos de la
// preparación de la tarea.
export type Seccion = { titulo: string; parrafos: string[]; ejemplo: string | null; formula?: string | null; codigo?: string | null; lenguaje?: string };

// Una práctica fuera de la plataforma (por ejemplo, en Power BI Desktop): qué se hace, los pasos y el archivo de datos.
export type Practica = { enunciado: string; pasos: string[]; datos: { nombre: string; enlace: string } | null };

export type TareaSql = {
  tipo: "SqlTask";
  id: string;
  enunciado: string;
  inicial: string;
  solucion: string;
  comparar: "filas-en-orden" | "filas-sin-orden";
  pistas: string[];
};

export type Celda = string | number | null;

export type TareaHoja = {
  tipo: "SheetTask";
  id: string;
  enunciado: string;
  // La planilla de la lección, fila por fila desde A1.
  grilla: Celda[][];
  celdas: { celda: string; valor: string | number }[];
  solucion: Record<string, string | number>;
  pistas: string[];
};

export type TareaPython = {
  tipo: "PythonTask";
  id: string;
  enunciado: string;
  preparacion: string;
  inicial: string;
  solucion: string;
  pruebas: string;
  paquetes: "pandas"[];
  pistas: string[];
};

// Una lección de lectura: una pregunta para pensar y la respuesta del curso.
export type TareaLectura = { tipo: "LecturaTask"; id: string; pregunta: string; respuesta: string };

export type Tarea = TareaSql | TareaHoja | TareaPython | TareaLectura;

export type Leccion = {
  slug: string;
  titulo: string;
  minutos: number;
  intro: string[];
  sintaxis: { lenguaje: "sql" | "python" | "planilla"; codigo: string } | null;
  secciones: Seccion[];
  practica?: Practica | null;
  tarea: Tarea;
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
  if (seccion.formula) partes.push(`<Sintaxis lenguaje="planilla" codigo=${atributo(seccion.formula)} />`);
  // Un bloque de código de MDX se muestra tal cual: no necesita escaparse.
  if (seccion.codigo) partes.push([`\`\`\`${seccion.lenguaje ?? "python"}`, seccion.codigo, "```"].join("\n"));
  return partes.join("\n\n");
}

function practicaMdx(practica: Practica): string {
  const datos = practica.datos ? ` Los datos están en [${practica.datos.nombre}](${practica.datos.enlace}), también en «Datos del caso» de estas clases.` : "";
  return [`**Práctica.** ${escaparTexto(practica.enunciado)}${datos}`, practica.pasos.map((paso, indice) => `${indice + 1}. ${escaparTexto(paso)}`).join("\n")].join("\n\n");
}

function tareaMdx(tarea: Tarea): string[] {
  switch (tarea.tipo) {
    case "SqlTask":
      return [
        "<SqlTask",
        `  id="${tarea.id}"`,
        `  enunciado=${atributo(tarea.enunciado)}`,
        `  inicial=${atributo(tarea.inicial)}`,
        `  solucion=${atributo(tarea.solucion)}`,
        `  comparar="${tarea.comparar}"`,
        `  pistas={${JSON.stringify(tarea.pistas)}}`,
        "/>",
      ];
    case "SheetTask":
      return [
        "<SheetTask",
        `  id="${tarea.id}"`,
        `  enunciado=${atributo(tarea.enunciado)}`,
        `  grilla={${JSON.stringify(tarea.grilla)}}`,
        `  celdas={${JSON.stringify(tarea.celdas)}}`,
        `  solucion={${JSON.stringify(tarea.solucion)}}`,
        `  pistas={${JSON.stringify(tarea.pistas)}}`,
        "/>",
      ];
    case "PythonTask":
      return [
        "<PythonTask",
        `  id="${tarea.id}"`,
        `  enunciado=${atributo(tarea.enunciado)}`,
        `  preparacion=${atributo(tarea.preparacion)}`,
        `  inicial=${atributo(tarea.inicial)}`,
        `  solucion=${atributo(tarea.solucion)}`,
        `  pruebas=${atributo(tarea.pruebas)}`,
        `  paquetes={${JSON.stringify(tarea.paquetes)}}`,
        `  pistas={${JSON.stringify(tarea.pistas)}}`,
        "/>",
      ];
    case "LecturaTask":
      return ["<LecturaTask", `  id="${tarea.id}"`, `  pregunta=${atributo(tarea.pregunta)}`, `  respuesta=${atributo(tarea.respuesta)}`, "/>"];
  }
}

export function leccionAMdx(leccion: Leccion): string {
  const concepto = [
    ...leccion.intro.map(escaparTexto),
    ...(leccion.sintaxis ? [`<Sintaxis lenguaje="${leccion.sintaxis.lenguaje}" codigo=${atributo(leccion.sintaxis.codigo)} />`] : []),
    ...leccion.secciones.map(seccionMdx),
    ...(leccion.practica ? [practicaMdx(leccion.practica)] : []),
  ];
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
    ...tareaMdx(leccion.tarea),
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
  agrupacion: "agrupación",
  ahi: "ahí",
  alfabetico: "alfabético",
  analisis: "análisis",
  analitica: "analítica",
  anio: "año",
  anios: "años",
  antiguedad: "antigüedad",
  aparicion: "aparición",
  aplicacion: "aplicación",
  aplicala: "aplícala",
  aqui: "aquí",
  area: "área",
  aritmetica: "aritmética",
  aritmeticos: "aritméticos",
  asi: "así",
  automaticamente: "automáticamente",
  automaticas: "automáticas",
  automaticos: "automáticos",
  basica: "básica",
  basicas: "básicas",
  basico: "básico",
  basicos: "básicos",
  botin: "botín",
  boton: "botón",
  busqueda: "búsqueda",
  calculo: "cálculo",
  calculos: "cálculos",
  categoria: "categoría",
  categorias: "categorías",
  categoricas: "categóricas",
  cirugia: "cirugía",
  codigo: "código",
  codigos: "códigos",
  coleccion: "colección",
  combinacion: "combinación",
  como: "cómo",
  comodo: "cómodo",
  comparacion: "comparación",
  comun: "común",
  condicion: "condición",
  conexion: "conexión",
  configuracion: "configuración",
  confirmacion: "confirmación",
  contraccion: "contracción",
  conversion: "conversión",
  corrigelo: "corrígelo",
  critico: "crítico",
  criticos: "críticos",
  cupon: "cupón",
  deberia: "debería",
  deberian: "deberían",
  decision: "decisión",
  desafio: "desafío",
  descripcion: "descripción",
  despues: "después",
  dia: "día",
  diagnostico: "diagnóstico",
  dias: "días",
  diciendote: "diciéndote",
  dificil: "difícil",
  dimension: "dimensión",
  dinamica: "dinámica",
  dinamicas: "dinámicas",
  dinamico: "dinámico",
  direccion: "dirección",
  distribucion: "distribución",
  division: "división",
  dolar: "dólar",
  dolio: "dolió",
  donde: "dónde",
  edicion: "edición",
  ejecutalo: "ejecútalo",
  eleccion: "elección",
  especifica: "específica",
  especificas: "específicas",
  estadistica: "estadística",
  estatica: "estática",
  estatico: "estático",
  evalua: "evalúa",
  evolucion: "evolución",
  existia: "existía",
  explicitamente: "explícitamente",
  exploracion: "exploración",
  expresion: "expresión",
  facil: "fácil",
  formula: "fórmula",
  formulas: "fórmulas",
  funcion: "función",
  grafico: "gráfico",
  graficos: "gráficos",
  harias: "harías",
  identica: "idéntica",
  incluyendote: "incluyéndote",
  indice: "índice",
  informacion: "información",
  inscribio: "inscribió",
  inscripcion: "inscripción",
  instalacion: "instalación",
  instruccion: "instrucción",
  intentaria: "intentaría",
  interaccion: "interacción",
  interseccion: "intersección",
  jerarquia: "jerarquía",
  jerarquias: "jerarquías",
  jerarquicos: "jerárquicos",
  leccion: "lección",
  libreria: "librería",
  linea: "línea",
  lineas: "líneas",
  logica: "lógica",
  logicos: "lógicos",
  manipulacion: "manipulación",
  margenes: "márgenes",
  mascara: "máscara",
  matematicas: "matemáticas",
  maximo: "máximo",
  mayoria: "mayoría",
  mayusculas: "mayúsculas",
  mecanicos: "mecánicos",
  metrica: "métrica",
  minimo: "mínimo",
  minusculas: "minúsculas",
  mision: "misión",
  moderacion: "moderación",
  muestrame: "muéstrame",
  multiples: "múltiples",
  numerica: "numérica",
  numericas: "numéricas",
  numero: "número",
  numeros: "números",
  obligaria: "obligaría",
  ocurrio: "ocurrió",
  operacion: "operación",
  origenes: "orígenes",
  pagina: "página",
  parentesis: "paréntesis",
  patron: "patrón",
  pelicula: "película",
  pesaria: "pesaría",
  pestana: "pestaña",
  pestanas: "pestañas",
  piensalo: "piénsalo",
  podria: "podría",
  porcion: "porción",
  posicion: "posición",
  precision: "precisión",
  presentacion: "presentación",
  proporcion: "proporción",
  proxima: "próxima",
  proximo: "próximo",
  quedarian: "quedarían",
  quedate: "quédate",
  rapida: "rápida",
  rapido: "rápido",
  razon: "razón",
  region: "región",
  relacion: "relación",
  repeticion: "repetición",
  sangria: "sangría",
  seccion: "sección",
  segmentacion: "segmentación",
  segun: "según",
  seleccion: "selección",
  semaforo: "semáforo",
  sesion: "sesión",
  simultanea: "simultánea",
  solucion: "solución",
  subexpresion: "subexpresión",
  tambien: "también",
  tecnicamente: "técnicamente",
  tendran: "tendrán",
  tenias: "tenías",
  teoria: "teoría",
  tipicamente: "típicamente",
  tipico: "típico",
  tipicos: "típicos",
  todavia: "todavía",
  transformacion: "transformación",
  trio: "trío",
  ultima: "última",
  ultimo: "último",
  unica: "única",
  unicas: "únicas",
  unico: "único",
  usarias: "usarías",
  util: "útil",
  utiles: "útiles",
  vacia: "vacía",
  vacio: "vacío",
  valido: "válido",
  vendio: "vendió",
  verificacion: "verificación",
  version: "versión",
  visualizacion: "visualización",
};

// «como» y «donde» solo llevan tilde en preguntas o títulos: se corrigen al inicio del texto o después de «¿»
// (por ejemplo «Como pensarlo» → «Cómo pensarlo»). El resto de las palabras se corrige siempre.
const SOLO_AL_INICIO = new Set(["como", "donde"]);

// Frases fijas de las aulas de la v1 que el diccionario no puede corregir solo («que» lleva tilde solo en preguntas), y
// el voseo de algunas aulas: el texto trata de tú (las formas en -ar sin tilde, como «carga», ya son de tú).
const FRASES: [RegExp, string][] = [
  [/\bPara que sirve\b/g, "Para qué sirve"],
  [/\b(por|para) vos\b/g, "$1 ti"],
  [/\bcon vos\b/g, "contigo"],
  [/\b([Hh])ace clic\b/g, "$1az clic"],
  [/\bAnda a\b/g, "Ve a"],
];

// Formas del voseo que no se confunden con otra palabra, y su forma con tú.
const VOSEO: Record<string, string> = {
  abri: "abre",
  acordate: "acuérdate",
  asegurate: "asegúrate",
  descargalo: "descárgalo",
  elegi: "elige",
  escribi: "escribe",
  fijate: "fíjate",
  podes: "puedes",
  queres: "quieres",
  seleccioná: "selecciona",
  segui: "sigue",
  tenes: "tienes",
  volve: "vuelve",
};

// El texto entre comillas simples es un valor de los datos ('Sin inscripcion', 'Santiago'): tiene que quedar igual
// que en la solución, así que no se corrige. En Power BI, en cambio, las comillas encierran nombres de menús
// ('Segmentación de datos'), que sí se corrigen: ahí se pasa { respetarComillas: false }.
export function corregirTildes(texto: string, excepto: ReadonlySet<string> = new Set(), { respetarComillas = true } = {}): string {
  if (!respetarComillas) return corregirTramo(texto, excepto);
  return texto
    .split(/('[^']*')/)
    .map((parte) => (parte.startsWith("'") ? parte : corregirTramo(parte, excepto)))
    .join("");
}

function corregirTramo(texto: string, excepto: ReadonlySet<string>): string {
  const conFrases = FRASES.reduce((actual, [patron, correcta]) => actual.replace(patron, correcta), texto);
  return conFrases.replace(/(^|[^\p{L}\p{N}_])([\p{L}]+)(?=$|[^\p{L}\p{N}_])/gu, (coincidencia, antes: string, palabra: string, desde: number) => {
    const minuscula = palabra.toLowerCase();
    const correcta = TILDES[minuscula] ?? VOSEO[minuscula];
    if (!correcta || excepto.has(minuscula)) return coincidencia;
    if (SOLO_AL_INICIO.has(minuscula) && !(desde === 0 || /¿\s*$/.test(conFrases.slice(0, desde + antes.length)))) return coincidencia;
    const conMayuscula = palabra[0] !== palabra[0].toLowerCase();
    return `${antes}${conMayuscula ? correcta[0].toUpperCase() + correcta.slice(1) : correcta}`;
  });
}
~~~~

`packages/content/src/importar/aula-powerbi.ts`:
```ts
import { corregirTildes, type Leccion } from "./leccion";

// Adaptador del aula de Power BI de la v1 (aula-powerbi/src/data/lessons.js, exportado a JSON con sus datasets).
// Power BI se practica en Power BI Desktop, fuera de la plataforma: no hay nada que validar automáticamente.
// - Una práctica trae sus pasos y su dataset, y termina con una autocorrección (pregunta y respuesta): los pasos van
//   al concepto y la autocorrección es una LecturaTask, que muestra la respuesta al marcarla, como «Ver respuesta».
// - Una lectura trae una pregunta para reflexionar y su respuesta: también es una LecturaTask.

export type SeccionPowerBiV1 = { heading: string; body: string[]; code: string | null };
export type LeccionPowerBiV1 = {
  slug: string;
  title: string;
  duration: string;
  type: "practice" | "reading";
  intro?: string[];
  sections?: SeccionPowerBiV1[];
  prompt?: string;
  explanation?: string;
  practiceSteps?: string[];
  datasetFile?: string;
  selfCheck?: { question: string; answer: string };
};

// Los encabezados de los datasets (region, categoria) aparecen en los pasos como nombres de columna: se escriben sin
// tilde, igual que en el archivo, y el diccionario no los toca.
export function columnasDeDatasets(archivos: Record<string, string>): Set<string> {
  return new Set(Object.values(archivos).flatMap((contenido) => (contenido.split(/\r?\n/, 1)[0] ?? "").split(",").map((columna) => columna.trim().toLowerCase())));
}

// casoSlug sirve para enlazar el dataset de la práctica en «Datos del caso» (/casos/<caso>/datos/<archivo>).
export function convertirLeccionPowerBi(v1: LeccionPowerBiV1, numero: number, casoSlug: string, excepto: ReadonlySet<string> = new Set()): Leccion {
  // Las comillas simples encierran nombres de menús ('Obtener datos'), no valores de datos: también se corrigen.
  const texto = (valor: string) => corregirTildes(valor, excepto, { respetarComillas: false });
  const base = {
    slug: `${String(numero).padStart(2, "0")}-${v1.slug}`,
    titulo: texto(v1.title),
    minutos: Number.parseInt(v1.duration, 10) || 10,
    intro: (v1.intro ?? []).map(texto),
    sintaxis: null,
    // El código de Power BI (M o DAX) solo se muestra: no se ejecuta en la plataforma.
    secciones: (v1.sections ?? []).map((seccion) => ({ titulo: texto(seccion.heading), parrafos: seccion.body.map(texto), ejemplo: null, codigo: seccion.code, lenguaje: "text" })),
    cierre: null,
  };
  if (v1.type === "reading") {
    if (!v1.prompt || !v1.explanation) throw new Error(`La lectura ${v1.slug} no tiene pregunta o respuesta`);
    return { ...base, tarea: { tipo: "LecturaTask", id: v1.slug, pregunta: texto(v1.prompt), respuesta: texto(v1.explanation) } };
  }
  if (!v1.prompt || !v1.practiceSteps?.length || !v1.selfCheck) throw new Error(`La práctica ${v1.slug} no tiene enunciado, pasos o autocorrección`);
  const nombre = v1.datasetFile ?? null;
  return {
    ...base,
    practica: {
      enunciado: texto(v1.prompt),
      pasos: v1.practiceSteps.map(texto),
      datos: nombre ? { nombre, enlace: `/casos/${casoSlug}/datos/${nombre}` } : null,
    },
    tarea: { tipo: "LecturaTask", id: v1.slug, pregunta: texto(v1.selfCheck.question), respuesta: texto(v1.selfCheck.answer) },
  };
}
```

`packages/content/src/importar/importar-cli.ts` completo:
```ts
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { aCsv } from "../generadores/despachos-rapidos";
import { convertirLeccionExcel, type LeccionExcelV1 } from "./aula-excel";
import { columnasDeDatasets, convertirLeccionPowerBi, type LeccionPowerBiV1 } from "./aula-powerbi";
import { convertirLeccionPython, identificadoresPython, type LeccionPythonV1 } from "./aula-python";
import { convertirLeccionSql, datosSql, identificadores, type AulaV1 } from "./aula-sql";
import { leccionAMdx, type Leccion } from "./leccion";

// Escribe el borrador de unas clases a partir de un aula de la v1 exportada a JSON (scripts/exportar-aula-v1.mjs).
// Uso: pnpm --filter @syntaxerror/content importar <sql|excel|python|powerbi> <aula.json> <carpeta de destino> <lecciones separadas por coma>
// Escribe misiones/NN-<lección>.mdx, un caso.yaml para completar y, en SQL, datos/<tabla>.csv con las tablas que usan
// (en Excel cada lección trae su planilla y en Python, su preparación). En Power BI copia los datasets del aula. No pisa contenido: la carpeta de destino no debe existir. Después del
// borrador viene la revisión editorial.

const AULAS = { sql: "Clases de SQL", excel: "Clases de Excel", python: "Clases de Python", powerbi: "Clases de Power BI" } as const;
type Aula = keyof typeof AULAS;

const [aula, entrada, destino, seleccion] = process.argv.slice(2);
if (!(aula in AULAS) || !entrada || !destino || !seleccion) {
  console.error("Uso: importar <sql|excel|python|powerbi> <aula.json> <carpeta de destino> <lección,lección,...>");
  process.exit(1);
}

// Cada aula tiene la forma de sus lecciones: se leen como tales en su rama.
const datos = JSON.parse(await readFile(entrada, "utf8")) as { lessons: { slug: string }[]; datasets: AulaV1["datasets"]; archivos?: Record<string, string> };
const slugs = seleccion.split(",").map((slug) => slug.trim()).filter(Boolean);
const elegidas = slugs.map((slug) => {
  const v1 = datos.lessons.find((leccion) => leccion.slug === slug);
  if (!v1) throw new Error(`El aula no tiene la lección ${slug}`);
  return v1;
});

let lecciones: Leccion[];
let tablas: string[] = [];
if ((aula as Aula) === "sql") {
  const sql = elegidas as AulaV1["lessons"];
  const excepto = identificadores({ lessons: sql, datasets: datos.datasets });
  lecciones = sql.map((v1, indice) => convertirLeccionSql(v1, indice + 1, excepto));
  tablas = [...new Set(sql.flatMap((v1) => v1.datasetTables ?? []))].sort();
} else if ((aula as Aula) === "excel") {
  lecciones = (elegidas as LeccionExcelV1[]).map((v1, indice) => convertirLeccionExcel(v1, indice + 1));
} else if ((aula as Aula) === "powerbi") {
  const excepto = columnasDeDatasets(datos.archivos ?? {});
  lecciones = (elegidas as LeccionPowerBiV1[]).map((v1, indice) => convertirLeccionPowerBi(v1, indice + 1, path.basename(destino), excepto));
} else {
  const python = elegidas as LeccionPythonV1[];
  const excepto = identificadoresPython(python);
  lecciones = python.map((v1, indice) => convertirLeccionPython(v1, indice + 1, excepto));
}

if (existsSync(destino)) throw new Error(`${destino} ya existe: el importador no pisa contenido`);
await mkdir(path.join(destino, "misiones"), { recursive: true });
for (const leccion of lecciones) await writeFile(path.join(destino, "misiones", `${leccion.slug}.mdx`), leccionAMdx(leccion));
if (tablas.length > 0) {
  await mkdir(path.join(destino, "datos"), { recursive: true });
  for (const [tabla, filas] of Object.entries(datosSql({ lessons: [], datasets: datos.datasets }, tablas))) await writeFile(path.join(destino, "datos", `${tabla}.csv`), aCsv(filas));
}
// Los datasets de las prácticas (Power BI) se descargan desde «Datos del caso»: se copian tal cual.
const archivos = (aula as Aula) === "powerbi" ? Object.entries(datos.archivos ?? {}) : [];
if (archivos.length > 0) {
  await mkdir(path.join(destino, "datos"), { recursive: true });
  for (const [nombre, contenido] of archivos) await writeFile(path.join(destino, "datos", nombre), contenido);
}
await writeFile(
  path.join(destino, "caso.yaml"),
  `slug: ${path.basename(destino)}\ntipo: clases\ntitulo: "${AULAS[aula as Aula]}"\ndataset: "Completar: qué datos de práctica usan las lecciones"\nmisiones:\n${lecciones.map((leccion) => `  - ${leccion.slug}`).join("\n")}\n`
);
console.log(`[importar] ${lecciones.length} lecciones y ${tablas.length + archivos.length} tablas en ${destino}`);
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content exec vitest run src/importar && pnpm --filter @syntaxerror/content exec tsc --noEmit"`
Expected: PASS (27 pruebas) y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add packages/content/scripts packages/content/src/importar
git commit -m "feat(contenido): adaptador del aula de power bi con practicas, datasets y voseo a tu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Las clases de Power BI

**Files:**
- Create: `content/casos/clases-de-power-bi/caso.yaml`, `datos/productos.csv`, `datos/ventas.csv`, `datos/ventas_sucio.csv` y 34 lecciones en `misiones/`
- Modify: `content/rutas/data-analyst.yaml`, `apps/web/src/db/release.test.ts`

**Interfaces:**
- Consumes: el adaptador (Task 1).
- Produces: las clases `clases-de-power-bi`, octavas en la ruta. Las lecciones se llaman `NN-<slug de la v1>` y el id de su tarea es el slug de la v1.

- [ ] **Step 1: El borrador del importador**

Run: `mkdir -p tmp && node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-powerbi > tmp/aula-powerbi.json`
Expected: `tmp/aula-powerbi.json`, de unos 70 KB, con los tres CSV en `archivos`.

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content importar powerbi /app/tmp/aula-powerbi.json /app/content/casos/clases-de-power-bi que-es-power-bi,instalar-y-conectar-datos,la-interfaz-de-power-bi,que-es-power-query,transformar-datos,combinar-consultas,limpiar-datos-reales,vista-de-modelo,crear-relaciones,cardinalidad-y-direccion-del-filtro,modelo-estrella,tabla-de-calendario,medidas-vs-columnas-calculadas,sintaxis-basica-de-dax,funciones-de-agregacion,formato-de-una-medida,calculate-y-contexto,variables-en-dax,contexto-de-fila-vs-contexto-de-filtro,funciones-iteradoras-sumx-averagex,funciones-de-tiempo-basicas,inteligencia-de-tiempo-real,tipos-de-grafico,tarjetas-y-tablas,formato-condicional,tooltips,slicers,cross-filtering,drill-down-y-drill-through,publicar-a-power-bi-service,compartir-y-exportar,buenas-practicas-de-diseno,power-bi-vs-excel-sql-python,proyecto-final-dashboard-ventas`
Expected: `[importar] 34 lecciones y 3 tablas en /app/content/casos/clases-de-power-bi`.

Los CSV de `datos/` deben ser idénticos a los del aula (`../cursos/aula-powerbi/public/datasets/`).

- [ ] **Step 2: La revisión editorial (copia literal)**

Reemplaza cada archivo por su versión final.

`content/casos/clases-de-power-bi/caso.yaml`:
```yaml
slug: clases-de-power-bi
tipo: clases
titulo: "Clases de Power BI: del primer CSV al dashboard"
dataset: "ventas, productos y una versión con errores de ventas, para practicar en Power BI Desktop"
misiones:
  - 01-que-es-power-bi
  - 02-instalar-y-conectar-datos
  - 03-la-interfaz-de-power-bi
  - 04-que-es-power-query
  - 05-transformar-datos
  - 06-combinar-consultas
  - 07-limpiar-datos-reales
  - 08-vista-de-modelo
  - 09-crear-relaciones
  - 10-cardinalidad-y-direccion-del-filtro
  - 11-modelo-estrella
  - 12-tabla-de-calendario
  - 13-medidas-vs-columnas-calculadas
  - 14-sintaxis-basica-de-dax
  - 15-funciones-de-agregacion
  - 16-formato-de-una-medida
  - 17-calculate-y-contexto
  - 18-variables-en-dax
  - 19-contexto-de-fila-vs-contexto-de-filtro
  - 20-funciones-iteradoras-sumx-averagex
  - 21-funciones-de-tiempo-basicas
  - 22-inteligencia-de-tiempo-real
  - 23-tipos-de-grafico
  - 24-tarjetas-y-tablas
  - 25-formato-condicional
  - 26-tooltips
  - 27-slicers
  - 28-cross-filtering
  - 29-drill-down-y-drill-through
  - 30-publicar-a-power-bi-service
  - 31-compartir-y-exportar
  - 32-buenas-practicas-de-diseno
  - 33-power-bi-vs-excel-sql-python
  - 34-proyecto-final-dashboard-ventas
```

`content/casos/clases-de-power-bi/misiones/01-que-es-power-bi.mdx`:
```mdx
---
titulo: "Qué es Power BI"
tiempo: 6
---

<Concepto>
Power BI es la herramienta de Microsoft para conectar datos, transformarlos y armar reportes visuales interactivos.

Antes de tocar la interfaz, conviene entender las dos caras de la herramienta: Desktop y Service.

**Power BI Desktop vs. Power BI Service.** Power BI Desktop es la aplicación de escritorio, gratuita, donde se construyen los reportes: se conecta a los datos, se transforman con Power Query, se modelan las relaciones y se disenan las visualizaciones. Power BI Service es la plataforma en la nube (app.powerbi.com) donde se publican esos reportes para compartirlos con otras personas, programar actualizaciones automáticas y verlos desde el navegador o el celular.

**Por que existen los dos.** Se disena en Desktop -- sin conexión a internet, sin limites de la nube -- y se publica en Service solo cuando el reporte ya está listo para compartirse. En este curso vas a trabajar casi todo el tiempo en Power BI Desktop; Power BI Service aparece recien en el modulo de Publicar y compartir.
</Concepto>

<LecturaTask
  id="que-es-power-bi"
  pregunta={"Antes de seguir: ¿qué instalarías primero en tu computador para empezar a practicar, Power BI Desktop o Power BI Service, y por qué?"}
  respuesta={"Power BI Desktop es lo primero que se instala: es gratuito, no requiere cuenta para empezar a explorar, y es donde se construye todo el trabajo. Power BI Service solo hace falta cuando quieres publicar o compartir un reporte ya terminado."}
/>
```

`content/casos/clases-de-power-bi/misiones/02-instalar-y-conectar-datos.mdx`:
```mdx
---
titulo: "Instalar Power BI y conectar datos"
tiempo: 10
---

<Concepto>
Power BI Desktop es gratuito y se instala directo desde Microsoft Store (Windows) o desde el sitio oficial.

En esta lección lo instalas y haces tu primera conexión de datos: el CSV de ventas que vas a usar durante buena parte del curso.

**Instalar Power BI Desktop.** Ve a la Microsoft Store en Windows y busca 'Power BI Desktop', o descárgalo desde powerbi.microsoft.com/desktop. La instalación es gratuita y no requiere licencia paga. Al abrirlo por primera vez puedes cerrar la pantalla de inicio de sesión -- no hace falta una cuenta para trabajar en Desktop.

**Conectar un archivo CSV.** En la pestaña Inicio, el botón 'Obtener datos' abre el listado de orígenes disponibles. Elige 'Texto/CSV' y selecciona el archivo que descargaste. Power BI muestra una vista previa de las columnas detectadas antes de cargar -- ahí puedes revisar que los tipos de dato (texto, número, fecha) se hayan interpretado bien.

**Práctica.** Vas a instalar Power BI Desktop y cargar tu primer dataset. Sigue los pasos y después confirma cuántas columnas tiene la tabla cargada. Los datos están en [ventas.csv](/casos/clases-de-power-bi/datos/ventas.csv), también en «Datos del caso» de estas clases.

1. Descarga el dataset ventas.csv de esta lección.
2. Instala Power BI Desktop desde la Microsoft Store o desde powerbi.microsoft.com/desktop.
3. Abre Power BI Desktop y cierra la pantalla de inicio de sesión si aparece.
4. En la pestaña Inicio, haz clic en 'Obtener datos' y elige 'Texto/CSV'.
5. Selecciona el archivo ventas.csv que descargaste y haz clic en 'Cargar'.
6. Verifica en el panel 'Datos' (a la derecha) que la tabla ventas aparezca con sus 4 columnas: fecha, producto, region, monto.
</Concepto>

<LecturaTask
  id="instalar-y-conectar-datos"
  pregunta={"¿Cuántas columnas tiene la tabla ventas una vez cargada?"}
  respuesta={"4 columnas: fecha, producto, region y monto."}
/>
```

`content/casos/clases-de-power-bi/misiones/03-la-interfaz-de-power-bi.mdx`:
```mdx
---
titulo: "La interfaz de Power BI"
tiempo: 8
---

<Concepto>
Power BI Desktop tiene tres vistas principales, accesibles por los iconos verticales de la izquierda.

Entender para qué sirve cada una evita perderse más adelante en el curso.

**Las tres vistas.** Informe: el lienzo donde armas las visualizaciones (gráficos, tarjetas, tablas). Es la vista donde vas a pasar más tiempo. Datos: muestra las tablas cargadas como una grilla, fila por fila -- útil para inspeccionar los datos crudos. Modelo: muestra las tablas como cajas conectadas por líneas (relaciones) -- se usa cuando hay más de una tabla, como vas a ver en el modulo 3.

**Práctica.** Recorre las tres vistas de Power BI Desktop y después confirma en cuál de ellas ves los datos como una grilla de filas y columnas.

1. Con ventas ya cargado, haz clic en el icono de 'Informe' (el primero de la barra vertical izquierda) y observa el lienzo en blanco.
2. Haz clic en el icono de 'Datos' (el segundo) y revisa las filas de la tabla ventas tal como están en el CSV.
3. Haz clic en el icono de 'Modelo' (el tercero) y observa la tabla ventas como una caja sola (todavía sin relaciones).
4. Vuelve a la vista Informe -- es donde vas a trabajar la mayor parte del curso.
</Concepto>

<LecturaTask
  id="la-interfaz-de-power-bi"
  pregunta={"¿En qué vista ves los datos como una grilla de filas y columnas, tal como en el CSV original?"}
  respuesta={"En la vista Datos."}
/>
```

`content/casos/clases-de-power-bi/misiones/04-que-es-power-query.mdx`:
~~~~mdx
---
titulo: "Qué es Power Query"
tiempo: 7
---

<Concepto>
Power Query es el motor de Power BI para limpiar y transformar datos antes de que lleguen al modelo.

Cada paso que aplicas (quitar una columna, cambiar un tipo de dato, filtrar filas) queda registrado como un paso reproducible.

**El lenguaje M.** Detras de cada transformación que haces con clics, Power Query genera código en un lenguaje llamado M. No hace falta escribirlo a mano para este curso -- el editor visual genera el M por ti. Ejemplo de cómo se ve un paso de M (filtrar una columna), aunque en este curso lo vas a hacer siempre con clics:

```text
= Table.SelectRows(ventas, each [region] = "norte")
```

**Por que transformar antes de cargar.** Corregir tipos de dato, quitar columnas que no sirven o filtrar filas irrelevantes en Power Query es mucho más liviano que hacerlo después con fórmulas DAX -- y mantiene el modelo final limpio.
</Concepto>

<LecturaTask
  id="que-es-power-query"
  pregunta={"¿Qué preferirías: corregir un error de tipeo en los datos antes de cargarlos a Power BI, o después con una fórmula? ¿Por qué?"}
  respuesta={"Siempre conviene corregirlo antes, en Power Query -- así el error no se arrastra a cada medida o visual que use esa columna, y el problema se resuelve una sola vez en el origen."}
/>
~~~~

`content/casos/clases-de-power-bi/misiones/05-transformar-datos.mdx`:
```mdx
---
titulo: "Transformar datos"
tiempo: 12
---

<Concepto>
En esta lección cargas una segunda tabla, productos, y le aplicas transformaciones básicas en el Editor de Power Query.

Vas a practicar tres transformaciones muy comunes: cambiar tipos de dato, quitar una columna y filtrar filas.

**El Editor de Power Query.** Se abre desde la pestaña Inicio con el botón 'Transformar datos'. Cada transformación que aplicas queda listada en el panel 'Pasos aplicados', a la derecha -- puedes deshacer cualquier paso haciendo clic en la cruz. Los tipos de dato se cambian haciendo clic en el icono a la izquierda del nombre de cada columna (ABC para texto, 1.2 para decimal, etc.).

**Práctica.** Carga productos.csv en el Editor de Power Query y aplica los pasos indicados antes de confirmar cuántas filas quedan. Los datos están en [productos.csv](/casos/clases-de-power-bi/datos/productos.csv), también en «Datos del caso» de estas clases.

1. Descarga el dataset productos.csv de esta lección.
2. En Power BI Desktop, ve a Inicio > Obtener datos > Texto/CSV y carga productos.csv, pero en vez de 'Cargar' haz clic en 'Transformar datos' para abrir el Editor de Power Query.
3. Verifica que la columna precio_unitario tenga el tipo 'Número entero' o 'Decimal' -- si aparece como texto (ABC), haz clic en el icono de tipo y cambiala a 'Número decimal'.
4. Prueba quitar una columna haciendo clic derecho en su encabezado y eligiendo 'Quitar', y después deshace ese paso desde el panel 'Pasos aplicados' para no perder columnas necesarias.
5. Usa la flecha del encabezado de categoria para filtrar y dejar solo la categoria 'Tecnologia'.
6. Haz clic en 'Cerrar y aplicar' en la pestaña Inicio del editor para cargar la tabla transformada al modelo.
</Concepto>

<LecturaTask
  id="transformar-datos"
  pregunta={"Después de filtrar por categoria = Tecnologia, ¿cuántas filas quedan en productos?"}
  respuesta={"4 filas -- las cuatro filas del CSV tienen categoria Tecnologia, así que el filtro no descarta ninguna."}
/>
```

`content/casos/clases-de-power-bi/misiones/06-combinar-consultas.mdx`:
```mdx
---
titulo: "Combinar consultas"
tiempo: 12
---

<Concepto>
Combinar consultas te deja unir dos tablas relacionadas en una sola, similar a un BUSCARV de Excel pero integrado en Power Query.

Vas a combinar ventas y productos usando la columna en común: producto.

**Combinar vs. Anexar.** 'Combinar consultas' (Merge) agrega columnas de una segunda tabla que coincidan por una clave -- es horizontal, como un BUSCARV. 'Anexar consultas' (Append) apila filas de dos tablas con las mismas columnas -- es vertical, como copiar y pegar filas debajo. En este curso vas a usar Combinar.

**Práctica.** Combina ventas y productos por la columna producto y confirma cuántas filas tiene el resultado.

1. En el Editor de Power Query, con la consulta ventas seleccionada, ve a la pestaña Inicio y haz clic en 'Combinar consultas' > 'Combinar consultas como nuevas'.
2. Selecciona ventas como la primera tabla y productos como la segunda.
3. Haz clic en la columna producto de ambas tablas para marcarlas como la clave de coincidencia.
4. En 'Tipo de combinación' deja seleccionado 'Externa izquierda' (todas las filas de ventas, coincidencias de productos) y haz clic en Aceptar.
5. En la nueva consulta, expande la columna resultante (el icono de flechas dobles) y selecciona categoria y precio_unitario para agregarlas a la tabla.
6. Haz clic en 'Cerrar y aplicar'.
</Concepto>

<LecturaTask
  id="combinar-consultas"
  pregunta={"Con una combinación 'Externa izquierda' de ventas y productos por la columna producto, ¿cuántas filas tiene la tabla resultante?"}
  respuesta={"8 filas -- una por cada fila de ventas, ya que todos los productos vendidos existen en la tabla productos."}
/>
```

`content/casos/clases-de-power-bi/misiones/07-limpiar-datos-reales.mdx`:
```mdx
---
titulo: "Limpiar datos reales"
tiempo: 12
---

<Concepto>
Hasta ahora trabajaste con datasets ya prolijos. En esta lección cargas un archivo real de ventas con tres problemas típicos: texto mal escrito, filas duplicadas y valores vacios.

Estos problemas rara vez vienen solos -- y el orden en que los corregis importa.

**Por que el orden importa.** Si primero buscas duplicados y después normalizas texto, puedes dejar pasar duplicados escondidos por una diferencia de mayúsculas (Norte vs norte). Por eso conviene: primero normalizar texto, después quitar duplicados exactos, y recien al final descartar las filas con datos faltantes que no se pueden corregir.

**Normalizar texto.** En el Editor de Power Query, clic derecho en el encabezado de region > Transformar > 'poner en minúsculas', y clic derecho de nuevo > Transformar > 'Recortar' -- así Norte, NORTE y sur con espacios de más quedan todos como norte o sur.

**Duplicados y valores vacios.** Para los duplicados exactos: seleccionar todas las columnas y usar Inicio > Quitar filas > Quitar duplicados. Para las filas sin monto: hacer clic en la flecha de filtro del encabezado de monto y desmarcar la opcion vacía.

**Práctica.** Limpia ventas_sucio.csv aplicando los 3 pasos en orden y confirma cuántas filas quedan. Los datos están en [ventas_sucio.csv](/casos/clases-de-power-bi/datos/ventas_sucio.csv), también en «Datos del caso» de estas clases.

1. Descarga el dataset ventas_sucio.csv de esta lección.
2. En Power BI Desktop, ve a Inicio > Obtener datos > Texto/CSV, selecciona ventas_sucio.csv y haz clic en 'Transformar datos' para abrir el Editor de Power Query.
3. Clic derecho en el encabezado de region > Transformar > 'poner en minúsculas', y clic derecho de nuevo > Transformar > 'Recortar'.
4. Selecciona todas las columnas (clic en la primera columna y Shift+clic en la última) y ve a Inicio > Quitar filas > Quitar duplicados.
5. En el encabezado de monto, haz clic en la flecha de filtro y desmarca la opcion vacía para quitar las filas sin monto.
6. Haz clic en 'Cerrar y aplicar' y confirma en el panel Datos cuántas filas quedaron cargadas.
</Concepto>

<LecturaTask
  id="limpiar-datos-reales"
  pregunta={"¿Cuántas filas crudas tiene ventas_sucio.csv antes de limpiar, y cuántas quedan después de normalizar texto, quitar duplicados y quitar filas con monto vacío?"}
  respuesta={"24 filas crudas, 20 después de limpiar -- se van 2 filas duplicadas exactas y 2 filas sin monto."}
/>
```

`content/casos/clases-de-power-bi/misiones/08-vista-de-modelo.mdx`:
```mdx
---
titulo: "La vista de Modelo"
tiempo: 8
---

<Concepto>
La vista Modelo muestra todas las tablas cargadas como cajas, con sus columnas listadas adentro.

Con ventas y productos ya cargadas, es el momento de mirarlas juntas por primera vez.

**Que mirar en la vista Modelo.** Cada tabla aparece como una caja con su nombre arriba y la lista de columnas debajo. Si dos tablas comparten una columna con el mismo significado (como producto), Power BI a veces detecta la relación automáticamente y dibuja una línea entre ambas cajas. Si no la detecta, hay que crearla a mano -- eso es lo que vas a hacer en la próxima lección.

**Práctica.** Explora la vista Modelo con ventas y productos cargadas y confirma que columna en común las conecta.

1. Con ventas y productos cargadas como tablas separadas (sin la combinación de la lección anterior, o cargando productos.csv de nuevo como tabla independiente), ve a la vista Modelo.
2. Observa si Power BI ya dibujo una línea conectando ambas tablas por la columna producto.
3. Haz clic sobre la tabla ventas y arrastrala para reacomodar el lienzo -- es solo organizacion visual, no afecta los datos.
4. Haz doble clic en la línea de relación (si existe) para ver que columnas conecta.
</Concepto>

<LecturaTask
  id="vista-de-modelo"
  pregunta={"¿Qué columna en común comparten las tablas ventas y productos, la que permite relacionarlas?"}
  respuesta={"La columna producto."}
/>
```

`content/casos/clases-de-power-bi/misiones/09-crear-relaciones.mdx`:
```mdx
---
titulo: "Crear relaciones"
tiempo: 10
---

<Concepto>
Si Power BI no detecto la relación automáticamente (o si la borraste para practicar), se crea a mano arrastrando una columna sobre la otra.

Una relación bien definida es lo que le permite a una medida de ventas 'saber' a que categoria de producto pertenece cada fila.

**Crear una relación manualmente.** En la vista Modelo, se arrastra la columna producto de la tabla ventas hacia la columna producto de la tabla productos. Power BI abre un dialogo de confirmación con el tipo de relación detectado. También se puede crear desde la pestaña Modelado > 'Administrar relaciones' > 'Nueva'.

**Práctica.** Crea la relación entre productos y ventas y después confirma cuál es la tabla del lado 'uno'.

1. En la vista Modelo, si no existe una línea entre ventas y productos, arrastra la columna producto de ventas hasta la columna producto de productos.
2. En el dialogo que aparece, confirma que la relación sea 'Uno a varios' desde productos hacia ventas, y haz clic en Aceptar.
3. Verifica que ahora aparezca una línea conectando ambas tablas en el lienzo.
4. Ve a la vista Informe y arrastra categoria (de productos) junto a monto (de ventas) a una tabla nueva -- si la relación funciona, vas a ver el monto total agrupado por categoria.
</Concepto>

<LecturaTask
  id="crear-relaciones"
  pregunta={"¿Cuál es la tabla 'del lado uno' de la relación entre productos y ventas (la que tiene un valor único por producto)?"}
  respuesta={"productos -- cada producto aparece una sola vez ahí, mientras que en ventas puede repetirse en varias filas."}
/>
```

`content/casos/clases-de-power-bi/misiones/10-cardinalidad-y-direccion-del-filtro.mdx`:
```mdx
---
titulo: "Cardinalidad y dirección del filtro"
tiempo: 9
---

<Concepto>
Cardinalidad y dirección del filtro son los dos conceptos que definen cómo 'viaja' un filtro de una tabla a otra a traves de una relación.

Son conceptos, no pasos de clic -- pero son la base para entender por que una medida da el resultado que da.

**Cardinalidad: uno a varios.** La relación entre productos y ventas es 'uno a varios': un producto en la tabla productos puede aparecer en muchas filas de ventas, pero cada fila de ventas apunta a un solo producto. Es la cardinalidad más común y la que Power BI detecta o sugiere por defecto en la mayoría de los modelos bien disenados.

**Dirección del filtro.** Por defecto, el filtro viaja del lado 'uno' (productos) hacia el lado 'varios' (ventas): si filtras por categoria en productos, ese filtro se propaga y afecta el monto sumado en ventas. El filtro no viaja al reves a menos que se configure explícitamente como 'ambas direcciones' -- algo que se usa poco y con cuidado, porque puede generar ambigüedad en modelos con más de dos tablas.
</Concepto>

<LecturaTask
  id="cardinalidad-y-direccion-del-filtro"
  pregunta={"Si filtras la tabla ventas por región = 'norte', ¿ese filtro afecta lo que ves en la tabla productos? ¿Por qué sí o por qué no?"}
  respuesta={"No, por defecto no afecta -- el filtro solo viaja del lado 'uno' (productos) hacia el lado 'varios' (ventas), nunca al reves, a menos que la relación se configure manualmente como bidireccional."}
/>
```

`content/casos/clases-de-power-bi/misiones/11-modelo-estrella.mdx`:
```mdx
---
titulo: "Modelo estrella: hechos y dimensiones"
tiempo: 8
---

<Concepto>
Un modelo estrella organiza las tablas en dos roles claros: una tabla de hechos (los eventos que se miden, como cada venta) y una o más tablas de dimensión (el contexto que describe esos eventos, como el producto).

Ya armaste esto sin darte cuenta: ventas es la tabla de hechos, y productos es una tabla de dimensión.

**Tabla de hechos: lo que se mide.** ventas es la tabla de hechos: cada fila es un evento (una venta), con una columna numérica que se puede sumar o promediar (monto) y una columna que la conecta a la dimensión (producto).

**Tabla de dimensión: el contexto.** productos es una tabla de dimensión: describe el producto (categoria, precio_unitario, stock) sin repetir esos datos en cada fila de ventas. Una dimensión tiene un valor único por fila -- por eso es el lado 'uno' de la relación.

**Por que no conviene una sola tabla gigante.** Si categoria y precio_unitario estuvieran copiados en cada fila de ventas, cualquier cambio de precio obligaría a actualizar filas repetidas, y el archivo pesaría más de lo necesario. Separar hechos de dimensiones evita esa repetición.
</Concepto>

<LecturaTask
  id="modelo-estrella"
  pregunta={"Si agregaras una tabla vendedores con nombre y region de cada vendedor, ¿sería una tabla de hechos o de dimensión?"}
  respuesta={"De dimensión -- describe el contexto (quién hizo la venta) sin una columna que tenga sentido sumar, y cada vendedor aparece una sola vez en esa tabla, igual que productos."}
/>
```

`content/casos/clases-de-power-bi/misiones/12-tabla-de-calendario.mdx`:
~~~~mdx
---
titulo: "Tabla de calendario"
tiempo: 10
---

<Concepto>
Una tabla de fechas (o calendario) es una dimensión especial: en vez de describir productos o clientes, describe el tiempo. Sin ella, funciones de inteligencia de tiempo como TOTALYTD no tienen de donde tomar un rango continuo de fechas.

En esta lección creas una tabla de calendario y la conectas a ventas_sucio, ya limpia desde el modulo anterior.

**Por que no alcanza con la columna fecha de ventas.** La columna fecha de ventas_sucio solo tiene los días en que hubo una venta -- si un día no vendiste nada, ese día no existe en la tabla. TOTALYTD necesita recorrer todos los días del rango, incluso los que no tuvieron ventas, para acumular correctamente.

**Crear la tabla con CALENDAR.** En el panel Datos, botón 'Nueva tabla' (pestaña Modelado), y escribe una fórmula DAX con CALENDAR indicando un rango explicito de fechas -- no CALENDARAUTO, que toma el rango de todas las columnas de fecha del modelo (incluida ventas, de marzo) y podría darte un resultado distinto según que otras tablas tengas cargadas.

```text
Calendario = CALENDAR(DATE(2026,1,1), DATE(2026,5,31))
```

**Marcarla como tabla de fechas.** Con Calendario seleccionada en el panel Datos, pestaña 'Herramientas de tabla' > 'Marcar como tabla de fechas' > elegir la columna Date. Esto le avisa a Power BI que esta tabla es la que deben usar las funciones de inteligencia de tiempo. Por último, en la vista Modelo, arrastra Date (de Calendario) hasta fecha (de ventas_sucio) para crear la relación.

**Práctica.** Crea la tabla Calendario con el rango exacto indicado y confirma cuántas filas tiene.

1. Con ventas_sucio ya limpia y cargada, ve al panel Datos y haz clic en 'Nueva tabla' (pestaña Modelado).
2. Escribe la fórmula: Calendario = CALENDAR(DATE(2026,1,1), DATE(2026,5,31))
3. Presiona Enter -- la tabla Calendario aparece en el panel Datos con una sola columna Date.
4. Con Calendario seleccionada, ve a 'Herramientas de tabla' > 'Marcar como tabla de fechas' y confirma la columna Date.
5. En la vista Modelo, arrastra Date (de Calendario) hasta fecha (de ventas_sucio) para crear la relación.
</Concepto>

<LecturaTask
  id="tabla-de-calendario"
  pregunta={"¿Cuántas filas tiene la tabla Calendario generada con CALENDAR(DATE(2026,1,1), DATE(2026,5,31))?"}
  respuesta={"151 filas -- una por cada día entre el 1 de enero y el 31 de mayo de 2026 inclusive (31+28+31+30+31 días; 2026 no es bisiesto)."}
/>
~~~~

`content/casos/clases-de-power-bi/misiones/13-medidas-vs-columnas-calculadas.mdx`:
~~~~mdx
---
titulo: "Medidas vs. columnas calculadas"
tiempo: 8
---

<Concepto>
DAX (Data Analysis Expressions) es el lenguaje de fórmulas de Power BI -- se usa tanto en el modelo como en las visualizaciones.

Antes de escribir la primera fórmula, hay que distinguir entre dos formas de usar DAX: medidas y columnas calculadas.

**Columna calculada.** Se calcula fila por fila y el resultado se guarda como una columna más de la tabla, ocupando espacio en el modelo. Se usa para valores que tienen sentido por fila, como concatenar dos columnas de texto.

```text
MargenUnitario = productos[precio_unitario] - productos[costo_unitario]
```

**Medida.** Se calcula al vuelo, en el momento en que se arrastra a un visual, y siempre resume varias filas a la vez (una suma, un promedio, un conteo). No ocupa espacio fijo en el modelo y se recalcula según el contexto del visual donde se usa. La gran mayoría del trabajo en Power BI se hace con medidas, no con columnas calculadas -- son más flexibles y más livianas.

```text
Ventas Totales = SUM(ventas[monto])
```
</Concepto>

<LecturaTask
  id="medidas-vs-columnas-calculadas"
  pregunta={"Si necesitas el total de ventas del mes, sumado y listo para poner en una tarjeta, ¿usarías una medida o una columna calculada?"}
  respuesta={"Una medida -- un total agregado (una suma) es exactamente el caso de uso de una medida, no de una columna calculada, que solo tiene sentido para valores por fila."}
/>
~~~~

`content/casos/clases-de-power-bi/misiones/14-sintaxis-basica-de-dax.mdx`:
~~~~mdx
---
titulo: "Sintaxis básica de DAX"
tiempo: 10
---

<Concepto>
Es momento de escribir tu primera medida DAX real en Power BI Desktop.

La sintaxis básica es siempre: nombre de la medida, signo igual, y la fórmula.

**Crear una medida nueva.** Con la tabla ventas seleccionada en el panel Datos, clic derecho > 'Nueva medida' (o el botón 'Nueva medida' en la pestaña Inicio de la cinta). Se abre la barra de fórmulas donde se escribe el nombre y la expresión.

```text
Ventas Totales = SUM(ventas[monto])
```

**Práctica.** Crea tu primera medida DAX y confirma que valor muestra al arrastrarla a una tarjeta.

1. En el panel Datos, haz clic derecho sobre la tabla ventas y selecciona 'Nueva medida'.
2. En la barra de fórmulas, escribe: Ventas Totales = SUM(ventas[monto])
3. Presiona Enter para confirmar -- la medida aparece en el panel Datos con un icono de calculadora.
4. Arrastra la medida Ventas Totales a un visual de tarjeta en el lienzo para ver el resultado.
</Concepto>

<LecturaTask
  id="sintaxis-basica-de-dax"
  pregunta={"¿Qué valor muestra la tarjeta con la medida Ventas Totales = SUM(ventas[monto]), sumando las 8 filas del dataset ventas.csv?"}
  respuesta={"1.334.000 -- la suma de los 8 montos del dataset: dos ventas de 450.000, dos de 12.000, dos de 25.000 y dos de 180.000."}
/>
~~~~

`content/casos/clases-de-power-bi/misiones/15-funciones-de-agregacion.mdx`:
~~~~mdx
---
titulo: "Funciones de agregación"
tiempo: 10
---

<Concepto>
SUM no es la única función de agregación -- AVERAGE y COUNTROWS son igual de comunes en el día a día de un analista.

En esta lección agregas dos medidas más a la tabla ventas.

**AVERAGE y COUNTROWS.** AVERAGE(columna) calcula el promedio de una columna numérica. COUNTROWS(tabla) cuenta las filas de una tabla, sin necesitar ninguna columna en particular -- útil para saber cuántas transacciones hay.

```text
Venta Promedio = AVERAGE(ventas[monto])
Cantidad de Ventas = COUNTROWS(ventas)
```

**Práctica.** Crea las medidas Venta Promedio y Cantidad de Ventas y confirma cuánto da esta última.

1. En el panel Datos, crea una nueva medida en ventas: Venta Promedio = AVERAGE(ventas[monto])
2. Crea una segunda medida: Cantidad de Ventas = COUNTROWS(ventas)
3. Arrastra ambas medidas junto con Ventas Totales a tres tarjetas distintas en el lienzo.
4. Compara los tres valores: el total, el promedio y la cantidad de filas.
</Concepto>

<LecturaTask
  id="funciones-de-agregacion"
  pregunta={"Con las 8 filas de ventas.csv, ¿cuánto da la medida Cantidad de Ventas = COUNTROWS(ventas)?"}
  respuesta={"8."}
/>
~~~~

`content/casos/clases-de-power-bi/misiones/16-formato-de-una-medida.mdx`:
```mdx
---
titulo: "Formato de una medida"
tiempo: 6
---

<Concepto>
Una medida que suma dinero debería mostrarse como moneda, no como un número plano -- eso se controla desde el panel de formato de medida, sin tocar la fórmula.

Es un paso pequeno pero que cambia mucho la legibilidad de un reporte.

**Formato desde la cinta.** Al seleccionar una medida en el panel Datos, la pestaña 'Herramientas de medida' aparece en la cinta de opciones, con un menu desplegable de formato (General, Moneda, Porcentaje, etc.) y control de decimales.

**Práctica.** Aplica formato de moneda a la medida Ventas Totales y confirma en que pestaña de la cinta se controla.

1. En el panel Datos, selecciona la medida Ventas Totales.
2. En la cinta de opciones, ve a la pestaña 'Herramientas de medida' y en el menu de formato elige 'Moneda'.
3. Reduce los decimales a 0 usando el botón de disminuir decimales.
4. Verifica en la tarjeta del lienzo que el valor ahora se muestre con el simbolo de moneda.
</Concepto>

<LecturaTask
  id="formato-de-una-medida"
  pregunta={"¿Qué pestaña de la cinta de opciones aparece solo cuando seleccionas una medida en el panel Datos?"}
  respuesta={"'Herramientas de medida'."}
/>
```

`content/casos/clases-de-power-bi/misiones/17-calculate-y-contexto.mdx`:
~~~~mdx
---
titulo: "CALCULATE y el contexto"
tiempo: 12
---

<Concepto>
CALCULATE es la función más importante de DAX: toma una medida y le cambia el contexto de filtro.

En esta lección la usas para calcular las ventas de una sola region, sin tocar el visual.

**Modificar el contexto con CALCULATE.** CALCULATE(expresión, filtro1, filtro2, ...) evalúa la expresión (normalmente otra medida) pero reemplazando o agregando los filtros indicados. Es la única forma en DAX de decir 'quiero este cálculo, pero ignorando o forzando tal condición'.

```text
Ventas Norte = CALCULATE(SUM(ventas[monto]), ventas[region] = "norte")
```

**Práctica.** Crea la medida Ventas Norte con CALCULATE y confirma cuánto da comparado con Ventas Totales.

1. Crea una nueva medida en ventas: Ventas Norte = CALCULATE(SUM(ventas[monto]), ventas[region] = "norte")
2. Arrastra la medida a una tarjeta nueva en el lienzo.
3. Compara el valor contra la tarjeta de Ventas Totales -- Ventas Norte debería ser un subconjunto, nunca mayor.
</Concepto>

<LecturaTask
  id="calculate-y-contexto"
  pregunta={"¿Cuánto da Ventas Norte, sumando solo las filas de ventas.csv donde region es 'norte'?"}
  respuesta={"679.000 -- las filas con region norte son 450000, 12000, 12000, 25000 y 180000."}
/>
~~~~

`content/casos/clases-de-power-bi/misiones/18-variables-en-dax.mdx`:
~~~~mdx
---
titulo: "Variables en DAX (VAR y RETURN)"
tiempo: 10
---

<Concepto>
A medida que una medida DAX crece, repetir la misma subexpresión varias veces la hace más difícil de leer y más lenta de calcular. VAR guarda un resultado intermedio con un nombre, y RETURN indica que expresión final devolver.

En esta lección reescribis una medida que compara ventas de una region contra el total, usando VAR en vez de repetir CALCULATE.

**La sintaxis de VAR y RETURN.** Una medida con variables sigue el patrón: una o más líneas VAR nombre = expresión, seguidas de una línea RETURN con la expresión final, que puede usar esos nombres como si fueran medidas.

```text
% Ventas Norte =
VAR VentasNorte = CALCULATE(SUM(ventas[monto]), ventas[region] = "norte")
VAR VentasTotal = SUM(ventas[monto])
RETURN DIVIDE(VentasNorte, VentasTotal)
```

**De paso, DIVIDE en vez de /.** DIVIDE(numerador, denominador) hace lo mismo que numerador/denominador, pero devuelve un resultado en blanco en vez de un error cuando el denominador es cero -- una medida que puede terminar dividiendo por cero (por ejemplo, filtrada a una region sin ventas) no debería romper el reporte.

**Práctica.** Crea la medida % Ventas Norte con VAR y RETURN, y confirma que porcentaje muestra.

1. En el panel Datos, crea una nueva medida en ventas.
2. Escribe la fórmula completa en la barra de fórmulas: % Ventas Norte =
VAR VentasNorte = CALCULATE(SUM(ventas[monto]), ventas[region] = "norte")
VAR VentasTotal = SUM(ventas[monto])
RETURN DIVIDE(VentasNorte, VentasTotal)
3. Presiona Enter y arrastra la medida a una tarjeta -- aplica formato de porcentaje desde 'Herramientas de medida' si no aparece automáticamente.
4. Compara el resultado contra Ventas Norte y Ventas Totales, dos medidas que ya tienes de modulos anteriores.
</Concepto>

<LecturaTask
  id="variables-en-dax"
  pregunta={"¿Cuánto muestra la medida % Ventas Norte sobre el dataset ventas.csv original?"}
  respuesta={"Aproximadamente 50,9% -- 679.000 (Ventas Norte) dividido 1.334.000 (Ventas Totales)."}
/>
~~~~

`content/casos/clases-de-power-bi/misiones/19-contexto-de-fila-vs-contexto-de-filtro.mdx`:
```mdx
---
titulo: "Contexto de fila vs. contexto de filtro"
tiempo: 12
---

<Concepto>
Es, según el syllabus, la parte conceptualmente más difícil de DAX -- y la razón por la que CALCULATE se comporta como se comporta.

No hay pasos de clic en esta lección: es pura teoría, para leer con calma.

**Contexto de fila.** Existe cuando DAX evalúa una fórmula fila por fila -- típicamente dentro de una columna calculada, o dentro de funciones iterator como SUMX. En ese momento, cada columna de la fila actual tiene un valor concreto y accesible.

**Contexto de filtro.** Es el conjunto de filtros activos en el momento de evaluar una medida -- vienen de los visuales (filas de una tabla, un slicer, un filtro de página) o de un CALCULATE que los modifica explícitamente. Una medida como SUM(ventas[monto]) siempre se evalúa dentro de un contexto de filtro: en una tarjeta sin filtros, suma todo; dentro de una tabla con la columna region, se recalcula fila por fila de la tabla, cada vez con region filtrada a un solo valor.
</Concepto>

<LecturaTask
  id="contexto-de-fila-vs-contexto-de-filtro"
  pregunta={"Si arrastras la medida Ventas Totales a una tabla visual junto con la columna region, ¿el resultado por fila es siempre el mismo número (el total general) o cambia según la region de esa fila?"}
  respuesta={"Cambia según la region de esa fila -- cada fila de la tabla visual le agrega un filtro implicito por region al contexto de filtro, así que SUM(ventas[monto]) se recalcula solo con las filas de esa region."}
/>
```

`content/casos/clases-de-power-bi/misiones/20-funciones-iteradoras-sumx-averagex.mdx`:
~~~~mdx
---
titulo: "Funciones iteradoras: SUMX y AVERAGEX"
tiempo: 12
---

<Concepto>
SUM y AVERAGE agregan una columna directo. Un iterador como SUMX o AVERAGEX recorre la tabla fila por fila, calcula una expresión en cada una, y recien al final suma o promedia esos resultados -- es la única forma de calcular algo que no existe como columna propia, como un margen.

En esta lección agregas costo_unitario a productos y calculas el margen total de todas las ventas con SUMX.

**Por que hace falta un iterador aca.** El margen (precio_unitario menos costo_unitario) vive en productos, pero cada venta está en ventas. No existe una columna 'margen de esta venta' -- hay que calcularla fila por fila, y ahí es donde entra SUMX.

**SUMX con RELATED.** SUMX(tabla, expresión) recorre tabla fila por fila y evalúa expresión en cada una. RELATED trae una columna de la tabla del lado 'uno' de una relación (productos) hacia la tabla del lado 'varios' (ventas).

```text
Margen Total = SUMX(ventas, RELATED(productos[precio_unitario]) - RELATED(productos[costo_unitario]))
```

**AVERAGEX para el promedio.** AVERAGEX funciona igual que SUMX pero promedia en vez de sumar -- útil para saber el margen promedio por venta, no el total.

```text
Margen Promedio = AVERAGEX(ventas, RELATED(productos[precio_unitario]) - RELATED(productos[costo_unitario]))
```

**Práctica.** Agrega costo_unitario a productos, crea Margen Total con SUMX y confirma cuánto da. Los datos están en [productos.csv](/casos/clases-de-power-bi/datos/productos.csv), también en «Datos del caso» de estas clases.

1. Elimina la tabla productos actual: clic derecho sobre productos en el panel Datos > 'Eliminar del modelo'.
2. Descarga productos.csv (versión actualizada, con la columna costo_unitario) desde esta lección y cargala igual que en el modulo de Power Query.
3. En la vista Modelo, vuelve a crear la relación entre ventas y productos por la columna producto.
4. Crea una medida nueva en ventas: Margen Total = SUMX(ventas, RELATED(productos[precio_unitario]) - RELATED(productos[costo_unitario]))
5. Arrastra Margen Total a una tarjeta y confirma el valor.
6. Opcional: crea Margen Promedio = AVERAGEX(ventas, RELATED(productos[precio_unitario]) - RELATED(productos[costo_unitario])) y compara los dos valores.
</Concepto>

<LecturaTask
  id="funciones-iteradoras-sumx-averagex"
  pregunta={"¿Cuánto da Margen Total sobre las 8 filas de ventas.csv, con el costo_unitario nuevo de productos.csv?"}
  respuesta={"270.000 -- margen unitario de 70.000 (Notebook), 5.000 (Mouse), 10.000 (Teclado) y 50.000 (Monitor), cada uno multiplicado por sus 2 apariciones en ventas.csv."}
/>
~~~~

`content/casos/clases-de-power-bi/misiones/21-funciones-de-tiempo-basicas.mdx`:
~~~~mdx
---
titulo: "Funciones de tiempo básicas"
tiempo: 9
---

<Concepto>
Las funciones de inteligencia de tiempo de DAX (como TOTALYTD o SAMEPERIODLASTYEAR) necesitan una tabla de fechas marcada como tal -- pero antes de llegar ahí, hay funciones simples para extraer partes de una fecha.

En esta lección usas MONTH y YEAR para agrupar ventas por mes.

**Extraer partes de una fecha.** MONTH(fecha) devuelve el número de mes (1-12); YEAR(fecha) devuelve el ano. Se pueden usar dentro de una columna calculada para crear una etiqueta de agrupación.

```text
Mes de Venta = MONTH(ventas[fecha])
```

**Práctica.** Crea una columna calculada con MONTH y confirma que número de mes devuelve para las fechas de este dataset.

1. En el panel Datos, con la tabla ventas seleccionada, crea una columna calculada nueva (clic derecho > 'Nueva columna', no medida): Mes de Venta = MONTH(ventas[fecha])
2. Verifica en la vista Datos que la nueva columna muestre el número de mes de cada fila.
3. En la vista Informe, arrastra Mes de Venta junto con la medida Ventas Totales a una tabla visual para ver el total agrupado por mes.
</Concepto>

<LecturaTask
  id="funciones-de-tiempo-basicas"
  pregunta={"Con las fechas del dataset ventas.csv (todas de marzo de 2026), ¿qué valor devuelve MONTH(fecha) para cualquier fila?"}
  respuesta={"3 -- todas las fechas del dataset son de marzo."}
/>
~~~~

`content/casos/clases-de-power-bi/misiones/22-inteligencia-de-tiempo-real.mdx`:
~~~~mdx
---
titulo: "Inteligencia de tiempo real"
tiempo: 12
---

<Concepto>
Con la tabla Calendario ya relacionada a ventas_sucio, puedes usar las funciones de inteligencia de tiempo de DAX de verdad: acumulados del ano y comparaciones contra el periodo anterior.

Una función que vas a encontrar en cualquier tutorial de Power BI, SAMEPERIODLASTYEAR, no se practica en esta lección a proposito: necesita datos de dos anos distintos para comparar, y este dataset cubre solo 2026.

**TOTALYTD: acumulado del ano.** TOTALYTD(expresión, columna_fecha) acumula la expresión desde el primer día del ano hasta la fecha de cada fila del contexto -- usa la columna Date de la tabla Calendario, no la fecha de ventas_sucio.

```text
Ventas Acumuladas = TOTALYTD(SUM(ventas_sucio[monto]), Calendario[Date])
```

**DATEADD: comparar contra el periodo anterior.** DATEADD(columna_fecha, -1, MONTH) desplaza el contexto de fecha un mes hacia atras -- combinado con CALCULATE, sirve para comparar el mes actual contra el anterior.

```text
Ventas Mes Anterior = CALCULATE(SUM(ventas_sucio[monto]), DATEADD(Calendario[Date], -1, MONTH))
```

**Práctica.** Crea las medidas Ventas Acumuladas y Ventas Mes Anterior y confirma sus valores para abril y mayo.

1. Crea una medida en ventas_sucio: Ventas Acumuladas = TOTALYTD(SUM(ventas_sucio[monto]), Calendario[Date])
2. Crea una segunda medida: Ventas Mes Anterior = CALCULATE(SUM(ventas_sucio[monto]), DATEADD(Calendario[Date], -1, MONTH))
3. Arrastra la columna Date de Calendario (o el mes extraido con MONTH) junto con Ventas Acumuladas a una tabla visual, y confirma el acumulado a fines de abril.
4. Agrega Ventas Mes Anterior a la misma tabla y compara mayo contra el mes anterior (abril).
</Concepto>

<LecturaTask
  id="inteligencia-de-tiempo-real"
  pregunta={"¿Cuánto da Ventas Acumuladas al 30 de abril de 2026, y cuál es la diferencia entre mayo y el mes anterior según Ventas Mes Anterior?"}
  respuesta={"Acumulado a fin de abril: 2.488.000 (enero + febrero + abril). Mayo (847.000) contra el mes anterior, abril (692.000): una diferencia de +155.000."}
/>
~~~~

`content/casos/clases-de-power-bi/misiones/23-tipos-de-grafico.mdx`:
```mdx
---
titulo: "Tipos de gráfico"
tiempo: 11
---

<Concepto>
Power BI ofrece más de 30 tipos de visual, pero un punado cubre la gran mayoría de los reportes de negocio.

En esta lección probas tres de los más usados con los mismos datos, para comparar cuando conviene cada uno.

**Cuando usar cada tipo.** Gráfico de barras/columnas: comparar una métrica entre categorías (ventas por producto). Gráfico de líneas: mostrar una tendencia en el tiempo (ventas por fecha). Gráfico circular (pie/dona): mostrar una proporción de un total entre pocas categorías -- se usa con moderación, porque es difícil de leer con más de 4 o 5 porciones.

**Práctica.** Crea los tres gráficos indicados y confirma cuál producto tiene la barra más alta.

1. En el panel de Visualizaciones, crea un gráfico de columnas con producto en el eje y Ventas Totales como valor.
2. Crea un gráfico de líneas con fecha en el eje y Ventas Totales como valor.
3. Crea un gráfico circular con region como categoria y Ventas Totales como valor.
4. Compara los tres: cuál te muestra mejor que producto vende más? Cual te muestra mejor la evolución en el tiempo?
</Concepto>

<LecturaTask
  id="tipos-de-grafico"
  pregunta={"¿Qué producto tiene la barra más alta en el gráfico de columnas por producto y Ventas Totales?"}
  respuesta={"Notebook -- aparece dos veces en el dataset con 450.000 cada vez, sumando 900.000, el total más alto entre todos los productos."}
/>
```

`content/casos/clases-de-power-bi/misiones/24-tarjetas-y-tablas.mdx`:
```mdx
---
titulo: "Tarjetas y tablas"
tiempo: 10
---

<Concepto>
Las tarjetas muestran un solo número grande -- perfectas para KPIs. Las tablas y matrices muestran el detalle fila por fila.

En esta lección combinas ambas en un mismo lienzo.

**Tarjeta vs. Tabla vs. Matriz.** Tarjeta: un único valor, sin desglose -- ideal para 'Ventas Totales' arriba de todo el reporte. Tabla: filas y columnas planas, como una grilla de Excel. Matriz: como una tabla, pero permite agrupar filas y columnas con jerarquías (por ejemplo, region y dentro de cada region, producto), con totales automáticos.

**Práctica.** Arma una matriz con region en filas y Ventas Totales como valor, y confirma que region tiene el total más alto.

1. Agrega una tarjeta con la medida Ventas Totales en la parte superior del lienzo.
2. Debajo, agrega una tabla con las columnas producto, region y monto.
3. Reemplaza esa tabla por una matriz: en filas pon region, en columnas producto, y como valor Ventas Totales.
4. Observa como la matriz agrega totales por fila y columna automáticamente.
</Concepto>

<LecturaTask
  id="tarjetas-y-tablas"
  pregunta={"En una matriz con region en filas y Ventas Totales como valor, ¿qué fila muestra el total más alto: norte o sur?"}
  respuesta={"norte, con 679.000 contra 655.000 de sur."}
/>
```

`content/casos/clases-de-power-bi/misiones/25-formato-condicional.mdx`:
```mdx
---
titulo: "Formato condicional"
tiempo: 8
---

<Concepto>
El formato condicional resalta valores según una regla -- por ejemplo, colorear de rojo las ventas por debajo de un umbral.

Se configura sin escribir DAX, desde el panel de formato del visual.

**Configurar reglas de color.** En una tabla o matriz, selecciona la columna de valores, ve al panel de formato > 'Formato condicional' > 'Escala de colores' (o 'Reglas') y define los umbrales.

**Práctica.** Aplica una escala de colores sobre Ventas Totales por producto y confirma que producto queda con el color del extremo máximo.

1. Selecciona la tabla o matriz que creaste en la lección anterior.
2. En el panel de formato del visual, busca la sección 'Formato condicional' sobre la columna de Ventas Totales.
3. Activa 'Escala de colores' y confirma los valores mínimo y máximo por defecto.
4. Observa como las celdas con montos más altos se colorean distinto a las de montos más bajos.
</Concepto>

<LecturaTask
  id="formato-condicional"
  pregunta={"Con una escala de colores de mínimo a máximo aplicada sobre Ventas Totales por producto, ¿qué producto va a tener el color del extremo 'máximo'?"}
  respuesta={"Notebook, porque es el producto con el monto total más alto (900.000)."}
/>
```

`content/casos/clases-de-power-bi/misiones/26-tooltips.mdx`:
```mdx
---
titulo: "Tooltips"
tiempo: 7
---

<Concepto>
Un tooltip es la ventana que aparece al pasar el mouse sobre un punto de un gráfico -- por defecto muestra la categoria y el valor, pero se puede enriquecer con más campos.

En esta lección agregas un campo extra al tooltip de un gráfico existente.

**Agregar campos al tooltip.** En el panel de Visualizaciones, dentro del 'pozo' (well) de campos del visual, existe una sección 'Información sobre herramientas' (Tooltips) donde se pueden arrastrar columnas o medidas adicionales.

**Práctica.** Agrega Cantidad de Ventas al tooltip del gráfico de columnas y confirma en que sección del panel se hace.

1. Selecciona el gráfico de columnas por producto que creaste antes.
2. En el panel de campos del visual, busca la sección 'Información sobre herramientas' (Tooltips).
3. Arrastra la medida Cantidad de Ventas a esa sección.
4. Pasa el mouse sobre una de las columnas del gráfico y verifica que el tooltip ahora muestre también la cantidad de ventas, no solo el monto.
</Concepto>

<LecturaTask
  id="tooltips"
  pregunta={"¿En qué sección del panel de campos de un visual se agregan columnas o medidas extra para enriquecer el tooltip?"}
  respuesta={"En la sección 'Información sobre herramientas' (Tooltips)."}
/>
```

`content/casos/clases-de-power-bi/misiones/27-slicers.mdx`:
```mdx
---
titulo: "Slicers"
tiempo: 9
---

<Concepto>
Un slicer es un filtro visual que el usuario del reporte puede manipular directamente -- un botón, una lista o un rango, sin tocar el modelo.

En esta lección agregas un slicer de region a tu reporte.

**Agregar un slicer.** En el panel de Visualizaciones, elige el icono de 'Segmentación de datos' (Slicer) y arrastra la columna region al campo del visual. Por defecto aparece como una lista con casillas de verificación.

**Práctica.** Agrega un slicer de region y confirma que valor muestra Ventas Totales al seleccionar 'norte'.

1. En el lienzo, agrega un nuevo visual de tipo 'Segmentación de datos' (Slicer).
2. Arrastra la columna region al campo de valores del slicer.
3. Haz clic en 'norte' dentro del slicer y observa como se actualizan la tarjeta de Ventas Totales y el gráfico de columnas.
4. Haz clic de nuevo en 'norte' para deseleccionarlo y volver a ver todos los datos.
</Concepto>

<LecturaTask
  id="slicers"
  pregunta={"Al seleccionar 'norte' en un slicer de region, ¿qué valor muestra la tarjeta de Ventas Totales?"}
  respuesta={"679.000 -- el mismo valor que la medida Ventas Norte calculada con CALCULATE en el modulo 5."}
/>
```

`content/casos/clases-de-power-bi/misiones/28-cross-filtering.mdx`:
```mdx
---
titulo: "Cross-filtering"
tiempo: 10
---

<Concepto>
El cross-filtering (filtrado cruzado) es lo que pasa cuando haces clic sobre un elemento de un visual y automáticamente se filtran los demas visuales del mismo lienzo -- ocurre por defecto, sin configurar nada.

En esta lección lo observas en acción y aprendes a ajustar su comportamiento.

**Cómo funciona por defecto.** Al hacer clic en una barra o porción de un gráfico, Power BI resalta o filtra los demas visuales que comparten alguna relación con esos datos -- es la interactividad 'gratis' que viene incluida en cualquier reporte. Se puede ajustar visual por visual desde Formato > 'Editar interacciones', eligiendo si un visual filtra, resalta o no afecta a otro.

**Práctica.** Configura 'Editar interacciones' para que la tarjeta deje de reaccionar a los clics del gráfico y confirma el resultado.

1. Haz clic en la barra 'Notebook' del gráfico de columnas por producto.
2. Observa como la tarjeta de Ventas Totales y la tabla/matriz se actualizan para reflejar solo las filas de Notebook.
3. Ve a la pestaña Formato > 'Editar interacciones' y selecciona el gráfico de columnas como origen.
4. Cambia el icono de interacción sobre la tarjeta de 'Filtrar' a 'Ninguno' y repite el clic en 'Notebook' -- la tarjeta ya no debería cambiar.
</Concepto>

<LecturaTask
  id="cross-filtering"
  pregunta={"Después de configurar 'Editar interacciones' con la tarjeta en 'Ninguno', ¿la tarjeta de Ventas Totales cambia al hacer clic en una barra del gráfico?"}
  respuesta={"No -- al quedar configurada en 'Ninguno', esa tarjeta deja de reaccionar a los clics de ese visual."}
/>
```

`content/casos/clases-de-power-bi/misiones/29-drill-down-y-drill-through.mdx`:
```mdx
---
titulo: "Drill-down y drill-through"
tiempo: 12
---

<Concepto>
Drill-down permite bajar de nivel dentro de una jerarquía en el mismo visual (por ejemplo, de region a producto). Drill-through permite saltar a una página distinta, filtrada por el elemento en el que hiciste clic.

Son dos formas distintas de 'profundizar' en un dato, y en esta lección probas ambas.

**Drill-down.** Se activa arrastrando dos o más campos jerárquicos al eje de un visual (por ejemplo, region y luego producto) y usando las flechas de drill que aparecen en la esquina superior del visual al pasar el mouse.

**Drill-through.** Se configura creando una página nueva y arrastrando un campo (por ejemplo, producto) al pozo 'Drill through' del panel de campos de esa página -- luego, clic derecho sobre un valor de producto en cualquier otro visual muestra la opcion 'Ir a' esa página.

**Práctica.** Configura drill-down y drill-through y confirma la diferencia principal entre ambos.

1. En el gráfico de columnas, arrastra region al eje y luego arrastra producto debajo de region en el mismo campo (para crear una jerarquía).
2. Pasa el mouse sobre el gráfico y haz clic en la flecha doble de 'Bajar un nivel en la jerarquía' para ver el detalle por producto dentro de cada region.
3. Crea una página nueva y arrastra producto al pozo 'Drill through' del panel de campos.
4. Vuelve a la página anterior, haz clic derecho sobre una barra del gráfico y selecciona 'Ir a' > la página nueva para ver el drill-through en acción.
</Concepto>

<LecturaTask
  id="drill-down-y-drill-through"
  pregunta={"¿Qué diferencia principal hay entre drill-down y drill-through?"}
  respuesta={"Drill-down baja de nivel dentro del mismo visual y la misma página; drill-through salta a una página distinta, filtrada por el elemento seleccionado."}
/>
```

`content/casos/clases-de-power-bi/misiones/30-publicar-a-power-bi-service.mdx`:
```mdx
---
titulo: "Publicar a Power BI Service"
tiempo: 9
---

<Concepto>
Publicar sube tu archivo .pbix a Power BI Service, la plataforma en la nube, para que se pueda ver desde el navegador o compartir con otras personas.

Requiere una cuenta gratuita de Power BI (con un correo corporativo o educativo -- las cuentas de correo personal como Gmail no siempre son aceptadas para el plan gratuito).

**El botón Publicar.** En la pestaña Inicio de Power BI Desktop, el botón 'Publicar' sube el reporte al workspace que elijas en Power BI Service -- la primera vez te pide iniciar sesión con una cuenta de Microsoft.

**Práctica.** Publica tu reporte a Power BI Service y confirma que necesitas tener guardado antes de hacerlo.

1. Guarda tu archivo .pbix (Archivo > Guardar) antes de publicar.
2. En la pestaña Inicio, haz clic en 'Publicar'.
3. Inicia sesión con una cuenta de Microsoft si te lo pide (puedes usar una cuenta educativa o crear una gratuita).
4. Elige el workspace 'Mi área de trabajo' (el que viene por defecto) y espera a que termine de subir.
5. Haz clic en el enlace que aparece al finalizar para abrir el reporte en app.powerbi.com.
</Concepto>

<LecturaTask
  id="publicar-a-power-bi-service"
  pregunta={"¿Qué necesitas tener guardado antes de hacer clic en 'Publicar'?"}
  respuesta={"El archivo .pbix -- Publicar sube la última versión guardada del archivo, no cambios sin guardar."}
/>
```

`content/casos/clases-de-power-bi/misiones/31-compartir-y-exportar.mdx`:
```mdx
---
titulo: "Compartir y exportar"
tiempo: 8
---

<Concepto>
Una vez publicado en Power BI Service, hay varias formas de que otras personas vean tu reporte: compartirlo directamente, o exportarlo a PDF/PowerPoint para enviarlo por fuera de Power BI.

En esta lección probas ambos caminos.

**Compartir desde Power BI Service.** Desde app.powerbi.com, el botón 'Compartir' de un reporte permite ingresar el correo de otra persona -- que va a necesitar su propia cuenta de Power BI (con permisos) para verlo.

**Exportar a PDF.** Desde Power BI Desktop, Archivo > Exportar > 'Exportar a PDF' genera un archivo estático con una página por cada página del reporte -- pierde la interactividad, pero se puede enviar a cualquier persona sin cuenta.

**Práctica.** Exporta tu reporte a PDF y confirma que se pierde al hacerlo.

1. Desde app.powerbi.com, abre tu reporte publicado y haz clic en 'Compartir'.
2. Escribe tu propio correo (o el de otra cuenta que tengas) para simular el envio, y luego cancela sin enviarlo si no quieres compartirlo de verdad.
3. Vuelve a Power BI Desktop y ve a Archivo > Exportar > 'Exportar a PDF'.
4. Abre el PDF generado y confirma que se ven las visualizaciones, aunque sin poder interactuar con los slicers.
</Concepto>

<LecturaTask
  id="compartir-y-exportar"
  pregunta={"¿Qué se pierde al exportar un reporte de Power BI a PDF?"}
  respuesta={"La interactividad -- los slicers, el cross-filtering y el drill-down/drill-through dejan de funcionar, porque el PDF es una imagen estática de cada página."}
/>
```

`content/casos/clases-de-power-bi/misiones/32-buenas-practicas-de-diseno.mdx`:
```mdx
---
titulo: "Buenas practicas de diseno"
tiempo: 7
---

<Concepto>
Un reporte técnicamente correcto puede seguir siendo difícil de usar si el diseno no ayuda a encontrar la información rápido.

Estas son algunas practicas simples que marcan una diferencia grande.

**Jerarquía visual.** Los KPIs más importantes (tarjetas) van arriba o a la izquierda, donde el ojo mira primero. Los detalles (tablas) van más abajo, para quien quiera profundizar.

**Menos es más.** Un reporte con 15 gráficos distintos en una sola página es más difícil de leer que uno con 4 o 5 bien elegidos. Cada visual debería responder una pregunta de negocio concreta, no simplemente mostrar todos los datos disponibles. Usar colores con moderación y consistencia (por ejemplo, siempre el mismo color para 'norte' en todos los visuales) ayuda a que el reporte se lea de un vistazo.
</Concepto>

<LecturaTask
  id="buenas-practicas-de-diseno"
  pregunta={"Pensando en el reporte que armaste durante el curso, ¿qué visual sacarías si tuvieras que dejar solo 4?"}
  respuesta={"No hay una única respuesta correcta -- lo importante es identificar cuál de los visuales aporta menos a la pregunta de negocio principal del reporte y estar dispuesto a sacarlo, en vez de acumular visuales solo porque el dato esta disponible."}
/>
```

`content/casos/clases-de-power-bi/misiones/33-power-bi-vs-excel-sql-python.mdx`:
```mdx
---
titulo: "Power BI frente a Excel, SQL y Python"
tiempo: 7
---

<Concepto>
Llegaste al final de la ruta de analista de datos: SQL Aula, Excel Aula, Python y Pandas Aula, y ahora Power BI Aula.

Esta última lección compara las cuatro herramientas para que sepas cuando usar cada una en tu trabajo.

**Cuando usar cada una.** SQL: cuando los datos viven en una base de datos y necesitas extraerlos o combinarlos con precisión -- es el punto de partida de casi cualquier análisis en una empresa con datos bien organizados. Excel: para análisis rapidos, ad-hoc, con datos que caben en una hoja de cálculo y que necesitas compartir con alguien que no tiene otra herramienta instalada. Python y pandas: cuando el análisis necesita lógica más compleja que una fórmula (limpieza de datos pesada, análisis repetible, estadística) o combinar datos de fuentes muy distintas. Power BI: cuando el objetivo final es un reporte visual, interactivo, que otras personas van a consultar de forma recurrente -- no un análisis de una sola vez.

**No son excluyentes.** En un flujo de trabajo real, es común usar las cuatro juntas: SQL para extraer los datos, Python para limpiarlos y transformarlos, y Power BI para publicar el resultado final -- Excel queda como la herramienta rápida para validaciones puntuales.
</Concepto>

<LecturaTask
  id="power-bi-vs-excel-sql-python"
  pregunta={"De las cuatro herramientas de la ruta, ¿cuál sientes que te resultó más natural, y cuál te gustaría seguir practicando?"}
  respuesta={"No hay una respuesta correcta -- el objetivo de esta pregunta es que reflexiones sobre tu propio recorrido y decidas en que herramienta seguir profundizando ahora que completaste las cuatro aulas."}
/>
```

`content/casos/clases-de-power-bi/misiones/34-proyecto-final-dashboard-ventas.mdx`:
```mdx
---
titulo: "Proyecto final: dashboard de ventas"
tiempo: 30
---

<Concepto>
Este es el proyecto final del curso: armar un dashboard completo con lo que ya tienes cargado, combinando ventas y productos en medidas, tablas y un filtro interactivo.

No hay pasos nuevos que aprender -- es integrar en un solo reporte lo que ya practicaste lección por lección.

**Lo que va a tener el dashboard.** Tres medidas (Ventas Totales, Cantidad de Ventas, Ticket Promedio), una tabla de monto por region, una tabla de monto por producto, dos tarjetas y un slicer por region -- todo en una sola página de reporte.

**Práctica.** Arma el dashboard completo y confirma que region vende más y por cuanta diferencia.

1. Si ventas y productos no estan cargadas, cargalas de nuevo desde los archivos que ya descargaste en lecciones anteriores, y confirma que la relación por producto siga activa en la vista Modelo.
2. Crea 3 medidas nuevas: Ventas Totales = SUM(ventas[monto]), Cantidad de Ventas = COUNTROWS(ventas), Ticket Promedio = AVERAGE(ventas[monto]).
3. Agrega una tabla con region y Ventas Totales, y otra tabla con producto y Ventas Totales, ordenada de mayor a menor.
4. Agrega dos tarjetas (Ventas Totales y Ticket Promedio) y un slicer con el campo region.
5. Revisa el checklist de buenas practicas de diseno de la lección anterior antes de dar el dashboard por terminado.
</Concepto>

<LecturaTask
  id="proyecto-final-dashboard-ventas"
  pregunta={"Según tu tabla de monto por region, ¿qué region vende más y por cuánta diferencia?"}
  respuesta={"norte, con 679.000 contra 655.000 de sur -- una diferencia de 24.000."}
/>
```

Run: `grep -rniE "\b(podés|querés|tenés|sentís|hacé|andá|fijate)\b|\bpor vos\b|\banda al\b" content/casos/clases-de-power-bi/misiones/`
Expected: sin resultados.

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
  - clases-de-excel
  - despachos-rapidos
  - clases-de-sql
  - minimarkets-del-sur
  - clases-de-python
  - tienda-online-pewen
  - clases-de-power-bi
  - clinica-cordillera-central
  - proyecto-final
```

En `apps/web/src/db/release.test.ts`, `2 rutas, 10 casos` pasa a `2 rutas, 11 casos` (las dos veces), y `toHaveLength(10)` pasa a `toHaveLength(11)`.

- [ ] **Step 4: Validar**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content validate`
Expected: `[content] ok: 2 rutas, 11 casos, 160 misiones`.

Compara cada `.mdx` y `caso.yaml` con `diff` contra este plan: deben ser idénticos.

Run: `docker compose run --rm tools pnpm -r --if-present test`
Expected: PASS en todos los paquetes (content 99, web 336).

- [ ] **Step 5: Commit**

```bash
git add content apps/web/src/db/release.test.ts
git commit -m "feat(contenido): clases de power bi, treinta y cuatro lecciones traidas del aula de la v1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: e2e y documentación

**Files:**
- Modify: `e2e/tests/progreso.ts`, `e2e/tests/clases.spec.ts`, `e2e/tests/clinica.spec.ts`, `e2e/tests/proyecto-final.spec.ts`, `e2e/calentar.ts`, `README.md`

**Interfaces:**
- Consumes: los ids de la Task 2.
- Produces:
  - `MISIONES["clases-de-power-bi"]`, y `CLASES` con las cuatro clases;
  - una prueba más en `clases.spec.ts`.

- [ ] **Step 1: Los helpers y las cadenas de casos**

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
  "clases-de-excel": [
    ["01-que-es-una-hoja-de-calculo", "que-es-una-hoja-de-calculo"],
    ["02-primera-formula", "primera-formula"],
    ["03-orden-de-operaciones", "orden-de-operaciones"],
    ["04-funcion-suma", "funcion-suma"],
    ["05-funcion-promedio", "funcion-promedio"],
    ["06-contar-max-min", "contar-max-min"],
    ["07-referencias-relativas", "referencias-relativas"],
    ["08-referencias-absolutas", "referencias-absolutas"],
    ["09-la-funcion-si", "la-funcion-si"],
    ["10-y-o-condiciones", "y-o-condiciones"],
    ["11-si-anidados", "si-anidados"],
    ["12-sumar-si", "sumar-si"],
    ["13-contar-si", "contar-si"],
    ["14-funciones-conjunto", "funciones-conjunto"],
    ["15-buscarv", "buscarv"],
    ["16-indice-coincidir", "indice-coincidir"],
    ["17-buscarv-vs-indice", "buscarv-vs-indice"],
    ["18-funciones-de-texto", "funciones-de-texto"],
    ["19-fechas", "fechas"],
    ["20-descripcion-de-venta", "descripcion-de-venta"],
    ["21-errores-comunes", "errores-comunes"],
    ["22-excel-vs-base-de-datos", "excel-vs-base-de-datos"],
    ["23-proyecto-final-reporte-ventas", "proyecto-final-reporte-ventas"],
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
  "clases-de-power-bi": [
    ["01-que-es-power-bi", "que-es-power-bi"],
    ["02-instalar-y-conectar-datos", "instalar-y-conectar-datos"],
    ["03-la-interfaz-de-power-bi", "la-interfaz-de-power-bi"],
    ["04-que-es-power-query", "que-es-power-query"],
    ["05-transformar-datos", "transformar-datos"],
    ["06-combinar-consultas", "combinar-consultas"],
    ["07-limpiar-datos-reales", "limpiar-datos-reales"],
    ["08-vista-de-modelo", "vista-de-modelo"],
    ["09-crear-relaciones", "crear-relaciones"],
    ["10-cardinalidad-y-direccion-del-filtro", "cardinalidad-y-direccion-del-filtro"],
    ["11-modelo-estrella", "modelo-estrella"],
    ["12-tabla-de-calendario", "tabla-de-calendario"],
    ["13-medidas-vs-columnas-calculadas", "medidas-vs-columnas-calculadas"],
    ["14-sintaxis-basica-de-dax", "sintaxis-basica-de-dax"],
    ["15-funciones-de-agregacion", "funciones-de-agregacion"],
    ["16-formato-de-una-medida", "formato-de-una-medida"],
    ["17-calculate-y-contexto", "calculate-y-contexto"],
    ["18-variables-en-dax", "variables-en-dax"],
    ["19-contexto-de-fila-vs-contexto-de-filtro", "contexto-de-fila-vs-contexto-de-filtro"],
    ["20-funciones-iteradoras-sumx-averagex", "funciones-iteradoras-sumx-averagex"],
    ["21-funciones-de-tiempo-basicas", "funciones-de-tiempo-basicas"],
    ["22-inteligencia-de-tiempo-real", "inteligencia-de-tiempo-real"],
    ["23-tipos-de-grafico", "tipos-de-grafico"],
    ["24-tarjetas-y-tablas", "tarjetas-y-tablas"],
    ["25-formato-condicional", "formato-condicional"],
    ["26-tooltips", "tooltips"],
    ["27-slicers", "slicers"],
    ["28-cross-filtering", "cross-filtering"],
    ["29-drill-down-y-drill-through", "drill-down-y-drill-through"],
    ["30-publicar-a-power-bi-service", "publicar-a-power-bi-service"],
    ["31-compartir-y-exportar", "compartir-y-exportar"],
    ["32-buenas-practicas-de-diseno", "buenas-practicas-de-diseno"],
    ["33-power-bi-vs-excel-sql-python", "power-bi-vs-excel-sql-python"],
    ["34-proyecto-final-dashboard-ventas", "proyecto-final-dashboard-ventas"],
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
  "clases-de-python": [
    ["01-variables-y-tipos", "variables-y-tipos"],
    ["02-operadores", "operadores"],
    ["03-print-fstrings", "print-fstrings"],
    ["04-errores-comunes", "errores-comunes"],
    ["05-listas", "listas"],
    ["06-diccionarios", "diccionarios"],
    ["07-tuplas", "tuplas"],
    ["08-listas-anidadas", "listas-anidadas"],
    ["09-if-else", "if-else"],
    ["10-for", "for"],
    ["11-while", "while"],
    ["12-funciones", "funciones"],
    ["13-series", "series"],
    ["14-dataframe", "dataframe"],
    ["15-explorar-dataframe", "explorar-dataframe"],
    ["16-cargar-csv-excel", "cargar-csv-excel"],
    ["17-seleccionar-columnas", "seleccionar-columnas"],
    ["18-loc-iloc", "loc-iloc"],
    ["19-filtros-booleanos", "filtros-booleanos"],
    ["20-crear-columnas", "crear-columnas"],
    ["21-apply", "apply"],
    ["22-limpieza-texto", "limpieza-texto"],
    ["23-fechas", "fechas"],
    ["24-ordenar", "ordenar"],
    ["25-groupby", "groupby"],
    ["26-agg", "agg"],
    ["27-value-counts", "value-counts"],
    ["28-merge", "merge"],
    ["29-valores-nulos", "valores-nulos"],
    ["30-duplicados", "duplicados"],
    ["31-exportar-resultados", "exportar-resultados"],
    ["32-visualizacion-datos", "visualizacion-datos"],
    ["33-python-vs-excel-sql", "python-vs-excel-sql"],
    ["34-proyecto-final-pandas", "proyecto-final-pandas"],
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
export const CLASES = new Set(["clases-de-excel", "clases-de-sql", "clases-de-python", "clases-de-power-bi"]);

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

Desde ahora, el Caso 4 exige completar antes las clases de Power BI:
- en `clinica.spec.ts`, la lista de casos termina en `"tienda-online-pewen", "clases-de-power-bi"]`, y el nombre de la prueba empieza con "con los casos 0 a 3 y sus clases completos:";
- en `proyecto-final.spec.ts`, `"tienda-online-pewen", "clinica-cordillera-central"` pasa a `"tienda-online-pewen", "clases-de-power-bi", "clinica-cordillera-central"`.

En `e2e/calentar.ts`, en `RUTAS`, antes de `"/casos/clinica-cordillera-central"`, agrega:
```ts
  "/casos/clases-de-power-bi",
  "/casos/clases-de-power-bi/02-instalar-y-conectar-datos",
```

- [ ] **Step 2: La prueba de las clases de Power BI**

Agrega al final de `e2e/tests/clases.spec.ts`:
```ts
test("con el Caso 3 completo: una práctica de Power BI muestra sus pasos, su dataset y se autocorrige al marcarla", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(300_000);
  const email = await registrarse(page, "Catalina Nahuel");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur", "clases-de-python", "tienda-online-pewen"]) {
    await completarCaso(page, admin, ip, email, caso);
  }
  await aprobar(page, ip, "clases-de-power-bi", MISIONES["clases-de-power-bi"].slice(0, 1));

  await page.goto("/casos/clases-de-power-bi/02-instalar-y-conectar-datos");
  await expect(page.getByText("> lección 2/34", { exact: false })).toBeVisible();
  await expect(page.getByText("En la pestaña Inicio, haz clic en 'Obtener datos' y elige 'Texto/CSV'.")).toBeVisible();
  const enlace = page.getByRole("link", { name: "ventas.csv" });
  await expect(enlace).toHaveAttribute("href", "/casos/clases-de-power-bi/datos/ventas.csv");
  const csv = await page.request.get("/casos/clases-de-power-bi/datos/ventas.csv");
  expect((await csv.text()).split("\n")[0]).toBe("fecha,producto,region,monto");

  await expect(page.getByText("¿Cuántas columnas tiene la tabla ventas una vez cargada?")).toBeVisible();
  const marcada = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Ver la respuesta y marcar como completada" }).click();
  await marcada;
  await expect(page.getByText("4 columnas: fecha, producto, region y monto.")).toBeVisible();
});
```

Run: `npm run test:e2e -- tests/clases.spec.ts tests/clinica.spec.ts`
Expected: `7 passed`.

- [ ] **Step 3: README**

`## Clases` en `README.md` queda:
```markdown
## Clases

- **Qué son:** antes del caso que las aplica, una lección por tema, traída de las aulas de la v1. En `caso.yaml` llevan `tipo: clases` y solo `slug`, `titulo`, `dataset` y `misiones`: no tienen empresa, entregable, rúbrica ni certificado propio.
  - Se completan al aprobar todas sus lecciones y habilitan el caso siguiente de la ruta. Cuentan para el certificado de la ruta, pero no van al portafolio.
  - Cada lección es una misión con `<Concepto>`, `<Sintaxis>` (la forma general, que no se ejecuta), ejemplos, un ejercicio y un `<Debrief>` sin consejo de entrevista.
  - La última lección no tiene que ser sin guía: el caso siguiente cumple ese papel.
  - En la ruta Data Analyst: clases de Excel antes del Caso 1, de SQL antes del Caso 2, de Python antes del Caso 3 y de Power BI antes del Caso 4.
- **Planillas propias:** una tarea de planilla (`SheetTask`) toma su hoja de un CSV de `datos/` (`hoja`) o la trae escrita en la lección (`grilla`, fila por fila desde A1), como las aulas de la v1.
- **Lecturas:** `<LecturaTask pregunta respuesta />` es una lección sin validación automática, como las lecturas de la v1: se piensa la pregunta y, al marcarla como completada, aparece la respuesta del curso.
- **Importar un aula de la v1:**
  1. Exporta sus datos a JSON, con el Node de tu equipo: `node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-sql > tmp/aula-sql.json`.
  2. Escribe el borrador: `docker compose run --rm tools pnpm --filter @syntaxerror/content importar <sql|excel|python|powerbi> /app/tmp/aula-<aula>.json /app/content/casos/<carpeta> <lección,lección,...>`.
  3. Revisa el borrador: tildes que el diccionario no corrige solo (`mas`, `aun`, `que` en preguntas), dos pistas por lección que orienten sin dar la respuesta, y el título y el dataset de `caso.yaml`. Después corre `npm run content:validate`.
- **El importador** (`packages/content/src/importar/`) tiene un formato común (`leccion.ts`: consultas, planillas y lecturas) y un adaptador por aula (`aula-sql.ts`, `aula-excel.ts`, `aula-python.ts`, `aula-powerbi.ts`).
  - En Excel, la v1 guardaba solo el valor esperado de cada celda: la fórmula de la solución se saca de la pista ("En D2 escribe =B2*C2"), se repite fila abajo cuando la pista dice "repite la misma lógica", y el validador comprueba que dé el valor esperado.
  - En Python, la v1 comparaba una variable (`resultado`) con un valor esperado: eso pasa a ser la prueba del `PythonTask`, con tolerancia para números y sin revelar el valor. La solución se saca de la explicación ("resultado = len(precios) = 5"); si no está, el importador la marca con `# REVISAR` y el validador no la deja pasar hasta que la revisión la escriba. Los ejemplos de código dependen de la preparación de la lección, así que se muestran como bloques de solo lectura.
  - Power BI se practica en Power BI Desktop: los pasos de cada práctica van al concepto, su dataset (que el exportador trae desde `public/datasets` del aula) queda en «Datos del caso» y la autocorrección de la v1 es una `LecturaTask`. Ahí las comillas simples encierran nombres de menús, que también se corrigen (`respetarComillas: false`).
  - El voseo de las aulas pasa a tú ("podés" → "puedes", "seguí" → "sigue", "por vos" → "por ti"); las formas ambiguas se revisan a mano.
  - Corrige tildes con un diccionario y nombres propios de los datos (Concepción, Tomás), pero no toca los valores entre comillas simples, los nombres de tablas y columnas de SQL ni las planillas, para que los ejercicios sigan calzando con sus soluciones.
  - Descarta las pistas de la v1 que traían la consulta o la fórmula: el validador rechaza una pista de SQL o Python con la solución completa.
```

- [ ] **Step 4: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes.

Run: `npm run test:e2e`
Expected: `44 passed`. Dos corridas seguidas deben dar lo mismo.

- [ ] **Step 5: Commit**

```bash
git add e2e README.md
git commit -m "test(e2e): clases de power bi antes del caso 4, con practica, dataset y autocorreccion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**IA para datos (14 lecciones),** la última aula de la ruta. En la v1 tiene un quiz. Hay que decidir si va:
- como clases propias, por ejemplo antes del proyecto final;
- o repartida en los casos 1, 3 y 5, donde la propuesta pedagógica ya pone las misiones de "IA para analizar datos".
