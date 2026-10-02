# Fase 6c: Clases de Python. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Traer las 34 lecciones del aula de Python de la v1 como "Clases de Python", entre el Caso 2 (Minimarkets del Sur) y el Caso 3 (Tienda Online Pewen), sin reescribirlas.

**Architecture:**
- **No cambia la plataforma:** las lecciones usan lo que ya existe.
  - Los 32 ejercicios son `PythonTask`; las 2 lecturas son `LecturaTask` (Fase 6b).
- **Cómo se convierte un ejercicio (adaptador `aula-python.ts`).** La v1 corría `setupCode`, después el código de la persona, y comparaba una variable (`resultado`) con `expectedValue`: con tolerancia de 0,0001 si es un número, y por igualdad en el resto. En la v2 eso queda así:
  - `setupCode` pasa a ser la `preparacion`, y `starterCode`, el código `inicial`;
  - `pruebas` repite la comparación de la v1. El mensaje no dice el valor esperado, para que la persona lo calcule;
  - la solución se saca de la explicación ("resultado = len(precios) = 5"), reemplazando `resultado = None` del código inicial;
  - si la explicación no la trae (8 lecciones), el importador escribe `# REVISAR` y el validador no deja pasar la lección hasta que la revisión editorial la escriba;
  - `paquetes: ["pandas"]` cuando la preparación o el código inicial usan pandas.
- **Los ejemplos de código no se pueden ejecutar solos,** porque dependen de los datos de la preparación (`ventas`, `encuesta`). Se muestran como bloques de código de solo lectura (`Seccion.codigo` en el formato común).
- **Los nombres del código (columnas, variables y valores) se protegen al corregir tildes,** como en SQL: el texto dice "la columna calificacion", igual que en el código.
- **Revisión editorial,** sin reescribir el contenido:
  - las 8 soluciones que faltaban;
  - dos pistas por ejercicio (la v1 de Python no tenía pistas);
  - tildes que dependen del contexto, los "¿" de las preguntas, y dos correcciones de voseo ("volvelo" → "vuelve a leerlo", "queres" → "quieres").

**Tech Stack:** Pyodide 0.28.3 con pandas, MDX 3, Vitest 4 y Playwright 1.55.

**Spec:** `docs/propuesta-pedagogica-data-analyst.md`, sección 3 (clases) y decisión 6, actualizada con el orden Caso 2 → clases de Python → Caso 3.

## Global Constraints

**Copia literal:** cada archivo completo de este plan se copia exactamente como está, con sus comentarios. Las 34 lecciones son la versión final después de la revisión editorial: compáralas con `diff` contra el plan antes del commit.

**Entorno**
- Todo se ejecuta con `docker compose run --rm tools ...`, salvo la exportación del aula (Task 2), que usa el Node del equipo.
- El paquete de la app se llama `web`.

**Contenido:** no se reescribe el texto de la v1. La preparación, el código inicial y los valores esperados se copian sin cambios: son lo que revisa la prueba.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Una solución que la explicación no trae:** queda `# REVISAR`, y el validador la rechaza porque no da el valor esperado. Así ninguna lección se publica sin solución. Probado en `aula-python.test.ts` y en la validación de la Task 2.
2. **Un resultado incorrecto no revela el valor esperado:** el mensaje es "resultado no tiene el valor esperado: revisa el cálculo.". Probado en `aula-python.test.ts` y en `clases.spec.ts`.
3. **Un número de numpy** (`numpy.int64`, por ejemplo de `.sum()`) se compara con tolerancia igual que un int: `numbers.Number` incluye los números de numpy. Probado con la validación de las 34 lecciones.
4. **La explicación con comas o comillas dentro de la expresión** (`encuesta["canal"].tolist()`, un f-string con `{}`): la expresión se lee completa. Probado en `aula-python.test.ts`.
5. **El Caso 3 queda bloqueado hasta completar las 34 lecciones.** Probado en `pewen.spec.ts`, que ahora completa las clases antes.

## Estructura de archivos

```
packages/content/src/importar/leccion.ts, aula-python.ts (+ test), importar-cli.ts   adaptador de Python
content/casos/clases-de-python/ (caso.yaml y 34 lecciones), content/rutas/data-analyst.yaml
apps/web/src/db/release.test.ts                                                       10 casos
e2e/tests/progreso.ts, clases.spec.ts, pewen, clinica y proyecto-final .spec.ts, e2e/calentar.ts
README.md
```

---

### Task 1: El adaptador de Python

**Files:**
- Modify: `packages/content/src/importar/leccion.ts`, `packages/content/src/importar/importar-cli.ts`
- Create: `packages/content/src/importar/aula-python.ts`
- Test: `packages/content/src/importar/aula-python.test.ts`

**Interfaces:**
- Consumes: el formato común (Fases 6a y 6b).
- Produces:
  - en `importar/leccion`: el tipo `TareaPython` (que se suma a `Tarea`) y `Seccion.codigo`;
  - en `importar/aula-python`: `LeccionPythonV1`, `convertirLeccionPython(v1, numero, excepto?)`, `identificadoresPython(lecciones)`, `solucionPython(v1)`, `leerExpresion(texto, desde)`, `pruebaPython(variable, esperado)` y `aPython(valor)`;
  - el comando `importar <sql|excel|python> ...`.

- [ ] **Step 1: Escribir las pruebas**

`packages/content/src/importar/aula-python.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { aPython, convertirLeccionPython, identificadoresPython, leerExpresion, pruebaPython, solucionPython, type LeccionPythonV1 } from "./aula-python";

const base: LeccionPythonV1 = {
  slug: "groupby",
  title: "groupby",
  duration: "16 min",
  type: "exercise",
  intro: ["groupby agrupa las filas segun una columna, por ejemplo la region."],
  syntaxExample: 'df.groupby("columna")["otra"].sum()',
  sections: [{ heading: "Acceder a un grupo especifico", body: ["Con .loc se lee un grupo."], code: 'ventas.groupby("region")["monto"].sum()' }],
  setupCode: 'import pandas as pd\nventas = pd.DataFrame({"region":["norte","sur"],"monto":[100,80]})',
  starterCode: "resultado = None",
  resultVariable: "resultado",
  expectedValue: 100,
  prompt: "Asigna a resultado el total de la region 'norte'.",
  explanation: 'resultado = int(ventas.groupby("region")["monto"].sum().loc["norte"]) = 100.',
};

describe("la prueba de la v1", () => {
  it("escribe el valor esperado como Python", () => {
    expect(aPython(["web", 1, true, null])).toBe('["web", 1, True, None]');
    expect(aPython({ a: 1.5 })).toBe('{"a": 1.5}');
  });

  it("compara números con tolerancia y el resto por igualdad, sin decir el valor esperado", () => {
    const prueba = pruebaPython("resultado", 405000);
    expect(prueba).toContain("esperado = 405000");
    expect(prueba).toContain("abs(resultado - esperado) < 0.0001");
    expect(prueba).not.toMatch(/"[^"]*405000/);
  });
});

describe("la solución desde la explicación", () => {
  it("lee la expresión hasta « = », «produce», una coma o el punto final, sin cortar dentro de paréntesis o comillas", () => {
    const texto = 'resultado = f"{producto}: ${precio}" produce el texto';
    expect(leerExpresion(texto, "resultado = ".length)).toBe('f"{producto}: ${precio}"');
    expect(leerExpresion("resultado = len(precios) = 5.", "resultado = ".length)).toBe("len(precios)");
    expect(leerExpresion('resultado = encuesta["canal"].tolist() = ["web","tienda"].', "resultado = ".length)).toBe('encuesta["canal"].tolist()');
  });

  it("reemplaza «resultado = None» del código inicial; sin expresión en la explicación queda null", () => {
    expect(solucionPython({ ...base, starterCode: 'limpio = sensor.drop_duplicates()\nresultado = None', explanation: "Despues: resultado = len(limpio) = 3." })).toBe("limpio = sensor.drop_duplicates()\nresultado = len(limpio)");
    expect(solucionPython({ ...base, explanation: "Como stock es menor a 5, resultado debe ser Reponer." })).toBeNull();
  });
});

describe("convertirLeccionPython", () => {
  it("convierte un ejercicio: preparación, inicial, prueba, pandas y código de solo lectura, sin tocar los nombres del código", () => {
    const leccion = convertirLeccionPython(base, 25, identificadoresPython([base]));
    expect(leccion).toMatchObject({ slug: "25-groupby", intro: ["groupby agrupa las filas según una columna, por ejemplo la region."], sintaxis: { lenguaje: "python" } });
    expect(leccion.secciones[0]).toMatchObject({ titulo: "Acceder a un grupo especifico", codigo: base.sections?.[0].code });
    expect(leccion.tarea).toMatchObject({
      tipo: "PythonTask",
      id: "groupby",
      preparacion: base.setupCode,
      inicial: "resultado = None",
      solucion: 'resultado = int(ventas.groupby("region")["monto"].sum().loc["norte"])',
      paquetes: ["pandas"],
      pistas: [],
    });
  });

  it("sin expresión en la explicación marca la solución para la revisión; una lectura pasa a LecturaTask", () => {
    expect(convertirLeccionPython({ ...base, explanation: "Sin código." }, 1).tarea).toMatchObject({ solucion: "resultado = None\n# REVISAR: escribir la solución" });
    const lectura = convertirLeccionPython({ slug: "graficos", title: "Graficos", duration: "10 min", type: "reading", prompt: "Que grafico?", explanation: "Uno de lineas." }, 33);
    expect(lectura.tarea).toEqual({ tipo: "LecturaTask", id: "graficos", pregunta: "Que gráfico?", respuesta: "Uno de líneas." });
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/importar/aula-python.test.ts`
Expected: FAIL, "Failed to resolve import ./aula-python".

- [ ] **Step 3: Implementar**

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
export type Seccion = { titulo: string; parrafos: string[]; ejemplo: string | null; formula?: string | null; codigo?: string | null };

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
  if (seccion.codigo) partes.push(["```python", seccion.codigo, "```"].join("\n"));
  return partes.join("\n\n");
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
  ahi: "ahí",
  alfabetico: "alfabético",
  analisis: "análisis",
  analitica: "analítica",
  anio: "año",
  anios: "años",
  antiguedad: "antigüedad",
  aparicion: "aparición",
  aplicala: "aplícala",
  aqui: "aquí",
  area: "área",
  aritmetica: "aritmética",
  aritmeticos: "aritméticos",
  asi: "así",
  automaticamente: "automáticamente",
  automaticos: "automáticos",
  basica: "básica",
  basico: "básico",
  basicos: "básicos",
  botin: "botín",
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
  como: "cómo",
  comodo: "cómodo",
  comparacion: "comparación",
  comun: "común",
  condicion: "condición",
  configuracion: "configuración",
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
  evalua: "evalúa",
  evolucion: "evolución",
  existia: "existía",
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
  instruccion: "instrucción",
  intentaria: "intentaría",
  interseccion: "intersección",
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
  minimo: "mínimo",
  minusculas: "minúsculas",
  mision: "misión",
  muestrame: "muéstrame",
  multiples: "múltiples",
  numerica: "numérica",
  numericas: "numéricas",
  numero: "número",
  numeros: "números",
  ocurrio: "ocurrió",
  operacion: "operación",
  pagina: "página",
  parentesis: "paréntesis",
  patron: "patrón",
  pelicula: "película",
  piensalo: "piénsalo",
  posicion: "posición",
  presentacion: "presentación",
  proxima: "próxima",
  proximo: "próximo",
  quedarian: "quedarían",
  quedate: "quédate",
  rapida: "rápida",
  rapido: "rápido",
  region: "región",
  relacion: "relación",
  repeticion: "repetición",
  sangria: "sangría",
  segun: "según",
  semaforo: "semáforo",
  sesion: "sesión",
  simultanea: "simultánea",
  solucion: "solución",
  tambien: "también",
  tendran: "tendrán",
  tenias: "tenías",
  tipico: "típico",
  todavia: "todavía",
  transformacion: "transformación",
  trio: "trío",
  ultima: "última",
  ultimo: "último",
  unica: "única",
  unicas: "únicas",
  unico: "único",
  util: "útil",
  utiles: "útiles",
  vacia: "vacía",
  vacio: "vacío",
  valido: "válido",
  vendio: "vendió",
  version: "versión",
  visualizacion: "visualización",
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
~~~~

