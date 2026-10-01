# Fase 3e2: Consolas. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que las consolas de trabajo (SQL, planilla y Python) acompañen a quien aprende, "como nos hubiera gustado aprender":
- editor con sintaxis coloreada, números de línea, cierre de paréntesis y comillas;
- autocompletado con las tablas, columnas y archivos del caso;
- explicaciones en español al pasar el mouse;
- errores en español con sugerencia y la línea marcada;
- tablas de pandas visibles después de ejecutar;
- ayuda de la función mientras se escribe una fórmula;
- un contrato común para las consolas que traigan las rutas futuras.

**Architecture:**
- **Contrato común** (`packages/engines/src/consola.ts`):
  - Toda consola ejecuta, valida, muestra el resultado y explica el error.
  - Los errores se entregan como `ErrorExplicado` (mensaje en español, sugerencia, línea y el mensaje original, que nunca se esconde).
  - Lo que no es error pero probablemente está mal se entrega como `Aviso`.
  - `sugerirNombre` (distancia de Levenshtein) es la base de todos los "¿Quisiste decir…?".
- **Traductores de errores, en el paquete de motores y sin interfaz:** se pueden probar con los mensajes reales de alasql, Pyodide y HyperFormula, que se sondearon antes de escribir este plan.
  - `sql-errores.ts` traduce los errores de alasql y además detecta lo que alasql deja pasar en silencio: una columna mal escrita devuelve `[{}]` y un texto sin comillas devuelve `[]`.
  - `python-errores.ts` traduce la última línea del traceback y toma la línea del código de la persona del último `File "<exec>", line N`.
  - `sheet-ayuda.ts` explica los errores de celda (`#¡DIV/0!`, `#¿NOMBRE?`…) y ofrece la ayuda de cada función.
- **Editor:**
  - CodeMirror 6, cargado con `import()` en el navegador después de hidratar. Mientras carga (o si falla) se usa el `textarea` actual, así que la página sigue estática y funciona con conexiones lentas.
  - La lógica (autocompletado, glosario, resaltado) vive en funciones puras en `apps/web/src/lib/consola/`, probadas sin navegador. El componente solo las conecta con CodeMirror.
  - Los ejemplos de código se colorean en el servidor con los mismos parsers de Lezer (sin JavaScript extra en el navegador).
- **Tablas de pandas:** después de ejecutar, el worker de Python devuelve una muestra de cada `DataFrame`/`Series` que quedó en variables (máximo 5 tablas, 10 filas cada una, con el total de filas).

**Tech Stack:**
- CodeMirror 6, con versiones exactas:
  - `@codemirror/state` 6.7.6, `@codemirror/view` 6.43.13, `@codemirror/language` 6.12.4;
  - `@codemirror/lang-sql` 6.10.0, `@codemirror/lang-python` 6.2.1;
  - `@codemirror/autocomplete` 6.20.3, `@codemirror/commands` 6.11.1;
  - `@lezer/highlight` 1.2.5.
- Motores: alasql 4.19.1, HyperFormula 3.4.0 (`esES`) y Pyodide 0.28.3 (Python 3.13, pandas).
- Pruebas: Vitest 4 y Playwright 1.55.

**Spec:** `docs/superpowers/specs/2026-09-29-syntaxerror-v2-design.md` y la propuesta aprobada, `docs/propuesta-pedagogica-data-analyst.md`, en particular:
- 10: consolas de trabajo;
- 13: una plataforma para varias rutas (contrato común de consolas);
- 2: principios (primero intentar; la frustración productiva se acompaña, no se elimina).

## Global Constraints

**Entorno y texto**
- Todo se ejecuta en contenedores. Ningún paso corre `pnpm` o `node` en el host: se usa `docker compose run --rm tools ...`.
- Las dependencias nuevas se instalan con `docker compose run --rm tools pnpm --filter <paquete> add <dep>@<versión exacta>`.
- Si los contenedores de la v1 (`cursos-*`) están arriba, ocupan los puertos 5432, 5433, 6379, 1025 y 8025. Detenlos antes con `docker compose -p cursos stop`.
- El texto visible va en español de Chile, con tildes y `¿`/`¡`, tratando de tú, sin voseo y con lenguaje neutro ("estudiante", "docente").

**Páginas**
- `/casos/[caso]` y `/casos/[caso]/[mision]` siguen con `dynamic = "error"` y se sirven con `x-nextjs-cache: HIT`.
- CodeMirror no entra en el JavaScript inicial: se carga con `import()` dentro de un efecto. Los ejemplos se colorean en el servidor (`componentes.tsx` es un componente de servidor).

**Dependencias**
- Todas las `@codemirror/*` y `@lezer/highlight` van con versión exacta (sin `^`). Dos copias de `@codemirror/state` rompen el editor con "Unrecognized extension value": se comprueba con `pnpm why`.

**Pedagogía (no se relaja)**
- **Una explicación explica el error, nunca la solución de la tarea.** Puede sugerir un nombre parecido que existe ("¿Quisiste decir «ventas»?"), recordar una regla de sintaxis o mostrar un ejemplo genérico, pero nunca la consulta, fórmula o código que aprueba la tarea.
- **El mensaje original siempre queda disponible** ("Mensaje original"), porque en el trabajo real los errores llegan en inglés y hay que aprender a leerlos.
- **Los avisos no bloquean:** la consulta se ejecuta igual y el resultado se muestra.

**Accesibilidad**
- El editor se usa solo con teclado:
  - `Tab` agrega sangría.
  - `Esc` y luego `Tab` sale del editor (modo de foco de CodeMirror).
  - `Ctrl+Espacio` abre las sugerencias.
  - Todo esto se explica en un texto bajo el editor, enlazado con `aria-describedby`.
- El editor lleva `aria-label` con su etiqueta: "Consulta SQL" o "Código Python", las mismas que ya usan las pruebas e2e.
- Los errores usan `role="alert"` y los avisos `role="status"`.
- Los colores de sintaxis cumplen contraste AA en el tema oscuro y en el claro.
- Las explicaciones al pasar el mouse también llegan por teclado, como `info` de cada sugerencia.

**Commits**
- Mensajes en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Una tarea bloqueada o el editor que todavía no carga:**
   - Una persona sin sesión abre una misión cuyo requisito no cumple. El editor se ve coloreado pero no se puede escribir (`contenteditable="false"`), igual que el `textarea` desactivado de hoy.
   - Con la tarea habilitada, `fill` de Playwright sobre "Consulta SQL" y "Código Python" sigue funcionando sobre CodeMirror, así que todas las pruebas e2e existentes pasan sin cambios.

   Test en Task 7.
2. **Una consulta correcta con alias, textos, comentarios, funciones y palabras clave en minúsculas** (`select c.nombre, SUM(v.monto) AS total -- nombres ... FROM clientes c JOIN ventas v ...`) no debe generar avisos falsos. Un aviso falso enseña algo incorrecto. Test en Task 2.
3. **Un error de Python que ocurre dentro de pandas** (el traceback termina en archivos de la biblioteca) marca la línea del código de la persona, no la de pandas.
   - Un error sin línea (tiempo agotado) no marca ninguna.
   - Un tipo de error desconocido da un mensaje genérico, sin perder el original.

   Tests en Task 3.
4. **Una fórmula a medio escribir** en minúsculas, con `;`, funciones anidadas o paréntesis dentro de un texto:
   - `=si(suma(a2:a3` muestra la ayuda de SUMA;
   - `=SI(SUMA(A2:A3);` vuelve a SI;
   - `=SI(A1="(x";` sigue en SI;
   - una referencia como `=A2` no sugiere funciones.

   Tests en Task 4.
5. **Tablas de pandas con datos reales:**
   - celdas vacías (`NaN`) y fechas;
   - más de 10 filas;
   - una `Series` sin nombre;
   - el resultado de un `groupby` (índice con nombre);
   - una tabla cuyo índice no se puede convertir en columna.

   Se muestran sin romper la ejecución (la tabla problemática se omite) y con el total real de filas. Tests en Task 6.

## Estructura de archivos

```
packages/engines/
  README.md                                       contrato de consolas y cómo agregar una
  src/consola.ts                                  ErrorExplicado, Aviso, textoDeError, distancia, sugerirNombre
  src/sql-errores.ts                              tokensSql, esquemaDe, explicarErrorSql, avisosSql
  src/sql.ts                                      ejecutarConsulta (EjecucionSql); compararSql explica errores y avisos
  src/python-errores.ts                           explicarErrorPython
  src/python.ts                                   error explicado, columnasDeArchivos, tablas de pandas
  src/python-cliente.ts                           tiempo agotado como ErrorExplicado
  src/sheet-ayuda.ts                              AYUDA_FUNCIONES, funcionEnEscritura, sugerenciasDeFuncion,
                                                  aplicarSugerencia, explicarErrorHoja
  src/sheet.ts                                    revisarHoja explica el error de la celda
apps/web/src/lib/consola/
  glosario.ts                                     explicaciones de SQL y Python; explicarPalabra
  completado.ts                                   completarSql, completarPython, variablesDe
  resaltado.ts                                    resaltar (Lezer, para servidor)
apps/web/src/components/consola/
  explicacion.tsx                                 ExplicacionError, AvisosConsola
  codigo-resaltado.tsx                            CodigoResaltado
  editor.tsx                                      EditorConsola (textarea mientras carga CodeMirror)
  motor-editor.tsx                                EditorCodeMirror (se importa con import())
apps/web/src/components/mision/
  panel-tarea.tsx                                 useTareaDeshabilitada
  sql-task.tsx, sql-ejemplo.tsx                   editor, errores explicados, avisos, tablas siempre visibles
  python-task.tsx, python-ejemplo.tsx             editor, errores explicados, tablas de pandas
  python-contexto.tsx                             expone opciones (archivos del caso)
  tablas-python.tsx                               TablasPython
  sheet-task.tsx                                  ayuda de función, sugerencias, error de celda explicado
  componentes.tsx                                 ejemplos coloreados en el servidor
apps/web/src/app/globals.css                      colores de sintaxis (tok-*) y glosario
e2e/tests/consolas.spec.ts
README.md                                         sección Consolas
```

---
### Task 1: Contrato común de las consolas

**Files:**
- Create: `packages/engines/src/consola.ts`, `packages/engines/README.md`
- Test: `packages/engines/src/consola.test.ts`
- Modify: `packages/engines/package.json` (export `./consola`)

**Interfaces:**
- Consumes: nada nuevo.
- Produces en `@syntaxerror/engines/consola`:
  - `type ErrorExplicado = { mensaje: string; sugerencia: string | null; linea: number | null; original: string }`;
  - `type Aviso = { mensaje: string; linea: number | null }`;
  - `errorSimple(mensaje: string, original?: string): ErrorExplicado`;
  - `textoDeError(error: ErrorExplicado): string`: "Línea N: mensaje sugerencia", sin la línea cuando es `null`;
  - `distancia(a: string, b: string): number`: Levenshtein sin distinguir mayúsculas;
  - `sugerirNombre(nombre: string, candidatos: Iterable<string>): string | null`.

- [ ] **Step 1: Escribir las pruebas**

`packages/engines/src/consola.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { distancia, errorSimple, sugerirNombre, textoDeError } from "./consola";

describe("distancia", () => {
  it("cuenta inserciones, borrados y cambios sin distinguir mayúsculas", () => {
    expect(distancia("venta", "ventas")).toBe(1);
    expect(distancia("SELEC", "select")).toBe(1);
    expect(distancia("grupby", "groupby")).toBe(1);
    expect(distancia("", "abc")).toBe(3);
    expect(distancia("Clientes", "clientes")).toBe(0);
  });
});

describe("sugerirNombre", () => {
  it("sugiere el candidato más parecido", () => {
    expect(sugerirNombre("venta", ["clientes", "ventas"])).toBe("ventas");
    expect(sugerirNombre("montos", ["id", "monto", "fecha"])).toBe("monto");
    expect(sugerirNombre("datos/venta.csv", ["datos/clientes.csv", "datos/ventas.csv"])).toBe("datos/ventas.csv");
  });

  it("prefiere el mismo nombre con otras mayúsculas", () => {
    expect(sugerirNombre("Clientes", ["cliente", "clientes"])).toBe("clientes");
  });

  it("no sugiere nada si no hay uno parecido, si es idéntico o si el nombre está vacío", () => {
    expect(sugerirNombre("xyz", ["clientes", "ventas"])).toBeNull();
    expect(sugerirNombre("monto", ["monto"])).toBeNull();
    expect(sugerirNombre("", ["a"])).toBeNull();
    expect(sugerirNombre("ab", [])).toBeNull();
  });

  it("en nombres cortos acepta solo una letra de diferencia", () => {
    expect(sugerirNombre("WHER", ["WHERE"])).toBe("WHERE");
    expect(sugerirNombre("WHR", ["WHERE"])).toBeNull();
  });
});

describe("textoDeError", () => {
  it("une línea, mensaje y sugerencia", () => {
    expect(textoDeError({ mensaje: "No existe nada llamado «venta».", sugerencia: "¿Quisiste decir «ventas»?", linea: 2, original: "NameError" })).toBe(
      "Línea 2: No existe nada llamado «venta». ¿Quisiste decir «ventas»?"
    );
    expect(textoDeError(errorSimple("Escribe una consulta antes de ejecutar."))).toBe("Escribe una consulta antes de ejecutar.");
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/consola.test.ts`
Expected: FAIL, "Failed to resolve import ./consola".

- [ ] **Step 3: Implementar**

`packages/engines/src/consola.ts`:
```ts
/**
 * Contrato común de las consolas de trabajo (propuesta pedagógica, secciones 10 y 13).
 *
 * Toda consola (SQL, planilla, Python y las que traigan las rutas futuras) hace cuatro cosas:
 * ejecutar, validar, mostrar el resultado y explicar el error.
 * - Ejecutar devuelve `{ ok: true, ... }` con su resultado (y `avisos` si los hay) o `{ ok: false, error }`.
 * - Validar devuelve `ResultadoTarea` (./tipos).
 * - Un error se explica con `ErrorExplicado`: en español, con sugerencia y línea, sin perder el original.
 * - Un aviso marca algo que se ejecutó pero probablemente está mal; nunca bloquea.
 *
 * Regla pedagógica: una explicación explica el error, nunca entrega la solución de la tarea.
 */
export type ErrorExplicado = { mensaje: string; sugerencia: string | null; linea: number | null; original: string };
export type Aviso = { mensaje: string; linea: number | null };

export function errorSimple(mensaje: string, original = ""): ErrorExplicado {
  return { mensaje, sugerencia: null, linea: null, original };
}

export function textoDeError(error: ErrorExplicado): string {
  const partes = [error.linea ? `Línea ${error.linea}: ${error.mensaje}` : error.mensaje];
  if (error.sugerencia) partes.push(error.sugerencia);
  return partes.join(" ");
}

export function distancia(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  let previa = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i += 1) {
    const actual = [i];
    for (let j = 1; j <= y.length; j += 1) {
      actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    previa = actual;
  }
  return previa[y.length];
}

// Un tercio del largo (mínimo 1): "venta" acepta 1 diferencia y "datos/venta.csv" hasta 5.
export function sugerirNombre(nombre: string, candidatos: Iterable<string>): string | null {
  if (!nombre) return null;
  const limite = Math.max(1, Math.floor(nombre.length / 3));
  let mejor: string | null = null;
  let menor = Number.POSITIVE_INFINITY;
  for (const candidato of candidatos) {
    if (candidato === nombre) continue;
    const valor = distancia(nombre, candidato);
    if (valor < menor) {
      mejor = candidato;
      menor = valor;
    }
  }
  return mejor !== null && menor <= limite ? mejor : null;
}
```

En `packages/engines/package.json`, agregar a `exports`:
```json
    "./consola": "./src/consola.ts",
```

- [ ] **Step 4: Documentar el contrato**

`packages/engines/README.md`:
````markdown
# @syntaxerror/engines

Motores de las consolas de trabajo: SQL (alasql), planilla (HyperFormula en español) y Python (Pyodide en un web worker).

## Contrato común (`src/consola.ts`)

Toda consola hace cuatro cosas:

1. **Ejecutar:** devuelve `{ ok: true, ... }` con su resultado, y `avisos` si hay algo que probablemente está mal, o `{ ok: false, error }`.
2. **Validar:** compara con lo esperado y devuelve `ResultadoTarea` (`{ aprobada, diagnostico }`).
3. **Mostrar el resultado:** filas, celdas, tablas de pandas o salida de texto.
4. **Explicar el error:** `ErrorExplicado` = `{ mensaje, sugerencia, linea, original }`, en español y sin perder el mensaje original.

Reglas:
- Una explicación explica el error, nunca la solución de la tarea.
- Los "¿Quisiste decir…?" salen de `sugerirNombre`, con los nombres del caso (tablas, columnas, archivos o variables).
- Los avisos nunca bloquean la ejecución.

## Agregar una consola (rutas futuras)

Una ruta nueva, como Ciberseguridad (registros) o Cloud/DevOps (terminal), agrega su consola sin rediseñar la plataforma:

1. Crea `src/<consola>.ts` con la función de ejecutar, que devuelve el resultado o un `ErrorExplicado`, y la de validar, que devuelve `ResultadoTarea`.
2. Crea `src/<consola>-errores.ts` con su traductor de errores. Sus pruebas usan los mensajes reales del motor: sondéalos antes de escribirlas.
3. Exporta ambos en `package.json`.
4. En la web:
   - agrega el bloque de contenido en `packages/content/src/esquemas.ts`;
   - crea su componente en `apps/web/src/components/mision/`, usando `PanelTarea`, `ExplicacionError`/`AvisosConsola` y, si se escribe código, `EditorConsola` con un `completar` propio.
````

- [ ] **Step 5: Correr las pruebas**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/consola.test.ts`
Expected: PASS (6 pruebas).

- [ ] **Step 6: Commit**

```bash
git add packages/engines/src/consola.ts packages/engines/src/consola.test.ts packages/engines/README.md packages/engines/package.json
git commit -m "feat(engines): contrato comun de consolas y sugerencia de nombres parecidos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Errores y avisos de SQL en español

**Files:**
- Create: `packages/engines/src/sql-errores.ts`
- Test: `packages/engines/src/sql-errores.test.ts`
- Modify: `packages/engines/src/sql.ts`, `packages/engines/src/sql.test.ts`, `packages/engines/package.json` (export `./sql-errores`)
- Create: `apps/web/src/components/consola/explicacion.tsx`
- Modify: `apps/web/src/components/mision/sql-task.tsx`, `apps/web/src/components/mision/sql-ejemplo.tsx`

**Interfaces:**
- Consumes: `ErrorExplicado`, `Aviso`, `errorSimple`, `sugerirNombre`, `textoDeError` (Task 1); `Tablas`, `ejecutarSql`, `crearBaseSql` (`sql.ts`).
- Produces en `@syntaxerror/engines/sql-errores`:
  - `type TokenSql = { tipo: "palabra" | "texto" | "numero" | "simbolo"; valor: string; linea: number; abierto?: boolean }`;
  - `type EsquemaSql = Record<string, string[]>`: tabla → columnas;
  - `tokensSql(consulta: string): TokenSql[]`, que ignora comentarios `--` y `/* */`;
  - `esquemaDe(tablas: Tablas): EsquemaSql`;
  - `explicarErrorSql(consulta: string, original: string, tablas: Tablas): ErrorExplicado`;
  - `avisosSql(consulta: string, tablas: Tablas): Aviso[]`.
- Produces en `@syntaxerror/engines/sql`:
  - `type EjecucionSql = { ok: true; filas: Fila[]; avisos: Aviso[] } | { ok: false; error: ErrorExplicado }`;
  - `ejecutarConsulta(tablas: Tablas, consulta: string, opciones?: { permitirEscritura?: boolean }): EjecucionSql`.
  - `compararSql`:
    - si la consulta falla, su diagnóstico empieza con "Tu consulta tiene un error. " seguido de `textoDeError(...)`;
    - si no coincide y hay avisos, agrega el primer aviso al final.
- Produces en `@/components/consola/explicacion`:
  - `ExplicacionError({ error }: { error: ErrorExplicado })`;
  - `AvisosConsola({ avisos }: { avisos: Aviso[] })`.

Los mensajes de alasql 4.19.1 que se traducen se sondearon con estas tablas:
- tabla inexistente: `Table does not exist: cliente`;
- función de planilla: `alasql.fn.SUMA is not a function`;
- alias inexistente: `Cannot read properties of undefined (reading 'cliente_id')`;
- errores de sintaxis: `Parse error on line 1:\n<fragmento>\n----^\nExpecting ..., got '...'`.

Lo que alasql deja pasar en silencio:
- `SELECT nombres FROM clientes` y `SELECT NOMBRE FROM clientes` devuelven `[{}]`, porque las columnas distinguen mayúsculas;
- `WHERE ciudad = Santiago` devuelve `[]`.

- [ ] **Step 1: Escribir las pruebas del traductor**