`packages/content/src/importar/aula-python.ts`:
```ts
import { corregirTildes, type Leccion } from "./leccion";

// Adaptador del aula de Python de la v1 (aula-python/src/data/lessons.js, exportado a JSON).
// La v1 corría setupCode, después el código de la persona, y comparaba una variable (resultVariable) con expectedValue:
// con tolerancia si es un número, y por igualdad en el resto. Eso pasa a ser la preparación y la prueba de un
// PythonTask. La v1 no guardaba la solución: se saca de la explicación («resultado = precio*stock = 1350000»), y el
// validador comprueba que dé el valor esperado.

export type SeccionPythonV1 = { heading: string; body: string[]; code: string | null };
export type LeccionPythonV1 = {
  slug: string;
  title: string;
  duration: string;
  type: "exercise" | "reading";
  intro?: string[];
  syntaxExample?: string | null;
  sections?: SeccionPythonV1[];
  setupCode?: string;
  starterCode?: string;
  resultVariable?: string;
  expectedValue?: unknown;
  prompt?: string;
  explanation?: string;
};

// El valor esperado escrito como Python: los textos y números se escriben igual que en JSON; las listas y los
// diccionarios también, salvo true, false y null.
export function aPython(valor: unknown): string {
  if (valor === null || valor === undefined) return "None";
  if (valor === true) return "True";
  if (valor === false) return "False";
  if (Array.isArray(valor)) return `[${valor.map(aPython).join(", ")}]`;
  if (typeof valor === "object") return `{${Object.entries(valor).map(([clave, dato]) => `${JSON.stringify(clave)}: ${aPython(dato)}`).join(", ")}}`;
  return JSON.stringify(valor);
}

// La prueba de la v1: un número se compara con tolerancia; el resto, por igualdad. El mensaje no dice el valor
// esperado, para que la persona lo calcule.
export function pruebaPython(variable: string, esperado: unknown): string {
  return [
    "import numbers",
    `esperado = ${aPython(esperado)}`,
    `if isinstance(esperado, numbers.Number) and isinstance(${variable}, numbers.Number):`,
    `    assert abs(${variable} - esperado) < 0.0001, "${variable} no tiene el valor esperado: revisa el cálculo."`,
    "else:",
    `    assert ${variable} == esperado, "${variable} no tiene el valor esperado: revisa el cálculo."`,
  ].join("\n");
}

// Lee una expresión de Python desde «desde» hasta « = » o un punto final fuera de paréntesis, corchetes y comillas.
export function leerExpresion(texto: string, desde: number): string {
  let profundidad = 0;
  let comillas: string | null = null;
  let fin = desde;
  for (; fin < texto.length; fin += 1) {
    const caracter = texto[fin];
    if (comillas) {
      if (caracter === comillas) comillas = null;
      continue;
    }
    if (caracter === '"' || caracter === "'") comillas = caracter;
    else if ("([{".includes(caracter)) profundidad += 1;
    else if (")]}".includes(caracter)) profundidad -= 1;
    else if (profundidad === 0 && texto.startsWith(" = ", fin)) break;
    else if (profundidad === 0 && texto.startsWith(" produce", fin)) break;
    else if (profundidad === 0 && caracter === "," && texto[fin + 1] === " ") break;
    else if (profundidad === 0 && caracter === "." && (fin + 1 === texto.length || /\s/.test(texto[fin + 1]))) break;
  }
  return texto.slice(desde, fin).trim();
}

// La solución: el código inicial con «resultado = None» reemplazado por la expresión de la explicación. Si la
// explicación no la trae, queda null y la escribe la revisión editorial.
export function solucionPython(v1: LeccionPythonV1): string | null {
  const variable = v1.resultVariable ?? "resultado";
  const inicial = v1.starterCode ?? "";
  const marca = `${variable} = `;
  const desde = (v1.explanation ?? "").indexOf(marca);
  if (desde < 0) return null;
  const expresion = leerExpresion(v1.explanation ?? "", desde + marca.length);
  if (!expresion) return null;
  const linea = new RegExp(`^${variable} = None\\s*$`, "m");
  if (!linea.test(inicial)) return null;
  return inicial.replace(linea, `${variable} = ${expresion}`);
}

const usaPandas = (codigo: string) => /\bpandas\b|\bpd\./.test(codigo);

// Los nombres del código (columnas, variables y valores de los datos) aparecen en el texto como código: se escriben
// sin tilde a propósito y el diccionario no los toca, como en SQL.
export function identificadoresPython(lecciones: LeccionPythonV1[]): Set<string> {
  const codigo = lecciones.map((leccion) => [leccion.setupCode, leccion.starterCode, ...(leccion.sections ?? []).map((seccion) => seccion.code)].join("\n")).join("\n");
  return new Set([...codigo.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)].map(([nombre]) => nombre.toLowerCase()));
}

export function convertirLeccionPython(v1: LeccionPythonV1, numero: number, excepto: ReadonlySet<string> = new Set()): Leccion {
  const texto = (valor: string) => corregirTildes(valor, excepto);
  const base = {
    slug: `${String(numero).padStart(2, "0")}-${v1.slug}`,
    titulo: texto(v1.title),
    minutos: Number.parseInt(v1.duration, 10) || 15,
    intro: (v1.intro ?? []).map(texto),
    sintaxis: v1.syntaxExample ? { lenguaje: "python" as const, codigo: v1.syntaxExample } : null,
    secciones: (v1.sections ?? []).map((seccion) => ({ titulo: texto(seccion.heading), parrafos: seccion.body.map(texto), ejemplo: null, codigo: seccion.code })),
  };
  if (v1.type === "reading") {
    if (!v1.prompt || !v1.explanation) throw new Error(`La lectura ${v1.slug} no tiene pregunta o respuesta`);
    return { ...base, tarea: { tipo: "LecturaTask", id: v1.slug, pregunta: texto(v1.prompt), respuesta: texto(v1.explanation) }, cierre: null };
  }
  if (!v1.prompt || v1.expectedValue === undefined) throw new Error(`La lección ${v1.slug} no tiene enunciado o valor esperado`);
  const variable = v1.resultVariable ?? "resultado";
  const preparacion = v1.setupCode ?? "";
  const inicial = v1.starterCode ?? "";
  return {
    ...base,
    tarea: {
      tipo: "PythonTask",
      id: v1.slug,
      enunciado: texto(v1.prompt),
      preparacion,
      inicial,
      // Sin la expresión en la explicación, la solución queda marcada para la revisión: el validador no la deja pasar.
      solucion: solucionPython(v1) ?? `${inicial}\n# REVISAR: escribir la solución`,
      pruebas: pruebaPython(variable, v1.expectedValue),
      paquetes: usaPandas(`${preparacion}\n${inicial}`) ? ["pandas"] : [],
      pistas: [],
    },
    cierre: v1.explanation ? texto(v1.explanation) : null,
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
import { convertirLeccionPython, identificadoresPython, type LeccionPythonV1 } from "./aula-python";
import { convertirLeccionSql, datosSql, identificadores, type AulaV1 } from "./aula-sql";
import { leccionAMdx, type Leccion } from "./leccion";

// Escribe el borrador de unas clases a partir de un aula de la v1 exportada a JSON (scripts/exportar-aula-v1.mjs).
// Uso: pnpm --filter @syntaxerror/content importar <sql|excel|python> <aula.json> <carpeta de destino> <lecciones separadas por coma>
// Escribe misiones/NN-<lección>.mdx, un caso.yaml para completar y, en SQL, datos/<tabla>.csv con las tablas que usan
// (en Excel cada lección trae su planilla y en Python, su preparación). No pisa contenido: la carpeta de destino no debe existir. Después del
// borrador viene la revisión editorial.

const AULAS = { sql: "Clases de SQL", excel: "Clases de Excel", python: "Clases de Python" } as const;
type Aula = keyof typeof AULAS;

const [aula, entrada, destino, seleccion] = process.argv.slice(2);
if (!(aula in AULAS) || !entrada || !destino || !seleccion) {
  console.error("Uso: importar <sql|excel|python> <aula.json> <carpeta de destino> <lección,lección,...>");
  process.exit(1);
}

// Cada aula tiene la forma de sus lecciones: se leen como tales en su rama.
const datos = JSON.parse(await readFile(entrada, "utf8")) as { lessons: { slug: string }[]; datasets: AulaV1["datasets"] };
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
await writeFile(
  path.join(destino, "caso.yaml"),
  `slug: ${path.basename(destino)}\ntipo: clases\ntitulo: "${AULAS[aula as Aula]}"\ndataset: "Completar: qué datos de práctica usan las lecciones"\nmisiones:\n${lecciones.map((leccion) => `  - ${leccion.slug}`).join("\n")}\n`
);
console.log(`[importar] ${lecciones.length} lecciones y ${tablas.length} tablas en ${destino}`);
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content exec vitest run src/importar && pnpm --filter @syntaxerror/content exec tsc --noEmit"`
Expected: PASS (23 pruebas) y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/importar
git commit -m "feat(contenido): adaptador del aula de python con su prueba y la solucion desde la explicacion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Las clases de Python

**Files:**
- Create: `content/casos/clases-de-python/caso.yaml` y 34 lecciones en `misiones/`
- Modify: `content/rutas/data-analyst.yaml`, `apps/web/src/db/release.test.ts`

**Interfaces:**
- Consumes: el adaptador (Task 1).
- Produces: las clases `clases-de-python`, sextas en la ruta. Las lecciones se llaman `NN-<slug de la v1>` y el id de su tarea es el slug de la v1. Las 32 y 33 son lecturas.

- [ ] **Step 1: El borrador del importador**

Run: `mkdir -p tmp && node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-python > tmp/aula-python.json`
Expected: `tmp/aula-python.json`, de unos 73 KB.

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content importar python /app/tmp/aula-python.json /app/content/casos/clases-de-python variables-y-tipos,operadores,print-fstrings,errores-comunes,listas,diccionarios,tuplas,listas-anidadas,if-else,for,while,funciones,series,dataframe,explorar-dataframe,cargar-csv-excel,seleccionar-columnas,loc-iloc,filtros-booleanos,crear-columnas,apply,limpieza-texto,fechas,ordenar,groupby,agg,value-counts,merge,valores-nulos,duplicados,exportar-resultados,visualizacion-datos,python-vs-excel-sql,proyecto-final-pandas`
Expected: `[importar] 34 lecciones y 0 tablas en /app/content/casos/clases-de-python`.

Antes de la revisión, `validate` informa 7 lecciones cuya solución no pasa. Son las que la explicación no trae: errores-comunes, if-else, for, funciones, apply, duplicados y proyecto-final-pandas. La octava, while, pasa porque su código inicial ya resuelve la tarea.

- [ ] **Step 2: La revisión editorial (copia literal)**

Reemplaza cada archivo por su versión final.

`content/casos/clases-de-python/caso.yaml`:
```yaml
slug: clases-de-python
tipo: clases
titulo: "Clases de Python: de las variables a pandas"
dataset: "pequeñas tablas de ventas, encuestas y sensores, preparadas en cada lección"
misiones:
  - 01-variables-y-tipos
  - 02-operadores
  - 03-print-fstrings
  - 04-errores-comunes
  - 05-listas
  - 06-diccionarios
  - 07-tuplas
  - 08-listas-anidadas
  - 09-if-else
  - 10-for
  - 11-while
  - 12-funciones
  - 13-series
  - 14-dataframe
  - 15-explorar-dataframe
  - 16-cargar-csv-excel
  - 17-seleccionar-columnas
  - 18-loc-iloc
  - 19-filtros-booleanos
  - 20-crear-columnas
  - 21-apply
  - 22-limpieza-texto
  - 23-fechas
  - 24-ordenar
  - 25-groupby
  - 26-agg
  - 27-value-counts
  - 28-merge
  - 29-valores-nulos
  - 30-duplicados
  - 31-exportar-resultados
  - 32-visualizacion-datos
  - 33-python-vs-excel-sql
  - 34-proyecto-final-pandas
```

`content/casos/clases-de-python/misiones/01-variables-y-tipos.mdx`:
~~~~mdx
---
titulo: "Variables y tipos de datos"
tiempo: 12
---

<Concepto>
Una variable es un nombre que guarda un valor para poder usarlo después. En Python no hace falta declarar de antemano qué tipo de dato va a tener -- se define solo con asignarle un valor.

Los tipos de datos básicos son int (números enteros), float (números con decimales), str (texto) y bool (verdadero o falso). Python los distingue automáticamente por cómo se escribe el valor.

<Sintaxis lenguaje="python" codigo={"nombre_variable = valor"} />

**Asignar una variable.** El signo = asigna un valor a un nombre de variable. A la izquierda va el nombre, a la derecha el valor.

```python
precio = 450000
```

**Tipos básicos.** int para números enteros (450000), float para números con decimales (0.1), str para texto entre comillas ("Notebook"), y bool para True o False.

```python
precio = 450000
descuento = 0.1
producto = "Notebook"
disponible = True
```

**Cambiar el valor de una variable.** Una variable no queda fija: se le puede asignar un valor nuevo en cualquier momento, y el valor anterior se pierde.

**Comentarios con #.** Cualquier texto después de # en una línea es un comentario -- Python lo ignora por completo. Sirve para explicar el código a quien lo lea después (incluyéndote a vos mismo).

```python
# esto es un comentario, no se ejecuta
```
</Concepto>

<PythonTask
  id="variables-y-tipos"
  enunciado={"Completa el código para que resultado sea el precio multiplicado por el stock."}
  preparacion={""}
  inicial={"producto = \"Notebook\"\nprecio = 450000\nstock = 3\nresultado = None"}
  solucion={"producto = \"Notebook\"\nprecio = 450000\nstock = 3\nresultado = precio*stock"}
  pruebas={"import numbers\nesperado = 1350000\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={[]}
  pistas={["Las variables precio y stock ya tienen sus valores: úsalas por su nombre.", "En Python, la multiplicación se escribe con *."]}
/>

<Debrief>
resultado = precio*stock = 450000*3 = 1350000.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/02-operadores.mdx`:
~~~~mdx
---
titulo: "Operadores"
tiempo: 12
---

<Concepto>
Los operadores combinan valores para producir un resultado nuevo -- los aritméticos calculan números, los de comparación dan verdadero o falso, y los lógicos combinan condiciones.

Son la base de cualquier cálculo o decisión que vas a escribir en Python, y funcionan igual sobre números sueltos que sobre valores guardados en variables.

<Sintaxis lenguaje="python" codigo={"resultado = a + b"} />

**Operadores aritméticos.** + suma, - resta, * multiplica, / divide (con decimales), // divide y descarta el resto (división entera), % da el resto de una división, ** eleva a una potencia.

```python
precio = 450000
descuento = 0.1
precio_final = precio*(1-descuento)
```

**Operadores de comparación.** == compara si son iguales, != si son distintos, >, &lt;, >=, &lt;= comparan magnitud -- todos devuelven True o False.

```python
stock = 3
stock < 5
```

**Operadores lógicos.** and exige que ambas condiciones sean verdaderas, or alcanza con que una lo sea, not invierte una condición.

```python
stock < 5 and precio > 100000
```
</Concepto>

<PythonTask
  id="operadores"
  enunciado={"Asigna a resultado el precio con el descuento aplicado: precio * (1 - descuento)."}
  preparacion={"precio = 450000\ndescuento = 0.1"}
  inicial={"resultado = None"}
  solucion={"resultado = precio*(1-descuento)"}
  pruebas={"import numbers\nesperado = 405000\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={[]}
  pistas={["Primero calcula qué parte del precio se paga: 1 menos el descuento.", "Usa paréntesis para que esa resta se haga antes de multiplicar."]}
/>

<Debrief>
resultado = precio*(1-descuento) = 450000*0.9 = 405000.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/03-print-fstrings.mdx`:
~~~~mdx
---
titulo: "print y f-strings"
tiempo: 10
---

<Concepto>
print muestra un valor en la salida -- es la forma más básica de ver qué está pasando dentro de un programa mientras se ejecuta.

Los f-strings (textos con una f antes de las comillas) permiten insertar el valor de una variable directamente dentro de un texto, sin concatenar a mano con +.

<Sintaxis lenguaje="python" codigo={"f\"texto {variable} mas texto\""} />

**print básico.** print(valor) muestra ese valor en la consola. Se le puede pasar texto, un número, o el resultado de una expresión.

```python
print("hola")
```

**f-strings.** Escribiendo una f antes de las comillas, cualquier cosa entre llaves &#123; &#125; dentro del texto se reemplaza por su valor.

```python
producto = "Mouse"
precio = 12000
print(f"{producto}: ${precio}")
```

**Expresiones dentro de las llaves.** Dentro de las llaves de un f-string se puede escribir cualquier expresión, no solo el nombre de una variable -- por ejemplo, un cálculo.

```python
print(f"total: {precio*2}")
```
</Concepto>

<PythonTask
  id="print-fstrings"
  enunciado={"Asigna a resultado el texto \"Mouse: $12000\" usando un f-string con las variables producto y precio."}
  preparacion={"producto = \"Mouse\"\nprecio = 12000"}
  inicial={"resultado = None"}
  solucion={"resultado = f\"{producto}: ${precio}\""}
  pruebas={"import numbers\nesperado = \"Mouse: $12000\"\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={[]}
  pistas={["Un f-string empieza con f antes de las comillas.", "Dentro del texto, cada variable va entre llaves; el signo $ se escribe tal cual."]}
/>

<Debrief>
resultado = f"&#123;producto&#125;: $&#123;precio&#125;" produce el texto "Mouse: $12000".
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/04-errores-comunes.mdx`:
~~~~mdx
---
titulo: "Errores comunes y como leerlos"
tiempo: 10
---

<Concepto>
Un error en Python no significa que rompiste algo para siempre -- es el intérprete diciéndote en qué línea y por qué no pudo seguir. Aprender a leer un error es más útil que evitarlos por completo.

Los tres errores más comunes al empezar son SyntaxError (la sintaxis está mal escrita), NameError (usaste un nombre que no existe) e IndentationError (la sangría no coincide).

**Cómo leer un traceback.** Python muestra el error de abajo hacia arriba: la última línea dice que tipo de error es y un mensaje corto; las líneas de arriba muestran en que parte del código ocurrió.

**NameError: un nombre que no existe.** Aparece cuando usas una variable que nunca fue asignada, casi siempre por un error de tipeo.

```python
precio = 1000
print(precio_total)
```

**IndentationError: la sangría no coincide.** Python usa la sangría (los espacios al inicio de la línea) para saber qué código pertenece a un bloque. Una línea con más o menos espacios de los que corresponde rompe el bloque.

**SyntaxError: falta algo en la escritura.** Un paréntesis sin cerrar, dos puntos faltantes después de un if, o una comilla sin cerrar generan este error antes de que el código llegue a ejecutarse.
</Concepto>

<PythonTask
  id="errores-comunes"
  enunciado={"El código tiene un error de tipeo que genera un NameError. Corrígelo para que resultado sea precio multiplicado por cantidad."}
  preparacion={""}
  inicial={"precio = 1000\ncantidad = 3\nresultado = precio * cantida"}
  solucion={"precio = 1000\ncantidad = 3\nresultado = precio * cantidad"}
  pruebas={"import numbers\nesperado = 3000\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={[]}
  pistas={["Lee el nombre que el error dice que no existe.", "Compáralo letra por letra con el nombre de la variable que definiste arriba."]}
/>

<Debrief>
La variable se llama cantidad, no cantida -- el error de tipeo genera un NameError porque Python busca un nombre que no existe.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/05-listas.mdx`:
~~~~mdx
---
titulo: "Listas"
tiempo: 14
---

<Concepto>
Una lista guarda varios valores en un orden específico, escritos entre corchetes y separados por comas. Es una de las estructuras que más vas a usar en Python.

A diferencia de una variable común, una lista se puede modificar después de creada: agregar elementos, quitarlos o cambiar uno en particular.

<Sintaxis lenguaje="python" codigo={"lista = [valor1, valor2, valor3]"} />

**Crear una lista.** Se escriben los valores entre corchetes, separados por comas. Una lista puede tener cualquier cantidad de elementos, incluida ninguna.

```python
precios = [450000, 12000, 25000]
```

**Acceder por índice.** Cada elemento tiene una posición (índice), empezando en 0. precios[0] es el primer elemento, precios[1] el segundo, y así.

```python
precios[0]
```

**len() y append().** len(lista) devuelve la cantidad de elementos. lista.append(valor) agrega un elemento nuevo al final.

```python
precios.append(180000)
len(precios)
```
</Concepto>

<PythonTask
  id="listas"
  enunciado={"Agrega 95000 a la lista precios con append, y asigna a resultado la cantidad total de elementos con len()."}
  preparacion={"precios = [450000, 12000, 25000, 180000]"}
  inicial={"precios.append(95000)\nresultado = None"}
  solucion={"precios.append(95000)\nresultado = len(precios)"}
  pruebas={"import numbers\nesperado = 5\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={[]}
  pistas={["append agrega un elemento al final de la lista.", "len devuelve cuántos elementos tiene una lista."]}
/>

<Debrief>
Después de precios.append(95000), la lista tiene 5 elementos: resultado = len(precios) = 5.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/06-diccionarios.mdx`:
~~~~mdx
---
titulo: "Diccionarios"
tiempo: 14
---

<Concepto>
Un diccionario guarda pares clave-valor: en vez de acceder a un elemento por su posición (como en una lista), se accede por un nombre (la clave).

Es una forma natural de representar un registro con varios campos -- por ejemplo, un producto con su nombre, precio y stock.

<Sintaxis lenguaje="python" codigo={"diccionario = {\"clave\": valor}"} />

**Crear un diccionario.** Se escribe entre llaves, con cada clave entre comillas seguida de : y su valor, separando los pares con comas.

```python
producto = {"nombre": "Notebook", "precio": 450000}
```

**Acceder a un valor por su clave.** diccionario["clave"] devuelve el valor asociado a esa clave. Si la clave no existe, da un error.

```python
producto["precio"]
```

**Agregar o modificar una clave.** Asignar un valor a diccionario["clave"] agrega esa clave si no existía, o actualiza su valor si ya existía.

```python
producto["stock"] = 3
```
</Concepto>

<PythonTask
  id="diccionarios"
  enunciado={"Agrega la clave 'categoria' con el valor 'tecnologia', y asigna a resultado el precio del producto."}
  preparacion={"producto = {\"nombre\": \"Notebook\", \"precio\": 450000, \"stock\": 3}"}
  inicial={"producto[\"categoria\"] = \"tecnologia\"\nresultado = None"}
  solucion={"producto[\"categoria\"] = \"tecnologia\"\nresultado = producto[\"precio\"]"}
  pruebas={"import numbers\nesperado = 450000\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={[]}
  pistas={["Para agregar una clave, asígnale un valor con corchetes: diccionario[\"clave\"] = valor.", "Para leer un valor, usa el nombre de su clave entre corchetes."]}
/>

<Debrief>
resultado = producto["precio"] = 450000. Agregar la clave categoria no cambia el precio ya guardado.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/07-tuplas.mdx`:
~~~~mdx
---
titulo: "Tuplas"
tiempo: 10
---

<Concepto>
Una tupla es una colección ordenada, como una lista, pero no se puede modificar después de creada -- ni agregar, ni quitar, ni cambiar un elemento.

Se usan para representar valores que van juntos y no deberían cambiar por separado, como las coordenadas de un punto o un par de valores fijos.

<Sintaxis lenguaje="python" codigo={"tupla = (valor1, valor2)"} />

**Crear una tupla.** Se escriben los valores entre paréntesis, separados por comas -- muy parecido a una lista, pero con paréntesis en vez de corchetes.

```python
punto = (10, 20)
```

**Acceder por índice.** Igual que en una lista, cada posición se accede con un índice que empieza en 0.

```python
punto[0]
```

**Por que son inmutables.** Intentar hacer punto[0] = 5 da un error -- una tupla no permite cambiar sus elementos una vez creada, a diferencia de una lista.
</Concepto>

<PythonTask
  id="tuplas"
  enunciado={"Asigna a resultado la suma de los dos elementos de la tupla punto."}
  preparacion={"punto = (10, 20)"}
  inicial={"resultado = None"}
  solucion={"resultado = punto[0]+punto[1]"}
  pruebas={"import numbers\nesperado = 30\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={[]}
  pistas={["Los elementos de una tupla se leen por posición, empezando en 0.", "Suma el elemento de la posición 0 con el de la posición 1."]}
/>

<Debrief>
resultado = punto[0]+punto[1] = 10+20 = 30.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/08-listas-anidadas.mdx`:
~~~~mdx
---
titulo: "Listas anidadas y de diccionarios"
tiempo: 14
---

<Concepto>
Una lista puede contener cualquier tipo de valor, incluidos otros diccionarios o listas. Una lista de diccionarios, donde cada diccionario tiene las mismas claves, es la forma más natural de representar una tabla de datos en Python puro -- antes de conocer pandas.

Cada elemento de la lista es una fila, y cada clave del diccionario es una columna.

<Sintaxis lenguaje="python" codigo={"tabla = [{\"col1\": valor, \"col2\": valor}, {...}]"} />

**Una lista de diccionarios.** Cada elemento de la lista es un diccionario independiente -- no hace falta que todos tengan exactamente las mismas claves, aunque para representar una tabla conviene que si.

```python
ventas = [{"producto": "Notebook", "monto": 450000}, {"producto": "Mouse", "monto": 12000}]
```

**Acceder a un elemento y después a una clave.** Primero se accede a la posición de la lista, y después a la clave del diccionario en esa posición: lista[índice]["clave"].

```python
ventas[0]["producto"]
```

**Recorrer con un for (adelanto).** La próxima lección muestra cómo recorrer una colección con un for -- con una lista de diccionarios, eso permite procesar cada fila una por una.
</Concepto>

<PythonTask
  id="listas-anidadas"
  enunciado={"Asigna a resultado el producto de la segunda venta de la lista (índice 1)."}
  preparacion={"ventas = [{\"producto\": \"Notebook\", \"monto\": 450000}, {\"producto\": \"Mouse\", \"monto\": 12000}]"}
  inicial={"resultado = None"}
  solucion={"resultado = ventas[1][\"producto\"]"}
  pruebas={"import numbers\nesperado = \"Mouse\"\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={[]}
  pistas={["La lista ventas tiene diccionarios: primero eliges uno por su posición.", "Después lees la clave producto de ese diccionario."]}
/>

<Debrief>
resultado = ventas[1]["producto"] = "Mouse".
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/09-if-else.mdx`:
~~~~mdx
---
titulo: "if / else"
tiempo: 14
---

<Concepto>
if permite que un programa tome decisiones: ejecuta un bloque de código solo si una condición es verdadera.

else agrega una alternativa para cuando la condición es falsa -- entre los dos cubren los dos caminos posibles de una decisión simple.

<Sintaxis lenguaje="python" codigo={"if condicion:\n    # se ejecuta si es verdadera\nelse:\n    # se ejecuta si es falsa"} />

**if simple.** El bloque debajo de if (con sangría, indentado) solo se ejecuta si la condición es verdadera. Si es falsa, se lo salta por completo.

```python
if stock < 5:
    print("Reponer")
```

**if / else.** Agregando else, se define que hacer cuando la condición NO se cumple -- siempre se ejecuta uno de los dos bloques, nunca ninguno ni los dos.

```python
if stock < 5:
    estado = "Reponer"
else:
    estado = "OK"
```

**elif para más de dos casos.** Cuando hacen falta más de dos caminos, elif (contracción de else if) agrega condiciones adicionales antes del else final.
</Concepto>

<PythonTask
  id="if-else"
  enunciado={"Asigna a resultado el texto 'Reponer' si stock es menor a 5, y 'OK' si no, usando if/else."}
  preparacion={"stock = 3"}
  inicial={"resultado = None"}
  solucion={"if stock < 5:\n    resultado = \"Reponer\"\nelse:\n    resultado = \"OK\""}
  pruebas={"import numbers\nesperado = \"Reponer\"\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={[]}
  pistas={["La condición compara stock con 5.", "Cada camino del if y del else asigna su propio texto a resultado."]}
/>

<Debrief>
Cómo stock (3) es menor a 5, resultado debe ser "Reponer".
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/10-for.mdx`:
~~~~mdx
---
titulo: "for"
tiempo: 14
---

<Concepto>
for recorre una colección (una lista, por ejemplo) y ejecuta un bloque de código una vez por cada elemento, sin tener que escribir manualmente cada acceso por índice.

Es la forma más común de procesar todos los elementos de una lista uno por uno -- por ejemplo, para acumular un total.

<Sintaxis lenguaje="python" codigo={"for elemento in coleccion:\n    # se ejecuta una vez por elemento"} />

**for básico.** En cada vuelta, la variable después de for toma el valor del siguiente elemento de la colección, hasta recorrerla completa.

```python
for monto in [450000, 12000, 25000]:
    print(monto)
```

**Acumular un total dentro de un for.** Una variable creada antes del for (por ejemplo, en 0) se puede ir actualizando en cada vuelta para acumular una suma.

```python
total = 0
for monto in montos:
    total = total + monto
```

**Recorrer una lista de diccionarios.** Si la colección es una lista de diccionarios, en cada vuelta se puede acceder a las claves del diccionario actual.
</Concepto>

<PythonTask
  id="for"
  enunciado={"Completa el for para que sume cada monto a total (reemplaza pass por total = total + monto), y asigna el total final a resultado."}
  preparacion={"montos = [450000, 12000, 25000]"}
  inicial={"total = 0\nfor monto in montos:\n    pass  # suma monto a total\nresultado = total"}
  solucion={"total = 0\nfor monto in montos:\n    total = total + monto\nresultado = total"}
  pruebas={"import numbers\nesperado = 487000\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={[]}
  pistas={["Dentro del for, cada vuelta tiene un monto distinto.", "Reemplaza pass por una línea que sume ese monto a total."]}
/>

<Debrief>
resultado = 450000+12000+25000 = 487000.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/11-while.mdx`:
~~~~mdx
---
titulo: "while"
tiempo: 12
---

<Concepto>
while repite un bloque de código mientras una condición siga siendo verdadera -- a diferencia de for, no sabe de antemano cuántas veces va a repetir.

Es útil cuando la cantidad de repeticiones depende de un cálculo que va cambiando, no de recorrer una colección de tamaño fijo.

<Sintaxis lenguaje="python" codigo={"while condicion:\n    # se repite mientras sea verdadera"} />

**while básico.** Antes de cada vuelta, Python revisa la condición -- si es verdadera, ejecuta el bloque y vuelve a revisar; si es falsa, sigue con lo que viene después del while.

```python
contador = 0
while contador < 3:
    contador = contador + 1
```

**Cuidado con los loops infinitos.** Si la condición nunca se vuelve falsa (por ejemplo, si te olvidas de actualizar la variable dentro del bloque), el while se repite para siempre y el programa se queda colgado.

**Contar repeticiones dentro de un while.** Igual que con for, se puede usar una variable adicional para contar cuántas vueltas se hicieron.
</Concepto>

<PythonTask
  id="while"
  enunciado={"El código ya reduce el stock de a 3 unidades por venta mientras alcance. Ejecútalo y asigna a resultado la cantidad de ventas realizadas."}
  preparacion={"stock = 20"}
  inicial={"ventas = 0\nwhile stock >= 3:\n    stock = stock - 3\n    ventas = ventas + 1\nresultado = ventas"}
  solucion={"ventas = 0\nwhile stock >= 3:\n    stock = stock - 3\n    ventas = ventas + 1\nresultado = ventas"}
  pruebas={"import numbers\nesperado = 6\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={[]}
  pistas={["El while ya está completo: ejecútalo y mira cuántas veces se repite.", "Cada vuelta suma una venta y resta 3 unidades al stock."]}
/>

<Debrief>
Con stock inicial de 20, se pueden hacer 6 ventas de 3 unidades (18 en total), quedando 2 unidades -- menos que 3, así que el while se detiene ahí. resultado = 6.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/12-funciones.mdx`:
~~~~mdx
---
titulo: "Funciones"
tiempo: 16
---

<Concepto>
Una función agrupa un bloque de código reutilizable bajo un nombre, para no repetir la misma lógica varias veces. Se define con def y puede recibir parametros.

return indica que valor devuelve la función cuando se la llama -- sin return, la función no devuelve nada útil para usar después.

<Sintaxis lenguaje="python" codigo={"def nombre_funcion(parametro1, parametro2):\n    return resultado"} />

**Definir una función.** def, el nombre de la función, y sus parametros entre paréntesis. El bloque indentado debajo es el cuerpo de la función.

```python
def calcular_total(precio, cantidad):
    return precio*cantidad
```

**Llamar una función.** Se escribe el nombre de la función seguido de los valores entre paréntesis, en el mismo orden que los parametros definidos.

```python
calcular_total(450000, 3)
```

**Guardar el resultado en una variable.** El valor que devuelve return se puede asignar a una variable, igual que el resultado de cualquier otra expresión.

```python
total = calcular_total(450000, 3)
```
</Concepto>

<PythonTask
  id="funciones"
  enunciado={"Completa la función calcular_total para que devuelva precio multiplicado por cantidad."}
  preparacion={"precio = 450000\ncantidad = 3"}
  inicial={"def calcular_total(precio, cantidad):\n    return None  # completa\n\nresultado = calcular_total(precio, cantidad)"}
  solucion={"def calcular_total(precio, cantidad):\n    return precio * cantidad\n\nresultado = calcular_total(precio, cantidad)"}
  pruebas={"import numbers\nesperado = 1350000\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={[]}
  pistas={["return es lo que la función devuelve a quien la llama.", "Cambia el None del return por el cálculo con los dos parámetros."]}
/>

<Debrief>
calcular_total debe hacer return precio*cantidad; llamada con 450000 y 3, devuelve 1350000.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/13-series.mdx`:
~~~~mdx
---
titulo: "Series"
tiempo: 12
---

<Concepto>
pandas es la librería más usada para trabajar con datos tabulares en Python. Su estructura más simple es la Series: una columna de datos, cada uno con una posición (índice).

Se parece a una lista, pero trae funciones ya construidas para operar sobre todos sus valores a la vez, sin necesidad de escribir un for.

<Sintaxis lenguaje="python" codigo={"serie = pd.Series([valor1, valor2, valor3])"} />

**Crear una Series.** pd.Series(lista) convierte una lista común en una Series de pandas.

```python
import pandas as pd
calificaciones = pd.Series([5,3,4,2,4])
```

**Operaciones sobre toda la Series.** Funciones como .sum(), .mean(), .max() y .min() operan sobre todos los valores a la vez, sin necesidad de un for.

```python
calificaciones.sum()
```

**Escalares de pandas y conversión explicita.** El resultado de .sum() (y de otras funciones similares) es un número especial de pandas, no un int común de Python -- conviene envolverlo en int(...) o float(...) antes de usarlo como respuesta final.

```python
int(calificaciones.sum())
```
</Concepto>

<PythonTask
  id="series"
  enunciado={"Asigna a resultado la suma de calificaciones, convertida a int con int(...)."}
  preparacion={"import pandas as pd\ncalificaciones = pd.Series([5,3,4,2,4])"}
  inicial={"resultado = None"}
  solucion={"resultado = int(calificaciones.sum())"}
  pruebas={"import numbers\nesperado = 18\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["Una Series tiene métodos para resumir sus valores, como .sum().", "Convierte el resultado con int(...) para que sea un número de Python."]}
/>

<Debrief>
resultado = int(calificaciones.sum()) = 5+3+4+2+4 = 18.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/14-dataframe.mdx`:
~~~~mdx
---
titulo: "DataFrame"
tiempo: 14
---

<Concepto>
Un DataFrame es una tabla completa: filas y columnas, donde cada columna es una Series. Es la estructura que vas a usar la gran mayoría del tiempo en pandas.

Se puede crear a partir de un diccionario donde cada clave es el nombre de una columna y cada valor es una lista con los datos de esa columna.

<Sintaxis lenguaje="python" codigo={"df = pd.DataFrame({\"columna\": [valores]})"} />

**Crear un DataFrame desde un diccionario.** Cada clave del diccionario se convierte en el nombre de una columna, y su lista de valores en los datos de esa columna -- todas las listas deben tener la misma cantidad de elementos.

```python
encuesta = pd.DataFrame({"respondent_id":[1,2,3],"calificacion":[5,3,4]})
```

**Acceder a una columna.** df["columna"] devuelve esa columna como una Series -- se le pueden aplicar las mismas funciones que a cualquier Series (.sum(), .mean(), etc.).

```python
encuesta["calificacion"]
```

**Un DataFrame combina varias Series.** Internamente, cada columna de un DataFrame es una Series -- por eso todo lo aprendido sobre Series se aplica directo a las columnas de un DataFrame.
</Concepto>

<PythonTask
  id="dataframe"
  enunciado={"Asigna a resultado la suma de la columna calificacion del DataFrame encuesta, convertida a int."}
  preparacion={"import pandas as pd\nencuesta = pd.DataFrame({\"respondent_id\":[1,2,3,4,5],\"edad\":[25,34,19,45,31],\"calificacion\":[5,3,4,2,4],\"canal\":[\"web\",\"tienda\",\"web\",\"telefono\",\"web\"]})"}
  inicial={"resultado = None"}
  solucion={"resultado = int(encuesta[\"calificacion\"].sum())"}
  pruebas={"import numbers\nesperado = 18\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["Primero selecciona la columna calificacion con corchetes.", "Después súmala y conviértela con int(...)."]}
/>

<Debrief>
resultado = int(encuesta["calificacion"].sum()) = 5+3+4+2+4 = 18.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/15-explorar-dataframe.mdx`:
~~~~mdx
---
titulo: "Explorar un DataFrame"
tiempo: 12
---

<Concepto>
Antes de trabajar con un DataFrame que no conoces, conviene explorarlo: cuántas filas y columnas tiene, qué tipo de dato guarda cada columna, y cómo se ven las primeras filas.

head(), shape e info() son las tres herramientas más usadas para esa primera mirada.

<Sintaxis lenguaje="python" codigo={"df.shape"} />

**head(): las primeras filas.** df.head() devuelve las primeras 5 filas por defecto -- df.head(3) devuelve las primeras 3. Sirve para dar un vistazo rápido sin imprimir la tabla completa.

```python
encuesta.head(3)
```

**shape: filas y columnas.** df.shape devuelve una tupla (cantidad_de_filas, cantidad_de_columnas). df.shape[0] da solo la cantidad de filas.

```python
encuesta.shape
```

**info(): tipos de dato.** df.info() muestra un resumen de cada columna: su nombre, cuantos valores no nulos tiene, y su tipo de dato -- muy útil para detectar columnas con datos faltantes antes de trabajar con ellas.
</Concepto>

<PythonTask
  id="explorar-dataframe"
  enunciado={"Asigna a resultado la cantidad de filas del DataFrame encuesta, usando shape."}
  preparacion={"import pandas as pd\nencuesta = pd.DataFrame({\"respondent_id\":[1,2,3,4,5],\"edad\":[25,34,19,45,31],\"calificacion\":[5,3,4,2,4],\"canal\":[\"web\",\"tienda\",\"web\",\"telefono\",\"web\"]})"}
  inicial={"resultado = None"}
  solucion={"resultado = encuesta.shape[0]"}
  pruebas={"import numbers\nesperado = 5\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["shape devuelve una tupla: (filas, columnas).", "La cantidad de filas es el primer elemento de esa tupla."]}
/>

<Debrief>
resultado = encuesta.shape[0] = 5.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/16-cargar-csv-excel.mdx`:
~~~~mdx
---
titulo: "Cargar datos desde CSV y Excel"
tiempo: 14
---

<Concepto>
Hasta ahora los DataFrames se armaron a mano con pd.DataFrame(...). En la practica, los datos casi siempre llegan desde un archivo -- un CSV exportado de un sistema, o una planilla de Excel.

pd.read_csv() lee un archivo CSV y lo convierte directamente en un DataFrame. Cuando el archivo no viene de disco sino de texto en memoria, io.StringIO lo envuelve para que read_csv lo pueda leer igual.

<Sintaxis lenguaje="python" codigo={"pd.read_csv(ruta_o_buffer)"} />

**Un CSV es texto con comas.** Cada línea es una fila y cada valor separado por coma es una columna. La primera línea suele ser el encabezado con los nombres de columna.

**Leer un CSV en memoria con io.StringIO.** io.StringIO envuelve un string para que se comporte como un archivo -- así read_csv puede leerlo sin que exista un archivo real en disco.

```python
import pandas as pd
import io

texto_csv = "producto,precio\nMouse,12000\nTeclado,25000"
ventas = pd.read_csv(io.StringIO(texto_csv))
```

**read_excel para archivos de Excel.** pd.read_excel("archivo.xlsx") funciona igual que read_csv pero para hojas de cálculo -- requiere el archivo real en disco, algo que este curso no puede simular en el navegador, pero se usa exactamente así en tu propia computadora.

**Primeras filas con head().** Después de cargar cualquier archivo conviene mirar las primeras filas con head() antes de seguir trabajando.
</Concepto>

<PythonTask
  id="cargar-csv-excel"
  enunciado={"Carga texto_csv con pd.read_csv(io.StringIO(...)) y asigna a resultado la cantidad de filas del DataFrame resultante."}
  preparacion={"import pandas as pd\nimport io"}
  inicial={"texto_csv = \"producto,precio,stock\\nMouse,12000,10\\nTeclado,25000,4\\nMonitor,150000,2\"\nresultado = None"}
  solucion={"texto_csv = \"producto,precio,stock\\nMouse,12000,10\\nTeclado,25000,4\\nMonitor,150000,2\"\nresultado = pd.read_csv(io.StringIO(texto_csv)).shape[0]"}
  pruebas={"import numbers\nesperado = 3\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["io.StringIO envuelve el texto para que read_csv lo lea como un archivo.", "Después de cargarlo, la cantidad de filas está en shape."]}
/>

<Debrief>
resultado = pd.read_csv(io.StringIO(texto_csv)).shape[0] = 3, porque el CSV tiene 3 filas de datos además del encabezado.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/17-seleccionar-columnas.mdx`:
~~~~mdx
---
titulo: "Seleccionar columnas"
tiempo: 12
---

<Concepto>
Elegir columnas específicas de un DataFrame es una de las operaciones más comunes -- ya sea para quedarte con una sola (una Series) o con varias (un DataFrame más chico).

La forma de seleccionar cambia levemente según si queres una columna o varias a la vez.

<Sintaxis lenguaje="python" codigo={"df[\"columna\"]"} />

**Una columna: Series.** df["columna"] devuelve esa columna como una Series.

```python
encuesta["canal"]
```

**Varias columnas: DataFrame.** Pasando una lista de nombres de columna entre corchetes dobles, df[["col1","col2"]] devuelve un DataFrame más chico con solo esas columnas.

```python
encuesta[["respondent_id", "canal"]]
```

**Convertir una columna a lista.** serie.tolist() convierte una Series en una lista común de Python -- útil para comparar o mostrar los valores sin el índice de pandas.

```python
encuesta["canal"].tolist()
```
</Concepto>

<PythonTask
  id="seleccionar-columnas"
  enunciado={"Asigna a resultado la columna canal convertida a lista con .tolist()."}
  preparacion={"import pandas as pd\nencuesta = pd.DataFrame({\"respondent_id\":[1,2,3,4,5],\"edad\":[25,34,19,45,31],\"calificacion\":[5,3,4,2,4],\"canal\":[\"web\",\"tienda\",\"web\",\"telefono\",\"web\"]})"}
  inicial={"resultado = None"}
  solucion={"resultado = encuesta[\"canal\"].tolist()"}
  pruebas={"import numbers\nesperado = [\"web\", \"tienda\", \"web\", \"telefono\", \"web\"]\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["Selecciona la columna canal con corchetes y su nombre entre comillas.", "Una Series se convierte en lista con .tolist()."]}
/>

<Debrief>
resultado = encuesta["canal"].tolist() = ["web","tienda","web","telefono","web"].
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/18-loc-iloc.mdx`:
~~~~mdx
---
titulo: "loc e iloc"
tiempo: 14
---

<Concepto>
loc e iloc seleccionan filas (y opcionalmente columnas) de un DataFrame. La diferencia está en cómo se indica la posición: loc usa etiquetas, iloc usa posiciones numéricas.

Mientras el DataFrame no tenga un índice personalizado, iloc[0] y loc[0] suelen coincidir -- pero conceptualmente son cosas distintas, y vale la pena distinguirlas desde el principio.

<Sintaxis lenguaje="python" codigo={"df.iloc[posicion]"} />

**iloc: por posición.** df.iloc[0] devuelve la primera fila del DataFrame, sin importar cómo se llame su índice -- funciona igual que acceder a una lista por posición.

```python
encuesta.iloc[0]
```

**Combinar con una columna.** df.iloc[posición]["columna"] devuelve el valor de esa columna en esa fila específica.

```python
encuesta.iloc[3]["canal"]
```

**loc: por etiqueta.** df.loc[etiqueta] busca la fila cuyo índice sea exactamente esa etiqueta -- si el índice son los números por defecto (0, 1, 2...), loc y iloc coinciden, pero loc también funciona con indices con nombres.
</Concepto>

<PythonTask
  id="loc-iloc"
  enunciado={"Asigna a resultado el canal de la cuarta fila (posición 3, empezando en 0) usando iloc."}
  preparacion={"import pandas as pd\nencuesta = pd.DataFrame({\"respondent_id\":[1,2,3,4,5],\"edad\":[25,34,19,45,31],\"calificacion\":[5,3,4,2,4],\"canal\":[\"web\",\"tienda\",\"web\",\"telefono\",\"web\"]})"}
  inicial={"resultado = None"}
  solucion={"resultado = encuesta.iloc[3][\"canal\"]"}
  pruebas={"import numbers\nesperado = \"telefono\"\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["iloc selecciona por posición, empezando en 0.", "La cuarta fila es la posición 3; de esa fila, lee la columna canal."]}
/>

<Debrief>
resultado = encuesta.iloc[3]["canal"] = "telefono".
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/19-filtros-booleanos.mdx`:
~~~~mdx
---
titulo: "Filtros booleanos"
tiempo: 16
---

<Concepto>
Una condición sobre una columna (como encuesta["calificacion"] >= 4) no devuelve un solo valor, sino una Series de True/False -- una por cada fila. Esa máscara booleana se puede usar para filtrar el DataFrame.

Es la forma más común de responder preguntas como «¿cuántas filas cumplen tal condición?» o «muéstrame solo las filas que...».

<Sintaxis lenguaje="python" codigo={"df[df[\"columna\"] > valor]"} />

**Crear una máscara booleana.** encuesta["calificacion"] >= 4 devuelve una Series de True/False, una por fila, según si esa fila cumple la condición.

```python
encuesta["calificacion"] >= 4
```

**Filtrar con la máscara.** Pasando esa máscara entre corchetes al DataFrame, df[máscara] devuelve solo las filas donde la máscara es True.

```python
encuesta[encuesta["calificacion"] >= 4]
```

**Combinar condiciones con & y |.** Para combinar más de una condición sobre un DataFrame se usan & (y) y | (o) en vez de and/or, con cada condición entre paréntesis.

```python
(encuesta["calificacion"] >= 4) & (encuesta["canal"] == "web")
```
</Concepto>

<PythonTask
  id="filtros-booleanos"
  enunciado={"Asigna a resultado la cantidad de respuestas con calificacion mayor o igual a 4."}
  preparacion={"import pandas as pd\nencuesta = pd.DataFrame({\"respondent_id\":[1,2,3,4,5],\"edad\":[25,34,19,45,31],\"calificacion\":[5,3,4,2,4],\"canal\":[\"web\",\"tienda\",\"web\",\"telefono\",\"web\"]})"}
  inicial={"resultado = None"}
  solucion={"resultado = int(encuesta[encuesta[\"calificacion\"] >= 4].shape[0])"}
  pruebas={"import numbers\nesperado = 3\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["Una comparación sobre una columna devuelve True o False por fila.", "Usa esa comparación entre corchetes para filtrar, y cuenta las filas que quedan."]}
/>

<Debrief>
resultado = int(encuesta[encuesta["calificacion"] >= 4].shape[0]) = 3 (las calificaciones 5, 4 y 4).
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/20-crear-columnas.mdx`:
~~~~mdx
---
titulo: "Crear columnas nuevas"
tiempo: 14
---

<Concepto>
Agregar una columna calculada a partir de otras es una de las transformaciones más frecuentes -- por ejemplo, marcar qué respuestas fueron de clientes satisfechos.

Asignar a df["columna_nueva"] crea la columna si no existía, aplicando la operación a cada fila automáticamente.

<Sintaxis lenguaje="python" codigo={"df[\"nueva\"] = df[\"col1\"] operador df[\"col2\"]"} />

**Asignar una columna nueva.** df["nueva"] = expresión crea la columna nueva -- la expresión se calcula fila por fila, sin necesidad de un for.

```python
encuesta["satisfecho"] = encuesta["calificacion"] >= 4
```

**Operaciones entre columnas.** Se pueden combinar dos o más columnas con operadores aritméticos o de comparación, igual que con Series sueltas.

```python
encuesta["calificacion"] * 2
```

**Sumar una columna booleana.** Al sumar una columna de True/False, pandas cuenta cada True como 1 y cada False como 0 -- una forma rápida de contar cuántas filas cumplen una condición.

```python
int(encuesta["satisfecho"].sum())
```
</Concepto>

<PythonTask
  id="crear-columnas"
  enunciado={"Crea la columna satisfecho (calificacion >= 4) y asigna a resultado la cantidad de respuestas satisfechas, sumando esa columna."}
  preparacion={"import pandas as pd\nencuesta = pd.DataFrame({\"respondent_id\":[1,2,3,4,5],\"edad\":[25,34,19,45,31],\"calificacion\":[5,3,4,2,4],\"canal\":[\"web\",\"tienda\",\"web\",\"telefono\",\"web\"]})"}
  inicial={"encuesta[\"satisfecho\"] = encuesta[\"calificacion\"] >= 4\nresultado = None"}
  solucion={"encuesta[\"satisfecho\"] = encuesta[\"calificacion\"] >= 4\nresultado = int(encuesta[\"satisfecho\"].sum())"}
  pruebas={"import numbers\nesperado = 3\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["La columna satisfecho ya tiene True o False por respuesta.", "Al sumar una columna de True y False, cada True cuenta como 1."]}
/>

<Debrief>
resultado = int(encuesta["satisfecho"].sum()) = 3.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/21-apply.mdx`:
~~~~mdx
---
titulo: "apply"
tiempo: 16
---

<Concepto>
Cuando la transformación que necesitas no es una simple operación aritmética o de comparación, apply permite usar una función propia y aplicarla a cada valor de una columna.

Primero se define la función (con las lecciones de funciones ya vistas), y después se la pasa a .apply() sin llamarla (sin paréntesis).

<Sintaxis lenguaje="python" codigo={"df[\"columna\"].apply(funcion)"} />

**Definir la función a aplicar.** La función recibe un solo valor (el de la celda) y devuelve el valor transformado.

```python
def grupo_edad(e):
    return "joven" if e < 30 else "adulto"
```

**Aplicarla con .apply().** df["columna"].apply(función) llama a esa función una vez por cada valor de la columna, y devuelve una Series nueva con los resultados.

```python
encuesta["edad"].apply(grupo_edad)
```

**Guardar el resultado como columna nueva.** Igual que con cualquier transformación, el resultado de apply se puede asignar directamente a una columna nueva del DataFrame.

```python
encuesta["grupo"] = encuesta["edad"].apply(grupo_edad)
```
</Concepto>

<PythonTask
  id="apply"
  enunciado={"Completa grupo_edad para que devuelva 'joven' si la edad es menor a 30, y si no, 'adulto'. Aplícala con apply y asigna a resultado la cantidad de 'joven'."}
  preparacion={"import pandas as pd\nencuesta = pd.DataFrame({\"respondent_id\":[1,2,3,4,5],\"edad\":[25,34,19,45,31],\"calificacion\":[5,3,4,2,4],\"canal\":[\"web\",\"tienda\",\"web\",\"telefono\",\"web\"]})"}
  inicial={"def grupo_edad(e):\n    return None  # completa: \"joven\" si e < 30, sino \"adulto\"\n\nencuesta[\"grupo\"] = encuesta[\"edad\"].apply(grupo_edad)\nresultado = None"}
  solucion={"def grupo_edad(e):\n    if e < 30:\n        return \"joven\"\n    return \"adulto\"\n\nencuesta[\"grupo\"] = encuesta[\"edad\"].apply(grupo_edad)\nresultado = int((encuesta[\"grupo\"] == \"joven\").sum())"}
  pruebas={"import numbers\nesperado = 2\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["La función recibe una edad y devuelve un texto: usa un if para decidir cuál.", "Después de apply, cuenta las filas cuyo grupo es 'joven'."]}
/>

<Debrief>
Las edades son 25,34,19,45,31 -- joven (menor a 30): 25 y 19, es decir 2.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/22-limpieza-texto.mdx`:
~~~~mdx
---
titulo: "Limpieza de texto con str"
tiempo: 12
---

<Concepto>
Los datos que llegan de sistemas reales casi nunca estan prolijos: categorias escritas distinto (" Tecnologia", "TECNOLOGIA", "tecnologia") terminan contando como grupos separados en un groupby si no se normalizan antes.

pandas trae los mismos metodos de texto de Python (strip, upper, lower) pero aplicados a una columna completa a traves de .str.

<Sintaxis lenguaje="python" codigo={"df[\"columna\"].str.strip().str.lower()"} />

**.str.strip() saca espacios de los bordes.** Quita espacios en blanco al principio y al final del texto, no los que estan en el medio.

```python
categorias = pd.Series([" Tecnologia", "Hogar ", "tecnologia"])
categorias.str.strip()
```

**.str.lower() normaliza mayúsculas.** Convierte todo el texto a minúsculas para que "Tecnologia" y "TECNOLOGIA" queden iguales.

```python
categorias.str.strip().str.lower()
```

**Encadenar metodos de texto.** Los metodos .str se pueden encadenar en la misma línea, igual que otros metodos de pandas.
</Concepto>

<PythonTask
  id="limpieza-texto"
  enunciado={"Normaliza categorias quitando espacios y pasando a minúsculas, y asigna a resultado la cantidad de categorias distintas (únicas) que quedan."}
  preparacion={"import pandas as pd"}
  inicial={"categorias = pd.Series([\" Tecnologia\", \"TECNOLOGIA \", \"tecnologia\", \"Hogar\"])\nresultado = None"}
  solucion={"categorias = pd.Series([\" Tecnologia\", \"TECNOLOGIA \", \"tecnologia\", \"Hogar\"])\nresultado = int(categorias.str.strip().str.lower().nunique())"}
  pruebas={"import numbers\nesperado = 2\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["Con .str se aplican funciones de texto a toda la Series: strip quita espacios y lower pasa a minúsculas.", "nunique cuenta cuántos valores distintos quedan."]}
/>

<Debrief>
resultado = int(categorias.str.strip().str.lower().nunique()) = 2 ("tecnologia" y "hogar"), porque las tres primeras categorias son la misma una vez normalizadas.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/23-fechas.mdx`:
~~~~mdx
---
titulo: "Fechas con to_datetime"
tiempo: 14
---

<Concepto>
Una fecha guardada como texto ("2026-03-15") no se puede comparar ni ordenar como fecha real hasta que pandas la convierte con pd.to_datetime().

Una vez convertida, se puede extraer el año o el mes de cada fecha, y filtrar un rango completo con comparaciones normales.

<Sintaxis lenguaje="python" codigo={"df[\"columna\"] = pd.to_datetime(df[\"columna\"])"} />

**Convertir texto a fecha.** pd.to_datetime() reconoce formatos comunes de fecha y los convierte a un tipo datetime que pandas sabe ordenar y comparar.

```python
ventas["fecha"] = pd.to_datetime(ventas["fecha"])
```

**Extraer año y mes con .dt.** .dt da acceso a partes de la fecha: .dt.year, .dt.month, .dt.day.

```python
ventas["fecha"].dt.month
```

**Filtrar por rango de fechas.** Una vez que la columna es datetime, se puede filtrar igual que con números: mayor o igual que una fecha y menor que otra.

```python
ventas[(ventas["fecha"] >= "2026-03-01") & (ventas["fecha"] < "2026-04-01")]
```
</Concepto>

<PythonTask
  id="fechas"
  enunciado={"Filtra ventas para quedarte solo con las fechas de marzo de 2026 y asigna a resultado la suma de monto de esas filas."}
  preparacion={"import pandas as pd"}
  inicial={"ventas = pd.DataFrame({\"fecha\": [\"2026-02-20\", \"2026-03-05\", \"2026-03-18\", \"2026-04-02\"], \"monto\": [10000, 20000, 15000, 30000]})\nventas[\"fecha\"] = pd.to_datetime(ventas[\"fecha\"])\nresultado = None"}
  solucion={"ventas = pd.DataFrame({\"fecha\": [\"2026-02-20\", \"2026-03-05\", \"2026-03-18\", \"2026-04-02\"], \"monto\": [10000, 20000, 15000, 30000]})\nventas[\"fecha\"] = pd.to_datetime(ventas[\"fecha\"])\nresultado = int(ventas[(ventas[\"fecha\"] >= \"2026-03-01\") & (ventas[\"fecha\"] < \"2026-04-01\")][\"monto\"].sum())"}
  pruebas={"import numbers\nesperado = 35000\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["La columna fecha ya es de tipo fecha: se puede comparar con un texto como \"2026-03-01\".", "Filtra las filas desde el 1 de marzo y antes del 1 de abril, y suma el monto."]}
/>

<Debrief>
resultado = int(ventas[(ventas["fecha"] >= "2026-03-01") & (ventas["fecha"] &lt; "2026-04-01")]["monto"].sum()) = 35000 (20000 + 15000), las dos ventas de marzo.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/24-ordenar.mdx`:
~~~~mdx
---
titulo: "Ordenar datos"
tiempo: 10
---

<Concepto>
sort_values ordena un DataFrame según el valor de una o más columnas -- ascendente por defecto, o descendente si se lo indica.

Igual que la mayoría de las funciones de pandas, sort_values no modifica el DataFrame original: devuelve uno nuevo, que hay que guardar en una variable si se lo quiere conservar.

<Sintaxis lenguaje="python" codigo={"df.sort_values(\"columna\", ascending=False)"} />

**Ordenar ascendente.** df.sort_values("columna") ordena de menor a mayor por esa columna -- es el comportamiento por defecto.

```python
encuesta.sort_values("calificacion")
```

**Ordenar descendente.** Pasando ascending=False, el orden queda de mayor a menor.

```python
encuesta.sort_values("calificacion", ascending=False)
```

**Combinar con iloc.** Después de ordenar, iloc[0] sobre el resultado da la fila con el valor más alto (o más bajo, según el orden elegido) de esa columna.
</Concepto>

<PythonTask
  id="ordenar"
  enunciado={"Ordena encuesta por calificacion de forma descendente, y asigna a resultado el respondent_id de la primera fila de ese resultado."}
  preparacion={"import pandas as pd\nencuesta = pd.DataFrame({\"respondent_id\":[1,2,3,4,5],\"edad\":[25,34,19,45,31],\"calificacion\":[5,3,4,2,4],\"canal\":[\"web\",\"tienda\",\"web\",\"telefono\",\"web\"]})"}
  inicial={"resultado = None"}
  solucion={"resultado = int(encuesta.sort_values(\"calificacion\", ascending=False).iloc[0][\"respondent_id\"])"}
  pruebas={"import numbers\nesperado = 1\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["sort_values ordena por una columna; ascending=False ordena de mayor a menor.", "De la primera fila del resultado, lee respondent_id."]}
/>

<Debrief>
resultado = int(encuesta.sort_values("calificacion", ascending=False).iloc[0]["respondent_id"]) = 1 (la calificacion más alta, 5, es única y corresponde al respondent_id 1).
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/25-groupby.mdx`:
~~~~mdx
---
titulo: "groupby"
tiempo: 16
---

<Concepto>
groupby agrupa las filas de un DataFrame según el valor de una columna, para calcular resúmenes por grupo en vez de sobre toda la tabla -- por ejemplo, el total de ventas por region.

Después de agrupar, se elige una columna a resumir y una función de agregación (como sum) para obtener un resultado por grupo.

<Sintaxis lenguaje="python" codigo={"df.groupby(\"columna\")[\"otra_columna\"].sum()"} />

**Agrupar y sumar.** df.groupby("region")["monto"].sum() agrupa las filas por region y suma el monto de cada grupo, devolviendo una Series indexada por region.

```python
ventas.groupby("region")["monto"].sum()
```

**Acceder a un grupo específico.** Sobre el resultado agrupado, .loc["etiqueta"] devuelve el valor de ese grupo en particular.

```python
ventas.groupby("region")["monto"].sum().loc["norte"]
```

**Otras funciones de agregación.** Además de sum(), se pueden usar mean(), count(), max(), min() de la misma forma, sobre el resultado de groupby.
</Concepto>

<PythonTask
  id="groupby"
  enunciado={"Agrupa ventas por region, suma el monto de cada grupo, y asigna a resultado el total de la region 'norte'."}
  preparacion={"import pandas as pd\nventas = pd.DataFrame({\"fecha\":[\"01/03/2026\",\"02/03/2026\",\"01/03/2026\",\"02/03/2026\"],\"region\":[\"norte\",\"norte\",\"sur\",\"sur\"],\"monto\":[100000,150000,80000,120000]})"}
  inicial={"resultado = None"}
  solucion={"resultado = int(ventas.groupby(\"region\")[\"monto\"].sum().loc[\"norte\"])"}
  pruebas={"import numbers\nesperado = 250000\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["groupby agrupa las filas; después eliges la columna monto y la sumas.", "El resultado tiene un valor por región: lee el de norte con .loc."]}
/>

<Debrief>
resultado = int(ventas.groupby("region")["monto"].sum().loc["norte"]) = 100000+150000 = 250000.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/26-agg.mdx`:
~~~~mdx
---
titulo: "agg"
tiempo: 16
---

<Concepto>
Cuando hacen falta varias funciones de resumen a la vez (por ejemplo, suma y promedio juntos), agg permite pedirlas todas en una sola línea, en vez de escribir un groupby por cada una.

Se le pasa una lista con los nombres de las funciones a calcular, y devuelve una tabla con una columna por cada una.

<Sintaxis lenguaje="python" codigo={"df.groupby(\"columna\")[\"otra\"].agg([\"sum\",\"mean\"])"} />

**Varias funciones de resumen a la vez.** agg(["sum","mean"]) calcula la suma y el promedio de cada grupo, devolviendo un DataFrame con esas dos columnas.

```python
ventas.groupby("region")["monto"].agg(["sum","mean"])
```

**Acceder a un valor específico del resultado.** Sobre el resultado de agg, .loc["grupo","columna"] permite acceder al valor de una función en particular para un grupo en particular.

```python
resumen.loc["sur","mean"]
```

**agg también acepta un diccionario.** Para aplicar funciones distintas a columnas distintas, agg también acepta un diccionario (&#123;"columna": "función"&#125;) -- por ahora alcanza con la lista de funciones sobre una sola columna.
</Concepto>

<PythonTask
  id="agg"
  enunciado={"Usa agg([\"sum\",\"mean\"]) para calcular la suma y el promedio de monto por region, y asigna a resultado el promedio de la region 'sur'."}
  preparacion={"import pandas as pd\nventas = pd.DataFrame({\"fecha\":[\"01/03/2026\",\"02/03/2026\",\"01/03/2026\",\"02/03/2026\"],\"region\":[\"norte\",\"norte\",\"sur\",\"sur\"],\"monto\":[100000,150000,80000,120000]})"}
  inicial={"resumen = ventas.groupby(\"region\")[\"monto\"].agg([\"sum\",\"mean\"])\nresultado = None"}
  solucion={"resumen = ventas.groupby(\"region\")[\"monto\"].agg([\"sum\",\"mean\"])\nresultado = float(resumen.loc[\"sur\",\"mean\"])"}
  pruebas={"import numbers\nesperado = 100000\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["La tabla resumen ya tiene una fila por región y las columnas sum y mean.", "Con .loc se lee una celda indicando la fila y la columna."]}
/>

<Debrief>
resultado = float(resumen.loc["sur","mean"]) = (80000+120000)/2 = 100000.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/27-value-counts.mdx`:
~~~~mdx
---
titulo: "value_counts"
tiempo: 10
---

<Concepto>
value_counts cuenta cuántas veces aparece cada valor distinto de una columna -- una forma rápida de responder «¿cuántas filas hay de cada categoría?», sin necesidad de un groupby completo.

Es especialmente útil para columnas categóricas, como una region, un canal o un estado.

<Sintaxis lenguaje="python" codigo={"df[\"columna\"].value_counts()"} />

**Contar valores distintos.** df["columna"].value_counts() devuelve una Series con cada valor distinto como índice, y la cantidad de veces que aparece como valor -- ordenada de más a menos frecuente.

```python
ventas["region"].value_counts()
```

**Acceder a un valor específico.** Igual que con groupby, .loc["etiqueta"] sobre el resultado devuelve la cantidad de esa categoria en particular.

```python
ventas["region"].value_counts().loc["norte"]
```

**value_counts frente a groupby.** value_counts es un atajo para cuando solo necesitas contar filas por categoria -- si necesitas sumar o promediar otra columna por grupo, hace falta groupby.
</Concepto>

<PythonTask
  id="value-counts"
  enunciado={"Asigna a resultado la cantidad de filas con region 'norte', usando value_counts sobre la columna region."}
  preparacion={"import pandas as pd\nventas = pd.DataFrame({\"fecha\":[\"01/03/2026\",\"02/03/2026\",\"01/03/2026\",\"02/03/2026\"],\"region\":[\"norte\",\"norte\",\"sur\",\"sur\"],\"monto\":[100000,150000,80000,120000]})"}
  inicial={"resultado = None"}
  solucion={"resultado = int(ventas[\"region\"].value_counts().loc[\"norte\"])"}
  pruebas={"import numbers\nesperado = 2\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["value_counts devuelve cuántas veces aparece cada valor de la columna.", "Lee el conteo de norte con .loc."]}
/>

<Debrief>
resultado = int(ventas["region"].value_counts().loc["norte"]) = 2.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/28-merge.mdx`:
~~~~mdx
---
titulo: "merge"
tiempo: 16
---

<Concepto>
merge combina dos DataFrames en uno solo, cruzando filas según el valor de una columna en común -- por ejemplo, agregar el nombre del encargado de cada region a una tabla de ventas.

Es el equivalente en pandas a un JOIN de SQL: conecta datos que viven en tablas separadas a traves de una clave compartida.

<Sintaxis lenguaje="python" codigo={"df1.merge(df2, on=\"columna_en_comun\")"} />

**Dos tablas relacionadas por una columna.** En este ejemplo, ventas tiene una columna region, y regiones tiene esa misma columna region junto con el nombre del encargado.

```python
regiones = pd.DataFrame({"region":["norte","sur"],"encargado":["Camila","Diego"]})
```

**merge con on.** df1.merge(df2, on="columna") cruza ambas tablas por esa columna, agregando a cada fila de df1 los datos de df2 que correspondan según ese valor.

```python
ventas.merge(regiones, on="region")
```

**Cantidad de filas del resultado.** Si cada valor de la columna de cruce aparece una sola vez en la segunda tabla (como region en regiones), el resultado tiene la misma cantidad de filas que la primera tabla.
</Concepto>

<PythonTask
  id="merge"
  enunciado={"Combina ventas con regiones usando merge por la columna region, y asigna a resultado la cantidad de filas del resultado."}
  preparacion={"import pandas as pd\nregiones = pd.DataFrame({\"region\":[\"norte\",\"sur\"],\"encargado\":[\"Camila\",\"Diego\"]})\nventas = pd.DataFrame({\"region\":[\"norte\",\"sur\",\"norte\"],\"monto\":[100000,80000,150000]})"}
  inicial={"resultado = None"}
  solucion={"resultado = int(ventas.merge(regiones, on=\"region\").shape[0])"}
  pruebas={"import numbers\nesperado = 3\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["merge une dos tablas por una columna que tienen en común: on=\"region\".", "Después cuenta las filas del resultado."]}
/>

<Debrief>
resultado = int(ventas.merge(regiones, on="region").shape[0]) = 3, porque cada una de las 3 filas de ventas encuentra su region correspondiente en regiones.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/29-valores-nulos.mdx`:
~~~~mdx
---
titulo: "Valores nulos"
tiempo: 14
---

<Concepto>
Los datos reales casi siempre tienen huecos: una lectura de sensor que fallo, una encuesta sin responder. pandas representa esos valores faltantes como None (en Python) o NaN (Not a Number, dentro de una columna numérica).

Antes de calcular cualquier resumen, conviene saber cuantos valores nulos hay y en que columnas, para decidir si conviene eliminarlos o reemplazarlos.

<Sintaxis lenguaje="python" codigo={"df[\"columna\"].isna()"} />

**Detectar valores nulos con isna().** df["columna"].isna() devuelve una Series de True/False -- True donde el valor es nulo. Sumar esa Series cuenta cuantos nulos hay.

```python
sensor["temperatura"].isna()
```

**Eliminar filas con nulos: dropna().** df.dropna() elimina todas las filas que tengan al menos un valor nulo en cualquier columna.

```python
sensor.dropna()
```

**Reemplazar nulos: fillna().** df["columna"].fillna(valor) reemplaza los nulos de esa columna por un valor específico -- por ejemplo, el promedio de la columna.

```python
sensor["temperatura"].fillna(sensor["temperatura"].mean())
```
</Concepto>

<PythonTask
  id="valores-nulos"
  enunciado={"Asigna a resultado la cantidad de valores nulos en la columna temperatura, usando isna().sum()."}
  preparacion={"import pandas as pd\nsensor = pd.DataFrame({\"timestamp\":[1,2,3,4],\"temperatura\":[22.5, None, 21.0, None]})"}
  inicial={"resultado = None"}
  solucion={"resultado = int(sensor[\"temperatura\"].isna().sum())"}
  pruebas={"import numbers\nesperado = 2\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["isna devuelve True donde falta el valor.", "Sumar esos True cuenta los valores faltantes."]}
/>

<Debrief>
resultado = int(sensor["temperatura"].isna().sum()) = 2.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/30-duplicados.mdx`:
~~~~mdx
---
titulo: "Duplicados"
tiempo: 12
---

<Concepto>
Una fila duplicada (idéntica a otra en todas sus columnas) suele ser un error de carga de datos -- por ejemplo, una misma lectura de sensor registrada dos veces.

pandas trae funciones específicas para detectarlas y eliminarlas sin tener que compararlas a mano.

<Sintaxis lenguaje="python" codigo={"df.drop_duplicates()"} />

**Detectar duplicados con duplicated().** df.duplicated() devuelve True en cada fila que sea idéntica a una fila anterior -- la primera aparición siempre da False.

```python
sensor.duplicated()
```

**Eliminar duplicados.** df.drop_duplicates() devuelve un DataFrame nuevo sin las filas duplicadas, conservando la primera aparición de cada una.

```python
sensor.drop_duplicates()
```

**Contar cuántas quedan.** Sobre el resultado de drop_duplicates(), .shape[0] da la cantidad de filas que quedaron después de la limpieza.
</Concepto>

<PythonTask
  id="duplicados"
  enunciado={"Ya se eliminaron los duplicados en la variable limpio. Asigna a resultado la cantidad de filas que quedaron."}
  preparacion={"import pandas as pd\nsensor = pd.DataFrame({\"timestamp\":[1,2,2,3],\"temperatura\":[22.5, 21.0, 21.0, 20.0]})"}
  inicial={"limpio = sensor.drop_duplicates()\nresultado = None"}
  solucion={"limpio = sensor.drop_duplicates()\nresultado = len(limpio)"}
  pruebas={"import numbers\nesperado = 3\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["La tabla limpio ya no tiene filas repetidas.", "Cuenta sus filas con len o con shape."]}
/>

<Debrief>
La fila con timestamp 2 y temperatura 21.0 aparece dos veces idéntica -- drop_duplicates() deja solo la primera, quedando 3 filas en total.
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/31-exportar-resultados.mdx`:
~~~~mdx
---
titulo: "Exportar resultados con to_csv"
tiempo: 12
---

<Concepto>
Después de limpiar y resumir datos, el último paso es guardarlos para que otra persona (o otra herramienta, como Excel o Power BI) los pueda usar.

to_csv() escribe un DataFrame como texto CSV; en este curso se usa sin escribir a disco, revisando directamente el texto que genera.

<Sintaxis lenguaje="python" codigo={"df.to_csv(index=False)"} />

**to_csv() genera texto CSV.** Sin especificar una ruta de archivo, to_csv() devuelve el CSV completo como un string -- útil para revisar el resultado antes de guardarlo.

```python
resumen.to_csv(index=False)
```

**index=False evita una columna extra.** Por defecto pandas agrega el índice como primera columna del CSV. index=False lo omite, dejando solo las columnas de datos.

**to_excel() para hojas de cálculo.** to_excel("archivo.xlsx", index=False) guarda el resultado como un archivo de Excel real en disco -- funciona igual en tu propia computadora.
</Concepto>

<PythonTask
  id="exportar-resultados"
  enunciado={"Genera el CSV de resumen con to_csv(index=False) y asigna a resultado la cantidad de líneas que tiene ese texto (encabezado + una línea por categoria)."}
  preparacion={"import pandas as pd"}
  inicial={"ventas = pd.DataFrame({\"categoria\": [\"Hogar\", \"Hogar\", \"Tecnologia\"], \"monto\": [10000, 5000, 20000]})\nresumen = ventas.groupby(\"categoria\", as_index=False)[\"monto\"].sum()\nresultado = None"}
  solucion={"ventas = pd.DataFrame({\"categoria\": [\"Hogar\", \"Hogar\", \"Tecnologia\"], \"monto\": [10000, 5000, 20000]})\nresumen = ventas.groupby(\"categoria\", as_index=False)[\"monto\"].sum()\nresultado = len(resumen.to_csv(index=False).strip().split(\"\\n\"))"}
  pruebas={"import numbers\nesperado = 3\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["to_csv(index=False) devuelve el CSV como un texto.", "Separa ese texto en líneas y cuéntalas; quita antes el salto de línea final."]}
/>

<Debrief>
resultado = len(resumen.to_csv(index=False).strip().split("\n")) = 3: una línea de encabezado (categoria,monto) más dos categorias (Hogar y Tecnologia).
</Debrief>
~~~~

`content/casos/clases-de-python/misiones/32-visualizacion-datos.mdx`:
```mdx
---
titulo: "Visualización de datos"
tiempo: 12
---

<Concepto>
Una tabla de números es difícil de interpretar de un vistazo -- un gráfico bien elegido comunica un patrón mucho más rápido. Esta lección es conceptual: graficar con matplotlib u otra librería queda fuera de esta primera versión del laboratorio, pero vale la pena saber que herramienta usar para que pregunta.

La elección del tipo de gráfico depende de la pregunta que quieres responder, no de qué gráfico te parece más lindo.

**Gráfico de barras: comparar categorias.** Sirve para comparar un valor entre categorias distintas -- por ejemplo, el total de ventas por region. Es el equivalente visual de un groupby con sum().

**Gráfico de líneas: evolución en el tiempo.** Sirve para mostrar cómo cambia un valor a lo largo del tiempo -- por ejemplo, ventas diarias durante un mes. El eje horizontal casi siempre es una fecha.

**Histograma: distribución de un valor.** Sirve para ver cómo se reparten los valores de una columna numérica -- por ejemplo, cuántas respuestas de una encuesta cayeron en cada rango de calificacion.

**matplotlib y seaborn.** matplotlib es la librería base de gráficos en Python; seaborn se construye sobre ella y ofrece gráficos más prolijos con menos código. Ambas funcionan sobre DataFrames y Series de pandas directamente.
</Concepto>

<LecturaTask
  id="visualizacion-datos"
  pregunta={"Si quisieras mostrar cómo cambió la calificación promedio de una encuesta mes a mes durante un año, ¿qué tipo de gráfico usarías?"}
  respuesta={"Un gráfico de líneas: la pregunta es sobre la evolución de un valor a lo largo del tiempo, que es exactamente el caso de uso de un gráfico de líneas."}
/>
```

`content/casos/clases-de-python/misiones/33-python-vs-excel-sql.mdx`:
```mdx
---
titulo: "Python y pandas frente a Excel y SQL"
tiempo: 12
---

<Concepto>
Si ya viste SQL Aula y Excel Aula, llegaste al tercer vertice de un mismo triangulo: tres formas distintas de trabajar con datos, cada una mejor para un tipo de tarea distinto.

Esta última lección conecta los tres cursos: no se trata de elegir uno para siempre, sino de saber cuál conviene según el problema.

**Excel: rápido para explorar y reportar.** Para un análisis puntual, un reporte chico, o mirar datos por primera vez, una hoja de cálculo sigue siendo lo más rápido de armar -- sin escribir una línea de código.

**SQL: cuando los datos viven en una base de datos.** Si los datos ya estan en una base de datos (o crecen a millones de filas, o los consultan muchas personas a la vez), SQL es la herramienta correcta para traer exactamente lo que necesitas.

**Python y pandas: cuando el análisis se vuelve complejo o repetitivo.** Cuando un análisis tiene muchos pasos, se repite seguido, o combina datos de varias fuentes (una base de datos, un archivo, una API), Python y pandas permiten automatizar todo ese proceso de punta a punta -- algo que ni Excel ni SQL solos pueden hacer.

**Las tres se combinan en el trabajo real.** Es común traer datos de una base con SQL, procesarlos con pandas, y exportar el resultado final a una hoja de cálculo para compartirlo con alguien que no usa Python -- ninguna de las tres reemplaza del todo a las otras dos.
</Concepto>

<LecturaTask
  id="python-vs-excel-sql"
  pregunta={"Te piden un análisis que combina datos de una base de datos con un archivo Excel que te mandó otro equipo, y el proceso hay que repetirlo cada semana. ¿Qué herramienta usarías como base, y por qué?"}
  respuesta={"Python y pandas: es el único de los tres que permite automatizar de punta a punta un proceso que combina múltiples fuentes y se repite -- se puede leer de la base con SQL desde Python, cargar el archivo Excel, combinarlos, y dejar todo el proceso listo para correr de nuevo la semana siguiente sin rehacer nada a mano."}
/>
```

`content/casos/clases-de-python/misiones/34-proyecto-final-pandas.mdx`:
```mdx
---
titulo: "Proyecto final: limpieza y análisis de ventas"
tiempo: 25
---

<Concepto>
Este es el proyecto final del curso: un archivo de ventas exportado de un sistema real, con filas duplicadas, una categoria sin dato, texto inconsistente y fechas en distintos meses.

El ejercicio combina todo lo visto: cargar el CSV, quitar duplicados y nulos, normalizar texto, convertir fechas, resumir con groupby, exportar el resultado y volver a leerlo -- el ciclo completo de un análisis con pandas.

<Sintaxis lenguaje="python" codigo={"cargar -> limpiar -> transformar -> agrupar -> exportar"} />

**El dataset viene sucio a propósito.** Una fila duplicada exacta, una categoria vacía, la misma categoria escrita de tres formas distintas, y ventas de dos meses distintos -- son los problemas más comunes en datos reales, todos juntos en un solo archivo.

**El orden de limpieza importa.** Primero se quitan duplicados y filas sin categoria (así no se arrastran errores al resto del proceso), después se convierte la fecha y se normaliza el texto, y recien al final se agrupa.

**Cerrar el ciclo con to_csv y read_csv.** Exportar el resumen con to_csv(index=False) y volver a leerlo con read_csv(io.StringIO(...)) prueba que el archivo exportado es válido -- es el mismo paso que harías antes de compartirlo con otra persona.
</Concepto>

<PythonTask
  id="proyecto-final-pandas"
  enunciado={"A partir de ventas_crudo: quita filas duplicadas y filas sin categoria, convierte fecha a datetime y quédate solo con enero de 2026, normaliza categoria (sin espacios, en minúsculas), agrupa por categoria sumando monto, exporta ese resumen con to_csv(index=False) y vuelve a leerlo con pd.read_csv(io.StringIO(...)). Asigna a resultado el monto total de la categoria tecnologia en ese resumen final."}
  preparacion={"import pandas as pd\nimport io"}
  inicial={"texto_csv = \"fecha,categoria,monto\\n2026-01-05, Tecnologia,50000\\n2026-01-05, Tecnologia,50000\\n2026-01-12,HOGAR,8000\\n2026-01-20,hogar ,12000\\n2026-02-02,Tecnologia,30000\\n2026-02-10,,9000\"\nventas_crudo = pd.read_csv(io.StringIO(texto_csv))\nresultado = None"}
  solucion={"texto_csv = \"fecha,categoria,monto\\n2026-01-05, Tecnologia,50000\\n2026-01-05, Tecnologia,50000\\n2026-01-12,HOGAR,8000\\n2026-01-20,hogar ,12000\\n2026-02-02,Tecnologia,30000\\n2026-02-10,,9000\"\nventas_crudo = pd.read_csv(io.StringIO(texto_csv))\nventas = ventas_crudo.drop_duplicates().dropna(subset=[\"categoria\"]).copy()\nventas[\"fecha\"] = pd.to_datetime(ventas[\"fecha\"])\nventas = ventas[(ventas[\"fecha\"] >= \"2026-01-01\") & (ventas[\"fecha\"] < \"2026-02-01\")].copy()\nventas[\"categoria\"] = ventas[\"categoria\"].str.strip().str.lower()\nresumen = ventas.groupby(\"categoria\", as_index=False)[\"monto\"].sum()\nfinal = pd.read_csv(io.StringIO(resumen.to_csv(index=False)))\nresultado = int(final.loc[final[\"categoria\"] == \"tecnologia\", \"monto\"].iloc[0])"}
  pruebas={"import numbers\nesperado = 50000\nif isinstance(esperado, numbers.Number) and isinstance(resultado, numbers.Number):\n    assert abs(resultado - esperado) < 0.0001, \"resultado no tiene el valor esperado: revisa el cálculo.\"\nelse:\n    assert resultado == esperado, \"resultado no tiene el valor esperado: revisa el cálculo.\""}
  paquetes={["pandas"]}
  pistas={["Avanza paso a paso y revisa la tabla después de cada uno: duplicados, filas sin categoría, fechas de enero.", "Antes de agrupar, deja la categoría sin espacios y en minúsculas, para que HOGAR y hogar sean el mismo grupo."]}
/>

<Debrief>
Tras quitar el duplicado (fila 2, idéntica a la 1) y la fila sin categoria (monto 9000), y filtrar solo enero, quedan: 2026-01-05 Tecnologia 50000, 2026-01-12 HOGAR 8000, 2026-01-20 hogar 12000 (la venta de Tecnologia del 02-02 queda fuera por ser de febrero). Al normalizar categoria, HOGAR y hogar se unen en hogar (20000) y tecnologia queda con 50000 -- ese es el resultado.
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
  - clases-de-excel
  - despachos-rapidos
  - clases-de-sql
  - minimarkets-del-sur
  - clases-de-python
  - tienda-online-pewen
  - clinica-cordillera-central
  - proyecto-final
```

En `apps/web/src/db/release.test.ts`, `2 rutas, 9 casos` pasa a `2 rutas, 10 casos` (las dos veces), y `toHaveLength(9)` pasa a `toHaveLength(10)`.

- [ ] **Step 4: Validar**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content validate`
Expected: `[content] ok: 2 rutas, 10 casos, 126 misiones`. Las 32 soluciones de Python corren en Pyodide y pasan su prueba.

Compara cada `.mdx` y `caso.yaml` con `diff` contra este plan: deben ser idénticos.

Run: `docker compose run --rm tools pnpm -r --if-present test`
Expected: PASS en todos los paquetes (content 95, web 336).

- [ ] **Step 5: Commit**

```bash
git add content apps/web/src/db/release.test.ts
git commit -m "feat(contenido): clases de python, treinta y cuatro lecciones traidas del aula de la v1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: e2e y documentación

**Files:**
- Modify: `e2e/tests/progreso.ts`, `e2e/tests/clases.spec.ts`, `e2e/tests/pewen.spec.ts`, `e2e/tests/clinica.spec.ts`, `e2e/tests/proyecto-final.spec.ts`, `e2e/calentar.ts`, `README.md`

**Interfaces:**
- Consumes: los ids de la Task 2.
- Produces:
  - `MISIONES["clases-de-python"]`, y `CLASES` con las tres clases;
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
export const CLASES = new Set(["clases-de-excel", "clases-de-sql", "clases-de-python"]);

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

Desde ahora, el Caso 3 exige completar antes las clases de Python:
- en `pewen.spec.ts`, la lista de casos termina en `"minimarkets-del-sur", "clases-de-python"]`, y el nombre de la prueba empieza con "con los casos 0, 1 y 2 y sus clases completos:";
- en `clinica.spec.ts` y `proyecto-final.spec.ts`, `"minimarkets-del-sur", "tienda-online-pewen"` pasa a `"minimarkets-del-sur", "clases-de-python", "tienda-online-pewen"`.

En `e2e/calentar.ts`, en `RUTAS`, antes de `"/casos/tienda-online-pewen"`, agrega:
```ts
  "/casos/clases-de-python",
  "/casos/clases-de-python/02-operadores",
```

- [ ] **Step 2: La prueba de las clases de Python**

Agrega al final de `e2e/tests/clases.spec.ts`:
```ts
test("con el Caso 2 completo: una lección de Python se resuelve en el editor y no revela el valor esperado", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(300_000);
  const email = await registrarse(page, "Josefa Paillalef");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur"]) await completarCaso(page, admin, ip, email, caso);
  await aprobar(page, ip, "clases-de-python", MISIONES["clases-de-python"].slice(0, 1));

  await page.goto("/casos/clases-de-python/02-operadores");
  await expect(page.getByText("> lección 2/34", { exact: false })).toBeVisible();
  await expect(page.getByText("Python listo").first()).toBeVisible({ timeout: 150_000 });
  await expect(page.locator('.cm-content[aria-label="Código Python"]')).toBeVisible({ timeout: 30_000 });
  const codigo = page.getByLabel("Código Python");
  await codigo.fill("resultado = precio * descuento");
  const fallida = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await fallida;
  await expect(page.getByText("resultado no tiene el valor esperado: revisa el cálculo.")).toBeVisible();
  await expect(page.getByText("405000")).toHaveCount(0);
  await codigo.fill("resultado = precio * (1 - descuento)");
  const aprobada = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;
  await expect(page.getByRole("heading", { name: "Lección aprobada" })).toBeVisible();
});
```

Run: `npm run test:e2e -- tests/clases.spec.ts tests/pewen.spec.ts`
Expected: `5 passed`.

- [ ] **Step 3: README**

`## Clases` en `README.md` queda:
```markdown
## Clases

- **Qué son:** antes del caso que las aplica, una lección por tema, traída de las aulas de la v1. En `caso.yaml` llevan `tipo: clases` y solo `slug`, `titulo`, `dataset` y `misiones`: no tienen empresa, entregable, rúbrica ni certificado propio.
  - Se completan al aprobar todas sus lecciones y habilitan el caso siguiente de la ruta. Cuentan para el certificado de la ruta, pero no van al portafolio.
  - Cada lección es una misión con `<Concepto>`, `<Sintaxis>` (la forma general, que no se ejecuta), ejemplos, un ejercicio y un `<Debrief>` sin consejo de entrevista.
  - La última lección no tiene que ser sin guía: el caso siguiente cumple ese papel.
  - En la ruta Data Analyst: clases de Excel antes del Caso 1, de SQL antes del Caso 2 y de Python antes del Caso 3.
- **Planillas propias:** una tarea de planilla (`SheetTask`) toma su hoja de un CSV de `datos/` (`hoja`) o la trae escrita en la lección (`grilla`, fila por fila desde A1), como las aulas de la v1.
- **Lecturas:** `<LecturaTask pregunta respuesta />` es una lección sin validación automática, como las lecturas de la v1: se piensa la pregunta y, al marcarla como completada, aparece la respuesta del curso.
- **Importar un aula de la v1:**
  1. Exporta sus datos a JSON, con el Node de tu equipo: `node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-sql > tmp/aula-sql.json`.
  2. Escribe el borrador: `docker compose run --rm tools pnpm --filter @syntaxerror/content importar <sql|excel|python> /app/tmp/aula-<aula>.json /app/content/casos/<carpeta> <lección,lección,...>`.
  3. Revisa el borrador: tildes que el diccionario no corrige solo (`mas`, `aun`, `que` en preguntas), dos pistas por lección que orienten sin dar la respuesta, y el título y el dataset de `caso.yaml`. Después corre `npm run content:validate`.
- **El importador** (`packages/content/src/importar/`) tiene un formato común (`leccion.ts`: consultas, planillas y lecturas) y un adaptador por aula (`aula-sql.ts`, `aula-excel.ts`, `aula-python.ts`). Para Power BI se agrega su adaptador.
  - En Excel, la v1 guardaba solo el valor esperado de cada celda: la fórmula de la solución se saca de la pista ("En D2 escribe =B2*C2"), se repite fila abajo cuando la pista dice "repite la misma lógica", y el validador comprueba que dé el valor esperado.
  - En Python, la v1 comparaba una variable (`resultado`) con un valor esperado: eso pasa a ser la prueba del `PythonTask`, con tolerancia para números y sin revelar el valor. La solución se saca de la explicación ("resultado = len(precios) = 5"); si no está, el importador la marca con `# REVISAR` y el validador no la deja pasar hasta que la revisión la escriba. Los ejemplos de código dependen de la preparación de la lección, así que se muestran como bloques de solo lectura.
  - Corrige tildes con un diccionario y nombres propios de los datos (Concepción, Tomás), pero no toca los valores entre comillas simples, los nombres de tablas y columnas de SQL ni las planillas, para que los ejercicios sigan calzando con sus soluciones.
  - Descarta las pistas de la v1 que traían la consulta o la fórmula: el validador rechaza una pista de SQL o Python con la solución completa.
```

- [ ] **Step 4: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes.

Run: `npm run test:e2e`
Expected: `43 passed`. Dos corridas seguidas deben dar lo mismo.

- [ ] **Step 5: Commit**

```bash
git add e2e README.md
git commit -m "test(e2e): clases de python antes del caso 3, con una leccion resuelta en el editor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Power BI (34 lecciones), antes del Caso 4.** En la v1 son 26 prácticas en Power BI Desktop, con pasos a seguir, un dataset y una autocorrección ("Ver respuesta"), más 8 lecturas. No se pueden validar en la plataforma:
- se traen como `LecturaTask` (la pregunta de autocorrección y su respuesta), más los pasos de la práctica en el concepto;
- sus datasets van como datos descargables de las clases.

**Después:** IA para datos (14 lecciones, con quiz), que puede ir como clases propias o repartida en los casos.