`packages/engines/src/sql-errores.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { crearBaseSql, ejecutarSql, type Tablas } from "./sql";
import { avisosSql, esquemaDe, explicarErrorSql, tokensSql } from "./sql-errores";

const tablas: Tablas = {
  clientes: [
    { id: 1, nombre: "Ferretería El Roble", ciudad: "Santiago" },
    { id: 2, nombre: "Almacén Doña Rosa", ciudad: "Temuco" },
  ],
  ventas: [
    { id: 101, cliente_id: 1, monto: 185000 },
    { id: 102, cliente_id: 2, monto: 62000 },
  ],
};

// Ejecuta de verdad para traducir el mensaje real de alasql, no uno inventado.
function explicar(consulta: string) {
  try {
    ejecutarSql(crearBaseSql(tablas), consulta);
  } catch (error) {
    return explicarErrorSql(consulta, error instanceof Error ? error.message : String(error), tablas);
  }
  throw new Error(`La consulta no falló: ${consulta}`);
}

describe("tokensSql", () => {
  it("separa palabras, textos, números y símbolos, con su línea, sin comentarios", () => {
    expect(tokensSql("SELECT nombre -- nota\nFROM clientes WHERE id >= 2 AND ciudad = 'Temuco'")).toEqual([
      { tipo: "palabra", valor: "SELECT", linea: 1 },
      { tipo: "palabra", valor: "nombre", linea: 1 },
      { tipo: "palabra", valor: "FROM", linea: 2 },
      { tipo: "palabra", valor: "clientes", linea: 2 },
      { tipo: "palabra", valor: "WHERE", linea: 2 },
      { tipo: "palabra", valor: "id", linea: 2 },
      { tipo: "simbolo", valor: ">=", linea: 2 },
      { tipo: "numero", valor: "2", linea: 2 },
      { tipo: "palabra", valor: "AND", linea: 2 },
      { tipo: "palabra", valor: "ciudad", linea: 2 },
      { tipo: "simbolo", valor: "=", linea: 2 },
      { tipo: "texto", valor: "'Temuco'", linea: 2, abierto: false },
    ]);
  });

  it("marca el texto sin comilla de cierre", () => {
    expect(tokensSql("WHERE ciudad = 'Temuco").at(-1)).toEqual({ tipo: "texto", valor: "'Temuco", linea: 1, abierto: true });
  });
});

describe("esquemaDe", () => {
  it("lista las columnas de cada tabla", () => {
    expect(esquemaDe(tablas)).toEqual({ clientes: ["id", "nombre", "ciudad"], ventas: ["id", "cliente_id", "monto"] });
  });
});

describe("explicarErrorSql", () => {
  it("tabla inexistente: sugiere la parecida y marca la línea", () => {
    expect(explicar("SELECT nombre\nFROM cliente")).toEqual({
      mensaje: "No existe una tabla llamada «cliente».",
      sugerencia: "¿Quisiste decir «clientes»?",
      linea: 2,
      original: "Table does not exist: cliente",
    });
  });

  it("tabla con otras mayúsculas: recuerda que los nombres las distinguen", () => {
    expect(explicar("SELECT nombre FROM Clientes")).toMatchObject({
      mensaje: "No existe una tabla llamada «Clientes».",
      sugerencia: "¿Quisiste decir «clientes»? Los nombres distinguen mayúsculas y minúsculas.",
    });
  });

  it("tabla sin parecido: lista las del caso", () => {
    expect(explicar("SELECT * FROM productos").sugerencia).toBe("Las tablas de este caso son: clientes, ventas.");
  });

  it("función de planilla: da el nombre en SQL", () => {
    expect(explicar("SELECT SUMA(monto) FROM ventas")).toMatchObject({
      mensaje: "SQL no conoce la función SUMA.",
      sugerencia: "En SQL se escribe SUM. SUMA es el nombre en las planillas en español.",
    });
    expect(explicar("SELECT PROMEDIO(monto) FROM ventas").sugerencia).toBe("En SQL se escribe AVG. PROMEDIO es el nombre en las planillas en español.");
  });

  it("función mal escrita: sugiere la parecida", () => {
    expect(explicar("SELECT COUNTT(*) FROM ventas")).toMatchObject({ mensaje: "SQL no conoce la función COUNTT.", sugerencia: "¿Quisiste decir COUNT?" });
  });

  it("alias o tabla inexistente antes del punto", () => {
    expect(explicar("SELECT clientes.nombre FROM clientes JOIN ventas ON venta.cliente_id = clientes.id")).toMatchObject({
      mensaje: "«venta» no es una tabla ni un alias de esta consulta.",
      sugerencia: "¿Quisiste decir «ventas»?",
      linea: 1,
    });
  });

  it("comilla sin cerrar", () => {
    expect(explicar("SELECT nombre FROM clientes WHERE ciudad = 'Santiago")).toMatchObject({
      mensaje: "Hay una comilla sin cerrar.",
      sugerencia: "Los textos van entre comillas simples y se cierran con la misma comilla: 'Santiago'.",
    });
  });

  it("paréntesis sin cerrar o de más", () => {
    expect(explicar("SELECT nombre FROM clientes WHERE (ciudad = 'Santiago'").mensaje).toBe("Falta cerrar un paréntesis.");
    expect(explicar("SELECT COUNT(*)) FROM clientes").mensaje).toBe("Sobra un paréntesis de cierre «)».");
  });

  it("coma de más antes de FROM", () => {
    expect(explicar("SELECT nombre, FROM clientes")).toMatchObject({
      mensaje: "Sobra una coma antes de FROM.",
      sugerencia: "La última columna de la lista no lleva coma.",
    });
  });

  it("cláusula sin terminar", () => {
    expect(explicar("SELECT ciudad, COUNT(*) FROM clientes GROUP BY")).toMatchObject({
      mensaje: "Después de GROUP BY falta la columna para agrupar.",
      sugerencia: "Por ejemplo: GROUP BY ciudad",
    });
    expect(explicar("SELECT * FROM clientes ORDER BY").mensaje).toBe("Después de ORDER BY falta la columna para ordenar.");
    expect(explicar("SELECT * FROM clientes WHERE").mensaje).toBe("Después de WHERE falta la condición.");
    expect(explicar("SELECT ciudad FROM clientes GROUP BY ciudad HAVING").mensaje).toBe("Después de HAVING falta la condición sobre cada grupo.");
  });

  it("LIMIT sin número", () => {
    expect(explicar("SELECT * FROM clientes LIMIT abc")).toMatchObject({ mensaje: "LIMIT necesita un número.", sugerencia: "Por ejemplo: LIMIT 10" });
  });

  it("palabra clave mal escrita", () => {
    expect(explicar("SELEC nombre FROM clientes")).toMatchObject({ mensaje: "«SELEC» no es una palabra de SQL.", sugerencia: "¿Quisiste decir SELECT?", linea: 1 });
    expect(explicar("SELECT nombre FROM clientes\nWHER ciudad = 'Temuco'")).toMatchObject({ sugerencia: "¿Quisiste decir WHERE?", linea: 2 });
  });

  it("error de sintaxis sin regla: muestra dónde se perdió SQL", () => {
    const error = explicar("SELECT nombre FROM clientes WHERE ciudad = = 'Temuco'");
    expect(error.mensaje).toMatch(/^SQL no entiende la consulta cerca de: «.+»\.$/);
    expect(error.sugerencia).toBe("Revisa que las palabras clave vayan en orden: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.");
    expect(error.original).toMatch(/^Parse error on line 1/);
  });

  it("los mensajes propios pasan tal cual", () => {
    expect(explicarErrorSql("", "Escribe una consulta antes de ejecutar.", tablas)).toEqual({
      mensaje: "Escribe una consulta antes de ejecutar.",
      sugerencia: null,
      linea: null,
      original: "Escribe una consulta antes de ejecutar.",
    });
  });

  it("un error desconocido conserva el original", () => {
    expect(explicarErrorSql("SELECT 1", "algo raro", tablas)).toEqual({
      mensaje: "La consulta no se pudo ejecutar.",
      sugerencia: "Revisa la consulta por partes: primero SELECT y FROM, y después agrega lo demás.",
      linea: null,
      original: "algo raro",
    });
  });
});

describe("avisosSql", () => {
  it("columna mal escrita", () => {
    expect(avisosSql("SELECT nombres FROM clientes", tablas)).toEqual([
      { mensaje: "No existe la columna «nombres» en las tablas de esta consulta. ¿Quisiste decir «nombre»?", linea: 1 },
    ]);
  });

  it("columna con otras mayúsculas", () => {
    expect(avisosSql("SELECT NOMBRE FROM clientes", tablas)).toEqual([
      { mensaje: "Las columnas distinguen mayúsculas y minúsculas: escribe «nombre» en vez de «NOMBRE».", linea: 1 },
    ]);
  });

  it("texto sin comillas que aparece en los datos", () => {
    expect(avisosSql("SELECT nombre FROM clientes\nWHERE ciudad = Santiago", tablas)).toEqual([
      { mensaje: "«Santiago» parece un texto: escríbelo entre comillas simples, 'Santiago'.", linea: 2 },
    ]);
  });

  it("columna que no es de la tabla indicada antes del punto", () => {
    expect(avisosSql("SELECT c.monto FROM clientes c", tablas)).toEqual([
      { mensaje: "La tabla clientes no tiene la columna «monto».", linea: 1 },
    ]);
  });

  it("calificador que no es tabla ni alias", () => {
    expect(avisosSql("SELECT x.nombre FROM clientes c", tablas)).toEqual([
      { mensaje: "«x» no es una tabla ni un alias de esta consulta.", linea: 1 },
    ]);
  });

  it("no da avisos falsos con alias, textos, comentarios, funciones y minúsculas", () => {
    const consulta = [
      "select c.nombre, SUM(v.monto) AS total -- nombres de clientes",
      "FROM clientes c JOIN ventas v ON v.cliente_id = c.id",
      "WHERE c.ciudad <> 'Santiago centro' /* otra ciudad */",
      "GROUP BY c.nombre ORDER BY total DESC LIMIT 5",
    ].join("\n");
    expect(avisosSql(consulta, tablas)).toEqual([]);
    expect(avisosSql("SELECT ciudad, COUNT(*) AS cantidad FROM clientes AS cl GROUP BY ciudad HAVING COUNT(*) > 1", tablas)).toEqual([]);
    expect(avisosSql("SELECT DISTINCT ciudad FROM clientes WHERE nombre LIKE 'A%' OR id IN (1, 2)", tablas)).toEqual([]);
  });

  it("no repite el mismo aviso", () => {
    expect(avisosSql("SELECT nombres FROM clientes ORDER BY nombres", tablas)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/sql-errores.test.ts`
Expected: FAIL, "Failed to resolve import ./sql-errores".

- [ ] **Step 3: Implementar el traductor**

`packages/engines/src/sql-errores.ts`:
```ts
import { errorSimple, sugerirNombre, type Aviso, type ErrorExplicado } from "./consola";
import type { Tablas } from "./sql";

export type TokenSql = { tipo: "palabra" | "texto" | "numero" | "simbolo"; valor: string; linea: number; abierto?: boolean };
export type EsquemaSql = Record<string, string[]>;

const PALABRAS_CLAVE = new Set([
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "IS", "NULL", "LIKE", "BETWEEN", "AS", "ON", "JOIN", "INNER",
  "LEFT", "RIGHT", "FULL", "OUTER", "CROSS", "GROUP", "BY", "ORDER", "HAVING", "LIMIT", "OFFSET", "DISTINCT", "ASC",
  "DESC", "CASE", "WHEN", "THEN", "ELSE", "END", "UNION", "ALL", "EXISTS", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
  "DELETE", "CREATE", "TABLE", "WITH", "TRUE", "FALSE", "TOP", "ANY", "SOME",
]);
const FUNCIONES_SQL = [
  "COUNT", "SUM", "AVG", "MIN", "MAX", "ROUND", "UPPER", "LOWER", "LENGTH", "LEN", "COALESCE", "ABS", "SUBSTRING",
  "SUBSTR", "TRIM", "REPLACE", "CAST", "CONCAT", "IFNULL", "NOW", "YEAR", "MONTH", "DAY", "DATE",
];
// Las planillas en español usan otros nombres: es el error más común al pasar de Excel a SQL.
const FUNCIONES_DE_PLANILLA: Record<string, string> = {
  SUMA: "SUM",
  PROMEDIO: "AVG",
  CONTAR: "COUNT",
  CONTARA: "COUNT",
  REDONDEAR: "ROUND",
  MAYUSC: "UPPER",
  MINUSC: "LOWER",
  LARGO: "LENGTH",
  ESPACIOS: "TRIM",
  SI: "CASE WHEN … THEN … ELSE … END",
};
const CLAUSULAS_PRINCIPALES = ["SELECT", "FROM", "WHERE", "GROUP", "ORDER", "HAVING", "LIMIT", "JOIN", "INNER", "LEFT", "DISTINCT", "BETWEEN", "LIKE", "DESC"];
const TRAS_LISTA = new Set(["FROM", "WHERE", "GROUP", "ORDER", "HAVING", "LIMIT"]);
const ORDEN_CLAUSULAS = "Revisa que las palabras clave vayan en orden: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT.";

export function tokensSql(consulta: string): TokenSql[] {
  const tokens: TokenSql[] = [];
  let linea = 1;
  let i = 0;
  while (i < consulta.length) {
    const caracter = consulta[i];
    const resto = consulta.slice(i);
    if (caracter === "\n") {
      linea += 1;
      i += 1;
    } else if (/\s/.test(caracter)) {
      i += 1;
    } else if (resto.startsWith("--")) {
      while (i < consulta.length && consulta[i] !== "\n") i += 1;
    } else if (resto.startsWith("/*")) {
      const fin = consulta.indexOf("*/", i + 2);
      const hasta = fin === -1 ? consulta.length : fin + 2;
      linea += (consulta.slice(i, hasta).match(/\n/g) ?? []).length;
      i = hasta;
    } else if (caracter === "'" || caracter === '"') {
      const inicio = i;
      const lineaInicio = linea;
      i += 1;
      while (i < consulta.length && consulta[i] !== caracter) {
        if (consulta[i] === "\n") linea += 1;
        i += 1;
      }
      const abierto = i >= consulta.length;
      if (!abierto) i += 1;
      tokens.push({ tipo: "texto", valor: consulta.slice(inicio, i), linea: lineaInicio, abierto });
    } else {
      const palabra = /^(?:[A-Za-z_À-ſ][\wÀ-ſ]*|`[^`]*`)/.exec(resto);
      const numero = /^\d+(?:\.\d+)?/.exec(resto);
      const simbolo = /^(?:<>|<=|>=|!=|==|\|\|)/.exec(resto);
      if (palabra) tokens.push({ tipo: "palabra", valor: palabra[0].replace(/`/g, ""), linea });
      else if (numero) tokens.push({ tipo: "numero", valor: numero[0], linea });
      else tokens.push({ tipo: "simbolo", valor: simbolo ? simbolo[0] : caracter, linea });
      i += (palabra ?? numero ?? simbolo)?.[0].length ?? 1;
    }
  }
  return tokens;
}

export function esquemaDe(tablas: Tablas): EsquemaSql {
  return Object.fromEntries(Object.entries(tablas).map(([tabla, filas]) => [tabla, Object.keys(filas[0] ?? {})]));
}

const esPalabra = (token: TokenSql | undefined, ...valores: string[]) =>
  token?.tipo === "palabra" && (valores.length === 0 || valores.includes(token.valor.toUpperCase()));
const esSimbolo = (token: TokenSql | undefined, valor: string) => token?.tipo === "simbolo" && token.valor === valor;
const esClave = (token: TokenSql | undefined) => token?.tipo === "palabra" && PALABRAS_CLAVE.has(token.valor.toUpperCase());
const esFuncion = (tokens: TokenSql[], indice: number) => esSimbolo(tokens[indice + 1], "(");

type Alcance = { tablas: Map<string, string>; alias: Set<string> };

// Primera pasada: qué nombres son tablas (o sus alias) y cuáles son alias de columnas.
function alcanceDe(tokens: TokenSql[], esquema: EsquemaSql): Alcance {
  const tablas = new Map<string, string>(Object.keys(esquema).map((tabla) => [tabla.toLowerCase(), tabla]));
  const alias = new Set<string>();
  tokens.forEach((token, indice) => {
    if (token.tipo !== "palabra" || esClave(token) || esFuncion(tokens, indice)) return;
    const previo = tokens[indice - 1];
    const tablaPrevia = (t: TokenSql | undefined) => (t?.tipo === "palabra" ? esquema[t.valor] && t.valor : undefined);
    if (esPalabra(previo, "AS")) {
      const tabla = tablaPrevia(tokens[indice - 2]);
      if (tabla) tablas.set(token.valor.toLowerCase(), tabla);
      else alias.add(token.valor.toLowerCase());
      return;
    }
    const tabla = tablaPrevia(previo);
    if (tabla) {
      tablas.set(token.valor.toLowerCase(), tabla);
      return;
    }
    const siguiente = tokens[indice + 1];
    const antesEsValor = (previo?.tipo === "palabra" && !esClave(previo)) || esSimbolo(previo, ")");
    const despuesTermina = !siguiente || esSimbolo(siguiente, ",") || esPalabra(siguiente, "FROM");
    if (antesEsValor && despuesTermina && !esSimbolo(tokens[indice - 2], ".")) alias.add(token.valor.toLowerCase());
  });
  return { tablas, alias };
}

function lineaDe(tokens: TokenSql[], valor: string): number | null {
  return tokens.find((token) => token.tipo === "palabra" && token.valor === valor)?.linea ?? null;
}

function sugerencia(nombre: string | null): string | null {
  return nombre ? `¿Quisiste decir «${nombre}»?` : null;
}

function calificadorDesconocido(tokens: TokenSql[], alcance: Alcance): TokenSql | null {
  return (
    tokens.find(
      (token, indice) =>
        token.tipo === "palabra" && esSimbolo(tokens[indice + 1], ".") && !alcance.tablas.has(token.valor.toLowerCase())
    ) ?? null
  );
}

const FALTANTES: Record<string, [string, string]> = {
  SELECT: ["Después de SELECT faltan las columnas.", "Por ejemplo: SELECT nombre, ciudad FROM clientes"],
  WHERE: ["Después de WHERE falta la condición.", "Por ejemplo: WHERE ciudad = 'Santiago'"],
  "GROUP BY": ["Después de GROUP BY falta la columna para agrupar.", "Por ejemplo: GROUP BY ciudad"],
  "ORDER BY": ["Después de ORDER BY falta la columna para ordenar.", "Por ejemplo: ORDER BY monto DESC"],
  HAVING: ["Después de HAVING falta la condición sobre cada grupo.", "Por ejemplo: HAVING COUNT(*) > 1"],
  ON: ["Después de ON falta la condición que une las tablas.", "Por ejemplo: ON ventas.cliente_id = clientes.id"],
  AND: ["Después de AND falta otra condición.", "Por ejemplo: AND monto > 100000"],
  OR: ["Después de OR falta otra condición.", "Por ejemplo: OR ciudad = 'Temuco'"],
  JOIN: ["Después de JOIN falta la tabla que quieres unir.", "Por ejemplo: JOIN ventas ON ventas.cliente_id = clientes.id"],
  LIMIT: ["LIMIT necesita un número.", "Por ejemplo: LIMIT 10"],
};

type Explicacion = Omit<ErrorExplicado, "original">;

function errorDeSintaxis(tokens: TokenSql[], esquema: EsquemaSql, original: string, lineaParser: number): Explicacion {
  const abierto = tokens.find((token) => token.tipo === "texto" && token.abierto);
  if (abierto) {
    return { mensaje: "Hay una comilla sin cerrar.", sugerencia: "Los textos van entre comillas simples y se cierran con la misma comilla: 'Santiago'.", linea: abierto.linea };
  }

  const abiertos: TokenSql[] = [];
  for (const token of tokens) {
    if (esSimbolo(token, "(")) abiertos.push(token);
    if (esSimbolo(token, ")") && !abiertos.pop()) {
      return { mensaje: "Sobra un paréntesis de cierre «)».", sugerencia: "Cada «)» necesita un «(» antes.", linea: token.linea };
    }
  }
  if (abiertos.length > 0) {
    return { mensaje: "Falta cerrar un paréntesis.", sugerencia: "Cada «(» necesita su «)».", linea: abiertos.at(-1)?.linea ?? null };
  }

  const coma = tokens.findIndex((token, indice) => esSimbolo(token, ",") && (!tokens[indice + 1] || esPalabra(tokens[indice + 1], ...TRAS_LISTA)));
  if (coma !== -1) {
    const siguiente = tokens[coma + 1];
    return {
      mensaje: siguiente ? `Sobra una coma antes de ${siguiente.valor.toUpperCase()}.` : "Sobra una coma al final de la consulta.",
      sugerencia: "La última columna de la lista no lleva coma.",
      linea: tokens[coma].linea,
    };
  }

  const limite = tokens.findIndex((token, indice) => esPalabra(token, "LIMIT") && tokens[indice + 1] && tokens[indice + 1].tipo !== "numero");
  if (limite !== -1) {
    const [mensaje, ejemplo] = FALTANTES.LIMIT;
    return { mensaje, sugerencia: ejemplo, linea: tokens[limite].linea };
  }

  const significativos = tokens.filter((token) => !esSimbolo(token, ";"));
  const ultimo = significativos.at(-1);
  if (ultimo?.tipo === "palabra") {
    const clave = ultimo.valor.toUpperCase();
    const previo = significativos.at(-2)?.valor.toUpperCase();
    const nombre = clave === "BY" && (previo === "GROUP" || previo === "ORDER") ? `${previo} BY` : clave;
    if (nombre === "FROM") {
      return { mensaje: "Después de FROM falta el nombre de la tabla.", sugerencia: `Las tablas de este caso son: ${Object.keys(esquema).join(", ")}.`, linea: ultimo.linea };
    }
    const faltante = FALTANTES[nombre];
    if (faltante) return { mensaje: faltante[0], sugerencia: faltante[1], linea: ultimo.linea };
  }

  const columnas = new Set(Object.values(esquema).flat());
  for (const [indice, token] of tokens.entries()) {
    if (token.tipo !== "palabra" || token.valor.length < 4 || esClave(token) || esFuncion(tokens, indice)) continue;
    // Los alias no se excluyen: en «FROM clientes WHER ciudad» alasql toma WHER como alias de clientes.
    if (columnas.has(token.valor) || esquema[token.valor]) continue;
    const parecida = sugerirNombre(token.valor.toUpperCase(), CLAUSULAS_PRINCIPALES);
    if (parecida) return { mensaje: `«${token.valor}» no es una palabra de SQL.`, sugerencia: `¿Quisiste decir ${parecida}?`, linea: token.linea };
  }

  const fragmento = original.split("\n")[1]?.replace(/^\.\.\./, "").trim() ?? "";
  return { mensaje: `SQL no entiende la consulta cerca de: «${fragmento}».`, sugerencia: ORDEN_CLAUSULAS, linea: lineaParser };
}

export function explicarErrorSql(consulta: string, original: string, tablas: Tablas): ErrorExplicado {
  if (original === "Escribe una consulta antes de ejecutar.") return errorSimple(original, original);
  const esquema = esquemaDe(tablas);
  const tokens = tokensSql(consulta);
  const alcance = alcanceDe(tokens, esquema);

  // «SELEC nombre ...» no empieza con SELECT, así que ejecutarSql lo rechaza antes de que alasql lo lea.
  if (original === "En esta tarea solo puedes usar consultas SELECT.") {
    const primera = tokens[0];
    const parecida = primera?.tipo === "palabra" ? sugerirNombre(primera.valor.toUpperCase(), ["SELECT", "WITH"]) : null;
    if (primera && parecida) {
      return { mensaje: `«${primera.valor}» no es una palabra de SQL.`, sugerencia: `¿Quisiste decir ${parecida}?`, linea: primera.linea, original };
    }
    return errorSimple(original, original);
  }

  const tabla = /^Table does not exist: (\S+)/.exec(original)?.[1];
  if (tabla) {
    const parecida = sugerirNombre(tabla, Object.keys(esquema));
    const mayusculas = parecida?.toLowerCase() === tabla.toLowerCase() ? " Los nombres distinguen mayúsculas y minúsculas." : "";
    return {
      mensaje: `No existe una tabla llamada «${tabla}».`,
      sugerencia: parecida ? `${sugerencia(parecida)}${mayusculas}` : `Las tablas de este caso son: ${Object.keys(esquema).join(", ")}.`,
      linea: lineaDe(tokens, tabla),
      original,
    };
  }

  const funcion = /alasql\.fn\.(\w+) is not a function/.exec(original)?.[1];
  if (funcion) {
    const enSql = FUNCIONES_DE_PLANILLA[funcion.toUpperCase()];
    const parecida = sugerirNombre(funcion.toUpperCase(), FUNCIONES_SQL);
    return {
      mensaje: `SQL no conoce la función ${funcion}.`,
      sugerencia: enSql ? `En SQL se escribe ${enSql}. ${funcion} es el nombre en las planillas en español.` : parecida ? `¿Quisiste decir ${parecida}?` : null,
      linea: lineaDe(tokens, funcion),
      original,
    };
  }

  if (/^Cannot read properties of undefined/.test(original)) {
    const desconocido = calificadorDesconocido(tokens, alcance);
    if (desconocido) {
      return {
        mensaje: `«${desconocido.valor}» no es una tabla ni un alias de esta consulta.`,
        sugerencia: sugerencia(sugerirNombre(desconocido.valor, alcance.tablas.keys())) ?? "Revisa el nombre que va antes del punto, como en clientes.nombre.",
        linea: desconocido.linea,
        original,
      };
    }
  }

  const sintaxis = /^Parse error on line (\d+)/.exec(original);
  if (sintaxis) return { ...errorDeSintaxis(tokens, esquema, original, Number(sintaxis[1])), original };

  return {
    mensaje: "La consulta no se pudo ejecutar.",
    sugerencia: "Revisa la consulta por partes: primero SELECT y FROM, y después agrega lo demás.",
    linea: null,
    original,
  };
}

function apareceEnDatos(tablas: Tablas, valor: string): boolean {
  const buscado = valor.toLowerCase();
  return Object.values(tablas).some((filas) => filas.some((fila) => Object.values(fila).some((dato) => typeof dato === "string" && dato.toLowerCase() === buscado)));
}

export function avisosSql(consulta: string, tablas: Tablas): Aviso[] {
  const esquema = esquemaDe(tablas);
  const tokens = tokensSql(consulta);
  const alcance = alcanceDe(tokens, esquema);
  const usadas = [...new Set(alcance.tablas.values())].filter((tabla) => tokens.some((token) => token.tipo === "palabra" && token.valor === tabla));
  const columnas = [...new Set((usadas.length ? usadas : Object.keys(esquema)).flatMap((tabla) => esquema[tabla]))];
  const avisos = new Map<string, Aviso>();
  const avisar = (mensaje: string, linea: number) => {
    if (!avisos.has(mensaje)) avisos.set(mensaje, { mensaje, linea });
  };

  tokens.forEach((token, indice) => {
    if (token.tipo !== "palabra" || esClave(token) || esFuncion(tokens, indice)) return;
    const nombre = token.valor;
    const minuscula = nombre.toLowerCase();
    if (esSimbolo(tokens[indice + 1], ".")) {
      if (!alcance.tablas.has(minuscula)) avisar(`«${nombre}» no es una tabla ni un alias de esta consulta.`, token.linea);
      return;
    }
    if (esSimbolo(tokens[indice - 1], ".")) {
      const tabla = alcance.tablas.get(tokens[indice - 2]?.valor.toLowerCase() ?? "");
      if (tabla && !esquema[tabla].includes(nombre)) {
        const parecida = sugerirNombre(nombre, esquema[tabla]);
        avisar(`La tabla ${tabla} no tiene la columna «${nombre}».${parecida ? ` ¿Quisiste decir «${parecida}»?` : ""}`, token.linea);
      }
      return;
    }
    if (esquema[nombre] || alcance.tablas.has(minuscula) || alcance.alias.has(minuscula) || columnas.includes(nombre)) return;
    const mismaColumna = columnas.find((columna) => columna.toLowerCase() === minuscula);
    if (mismaColumna) {
      avisar(`Las columnas distinguen mayúsculas y minúsculas: escribe «${mismaColumna}» en vez de «${nombre}».`, token.linea);
    } else if (apareceEnDatos(tablas, nombre)) {
      avisar(`«${nombre}» parece un texto: escríbelo entre comillas simples, '${nombre}'.`, token.linea);
    } else {
      const parecida = sugerirNombre(nombre, columnas);
      avisar(`No existe la columna «${nombre}» en las tablas de esta consulta.${parecida ? ` ¿Quisiste decir «${parecida}»?` : ""}`, token.linea);
    }
  });
  return [...avisos.values()];
}
```

En `packages/engines/package.json`, agregar a `exports`:
```json
    "./sql-errores": "./src/sql-errores.ts",
```

- [ ] **Step 4: Correr las pruebas del traductor**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/sql-errores.test.ts`
Expected: PASS (25 pruebas).

Si una prueba de `explicarErrorSql` falla porque alasql da otro mensaje, corrige la regla, no la prueba. El mensaje real de alasql se ve en `original`.

- [ ] **Step 5: Pruebas de `ejecutarConsulta` y del diagnóstico de `compararSql`**

En `packages/engines/src/sql.test.ts`:

1. Agrega `ejecutarConsulta` al import de `./sql`.
2. Reemplaza la prueba "muestra el error de sintaxis de la consulta" por esta:
```ts
  it("explica el error de la consulta en español", () => {
    const resultado = revisarSql(tablas, fueraDeSantiago, "SELEC nombre FROM clientes");
    expect(resultado).toEqual({
      aprobada: false,
      diagnostico: "Tu consulta tiene un error. Línea 1: «SELEC» no es una palabra de SQL. ¿Quisiste decir SELECT?",
    });
  });

  it("si no coincide, agrega el aviso que probablemente explica la diferencia", () => {
    expect(revisarSql(tablas, fueraDeSantiago, "SELECT nombre, ciudad FROM clientes WHERE ciudad <> Santiago").diagnostico).toBe(
      "Tu consulta trae 0 filas, se esperan 2. «Santiago» parece un texto: escríbelo entre comillas simples, 'Santiago'."
    );
  });
```
3. Agrega al final del archivo:
```ts
describe("ejecutarConsulta", () => {
  it("devuelve las filas y los avisos", () => {
    expect(ejecutarConsulta(tablas, "SELECT nombres FROM clientes WHERE id = 1")).toEqual({
      ok: true,
      filas: [{}],
      avisos: [{ mensaje: "No existe la columna «nombres» en las tablas de esta consulta. ¿Quisiste decir «nombre»?", linea: 1 }],
    });
  });

  it("devuelve el error explicado en vez de lanzarlo", () => {
    expect(ejecutarConsulta(tablas, "SELECT * FROM cliente")).toEqual({
      ok: false,
      error: {
        mensaje: "No existe una tabla llamada «cliente».",
        sugerencia: "¿Quisiste decir «clientes»?",
        linea: 1,
        original: "Table does not exist: cliente",
      },
    });
    expect(ejecutarConsulta(tablas, "UPDATE clientes SET ciudad = 'Talca'")).toMatchObject({
      ok: false,
      error: { mensaje: "En esta tarea solo puedes usar consultas SELECT." },
    });
  });

  it("permite escribir cuando la tarea lo pide", () => {
    expect(ejecutarConsulta(tablas, "UPDATE clientes SET ciudad = 'Talca' WHERE id = 1", { permitirEscritura: true })).toMatchObject({ ok: true });
  });
});
```

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/sql.test.ts`
Expected: FAIL, "ejecutarConsulta is not a function" y los diagnósticos con el texto anterior.

- [ ] **Step 6: Implementar en `sql.ts`**

En `packages/engines/src/sql.ts`:

1. Cambia los imports del inicio por:
```ts
import alasql from "alasql";
import { textoDeError, type Aviso, type ErrorExplicado } from "./consola";
import { avisosSql, explicarErrorSql } from "./sql-errores";
import type { Fila, ResultadoTarea } from "./tipos";
```
2. Después de `ejecutarSql`, agrega:
```ts
export type EjecucionSql = { ok: true; filas: Fila[]; avisos: Aviso[] } | { ok: false; error: ErrorExplicado };

export function ejecutarConsulta(
  tablas: Tablas,
  consulta: string,
  opciones: { permitirEscritura?: boolean } = {}
): EjecucionSql {
  try {
    const filas = ejecutarSql(crearBaseSql(tablas), consulta, opciones);
    return { ok: true, filas, avisos: avisosSql(consulta, tablas) };
  } catch (error) {
    return { ok: false, error: explicarErrorSql(consulta, mensajeDe(error), tablas) };
  }
}
```
3. En `compararSql`, reemplaza el `catch` por:
```ts
  } catch (error) {
    return { aprobada: false, diagnostico: `Tu consulta tiene un error. ${textoDeError(explicarErrorSql(consulta, mensajeDe(error), tablas))}` };
  }
```
4. En `compararSql`, reemplaza el `return` final por:
```ts
  const diferencia = describirDiferencia(tarea.esperadas, actuales, sinOrden);
  const [aviso] = avisosSql(consulta, tablas);
  return { aprobada: false, diagnostico: aviso ? `${diferencia} ${aviso.mensaje}` : diferencia };
```

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines test`
Expected: PASS en todo el paquete.

- [ ] **Step 7: Componentes de explicación y avisos**

`apps/web/src/components/consola/explicacion.tsx`:
```tsx
import type { Aviso, ErrorExplicado } from "@syntaxerror/engines/consola";

export function ExplicacionError({ error }: { error: ErrorExplicado }) {
  return (
    <div role="alert" className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6">
      <p className="font-bold text-destructive">{error.linea ? `Línea ${error.linea}: ${error.mensaje}` : error.mensaje}</p>
      {error.sugerencia ? <p>{error.sugerencia}</p> : null}
      {error.original && error.original !== error.mensaje ? (
        <details>
          <summary className="cursor-pointer text-muted-foreground">Mensaje original</summary>
          <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-xs">{error.original}</pre>
        </details>
      ) : null}
    </div>
  );
}

export function AvisosConsola({ avisos }: { avisos: Aviso[] }) {
  if (avisos.length === 0) return null;
  return (
    <div role="status" className="grid gap-1 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm leading-6">
      <p className="font-bold">Revisa esto</p>
      <ul className="grid list-disc gap-1 pl-5">
        {avisos.map((aviso) => <li key={aviso.mensaje}>{aviso.linea ? `Línea ${aviso.linea}: ${aviso.mensaje}` : aviso.mensaje}</li>)}
      </ul>
    </div>
  );
}
```

- [ ] **Step 8: Usarlos en la tarea y el ejemplo de SQL**

`apps/web/src/components/mision/sql-task.tsx` completo:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { compararSql, ejecutarConsulta, type EjecucionSql, type ModoComparacion, type Tablas } from "@syntaxerror/engines/sql";
import type { Fila, ResultadoTarea } from "@syntaxerror/engines/tipos";
import { AvisosConsola, ExplicacionError } from "@/components/consola/explicacion";
import { EditorCodigo } from "./editor-codigo";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";
import { TablaResultado } from "./tabla-resultado";

export type SqlTaskProps = { id: string; enunciado?: string; inicial: string; comparar: ModoComparacion; verificar?: string; esperadas: Fila[]; pistas: string[]; tablas: Tablas };

// La estructura de las tablas del caso queda siempre a mano (propuesta, sección 10).
function TablasDelCaso({ tablas }: { tablas: Tablas }) {
  return (
    <details open className="text-sm">
      <summary className="cursor-pointer font-bold text-muted-foreground">Tablas disponibles</summary>
      <ul className="mt-2 grid gap-1 font-mono">
        {Object.entries(tablas).map(([nombre, filas]) => <li key={nombre}><strong>{nombre}</strong>: {Object.keys(filas[0] ?? {}).join(", ")}</li>)}
      </ul>
    </details>
  );
}

export function SqlTask({ id, enunciado, inicial, comparar, verificar, esperadas, pistas, tablas }: SqlTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const [consulta, setConsulta] = useState(inicial);
  const [ejecucion, setEjecucion] = useState<EjecucionSql | null>(null);
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  function ejecutar() {
    setEjecucion(ejecutarConsulta(tablas, consulta, { permitirEscritura: comparar === "estado-tabla" }));
  }
  function validar() {
    const revision = compararSql(tablas, { comparar, verificar, esperadas }, consulta);
    setResultado(revision);
    registrarResultado(id, revision.aprobada);
  }
  return (
    <PanelTarea id={id} titulo="tarea SQL" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<><Button type="button" variant="secondary" onClick={ejecutar}>Ejecutar</Button><Button type="button" onClick={validar}>Validar</Button></>}>
      <TablasDelCaso tablas={tablas} />
      <EditorCodigo etiqueta="Consulta SQL" valor={consulta} onCambio={setConsulta} />
      {ejecucion && !ejecucion.ok ? <ExplicacionError error={ejecucion.error} /> : null}
      {ejecucion?.ok ? <AvisosConsola avisos={ejecucion.avisos} /> : null}
      {ejecucion?.ok ? <TablaResultado filas={ejecucion.filas} /> : null}
    </PanelTarea>
  );
}
```

`apps/web/src/components/mision/sql-ejemplo.tsx` completo:
```tsx
"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { ejecutarConsulta, type EjecucionSql, type Tablas } from "@syntaxerror/engines/sql";
import { ExplicacionError } from "@/components/consola/explicacion";
import { TablaResultado } from "./tabla-resultado";

export function SqlEjemplo({ consulta, tablas, resaltado }: { consulta: string; tablas: Tablas; resaltado?: ReactNode }) {
  const [ejecucion, setEjecucion] = useState<EjecucionSql | null>(null);
  return (
    <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
      {resaltado ?? <pre className="overflow-x-auto font-mono text-sm">{consulta}</pre>}
      <div><Button type="button" size="sm" variant="secondary" onClick={() => setEjecucion(ejecutarConsulta(tablas, consulta))}>Probar ejemplo</Button></div>
      {ejecucion && !ejecucion.ok ? <ExplicacionError error={ejecucion.error} /> : null}
      {ejecucion?.ok ? <TablaResultado filas={ejecucion.filas} /> : null}
    </div>
  );
}
```

La prop `resaltado` es el ejemplo ya coloreado en el servidor; Task 5 la conecta. Mientras tanto se usa el `<pre>` de siempre.

- [ ] **Step 9: Tipos y pruebas de la web**

Run: `docker compose run --rm tools sh -c "cd apps/web && pnpm exec tsc --noEmit -p . && pnpm exec vitest run"`
Expected: sin errores de tipos y PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/engines apps/web/src/components/consola/explicacion.tsx apps/web/src/components/mision/sql-task.tsx apps/web/src/components/mision/sql-ejemplo.tsx
git commit -m "feat(sql): errores en espanol con sugerencia y avisos de lo que alasql deja pasar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Errores de Python en español

**Files:**
- Create: `packages/engines/src/python-errores.ts`
- Test: `packages/engines/src/python-errores.test.ts`
- Modify:
  - `packages/engines/src/python.ts`, `packages/engines/src/python.test.ts`;
  - `packages/engines/src/python-cliente.ts`, `packages/engines/src/python-cliente.test.ts`;
  - `packages/engines/package.json` (export `./python-errores`).
- Modify: `apps/web/src/components/mision/python-task.tsx`, `apps/web/src/components/mision/python-ejemplo.tsx`

**Interfaces:**
- Consumes: `ErrorExplicado`, `errorSimple`, `sugerirNombre`, `textoDeError` (Task 1); `ExplicacionError` (Task 2).
- Produces en `@syntaxerror/engines/python-errores`:
  - `type ContextoPython = { columnas?: string[]; archivos?: string[] }`;
  - `explicarErrorPython(traceback: string, contexto?: ContextoPython): ErrorExplicado`:
    - `original` es la última línea del traceback;
    - `linea` sale del último `File "<exec>", line N`, o es `null` si no hay.
- Produces en `@syntaxerror/engines/python`:
  - `ResultadoEjecucion` pasa a `{ ok: true; salida: string } | { ok: false; error: ErrorExplicado; salida: string }`;
  - `columnasDeArchivos(archivos: Archivo[]): string[]`, con los encabezados de los CSV del caso, sin repetir.
  - `revisar`:
    - si el código falla, el diagnóstico es "Tu código tiene un error. " seguido de `textoDeError(...)`;
    - si una prueba no encuentra una variable, dice "Falta crear «x». Guarda el resultado con ese nombre exacto.".
- Produces en `@syntaxerror/engines/python-cliente`: el tiempo agotado de `ejecutar` vuelve como `error: errorSimple(mensajeDeTiempo)`.

Pyodide 0.28.3 entrega en `error.message` el traceback completo. El código de la persona aparece como `File "<exec>", line N`, y la preparación corre aparte, así que N cuenta desde la primera línea del editor. Python 3.13 ya agrega "Did you mean: 'x'?" en `NameError` y `AttributeError`, y aquí se aprovecha.

- [ ] **Step 1: Escribir las pruebas del traductor**

`packages/engines/src/python-errores.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { explicarErrorPython } from "./python-errores";

// Tracebacks con la forma real de Pyodide 0.28.3: primero el marco de Pyodide, luego el código (<exec>).
function traza(...lineas: string[]): string {
  return ["Traceback (most recent call last):", '  File "/lib/python313.zip/_pyodide/_base.py", line 597, in eval_code_async', ...lineas, ""].join("\n");
}
const enLinea = (n: number) => `  File "<exec>", line ${n}, in <module>`;
const COLUMNAS = ["id", "cliente_id", "fecha", "monto"];

describe("explicarErrorPython", () => {
  it("NameError con la sugerencia de Python", () => {
    expect(explicarErrorPython(traza(enLinea(2), "NameError: name 'venta' is not defined. Did you mean: 'ventas'?"))).toEqual({
      mensaje: "No existe nada llamado «venta».",
      sugerencia: "¿Quisiste decir «ventas»?",
      linea: 2,
      original: "NameError: name 'venta' is not defined. Did you mean: 'ventas'?",
    });
  });

  it("NameError sin sugerencia", () => {
    expect(explicarErrorPython(traza(enLinea(1), "NameError: name 'xyz' is not defined")).sugerencia).toBe(
      "Revisa que lo hayas creado antes de usarlo y que esté bien escrito: Python distingue mayúsculas y minúsculas."
    );
  });

  it("KeyError dentro de pandas: marca la línea de la persona y sugiere la columna", () => {
    const traceback = traza(
      enLinea(3),
      '  File "/lib/python3.13/site-packages/pandas/core/frame.py", line 4102, in __getitem__',
      '  File "/lib/python3.13/site-packages/pandas/core/indexes/base.py", line 3819, in get_loc',
      "    raise KeyError(key) from err",
      "KeyError: 'montos'"
    );
    expect(explicarErrorPython(traceback, { columnas: COLUMNAS })).toEqual({
      mensaje: "No existe la columna o clave «montos».",
      sugerencia: "¿Quisiste decir «monto»?",
      linea: 3,
      original: "KeyError: 'montos'",
    });
    expect(explicarErrorPython(traza(enLinea(1), "KeyError: 'precio'"), { columnas: COLUMNAS }).sugerencia).toBe(
      "Las columnas de los datos del caso son: id, cliente_id, fecha, monto."
    );
  });

  it("dentro de una función marca la línea donde ocurrió", () => {
    const traceback = traza(enLinea(4), '  File "<exec>", line 2, in promedio', "ZeroDivisionError: division by zero");
    expect(explicarErrorPython(traceback)).toEqual({
      mensaje: "Estás dividiendo por cero.",
      sugerencia: "Revisa que el divisor no valga 0 antes de dividir.",
      linea: 2,
      original: "ZeroDivisionError: division by zero",
    });
  });

  it("errores de sintaxis", () => {
    const sintaxis = (detalle: string) => explicarErrorPython(traza('  File "<exec>", line 2', "    print(a +", "         ^", `SyntaxError: ${detalle}`));
    expect(sintaxis("'(' was never closed")).toMatchObject({ mensaje: "Abriste «(» y nunca lo cerraste.", sugerencia: "Agrega el «)» que falta.", linea: 2 });
    expect(sintaxis("'[' was never closed").sugerencia).toBe("Agrega el «]» que falta.");
    expect(sintaxis("unmatched ')'").mensaje).toBe("Sobra un «)» que no tiene pareja.");
    expect(sintaxis("unterminated string literal (detected at line 2)").mensaje).toBe("Hay un texto sin la comilla de cierre.");
    expect(sintaxis("expected ':'").mensaje).toBe("Falta «:» al final de la línea.");
    expect(sintaxis("invalid syntax. Maybe you meant '==' or ':=' instead of '='?").mensaje).toBe("Para comparar se usa «==»; «=» es para guardar un valor.");
    expect(sintaxis("invalid syntax. Perhaps you forgot a comma?").sugerencia).toBe("¿Te falta una coma entre dos elementos?");
    expect(sintaxis("invalid syntax")).toMatchObject({
      mensaje: "Python no entiende esta línea.",
      sugerencia: "Revisa paréntesis, comillas, comas y los dos puntos al final de if, for y def.",
    });
  });

  it("errores de sangría", () => {
    const sangria = (detalle: string) => explicarErrorPython(traza('  File "<exec>", line 2', `IndentationError: ${detalle}`));
    expect(sangria("expected an indented block after 'if' statement on line 1")).toMatchObject({
      mensaje: "Después de la línea con «if» falta un bloque con sangría.",
      sugerencia: "Deja 4 espacios al inicio de las líneas que van dentro del if.",
      linea: 2,
    });
    expect(sangria("expected an indented block after function definition on line 1").mensaje).toBe("Después de la línea con «def» falta un bloque con sangría.");
    expect(sangria("unexpected indent").mensaje).toBe("Esta línea tiene una sangría que no corresponde.");
    expect(sangria("unindent does not match any outer indentation level").mensaje).toBe("La sangría de esta línea no coincide con las anteriores.");
  });

  it("AttributeError: nombra el tipo en español y aprovecha la sugerencia", () => {
    expect(explicarErrorPython(traza(enLinea(1), "AttributeError: 'DataFrame' object has no attribute 'grupby'. Did you mean: 'groupby'?"))).toMatchObject({
      mensaje: "Un DataFrame no tiene nada llamado «grupby».",
      sugerencia: "¿Quisiste decir «groupby»?",
    });
    expect(explicarErrorPython(traza(enLinea(1), "AttributeError: 'NoneType' object has no attribute 'mean'"))).toMatchObject({
      mensaje: "Intentaste usar «.mean» sobre None (un valor vacío).",
      sugerencia: "Revisa la línea donde le diste valor a esa variable: quizás una función no devolvió nada.",
    });
  });

  it("TypeError", () => {
    expect(explicarErrorPython(traza(enLinea(1), 'TypeError: can only concatenate str (not "int") to str'))).toMatchObject({
      mensaje: "No puedes unir un texto con un número usando «+».",
      sugerencia: 'Convierte el número con str(...) o usa un f-string: f"Total: {total}".',
    });
    expect(explicarErrorPython(traza(enLinea(1), "TypeError: unsupported operand type(s) for +: 'int' and 'str'")).mensaje).toBe(
      "No se puede usar «+» entre un número entero (int) y un texto (str)."
    );
    expect(explicarErrorPython(traza(enLinea(1), "TypeError: 'int' object is not callable")).mensaje).toBe(
      "Un número entero (int) no es una función: no lleva paréntesis después."
    );
    expect(explicarErrorPython(traza(enLinea(1), "TypeError: f() takes 1 positional argument but 2 were given")).mensaje).toBe(
      "Estás combinando tipos de datos o argumentos que no son compatibles."
    );
  });

  it("archivo, módulo, posición y conversión", () => {
    expect(explicarErrorPython(traza(enLinea(1), "FileNotFoundError: [Errno 44] No such file or directory: 'datos/venta.csv'"), { archivos: ["datos/clientes.csv", "datos/ventas.csv"] })).toMatchObject({
      mensaje: "No existe el archivo «datos/venta.csv».",
      sugerencia: "¿Quisiste decir «datos/ventas.csv»?",
    });
    expect(explicarErrorPython(traza(enLinea(1), "ModuleNotFoundError: No module named 'panda'"))).toMatchObject({
      mensaje: "No existe el módulo «panda».",
      sugerencia: "¿Quisiste decir «pandas»?",
    });
    expect(explicarErrorPython(traza(enLinea(1), "IndexError: list index out of range")).mensaje).toBe("Pediste una posición que no existe.");
    expect(explicarErrorPython(traza(enLinea(1), "IndexError: single positional indexer is out-of-bounds")).mensaje).toBe("Pediste con iloc una posición que no existe.");
    expect(explicarErrorPython(traza(enLinea(1), "ValueError: invalid literal for int() with base 10: 'abc'")).mensaje).toBe("No se puede convertir «abc» en un número entero.");
    expect(explicarErrorPython(traza(enLinea(1), "ValueError: could not convert string to float: '3,5'"))).toMatchObject({
      mensaje: "No se puede convertir «3,5» en un número decimal.",
      sugerencia: "float() usa punto decimal: '3.5', no '3,5'.",
    });
  });

  it("un error desconocido o sin línea conserva el original", () => {
    expect(explicarErrorPython(traza(enLinea(5), "RecursionError: maximum recursion depth exceeded"))).toEqual({
      mensaje: "Tu código se detuvo por un error.",
      sugerencia: "Lee el mensaje original: la última línea dice qué tipo de error ocurrió.",
      linea: 5,
      original: "RecursionError: maximum recursion depth exceeded",
    });
    expect(explicarErrorPython("MemoryError").linea).toBeNull();
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/python-errores.test.ts`
Expected: FAIL, "Failed to resolve import ./python-errores".

- [ ] **Step 3: Implementar el traductor**

`packages/engines/src/python-errores.ts`:
```ts
import { sugerirNombre, type ErrorExplicado } from "./consola";

export type ContextoPython = { columnas?: string[]; archivos?: string[] };
type Explicacion = { mensaje: string; sugerencia: string | null };

const MODULOS = ["pandas", "numpy", "math", "statistics", "datetime", "json", "csv", "random", "re"];
const TIPOS: Record<string, string> = {
  DataFrame: "un DataFrame",
  Series: "una Series",
  str: "un texto (str)",
  int: "un número entero (int)",
  float: "un número decimal (float)",
  bool: "un valor lógico (bool)",
  list: "una lista",
  dict: "un diccionario",
  tuple: "una tupla",
  NoneType: "None (un valor vacío)",
};
const CIERRES: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

function nombreTipo(tipo: string): string {
  return TIPOS[tipo] ?? `un objeto de tipo ${tipo}`;
}

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function quizas(detalle: string): string | null {
  const nombre = /Did you mean: '([^']+)'\?/.exec(detalle)?.[1];
  return nombre ? `¿Quisiste decir «${nombre}»?` : null;
}

function sugerencia(nombre: string | null): string | null {
  return nombre ? `¿Quisiste decir «${nombre}»?` : null;
}

function sinComillas(texto: string): string {
  return texto.trim().replace(/^'(.*)'$/, "$1");
}

function sintaxis(detalle: string): Explicacion {
  const abierto = /'([([{])' was never closed/.exec(detalle)?.[1];
  if (abierto) return { mensaje: `Abriste «${abierto}» y nunca lo cerraste.`, sugerencia: `Agrega el «${CIERRES[abierto]}» que falta.` };
  const sobrante = /unmatched '([)\]}])'/.exec(detalle)?.[1];
  if (sobrante) {
    return { mensaje: `Sobra un «${sobrante}» que no tiene pareja.`, sugerencia: "Revisa que cada paréntesis o corchete que cierras lo hayas abierto antes." };
  }
  if (detalle.startsWith("unterminated string literal")) {
    return { mensaje: "Hay un texto sin la comilla de cierre.", sugerencia: "Cierra el texto con la misma comilla con que lo abriste: \"hola\" o 'hola'." };
  }
  if (detalle.startsWith("expected ':'")) {
    return { mensaje: "Falta «:» al final de la línea.", sugerencia: "Las líneas con if, elif, else, for, while y def terminan en dos puntos." };
  }
  if (detalle.includes("Maybe you meant '==' or ':=' instead of '='")) {
    return { mensaje: "Para comparar se usa «==»; «=» es para guardar un valor.", sugerencia: null };
  }
  if (detalle.includes("Perhaps you forgot a comma")) return { mensaje: "Python no entiende esta línea.", sugerencia: "¿Te falta una coma entre dos elementos?" };
  return { mensaje: "Python no entiende esta línea.", sugerencia: "Revisa paréntesis, comillas, comas y los dos puntos al final de if, for y def." };
}

function sangria(detalle: string): Explicacion {
  const bloque = /expected an indented block after (?:'(\w+)' statement|(function) definition)/.exec(detalle);
  if (bloque) {
    const palabra = bloque[1] ?? "def";
    return { mensaje: `Después de la línea con «${palabra}» falta un bloque con sangría.`, sugerencia: `Deja 4 espacios al inicio de las líneas que van dentro del ${palabra}.` };
  }
  if (detalle.startsWith("unexpected indent")) {
    return { mensaje: "Esta línea tiene una sangría que no corresponde.", sugerencia: "Quita los espacios del inicio o alinéala con el bloque al que pertenece." };
  }
  if (detalle.startsWith("unindent does not match")) {
    return { mensaje: "La sangría de esta línea no coincide con las anteriores.", sugerencia: "Usa siempre 4 espacios por nivel." };
  }
  return { mensaje: "La sangría (los espacios al inicio de la línea) no es correcta.", sugerencia: "Usa 4 espacios por nivel." };
}

function tipos(detalle: string): Explicacion {
  const concatenar = /can only concatenate str \(not "(\w+)"\) to str/.exec(detalle)?.[1];
  if (concatenar === "int" || concatenar === "float") {
    return { mensaje: "No puedes unir un texto con un número usando «+».", sugerencia: 'Convierte el número con str(...) o usa un f-string: f"Total: {total}".' };
  }
  const operacion = /unsupported operand type\(s\) for (.+): '(\w+)' and '(\w+)'/.exec(detalle);
  if (operacion) {
    return {
      mensaje: `No se puede usar «${operacion[1]}» entre ${nombreTipo(operacion[2])} y ${nombreTipo(operacion[3])}.`,
      sugerencia: "Revisa los tipos: quizás un número quedó guardado como texto. Conviértelo con int() o float().",
    };
  }
  const llamada = /'(\w+)' object is not callable/.exec(detalle)?.[1];
  if (llamada) {
    return {
      mensaje: `${conMayuscula(nombreTipo(llamada))} no es una función: no lleva paréntesis después.`,
      sugerencia: "Quita los paréntesis, o revisa si le pusiste a una variable el nombre de una función (por ejemplo, sum = 10).",
    };
  }
  const corchetes = /'(\w+)' object is not subscriptable/.exec(detalle)?.[1];
  if (corchetes) return { mensaje: `${conMayuscula(nombreTipo(corchetes))} no se puede leer con corchetes [].`, sugerencia: null };
  return { mensaje: "Estás combinando tipos de datos o argumentos que no son compatibles.", sugerencia: null };
}

type Regla = (detalle: string, contexto: ContextoPython) => Explicacion | null;

const REGLAS: Record<string, Regla> = {
  NameError: (detalle) => {
    const nombre = /name '([^']+)' is not defined/.exec(detalle)?.[1];
    if (!nombre) return null;
    return {
      mensaje: `No existe nada llamado «${nombre}».`,
      sugerencia: quizas(detalle) ?? "Revisa que lo hayas creado antes de usarlo y que esté bien escrito: Python distingue mayúsculas y minúsculas.",
    };
  },
  KeyError: (detalle, { columnas = [] }) => {
    const clave = sinComillas(detalle);
    return {
      mensaje: `No existe la columna o clave «${clave}».`,
      sugerencia: sugerencia(sugerirNombre(clave, columnas)) ?? (columnas.length ? `Las columnas de los datos del caso son: ${columnas.join(", ")}.` : null),
    };
  },
  AttributeError: (detalle) => {
    const coincidencia = /'(\w+)' object has no attribute '([^']+)'/.exec(detalle);
    if (!coincidencia) return null;
    const [, tipo, atributo] = coincidencia;
    if (tipo === "NoneType") {
      return {
        mensaje: `Intentaste usar «.${atributo}» sobre None (un valor vacío).`,
        sugerencia: "Revisa la línea donde le diste valor a esa variable: quizás una función no devolvió nada.",
      };
    }
    return {
      mensaje: `${conMayuscula(nombreTipo(tipo))} no tiene nada llamado «${atributo}».`,
      sugerencia: quizas(detalle) ?? "Revisa el nombre: Python distingue mayúsculas y minúsculas.",
    };
  },
  SyntaxError: sintaxis,
  IndentationError: sangria,
  TabError: () => ({ mensaje: "Mezclaste tabulaciones y espacios en la sangría.", sugerencia: "Usa solo espacios: 4 por nivel." }),
  TypeError: tipos,
  ZeroDivisionError: () => ({ mensaje: "Estás dividiendo por cero.", sugerencia: "Revisa que el divisor no valga 0 antes de dividir." }),
  FileNotFoundError: (detalle, { archivos = [] }) => {
    const ruta = /'([^']+)'$/.exec(detalle)?.[1] ?? "";
    return {
      mensaje: `No existe el archivo «${ruta}».`,
      sugerencia: sugerencia(sugerirNombre(ruta, archivos)) ?? (archivos.length ? `Los archivos del caso son: ${archivos.join(", ")}.` : null),
    };
  },
  ModuleNotFoundError: (detalle) => {
    const modulo = /No module named '([^']+)'/.exec(detalle)?.[1] ?? "";
    return { mensaje: `No existe el módulo «${modulo}».`, sugerencia: sugerencia(sugerirNombre(modulo, MODULOS)) };
  },
  IndexError: (detalle) =>
    detalle.includes("out-of-bounds")
      ? { mensaje: "Pediste con iloc una posición que no existe.", sugerencia: "Las posiciones parten en 0: en una tabla de 5 filas, la última es la 4." }
      : { mensaje: "Pediste una posición que no existe.", sugerencia: "Las posiciones parten en 0: en una lista de 3 elementos, la última es la 2." },
  ValueError: (detalle) => {
    const entero = /invalid literal for int\(\) with base 10: (.+)$/.exec(detalle)?.[1];
    if (entero) return { mensaje: `No se puede convertir «${sinComillas(entero)}» en un número entero.`, sugerencia: "int() solo convierte textos con dígitos, como '42'." };
    const decimal = /could not convert string to float: (.+)$/.exec(detalle)?.[1];
    if (decimal) return { mensaje: `No se puede convertir «${sinComillas(decimal)}» en un número decimal.`, sugerencia: "float() usa punto decimal: '3.5', no '3,5'." };
    return { mensaje: "Un valor no tiene la forma que se esperaba.", sugerencia: null };
  },
  AssertionError: (detalle) => ({
    mensaje: detalle ? `Una verificación (assert) no se cumplió: ${detalle}` : "Una verificación (assert) no se cumplió.",
    sugerencia: null,
  }),
};

function ultimaLinea(traceback: string): string {
  return traceback.split("\n").map((linea) => linea.trim()).filter(Boolean).at(-1) ?? traceback;
}

function lineaDelCodigo(traceback: string): number | null {
  const coincidencia = [...traceback.matchAll(/File "<exec>", line (\d+)/g)].at(-1);
  return coincidencia ? Number(coincidencia[1]) : null;
}

export function explicarErrorPython(traceback: string, contexto: ContextoPython = {}): ErrorExplicado {
  const original = ultimaLinea(traceback);
  const partes = /^(\w+)(?::\s*(.*))?$/.exec(original);
  const explicacion = (partes && REGLAS[partes[1]]?.(partes[2] ?? "", contexto)) ?? {
    mensaje: "Tu código se detuvo por un error.",
    sugerencia: "Lee el mensaje original: la última línea dice qué tipo de error ocurrió.",
  };
  return { ...explicacion, linea: lineaDelCodigo(traceback), original };
}
```

En `packages/engines/package.json`, agregar a `exports`:
```json
    "./python-errores": "./src/python-errores.ts",
```

- [ ] **Step 4: Correr las pruebas del traductor**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/python-errores.test.ts`
Expected: PASS (10 pruebas).

- [ ] **Step 5: Pruebas de la sesión con errores explicados**

En `packages/engines/src/python.test.ts`:

1. Agrega `columnasDeArchivos` al import de `./python`.
2. Reemplaza "informa el error de sintaxis del alumno" y "no arrastra variables de una ejecución anterior" por:
```ts
  it("informa el error de sintaxis del alumno, explicado", async () => {
    const resultado = await sesion.revisar(totalTarea, "total = (");
    expect(resultado.diagnostico).toBe("Tu código tiene un error. Línea 1: Abriste «(» y nunca lo cerraste. Agrega el «)» que falta.");
  });

  it("no arrastra variables de una ejecución anterior", async () => {
    await sesion.ejecutar("", "total = 1350000");
    const resultado = await sesion.revisar(totalTarea, "x = 1");
    expect(resultado.diagnostico).toBe("Falta crear «total». Guarda el resultado con ese nombre exacto.");
  });

  it("ejecutar explica el error con la línea del editor, aunque haya preparación", async () => {
    expect(await sesion.ejecutar("ventas = 1\notra = 2", "x = 2\nprint(venta)")).toEqual({
      ok: false,
      salida: "",
      error: {
        mensaje: "No existe nada llamado «venta».",
        sugerencia: "¿Quisiste decir «ventas»?",
        linea: 2,
        original: "NameError: name 'venta' is not defined. Did you mean: 'ventas'?",
      },
    });
  });

  it("sugiere columnas y archivos del caso", async () => {
    const clave = await sesion.ejecutar("", 'fila = {"monto": 1}\nfila["montos"]');
    expect(clave).toMatchObject({ ok: false, error: { mensaje: "No existe la columna o clave «montos».", sugerencia: "¿Quisiste decir «monto»?", linea: 2 } });
    const archivo = await sesion.ejecutar("", 'open("datos/venta.csv")');
    expect(archivo).toMatchObject({ ok: false, error: { mensaje: "No existe el archivo «datos/venta.csv».", sugerencia: "¿Quisiste decir «datos/ventas.csv»?", linea: 1 } });
  });

  it("conserva lo impreso antes del error", async () => {
    expect(await sesion.ejecutar("", 'print("antes")\n1 / 0')).toMatchObject({ ok: false, salida: "antes", error: { linea: 2 } });
  });
```
3. Agrega al final del archivo:
```ts
describe("columnasDeArchivos", () => {
  it("lee los encabezados de los CSV sin repetir y sin comillas", () => {
    expect(
      columnasDeArchivos([
        { ruta: "datos/ventas.csv", contenido: "id,cliente_id,monto\n1,1,100\n" },
        { ruta: "datos/clientes.csv", contenido: '"id","nombre"\r\n1,Ana\r\n' },
        { ruta: "datos/notas.txt", contenido: "no,es,csv" },
      ])
    ).toEqual(["id", "cliente_id", "monto", "nombre"]);
  });
});
```

En `packages/engines/src/python-cliente.test.ts`, en "ejecutar también se corta por tiempo", cambia la última línea por:
```ts
    if (!resultado.ok) expect(resultado.error).toMatchObject({ mensaje: expect.stringContaining("tardó más de"), linea: null });
```

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/python.test.ts src/python-cliente.test.ts`
Expected: FAIL, porque `columnasDeArchivos` no existe y los diagnósticos tienen el texto anterior.

- [ ] **Step 6: Implementar en `python.ts` y `python-cliente.ts`**

En `packages/engines/src/python.ts`:

1. Cambia el import inicial por:
```ts
import { textoDeError, type ErrorExplicado } from "./consola";
import { explicarErrorPython, type ContextoPython } from "./python-errores";
import type { ResultadoTarea } from "./tipos";
```
2. Cambia el tipo `ResultadoEjecucion` por:
```ts
export type ResultadoEjecucion = { ok: true; salida: string } | { ok: false; error: ErrorExplicado; salida: string };
```
3. Reemplaza `ultimaLinea` y `diagnosticoDePrueba` por:
```ts
function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function ultimaLinea(traceback: string): string {
  return traceback.split("\n").map((linea) => linea.trim()).filter(Boolean).at(-1) ?? traceback;
}

export function columnasDeArchivos(archivos: Archivo[]): string[] {
  const columnas = archivos
    .filter((archivo) => archivo.ruta.endsWith(".csv"))
    .flatMap((archivo) => (archivo.contenido.split(/\r?\n/, 1)[0] ?? "").split(","))
    .map((columna) => columna.trim().replace(/^"(.*)"$/, "$1"))
    .filter(Boolean);
  return [...new Set(columnas)];
}

function diagnosticoDePrueba(traceback: string, contexto: ContextoPython): string {
  const linea = ultimaLinea(traceback);
  if (linea.startsWith("AssertionError")) {
    const mensaje = linea.slice("AssertionError".length).replace(/^:\s*/, "");
    return mensaje || "Una prueba no pasó. Revisa el resultado de tu código.";
  }
  const nombre = /^NameError: name '([^']+)' is not defined/.exec(linea)?.[1];
  if (nombre) return `Falta crear «${nombre}». Guarda el resultado con ese nombre exacto.`;
  return `Falta algo: ${explicarErrorPython(traceback, contexto).mensaje}`;
}
```
4. En `crearSesionPython`, después de escribir los archivos, agrega:
```ts
  const contexto: ContextoPython = {
    columnas: columnasDeArchivos(opciones.archivos),
    archivos: opciones.archivos.map((archivo) => archivo.ruta),
  };
```
5. En `ejecutar`, cambia el `catch` por:
```ts
    } catch (error) {
      return { ok: false, error: explicarErrorPython(mensajeDe(error), contexto), salida: tomarSalida() };
    }
```
6. En `revisar`, cambia los dos diagnósticos de error por:
```ts
      if (!resultado.ok) {
        return { aprobada: false, diagnostico: `Tu código tiene un error. ${textoDeError(resultado.error)}`, salida: resultado.salida };
      }
      try {
        await py.runPythonAsync(tarea.pruebas);
      } catch (error) {
        return { aprobada: false, diagnostico: diagnosticoDePrueba(mensajeDe(error), contexto), salida: resultado.salida };
      }
```

En `packages/engines/src/python-cliente.ts`:

1. Agrega el import:
```ts
import { errorSimple } from "./consola";
```
2. En `ejecutar`, cambia el retorno por tiempo agotado por:
```ts
        if (error instanceof ErrorDeTiempo) return { ok: false, error: errorSimple(mensajeDeTiempo(limiteMs)), salida: "" };
```

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines test`
Expected: PASS en todo el paquete.

- [ ] **Step 7: Mostrar el error explicado en la tarea y el ejemplo de Python**

`apps/web/src/components/mision/python-task.tsx` completo:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { errorSimple, type ErrorExplicado } from "@syntaxerror/engines/consola";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { ExplicacionError } from "@/components/consola/explicacion";
import { EditorCodigo } from "./editor-codigo";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";
import { EstadoPython, usePython } from "./python-contexto";

export type PythonTaskProps = { id: string; enunciado?: string; inicial: string; preparacion: string; pruebas: string; pistas: string[] };
const FALLO = "Algo falló al ejecutar Python. Intenta de nuevo.";

export function PythonTask({ id, enunciado, inicial, preparacion, pruebas, pistas }: PythonTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const python = usePython();
  const [codigo, setCodigo] = useState(inicial);
  const [salida, setSalida] = useState<string | null>(null);
  const [error, setError] = useState<ErrorExplicado | null>(null);
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  async function correr(accion: () => Promise<void>) {
    setCorriendo(true);
    try { await accion(); } catch { setError(errorSimple(FALLO)); } finally { setCorriendo(false); }
  }
  const ejecutar = () => correr(async () => {
    const ejecucion = await python.cliente().ejecutar(preparacion, codigo);
    setSalida(ejecucion.salida || null);
    setError(ejecucion.ok ? null : ejecucion.error);
  });
  const validar = () => correr(async () => {
    const revision = await python.cliente().revisar({ preparacion, pruebas }, codigo);
    setResultado(revision);
    setSalida(revision.salida || null);
    setError(null);
    registrarResultado(id, revision.aprobada);
  });
  const disponible = python.estado === "listo" && !corriendo;
  return (
    <PanelTarea id={id} titulo="tarea Python" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<><Button type="button" variant="secondary" disabled={!disponible} onClick={() => void ejecutar()}>Ejecutar</Button><Button type="button" disabled={!disponible} onClick={() => void validar()}>{corriendo ? "Ejecutando…" : "Validar"}</Button></>}>
      <EstadoPython estado={python.estado} onReintentar={python.iniciar} />
      <EditorCodigo etiqueta="Código Python" valor={codigo} onCambio={setCodigo} filas={8} />
      {salida ? <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-sm">{salida}</pre> : null}
      {error ? <ExplicacionError error={error} /> : null}
    </PanelTarea>
  );
}
```

`apps/web/src/components/mision/python-ejemplo.tsx` completo:
```tsx
"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { errorSimple, type ErrorExplicado } from "@syntaxerror/engines/consola";
import { ExplicacionError } from "@/components/consola/explicacion";
import { usePython } from "./python-contexto";

export function PythonEjemplo({ codigo, resaltado }: { codigo: string; resaltado?: ReactNode }) {
  const python = usePython();
  const [salida, setSalida] = useState<string | null>(null);
  const [error, setError] = useState<ErrorExplicado | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  async function probar() {
    setCorriendo(true);
    try {
      const ejecucion = await python.cliente().ejecutar("", codigo);
      setSalida(ejecucion.salida || (ejecucion.ok ? "(sin salida)" : null));
      setError(ejecucion.ok ? null : ejecucion.error);
    } catch {
      setError(errorSimple("Algo falló al ejecutar Python. Intenta de nuevo."));
    } finally {
      setCorriendo(false);
    }
  }
  return (
    <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
      {resaltado ?? <pre className="overflow-x-auto font-mono text-sm">{codigo}</pre>}
      <div><Button type="button" size="sm" variant="secondary" disabled={python.estado !== "listo" || corriendo} onClick={() => void probar()}>Probar ejemplo</Button></div>
      {salida ? <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-sm">{salida}</pre> : null}
      {error ? <ExplicacionError error={error} /> : null}
    </div>
  );
}
```

- [ ] **Step 8: Tipos y pruebas de la web**

Run: `docker compose run --rm tools sh -c "cd apps/web && pnpm exec tsc --noEmit -p . && pnpm exec vitest run"`
Expected: sin errores de tipos y PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/engines apps/web/src/components/mision/python-task.tsx apps/web/src/components/mision/python-ejemplo.tsx
git commit -m "feat(python): errores en espanol con la linea del editor y sugerencias del caso

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Planilla: ayuda de funciones y errores de celda explicados

**Files:**
- Create: `packages/engines/src/sheet-ayuda.ts`
- Test: `packages/engines/src/sheet-ayuda.test.ts`
- Modify: `packages/engines/src/sheet.ts`, `packages/engines/src/sheet.test.ts`, `packages/engines/package.json` (export `./sheet-ayuda`)
- Modify: `apps/web/src/components/mision/sheet-task.tsx`

**Interfaces:**
- Consumes: `ErrorExplicado`, `sugerirNombre`, `textoDeError` (Task 1); `ExplicacionError` (Task 2).
- Produces en `@syntaxerror/engines/sheet-ayuda`:
  - `type AyudaFuncion = { nombre: string; sintaxis: string; descripcion: string; ejemplo: string }`;
  - `AYUDA_FUNCIONES: AyudaFuncion[]`: todas existen en HyperFormula `esES`, y una prueba lo comprueba;
  - `funcionEnEscritura(entrada: string): AyudaFuncion | null`: la función del paréntesis abierto más interno;
  - `sugerenciasDeFuncion(entrada: string, limite?: number): AyudaFuncion[]`: funciones que empiezan con lo que se está escribiendo;
  - `aplicarSugerencia(entrada: string, nombre: string): string`: reemplaza lo escrito por `NOMBRE(`;
  - `explicarErrorHoja(valor: unknown): ErrorExplicado | null`, que devuelve `null` si el valor no es un error.
- Produces en `@syntaxerror/engines/sheet`: el diagnóstico de `revisarHoja` para una celda con error es "La celda C2 tiene el error #¡DIV/0!. " seguido de `textoDeError(...)`.

Errores reales de HyperFormula 3.4.0 en `esES` (sondeados), con la forma `{ value, type, message }`:
- `#¡DIV/0!`: `DIV_BY_ZERO`, sin mensaje.
- `#ERROR!`: `ERROR`, "Parsing error. Expecting token of type --> RParen <-- but found --> '' <--".
- `#¿NOMBRE?`: `NAME`, con dos mensajes posibles: "Function name SUMAR not recognized." y "Named expression FALSO not recognized.".
- `#¡VALOR!`: `VALUE`, con dos mensajes posibles: "Value cannot be coerced to number." y "Cell range not allowed.".
- `#N/D`: `NA`, "Value not found.".
- `#CYCLE!`: `CYCLE`.

- [ ] **Step 1: Escribir las pruebas**

`packages/engines/src/sheet-ayuda.test.ts`:
```ts
import { HyperFormula } from "hyperformula";
import { describe, expect, it } from "vitest";
import { crearHoja, escribirCelda, leerValor } from "./sheet";
import { AYUDA_FUNCIONES, aplicarSugerencia, explicarErrorHoja, funcionEnEscritura, sugerenciasDeFuncion } from "./sheet-ayuda";

function errorDe(formula: string) {
  const hoja = crearHoja([["x", 1, "a"], [2, 0, 3]]);
  escribirCelda(hoja, "E1", formula);
  return explicarErrorHoja(leerValor(hoja, "E1"));
}

describe("AYUDA_FUNCIONES", () => {
  it("solo trae funciones que existen en la planilla en español", () => {
    const disponibles = new Set(HyperFormula.getRegisteredFunctionNames("esES"));
    expect(AYUDA_FUNCIONES.map((funcion) => funcion.nombre).filter((nombre) => !disponibles.has(nombre))).toEqual([]);
  });

  it("cada ejemplo se calcula sin error", () => {
    const hoja = crearHoja([["id", "ciudad", "monto"], [101, "Temuco", 50000], [102, "Santiago", 120000], [103, "Temuco", 80000]]);
    for (const funcion of AYUDA_FUNCIONES) {
      escribirCelda(hoja, "F1", funcion.ejemplo);
      expect(explicarErrorHoja(leerValor(hoja, "F1")), funcion.nombre).toBeNull();
    }
  });
});

describe("funcionEnEscritura", () => {
  it("muestra la función del paréntesis abierto más interno", () => {
    expect(funcionEnEscritura("=SUMA(")?.sintaxis).toBe("SUMA(número1; [número2]; …)");
    expect(funcionEnEscritura("=si(suma(a2:a3")?.nombre).toBe("SUMA");
    expect(funcionEnEscritura("=SI(SUMA(A2:A3);")?.nombre).toBe("SI");
    expect(funcionEnEscritura('=SI(A1="(x";')?.nombre).toBe("SI");
    expect(funcionEnEscritura("=CONTAR.SI(B2:B4;")?.nombre).toBe("CONTAR.SI");
  });

  it("no muestra nada fuera de una función o sin =", () => {
    expect(funcionEnEscritura("=SUMA(A2:A3)")).toBeNull();
    expect(funcionEnEscritura("=A2*(B2")).toBeNull();
    expect(funcionEnEscritura("SUMA(")).toBeNull();
    expect(funcionEnEscritura("=NOEXISTE(")).toBeNull();
  });
});

describe("sugerenciasDeFuncion", () => {
  it("sugiere funciones que empiezan con lo escrito", () => {
    expect(sugerenciasDeFuncion("=su").map((funcion) => funcion.nombre)).toEqual(["SUMA", "SUMAR.SI", "SUMAPRODUCTO"]);
    expect(sugerenciasDeFuncion("=SI(prom").map((funcion) => funcion.nombre)).toEqual(["PROMEDIO", "PROMEDIO.SI"]);
  });

  it("no sugiere con referencias, dentro de un texto, sin = o con el nombre completo", () => {
    expect(sugerenciasDeFuncion("=A2")).toEqual([]);
    expect(sugerenciasDeFuncion('=SI(B2="su')).toEqual([]);
    expect(sugerenciasDeFuncion("su")).toEqual([]);
    expect(sugerenciasDeFuncion("=SUMAPRODUCTO")).toEqual([]);
  });

  it("aplica la sugerencia abriendo el paréntesis", () => {
    expect(aplicarSugerencia("=SI(prom", "PROMEDIO")).toBe("=SI(PROMEDIO(");
  });
});

describe("explicarErrorHoja", () => {
  it("no explica valores que no son error", () => {
    expect(explicarErrorHoja(5)).toBeNull();
    expect(explicarErrorHoja(null)).toBeNull();
  });

  it("división por cero", () => {
    expect(errorDe("=B1/B2")).toEqual({
      mensaje: "La fórmula divide por cero o por una celda vacía.",
      sugerencia: "Revisa la celda del divisor. Si puede valer 0, usa SI.ERROR(fórmula; 0).",
      linea: null,
      original: "#¡DIV/0!",
    });
  });

  it("paréntesis sin cerrar", () => {
    expect(errorDe("=SUMA(A2:B2")).toMatchObject({ mensaje: "Falta cerrar un paréntesis en la fórmula.", sugerencia: "Cada «(» necesita su «)»." });
  });

  it("función desconocida: sugiere la parecida", () => {
    expect(errorDe("=SUMAR(A2:B2)")).toMatchObject({ mensaje: "La planilla no conoce la función SUMAR.", sugerencia: "¿Quisiste decir SUMA?" });
    expect(errorDe("=PROMEDIOS(A2:B2)")?.sugerencia).toBe("¿Quisiste decir PROMEDIO?");
  });

  it("VERDADERO o FALSO sin paréntesis, y textos sin comillas", () => {
    expect(errorDe("=FALSO")).toMatchObject({ mensaje: "La planilla no reconoce FALSO sin paréntesis.", sugerencia: "Escribe FALSO() para el valor lógico." });
    expect(errorDe("=SI(B1>0;Temuco;0)")).toMatchObject({ mensaje: "La planilla no conoce «TEMUCO».", sugerencia: 'Si es un texto, escríbelo entre comillas: "TEMUCO".' });
  });

  it("texto en una operación y rango donde va una celda", () => {
    expect(errorDe("=A1*2")?.mensaje).toBe("La fórmula opera con un texto como si fuera un número.");
    expect(errorDe("=A1:B1")?.mensaje).toBe("Aquí se espera una sola celda, no un rango.");
  });

  it("valor no encontrado y referencia circular", () => {
    expect(errorDe("=BUSCARV(9;A2:C2;2;FALSO())")?.mensaje).toBe("No se encontró el valor buscado.");
    expect(errorDe("=E1+1")?.mensaje).toBe("La fórmula se usa a sí misma (referencia circular).");
  });
});
```

En `packages/engines/src/sheet.test.ts`, cambia la expectativa de "informa los errores de fórmula" por:
```ts
    expect(revisarHoja(hoja, total).diagnostico).toBe(
      "La celda C2 tiene el error #¡DIV/0!. La fórmula divide por cero o por una celda vacía. Revisa la celda del divisor. Si puede valer 0, usa SI.ERROR(fórmula; 0)."
    );
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/sheet-ayuda.test.ts src/sheet.test.ts`
Expected: FAIL, "Failed to resolve import ./sheet-ayuda".

- [ ] **Step 3: Implementar**

`packages/engines/src/sheet-ayuda.ts`:
```ts
import { HyperFormula } from "hyperformula";
import esES from "hyperformula/i18n/languages/esES";
import { sugerirNombre, type ErrorExplicado } from "./consola";

// Mismo registro que sheet.ts (es idempotente): así este módulo no depende de sheet.ts.
if (!HyperFormula.getRegisteredLanguagesCodes().includes("esES")) {
  HyperFormula.registerLanguage("esES", esES);
}

export type AyudaFuncion = { nombre: string; sintaxis: string; descripcion: string; ejemplo: string };

// Las que usa la ruta Data Analyst, con separador «;» como en Excel en español.
export const AYUDA_FUNCIONES: AyudaFuncion[] = [
  { nombre: "SUMA", sintaxis: "SUMA(número1; [número2]; …)", descripcion: "Suma todos los números de los rangos o valores.", ejemplo: "=SUMA(C2:C4)" },
  { nombre: "SUMAR.SI", sintaxis: "SUMAR.SI(rango; criterio; [rango_suma])", descripcion: "Suma solo las filas que cumplen el criterio.", ejemplo: '=SUMAR.SI(B2:B4; "Temuco"; C2:C4)' },
  { nombre: "SUMAPRODUCTO", sintaxis: "SUMAPRODUCTO(matriz1; [matriz2]; …)", descripcion: "Multiplica los rangos fila a fila y suma los resultados.", ejemplo: "=SUMAPRODUCTO(A2:A4; C2:C4)" },
  { nombre: "PROMEDIO", sintaxis: "PROMEDIO(número1; [número2]; …)", descripcion: "Calcula el promedio de los números.", ejemplo: "=PROMEDIO(C2:C4)" },
  { nombre: "PROMEDIO.SI", sintaxis: "PROMEDIO.SI(rango; criterio; [rango_promedio])", descripcion: "Promedia solo las filas que cumplen el criterio.", ejemplo: '=PROMEDIO.SI(B2:B4; "Temuco"; C2:C4)' },
  { nombre: "CONTAR", sintaxis: "CONTAR(valor1; [valor2]; …)", descripcion: "Cuenta las celdas que tienen números.", ejemplo: "=CONTAR(C2:C4)" },
  { nombre: "CONTARA", sintaxis: "CONTARA(valor1; [valor2]; …)", descripcion: "Cuenta las celdas que no están vacías.", ejemplo: "=CONTARA(B2:B4)" },
  { nombre: "CONTAR.SI", sintaxis: "CONTAR.SI(rango; criterio)", descripcion: "Cuenta las celdas del rango que cumplen el criterio.", ejemplo: '=CONTAR.SI(B2:B4; "Temuco")' },
  { nombre: "MAX", sintaxis: "MAX(número1; [número2]; …)", descripcion: "Devuelve el número más grande.", ejemplo: "=MAX(C2:C4)" },
  { nombre: "MIN", sintaxis: "MIN(número1; [número2]; …)", descripcion: "Devuelve el número más pequeño.", ejemplo: "=MIN(C2:C4)" },
  { nombre: "REDONDEAR", sintaxis: "REDONDEAR(número; decimales)", descripcion: "Redondea un número a los decimales que indiques.", ejemplo: "=REDONDEAR(PROMEDIO(C2:C4); 0)" },
  { nombre: "ENTERO", sintaxis: "ENTERO(número)", descripcion: "Quita los decimales, redondeando hacia abajo.", ejemplo: "=ENTERO(C2/7)" },
  { nombre: "ABS", sintaxis: "ABS(número)", descripcion: "Devuelve el número sin signo.", ejemplo: "=ABS(C2-C3)" },
  { nombre: "SI", sintaxis: "SI(prueba_lógica; valor_si_verdadero; [valor_si_falso])", descripcion: "Devuelve un valor si la condición se cumple y otro si no.", ejemplo: '=SI(C2>100000; "grande"; "normal")' },
  { nombre: "SI.ERROR", sintaxis: "SI.ERROR(valor; valor_si_error)", descripcion: "Devuelve otro valor si la fórmula da error.", ejemplo: "=SI.ERROR(C2/0; 0)" },
  { nombre: "SI.CONJUNTO", sintaxis: "SI.CONJUNTO(prueba1; valor1; [prueba2; valor2]; …)", descripcion: "Revisa varias condiciones en orden y devuelve el valor de la primera que se cumple.", ejemplo: '=SI.CONJUNTO(C2>100000; "alto"; C2>60000; "medio"; VERDADERO(); "bajo")' },
  { nombre: "Y", sintaxis: "Y(lógico1; [lógico2]; …)", descripcion: "Es VERDADERO si se cumplen todas las condiciones.", ejemplo: '=Y(C2>40000; B2="Temuco")' },
  { nombre: "O", sintaxis: "O(lógico1; [lógico2]; …)", descripcion: "Es VERDADERO si se cumple al menos una condición.", ejemplo: '=O(B2="Temuco"; B2="Talca")' },
  { nombre: "BUSCARV", sintaxis: "BUSCARV(valor_buscado; rango; columna; [ordenado])", descripcion: "Busca un valor en la primera columna del rango y devuelve el de otra columna. Usa FALSO() para coincidencia exacta.", ejemplo: "=BUSCARV(102; A2:C4; 3; FALSO())" },
  { nombre: "BUSCARX", sintaxis: "BUSCARX(valor_buscado; rango_búsqueda; rango_resultado)", descripcion: "Busca un valor en un rango y devuelve el de la misma posición en otro.", ejemplo: "=BUSCARX(102; A2:A4; C2:C4)" },
  { nombre: "COINCIDIR", sintaxis: "COINCIDIR(valor_buscado; rango; [tipo])", descripcion: "Devuelve la posición de un valor dentro de un rango. Usa 0 para coincidencia exacta.", ejemplo: "=COINCIDIR(102; A2:A4; 0)" },
  { nombre: "INDICE", sintaxis: "INDICE(rango; fila; [columna])", descripcion: "Devuelve el valor de una posición del rango.", ejemplo: "=INDICE(C2:C4; 2)" },
  { nombre: "CONCATENAR", sintaxis: "CONCATENAR(texto1; [texto2]; …)", descripcion: "Une varios textos en uno.", ejemplo: '=CONCATENAR(B2; " - "; A2)' },
  { nombre: "IZQUIERDA", sintaxis: "IZQUIERDA(texto; [cantidad])", descripcion: "Toma los primeros caracteres de un texto.", ejemplo: "=IZQUIERDA(B2; 3)" },
  { nombre: "DERECHA", sintaxis: "DERECHA(texto; [cantidad])", descripcion: "Toma los últimos caracteres de un texto.", ejemplo: "=DERECHA(B2; 2)" },
  { nombre: "LARGO", sintaxis: "LARGO(texto)", descripcion: "Cuenta los caracteres de un texto.", ejemplo: "=LARGO(B2)" },
  { nombre: "MAYUSC", sintaxis: "MAYUSC(texto)", descripcion: "Pasa un texto a mayúsculas.", ejemplo: "=MAYUSC(B2)" },
  { nombre: "MINUSC", sintaxis: "MINUSC(texto)", descripcion: "Pasa un texto a minúsculas.", ejemplo: "=MINUSC(B2)" },
  { nombre: "ESPACIOS", sintaxis: "ESPACIOS(texto)", descripcion: "Quita los espacios de más al inicio, al final y entre palabras.", ejemplo: "=ESPACIOS(B2)" },
  { nombre: "TEXTO", sintaxis: "TEXTO(valor; formato)", descripcion: "Muestra un número como texto con el formato indicado.", ejemplo: '=TEXTO(C2; "0.00")' },
  { nombre: "HOY", sintaxis: "HOY()", descripcion: "Devuelve la fecha de hoy.", ejemplo: "=HOY()" },
  { nombre: "AÑO", sintaxis: "AÑO(fecha)", descripcion: "Devuelve el año de una fecha.", ejemplo: "=AÑO(HOY())" },
  { nombre: "MES", sintaxis: "MES(fecha)", descripcion: "Devuelve el mes (1 a 12) de una fecha.", ejemplo: "=MES(HOY())" },
  { nombre: "DIA", sintaxis: "DIA(fecha)", descripcion: "Devuelve el día del mes de una fecha.", ejemplo: "=DIA(HOY())" },
  { nombre: "VERDADERO", sintaxis: "VERDADERO()", descripcion: "El valor lógico verdadero. Va con paréntesis.", ejemplo: "=VERDADERO()" },
  { nombre: "FALSO", sintaxis: "FALSO()", descripcion: "El valor lógico falso. Va con paréntesis, por ejemplo en BUSCARV.", ejemplo: "=FALSO()" },
];

const POR_NOMBRE = new Map(AYUDA_FUNCIONES.map((funcion) => [funcion.nombre, funcion]));
const NOMBRES_PLANILLA = HyperFormula.getRegisteredFunctionNames("esES");
const NOMBRE_EN_ESCRITURA = /[\p{L}][\p{L}\d.]*$/u;

function textoAbierto(entrada: string): boolean {
  return (entrada.match(/"/g) ?? []).length % 2 === 1;
}

export function funcionEnEscritura(entrada: string): AyudaFuncion | null {
  if (!entrada.startsWith("=")) return null;
  const pila: string[] = [];
  let enTexto = false;
  let nombre = "";
  for (const caracter of entrada.slice(1)) {
    if (caracter === '"') {
      enTexto = !enTexto;
      nombre = "";
    } else if (enTexto) {
      continue;
    } else if (caracter === "(") {
      pila.push(nombre.toUpperCase());
      nombre = "";
    } else if (caracter === ")") {
      pila.pop();
      nombre = "";
    } else {
      nombre = /[\p{L}\d.]/u.test(caracter) ? nombre + caracter : "";
    }
  }
  const actual = pila.at(-1);
  return actual ? (POR_NOMBRE.get(actual) ?? null) : null;
}

export function sugerenciasDeFuncion(entrada: string, limite = 6): AyudaFuncion[] {
  if (!entrada.startsWith("=") || textoAbierto(entrada)) return [];
  const prefijo = NOMBRE_EN_ESCRITURA.exec(entrada)?.[0]?.toUpperCase();
  if (!prefijo) return [];
  return AYUDA_FUNCIONES.filter((funcion) => funcion.nombre.startsWith(prefijo) && funcion.nombre !== prefijo).slice(0, limite);
}

export function aplicarSugerencia(entrada: string, nombre: string): string {
  return entrada.replace(NOMBRE_EN_ESCRITURA, `${nombre}(`);
}

type ErrorCelda = { value: string; type: string; message?: string };

function esErrorCelda(valor: unknown): valor is ErrorCelda {
  return typeof valor === "object" && valor !== null && "type" in valor && "value" in valor;
}

function explicacionDe(error: ErrorCelda): Pick<ErrorExplicado, "mensaje" | "sugerencia"> {
  const detalle = error.message ?? "";
  switch (error.type) {
    case "DIV_BY_ZERO":
      return { mensaje: "La fórmula divide por cero o por una celda vacía.", sugerencia: "Revisa la celda del divisor. Si puede valer 0, usa SI.ERROR(fórmula; 0)." };
    case "ERROR":
      return detalle.includes("RParen")
        ? { mensaje: "Falta cerrar un paréntesis en la fórmula.", sugerencia: "Cada «(» necesita su «)»." }
        : { mensaje: "La planilla no entiende la fórmula.", sugerencia: "Revisa que empiece con =, que los argumentos se separen con ; y que los textos vayan entre comillas." };
    case "NAME": {
      const funcion = /Function name (.+) not recognized/.exec(detalle)?.[1];
      if (funcion) {
        const parecida = sugerirNombre(funcion, POR_NOMBRE.keys()) ?? sugerirNombre(funcion, NOMBRES_PLANILLA);
        return {
          mensaje: `La planilla no conoce la función ${funcion}.`,
          sugerencia: parecida ? `¿Quisiste decir ${parecida}?` : "Revisa el nombre: las funciones van en español, como SUMA o PROMEDIO.",
        };
      }
      const nombre = /Named expression (.+) not recognized/.exec(detalle)?.[1] ?? "";
      if (nombre === "VERDADERO" || nombre === "FALSO") {
        return { mensaje: `La planilla no reconoce ${nombre} sin paréntesis.`, sugerencia: `Escribe ${nombre}() para el valor lógico.` };
      }
      return { mensaje: `La planilla no conoce «${nombre}».`, sugerencia: `Si es un texto, escríbelo entre comillas: "${nombre}".` };
    }
    case "VALUE":
      return detalle.includes("Cell range not allowed")
        ? { mensaje: "Aquí se espera una sola celda, no un rango.", sugerencia: "Usa el rango dentro de una función, como =SUMA(A1:B1)." }
        : { mensaje: "La fórmula opera con un texto como si fuera un número.", sugerencia: "Revisa que las celdas de la operación tengan números." };
    case "NA":
      return { mensaje: "No se encontró el valor buscado.", sugerencia: "Revisa que el valor exista en el rango de búsqueda y que la coincidencia sea exacta (FALSO() o 0)." };
    case "CYCLE":
      return { mensaje: "La fórmula se usa a sí misma (referencia circular).", sugerencia: "Una celda no puede depender de su propio resultado: revisa las referencias." };
    case "REF":
      return { mensaje: "La fórmula apunta a una celda que no existe.", sugerencia: "Revisa las referencias de la fórmula." };
    case "NUM":
      return { mensaje: "El resultado no es un número válido.", sugerencia: "Revisa que los argumentos estén dentro de lo que la función acepta." };
    default:
      return { mensaje: `La celda tiene el error ${error.value}.`, sugerencia: null };
  }
}

export function explicarErrorHoja(valor: unknown): ErrorExplicado | null {
  if (!esErrorCelda(valor)) return null;
  return { ...explicacionDe(valor), linea: null, original: valor.value };
}
```

En `packages/engines/package.json`, agregar a `exports`:
```json
    "./sheet-ayuda": "./src/sheet-ayuda.ts",
```

En `packages/engines/src/sheet.ts`:

1. Agrega los imports:
```ts
import { textoDeError } from "./consola";
import { explicarErrorHoja } from "./sheet-ayuda";
```
2. En `revisarHoja`, cambia el bloque del error por:
```ts
    const error = explicarErrorHoja(valor);
    if (error) {
      return { aprobada: false, diagnostico: `La celda ${esperada.celda} tiene el error ${error.original}. ${textoDeError(error)}` };
    }
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines test`
Expected: PASS en todo el paquete, incluidas las 14 pruebas de `sheet-ayuda.test.ts`.

Si un ejemplo de `AYUDA_FUNCIONES` da error en la prueba "cada ejemplo se calcula sin error", corrige el ejemplo. Un ejemplo que falla le enseña mal a quien lo copia.

- [ ] **Step 5: Ayuda y sugerencias en la tarea de planilla**

En `apps/web/src/components/mision/sheet-task.tsx`:

1. Cambia los imports de React y de motores por:
```tsx
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { columnaALetra, crearHoja, dimensiones, escribirCelda, formatearValor, leerDireccion, leerFormula, leerValor, revisarHoja, type CeldaEsperada, type Grilla } from "@syntaxerror/engines/sheet";
import { aplicarSugerencia, explicarErrorHoja, funcionEnEscritura, sugerenciasDeFuncion } from "@syntaxerror/engines/sheet-ayuda";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { ExplicacionError } from "@/components/consola/explicacion";
```
2. Agrega este componente antes de `SheetTask`:
```tsx
function AyudaFormula({ entrada, onSugerencia }: { entrada: string; onSugerencia: (nombre: string) => void }) {
  const ayuda = funcionEnEscritura(entrada);
  const sugerencias = sugerenciasDeFuncion(entrada);
  return (
    <div className="grid gap-2 text-sm">
      <div id="ayuda-formula" aria-live="polite">
        {ayuda ? (
          <p className="rounded-md border border-border bg-surface-raised p-3 leading-6">
            <code className="font-mono font-bold">{ayuda.sintaxis}</code>
            <span className="block">{ayuda.descripcion}</span>
            <span className="block text-muted-foreground">Ejemplo: <code className="font-mono">{ayuda.ejemplo}</code></span>
          </p>
        ) : null}
      </div>
      {sugerencias.length > 0 ? (
        <ul aria-label="Funciones sugeridas" className="flex flex-wrap gap-2">
          {sugerencias.map((funcion) => (
            <li key={funcion.nombre}>
              <button type="button" title={funcion.descripcion} onClick={() => onSugerencia(funcion.nombre)} className="rounded-md border border-border px-2 py-1 font-mono text-xs hover:border-primary">
                {funcion.nombre}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
```
3. Dentro de `SheetTask`, después de `const [resultado, ...]`, agrega:
```tsx
  const campo = useRef<HTMLInputElement>(null);
  const errorCelda = useMemo(() => explicarErrorHoja(leerValor(hoja, seleccionada)), [hoja, seleccionada, version]);
  function sugerir(nombre: string) {
    setEntrada((actual) => aplicarSugerencia(actual, nombre));
    campo.current?.focus();
  }
```
4. Cambia el `<input>` de la fórmula por:
```tsx
<input ref={campo} value={entrada} onChange={(evento) => setEntrada(evento.target.value)} onKeyDown={alPresionar} spellCheck={false} autoComplete="off" aria-describedby="ayuda-formula" placeholder="=SUMA(D2:D7)" className="field font-mono" />
```
5. Justo después del `</div>` que cierra la fila de la fórmula (la que tiene el botón "Aplicar"), agrega:
```tsx
      <AyudaFormula entrada={entrada} onSugerencia={sugerir} />
      {errorCelda ? <ExplicacionError error={{ ...errorCelda, mensaje: `${seleccionada}: ${errorCelda.mensaje}` }} /> : null}
```

- [ ] **Step 6: Tipos y pruebas de la web**

Run: `docker compose run --rm tools sh -c "cd apps/web && pnpm exec tsc --noEmit -p . && pnpm exec vitest run"`
Expected: sin errores de tipos y PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/engines apps/web/src/components/mision/sheet-task.tsx
git commit -m "feat(planilla): ayuda de la funcion mientras se escribe y errores de celda explicados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Editor con sintaxis coloreada, autocompletado del caso y glosario

**Files:**
- Modify: `apps/web/package.json` (dependencias de CodeMirror, versiones exactas)
- Create: `apps/web/src/lib/consola/glosario.ts`, `apps/web/src/lib/consola/completado.ts`, `apps/web/src/lib/consola/resaltado.ts`
- Test: `apps/web/src/lib/consola/glosario.test.ts`, `apps/web/src/lib/consola/completado.test.ts`, `apps/web/src/lib/consola/resaltado.test.ts`
- Create: `apps/web/src/components/consola/editor.tsx`, `apps/web/src/components/consola/motor-editor.tsx`, `apps/web/src/components/consola/codigo-resaltado.tsx`
- Modify:
  - `apps/web/src/components/mision/panel-tarea.tsx`, `apps/web/src/components/mision/python-contexto.tsx`;
  - `apps/web/src/components/mision/sql-task.tsx`, `apps/web/src/components/mision/python-task.tsx`;
  - `apps/web/src/components/mision/componentes.tsx`.
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Consumes:
  - `esquemaDe`, `EsquemaSql` (Task 2) y `columnasDeArchivos` (Task 3);
  - `ErrorExplicado` (Task 1) y `ExplicacionError`/`AvisosConsola` (Task 2);
  - `EditorCodigo` (existente), que queda como respaldo mientras carga CodeMirror.
- Produces en `@/lib/consola/glosario`:
  - `type Lenguaje = "sql" | "python"`;
  - `type EntradaGlosario = { titulo: string; explicacion: string; ejemplo: string }`;
  - `GLOSARIO_SQL: Record<string, EntradaGlosario>` (claves en mayúsculas);
  - `GLOSARIO_PYTHON: Record<string, EntradaGlosario>` (los métodos llevan `.` adelante: `".groupby"`);
  - `palabraEn(texto, posicion): { desde: number; hasta: number; palabra: string } | null`;
  - `explicarPalabra(lenguaje, texto, posicion): (EntradaGlosario & { desde: number; hasta: number }) | null`.
- Produces en `@/lib/consola/completado`:
  - `type Opcion = { label: string; type: string; detail: string; info?: string }`;
  - `type Completado = { desde: number; opciones: Opcion[] }`;
  - `type DatosPython = { columnas: string[]; archivos: string[]; variables: string[] }`;
  - `completarSql(texto, posicion, esquema): Completado | null`;
  - `completarPython(texto, posicion, datos): Completado | null`;
  - `variablesDe(codigo: string): string[]`.
- Produces en `@/lib/consola/resaltado`:
  - `type Segmento = { texto: string; clase: string }`;
  - `resaltar(codigo: string, lenguaje: Lenguaje): Segmento[]`.
- Produces en `@/components/consola/editor`:
  - `EditorConsola({ etiqueta, valor, onCambio, filas?, lenguaje, completar, error? })`, con `completar: (texto: string, posicion: number) => Completado | null` y `error?: ErrorExplicado | null`.
- Produces en `@/components/mision/panel-tarea`: `useTareaDeshabilitada(): boolean`.
- Produces en `usePython()`: `opciones: OpcionesPython`.

Cómo funciona el editor:
- **Carga:** `EditorConsola` dibuja el `textarea` de siempre y, después de hidratar, carga `motor-editor.tsx` con `import()`. Si la carga falla, queda el `textarea`.
- **Una sola instancia por lenguaje:** el editor se crea una vez y lee `onCambio` y `completar` desde refs, así que no se recrea en cada render.
- **Línea con error:** cada ejecución trae un objeto `error` nuevo, y el editor marca su línea (`cm-linea-error`). La marca se borra apenas cambia el texto.
- **Tarea bloqueada:** el editor queda de solo lectura, con `contenteditable="false"`, según `useTareaDeshabilitada()`.

- [ ] **Step 1: Instalar CodeMirror con versiones exactas**

Run: `docker compose run --rm tools pnpm --filter web add @codemirror/state@6.7.6 @codemirror/view@6.43.13 @codemirror/language@6.12.4 @codemirror/lang-sql@6.10.0 @codemirror/lang-python@6.2.1 @codemirror/autocomplete@6.20.3 @codemirror/commands@6.11.1 @lezer/highlight@1.2.5 --save-exact`

Run: `docker compose run --rm tools pnpm --filter web why @codemirror/state`
Expected: una sola versión, 6.7.6. Si aparecen dos, alinea las versiones antes de seguir: dos copias rompen el editor con "Unrecognized extension value".

- [ ] **Step 2: Escribir las pruebas de la lógica**

`apps/web/src/lib/consola/glosario.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { explicarPalabra, GLOSARIO_PYTHON, GLOSARIO_SQL, palabraEn } from "./glosario";

describe("glosario", () => {
  it("cada entrada tiene título, explicación y ejemplo", () => {
    for (const entrada of [...Object.values(GLOSARIO_SQL), ...Object.values(GLOSARIO_PYTHON)]) {
      expect(entrada.titulo.length, entrada.titulo).toBeGreaterThan(0);
      expect(entrada.explicacion.length, entrada.titulo).toBeGreaterThan(20);
      expect(entrada.ejemplo.length, entrada.titulo).toBeGreaterThan(0);
    }
  });

  it("encuentra la palabra bajo el cursor", () => {
    expect(palabraEn("SELECT nombre", 9)).toEqual({ desde: 7, hasta: 13, palabra: "nombre" });
    expect(palabraEn("a = 1", 2)).toBeNull();
  });

  it("explica palabras de SQL sin importar mayúsculas", () => {
    expect(explicarPalabra("sql", "select nombre from clientes", 2)).toMatchObject({ titulo: "SELECT", desde: 0, hasta: 6 });
    expect(explicarPalabra("sql", "SELECT ciudad FROM clientes GROUP BY ciudad", 30)?.titulo).toBe("GROUP BY");
  });

  it("en Python distingue un método de pandas de una función", () => {
    expect(explicarPalabra("python", 'ventas.groupby("ciudad")', 9)?.titulo).toBe(".groupby()");
    expect(explicarPalabra("python", "ventas.sum()", 8)?.titulo).toBe(".sum()");
    expect(explicarPalabra("python", "sum([1, 2])", 1)?.titulo).toBe("sum()");
  });

  it("no explica nombres propios del caso", () => {
    expect(explicarPalabra("sql", "SELECT nombre", 9)).toBeNull();
    expect(explicarPalabra("python", "ventas = 1", 2)).toBeNull();
  });
});
```

`apps/web/src/lib/consola/completado.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { completarPython, completarSql, variablesDe, type DatosPython } from "./completado";

const esquema = { clientes: ["id", "nombre", "ciudad"], ventas: ["id", "cliente_id", "monto"] };
const etiquetas = (resultado: ReturnType<typeof completarSql>) => resultado?.opciones.map((opcion) => opcion.label);

describe("completarSql", () => {
  it("sugiere tablas, columnas, palabras clave y funciones del caso", () => {
    const texto = "SELECT * FROM cli";
    const resultado = completarSql(texto, texto.length, esquema);
    expect(resultado?.desde).toBe(14);
    expect(resultado?.opciones).toContainEqual({ label: "clientes", type: "class", detail: "tabla del caso" });
    expect(resultado?.opciones).toContainEqual({ label: "id", type: "property", detail: "columna de clientes, ventas" });
    expect(resultado?.opciones.find((opcion) => opcion.label === "GROUP BY")).toMatchObject({ type: "keyword", info: expect.stringContaining("GROUP BY") });
    expect(resultado?.opciones.find((opcion) => opcion.label === "COUNT")).toMatchObject({ type: "function" });
  });

  it("después de una tabla o alias con punto, sugiere solo sus columnas", () => {
    expect(completarSql("SELECT v. FROM ventas v", 9, esquema)).toEqual({
      desde: 9,
      opciones: [
        { label: "id", type: "property", detail: "columna de ventas" },
        { label: "cliente_id", type: "property", detail: "columna de ventas" },
        { label: "monto", type: "property", detail: "columna de ventas" },
      ],
    });
    expect(etiquetas(completarSql("SELECT c.no FROM clientes AS c", 11, esquema))).toEqual(["id", "nombre", "ciudad"]);
    expect(completarSql("SELECT clientes.no", 18, esquema)?.desde).toBe(16);
    expect(completarSql("SELECT x.", 9, esquema)).toBeNull();
  });

  it("no sugiere dentro de un texto ni sin haber escrito nada", () => {
    expect(completarSql("WHERE ciudad = 'San", 19, esquema)).toBeNull();
    expect(completarSql("SELECT ", 7, esquema)).toBeNull();
  });
});

const datos: DatosPython = { columnas: ["id", "fecha", "monto"], archivos: ["datos/ventas.csv"], variables: ["pd", "ventas"] };

describe("completarPython", () => {
  it("dentro de corchetes con comillas sugiere las columnas", () => {
    const texto = 'ventas["mo';
    expect(completarPython(texto, texto.length, datos)).toEqual({
      desde: texto.length - 2,
      opciones: [
        { label: "id", type: "property", detail: "columna de los datos" },
        { label: "fecha", type: "property", detail: "columna de los datos" },
        { label: "monto", type: "property", detail: "columna de los datos" },
      ],
    });
  });

  it("dentro de read_csv sugiere los archivos del caso", () => {
    const texto = "pd.read_csv('da";
    expect(completarPython(texto, texto.length, datos)).toEqual({ desde: texto.length - 2, opciones: [{ label: "datos/ventas.csv", type: "text", detail: "archivo del caso" }] });
  });

  it("después de un punto sugiere métodos de pandas con su explicación", () => {
    const texto = "ventas.gro";
    const resultado = completarPython(texto, texto.length, datos);
    expect(resultado?.desde).toBe(7);
    expect(resultado?.opciones).toContainEqual({ label: "groupby", type: "method", detail: "agrupar por columna", info: expect.stringContaining("agrupa") });
  });

  it("al escribir un nombre sugiere variables del caso, las propias, palabras y funciones", () => {
    const texto = "total = 1\nto";
    const resultado = completarPython(texto, texto.length, datos);
    expect(resultado?.desde).toBe(10);
    expect(resultado?.opciones).toContainEqual({ label: "ventas", type: "variable", detail: "variable del caso" });
    expect(resultado?.opciones).toContainEqual({ label: "total", type: "variable", detail: "tu variable" });
    expect(resultado?.opciones.find((opcion) => opcion.label === "print")).toMatchObject({ type: "function" });
    expect(resultado?.opciones.find((opcion) => opcion.label === "def")).toMatchObject({ type: "keyword" });
  });

  it("no sugiere en comentarios ni en textos que no son columnas ni archivos", () => {
    expect(completarPython("# ven", 5, datos)).toBeNull();
    expect(completarPython('print("hol', 10, datos)).toBeNull();
  });
});

describe("variablesDe", () => {
  it("encuentra asignaciones e imports con alias, en orden y sin repetir", () => {
    expect(variablesDe('import pandas as pd\nventas = pd.read_csv("x")\nif ventas.empty == False:\n    total = 2\nventas = ventas.head()')).toEqual(["pd", "ventas", "total"]);
  });
});
```

`apps/web/src/lib/consola/resaltado.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { resaltar } from "./resaltado";

describe("resaltar", () => {
  it("marca palabras clave, textos, números y comentarios de SQL", () => {
    const codigo = "SELECT nombre FROM clientes WHERE id > 2 AND ciudad = 'Temuco' -- nota";
    const segmentos = resaltar(codigo, "sql");
    expect(segmentos.map((segmento) => segmento.texto).join("")).toBe(codigo);
    expect(segmentos).toContainEqual({ texto: "SELECT", clase: "tok-keyword" });
    expect(segmentos).toContainEqual({ texto: "'Temuco'", clase: "tok-string" });
    expect(segmentos).toContainEqual({ texto: "2", clase: "tok-number" });
    expect(segmentos).toContainEqual({ texto: "-- nota", clase: "tok-comment" });
  });

  it("colorea Python y conserva los saltos de línea", () => {
    const codigo = 'import pandas as pd\ndef total(x):\n    return round(x["monto"].mean(), 2)  # promedio';
    const segmentos = resaltar(codigo, "python");
    expect(segmentos.map((segmento) => segmento.texto).join("")).toBe(codigo);
    expect(segmentos).toContainEqual({ texto: "def", clase: "tok-keyword" });
    expect(segmentos).toContainEqual({ texto: '"monto"', clase: "tok-string" });
    expect(segmentos).toContainEqual({ texto: "mean", clase: "tok-propertyName" });
    expect(segmentos).toContainEqual({ texto: "# promedio", clase: "tok-comment" });
  });
});
```

- [ ] **Step 3: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/consola`
Expected: FAIL, "Failed to resolve import ./glosario" (y lo mismo para `./completado` y `./resaltado`).

- [ ] **Step 4: Implementar el glosario**

`apps/web/src/lib/consola/glosario.ts`:
```ts
export type Lenguaje = "sql" | "python";
export type EntradaGlosario = { titulo: string; explicacion: string; ejemplo: string };

const e = (titulo: string, explicacion: string, ejemplo: string): EntradaGlosario => ({ titulo, explicacion, ejemplo });

// Explicaciones al pasar el mouse y en las sugerencias (propuesta, sección 10). Cortas, en español y con un ejemplo mínimo.
export const GLOSARIO_SQL: Record<string, EntradaGlosario> = {
  SELECT: e("SELECT", "SELECT elige las columnas que quieres ver en el resultado. Con * ves todas.", "SELECT nombre, ciudad FROM clientes"),
  FROM: e("FROM", "FROM indica de qué tabla salen los datos.", "SELECT * FROM ventas"),
  WHERE: e("WHERE", "WHERE filtra las filas: solo quedan las que cumplen la condición.", "WHERE ciudad = 'Santiago'"),
  AND: e("AND", "AND exige que se cumplan las dos condiciones a la vez.", "WHERE ciudad = 'Temuco' AND monto > 100000"),
  OR: e("OR", "OR deja pasar las filas que cumplen al menos una de las condiciones.", "WHERE ciudad = 'Temuco' OR ciudad = 'Talca'"),
  NOT: e("NOT", "NOT invierte una condición: deja lo que no la cumple.", "WHERE NOT ciudad = 'Santiago'"),
  IN: e("IN", "IN compara con una lista de valores; es más corto que varios OR.", "WHERE ciudad IN ('Temuco', 'Talca')"),
  LIKE: e("LIKE", "LIKE busca textos con un patrón: % reemplaza cualquier cantidad de caracteres.", "WHERE nombre LIKE 'Almacén%'"),
  BETWEEN: e("BETWEEN", "BETWEEN filtra un rango e incluye ambos extremos.", "WHERE monto BETWEEN 50000 AND 100000"),
  IS: e("IS NULL", "IS NULL encuentra las celdas vacías. Con = NULL no funciona.", "WHERE email IS NULL"),
  NULL: e("NULL", "NULL significa «sin valor»: no es 0 ni un texto vacío.", "WHERE email IS NULL"),
  AS: e("AS", "AS le pone otro nombre a una columna o a una tabla en la consulta.", "SELECT SUM(monto) AS total FROM ventas"),
  DISTINCT: e("DISTINCT", "DISTINCT quita las filas repetidas del resultado.", "SELECT DISTINCT ciudad FROM clientes"),
  GROUP: e("GROUP BY", "GROUP BY junta las filas que comparten un valor para resumirlas con COUNT, SUM o AVG.", "SELECT ciudad, COUNT(*) FROM clientes GROUP BY ciudad"),
  HAVING: e("HAVING", "HAVING filtra grupos, después de GROUP BY. WHERE filtra filas, antes de agrupar.", "GROUP BY ciudad HAVING COUNT(*) > 1"),
  ORDER: e("ORDER BY", "ORDER BY ordena el resultado por una o más columnas.", "ORDER BY monto DESC"),
  ASC: e("ASC", "ASC ordena de menor a mayor (o de la A a la Z). Es el orden por defecto.", "ORDER BY nombre ASC"),
  DESC: e("DESC", "DESC ordena de mayor a menor (o de la Z a la A).", "ORDER BY monto DESC"),
  LIMIT: e("LIMIT", "LIMIT corta el resultado a las primeras filas.", "ORDER BY monto DESC LIMIT 3"),
  JOIN: e("JOIN", "JOIN une dos tablas usando una columna que tienen en común.", "FROM ventas JOIN clientes ON ventas.cliente_id = clientes.id"),
  INNER: e("INNER JOIN", "INNER JOIN deja solo las filas que tienen pareja en las dos tablas.", "FROM ventas INNER JOIN clientes ON ventas.cliente_id = clientes.id"),
  LEFT: e("LEFT JOIN", "LEFT JOIN conserva todas las filas de la tabla de la izquierda, aunque no tengan pareja.", "FROM clientes LEFT JOIN ventas ON ventas.cliente_id = clientes.id"),
  ON: e("ON", "ON dice qué columnas deben coincidir para unir las tablas.", "JOIN clientes ON ventas.cliente_id = clientes.id"),
  COUNT: e("COUNT()", "COUNT cuenta filas. COUNT(*) cuenta todas; COUNT(columna) no cuenta las vacías.", "SELECT COUNT(*) FROM ventas"),
  SUM: e("SUM()", "SUM suma los valores de una columna.", "SELECT SUM(monto) FROM ventas"),
  AVG: e("AVG()", "AVG calcula el promedio de una columna.", "SELECT AVG(monto) FROM ventas"),
  MIN: e("MIN()", "MIN devuelve el valor más pequeño de una columna.", "SELECT MIN(monto) FROM ventas"),
  MAX: e("MAX()", "MAX devuelve el valor más grande de una columna.", "SELECT MAX(monto) FROM ventas"),
  ROUND: e("ROUND()", "ROUND redondea un número a los decimales que indiques.", "SELECT ROUND(AVG(monto), 0) FROM ventas"),
  CASE: e("CASE", "CASE elige un valor según condiciones, como SI en una planilla.", "CASE WHEN monto > 100000 THEN 'grande' ELSE 'normal' END"),
  UPDATE: e("UPDATE", "UPDATE cambia valores de filas que ya existen. Sin WHERE cambia todas.", "UPDATE clientes SET ciudad = 'Talca' WHERE id = 3"),
  DELETE: e("DELETE", "DELETE borra filas. Sin WHERE borra todas.", "DELETE FROM ventas WHERE monto = 0"),
  INSERT: e("INSERT", "INSERT agrega filas nuevas a una tabla.", "INSERT INTO clientes (id, nombre) VALUES (7, 'Ana')"),
};

export const GLOSARIO_PYTHON: Record<string, EntradaGlosario> = {
  import: e("import", "import trae una biblioteca para usarla en tu código.", "import pandas as pd"),
  as: e("as", "as le da un nombre corto a lo que importas.", "import pandas as pd"),
  pd: e("pd", "pd es el nombre corto con que se acostumbra importar pandas.", "import pandas as pd"),
  def: e("def", "def crea una función: un bloque de código con nombre que puedes reutilizar.", "def con_iva(monto):\n    return monto * 1.19"),
  return: e("return", "return entrega el resultado de una función y la termina.", "return monto * 1.19"),
  if: e("if", "if ejecuta un bloque solo si la condición se cumple. La línea termina en dos puntos.", "if monto > 100000:\n    print(\"grande\")"),
  elif: e("elif", "elif revisa otra condición si la anterior no se cumplió.", "elif monto > 50000:"),
  else: e("else", "else ejecuta un bloque cuando ninguna condición anterior se cumplió.", "else:\n    print(\"normal\")"),
  for: e("for", "for repite un bloque por cada elemento de una lista o columna.", "for monto in [100, 200]:\n    print(monto)"),
  in: e("in", "in recorre los elementos en un for, o pregunta si un valor está en una lista.", "\"Temuco\" in ciudades"),
  while: e("while", "while repite un bloque mientras la condición se cumpla. Cuida que termine.", "while total < 10:\n    total += 1"),
  print: e("print()", "print muestra un valor en la salida.", "print(ventas.head())"),
  len: e("len()", "len cuenta los elementos de una lista o las filas de un DataFrame.", "len(ventas)"),
  round: e("round()", "round redondea un número; el segundo valor son los decimales.", "round(3.14159, 2)"),
  sum: e("sum()", "sum suma los números de una lista.", "sum([100, 200, 300])"),
  range: e("range()", "range genera números seguidos; no incluye el último.", "for i in range(3):"),
  str: e("str()", "str convierte un valor en texto.", "str(1500)"),
  int: e("int()", "int convierte un texto o un decimal en número entero.", "int(\"42\")"),
  float: e("float()", "float convierte un texto en número decimal; usa punto, no coma.", "float(\"3.5\")"),
  True: e("True", "True es el valor lógico verdadero. Va con mayúscula.", "activo = True"),
  False: e("False", "False es el valor lógico falso. Va con mayúscula.", "activo = False"),
  None: e("None", "None significa «sin valor». Una función sin return devuelve None.", "resultado = None"),
  ".read_csv": e("pd.read_csv()", "read_csv lee un archivo CSV y lo convierte en un DataFrame (una tabla).", "ventas = pd.read_csv(\"datos/ventas.csv\")"),
  ".head": e(".head()", "head muestra las primeras filas de la tabla (5 si no dices cuántas).", "ventas.head(3)"),
  ".tail": e(".tail()", "tail muestra las últimas filas de la tabla.", "ventas.tail()"),
  ".describe": e(".describe()", "describe resume las columnas numéricas: cantidad, promedio, mínimo, máximo y cuartiles.", "ventas.describe()"),
  ".info": e(".info()", "info muestra las columnas, sus tipos y cuántas celdas vacías hay.", "ventas.info()"),
  ".groupby": e(".groupby()", "groupby agrupa las filas que comparten un valor, para resumirlas como GROUP BY en SQL.", "ventas.groupby(\"ciudad\")[\"monto\"].sum()"),
  ".sum": e(".sum()", "sum suma los valores de una columna (o de cada grupo).", "ventas[\"monto\"].sum()"),
  ".mean": e(".mean()", "mean calcula el promedio de una columna.", "ventas[\"monto\"].mean()"),
  ".median": e(".median()", "median calcula la mediana: el valor del medio, que no se deja llevar por extremos.", "ventas[\"monto\"].median()"),
  ".count": e(".count()", "count cuenta los valores que no están vacíos.", "ventas[\"monto\"].count()"),
  ".min": e(".min()", "min devuelve el valor más pequeño.", "ventas[\"monto\"].min()"),
  ".max": e(".max()", "max devuelve el valor más grande.", "ventas[\"monto\"].max()"),
  ".sort_values": e(".sort_values()", "sort_values ordena la tabla por una columna; ascending=False ordena de mayor a menor.", "ventas.sort_values(\"monto\", ascending=False)"),
  ".value_counts": e(".value_counts()", "value_counts cuenta cuántas veces aparece cada valor de una columna.", "clientes[\"ciudad\"].value_counts()"),
  ".unique": e(".unique()", "unique devuelve los valores distintos de una columna.", "clientes[\"ciudad\"].unique()"),
  ".nunique": e(".nunique()", "nunique cuenta cuántos valores distintos hay.", "clientes[\"ciudad\"].nunique()"),
  ".merge": e(".merge()", "merge une dos tablas por una columna en común, como JOIN en SQL.", "ventas.merge(clientes, left_on=\"cliente_id\", right_on=\"id\")"),
  ".reset_index": e(".reset_index()", "reset_index convierte el índice en una columna normal, útil después de groupby.", "por_ciudad.reset_index()"),
  ".loc": e(".loc[]", "loc elige filas y columnas por nombre o con una condición.", "ventas.loc[ventas[\"monto\"] > 100000, \"monto\"]"),
  ".iloc": e(".iloc[]", "iloc elige filas y columnas por posición; la primera es la 0.", "ventas.iloc[0]"),
  ".query": e(".query()", "query filtra filas con una condición escrita como texto.", "ventas.query(\"monto > 100000\")"),
  ".agg": e(".agg()", "agg aplica varias funciones de resumen a la vez.", "ventas[\"monto\"].agg([\"sum\", \"mean\"])"),
  ".dropna": e(".dropna()", "dropna quita las filas que tienen celdas vacías.", "ventas.dropna()"),
  ".fillna": e(".fillna()", "fillna rellena las celdas vacías con un valor.", "ventas[\"monto\"].fillna(0)"),
  ".astype": e(".astype()", "astype cambia el tipo de una columna, por ejemplo de texto a número.", "ventas[\"monto\"].astype(int)"),
  ".shape": e(".shape", "shape dice cuántas filas y columnas tiene la tabla. No lleva paréntesis.", "ventas.shape"),
  ".columns": e(".columns", "columns lista los nombres de las columnas. No lleva paréntesis.", "ventas.columns"),
};

export function palabraEn(texto: string, posicion: number): { desde: number; hasta: number; palabra: string } | null {
  let desde = posicion;
  let hasta = posicion;
  while (desde > 0 && /\w/.test(texto[desde - 1])) desde -= 1;
  while (hasta < texto.length && /\w/.test(texto[hasta])) hasta += 1;
  return desde === hasta ? null : { desde, hasta, palabra: texto.slice(desde, hasta) };
}

export function explicarPalabra(lenguaje: Lenguaje, texto: string, posicion: number): (EntradaGlosario & { desde: number; hasta: number }) | null {
  const encontrada = palabraEn(texto, posicion);
  if (!encontrada) return null;
  const { desde, hasta, palabra } = encontrada;
  const entrada =
    lenguaje === "sql" ? GLOSARIO_SQL[palabra.toUpperCase()] : GLOSARIO_PYTHON[texto[desde - 1] === "." ? `.${palabra}` : palabra];
  return entrada ? { ...entrada, desde, hasta } : null;
}
```

- [ ] **Step 5: Implementar el autocompletado y el resaltado**

`apps/web/src/lib/consola/completado.ts`:
```ts
import type { EsquemaSql } from "@syntaxerror/engines/sql-errores";
import { GLOSARIO_PYTHON, GLOSARIO_SQL } from "./glosario";

export type Opcion = { label: string; type: string; detail: string; info?: string };
export type Completado = { desde: number; opciones: Opcion[] };
export type DatosPython = { columnas: string[]; archivos: string[]; variables: string[] };

const PALABRAS_SQL = [
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "LIKE", "BETWEEN", "IS NULL", "IS NOT NULL", "AS", "DISTINCT",
  "JOIN", "INNER JOIN", "LEFT JOIN", "ON", "GROUP BY", "HAVING", "ORDER BY", "ASC", "DESC", "LIMIT", "CASE", "WHEN",
  "THEN", "ELSE", "END",
];
const FUNCIONES_SQL = ["COUNT", "SUM", "AVG", "MIN", "MAX", "ROUND", "UPPER", "LOWER", "LENGTH", "COALESCE"];
const PALABRAS_PYTHON = ["import", "from", "as", "def", "return", "if", "elif", "else", "for", "in", "while", "and", "or", "not", "True", "False", "None"];
const FUNCIONES_PYTHON = ["print", "len", "round", "sum", "range", "str", "int", "float", "list", "dict", "sorted", "min", "max", "abs"];
const METODOS_PANDAS: [string, string][] = [
  ["read_csv", "leer un archivo CSV"], ["head", "primeras filas"], ["tail", "últimas filas"], ["describe", "resumen estadístico"],
  ["info", "columnas y tipos"], ["groupby", "agrupar por columna"], ["sum", "sumar"], ["mean", "promedio"],
  ["median", "mediana"], ["count", "contar valores"], ["min", "mínimo"], ["max", "máximo"],
  ["sort_values", "ordenar por columna"], ["value_counts", "contar cada valor"], ["unique", "valores distintos"],
  ["nunique", "cantidad de valores distintos"], ["merge", "unir dos tablas"], ["reset_index", "índice a columna"],
  ["loc", "filas y columnas por nombre"], ["iloc", "filas y columnas por posición"], ["query", "filtrar con una condición"],
  ["agg", "varios resúmenes a la vez"], ["dropna", "quitar filas vacías"], ["fillna", "rellenar vacíos"],
  ["astype", "cambiar el tipo"], ["round", "redondear"], ["shape", "tamaño de la tabla"], ["columns", "nombres de columnas"],
  ["rename", "renombrar columnas"], ["drop", "quitar filas o columnas"], ["to_csv", "guardar como CSV"],
];

const NOMBRE = /[A-Za-z_]\w*$/;

function infoSql(palabra: string): string | undefined {
  return GLOSARIO_SQL[palabra.split(" ")[0]]?.explicacion;
}

function conInfo(opcion: Opcion, info: string | undefined): Opcion {
  return info ? { ...opcion, info } : opcion;
}

// La tabla a la que apunta «c.» en «FROM clientes c» o «FROM clientes AS c», o la tabla misma.
function tablaDeCalificador(calificador: string, texto: string, esquema: EsquemaSql): string | null {
  if (esquema[calificador]) return calificador;
  for (const coincidencia of texto.matchAll(/\b([A-Za-z_]\w*)(?=\s+(?:AS\s+)?([A-Za-z_]\w*)\b)/gi)) {
    if (esquema[coincidencia[1]] && coincidencia[2].toLowerCase() === calificador.toLowerCase()) return coincidencia[1];
  }
  return null;
}

export function completarSql(texto: string, posicion: number, esquema: EsquemaSql): Completado | null {
  const antes = texto.slice(0, posicion);
  if ((antes.match(/'/g) ?? []).length % 2 === 1) return null;
  const calificado = /([A-Za-z_]\w*)\.(\w*)$/.exec(antes);
  if (calificado) {
    const tabla = tablaDeCalificador(calificado[1], texto, esquema);
    if (!tabla) return null;
    return {
      desde: posicion - calificado[2].length,
      opciones: esquema[tabla].map((columna) => ({ label: columna, type: "property", detail: `columna de ${tabla}` })),
    };
  }
  const palabra = NOMBRE.exec(antes);
  if (!palabra) return null;
  const columnas = new Map<string, string[]>();
  for (const [tabla, lista] of Object.entries(esquema)) {
    for (const columna of lista) columnas.set(columna, [...(columnas.get(columna) ?? []), tabla]);
  }
  return {
    desde: posicion - palabra[0].length,
    opciones: [
      ...Object.keys(esquema).map((tabla) => ({ label: tabla, type: "class", detail: "tabla del caso" })),
      ...[...columnas].map(([columna, tablas]) => ({ label: columna, type: "property", detail: `columna de ${tablas.join(", ")}` })),
      ...PALABRAS_SQL.map((clave) => conInfo({ label: clave, type: "keyword", detail: "palabra clave" }, infoSql(clave))),
      ...FUNCIONES_SQL.map((funcion) => conInfo({ label: funcion, type: "function", detail: "función" }, infoSql(funcion))),
    ],
  };
}

export function variablesDe(codigo: string): string[] {
  const patron = /^[ \t]*(?:([A-Za-z_]\w*)[ \t]*=(?!=)|import[ \t]+[\w.]+[ \t]+as[ \t]+(\w+)|from[ \t]+[\w.]+[ \t]+import[ \t]+(\w+))/gm;
  return [...new Set([...codigo.matchAll(patron)].map((coincidencia) => coincidencia[1] ?? coincidencia[2] ?? coincidencia[3]))];
}

type Contexto = { tipo: "codigo" } | { tipo: "comentario" } | { tipo: "texto"; antes: string; escrito: string };

// Mira solo la línea actual: dónde está el cursor (código, comentario o texto entre comillas).
function contextoDe(linea: string): Contexto {
  let comilla: string | null = null;
  let inicio = 0;
  for (let i = 0; i < linea.length; i += 1) {
    const caracter = linea[i];
    if (comilla) {
      if (caracter === comilla) comilla = null;
    } else if (caracter === '"' || caracter === "'") {
      comilla = caracter;
      inicio = i;
    } else if (caracter === "#") {
      return { tipo: "comentario" };
    }
  }
  return comilla ? { tipo: "texto", antes: linea.slice(0, inicio), escrito: linea.slice(inicio + 1) } : { tipo: "codigo" };
}

export function completarPython(texto: string, posicion: number, datos: DatosPython): Completado | null {
  const antes = texto.slice(0, posicion);
  const contexto = contextoDe(antes.slice(antes.lastIndexOf("\n") + 1));
  if (contexto.tipo === "comentario") return null;
  if (contexto.tipo === "texto") {
    const desde = posicion - contexto.escrito.length;
    if (/read_csv\(\s*$/.test(contexto.antes)) {
      return { desde, opciones: datos.archivos.map((archivo) => ({ label: archivo, type: "text", detail: "archivo del caso" })) };
    }
    if (/\[\s*$/.test(contexto.antes) && datos.columnas.length > 0) {
      return { desde, opciones: datos.columnas.map((columna) => ({ label: columna, type: "property", detail: "columna de los datos" })) };
    }
    return null;
  }
  const metodo = /\.(\w*)$/.exec(antes);
  if (metodo) {
    return {
      desde: posicion - metodo[1].length,
      opciones: METODOS_PANDAS.map(([nombre, detalle]) => conInfo({ label: nombre, type: "method", detail: detalle }, GLOSARIO_PYTHON[`.${nombre}`]?.explicacion)),
    };
  }
  const palabra = NOMBRE.exec(antes);
  if (!palabra) return null;
  const delCaso = new Set(datos.variables);
  const propias = variablesDe(texto).filter((variable) => !delCaso.has(variable));
  return {
    desde: posicion - palabra[0].length,
    opciones: [
      ...datos.variables.map((variable) => ({ label: variable, type: "variable", detail: "variable del caso" })),
      ...propias.map((variable) => ({ label: variable, type: "variable", detail: "tu variable" })),
      ...PALABRAS_PYTHON.map((clave) => conInfo({ label: clave, type: "keyword", detail: "palabra clave" }, GLOSARIO_PYTHON[clave]?.explicacion)),
      ...FUNCIONES_PYTHON.map((funcion) => conInfo({ label: funcion, type: "function", detail: "función" }, GLOSARIO_PYTHON[funcion]?.explicacion)),
    ],
  };
}
```

`apps/web/src/lib/consola/resaltado.ts`:
```ts
import { pythonLanguage } from "@codemirror/lang-python";
import { StandardSQL } from "@codemirror/lang-sql";
import { classHighlighter, highlightCode } from "@lezer/highlight";
import type { Lenguaje } from "./glosario";

export type Segmento = { texto: string; clase: string };

// Mismos parsers y clases (tok-*) que el editor: los ejemplos se ven igual que lo que escribe la persona.
export function resaltar(codigo: string, lenguaje: Lenguaje): Segmento[] {
  const parser = lenguaje === "sql" ? StandardSQL.language.parser : pythonLanguage.parser;
  const segmentos: Segmento[] = [];
  highlightCode(
    codigo,
    parser.parse(codigo),
    classHighlighter,
    (texto, clase) => segmentos.push({ texto, clase }),
    () => segmentos.push({ texto: "\n", clase: "" })
  );
  return segmentos;
}
```

- [ ] **Step 6: Correr las pruebas de la lógica**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/consola`
Expected: PASS (16 pruebas).

- [ ] **Step 7: El editor**

`apps/web/src/components/consola/motor-editor.tsx`:
```tsx
"use client";

import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { sql, StandardSQL } from "@codemirror/lang-sql";
import { bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { Compartment, EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, drawSelection, EditorView, highlightActiveLine, hoverTooltip, keymap, lineNumbers, type DecorationSet } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";
import { useEffect, useId, useRef } from "react";
import type { ErrorExplicado } from "@syntaxerror/engines/consola";
import type { Completado } from "@/lib/consola/completado";
import { explicarPalabra, type Lenguaje } from "@/lib/consola/glosario";

export type PropsEditor = {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  filas: number;
  lenguaje: Lenguaje;
  completar: (texto: string, posicion: number) => Completado | null;
  error: ErrorExplicado | null;
  deshabilitado: boolean;
};

const marcarError = StateEffect.define<number | null>();

// La línea del último error queda marcada hasta que la persona cambia el código.
const lineaConError = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(marcas, transaccion) {
    for (const efecto of transaccion.effects) {
      if (!efecto.is(marcarError)) continue;
      const numero = efecto.value;
      if (numero === null || numero < 1 || numero > transaccion.state.doc.lines) return Decoration.none;
      return Decoration.set([Decoration.line({ class: "cm-linea-error" }).range(transaccion.state.doc.line(numero).from)]);
    }
    return transaccion.docChanged ? Decoration.none : marcas;
  },
  provide: (campo) => EditorView.decorations.from(campo),
});

function glosarioAlPasar(lenguaje: Lenguaje) {
  return hoverTooltip((vista, posicion) => {
    const entrada = explicarPalabra(lenguaje, vista.state.doc.toString(), posicion);
    if (!entrada) return null;
    return {
      pos: entrada.desde,
      end: entrada.hasta,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "consola-glosario";
        const titulo = document.createElement("p");
        titulo.className = "consola-glosario-titulo";
        titulo.textContent = entrada.titulo;
        const explicacion = document.createElement("p");
        explicacion.textContent = entrada.explicacion;
        const ejemplo = document.createElement("code");
        ejemplo.textContent = entrada.ejemplo;
        dom.append(titulo, explicacion, ejemplo);
        return { dom };
      },
    };
  });
}

const tema = EditorView.theme({
  "&": { backgroundColor: "var(--background)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.875rem" },
  "&.cm-focused": { outline: "2px solid var(--focus-ring)", outlineOffset: "1px" },
  ".cm-content": { fontFamily: "var(--font-mono)", padding: "0.75rem 0", caretColor: "var(--foreground)" },
  ".cm-gutters": { backgroundColor: "var(--surface)", color: "var(--muted-foreground)", border: "none", borderRight: "1px solid var(--border)", borderRadius: "0.5rem 0 0 0.5rem" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--primary) 7%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--foreground)" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in srgb, var(--primary) 28%, transparent)", outline: "none" },
  ".cm-tooltip": { backgroundColor: "var(--surface-raised)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: "0.5rem" },
  ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "var(--primary)", color: "var(--primary-foreground)" },
  ".cm-completionDetail": { fontStyle: "normal", opacity: "0.8", marginLeft: "0.75rem" },
  ".cm-completionInfo": { maxWidth: "20rem", padding: "0.5rem 0.75rem", lineHeight: "1.5" },
});

const soloLectura = (deshabilitado: boolean) => [EditorView.editable.of(!deshabilitado), EditorState.readOnly.of(deshabilitado)];

export function EditorCodeMirror({ etiqueta, valor, onCambio, filas, lenguaje, completar, error, deshabilitado }: PropsEditor) {
  const contenedor = useRef<HTMLDivElement>(null);
  const vista = useRef<EditorView | null>(null);
  const cambio = useRef(onCambio);
  const completado = useRef(completar);
  const modo = useRef(new Compartment());
  const idAyuda = useId();
  cambio.current = onCambio;
  completado.current = completar;

  useEffect(() => {
    if (!contenedor.current) return;
    const editor = new EditorView({
      parent: contenedor.current,
      state: EditorState.create({
        doc: valor,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          lenguaje === "sql" ? sql({ dialect: StandardSQL, upperCaseKeywords: true }) : python(),
          syntaxHighlighting(classHighlighter),
          autocompletion({
            override: [
              (contexto) => {
                const resultado = completado.current(contexto.state.doc.toString(), contexto.pos);
                return resultado ? { from: resultado.desde, options: resultado.opciones, validFor: /^[\w./-]*$/ } : null;
              },
            ],
          }),
          glosarioAlPasar(lenguaje),
          lineaConError,
          keymap.of([...closeBracketsKeymap, ...completionKeymap, ...historyKeymap, ...defaultKeymap, indentWithTab]),
          EditorView.updateListener.of((actualizacion) => {
            if (actualizacion.docChanged) cambio.current(actualizacion.state.doc.toString());
          }),
          EditorView.contentAttributes.of({ "aria-label": etiqueta, "aria-describedby": idAyuda }),
          EditorView.theme({ ".cm-content, .cm-gutter": { minHeight: `${filas * 1.5 + 1.5}rem` } }),
          tema,
          modo.current.of(soloLectura(deshabilitado)),
        ],
      }),
    });
    vista.current = editor;
    return () => {
      editor.destroy();
      vista.current = null;
    };
    // El editor se crea una vez por lenguaje; el texto y el modo se sincronizan en los efectos de abajo.
  }, [lenguaje, etiqueta, filas, idAyuda]);

  useEffect(() => {
    const editor = vista.current;
    if (!editor || editor.state.doc.toString() === valor) return;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: valor } });
  }, [valor]);

  useEffect(() => {
    vista.current?.dispatch({ effects: modo.current.reconfigure(soloLectura(deshabilitado)) });
  }, [deshabilitado]);

  useEffect(() => {
    vista.current?.dispatch({ effects: marcarError.of(error?.linea ?? null) });
  }, [error]);

  return (
    <div className="grid gap-2 text-sm">
      <span aria-hidden="true" className="font-bold">{etiqueta}</span>
      <div ref={contenedor} />
      <p id={idAyuda} className="text-xs text-muted-foreground">
        Ctrl+Espacio muestra sugerencias. Tab agrega sangría; para salir del editor con el teclado, presiona Esc y luego Tab.
      </p>
    </div>
  );
}
```

`apps/web/src/components/consola/editor.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import type { ErrorExplicado } from "@syntaxerror/engines/consola";
import { EditorCodigo } from "@/components/mision/editor-codigo";
import { useTareaDeshabilitada } from "@/components/mision/panel-tarea";
import type { Completado } from "@/lib/consola/completado";
import type { Lenguaje } from "@/lib/consola/glosario";

type Motor = typeof import("./motor-editor");

export type EditorConsolaProps = {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  filas?: number;
  lenguaje: Lenguaje;
  completar: (texto: string, posicion: number) => Completado | null;
  error?: ErrorExplicado | null;
};

// CodeMirror llega con import() después de hidratar: la página sigue estática y liviana. Mientras carga
// (o si la conexión falla) se usa el textarea de siempre, con la misma etiqueta y el mismo texto.
export function EditorConsola({ etiqueta, valor, onCambio, filas = 6, lenguaje, completar, error = null }: EditorConsolaProps) {
  const deshabilitado = useTareaDeshabilitada();
  const [motor, setMotor] = useState<Motor | null>(null);
  useEffect(() => {
    let vigente = true;
    import("./motor-editor").then(
      (modulo) => { if (vigente) setMotor(modulo); },
      () => {}
    );
    return () => { vigente = false; };
  }, []);
  if (!motor) return <EditorCodigo etiqueta={etiqueta} valor={valor} onCambio={onCambio} filas={filas} />;
  return <motor.EditorCodeMirror etiqueta={etiqueta} valor={valor} onCambio={onCambio} filas={filas} lenguaje={lenguaje} completar={completar} error={error} deshabilitado={deshabilitado} />;
}
```

`apps/web/src/components/consola/codigo-resaltado.tsx`:
```tsx
import { Fragment } from "react";
import type { Lenguaje } from "@/lib/consola/glosario";
import { resaltar } from "@/lib/consola/resaltado";

// Sin "use client": se dibuja en el servidor, así los ejemplos no suman JavaScript al navegador.
export function CodigoResaltado({ codigo, lenguaje }: { codigo: string; lenguaje: Lenguaje }) {
  return (
    <pre className="overflow-x-auto font-mono text-sm leading-6">
      <code>
        {resaltar(codigo, lenguaje).map((segmento, indice) =>
          segmento.clase ? <span key={indice} className={segmento.clase}>{segmento.texto}</span> : <Fragment key={indice}>{segmento.texto}</Fragment>
        )}
      </code>
    </pre>
  );
}
```

- [ ] **Step 8: Conectar el editor con las tareas**

En `apps/web/src/components/mision/panel-tarea.tsx`:

1. Cambia el import de React por:
```tsx
import { createContext, useContext, useState, type ReactNode } from "react";
```
2. Antes de `export function PanelTarea`, agrega:
```tsx
const TareaDeshabilitada = createContext(false);

// Los controles nativos se desactivan con el fieldset; el editor de código lo lee de aquí.
export function useTareaDeshabilitada(): boolean {
  return useContext(TareaDeshabilitada);
}
```
3. Dentro de `PanelTarea`, después de `const disponibles = ...`, agrega:
```tsx
  const deshabilitada = !listo || bloqueo !== null;
```
4. Cambia el `<fieldset ...>` y su contenido por:
```tsx
      <fieldset disabled={deshabilitada} className="grid min-w-0 gap-4 border-0 p-0">
        <TareaDeshabilitada.Provider value={deshabilitada}>
          {children}
          <div className="flex flex-wrap gap-3">
            {acciones}
            {pistasVistas < disponibles ? (
              <Button type="button" variant="ghost" onClick={() => setPistasVistas((vistas) => vistas + 1)}>
                Ver pista
              </Button>
            ) : null}
          </div>
        </TareaDeshabilitada.Provider>
      </fieldset>
```

En `apps/web/src/components/mision/python-contexto.tsx`:

1. Cambia el tipo del contexto por:
```tsx
type ContextoPython = { estado: FaseCarga; iniciar: () => void; cliente: () => ClientePython; opciones: OpcionesPython };
```
2. Cambia la línea del `useMemo` por:
```tsx
  const valor = useMemo(() => ({ estado, iniciar, cliente, opciones }), [estado, iniciar, cliente, opciones]);
```

En `apps/web/src/components/mision/sql-task.tsx`:

1. Agrega los imports:
```tsx
import { useMemo, useState } from "react";
import { esquemaDe } from "@syntaxerror/engines/sql-errores";
import { EditorConsola } from "@/components/consola/editor";
import { completarSql } from "@/lib/consola/completado";
```
Quita el `import { useState } from "react";` anterior y el de `EditorCodigo`.

2. Dentro de `SqlTask`, después de los `useState`, agrega:
```tsx
  const completar = useMemo(() => {
    const esquema = esquemaDe(tablas);
    return (texto: string, posicion: number) => completarSql(texto, posicion, esquema);
  }, [tablas]);
```
3. Cambia `<EditorCodigo etiqueta="Consulta SQL" valor={consulta} onCambio={setConsulta} />` por:
```tsx
      <EditorConsola etiqueta="Consulta SQL" lenguaje="sql" valor={consulta} onCambio={setConsulta} completar={completar} error={ejecucion && !ejecucion.ok ? ejecucion.error : null} />
```

En `apps/web/src/components/mision/python-task.tsx`:

1. Agrega los imports:
```tsx
import { useMemo, useState } from "react";
import { columnasDeArchivos } from "@syntaxerror/engines/python";
import { EditorConsola } from "@/components/consola/editor";
import { completarPython, variablesDe } from "@/lib/consola/completado";
```
Quita el `import { useState } from "react";` anterior y el de `EditorCodigo`.

2. Dentro de `PythonTask`, después de los `useState`, agrega:
```tsx
  const completar = useMemo(() => {
    const datos = {
      columnas: columnasDeArchivos(python.opciones.archivos),
      archivos: python.opciones.archivos.map((archivo) => archivo.ruta),
      variables: variablesDe(preparacion),
    };
    return (texto: string, posicion: number) => completarPython(texto, posicion, datos);
  }, [python.opciones, preparacion]);
```
3. Cambia `<EditorCodigo etiqueta="Código Python" valor={codigo} onCambio={setCodigo} filas={8} />` por:
```tsx
      <EditorConsola etiqueta="Código Python" lenguaje="python" valor={codigo} onCambio={setCodigo} filas={8} completar={completar} error={error} />
```

En `apps/web/src/components/mision/componentes.tsx`:

1. Agrega el import:
```tsx
import { CodigoResaltado } from "@/components/consola/codigo-resaltado";
```
2. Cambia las entradas `SqlEjemplo` y `PythonEjemplo` por:
```tsx
    SqlEjemplo: (props: PropsMdx) => {
      const ejemplo = bloqueSchemas.SqlEjemplo.parse(props);
      return <SqlEjemplo {...ejemplo} tablas={tablas} resaltado={<CodigoResaltado codigo={ejemplo.consulta} lenguaje="sql" />} />;
    },
    PythonEjemplo: (props: PropsMdx) => {
      const ejemplo = bloqueSchemas.PythonEjemplo.parse(props);
      return <PythonEjemplo {...ejemplo} resaltado={<CodigoResaltado codigo={ejemplo.codigo} lenguaje="python" />} />;
    },
```

- [ ] **Step 9: Colores de sintaxis y glosario**

Agrega al final de `apps/web/src/app/globals.css`:
```css
/* Consolas: colores de sintaxis (clases tok-* de @lezer/highlight), con contraste AA en ambos temas. */
:root {
  --sintaxis-palabra: #c4b5fd;
  --sintaxis-texto: #86efac;
  --sintaxis-numero: #fdba74;
  --sintaxis-comentario: #a1a1aa;
  --sintaxis-logico: #f9a8d4;
  --sintaxis-propiedad: #7dd3fc;
  --sintaxis-definicion: #fde68a;
}

:root[data-theme="light"] {
  --sintaxis-palabra: #6d28d9;
  --sintaxis-texto: #15803d;
  --sintaxis-numero: #c2410c;
  --sintaxis-comentario: #52525b;
  --sintaxis-logico: #be185d;
  --sintaxis-propiedad: #0369a1;
  --sintaxis-definicion: #a16207;
}

.tok-keyword { color: var(--sintaxis-palabra); font-weight: 600; }
.tok-string { color: var(--sintaxis-texto); }
.tok-number { color: var(--sintaxis-numero); }
.tok-comment { color: var(--sintaxis-comentario); font-style: italic; }
.tok-bool { color: var(--sintaxis-logico); }
.tok-propertyName { color: var(--sintaxis-propiedad); }
.tok-definition { color: var(--sintaxis-definicion); }

.cm-linea-error {
  background-color: color-mix(in srgb, var(--color-destructive) 14%, transparent);
  box-shadow: inset 3px 0 0 var(--color-destructive);
}

.consola-glosario { display: grid; gap: 0.25rem; max-width: 22rem; padding: 0.5rem 0.75rem; font-size: 0.8125rem; line-height: 1.5; }
.consola-glosario-titulo { font-family: var(--font-mono); font-weight: 700; }
.consola-glosario code { font-family: var(--font-mono); color: var(--muted-foreground); white-space: pre-wrap; }
```

- [ ] **Step 10: Tipos, pruebas y build**

Run: `docker compose run --rm tools sh -c "cd apps/web && pnpm exec tsc --noEmit -p . && pnpm exec vitest run && pnpm build"`
Expected:
- sin errores de tipos;
- PASS;
- el build termina con `/casos/[caso]/[mision]` como página estática (●/SSG).

Revisa además, en la salida del build, el "First Load JS" de `/casos/[caso]/[mision]`:
- Al planear esta fase era de 415 kB.
- Con las Tasks 1 a 6 queda cerca de 429 kB: los traductores de errores, el glosario y la ayuda de funciones.
- Si sube bastante más, CodeMirror se coló en el bundle inicial; debe ir en un chunk aparte, cargado con `import()`.

- [ ] **Step 11: Probarlo a mano**

Run: `docker compose up -d --force-recreate --wait web`

Abre `http://localhost:3000/casos/demo-motor/01-clientes-de-regiones` y comprueba:
- el editor muestra números de línea y colorea `SELECT`;
- al escribir `cli` aparece `clientes` con "tabla del caso";
- `Ctrl+Espacio` abre las sugerencias;
- al pasar el mouse sobre `WHERE` aparece su explicación;
- `Esc` y luego `Tab` sacan el foco del editor;
- con el tema claro, los colores se leen bien.

- [ ] **Step 12: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(consolas): editor con sintaxis coloreada, autocompletado del caso y glosario en espanol

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Tablas de pandas visibles después de ejecutar

**Files:**
- Modify: `packages/engines/src/python.ts`, `packages/engines/src/python.test.ts`
- Create: `apps/web/src/components/mision/tablas-python.tsx`
- Modify: `apps/web/src/components/mision/python-task.tsx`, `apps/web/src/components/mision/python-ejemplo.tsx`

**Interfaces:**
- Consumes: `ResultadoEjecucion` y `crearSesionPython` (Task 3); `EditorConsola` (Task 5).
- Produces en `@syntaxerror/engines/python`:
  - `type TablaVisible = { nombre: string; columnas: string[]; filas: unknown[][]; total: number }`;
  - `MAX_TABLAS = 5` y `FILAS_POR_TABLA = 10`;
  - `ResultadoEjecucion` pasa a `{ ok: true; salida: string; tablas: TablaVisible[] } | { ok: false; error: ErrorExplicado; salida: string }`.
- Produces en `@/components/mision/tablas-python`: `TablasPython({ tablas }: { tablas: TablaVisible[] })`.

Reglas de qué se muestra:
- **Qué tablas:** después de una ejecución exitosa (no al validar), cada variable global que sea `DataFrame` o `Series`, en el orden en que se crearon. Primero quedan las de la preparación (por ejemplo `ventas`) y después las de la persona.
- **Cómo se muestran:**
  - una `Series` se muestra como tabla de una columna, con su nombre o el de la variable;
  - si el índice no es el numérico de siempre (por ejemplo, después de un `groupby`), pasa a ser la primera columna.
- **Límites y datos:**
  - máximo 5 tablas y 10 filas por tabla, pero `total` dice cuántas filas tiene en realidad;
  - `NaN` llega como `null` y las fechas como texto ISO.
- **Fallas:**
  - una tabla que no se puede mostrar se omite sin afectar a las demás;
  - si pandas no está cargado no se hace nada, y `tablas` es `[]`.

- [ ] **Step 1: Escribir las pruebas**

En `packages/engines/src/python.test.ts`:

1. Cambia las dos pruebas que comparan el resultado completo de una ejecución exitosa, "ejecutar devuelve lo impreso" y "deja los archivos del caso disponibles con ruta relativa", para que incluyan `tablas: []`:
```ts
    expect(await sesion.ejecutar("", 'print("hola")')).toEqual({ ok: true, salida: "hola", tablas: [] });
```
```ts
    expect(resultado).toEqual({ ok: true, salida: "1,100", tablas: [] });
```
2. Agrega al final del archivo:
```ts
describe("tablas de pandas", () => {
  let conPandas: SesionPython;
  const preparacion = 'import pandas as pd\nventas = pd.read_csv("datos/ventas.csv")';

  beforeAll(async () => {
    const py = await loadPyodide();
    conPandas = await crearSesionPython(py, {
      paquetes: ["pandas"],
      archivos: [{ ruta: "datos/ventas.csv", contenido: "id,ciudad,fecha,monto\n1,Temuco,2025-03-01,100\n2,Santiago,2025-03-02,250\n3,Temuco,2025-03-03,\n" }],
    });
  }, 180_000);

  it("muestra los DataFrame y Series en variables, en orden, con el índice del groupby como columna", async () => {
    const resultado = await conPandas.ejecutar(preparacion, 'por_ciudad = ventas.groupby("ciudad")["monto"].sum()\ntotal = 350');
    expect(resultado).toEqual({
      ok: true,
      salida: "",
      tablas: [
        { nombre: "ventas", columnas: ["id", "ciudad", "fecha", "monto"], filas: [[1, "Temuco", "2025-03-01", 100], [2, "Santiago", "2025-03-02", 250], [3, "Temuco", "2025-03-03", null]], total: 3 },
        { nombre: "por_ciudad", columnas: ["ciudad", "monto"], filas: [["Santiago", 250], ["Temuco", 100]], total: 2 },
      ],
    });
  });

  it("muestra solo las primeras filas pero informa el total, y nombra las Series sin nombre", async () => {
    const resultado = await conPandas.ejecutar(preparacion, 'grande = pd.DataFrame({"n": range(25)})\ndobles = pd.Series([1, 2]) * 2');
    if (!resultado.ok) throw new Error(resultado.error.original);
    const grande = resultado.tablas.find((tabla) => tabla.nombre === "grande");
    expect(grande?.filas).toHaveLength(10);
    expect(grande?.total).toBe(25);
    expect(resultado.tablas.find((tabla) => tabla.nombre === "dobles")).toEqual({ nombre: "dobles", columnas: ["dobles"], filas: [[2], [4]], total: 2 });
  });

  it("convierte fechas a texto y omite la tabla que no se puede mostrar", async () => {
    const codigo = [
      'fechas = pd.to_datetime(ventas["fecha"])',
      'raro = ventas.set_index("ciudad", drop=False)',
    ].join("\n");
    const resultado = await conPandas.ejecutar(preparacion, codigo);
    if (!resultado.ok) throw new Error(resultado.error.original);
    expect(resultado.tablas.map((tabla) => tabla.nombre)).toEqual(["ventas", "fechas"]);
    expect(String(resultado.tablas[1].filas[0][0])).toMatch(/^2025-03-01/);
  });

  it("no muestra más de 5 tablas", async () => {
    const codigo = Array.from({ length: 7 }, (_, i) => `t${i} = ventas.head(1)`).join("\n");
    const resultado = await conPandas.ejecutar(preparacion, codigo);
    expect(resultado.ok && resultado.tablas.length).toBe(5);
  });

  it("al fallar, explica el error con las columnas del caso y no trae tablas", async () => {
    const resultado = await conPandas.ejecutar(preparacion, 'x = 1\ny = ventas["montos"]');
    expect(resultado).toMatchObject({ ok: false, error: { mensaje: "No existe la columna o clave «montos».", sugerencia: "¿Quisiste decir «monto»?", linea: 2 } });
    expect(resultado).not.toHaveProperty("tablas");
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/python.test.ts`
Expected: FAIL, porque falta `tablas` en los resultados. La primera vez Pyodide descarga pandas, así que puede tardar un minuto.

- [ ] **Step 3: Implementar**

En `packages/engines/src/python.ts`:

1. Cambia el tipo `ResultadoEjecucion` por:
```ts
export type TablaVisible = { nombre: string; columnas: string[]; filas: unknown[][]; total: number };
export type ResultadoEjecucion = { ok: true; salida: string; tablas: TablaVisible[] } | { ok: false; error: ErrorExplicado; salida: string };

export const MAX_TABLAS = 5;
export const FILAS_POR_TABLA = 10;
```
2. Después de `LIMPIAR_VARIABLES`, agrega:
```ts
// Corre después del código de la persona. Empieza con _ para que LIMPIAR_VARIABLES no la borre ni se muestre.
const TABLAS_VISIBLES = `
def _tablas_visibles():
    import json, sys
    pd = sys.modules.get("pandas")
    if pd is None:
        return "[]"
    tablas = []
    for nombre, valor in list(globals().items()):
        if nombre.startswith("_") or len(tablas) >= ${MAX_TABLAS}:
            continue
        try:
            if isinstance(valor, pd.Series):
                valor = valor.to_frame(name=valor.name if valor.name is not None else nombre)
            if not isinstance(valor, pd.DataFrame):
                continue
            muestra = valor.head(${FILAS_POR_TABLA})
            if not isinstance(muestra.index, pd.RangeIndex):
                muestra = muestra.reset_index()
            filas = json.loads(muestra.to_json(orient="values", date_format="iso", default_handler=str))
            tablas.append({"nombre": nombre, "columnas": [str(c) for c in muestra.columns], "filas": filas, "total": int(len(valor))})
        except Exception:
            continue
    return json.dumps(tablas)
_tablas_visibles()
`;
```
3. Cambia `ejecutar` dentro de `crearSesionPython` por una versión con tablas opcionales:
```ts
  async function correr(preparacion: string, codigo: string, conTablas: boolean): Promise<ResultadoEjecucion> {
    await py.runPythonAsync(LIMPIAR_VARIABLES);
    tomarSalida();
    if (preparacion.trim()) await py.runPythonAsync(preparacion);
    try {
      await py.runPythonAsync(codigo);
    } catch (error) {
      return { ok: false, error: explicarErrorPython(mensajeDe(error), contexto), salida: tomarSalida() };
    }
    const salida = tomarSalida();
    let tablas: TablaVisible[] = [];
    if (conTablas) {
      try {
        tablas = JSON.parse(String(await py.runPythonAsync(TABLAS_VISIBLES))) as TablaVisible[];
      } catch {
        tablas = [];
      }
    }
    return { ok: true, salida, tablas };
  }
```
4. En el objeto que devuelve `crearSesionPython`, cambia `ejecutar,` por `ejecutar: (preparacion, codigo) => correr(preparacion, codigo, true),`. En `revisar`, cambia `const resultado = await ejecutar(tarea.preparacion, codigo);` por:
```ts
      const resultado = await correr(tarea.preparacion, codigo, false);
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines test && pnpm --filter @syntaxerror/engines exec tsc --noEmit -p ."`
Expected: PASS en todo el paquete y sin errores de tipos.

- [ ] **Step 5: Mostrar las tablas**

`apps/web/src/components/mision/tablas-python.tsx`:
```tsx
import type { TablaVisible } from "@syntaxerror/engines/python";

function formatear(valor: unknown): string {
  return valor === null || valor === undefined ? "NaN" : String(valor);
}

function filas(cantidad: number): string {
  return cantidad === 1 ? "1 fila" : `${cantidad} filas`;
}

// Cada DataFrame que quedó en una variable, ordenado y paso a paso (propuesta, sección 10).
export function TablasPython({ tablas }: { tablas: TablaVisible[] }) {
  if (tablas.length === 0) return null;
  return (
    <div className="grid gap-3">
      {tablas.map((tabla) => (
        <div key={tabla.nombre} className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left font-mono text-sm">
            <caption className="bg-surface-raised px-3 py-2 text-left font-sans text-xs text-muted-foreground">
              <strong className="font-mono text-sm text-foreground">{tabla.nombre}</strong>
              {` · ${filas(tabla.total)}${tabla.total > tabla.filas.length ? ` (se muestran las primeras ${tabla.filas.length})` : ""}`}
            </caption>
            <thead className="bg-surface-raised">
              <tr>{tabla.columnas.map((columna, indice) => <th key={indice} scope="col" className="px-3 py-2 font-bold">{columna}</th>)}</tr>
            </thead>
            <tbody>
              {tabla.filas.map((fila, indice) => (
                <tr key={indice} className="border-t border-border">
                  {fila.map((valor, columna) => <td key={columna} className="px-3 py-2">{formatear(valor)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
```

`apps/web/src/components/mision/python-task.tsx` completo:
```tsx
"use client";

import { useMemo, useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { errorSimple, type ErrorExplicado } from "@syntaxerror/engines/consola";
import { columnasDeArchivos, type TablaVisible } from "@syntaxerror/engines/python";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { EditorConsola } from "@/components/consola/editor";
import { ExplicacionError } from "@/components/consola/explicacion";
import { completarPython, variablesDe } from "@/lib/consola/completado";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";
import { EstadoPython, usePython } from "./python-contexto";
import { TablasPython } from "./tablas-python";

export type PythonTaskProps = { id: string; enunciado?: string; inicial: string; preparacion: string; pruebas: string; pistas: string[] };
const FALLO = "Algo falló al ejecutar Python. Intenta de nuevo.";

export function PythonTask({ id, enunciado, inicial, preparacion, pruebas, pistas }: PythonTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const python = usePython();
  const [codigo, setCodigo] = useState(inicial);
  const [salida, setSalida] = useState<string | null>(null);
  const [error, setError] = useState<ErrorExplicado | null>(null);
  const [tablas, setTablas] = useState<TablaVisible[]>([]);
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  const [corriendo, setCorriendo] = useState(false);
  const completar = useMemo(() => {
    const datos = {
      columnas: columnasDeArchivos(python.opciones.archivos),
      archivos: python.opciones.archivos.map((archivo) => archivo.ruta),
      variables: variablesDe(preparacion),
    };
    return (texto: string, posicion: number) => completarPython(texto, posicion, datos);
  }, [python.opciones, preparacion]);
  async function correr(accion: () => Promise<void>) {
    setCorriendo(true);
    try { await accion(); } catch { setError(errorSimple(FALLO)); setTablas([]); } finally { setCorriendo(false); }
  }
  const ejecutar = () => correr(async () => {
    const ejecucion = await python.cliente().ejecutar(preparacion, codigo);
    setSalida(ejecucion.salida || null);
    setError(ejecucion.ok ? null : ejecucion.error);
    setTablas(ejecucion.ok ? ejecucion.tablas : []);
  });
  const validar = () => correr(async () => {
    const revision = await python.cliente().revisar({ preparacion, pruebas }, codigo);
    setResultado(revision);
    setSalida(revision.salida || null);
    setError(null);
    registrarResultado(id, revision.aprobada);
  });
  const disponible = python.estado === "listo" && !corriendo;
  return (
    <PanelTarea id={id} titulo="tarea Python" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<><Button type="button" variant="secondary" disabled={!disponible} onClick={() => void ejecutar()}>Ejecutar</Button><Button type="button" disabled={!disponible} onClick={() => void validar()}>{corriendo ? "Ejecutando…" : "Validar"}</Button></>}>
      <EstadoPython estado={python.estado} onReintentar={python.iniciar} />
      <EditorConsola etiqueta="Código Python" lenguaje="python" valor={codigo} onCambio={setCodigo} filas={8} completar={completar} error={error} />
      {salida ? <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-sm">{salida}</pre> : null}
      {error ? <ExplicacionError error={error} /> : null}
      <TablasPython tablas={tablas} />
    </PanelTarea>
  );
}
```

En `apps/web/src/components/mision/python-ejemplo.tsx`:

1. Agrega los imports:
```tsx
import type { TablaVisible } from "@syntaxerror/engines/python";
import { TablasPython } from "./tablas-python";
```
2. Después de `const [error, setError] = ...`, agrega:
```tsx
  const [tablas, setTablas] = useState<TablaVisible[]>([]);
```
3. En `probar`, después de `setError(ejecucion.ok ? null : ejecucion.error);`, agrega:
```tsx
      setTablas(ejecucion.ok ? ejecucion.tablas : []);
```
4. Después de `{error ? <ExplicacionError error={error} /> : null}`, agrega:
```tsx
      <TablasPython tablas={tablas} />
```

Con esto el ejemplo de la misión 3 (`ventas = pd.read_csv(...)` y `print(ventas.head())`) muestra el texto impreso y también la tabla `ventas` ordenada, con sus 6 filas.

- [ ] **Step 6: Tipos y pruebas de la web**

Run: `docker compose run --rm tools sh -c "cd apps/web && pnpm exec tsc --noEmit -p . && pnpm exec vitest run"`
Expected: sin errores de tipos y PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/engines apps/web/src/components/mision/tablas-python.tsx apps/web/src/components/mision/python-task.tsx apps/web/src/components/mision/python-ejemplo.tsx
git commit -m "feat(python): tablas de pandas visibles despues de ejecutar

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Pruebas e2e de las consolas y README

**Files:**
- Create: `e2e/tests/consolas.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: todo lo anterior y la misión demo (`/casos/demo-motor`).
- Produces: `e2e/tests/consolas.spec.ts`, con 3 pruebas.

Las tres misiones del caso demo:
- **01 (SQL):** se puede resolver sin sesión.
- **02 (planilla) y 03 (Python):** requieren aprobar la anterior. La prueba con sesión las desbloquea en orden, como haría una persona.

- [ ] **Step 1: Escribir las pruebas**

`e2e/tests/consolas.spec.ts`:
```ts
import { expect, test, type Page } from "./fixtures";

const CASO = "/casos/demo-motor";
const MISION_SQL = `${CASO}/01-clientes-de-regiones`;
const MISION_HOJA = `${CASO}/02-total-de-ventas`;
const MISION_PYTHON = `${CASO}/03-ticket-promedio`;
const CONSULTA_CORRECTA = "SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago';";

async function registrarse(page: Page) {
  const email = `consolas-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
  await page.goto(`/registro?callbackUrl=${encodeURIComponent("/dashboard")}`);
  await page.locator('input[name="name"]').fill("Camila Rojas");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function validarYEsperar(page: Page) {
  const reportado = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;
}

// El editor de CodeMirror reemplaza al textarea después de cargar.
async function editorListo(page: Page, etiqueta: string) {
  await expect(page.locator(`.cm-content[aria-label="${etiqueta}"]`)).toBeVisible({ timeout: 30_000 });
}

test("SQL: colores, sugerencias del caso, glosario y errores explicados", async ({ page }) => {
  await page.goto(MISION_SQL);
  await editorListo(page, "Consulta SQL");
  const editor = page.getByLabel("Consulta SQL");

  await editor.fill("SELECT nombre FROM ");
  await expect(page.locator(".cm-content .tok-keyword", { hasText: "SELECT" })).toBeVisible();
  await editor.pressSequentially("cli");
  // Se hace clic: con "cli" también aparece cliente_id, y el orden entre ambas es de CodeMirror.
  await page.getByRole("option", { name: /clientes/ }).click();
  await expect(editor).toHaveText("SELECT nombre FROM clientes");

  await page.locator(".cm-content .tok-keyword", { hasText: "SELECT" }).hover();
  await expect(page.locator(".consola-glosario")).toContainText("SELECT elige las columnas");

  await editor.fill("SELECT nombre FROM cliente");
  await page.getByRole("button", { name: "Ejecutar" }).click();
  await expect(page.getByText("Línea 1: No existe una tabla llamada «cliente».")).toBeVisible();
  await expect(page.getByText("¿Quisiste decir «clientes»?")).toBeVisible();
  await expect(page.locator(".cm-linea-error")).toHaveCount(1);

  await editor.fill("SELECT nombre FROM clientes WHERE ciudad = Santiago");
  await expect(page.locator(".cm-linea-error")).toHaveCount(0);
  await page.getByRole("button", { name: "Ejecutar" }).click();
  await expect(page.getByText("«Santiago» parece un texto: escríbelo entre comillas simples, 'Santiago'.")).toBeVisible();
});

test("sin sesión, una misión bloqueada muestra el editor pero no deja escribir", async ({ page }) => {
  await page.goto(MISION_PYTHON);
  await editorListo(page, "Código Python");
  await expect(page.getByLabel("Código Python")).toHaveAttribute("contenteditable", "false");
  await expect(page.locator(".cm-content .tok-variableName").first()).toBeVisible();
});

test("planilla y Python: ayuda de funciones, error de celda, error de Python y tablas de pandas", async ({ page }) => {
  test.setTimeout(240_000);
  await registrarse(page);
  await page.goto(MISION_SQL);
  await editorListo(page, "Consulta SQL");
  await page.getByLabel("Consulta SQL").fill(CONSULTA_CORRECTA);
  await validarYEsperar(page);

  await page.goto(MISION_HOJA);
  await page.getByRole("button", { name: "Celda F2" }).click();
  const formula = page.getByLabel("Fórmula");
  await formula.fill("=su");
  await page.getByRole("list", { name: "Funciones sugeridas" }).getByRole("button", { name: "SUMA", exact: true }).click();
  await expect(formula).toHaveValue("=SUMA(");
  await expect(page.getByText("SUMA(número1; [número2]; …)")).toBeVisible();
  await formula.fill("=sumar(d2:d7)");
  await formula.press("Enter");
  await expect(page.getByText("F2: La planilla no conoce la función SUMAR.")).toBeVisible();
  await expect(page.getByText("¿Quisiste decir SUMA?")).toBeVisible();
  await formula.fill("=suma(d2:d7)");
  await formula.press("Enter");
  await expect(page.getByRole("button", { name: "Celda F2" })).toHaveText("1049000");
  await validarYEsperar(page);

  await page.goto(MISION_PYTHON);
  await expect(page.getByText("Python listo")).toBeVisible({ timeout: 150_000 });
  await page.getByRole("button", { name: "Probar ejemplo" }).click();
  await expect(page.locator("caption", { hasText: "ventas" })).toContainText("6 filas");

  await editorListo(page, "Código Python");
  const codigo = page.getByLabel("Código Python");
  await codigo.fill('ticket_promedio = round(venta["monto"].mean())');
  await page.getByRole("button", { name: "Ejecutar" }).click();
  await expect(page.getByText("Línea 1: No existe nada llamado «venta».")).toBeVisible();
  await expect(page.getByText("¿Quisiste decir «ventas»?")).toBeVisible();
  await expect(page.locator(".cm-linea-error")).toHaveCount(1);

  await codigo.fill('ticket_promedio = round(ventas["monto"].mean())');
  await validarYEsperar(page);
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();
});
```

- [ ] **Step 2: Correr las pruebas nuevas**

Run: `docker compose up -d --force-recreate --wait web && docker compose --profile e2e run --rm -e E2E_WORKERS=3 e2e npx playwright test tests/consolas.spec.ts`
Expected: `3 passed`.

Si `fill` no reemplaza el texto en CodeMirror, revisa que `aria-label` esté en `.cm-content` (vía `EditorView.contentAttributes`), no en el contenedor. Playwright escribe en el elemento editable que tiene la etiqueta.

- [ ] **Step 3: README**

Agrega al final de `README.md`:
~~~markdown
## Consolas

Se basan en la sección 10 de la propuesta pedagógica: que escribir código acompañe y no intimide.

- **Editor** (`apps/web/src/components/consola/`):
  - CodeMirror 6, que carga después de la página: mientras tanto, o si la conexión falla, se usa un `textarea`.
  - Sintaxis coloreada, números de línea, cierre de paréntesis y comillas, y resaltado del par correspondiente.
  - Autocompletado con las tablas y columnas del caso (SQL) o con columnas, archivos, variables y métodos de pandas (Python). `Ctrl+Espacio` lo abre.
  - Explicaciones en español al pasar el mouse (`apps/web/src/lib/consola/glosario.ts`), que también llegan por teclado en las sugerencias.
  - Teclado: `Tab` agrega sangría; `Esc` y luego `Tab` sale del editor.
- **Errores en español** (`packages/engines/src/*-errores.ts`, `sheet-ayuda.ts`):
  - cada error trae mensaje, sugerencia ("¿Quisiste decir…?") y línea marcada en el editor;
  - el mensaje original queda disponible en "Mensaje original";
  - en SQL, además, hay avisos de lo que alasql deja pasar en silencio: columnas mal escritas o textos sin comillas.
- **Python:** después de ejecutar se muestran las tablas de pandas que quedaron en variables (hasta 5, con sus primeras 10 filas).
- **Planilla:** ayuda de la función mientras se escribe la fórmula, sugerencias de funciones y explicación del error de la celda.
- **Regla:** una explicación explica el error, nunca entrega la solución de la tarea.
- **Rutas futuras:** las consolas comparten un contrato común. Ver `packages/engines/README.md` para agregar una nueva (terminal, registros, desarrollo web).
~~~

- [ ] **Step 4: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes.

Run: `npm run test:e2e`
Expected: `30 passed` (los 27 anteriores sin cambios y los 3 de consolas).

En desarrollo, la primera vez que se pide el chunk del editor, Next lo compila y puede recargar páginas de otros workers. Al planear esta fase, eso hizo fallar `cuenta.spec.ts` ("completar el caso emite el certificado…") con `net::ERR_ABORTED` en `page.goto`. Esa prueba pasa sola y la suite completa pasa 30/30 en producción. Si es la única falla y tiene ese error, córrela sola para confirmarlo. Cualquier otra falla sí hay que investigarla.

Run: `npm run test:e2e`
Expected: otra vez `30 passed`.

Run: `docker compose down && npm run test:e2e:prod`
Expected: `30 passed` contra el build de producción.

Run: `for p in /casos/demo-motor /casos/demo-motor/01-clientes-de-regiones; do curl -s -o /dev/null localhost:3000$p; curl -s -D - -o /dev/null localhost:3000$p | grep -i x-nextjs-cache; done`
Expected: `x-nextjs-cache: HIT` dos veces.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml down`

- [ ] **Step 5: Commit**

```bash
git add e2e/tests/consolas.spec.ts README.md
git commit -m "test(e2e): consolas con colores, sugerencias, errores explicados y tablas de pandas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Fase 4: contenido.**
- La plataforma queda completa para la ruta Data Analyst.
- Lo que sigue es escribir los casos en el orden aprobado:
  1. Caso 0, "Herramientas del oficio" (GitHub);
  2. Planillas;
  3. SQL;
  4. Python;
  5. Visualización (Power BI o Looker Studio);
  6. Proyecto final.
- Cada caso termina con su misión sin guía, repasa lo anterior y trae sus `archivos` y su `rubrica`.
- Antes de empezar hay que cerrar las preguntas abiertas del equipo: nombres de empresas, quién revisa con la rúbrica y los datasets.
