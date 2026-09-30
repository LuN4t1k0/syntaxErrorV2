# Fase 2: Motor de Misiones. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un caso se escriba como contenido en `content/` (YAML, CSV y MDX) y se publique como misiones estáticas donde el alumno resuelve tareas de SQL, planilla y Python en su navegador, con progreso guardado en la base y entregable enlazado.

**Architecture:**
- `packages/engines` tiene los tres motores de lanzamiento como funciones puras que corren igual en Node (validador y tests) y en el navegador: `sql` (alasql), `sheet` (HyperFormula) y `python` (Pyodide, con un cliente que maneja el Web Worker y el timeout).
- `packages/content` carga y valida `content/` con schemas zod, extrae los bloques de cada MDX sin renderizarlo, valida que cada `solucion` pase su propio motor y sincroniza rutas y casos con la base.
- `apps/web` genera las páginas de catálogo y de misión en el build (`dynamic = "error"`, sin `auth()` ni base). El progreso se consulta y se guarda desde el navegador vía `/api/progreso`, con `localStorage` cuando no hay sesión o conexión.
- Pyodide y pandas se cargan desde jsDelivr (`https://cdn.jsdelivr.net/pyodide/v0.28.3/full/`), con caché inmutable del CDN y sin pasar por nuestro servidor. **Decisión a confirmar:** el spec (§13) pide servir Pyodide con caché inmutable; el CDN cumple eso sin sumar RAM ni ancho de banda al web. Si se prefiere auto-hospedarlo, se cambia solo la constante `PYODIDE_CDN` en la Fase 5.
- A las tareas SQL el navegador recibe las filas esperadas, no la consulta solución.

**Tech Stack:** Node 22, pnpm 11.9.0, Next.js 15, React 19, TypeScript 5, Drizzle ORM 0.36, zod 3, alasql 4.19.1, HyperFormula 3.4.0, Pyodide 0.28.3, @mdx-js/mdx 3.1.1, gray-matter 4.0.3, yaml 2.9.1, papaparse 5.7.0, Vitest 4, Playwright 1.55.

**Spec:** `docs/superpowers/specs/2026-09-29-syntaxerror-v2-design.md` (secciones 3, 7, 8, 11, 12 y 16 [Fase 2]).

## Global Constraints

- Todo se ejecuta en contenedores. Ningún paso corre `pnpm` o `node` en el host: se usa `docker compose run --rm tools ...`.
- Si los contenedores de la v1 (`cursos-*`) están arriba, ocupan los puertos 5432, 5433, 6379, 1025 y 8025: detenlos antes con `docker compose -p cursos stop`.
- Nombres de paquetes nuevos: `@syntaxerror/engines` y `@syntaxerror/content`. Cada uno agrega su volumen `node_modules` a `x-node.volumes` y a `volumes:` de `docker-compose.yml`.
- Todo el texto visible para el alumno va en español de Chile, con tildes y `¿`/`¡` (tú, no voseo).
- Los motores corren client-side. El servidor solo guarda progreso y entregables (spec §3.2).
- Ninguna misión se publica sin tarea práctica (spec §3.1, §7.4). El build de `web` falla si el contenido no valida.
- Solo se publica lo terminado (spec §3.4): en producción solo se generan las rutas con `estado: publicada` y sus casos. En desarrollo, `CONTENT_INCLUDE_DRAFTS=true` muestra también los borradores.
- Las páginas de misión y catálogo son estáticas: no llaman a `auth()` ni a la base.
- Versiones fijas: `alasql@4.19.1`, `hyperformula@3.4.0`, `pyodide@0.28.3` (debe coincidir con `PYODIDE_VERSION`).
- Commits: mensajes en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Consulta SQL con `;` final o comentarios `--`:** es lo que escribe cualquiera que viene de un cliente SQL. Debe ejecutarse igual que sin ellos. Test en Task 1.
2. **Fórmula de planilla con `;` y en minúsculas** (`=suma(d2;d7)`), como en Excel en español: debe calcular lo mismo que `=SUMA(D2,D7)`. Test en Task 2.
3. **Python con un ciclo infinito:** debe cortarse con un mensaje claro y la siguiente ejecución debe funcionar sin recargar la página. Test en Task 3.
4. **Progreso repetido** (validar dos veces la misma tarea, o sincronizar desde `localStorage` algo que ya estaba en el servidor): no debe duplicar tareas ni cambiar el estado. Tests en Task 7.
5. **Contenido roto** (misión listada en `caso.yaml` sin archivo, `.mdx` que no está listado, MDX con error de sintaxis o componente desconocido): el error debe nombrar el archivo. Tests en Task 4.

## Estructura de archivos

```
packages/engines/src/
  tipos.ts            Fila, ResultadoTarea
  sql.ts              base alasql aislada por revisión, comparación y diagnósticos
  sheet.ts            HyperFormula en español, lectura/escritura A1 y revisión de celdas
  python.ts           sesión Pyodide: archivos, stdout, revisión con asserts
  python-cliente.ts   protocolo con el Web Worker y timeout (reinicia el worker)
packages/content/src/
  esquemas.ts         schemas zod de ruta, caso, frontmatter y bloques
  tipos.ts            Contenido, Ruta, Caso, Mision, Tabla
  bloques.ts          compila MDX y extrae bloques sin renderizar
  cargar.ts           lee content/ y junta todos los problemas
  publicacion.ts      rutas y casos visibles, tareas de una misión
  datos.ts            tablas SQL, archivos Python y grillas desde datos/*.csv
  validar.ts          reglas del spec §7.4 (incluye ejecutar cada solución)
  revisor-python.ts   revisor de soluciones Python con Pyodide en Node
  validar-cli.ts      `pnpm --filter @syntaxerror/content validate`
  sincronizar.ts      upsert de rutas, casos y ruta_casos
  sincronizar-cli.ts  `pnpm --filter @syntaxerror/content sync` (lo usa db-setup)
content/
  rutas/data-analyst.yaml               borrador
  casos/demo-motor/                     caso de demostración (una misión por motor)
apps/web/src/
  lib/contenido.ts                      carga cacheada y visibilidad
  lib/sesion.ts                         obtenerUsuarioId()
  lib/progreso/{esquemas,servicio,cliente}.ts
  lib/csp.ts, lib/mezclar.ts
  app/api/progreso/route.ts, app/api/progreso/sync/route.ts, app/api/entregables/route.ts
  app/(misiones)/layout.tsx, rutas/, rutas/[ruta]/, casos/[caso]/, casos/[caso]/[mision]/
  components/mision/*                   bloques, tareas y proveedores
  engines/python.worker.ts
```

---

### Task 1: `packages/engines` con el motor SQL

**Files:**
- Create: `packages/engines/package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `packages/engines/src/tipos.ts`, `packages/engines/src/sql.ts`
- Test: `packages/engines/src/sql.test.ts`
- Modify: `docker-compose.yml` (volumen `engines_node_modules`)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `@syntaxerror/engines/tipos`: `type Fila = Record<string, unknown>`, `type ResultadoTarea = { aprobada: boolean; diagnostico: string | null }`.
  - `@syntaxerror/engines/sql`:
    - `type Tablas = Record<string, Fila[]>`;
    - `type ModoComparacion = "filas-en-orden" | "filas-sin-orden" | "estado-tabla"`;
    - `type SqlTarea = { solucion: string; comparar: ModoComparacion; verificar?: string }`;
    - `type SqlComparacion = { comparar: ModoComparacion; verificar?: string; esperadas: Fila[] }`;
    - `crearBaseSql(tablas: Tablas): BaseSql`;
    - `ejecutarSql(base: BaseSql, consulta: string, opciones?: { permitirEscritura?: boolean }): Fila[]`;
    - `calcularEsperado(tablas: Tablas, tarea: SqlTarea): Fila[]`;
    - `compararSql(tablas: Tablas, tarea: SqlComparacion, consulta: string): ResultadoTarea`;
    - `revisarSql(tablas: Tablas, tarea: SqlTarea, consulta: string): ResultadoTarea`.

- [x] **Step 1: Crear `package.json`, `tsconfig.json` y `vitest.config.ts`**

`packages/engines/package.json`:
```json
{
  "name": "@syntaxerror/engines",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./tipos": "./src/tipos.ts",
    "./sql": "./src/sql.ts",
    "./sheet": "./src/sheet.ts",
    "./python": "./src/python.ts",
    "./python-cliente": "./src/python-cliente.ts"
  },
  "scripts": { "test": "vitest run" },
  "dependencies": {
    "alasql": "4.19.1"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vitest": "^4.1.9"
  }
}
```

`packages/engines/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "types": ["node"] }, "include": ["src"] }
```

`packages/engines/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", testTimeout: 30_000 },
});
```

En `docker-compose.yml`, agregar a `x-node.volumes` `- engines_node_modules:/app/packages/engines/node_modules`, y en `volumes:` agregar `engines_node_modules:`.

- [x] **Step 2: Crear `src/tipos.ts`**

```ts
export type Fila = Record<string, unknown>;

export type ResultadoTarea = { aprobada: boolean; diagnostico: string | null };
```

- [x] **Step 3: Escribir el test que falla, `src/sql.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  calcularEsperado,
  compararSql,
  crearBaseSql,
  ejecutarSql,
  revisarSql,
  type SqlTarea,
  type Tablas,
} from "./sql";

const tablas: Tablas = {
  clientes: [
    { id: 1, nombre: "Ferretería El Roble", ciudad: "Santiago" },
    { id: 2, nombre: "Almacén Doña Rosa", ciudad: "Temuco" },
    { id: 3, nombre: "Comercial Pacífico", ciudad: "Valparaíso" },
    { id: 4, nombre: "Minimarket Los Aromos", ciudad: "Santiago" },
  ],
};

const fueraDeSantiago: SqlTarea = {
  solucion: "SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago'",
  comparar: "filas-sin-orden",
};

describe("ejecutarSql", () => {
  it("devuelve las filas de un SELECT", () => {
    const filas = ejecutarSql(crearBaseSql(tablas), "SELECT id FROM clientes WHERE ciudad = 'Santiago'");
    expect(filas).toEqual([{ id: 1 }, { id: 4 }]);
  });

  it("acepta punto y coma final y comentarios", () => {
    const consulta = "-- solo Santiago\nSELECT id FROM clientes /* filtro */ WHERE ciudad = 'Santiago';";
    expect(ejecutarSql(crearBaseSql(tablas), consulta)).toEqual([{ id: 1 }, { id: 4 }]);
  });

  it("rechaza sentencias que modifican datos si la tarea no lo permite", () => {
    expect(() => ejecutarSql(crearBaseSql(tablas), "DELETE FROM clientes")).toThrow(
      "En esta tarea solo puedes usar consultas SELECT."
    );
  });

  it("rechaza una consulta vacía o solo con comentarios", () => {
    expect(() => ejecutarSql(crearBaseSql(tablas), "  -- nada\n")).toThrow("Escribe una consulta antes de ejecutar.");
  });

  it("redondea decimales para comparar sin ruido de punto flotante", () => {
    expect(ejecutarSql(crearBaseSql(tablas), "SELECT 0.1 + 0.2 AS total")).toEqual([{ total: 0.3 }]);
  });
});

describe("revisarSql", () => {
  it("aprueba la solución en otro orden cuando comparar es filas-sin-orden", () => {
    const consulta = "SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago' ORDER BY nombre DESC";
    expect(revisarSql(tablas, fueraDeSantiago, consulta)).toEqual({ aprobada: true, diagnostico: null });
  });

  it("acepta columnas con otro alias, en el mismo orden", () => {
    const consulta = "SELECT nombre AS cliente, ciudad AS comuna FROM clientes WHERE ciudad <> 'Santiago'";
    expect(revisarSql(tablas, fueraDeSantiago, consulta).aprobada).toBe(true);
  });

  it("dice cuántas filas trae y cuántas se esperan", () => {
    const resultado = revisarSql(tablas, fueraDeSantiago, "SELECT nombre, ciudad FROM clientes");
    expect(resultado).toEqual({ aprobada: false, diagnostico: "Tu consulta trae 4 filas, se esperan 2." });
  });

  it("avisa cuando solo falla el orden", () => {
    const tarea: SqlTarea = { solucion: "SELECT nombre FROM clientes ORDER BY nombre", comparar: "filas-en-orden" };
    expect(revisarSql(tablas, tarea, "SELECT nombre FROM clientes ORDER BY nombre DESC").diagnostico).toBe(
      "Las filas son correctas, pero el orden no coincide. Revisa el ORDER BY."
    );
  });

  it("muestra el error de sintaxis de la consulta", () => {
    const resultado = revisarSql(tablas, fueraDeSantiago, "SELEC nombre FROM clientes");
    expect(resultado.aprobada).toBe(false);
    expect(resultado.diagnostico).toMatch(/^Tu consulta tiene un error: /);
  });

  it("compara el estado de la tabla después de un UPDATE", () => {
    const tarea: SqlTarea = {
      solucion: "UPDATE clientes SET ciudad = 'Viña del Mar' WHERE id = 3",
      comparar: "estado-tabla",
      verificar: "SELECT id, ciudad FROM clientes ORDER BY id",
    };
    expect(revisarSql(tablas, tarea, "update clientes set ciudad='Viña del Mar' where id=3;").aprobada).toBe(true);
    expect(revisarSql(tablas, tarea, "UPDATE clientes SET ciudad = 'Viña del Mar' WHERE id = 2").diagnostico).toBe(
      "La columna 'ciudad' no coincide en algunas filas. Revisa el cálculo o el filtro."
    );
  });

  it("cada revisión usa una copia: un DELETE del alumno no afecta a la siguiente", () => {
    const tarea: SqlTarea = {
      solucion: "DELETE FROM clientes WHERE id = 4",
      comparar: "estado-tabla",
      verificar: "SELECT id FROM clientes ORDER BY id",
    };
    expect(revisarSql(tablas, tarea, "DELETE FROM clientes").aprobada).toBe(false);
    expect(tablas.clientes).toHaveLength(4);
    expect(revisarSql(tablas, fueraDeSantiago, fueraDeSantiago.solucion).aprobada).toBe(true);
  });

  it("compararSql usa las filas esperadas calculadas de antemano", () => {
    const esperadas = calcularEsperado(tablas, fueraDeSantiago);
    expect(esperadas).toHaveLength(2);
    const consulta = "SELECT nombre, ciudad FROM clientes WHERE ciudad IN ('Temuco', 'Valparaíso')";
    expect(compararSql(tablas, { comparar: "filas-sin-orden", esperadas }, consulta).aprobada).toBe(true);
  });
});
```

- [x] **Step 4: Instalar y ver fallar el test**

Run: `docker compose run --rm tools pnpm install && docker compose run --rm tools pnpm --filter @syntaxerror/engines test`
Expected: FAIL, porque no se puede resolver `./sql`.

- [x] **Step 5: Crear `src/sql.ts`** (portado de `$V1/aula-sql/src/lib/sql-engine.js`, con una base aislada por revisión en vez de la base global)

```ts
import alasql from "alasql";
import type { Fila, ResultadoTarea } from "./tipos";

export type Tablas = Record<string, Fila[]>;
export type ModoComparacion = "filas-en-orden" | "filas-sin-orden" | "estado-tabla";
export type SqlTarea = { solucion: string; comparar: ModoComparacion; verificar?: string };
export type SqlComparacion = { comparar: ModoComparacion; verificar?: string; esperadas: Fila[] };

export type BaseSql = {
  exec(consulta: string): unknown;
  tables: Record<string, { data: Fila[] }>;
};

const Database = (alasql as unknown as { Database: new () => BaseSql }).Database;

export function crearBaseSql(tablas: Tablas): BaseSql {
  const base = new Database();
  for (const [nombre, filas] of Object.entries(tablas)) {
    base.exec(`CREATE TABLE ${nombre}`);
    base.tables[nombre].data = structuredClone(filas);
  }
  return base;
}

function quitarComentarios(consulta: string): string {
  return consulta.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

function separarSentencias(consulta: string, permitirEscritura: boolean): string[] {
  const sentencias = quitarComentarios(consulta)
    .split(";")
    .map((sentencia) => sentencia.trim())
    .filter(Boolean);
  if (sentencias.length === 0) throw new Error("Escribe una consulta antes de ejecutar.");
  if (!permitirEscritura && sentencias.some((sentencia) => !/^(select|with)\b/i.test(sentencia))) {
    throw new Error("En esta tarea solo puedes usar consultas SELECT.");
  }
  return sentencias;
}

function normalizarFilas(filas: Fila[]): Fila[] {
  return filas.map((fila) =>
    Object.fromEntries(
      Object.entries(fila).map(([columna, valor]) => [
        columna,
        typeof valor === "number" ? Number(valor.toFixed(4)) : valor,
      ])
    )
  );
}

export function ejecutarSql(
  base: BaseSql,
  consulta: string,
  { permitirEscritura = false }: { permitirEscritura?: boolean } = {}
): Fila[] {
  let resultado: unknown = [];
  for (const sentencia of separarSentencias(consulta, permitirEscritura)) {
    resultado = base.exec(sentencia);
  }
  return Array.isArray(resultado) ? normalizarFilas(resultado as Fila[]) : [];
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function serializar(filas: Fila[], sinOrden: boolean): string {
  const lineas = filas.map((fila) => JSON.stringify(fila));
  if (sinOrden) lineas.sort();
  return JSON.stringify(lineas);
}

function tomarColumnas(fila: Fila, columnas: string[]): Fila {
  const posicionales = Object.values(fila);
  return Object.fromEntries(
    columnas.map((columna, indice) => [columna, columna in fila ? fila[columna] : posicionales[indice]])
  );
}

function plural(cantidad: number, palabra: string): string {
  return `${cantidad} ${palabra}${cantidad === 1 ? "" : "s"}`;
}

function describirDiferencia(esperadas: Fila[], actuales: Fila[], sinOrden: boolean): string {
  if (actuales.length !== esperadas.length) {
    return `Tu consulta trae ${plural(actuales.length, "fila")}, se esperan ${esperadas.length}.`;
  }
  if (esperadas.length === 0) return "Tu resultado no coincide con lo esperado.";

  const columnas = Object.keys(esperadas[0]);
  const columnasActuales = Object.keys(actuales[0]).length;
  if (columnasActuales < columnas.length) {
    return `Tu consulta debe devolver ${plural(columnas.length, "columna")} (${columnas.join(", ")}); la tuya trae ${columnasActuales}.`;
  }

  const comparables = actuales.map((fila) => tomarColumnas(fila, columnas));
  if (!sinOrden) {
    if (serializar(comparables, true) === serializar(esperadas, true)) {
      return "Las filas son correctas, pero el orden no coincide. Revisa el ORDER BY.";
    }
    const coincide = (columna: string) =>
      esperadas.every((fila, indice) => JSON.stringify(comparables[indice][columna]) === JSON.stringify(fila[columna]));
    for (const columna of columnas) {
      if (!coincide(columna) && columnas.filter((otra) => otra !== columna).every(coincide)) {
        return `La columna '${columna}' no coincide en algunas filas. Revisa el cálculo o el filtro.`;
      }
    }
  }
  return "Tu resultado no coincide con lo esperado. Revisa el filtro, el orden y las columnas.";
}

function consultaDeVerificacion(tarea: { verificar?: string }): string {
  if (!tarea.verificar) throw new Error('comparar="estado-tabla" necesita la consulta verificar');
  return tarea.verificar;
}

export function calcularEsperado(tablas: Tablas, tarea: SqlTarea): Fila[] {
  if (tarea.comparar !== "estado-tabla") return ejecutarSql(crearBaseSql(tablas), tarea.solucion);
  const base = crearBaseSql(tablas);
  ejecutarSql(base, tarea.solucion, { permitirEscritura: true });
  return ejecutarSql(base, consultaDeVerificacion(tarea));
}

export function compararSql(tablas: Tablas, tarea: SqlComparacion, consulta: string): ResultadoTarea {
  let actuales: Fila[];
  try {
    const base = crearBaseSql(tablas);
    if (tarea.comparar === "estado-tabla") {
      ejecutarSql(base, consulta, { permitirEscritura: true });
      actuales = ejecutarSql(base, consultaDeVerificacion(tarea));
    } else {
      actuales = ejecutarSql(base, consulta);
    }
  } catch (error) {
    return { aprobada: false, diagnostico: `Tu consulta tiene un error: ${mensajeDe(error)}` };
  }

  const sinOrden = tarea.comparar === "filas-sin-orden";
  const columnas = tarea.esperadas.length ? Object.keys(tarea.esperadas[0]) : null;
  const comparables = columnas ? actuales.map((fila) => tomarColumnas(fila, columnas)) : actuales;
  if (serializar(comparables, sinOrden) === serializar(tarea.esperadas, sinOrden)) {
    return { aprobada: true, diagnostico: null };
  }
  return { aprobada: false, diagnostico: describirDiferencia(tarea.esperadas, actuales, sinOrden) };
}

export function revisarSql(tablas: Tablas, tarea: SqlTarea, consulta: string): ResultadoTarea {
  return compararSql(tablas, { ...tarea, esperadas: calcularEsperado(tablas, tarea) }, consulta);
}
```

- [x] **Step 6: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines test && cd packages/engines && pnpm exec tsc --noEmit -p ."`
Expected: PASS (13 tests) y `tsc` sin errores.

- [x] **Step 7: Commit**

```bash
git add packages/engines docker-compose.yml pnpm-lock.yaml
git commit -m "feat(engines): motor sql con base aislada por revision

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Motor de planilla (`sheet`)

**Files:**
- Create: `packages/engines/src/sheet.ts`
- Test: `packages/engines/src/sheet.test.ts`
- Modify: `packages/engines/package.json` (dependencia `hyperformula`)

**Interfaces:**
- Consumes: `Fila`, `ResultadoTarea` (Task 1).
- Produces (`@syntaxerror/engines/sheet`):
  - `type ValorCelda = string | number | boolean | null`, `type Grilla = ValorCelda[][]`, `type Hoja = HyperFormula`;
  - `type CeldaEsperada = { celda: string; valor: string | number | boolean; funcion?: string }`, `type SheetTarea = { celdas: CeldaEsperada[] }`;
  - `columnaALetra(indice: number): string`, `leerDireccion(a1: string): { row: number; col: number }`;
  - `normalizarFormula(contenido: string): string`;
  - `crearHoja(grilla: Grilla): Hoja`, `escribirCelda(hoja: Hoja, a1: string, contenido: string | number): void`;
  - `leerValor(hoja: Hoja, a1: string): unknown`, `leerFormula(hoja: Hoja, a1: string): string | undefined`;
  - `dimensiones(hoja: Hoja): { filas: number; columnas: number }`, `formatearValor(valor: unknown): string`;
  - `revisarHoja(hoja: Hoja, tarea: SheetTarea): ResultadoTarea`;
  - `aplicarSolucion(grilla: Grilla, solucion: Record<string, string | number>): Hoja`;
  - `grillaDesdeFilas(filas: Fila[]): Grilla`.

- [x] **Step 1: Agregar HyperFormula**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines add hyperformula@3.4.0`
Expected: `package.json` de engines queda con `"hyperformula": "3.4.0"` en `dependencies`.

- [x] **Step 2: Escribir el test que falla, `src/sheet.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  aplicarSolucion,
  columnaALetra,
  crearHoja,
  escribirCelda,
  grillaDesdeFilas,
  leerDireccion,
  leerFormula,
  leerValor,
  revisarHoja,
  type Grilla,
  type SheetTarea,
} from "./sheet";

const ventas: Grilla = [
  ["id", "monto"],
  [101, 185000],
  [102, 62000],
  [103, 240000],
];

const total: SheetTarea = { celdas: [{ celda: "C2", valor: 487000, funcion: "SUMA" }] };

describe("direcciones A1", () => {
  it("convierte índices a letras y letras a posiciones", () => {
    expect([columnaALetra(0), columnaALetra(25), columnaALetra(26)]).toEqual(["A", "Z", "AA"]);
    expect(leerDireccion("AA10")).toEqual({ row: 9, col: 26 });
  });
});

describe("crearHoja y escribirCelda", () => {
  it("calcula las fórmulas de la grilla inicial", () => {
    const hoja = crearHoja([["a"], [1], [2], ["=SUMA(A2:A3)"]]);
    expect(leerValor(hoja, "A4")).toBe(3);
  });

  it("acepta ; como separador y funciones en minúsculas, como en Excel en español", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=suma(b2;b3)");
    expect(leerValor(hoja, "C2")).toBe(247000);
    expect(leerFormula(hoja, "C2")).toBe("=SUMA(B2,B3)");
  });

  it("no cambia los ; ni las mayúsculas dentro de un texto", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", '=SI(B2>100000;"alto;Medio";"bajo")');
    expect(leerValor(hoja, "C2")).toBe("alto;Medio");
  });
});

describe("revisarHoja", () => {
  it("aprueba el valor correcto calculado con la función pedida", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=SUMA(B2:B4)");
    expect(revisarHoja(hoja, total)).toEqual({ aprobada: true, diagnostico: null });
  });

  it("exige la función cuando la tarea la pide, aunque el número sea correcto", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "487000");
    expect(revisarHoja(hoja, total).diagnostico).toBe("La celda C2 debe calcularse con la función SUMA.");
  });

  it("SUMAR.SI no cuenta como SUMA", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", '=SUMAR.SI(B2:B4;">0")');
    expect(revisarHoja(hoja, total).aprobada).toBe(false);
  });

  it("muestra el valor obtenido y el esperado", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=SUMA(B2:B3)");
    expect(revisarHoja(hoja, total).diagnostico).toBe('La celda C2 muestra "247000" y se espera "487000".');
  });

  it("informa los errores de fórmula", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=B2/0");
    expect(revisarHoja(hoja, total).diagnostico).toBe("La celda C2 tiene un error: #DIV/0!.");
  });

  it("tolera diferencias de decimales menores a 0,0001", () => {
    const hoja = crearHoja(ventas);
    escribirCelda(hoja, "C2", "=1/3");
    expect(revisarHoja(hoja, { celdas: [{ celda: "C2", valor: 0.33333 }] }).aprobada).toBe(true);
  });
});

describe("grillas desde datos", () => {
  it("grillaDesdeFilas pone los encabezados en la primera fila", () => {
    expect(grillaDesdeFilas([{ id: 1, ciudad: "Temuco" }, { id: 2, ciudad: null }])).toEqual([
      ["id", "ciudad"],
      [1, "Temuco"],
      [2, null],
    ]);
  });

  it("aplicarSolucion escribe cada celda de la solución", () => {
    const hoja = aplicarSolucion(ventas, { C2: "=SUMA(B2:B4)" });
    expect(revisarHoja(hoja, total).aprobada).toBe(true);
  });
});
```

- [x] **Step 3: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines test -- src/sheet.test.ts`
Expected: FAIL, porque no se puede resolver `./sheet`.

- [x] **Step 4: Crear `src/sheet.ts`** (portado de `$V1/aula-excel/src/lib/sheet-engine.js`)

```ts
import { HyperFormula } from "hyperformula";
import esES from "hyperformula/i18n/languages/esES";
import type { Fila, ResultadoTarea } from "./tipos";

if (!HyperFormula.getRegisteredLanguagesCodes().includes("esES")) {
  HyperFormula.registerLanguage("esES", esES);
}

export type ValorCelda = string | number | boolean | null;
export type Grilla = ValorCelda[][];
export type Hoja = HyperFormula;
export type CeldaEsperada = { celda: string; valor: string | number | boolean; funcion?: string };
export type SheetTarea = { celdas: CeldaEsperada[] };

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function columnaALetra(indice: number): string {
  let letras = "";
  let n = indice + 1;
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = LETRAS[resto] + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

function letraAColumna(letras: string): number {
  let indice = 0;
  for (const letra of letras) indice = indice * 26 + LETRAS.indexOf(letra) + 1;
  return indice - 1;
}

export function leerDireccion(a1: string): { row: number; col: number } {
  const coincidencia = a1.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!coincidencia) throw new Error(`Dirección de celda inválida: ${a1}`);
  return { row: Number(coincidencia[2]) - 1, col: letraAColumna(coincidencia[1]) };
}

// Fuera de los textos entre comillas: ; pasa a , (separador de HyperFormula) y todo va en mayúsculas.
export function normalizarFormula(contenido: string): string {
  if (!contenido.startsWith("=")) return contenido;
  let resultado = "";
  let enTexto = false;
  for (let i = 0; i < contenido.length; i += 1) {
    const caracter = contenido[i];
    if (caracter === '"') {
      if (enTexto && contenido[i + 1] === '"') {
        resultado += '""';
        i += 1;
        continue;
      }
      enTexto = !enTexto;
      resultado += caracter;
      continue;
    }
    if (enTexto) resultado += caracter;
    else resultado += caracter === ";" ? "," : caracter.toUpperCase();
  }
  return resultado;
}

export function crearHoja(grilla: Grilla): Hoja {
  const normalizada = grilla.map((fila) =>
    fila.map((valor) => (typeof valor === "string" ? normalizarFormula(valor) : valor))
  );
  return HyperFormula.buildFromArray(normalizada, { licenseKey: "gpl-v3", language: "esES" });
}

export function escribirCelda(hoja: Hoja, a1: string, contenido: string | number): void {
  const valor = typeof contenido === "string" ? normalizarFormula(contenido.trim()) : contenido;
  hoja.setCellContents({ sheet: 0, ...leerDireccion(a1) }, valor);
}

export function leerValor(hoja: Hoja, a1: string): unknown {
  return hoja.getCellValue({ sheet: 0, ...leerDireccion(a1) });
}

export function leerFormula(hoja: Hoja, a1: string): string | undefined {
  return hoja.getCellFormula({ sheet: 0, ...leerDireccion(a1) });
}

export function dimensiones(hoja: Hoja): { filas: number; columnas: number } {
  const { height, width } = hoja.getSheetDimensions(0);
  return { filas: height, columnas: width };
}

function esError(valor: unknown): valor is { value: string } {
  return typeof valor === "object" && valor !== null && "type" in valor && "value" in valor;
}

export function formatearValor(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (esError(valor)) return String(valor.value);
  return String(valor);
}

function mismoValor(actual: unknown, esperado: string | number | boolean): boolean {
  if (typeof actual === "number" && typeof esperado === "number") return Math.abs(actual - esperado) < 0.0001;
  if (typeof actual === "string" && typeof esperado === "string") return actual.trim() === esperado.trim();
  return actual === esperado;
}

function usaFuncion(formula: string, funcion: string): boolean {
  const nombre = funcion.toUpperCase().replace(/\./g, "\\.");
  return new RegExp(`(^|[^A-Z0-9.])${nombre}\\(`).test(formula.toUpperCase());
}

export function revisarHoja(hoja: Hoja, tarea: SheetTarea): ResultadoTarea {
  for (const esperada of tarea.celdas) {
    const valor = leerValor(hoja, esperada.celda);
    if (esError(valor)) {
      return { aprobada: false, diagnostico: `La celda ${esperada.celda} tiene un error: ${valor.value}.` };
    }
    if (esperada.funcion) {
      const formula = leerFormula(hoja, esperada.celda);
      if (!formula || !usaFuncion(formula, esperada.funcion)) {
        return {
          aprobada: false,
          diagnostico: `La celda ${esperada.celda} debe calcularse con la función ${esperada.funcion.toUpperCase()}.`,
        };
      }
    }
    if (!mismoValor(valor, esperada.valor)) {
      return {
        aprobada: false,
        diagnostico: `La celda ${esperada.celda} muestra "${formatearValor(valor)}" y se espera "${esperada.valor}".`,
      };
    }
  }
  return { aprobada: true, diagnostico: null };
}

export function aplicarSolucion(grilla: Grilla, solucion: Record<string, string | number>): Hoja {
  const hoja = crearHoja(grilla);
  for (const [celda, contenido] of Object.entries(solucion)) escribirCelda(hoja, celda, contenido);
  return hoja;
}

function aCelda(valor: unknown): ValorCelda {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "number" || typeof valor === "boolean") return valor;
  return String(valor);
}

export function grillaDesdeFilas(filas: Fila[]): Grilla {
  if (filas.length === 0) return [];
  const columnas = Object.keys(filas[0]);
  return [columnas, ...filas.map((fila) => columnas.map((columna) => aCelda(fila[columna])))];
}
```

- [x] **Step 5: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines test && cd packages/engines && pnpm exec tsc --noEmit -p ."`
Expected: PASS (25 tests en total) y `tsc` sin errores.

- [x] **Step 6: Commit**

```bash
git add packages/engines pnpm-lock.yaml
git commit -m "feat(engines): motor de planilla con hyperformula en espanol

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Motor Python (sesión Pyodide y cliente del Web Worker con timeout)

**Files:**
- Create: `packages/engines/src/python.ts`, `packages/engines/src/python-cliente.ts`
- Test: `packages/engines/src/python.test.ts`, `packages/engines/src/python-cliente.test.ts`
- Modify: `packages/engines/package.json` (devDependency `pyodide`)

**Interfaces:**
- Consumes: `ResultadoTarea` (Task 1).
- Produces:
  - `@syntaxerror/engines/python`:
    - `PYODIDE_VERSION = "0.28.3"`, `PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/"`;
    - `type Archivo = { ruta: string; contenido: string }` (ruta relativa, por ejemplo `datos/ventas.csv`);
    - `type OpcionesPython = { paquetes: string[]; archivos: Archivo[] }`;
    - `type ResultadoEjecucion = { ok: true; salida: string } | { ok: false; error: string; salida: string }`;
    - `type ResultadoRevision = ResultadoTarea & { salida: string }`;
    - `type TareaPython = { preparacion: string; pruebas: string }`;
    - `type PyodideLike` (lo mínimo que se usa de Pyodide);
    - `type SesionPython = { ejecutar(preparacion: string, codigo: string): Promise<ResultadoEjecucion>; revisar(tarea: TareaPython, codigo: string): Promise<ResultadoRevision> }`;
    - `crearSesionPython(py: PyodideLike, opciones: OpcionesPython): Promise<SesionPython>`.
  - `@syntaxerror/engines/python-cliente`:
    - `type MensajeWorker` y `type RespuestaWorker` (protocolo del worker);
    - `type TrabajadorLike = { postMessage(mensaje: MensajeWorker): void; terminate(): void; onmessage: ((evento: { data: RespuestaWorker }) => void) | null }`;
    - `type ClientePython = { iniciar(): Promise<void>; ejecutar(preparacion: string, codigo: string): Promise<ResultadoEjecucion>; revisar(tarea: TareaPython, codigo: string): Promise<ResultadoRevision>; destruir(): void }`;
    - `crearClientePython(opciones: OpcionesPython, deps: { crearTrabajador: () => TrabajadorLike; limiteMs?: number; limiteCargaMs?: number }): ClientePython`.

- [x] **Step 1: Agregar Pyodide para los tests en Node**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines add -D pyodide@0.28.3`
Expected: `package.json` de engines queda con `"pyodide": "0.28.3"` en `devDependencies`.

- [x] **Step 2: Escribir el test que falla, `src/python.test.ts`**

Este test carga Pyodide real en Node (unos segundos) y no usa paquetes externos, así que no necesita red.

```ts
import { readFileSync } from "node:fs";
import { loadPyodide } from "pyodide";
import { beforeAll, describe, expect, it } from "vitest";
import { crearSesionPython, PYODIDE_VERSION, type SesionPython, type TareaPython } from "./python";

let sesion: SesionPython;

beforeAll(async () => {
  const py = await loadPyodide();
  sesion = await crearSesionPython(py, {
    paquetes: [],
    archivos: [{ ruta: "datos/ventas.csv", contenido: "id,monto\n1,100\n2,250\n" }],
  });
}, 120_000);

const totalTarea: TareaPython = {
  preparacion: "precio = 450000\nstock = 3",
  pruebas: 'assert total == 1350000, "total debe ser el precio por el stock"',
};

describe("crearSesionPython", () => {
  it("la versión del CDN coincide con la de pyodide instalada", () => {
    const paquete = JSON.parse(
      readFileSync(new URL("../node_modules/pyodide/package.json", import.meta.url), "utf8")
    ) as { version: string };
    expect(paquete.version).toBe(PYODIDE_VERSION);
  });

  it("ejecutar devuelve lo impreso", async () => {
    expect(await sesion.ejecutar("", 'print("hola")')).toEqual({ ok: true, salida: "hola" });
  });

  it("deja los archivos del caso disponibles con ruta relativa", async () => {
    const resultado = await sesion.ejecutar("", 'print(open("datos/ventas.csv").read().splitlines()[1])');
    expect(resultado).toEqual({ ok: true, salida: "1,100" });
  });

  it("aprueba cuando pasan las pruebas", async () => {
    expect(await sesion.revisar(totalTarea, "total = precio * stock")).toEqual({
      aprobada: true,
      diagnostico: null,
      salida: "",
    });
  });

  it("muestra el mensaje del assert que falla", async () => {
    const resultado = await sesion.revisar(totalTarea, "total = precio + stock");
    expect(resultado.diagnostico).toBe("total debe ser el precio por el stock");
  });

  it("da un mensaje genérico si el assert no tiene mensaje", async () => {
    const resultado = await sesion.revisar({ preparacion: "", pruebas: "assert total == 1" }, "total = 2");
    expect(resultado.diagnostico).toBe("Una prueba no pasó. Revisa el resultado de tu código.");
  });

  it("informa el error de sintaxis del alumno", async () => {
    const resultado = await sesion.revisar(totalTarea, "total = (");
    expect(resultado.diagnostico).toMatch(/^Tu código tiene un error: SyntaxError/);
  });

  it("no arrastra variables de una ejecución anterior", async () => {
    await sesion.ejecutar("", "total = 1350000");
    const resultado = await sesion.revisar(totalTarea, "x = 1");
    expect(resultado.diagnostico).toBe("Falta algo: NameError: name 'total' is not defined");
  });
});
```

- [x] **Step 3: Escribir el test que falla, `src/python-cliente.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  crearClientePython,
  type MensajeWorker,
  type RespuestaWorker,
  type TrabajadorLike,
} from "./python-cliente";

type Responder = (mensaje: MensajeWorker) => RespuestaWorker | null;

class TrabajadorFalso implements TrabajadorLike {
  onmessage: ((evento: { data: RespuestaWorker }) => void) | null = null;
  mensajes: MensajeWorker[] = [];
  terminado = false;

  constructor(private readonly responder: Responder) {}

  postMessage(mensaje: MensajeWorker) {
    this.mensajes.push(mensaje);
    const respuesta = this.responder(mensaje);
    if (respuesta) queueMicrotask(() => this.onmessage?.({ data: respuesta }));
  }

  terminate() {
    this.terminado = true;
  }
}

const opciones = { paquetes: ["pandas"], archivos: [] };
const aprobada = { aprobada: true, diagnostico: null, salida: "" };
const tarea = { preparacion: "", pruebas: "assert True" };

function responde(resultados: Partial<Record<MensajeWorker["tipo"], unknown>>): Responder {
  return (mensaje) =>
    mensaje.tipo in resultados ? { id: mensaje.id, ok: true, resultado: resultados[mensaje.tipo] } : null;
}

describe("crearClientePython", () => {
  it("inicia el worker una sola vez y le pasa las opciones", async () => {
    const creados: TrabajadorFalso[] = [];
    const cliente = crearClientePython(opciones, {
      crearTrabajador: () => {
        const trabajador = new TrabajadorFalso(responde({ iniciar: null, revisar: aprobada }));
        creados.push(trabajador);
        return trabajador;
      },
    });

    expect(await cliente.revisar(tarea, "x = 1")).toEqual(aprobada);
    await cliente.revisar(tarea, "x = 2");

    expect(creados).toHaveLength(1);
    expect(creados[0].mensajes.map((mensaje) => mensaje.tipo)).toEqual(["iniciar", "revisar", "revisar"]);
    expect(creados[0].mensajes[0]).toMatchObject({ tipo: "iniciar", opciones });
  });

  it("corta un ciclo infinito, avisa y la siguiente revisión usa un worker nuevo", async () => {
    const creados: TrabajadorFalso[] = [];
    const cliente = crearClientePython(opciones, {
      limiteMs: 50,
      crearTrabajador: () => {
        const cuelga = creados.length === 0;
        const trabajador = new TrabajadorFalso(
          responde(cuelga ? { iniciar: null } : { iniciar: null, revisar: aprobada })
        );
        creados.push(trabajador);
        return trabajador;
      },
    });

    const cortada = await cliente.revisar(tarea, "while True: pass");
    expect(cortada.aprobada).toBe(false);
    expect(cortada.diagnostico).toContain("tardó más de");
    expect(creados[0].terminado).toBe(true);

    expect(await cliente.revisar(tarea, "x = 1")).toEqual(aprobada);
    expect(creados).toHaveLength(2);
    expect(creados[1].mensajes.map((mensaje) => mensaje.tipo)).toEqual(["iniciar", "revisar"]);
  });

  it("ejecutar también se corta por tiempo", async () => {
    const cliente = crearClientePython(opciones, {
      limiteMs: 50,
      crearTrabajador: () => new TrabajadorFalso(responde({ iniciar: null })),
    });
    const resultado = await cliente.ejecutar("", "while True: pass");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toContain("tardó más de");
  });

  it("si la carga falla se puede reintentar", async () => {
    let intentos = 0;
    const cliente = crearClientePython(opciones, {
      crearTrabajador: () => {
        intentos += 1;
        const falla = intentos === 1;
        return new TrabajadorFalso((mensaje) =>
          falla ? { id: mensaje.id, ok: false, error: "sin red" } : { id: mensaje.id, ok: true, resultado: null }
        );
      },
    });

    await expect(cliente.iniciar()).rejects.toThrow("sin red");
    await expect(cliente.iniciar()).resolves.toBeUndefined();
    expect(intentos).toBe(2);
  });
});
```

- [x] **Step 4: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines test -- src/python.test.ts src/python-cliente.test.ts`
Expected: FAIL, porque no se pueden resolver `./python` ni `./python-cliente`.

- [x] **Step 5: Crear `src/python.ts`** (portado de `$V1/aula-python/src/lib/py-engine.js`, con pruebas `assert` en vez de comparar una variable)

```ts
import type { ResultadoTarea } from "./tipos";

export const PYODIDE_VERSION = "0.28.3";
export const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const DIRECTORIO_TRABAJO = "/home/pyodide";

export type Archivo = { ruta: string; contenido: string };
export type OpcionesPython = { paquetes: string[]; archivos: Archivo[] };
export type ResultadoEjecucion = { ok: true; salida: string } | { ok: false; error: string; salida: string };
export type ResultadoRevision = ResultadoTarea & { salida: string };
export type TareaPython = { preparacion: string; pruebas: string };

export type PyodideLike = {
  runPythonAsync(codigo: string): Promise<unknown>;
  loadPackage(nombres: string[]): Promise<unknown>;
  setStdout(opciones: { batched: (texto: string) => void }): void;
  FS: { mkdirTree(ruta: string): void; writeFile(ruta: string, datos: string): void };
};

export type SesionPython = {
  ejecutar(preparacion: string, codigo: string): Promise<ResultadoEjecucion>;
  revisar(tarea: TareaPython, codigo: string): Promise<ResultadoRevision>;
};

// Borra las variables del alumno entre ejecuciones para que cada intento parta limpio.
const LIMPIAR_VARIABLES = `
for _nombre in list(globals().keys()):
    if not _nombre.startswith("_"):
        del globals()[_nombre]
`;

function ultimaLinea(error: unknown): string {
  const mensaje = error instanceof Error ? error.message : String(error);
  const lineas = mensaje
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);
  return lineas.at(-1) ?? mensaje;
}

function diagnosticoDePrueba(linea: string): string {
  if (linea.startsWith("AssertionError")) {
    const mensaje = linea.slice("AssertionError".length).replace(/^:\s*/, "");
    return mensaje || "Una prueba no pasó. Revisa el resultado de tu código.";
  }
  return `Falta algo: ${linea}`;
}

export async function crearSesionPython(py: PyodideLike, opciones: OpcionesPython): Promise<SesionPython> {
  if (opciones.paquetes.length > 0) await py.loadPackage(opciones.paquetes);
  for (const archivo of opciones.archivos) {
    const ruta = `${DIRECTORIO_TRABAJO}/${archivo.ruta}`;
    py.FS.mkdirTree(ruta.slice(0, ruta.lastIndexOf("/")));
    py.FS.writeFile(ruta, archivo.contenido);
  }

  let lineas: string[] = [];
  py.setStdout({ batched: (texto) => lineas.push(texto) });
  const tomarSalida = () => {
    const salida = lineas.join("\n");
    lineas = [];
    return salida;
  };

  async function ejecutar(preparacion: string, codigo: string): Promise<ResultadoEjecucion> {
    await py.runPythonAsync(LIMPIAR_VARIABLES);
    tomarSalida();
    if (preparacion.trim()) await py.runPythonAsync(preparacion);
    try {
      await py.runPythonAsync(codigo);
    } catch (error) {
      return { ok: false, error: ultimaLinea(error), salida: tomarSalida() };
    }
    return { ok: true, salida: tomarSalida() };
  }

  return {
    ejecutar,
    async revisar(tarea, codigo) {
      const resultado = await ejecutar(tarea.preparacion, codigo);
      if (!resultado.ok) {
        return { aprobada: false, diagnostico: `Tu código tiene un error: ${resultado.error}`, salida: resultado.salida };
      }
      try {
        await py.runPythonAsync(tarea.pruebas);
      } catch (error) {
        return { aprobada: false, diagnostico: diagnosticoDePrueba(ultimaLinea(error)), salida: resultado.salida };
      }
      return { aprobada: true, diagnostico: null, salida: resultado.salida };
    },
  };
}
```

- [x] **Step 6: Crear `src/python-cliente.ts`**

```ts
import type { OpcionesPython, ResultadoEjecucion, ResultadoRevision, TareaPython } from "./python";

export type MensajeWorker =
  | { id: number; tipo: "iniciar"; opciones: OpcionesPython }
  | { id: number; tipo: "ejecutar"; preparacion: string; codigo: string }
  | { id: number; tipo: "revisar"; preparacion: string; pruebas: string; codigo: string };

export type RespuestaWorker = { id: number; ok: true; resultado: unknown } | { id: number; ok: false; error: string };

export type TrabajadorLike = {
  postMessage(mensaje: MensajeWorker): void;
  terminate(): void;
  onmessage: ((evento: { data: RespuestaWorker }) => void) | null;
};

export type ClientePython = {
  iniciar(): Promise<void>;
  ejecutar(preparacion: string, codigo: string): Promise<ResultadoEjecucion>;
  revisar(tarea: TareaPython, codigo: string): Promise<ResultadoRevision>;
  destruir(): void;
};

type SinId<T> = T extends unknown ? Omit<T, "id"> : never;

class ErrorDeTiempo extends Error {}

function mensajeDeTiempo(limiteMs: number): string {
  const segundos = Math.max(1, Math.round(limiteMs / 1000));
  return `Tu código tardó más de ${segundos} segundos y se detuvo. Revisa si tienes un ciclo que nunca termina.`;
}

export function crearClientePython(
  opciones: OpcionesPython,
  {
    crearTrabajador,
    limiteMs = 10_000,
    limiteCargaMs = 120_000,
  }: { crearTrabajador: () => TrabajadorLike; limiteMs?: number; limiteCargaMs?: number }
): ClientePython {
  let trabajador: TrabajadorLike | null = null;
  let listo: Promise<void> | null = null;
  let siguienteId = 1;
  const pendientes = new Map<number, { resolver: (valor: unknown) => void; rechazar: (error: Error) => void }>();

  // Un worker colgado no se puede interrumpir: se termina y el próximo uso crea otro.
  function reiniciar() {
    trabajador?.terminate();
    trabajador = null;
    listo = null;
    for (const pendiente of pendientes.values()) pendiente.rechazar(new Error("El motor de Python se reinició."));
    pendientes.clear();
  }

  function enviar(mensaje: SinId<MensajeWorker>, limite: number): Promise<unknown> {
    const destino = trabajador;
    if (!destino) return Promise.reject(new Error("El motor de Python no está iniciado."));
    const id = siguienteId++;
    return new Promise((resolver, rechazar) => {
      const temporizador = setTimeout(() => {
        pendientes.delete(id);
        reiniciar();
        rechazar(new ErrorDeTiempo());
      }, limite);
      pendientes.set(id, {
        resolver: (valor) => {
          clearTimeout(temporizador);
          resolver(valor);
        },
        rechazar: (error) => {
          clearTimeout(temporizador);
          rechazar(error);
        },
      });
      destino.postMessage({ ...mensaje, id } as MensajeWorker);
    });
  }

  function iniciar(): Promise<void> {
    if (!listo) {
      trabajador = crearTrabajador();
      trabajador.onmessage = ({ data }) => {
        const pendiente = pendientes.get(data.id);
        if (!pendiente) return;
        pendientes.delete(data.id);
        if (data.ok) pendiente.resolver(data.resultado);
        else pendiente.rechazar(new Error(data.error));
      };
      const carga = enviar({ tipo: "iniciar", opciones }, limiteCargaMs).then(() => undefined);
      carga.catch(() => reiniciar());
      listo = carga;
    }
    return listo;
  }

  return {
    iniciar,
    async ejecutar(preparacion, codigo) {
      await iniciar();
      try {
        return (await enviar({ tipo: "ejecutar", preparacion, codigo }, limiteMs)) as ResultadoEjecucion;
      } catch (error) {
        if (error instanceof ErrorDeTiempo) return { ok: false, error: mensajeDeTiempo(limiteMs), salida: "" };
        throw error;
      }
    },
    async revisar(tarea, codigo) {
      await iniciar();
      try {
        return (await enviar(
          { tipo: "revisar", preparacion: tarea.preparacion, pruebas: tarea.pruebas, codigo },
          limiteMs
        )) as ResultadoRevision;
      } catch (error) {
        if (error instanceof ErrorDeTiempo) return { aprobada: false, diagnostico: mensajeDeTiempo(limiteMs), salida: "" };
        throw error;
      }
    },
    destruir: reiniciar,
  };
}
```

- [x] **Step 7: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines test && cd packages/engines && pnpm exec tsc --noEmit -p ."`
Expected: PASS (37 tests en total) y `tsc` sin errores.

- [x] **Step 8: Commit**

```bash
git add packages/engines pnpm-lock.yaml
git commit -m "feat(engines): motor python con pyodide y cliente con timeout

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `packages/content` (schemas, extracción de bloques y cargador)

**Files:**
- Create: `packages/content/package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `packages/content/src/esquemas.ts`, `src/tipos.ts`, `src/bloques.ts`, `src/cargar.ts`, `src/publicacion.ts`, `src/datos.ts`
- Create: `packages/content/test/fixtures/valido/` (una ruta, un caso con tres misiones y un CSV)
- Test: `packages/content/src/bloques.test.ts`, `src/cargar.test.ts`, `src/publicacion.test.ts`
- Modify: `docker-compose.yml` (volumen `content_node_modules`)

**Interfaces:**
- Consumes: `Fila` (Task 1), `Tablas` (Task 1), `grillaDesdeFilas`, `Grilla` (Task 2), `Archivo` (Task 3).
- Produces:
  - `@syntaxerror/content/esquemas`: `rutaSchema`, `casoSchema`, `frontmatterSchema`, `bloqueSchemas` (claves `Brief`, `Concepto`, `SqlEjemplo`, `PythonEjemplo`, `SqlTask`, `PythonTask`, `SheetTask`, `Decision`, `Debrief`), `TIPOS_BLOQUE`, `TIPOS_TAREA`, `type TipoBloque`, `type PropsBloque<T>`, `type Bloque = { tipo; props; texto: string | null }` (unión discriminada por `tipo`), `type BloqueTarea`, `formatearErrorZod(error): string`.
  - `@syntaxerror/content/tipos`: `Ruta`, `Tabla = { nombre; filas: Fila[]; csv: string }`, `Mision = { slug; titulo; tiempo; fuente; bloques: Bloque[] }`, `Caso = { slug; titulo; cargo; empresa; dataset; entregable; misiones: Mision[]; datos: Tabla[] }`, `Contenido = { rutas: Ruta[]; casos: Caso[] }`.
  - `@syntaxerror/content/bloques`: `compilarMision(fuente: string): Promise<MDXContent>`, `extraerBloques(fuente: string): Promise<BloqueCrudo[]>`.
  - `@syntaxerror/content/cargar`: `cargarContenido(dir: string): Promise<Contenido>`, `class ErrorDeContenido extends Error { problemas: string[] }`.
  - `@syntaxerror/content/publicacion`: `rutasVisibles(contenido, incluirBorradores): Ruta[]`, `casosVisibles(contenido, incluirBorradores): Caso[]`, `tareasDeMision(mision): BloqueTarea[]`.
  - `@syntaxerror/content/datos`: `tablasSql(caso): Tablas`, `archivosPython(caso): Archivo[]`, `grillaDeHoja(caso, hoja): Grilla`, `paquetesPython(mision): string[]`.

- [x] **Step 1: Crear `package.json`, `tsconfig.json` y `vitest.config.ts`**

`packages/content/package.json`:
```json
{
  "name": "@syntaxerror/content",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./esquemas": "./src/esquemas.ts",
    "./tipos": "./src/tipos.ts",
    "./bloques": "./src/bloques.ts",
    "./cargar": "./src/cargar.ts",
    "./publicacion": "./src/publicacion.ts",
    "./datos": "./src/datos.ts",
    "./validar": "./src/validar.ts",
    "./sincronizar": "./src/sincronizar.ts"
  },
  "scripts": { "test": "vitest run" },
  "dependencies": {
    "@mdx-js/mdx": "3.1.1",
    "@syntaxerror/engines": "workspace:*",
    "gray-matter": "4.0.3",
    "papaparse": "5.7.0",
    "react": "^19.0.0",
    "yaml": "2.9.1",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/mdx": "^2.0.13",
    "@types/node": "^22.0.0",
    "@types/papaparse": "5.5.2",
    "@types/react": "^19.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^4.1.9"
  }
}
```

`packages/content/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "react-jsx", "types": ["node"] },
  "include": ["src"]
}
```

`packages/content/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", testTimeout: 30_000 },
});
```

En `docker-compose.yml`, agregar a `x-node.volumes` `- content_node_modules:/app/packages/content/node_modules`, y en `volumes:` agregar `content_node_modules:`.

- [x] **Step 2: Crear el fixture `test/fixtures/valido/`**

`test/fixtures/valido/rutas/analista.yaml`:
```yaml
slug: analista
titulo: Analista de datos
cargo: Analista de datos junior
descripcion: Ruta de prueba para los tests del cargador.
estado: publicada
casos:
  - ventas
```

`test/fixtures/valido/casos/ventas/caso.yaml`:
```yaml
slug: ventas
titulo: Ventas de marzo
cargo: Analista de datos junior
empresa: Distribuidora de prueba
dataset: Clientes y ventas de marzo
entregable: Un repositorio con las consultas del caso
misiones:
  - 01-filtrar
  - 02-hoja
  - 03-python
```

`test/fixtures/valido/casos/ventas/datos/clientes.csv`:
```
id,nombre,ciudad,monto
1,Ferretería El Roble,Santiago,185000
2,Almacén Doña Rosa,Temuco,62000
3,Comercial Pacífico,Valparaíso,240000
```

`test/fixtures/valido/casos/ventas/misiones/01-filtrar.mdx`:
```mdx
---
titulo: Filtrar clientes
tiempo: 10
---

<Brief de="Paula, jefa comercial">Necesito los clientes **fuera** de Santiago.</Brief>

<Concepto>
WHERE filtra filas.

<SqlEjemplo consulta="SELECT * FROM clientes WHERE ciudad = 'Temuco'" />
</Concepto>

<SqlTask
  id="fuera-de-santiago"
  solucion="SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago'"
  comparar="filas-sin-orden"
  pistas={["Usa WHERE", "El operador distinto es <>"]}
/>

<Decision
  pregunta="Paula pide solo los activos. ¿Qué haces?"
  opciones={[
    { texto: "Pregunto qué significa activo", correcta: true, porque: "Aclarar evita un reporte equivocado." },
    { texto: "Asumo que son todos", porque: "Puedes entregar datos incorrectos." },
  ]}
/>

<Debrief entrevista="Te pueden pedir filtrar con varias condiciones.">
WHERE se evalúa fila por fila.
</Debrief>
```

`test/fixtures/valido/casos/ventas/misiones/02-hoja.mdx`:
```mdx
---
titulo: Total de ventas
tiempo: 8
---

<Brief de="Paula, jefa comercial">¿Cuánto vendimos en total?</Brief>

<SheetTask
  id="total"
  hoja="clientes"
  celdas={[{ celda: "F2", valor: 487000, funcion: "SUMA" }]}
  solucion={{ F2: "=SUMA(D2:D4)" }}
/>
```

`test/fixtures/valido/casos/ventas/misiones/03-python.mdx`:
```mdx
---
titulo: Promedio
tiempo: 8
---

<PythonTask
  id="promedio"
  preparacion="montos = [185000, 62000, 240000]"
  solucion="promedio = sum(montos) / len(montos)"
  pruebas="assert round(promedio) == 162333"
/>
```

- [x] **Step 3: Escribir los tests que fallan**

`src/bloques.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { compilarMision, extraerBloques } from "./bloques";

const fuente = `<Brief de="Paula">Necesito los clientes **fuera** de Santiago.</Brief>

<Concepto>
WHERE filtra filas.

<SqlEjemplo consulta="SELECT * FROM clientes" />
</Concepto>

<SqlTask id="filtro" solucion="SELECT 1" comparar="filas-en-orden" pistas={["Usa WHERE", "Otra"]} />
`;

describe("extraerBloques", () => {
  it("devuelve cada bloque con sus props, en orden de aparición", async () => {
    const bloques = await extraerBloques(fuente);
    expect(bloques.map((bloque) => bloque.tipo)).toEqual(["Brief", "Concepto", "SqlEjemplo", "SqlTask"]);
    expect(bloques[3].props).toEqual({
      id: "filtro",
      solucion: "SELECT 1",
      comparar: "filas-en-orden",
      pistas: ["Usa WHERE", "Otra"],
    });
  });

  it("guarda el texto plano de los hijos", async () => {
    const [brief] = await extraerBloques(fuente);
    expect(brief).toEqual({ tipo: "Brief", props: { de: "Paula" }, texto: "Necesito los clientes fuera de Santiago." });
  });

  it("falla con un componente desconocido", async () => {
    await expect(extraerBloques("<Grafico />")).rejects.toThrow(/Grafico/);
  });

  it("falla con un error de sintaxis", async () => {
    await expect(extraerBloques('<SqlTask id="x"')).rejects.toThrow();
  });
});

describe("compilarMision", () => {
  it("devuelve un componente", async () => {
    expect(typeof (await compilarMision("# Hola"))).toBe("function");
  });
});
```

`src/cargar.test.ts`:
```ts
import { appendFile, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cargarContenido, ErrorDeContenido } from "./cargar";

const FIXTURE = fileURLToPath(new URL("../test/fixtures/valido", import.meta.url));

function enCaso(dir: string, ...partes: string[]) {
  return path.join(dir, "casos", "ventas", ...partes);
}

async function reemplazar(archivo: string, buscar: string, poner: string) {
  const texto = await readFile(archivo, "utf8");
  if (!texto.includes(buscar)) throw new Error(`No encontré "${buscar}" en ${archivo}`);
  await writeFile(archivo, texto.replace(buscar, poner));
}

async function problemasCon(modificar: (dir: string) => Promise<void>): Promise<string[]> {
  const dir = await mkdtemp(path.join(tmpdir(), "contenido-"));
  try {
    await cp(FIXTURE, dir, { recursive: true });
    await modificar(dir);
    await cargarContenido(dir);
    return [];
  } catch (error) {
    if (error instanceof ErrorDeContenido) return error.problemas;
    throw error;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("cargarContenido", () => {
  it("carga rutas, casos, misiones, bloques y datos tipados", async () => {
    const contenido = await cargarContenido(FIXTURE);
    expect(contenido.rutas).toEqual([
      {
        slug: "analista",
        titulo: "Analista de datos",
        cargo: "Analista de datos junior",
        descripcion: "Ruta de prueba para los tests del cargador.",
        estado: "publicada",
        casos: ["ventas"],
      },
    ]);
    const [caso] = contenido.casos;
    expect(caso.misiones.map((mision) => mision.slug)).toEqual(["01-filtrar", "02-hoja", "03-python"]);
    expect(caso.misiones[0]).toMatchObject({ titulo: "Filtrar clientes", tiempo: 10 });
    expect(caso.datos[0].nombre).toBe("clientes");
    expect(caso.datos[0].filas[0]).toEqual({ id: 1, nombre: "Ferretería El Roble", ciudad: "Santiago", monto: 185000 });
    const tarea = caso.misiones[0].bloques.find((bloque) => bloque.tipo === "SqlTask");
    expect(tarea?.props).toMatchObject({ id: "fuera-de-santiago", inicial: "", comparar: "filas-sin-orden" });
  });

  it("nombra la misión listada en caso.yaml que no tiene archivo", async () => {
    const problemas = await problemasCon((dir) => rm(enCaso(dir, "misiones", "02-hoja.mdx")));
    expect(problemas).toContain("casos/ventas/misiones/02-hoja.mdx: no existe, pero caso.yaml la lista en misiones");
  });

  it("nombra el .mdx que no está listado en caso.yaml", async () => {
    const problemas = await problemasCon((dir) =>
      writeFile(enCaso(dir, "misiones", "99-borrador.mdx"), "---\ntitulo: Borrador\ntiempo: 1\n---\n")
    );
    expect(problemas).toContain("casos/ventas/misiones/99-borrador.mdx: no está listada en misiones de caso.yaml");
  });

  it("nombra el archivo con un error de sintaxis MDX", async () => {
    const problemas = await problemasCon((dir) =>
      writeFile(enCaso(dir, "misiones", "01-filtrar.mdx"), '---\ntitulo: F\ntiempo: 1\n---\n\n<SqlTask id="x"\n')
    );
    expect(problemas.some((problema) => problema.startsWith("casos/ventas/misiones/01-filtrar.mdx: "))).toBe(true);
  });

  it("nombra el componente desconocido", async () => {
    const problemas = await problemasCon((dir) => appendFile(enCaso(dir, "misiones", "01-filtrar.mdx"), "\n<Grafico />\n"));
    expect(
      problemas.some(
        (problema) => problema.startsWith("casos/ventas/misiones/01-filtrar.mdx: ") && problema.includes("Grafico")
      )
    ).toBe(true);
  });

  it("exige que el caso declare su entregable", async () => {
    const problemas = await problemasCon((dir) =>
      reemplazar(enCaso(dir, "caso.yaml"), "entregable: Un repositorio con las consultas del caso\n", "")
    );
    expect(problemas).toContain("casos/ventas/caso.yaml: entregable: el caso debe declarar su entregable");
  });

  it("valida las props de cada bloque", async () => {
    const problemas = await problemasCon((dir) =>
      reemplazar(enCaso(dir, "misiones", "01-filtrar.mdx"), 'comparar="filas-sin-orden"', 'comparar="estado-tabla"')
    );
    expect(problemas).toContain(
      'casos/ventas/misiones/01-filtrar.mdx <SqlTask>: verificar: comparar="estado-tabla" necesita la consulta verificar'
    );
  });

  it("avisa cuando una ruta nombra un caso que no existe", async () => {
    const problemas = await problemasCon((dir) =>
      reemplazar(path.join(dir, "rutas", "analista.yaml"), "  - ventas\n", "  - ventas\n  - no-existe\n")
    );
    expect(problemas).toContain('rutas/analista.yaml: el caso "no-existe" no existe en casos/');
  });

  it("rechaza nombres de tabla que no sirven en SQL", async () => {
    const problemas = await problemasCon((dir) => writeFile(enCaso(dir, "datos", "Ventas-Marzo.csv"), "id\n1\n"));
    expect(problemas).toContain(
      "casos/ventas/datos/Ventas-Marzo.csv: el nombre de la tabla debe usar solo minúsculas, números y _"
    );
  });

  it("junta todos los problemas en un solo error", async () => {
    const problemas = await problemasCon(async (dir) => {
      await rm(enCaso(dir, "misiones", "02-hoja.mdx"));
      await writeFile(enCaso(dir, "misiones", "99-borrador.mdx"), "---\ntitulo: Borrador\ntiempo: 1\n---\n");
    });
    expect(problemas).toHaveLength(2);
  });
});
```

`src/publicacion.test.ts`:
```ts
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { cargarContenido } from "./cargar";
import { archivosPython, grillaDeHoja, paquetesPython, tablasSql } from "./datos";
import { casosVisibles, rutasVisibles, tareasDeMision } from "./publicacion";
import type { Contenido } from "./tipos";

const FIXTURE = fileURLToPath(new URL("../test/fixtures/valido", import.meta.url));
let contenido: Contenido;

beforeAll(async () => {
  contenido = await cargarContenido(FIXTURE);
});

describe("visibilidad", () => {
  it("muestra las rutas publicadas y sus casos", () => {
    expect(rutasVisibles(contenido, false).map((ruta) => ruta.slug)).toEqual(["analista"]);
    expect(casosVisibles(contenido, false).map((caso) => caso.slug)).toEqual(["ventas"]);
  });

  it("oculta los borradores salvo que se pidan", () => {
    const conBorrador: Contenido = {
      ...contenido,
      rutas: contenido.rutas.map((ruta) => ({ ...ruta, estado: "borrador" as const })),
    };
    expect(casosVisibles(conBorrador, false)).toEqual([]);
    expect(casosVisibles(conBorrador, true).map((caso) => caso.slug)).toEqual(["ventas"]);
  });

  it("tareasDeMision devuelve solo los bloques de tarea", () => {
    const ids = tareasDeMision(contenido.casos[0].misiones[0]).map((tarea) => tarea.props.id);
    expect(ids).toEqual(["fuera-de-santiago"]);
  });
});

describe("datos del caso", () => {
  it("arma tablas SQL, archivos Python y grillas desde los CSV", () => {
    const [caso] = contenido.casos;
    expect(Object.keys(tablasSql(caso))).toEqual(["clientes"]);
    expect(archivosPython(caso)[0].ruta).toBe("datos/clientes.csv");
    expect(archivosPython(caso)[0].contenido.startsWith("id,nombre,ciudad,monto")).toBe(true);
    expect(grillaDeHoja(caso, "clientes")[0]).toEqual(["id", "nombre", "ciudad", "monto"]);
    expect(() => grillaDeHoja(caso, "no-existe")).toThrow('El caso ventas no tiene la hoja "no-existe"');
    expect(paquetesPython(caso.misiones[2])).toEqual([]);
  });
});
```

- [x] **Step 4: Instalar y ver fallar los tests**

Run: `docker compose run --rm tools pnpm install && docker compose run --rm tools pnpm --filter @syntaxerror/content test`
Expected: FAIL, porque no se pueden resolver `./bloques`, `./cargar`, `./datos` ni `./publicacion`.

- [x] **Step 5: Crear `src/esquemas.ts` y `src/tipos.ts`**

`src/esquemas.ts`:
```ts
import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "debe ser un slug en minúsculas con guiones");
const texto = z.string().trim().min(1, "no puede estar vacío");
const idTarea = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "debe ser un id en minúsculas con guiones");
const pistas = z.array(texto).default([]);

export const rutaSchema = z.object({
  slug,
  titulo: texto,
  cargo: texto,
  descripcion: texto,
  estado: z.enum(["publicada", "borrador"]),
  casos: z.array(slug).min(1, "la ruta necesita al menos un caso"),
});

export const casoSchema = z.object({
  slug,
  titulo: texto,
  cargo: texto,
  empresa: texto,
  dataset: texto,
  entregable: z
    .string({ required_error: "el caso debe declarar su entregable" })
    .trim()
    .min(1, "el caso debe declarar su entregable"),
  misiones: z.array(slug).min(1, "el caso necesita al menos una misión"),
});

export const frontmatterSchema = z.object({
  titulo: texto,
  tiempo: z.number().int().positive(),
});

const celdaEsperada = z.object({
  celda: z.string().regex(/^[A-Z]+[1-9][0-9]*$/, "debe ser una celda como F2"),
  valor: z.union([z.string(), z.number(), z.boolean()]),
  funcion: z.string().optional(),
});

export const bloqueSchemas = {
  Brief: z.object({ de: texto }),
  Concepto: z.object({}),
  SqlEjemplo: z.object({ consulta: texto }),
  PythonEjemplo: z.object({ codigo: texto }),
  SqlTask: z
    .object({
      id: idTarea,
      enunciado: z.string().optional(),
      inicial: z.string().default(""),
      solucion: texto,
      comparar: z.enum(["filas-en-orden", "filas-sin-orden", "estado-tabla"]),
      verificar: z.string().optional(),
      pistas,
    })
    .refine((tarea) => tarea.comparar !== "estado-tabla" || Boolean(tarea.verificar), {
      message: 'comparar="estado-tabla" necesita la consulta verificar',
      path: ["verificar"],
    }),
  PythonTask: z.object({
    id: idTarea,
    enunciado: z.string().optional(),
    inicial: z.string().default(""),
    preparacion: z.string().default(""),
    solucion: texto,
    pruebas: texto,
    paquetes: z.array(z.enum(["pandas"])).default([]),
    pistas,
  }),
  SheetTask: z.object({
    id: idTarea,
    enunciado: z.string().optional(),
    hoja: z.string().regex(/^[a-z_][a-z0-9_]*$/, "debe ser el nombre de un CSV de datos/"),
    celdas: z.array(celdaEsperada).min(1, "indica al menos una celda a revisar"),
    solucion: z.record(z.string(), z.union([z.string(), z.number()])),
    pistas,
  }),
  Decision: z.object({
    pregunta: texto,
    opciones: z
      .array(z.object({ texto, correcta: z.boolean().default(false), porque: texto }))
      .min(2, "necesita al menos dos opciones")
      .refine((opciones) => opciones.some((opcion) => opcion.correcta), "al menos una opción debe ser correcta"),
  }),
  Debrief: z.object({ entrevista: texto }),
};

export type TipoBloque = keyof typeof bloqueSchemas;
export const TIPOS_BLOQUE = Object.keys(bloqueSchemas) as TipoBloque[];
export const TIPOS_TAREA = ["SqlTask", "PythonTask", "SheetTask"] as const;

export type PropsBloque<T extends TipoBloque> = z.output<(typeof bloqueSchemas)[T]>;
export type Bloque = { [T in TipoBloque]: { tipo: T; props: PropsBloque<T>; texto: string | null } }[TipoBloque];
export type BloqueTarea = Extract<Bloque, { tipo: (typeof TIPOS_TAREA)[number] }>;

export function formatearErrorZod(error: z.ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
}
```

`src/tipos.ts`:
```ts
import type { z } from "zod";
import type { Fila } from "@syntaxerror/engines/tipos";
import type { Bloque, rutaSchema } from "./esquemas";

export type Ruta = z.output<typeof rutaSchema>;
export type Tabla = { nombre: string; filas: Fila[]; csv: string };
export type Mision = { slug: string; titulo: string; tiempo: number; fuente: string; bloques: Bloque[] };
export type Caso = {
  slug: string;
  titulo: string;
  cargo: string;
  empresa: string;
  dataset: string;
  entregable: string;
  misiones: Mision[];
  datos: Tabla[];
};
export type Contenido = { rutas: Ruta[]; casos: Caso[] };
```

- [x] **Step 6: Crear `src/bloques.ts`**

La extracción no renderiza el MDX: lo evalúa con componentes marcadores y recorre el árbol de elementos. Así no depende de `react-dom/server`, que Next no permite importar en el grafo de Server Components.

```ts
import { evaluate } from "@mdx-js/mdx";
import type { MDXContent } from "mdx/types";
import { isValidElement, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import { TIPOS_BLOQUE } from "./esquemas";

export type BloqueCrudo = { tipo: string; props: Record<string, unknown>; texto: string | null };

export async function compilarMision(fuente: string): Promise<MDXContent> {
  const modulo = await evaluate(fuente, { ...runtime });
  return modulo.default;
}

function textoPlano(nodo: ReactNode): string {
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(textoPlano).join(" ");
  if (isValidElement(nodo)) return textoPlano((nodo.props as { children?: ReactNode }).children);
  return "";
}

export async function extraerBloques(fuente: string): Promise<BloqueCrudo[]> {
  const Contenido = await compilarMision(fuente);
  const tipoPorMarcador = new Map<unknown, string>();
  const marcadores: Record<string, () => null> = {};
  for (const tipo of TIPOS_BLOQUE) {
    const marcador = () => null;
    marcadores[tipo] = marcador;
    tipoPorMarcador.set(marcador, tipo);
  }

  const bloques: BloqueCrudo[] = [];
  const recorrer = (nodo: ReactNode): void => {
    if (Array.isArray(nodo)) {
      nodo.forEach(recorrer);
      return;
    }
    if (!isValidElement(nodo)) return;
    const { children, ...props } = nodo.props as Record<string, unknown> & { children?: ReactNode };
    const tipo = tipoPorMarcador.get(nodo.type);
    if (tipo) {
      const texto = children === undefined ? null : textoPlano(children).replace(/\s+/g, " ").trim();
      bloques.push({ tipo, props, texto });
    }
    recorrer(children);
  };

  recorrer(Contenido({ components: marcadores }));
  return bloques;
}
```

- [x] **Step 7: Crear `src/cargar.ts`**

```ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import Papa from "papaparse";
import { parse as parsearYaml } from "yaml";
import type { z } from "zod";
import type { Fila } from "@syntaxerror/engines/tipos";
import { extraerBloques, type BloqueCrudo } from "./bloques";
import {
  bloqueSchemas,
  casoSchema,
  formatearErrorZod,
  frontmatterSchema,
  rutaSchema,
  type Bloque,
  type TipoBloque,
} from "./esquemas";
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
  return (await entradas(dir))
    .filter((entrada) => entrada.isFile() && entrada.name.endsWith(extension))
    .map((entrada) => entrada.name)
    .sort();
}

async function listarCarpetas(dir: string): Promise<string[]> {
  return (await entradas(dir))
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort();
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
    const props = validar(bloqueSchemas[crudo.tipo as TipoBloque], crudo.props, `${lugar} <${crudo.tipo}>`, problemas);
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
```

- [x] **Step 8: Crear `src/publicacion.ts` y `src/datos.ts`**

`src/publicacion.ts`:
```ts
import { TIPOS_TAREA, type BloqueTarea } from "./esquemas";
import type { Caso, Contenido, Mision, Ruta } from "./tipos";

export function rutasVisibles(contenido: Contenido, incluirBorradores: boolean): Ruta[] {
  return contenido.rutas.filter((ruta) => incluirBorradores || ruta.estado === "publicada");
}

export function casosVisibles(contenido: Contenido, incluirBorradores: boolean): Caso[] {
  const slugs = new Set(rutasVisibles(contenido, incluirBorradores).flatMap((ruta) => ruta.casos));
  return contenido.casos.filter((caso) => slugs.has(caso.slug));
}

export function tareasDeMision(mision: Mision): BloqueTarea[] {
  return mision.bloques.filter((bloque): bloque is BloqueTarea =>
    (TIPOS_TAREA as readonly string[]).includes(bloque.tipo)
  );
}
```

`src/datos.ts`:
```ts
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
```

- [x] **Step 9: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content test && cd packages/content && pnpm exec tsc --noEmit -p ."`
Expected: PASS (19 tests) y `tsc` sin errores.

- [x] **Step 10: Commit**

```bash
git add packages/content docker-compose.yml pnpm-lock.yaml
git commit -m "feat(content): schemas, extraccion de bloques mdx y cargador de contenido

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Validador de contenido, CLI y caso de demostración

**Files:**
- Create: `packages/content/src/validar.ts`, `src/revisor-python.ts`, `src/validar-cli.ts`
- Create: `content/rutas/data-analyst.yaml`
- Create: `content/casos/demo-motor/caso.yaml`, `datos/clientes.csv`, `datos/ventas.csv`, `misiones/01-clientes-de-regiones.mdx`, `misiones/02-total-de-ventas.mdx`, `misiones/03-ticket-promedio.mdx`
- Test: `packages/content/src/validar.test.ts`, `src/contenido-real.test.ts`
- Modify: `packages/content/package.json` (dependencia `pyodide`, script `validate`), `package.json` raíz (script `content:validate`)

**Interfaces:**
- Consumes: `revisarSql` (Task 1), `aplicarSolucion`, `revisarHoja` (Task 2), `crearSesionPython`, `PyodideLike` (Task 3), `cargarContenido`, `tareasDeMision`, `tablasSql`, `grillaDeHoja`, `archivosPython` (Task 4).
- Produces:
  - `@syntaxerror/content/validar`: `type RevisorPython = (tarea: PropsBloque<"PythonTask">, caso: Caso) => Promise<ResultadoTarea>`, `validarContenido(contenido: Contenido, opciones: { revisarPython: RevisorPython }): Promise<string[]>` (lista vacía = válido).
  - `crearRevisorPythonNode(): RevisorPython` en `src/revisor-python.ts`.
  - Comando `pnpm --filter @syntaxerror/content validate` (sale con código 1 si hay problemas) y `npm run content:validate` en el host.
  - Caso `demo-motor` en `content/`, en una ruta `data-analyst` en borrador: una misión SQL, una de planilla y una de Python con pandas. Lo usan las tareas 6 a 10. La Fase 4 lo reemplaza por los casos reales.

- [x] **Step 1: Crear el caso de demostración**

`content/rutas/data-analyst.yaml`:
```yaml
slug: data-analyst
titulo: Data Analyst
cargo: Analista de datos junior
descripcion: Resuelve casos reales de una empresa chilena con SQL, planillas, Python y Power BI, y termina con un portafolio que puedes mostrar en una entrevista.
estado: borrador
casos:
  - demo-motor
```

`content/casos/demo-motor/caso.yaml`:
```yaml
slug: demo-motor
titulo: "Demo del motor: ventas de marzo"
cargo: Analista de datos junior
empresa: Distribuidora Los Andes
dataset: Clientes y ventas de marzo de 2025
entregable: Un repositorio en GitHub con la consulta, la planilla y el script de Python que usaste, más un README que explique qué encontraste.
misiones:
  - 01-clientes-de-regiones
  - 02-total-de-ventas
  - 03-ticket-promedio
```

`content/casos/demo-motor/datos/clientes.csv`:
```
id,nombre,ciudad,segmento
1,Ferretería El Roble,Santiago,pyme
2,Almacén Doña Rosa,Temuco,minorista
3,Comercial Pacífico,Valparaíso,pyme
4,Minimarket Los Aromos,Santiago,minorista
5,Distribuidora Austral,Punta Arenas,mayorista
6,Botillería La Esquina,Concepción,minorista
```

`content/casos/demo-motor/datos/ventas.csv`:
```
id,cliente_id,fecha,monto
101,1,2025-03-03,185000
102,2,2025-03-04,62000
103,3,2025-03-04,240000
104,1,2025-03-10,97000
105,5,2025-03-11,410000
106,6,2025-03-12,55000
```

`content/casos/demo-motor/misiones/01-clientes-de-regiones.mdx`:
```mdx
---
titulo: Clientes de regiones
tiempo: 10
---

<Brief de="Paula Contreras, jefa comercial">
Hola, te doy la bienvenida al equipo. Estamos armando una campaña de despacho gratis para regiones y necesito saber qué clientes compran fuera de Santiago. Mándame el nombre y la ciudad de cada uno.
</Brief>

<Concepto>
`WHERE` filtra las filas de una tabla: solo quedan las que cumplen la condición. Para decir "distinto de" se usa el operador `<>`.

<SqlEjemplo consulta="SELECT nombre, ciudad FROM clientes WHERE ciudad = 'Temuco'" />
</Concepto>

<SqlTask
  id="clientes-fuera-de-santiago"
  enunciado="Escribe una consulta que traiga el nombre y la ciudad de los clientes que no son de Santiago."
  solucion="SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago'"
  comparar="filas-sin-orden"
  pistas={["Parte con SELECT nombre, ciudad FROM clientes.", "Agrega un WHERE sobre la columna ciudad.", "El operador para decir distinto es <>."]}
/>

<Decision
  pregunta="Paula te responde: 'Ojo, solo los clientes activos'. En la tabla no hay ninguna columna que diga si un cliente está activo. ¿Qué haces?"
  opciones={[
    { texto: "Le pregunto qué significa activo para ella; por ejemplo, si compró en los últimos 3 meses.", correcta: true, porque: "Aclarar el criterio antes de entregar evita un reporte que responde otra pregunta." },
    { texto: "Entrego todos los clientes igual; si no hay columna, da lo mismo.", porque: "Paula va a tomar decisiones con una lista que no es la que pidió." },
    { texto: "Invento un criterio y no le cuento.", porque: "Un criterio oculto hace que nadie pueda revisar ni repetir tu análisis." },
  ]}
/>

<Debrief entrevista="Es común que te pidan filtrar con varias condiciones a la vez, por ejemplo clientes de regiones con compras sobre 100 mil pesos. Ahí combinas condiciones con AND y OR.">
`WHERE` se evalúa fila por fila antes de mostrar el resultado. El error más común es olvidar las comillas simples alrededor de un texto: `ciudad <> Santiago` falla y `ciudad <> 'Santiago'` funciona.
</Debrief>
```

`content/casos/demo-motor/misiones/02-total-de-ventas.mdx`:
```mdx
---
titulo: Total de ventas
tiempo: 8
---

<Brief de="Paula Contreras, jefa comercial">
Gerencia me pide el total vendido en marzo para la reunión de mañana. Te dejé la hoja de ventas: calcula el total en la celda F2 con una fórmula, así si alguien corrige un monto el total se actualiza solo.
</Brief>

<Concepto>
`SUMA` suma todos los números de un rango. El rango `D2:D7` va desde la celda D2 hasta la D7. Puedes separar los argumentos con `;`, como en Excel en español.
</Concepto>

<SheetTask
  id="total-marzo"
  hoja="ventas"
  enunciado="En la celda F2, calcula el total de la columna monto con la función SUMA."
  celdas={[{ celda: "F2", valor: 1049000, funcion: "SUMA" }]}
  solucion={{ F2: "=SUMA(D2:D7)" }}
  pistas={["Selecciona la celda F2 y escribe la fórmula en la barra de fórmulas.", "Los montos están de D2 a D7."]}
/>

<Debrief entrevista="Te pueden preguntar la diferencia entre escribir el número a mano y usar una fórmula. La respuesta: la fórmula se recalcula sola y deja claro de dónde sale el número.">
Un total escrito a mano queda desactualizado apenas cambia un dato. Con `SUMA` el cálculo queda a la vista y cualquiera puede revisarlo.
</Debrief>
```

`content/casos/demo-motor/misiones/03-ticket-promedio.mdx`:
```mdx
---
titulo: Ticket promedio
tiempo: 10
---

<Brief de="Paula Contreras, jefa comercial">
Última cosa: quiero saber cuánto gasta en promedio un cliente por compra, el famoso ticket promedio. Hazlo en Python, que después lo vamos a automatizar.
</Brief>

<Concepto>
Con pandas lees un CSV como una tabla (un `DataFrame`) y calculas el promedio de una columna con `.mean()`.

<PythonEjemplo codigo={"import pandas as pd\nventas = pd.read_csv(\"datos/ventas.csv\")\nprint(ventas.head())"} />
</Concepto>

<PythonTask
  id="ticket-promedio"
  enunciado="La tabla ventas ya está cargada. Guarda en ticket_promedio el promedio de la columna monto, redondeado a pesos (sin decimales)."
  paquetes={["pandas"]}
  preparacion={"import pandas as pd\nventas = pd.read_csv(\"datos/ventas.csv\")"}
  inicial="ticket_promedio = None"
  solucion={"ticket_promedio = round(ventas[\"monto\"].mean())"}
  pruebas={"assert ticket_promedio is not None, \"Todavía no guardas nada en ticket_promedio.\"\nassert ticket_promedio == 174833, \"ticket_promedio debe ser el promedio de monto, redondeado.\""}
  pistas={["Una columna se lee con ventas[\"monto\"].", "round() quita los decimales."]}
/>

<Debrief entrevista="Una pregunta típica: ¿por qué el promedio puede engañar? Porque un par de compras muy grandes lo suben. Ahí conviene mirar también la mediana con .median().">
El ticket promedio es el total vendido dividido por la cantidad de compras. En este caso, la venta de Punta Arenas sube bastante el promedio.
</Debrief>
```

- [x] **Step 2: Escribir los tests que fallan**

`packages/content/src/validar.test.ts`:
```ts
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cargarContenido } from "./cargar";
import type { Bloque } from "./esquemas";
import type { Contenido, Mision } from "./tipos";
import { validarContenido, type RevisorPython } from "./validar";

const FIXTURE = fileURLToPath(new URL("../test/fixtures/valido", import.meta.url));
const aprueba: RevisorPython = async () => ({ aprobada: true, diagnostico: null });
let contenido: Contenido;

beforeEach(async () => {
  contenido = await cargarContenido(FIXTURE);
});

function mision(slug: string): Mision {
  const encontrada = contenido.casos[0].misiones.find((candidata) => candidata.slug === slug);
  if (!encontrada) throw new Error(`No existe la misión ${slug}`);
  return encontrada;
}

function bloque<T extends Bloque["tipo"]>(de: Mision, tipo: T): Extract<Bloque, { tipo: T }> {
  const encontrado = de.bloques.find((candidato): candidato is Extract<Bloque, { tipo: T }> => candidato.tipo === tipo);
  if (!encontrado) throw new Error(`No hay bloque ${tipo}`);
  return encontrado;
}

const validar = () => validarContenido(contenido, { revisarPython: aprueba });

describe("validarContenido", () => {
  it("el fixture no tiene problemas", async () => {
    expect(await validar()).toEqual([]);
  });

  it("rechaza una misión sin tarea práctica", async () => {
    const filtrar = mision("01-filtrar");
    filtrar.bloques = filtrar.bloques.filter((candidato) => candidato.tipo !== "SqlTask");
    expect(await validar()).toContain(
      "casos/ventas/misiones/01-filtrar.mdx: la misión no tiene ninguna tarea práctica (SqlTask, PythonTask o SheetTask)"
    );
  });

  it("rechaza un Brief de más de 150 palabras", async () => {
    bloque(mision("01-filtrar"), "Brief").texto = Array(151).fill("palabra").join(" ");
    expect(await validar()).toContain("casos/ventas/misiones/01-filtrar.mdx: el Brief tiene 151 palabras (máximo 150)");
  });

  it("rechaza ids de tarea repetidos en una misión", async () => {
    const filtrar = mision("01-filtrar");
    filtrar.bloques.push(bloque(filtrar, "SqlTask"));
    expect(await validar()).toContain('casos/ventas/misiones/01-filtrar.mdx: el id de tarea "fuera-de-santiago" está repetido');
  });

  it("rechaza una solución SQL que no pasa su propio validador", async () => {
    bloque(mision("01-filtrar"), "SqlTask").props.solucion = "SELECT nombre FROM clientes WHERE";
    const problemas = await validar();
    expect(
      problemas.some((problema) =>
        problema.startsWith(
          'casos/ventas/misiones/01-filtrar.mdx: la solución de la tarea "fuera-de-santiago" no pasa su propio validador'
        )
      )
    ).toBe(true);
  });

  it("rechaza una solución de planilla incorrecta", async () => {
    bloque(mision("02-hoja"), "SheetTask").props.solucion = { F2: "=SUMA(D2:D3)" };
    expect(await validar()).toContain(
      'casos/ventas/misiones/02-hoja.mdx: la solución de la tarea "total" no pasa su propio validador: La celda F2 muestra "247000" y se espera "487000".'
    );
  });

  it("revisa las tareas de Python con el revisor que recibe", async () => {
    const revisor = vi.fn<RevisorPython>(async () => ({ aprobada: false, diagnostico: "no pasa" }));
    const problemas = await validarContenido(contenido, { revisarPython: revisor });
    expect(problemas).toContain(
      'casos/ventas/misiones/03-python.mdx: la solución de la tarea "promedio" no pasa su propio validador: no pasa'
    );
    expect(revisor).toHaveBeenCalledWith(expect.objectContaining({ id: "promedio" }), contenido.casos[0]);
  });
});
```

`packages/content/src/contenido-real.test.ts` (carga Pyodide y descarga pandas desde jsDelivr la primera vez; necesita red):
```ts
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cargarContenido } from "./cargar";
import { crearRevisorPythonNode } from "./revisor-python";
import { validarContenido } from "./validar";

const CONTENIDO = fileURLToPath(new URL("../../../content", import.meta.url));

describe("content/ del repositorio", () => {
  it("es válido, incluidas las soluciones de Python", async () => {
    const contenido = await cargarContenido(CONTENIDO);
    expect(await validarContenido(contenido, { revisarPython: crearRevisorPythonNode() })).toEqual([]);
  }, 180_000);
});
```

- [x] **Step 3: Agregar Pyodide al paquete y ver fallar los tests**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content add pyodide@0.28.3 && docker compose run --rm tools pnpm --filter @syntaxerror/content test`
Expected: FAIL, porque no se pueden resolver `./validar` ni `./revisor-python`.

- [x] **Step 4: Crear `src/validar.ts`**

```ts
import { aplicarSolucion, revisarHoja } from "@syntaxerror/engines/sheet";
import { revisarSql } from "@syntaxerror/engines/sql";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { grillaDeHoja, tablasSql } from "./datos";
import type { BloqueTarea, PropsBloque } from "./esquemas";
import { tareasDeMision } from "./publicacion";
import type { Caso, Contenido } from "./tipos";

export type RevisorPython = (tarea: PropsBloque<"PythonTask">, caso: Caso) => Promise<ResultadoTarea>;

const MAXIMO_PALABRAS_BRIEF = 150;

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
    case "SheetTask":
      return revisarHoja(aplicarSolucion(grillaDeHoja(caso, tarea.props.hoja), tarea.props.solucion), tarea.props);
    case "PythonTask":
      return revisarPython(tarea.props, caso);
  }
}

export async function validarContenido(
  contenido: Contenido,
  { revisarPython }: { revisarPython: RevisorPython }
): Promise<string[]> {
  const problemas: string[] = [];
  for (const caso of contenido.casos) {
    for (const mision of caso.misiones) {
      const donde = `casos/${caso.slug}/misiones/${mision.slug}.mdx`;
      const tareas = tareasDeMision(mision);

      if (tareas.length === 0) {
        problemas.push(`${donde}: la misión no tiene ninguna tarea práctica (SqlTask, PythonTask o SheetTask)`);
      }

      for (const bloque of mision.bloques) {
        if (bloque.tipo !== "Brief") continue;
        const palabras = contarPalabras(bloque.texto ?? "");
        if (palabras > MAXIMO_PALABRAS_BRIEF) {
          problemas.push(`${donde}: el Brief tiene ${palabras} palabras (máximo ${MAXIMO_PALABRAS_BRIEF})`);
        }
      }

      const vistos = new Set<string>();
      for (const tarea of tareas) {
        if (vistos.has(tarea.props.id)) problemas.push(`${donde}: el id de tarea "${tarea.props.id}" está repetido`);
        vistos.add(tarea.props.id);
      }

      for (const tarea of tareas) {
        let resultado: ResultadoTarea;
        try {
          resultado = await revisarSolucion(tarea, caso, revisarPython);
        } catch (error) {
          resultado = { aprobada: false, diagnostico: error instanceof Error ? error.message : String(error) };
        }
        if (!resultado.aprobada) {
          problemas.push(
            `${donde}: la solución de la tarea "${tarea.props.id}" no pasa su propio validador: ${resultado.diagnostico ?? "sin detalle"}`
          );
        }
      }
    }
  }
  return problemas;
}
```

- [x] **Step 5: Crear `src/revisor-python.ts` y `src/validar-cli.ts`**

`src/revisor-python.ts`:
```ts
import { loadPyodide } from "pyodide";
import { crearSesionPython, type PyodideLike } from "@syntaxerror/engines/python";
import { archivosPython } from "./datos";
import type { RevisorPython } from "./validar";

export function crearRevisorPythonNode(): RevisorPython {
  let pyodide: Promise<PyodideLike> | null = null;
  return async (tarea, caso) => {
    // PyodideLike es el subconjunto de la API de Pyodide que usan los motores.
    pyodide ??= loadPyodide() as unknown as Promise<PyodideLike>;
    const sesion = await crearSesionPython(await pyodide, { paquetes: tarea.paquetes, archivos: archivosPython(caso) });
    return sesion.revisar({ preparacion: tarea.preparacion, pruebas: tarea.pruebas }, tarea.solucion);
  };
}
```

`src/validar-cli.ts`:
```ts
import path from "node:path";
import { cargarContenido, ErrorDeContenido } from "./cargar";
import { crearRevisorPythonNode } from "./revisor-python";
import { validarContenido } from "./validar";

const dir = process.env.CONTENT_DIR ?? path.resolve(process.cwd(), "../../content");

try {
  const contenido = await cargarContenido(dir);
  const problemas = await validarContenido(contenido, { revisarPython: crearRevisorPythonNode() });
  if (problemas.length > 0) {
    console.error(`[content] ${problemas.length} problema(s):\n- ${problemas.join("\n- ")}`);
    process.exit(1);
  }
  const misiones = contenido.casos.reduce((total, caso) => total + caso.misiones.length, 0);
  console.log(`[content] ok: ${contenido.rutas.length} rutas, ${contenido.casos.length} casos, ${misiones} misiones`);
  process.exit(0);
} catch (error) {
  if (error instanceof ErrorDeContenido) {
    console.error(`[content] ${error.message}`);
    process.exit(1);
  }
  throw error;
}
```

En `packages/content/package.json`, agregar a `scripts`:
```json
"validate": "tsx src/validar-cli.ts"
```

En el `package.json` raíz, agregar a `scripts`:
```json
"content:validate": "docker compose run --rm tools pnpm --filter @syntaxerror/content validate"
```

- [x] **Step 6: Correr los tests, el typecheck y el validador**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content test && cd packages/content && pnpm exec tsc --noEmit -p ."`
Expected: PASS (27 tests) y `tsc` sin errores. El test de `contenido-real` tarda más la primera vez porque descarga pandas.

Run: `npm run content:validate`
Expected: `[content] ok: 1 rutas, 1 casos, 3 misiones` y código de salida 0.

Run: `docker compose run --rm -e CONTENT_DIR=/tmp/roto tools sh -c "cp -r packages/content/test/fixtures/valido /tmp/roto && sed -i 's/SUMA(D2:D4)/SUMA(D2:D3)/' /tmp/roto/casos/ventas/misiones/02-hoja.mdx && pnpm --filter @syntaxerror/content validate; echo salida=\$?"`
Expected: el mensaje `la solución de la tarea "total" no pasa su propio validador` y `salida=1` (la copia vive solo dentro del contenedor).

- [x] **Step 7: Commit**

```bash
git add packages/content content package.json pnpm-lock.yaml
git commit -m "feat(content): validador de contenido y caso de demostracion del motor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Schema v2 de misiones y sincronización del contenido con la base

**Files:**
- Modify: `packages/db/src/schema.ts` (tablas `rutas`, `casos`, `ruta_casos`, `mision_progreso`, `caso_inscripciones`, `ruta_inscripciones`, `entregables`)
- Create: `packages/db/drizzle/0001_<nombre>.sql` (generada)
- Create: `packages/content/src/sincronizar.ts`, `packages/content/src/sincronizar-cli.ts`
- Test: `packages/content/src/sincronizar.test.ts`
- Modify: `packages/content/package.json` (dependencias `@syntaxerror/db`, `drizzle-orm`; script `sync`), `packages/content/vitest.config.ts`, `docker-compose.yml` (comando de `db-setup`)

**Interfaces:**
- Consumes: `users` (Fase 1), `createTestDb`, `truncateAll` (Fase 1), `Contenido`, `tareasDeMision`, `cargarContenido` (Task 4).
- Produces:
  - `@syntaxerror/db/schema`: `rutas`, `casos`, `rutaCasos`, `misionProgreso`, `casoInscripciones`, `rutaInscripciones`, `entregables`, `type MisionResumen = { slug: string; titulo: string; tareas: string[] }` (se guarda en `casos.misiones`, en orden).
  - `@syntaxerror/content/sincronizar`: `sincronizarContenido(db: AppDb, contenido: Contenido): Promise<{ rutas: number; casos: number }>`, idempotente. Una ruta que ya no está en `content/` queda en `borrador`; un caso que ya no está se conserva para no perder el progreso.
  - `db-setup` ejecuta migraciones, sincroniza el contenido y hace el seed, en ese orden (spec §6).

- [x] **Step 1: Agregar las tablas a `packages/db/src/schema.ts`** (al final del archivo)

```ts
export type MisionResumen = { slug: string; titulo: string; tareas: string[] };

export const rutas = pgTable(
  "rutas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    titulo: text("titulo").notNull(),
    cargo: text("cargo").notNull(),
    descripcion: text("descripcion").notNull(),
    estado: text("estado").notNull().default("borrador"),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("rutas_slug_idx").on(table.slug)]
);

export const casos = pgTable(
  "casos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    titulo: text("titulo").notNull(),
    cargo: text("cargo").notNull(),
    empresa: text("empresa").notNull(),
    entregable: text("entregable").notNull(),
    misiones: jsonb("misiones").notNull().$type<MisionResumen[]>().default([]),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("casos_slug_idx").on(table.slug)]
);

export const rutaCasos = pgTable(
  "ruta_casos",
  {
    rutaId: uuid("ruta_id")
      .notNull()
      .references(() => rutas.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    orden: integer("orden").notNull(),
  },
  (table) => [primaryKey({ columns: [table.rutaId, table.casoId] })]
);

export const misionProgreso = pgTable(
  "mision_progreso",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    mision: text("mision").notNull(),
    estado: text("estado").notNull().default("en_curso"),
    intentos: integer("intentos").notNull().default(0),
    tareasAprobadas: jsonb("tareas_aprobadas").notNull().$type<string[]>().default([]),
    aprobadaEn: timestamp("aprobada_en"),
    actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.casoId, table.mision] })]
);

export const casoInscripciones = pgTable(
  "caso_inscripciones",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    inscritoEn: timestamp("inscrito_en").notNull().defaultNow(),
    completadoEn: timestamp("completado_en"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.casoId] })]
);

export const rutaInscripciones = pgTable(
  "ruta_inscripciones",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rutaId: uuid("ruta_id")
      .notNull()
      .references(() => rutas.id, { onDelete: "cascade" }),
    inscritoEn: timestamp("inscrito_en").notNull().defaultNow(),
    completadoEn: timestamp("completado_en"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.rutaId] })]
);

export const entregables = pgTable(
  "entregables",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    casoId: uuid("caso_id")
      .notNull()
      .references(() => casos.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
    actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("entregables_usuario_caso_idx").on(table.userId, table.casoId)]
);
```

- [x] **Step 2: Generar la migración**

Run: `npm run db:generate`
Expected: crea `packages/db/drizzle/0001_<nombre>.sql` con `CREATE TABLE` para `rutas`, `casos`, `ruta_casos`, `mision_progreso`, `caso_inscripciones`, `ruta_inscripciones` y `entregables`, y actualiza `drizzle/meta/_journal.json`.

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/db test`
Expected: PASS (1 test). El `globalSetup` aplica la migración nueva sobre `postgres-test` sin errores.

- [x] **Step 3: Conectar `packages/content` con la base**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content add "@syntaxerror/db@workspace:*" "drizzle-orm@^0.36.0"`

Reemplazar `packages/content/vitest.config.ts` por:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30_000,
    globalSetup: ["../db/src/global-setup.ts"],
    fileParallelism: false,
  },
});
```

- [x] **Step 4: Escribir el test que falla, `packages/content/src/sincronizar.test.ts`**

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos, rutaCasos, rutas } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Bloque } from "./esquemas";
import { sincronizarContenido } from "./sincronizar";
import type { Contenido } from "./tipos";

const { db, close } = createTestDb();

function tarea(id: string): Bloque {
  return {
    tipo: "SqlTask",
    props: { id, inicial: "", solucion: "SELECT 1", comparar: "filas-en-orden", pistas: [] },
    texto: null,
  };
}

function contenido(): Contenido {
  return {
    rutas: [
      {
        slug: "analista",
        titulo: "Analista",
        cargo: "Analista junior",
        descripcion: "Ruta de prueba",
        estado: "publicada",
        casos: ["ventas"],
      },
    ],
    casos: [
      {
        slug: "ventas",
        titulo: "Ventas",
        cargo: "Analista junior",
        empresa: "Distribuidora",
        dataset: "Ventas",
        entregable: "Repositorio",
        datos: [],
        misiones: [
          { slug: "m1", titulo: "M1", tiempo: 5, fuente: "", bloques: [tarea("t1"), tarea("t2")] },
          { slug: "m2", titulo: "M2", tiempo: 5, fuente: "", bloques: [tarea("t3")] },
        ],
      },
    ],
  };
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("sincronizarContenido", () => {
  it("crea rutas, casos con sus tareas y el orden de la ruta", async () => {
    expect(await sincronizarContenido(db, contenido())).toEqual({ rutas: 1, casos: 1 });
    const [caso] = await db.select().from(casos);
    expect(caso.misiones).toEqual([
      { slug: "m1", titulo: "M1", tareas: ["t1", "t2"] },
      { slug: "m2", titulo: "M2", tareas: ["t3"] },
    ]);
    const [ruta] = await db.select().from(rutas);
    expect(ruta).toMatchObject({ slug: "analista", estado: "publicada" });
    expect(await db.select().from(rutaCasos)).toEqual([{ rutaId: ruta.id, casoId: caso.id, orden: 0 }]);
  });

  it("es idempotente", async () => {
    await sincronizarContenido(db, contenido());
    await sincronizarContenido(db, contenido());
    expect(await db.select().from(rutas)).toHaveLength(1);
    expect(await db.select().from(casos)).toHaveLength(1);
    expect(await db.select().from(rutaCasos)).toHaveLength(1);
  });

  it("actualiza títulos y tareas sin cambiar el id del caso", async () => {
    await sincronizarContenido(db, contenido());
    const [antes] = await db.select().from(casos);
    const cambiado = contenido();
    cambiado.casos[0].titulo = "Ventas de marzo";
    cambiado.casos[0].misiones[1].bloques.push(tarea("t4"));
    await sincronizarContenido(db, cambiado);
    const [despues] = await db.select().from(casos).where(eq(casos.slug, "ventas"));
    expect(despues.id).toBe(antes.id);
    expect(despues.titulo).toBe("Ventas de marzo");
    expect(despues.misiones[1].tareas).toEqual(["t3", "t4"]);
  });

  it("una ruta que sale del contenido pasa a borrador", async () => {
    await sincronizarContenido(db, contenido());
    await sincronizarContenido(db, { ...contenido(), rutas: [] });
    const [ruta] = await db.select().from(rutas);
    expect(ruta.estado).toBe("borrador");
  });
});
```

- [x] **Step 5: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content test -- src/sincronizar.test.ts`
Expected: FAIL, porque no se puede resolver `./sincronizar`.

- [x] **Step 6: Crear `src/sincronizar.ts` y `src/sincronizar-cli.ts`**

`src/sincronizar.ts`:
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
      const datos = {
        titulo: caso.titulo,
        cargo: caso.cargo,
        empresa: caso.empresa,
        entregable: caso.entregable,
        misiones,
        actualizadoEn: ahora,
      };
      const [fila] = await tx
        .insert(casos)
        .values({ slug: caso.slug, ...datos })
        .onConflictDoUpdate({ target: casos.slug, set: datos })
        .returning({ id: casos.id });
      idPorCaso.set(caso.slug, fila.id);
    }

    for (const ruta of contenido.rutas) {
      const datos = {
        titulo: ruta.titulo,
        cargo: ruta.cargo,
        descripcion: ruta.descripcion,
        estado: ruta.estado,
        actualizadoEn: ahora,
      };
      const [fila] = await tx
        .insert(rutas)
        .values({ slug: ruta.slug, ...datos })
        .onConflictDoUpdate({ target: rutas.slug, set: datos })
        .returning({ id: rutas.id });

      await tx.delete(rutaCasos).where(eq(rutaCasos.rutaId, fila.id));
      const orden = ruta.casos.map((slug, posicion) => {
        const casoId = idPorCaso.get(slug);
        if (!casoId) throw new Error(`La ruta ${ruta.slug} nombra el caso ${slug}, que no está en el contenido`);
        return { rutaId: fila.id, casoId, orden: posicion };
      });
      if (orden.length > 0) await tx.insert(rutaCasos).values(orden);
    }

    // Una ruta que salió del contenido deja de publicarse. Los casos se conservan por el progreso de los alumnos.
    const vigentes = contenido.rutas.map((ruta) => ruta.slug);
    await tx
      .update(rutas)
      .set({ estado: "borrador", actualizadoEn: ahora })
      .where(vigentes.length > 0 ? notInArray(rutas.slug, vigentes) : undefined);

    return { rutas: contenido.rutas.length, casos: contenido.casos.length };
  });
}
```

`src/sincronizar-cli.ts`:
```ts
import path from "node:path";
import { createDb } from "@syntaxerror/db/client";
import { cargarContenido } from "./cargar";
import { sincronizarContenido } from "./sincronizar";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const dir = process.env.CONTENT_DIR ?? path.resolve(process.cwd(), "../../content");

const { db, close } = createDb(url);
try {
  const resultado = await sincronizarContenido(db, await cargarContenido(dir));
  console.log(`[content] sincronizado: ${resultado.rutas} rutas, ${resultado.casos} casos`);
} finally {
  await close();
}
```

En `packages/content/package.json`, agregar a `scripts`:
```json
"sync": "tsx src/sincronizar-cli.ts"
```

En `docker-compose.yml`, cambiar el `command` de `db-setup` por:
```yaml
    command: sh -c "pnpm --filter @syntaxerror/db migrate && pnpm --filter @syntaxerror/content sync && pnpm --filter web db:seed"
```

- [x] **Step 7: Correr los tests, el typecheck y `db-setup`**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content test && cd packages/content && pnpm exec tsc --noEmit -p ."`
Expected: PASS (31 tests) y `tsc` sin errores.

Run: `docker compose run --rm db-setup && docker compose run --rm db-setup`
Expected: las dos veces termina con código 0 e imprime `[db] migraciones aplicadas`, `[content] sincronizado: 1 rutas, 1 casos` y `[seed] admin listo: admin@local.test`.

Run: `docker compose exec postgres psql -U platform -d platform_dev -c "select c.slug, jsonb_array_length(c.misiones) as misiones, r.estado from casos c join ruta_casos rc on rc.caso_id = c.id join rutas r on r.id = rc.ruta_id"`
Expected: una fila `demo-motor | 3 | borrador`.

Run: `docker compose down`

- [x] **Step 8: Commit**

```bash
git add packages/db packages/content docker-compose.yml pnpm-lock.yaml
git commit -m "feat(db): tablas de misiones y sincronizacion del contenido en db-setup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Progreso y entregables (servicio, API y cliente del navegador)

**Files:**
- Create: `apps/web/src/lib/sesion.ts`
- Create: `apps/web/src/lib/progreso/esquemas.ts`, `servicio.ts`, `cliente.ts`
- Create: `apps/web/src/app/api/progreso/route.ts`, `apps/web/src/app/api/progreso/sync/route.ts`, `apps/web/src/app/api/entregables/route.ts`
- Create: `apps/web/src/components/sincronizar-progreso.tsx`
- Test: `apps/web/src/lib/progreso/servicio.test.ts`, `cliente.test.ts`, `apps/web/src/app/api/progreso/route.test.ts`, `apps/web/src/app/api/entregables/route.test.ts`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`, `apps/web/src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `auth` (Fase 1), `getDb` (Fase 1), tablas de la Task 6.
- Produces:
  - `@/lib/sesion`: `obtenerUsuarioId(): Promise<string | null>`.
  - `@/lib/progreso/esquemas`: `intentoSchema`, `type IntentoTarea = { caso: string; mision: string; tarea: string; aprobada: boolean }`, `sincronizacionSchema` (máximo 200 intentos), `entregableSchema` (`url` con `https://`).
  - `@/lib/progreso/servicio`:
    - `class ErrorProgreso { codigo: "caso_no_existe" | "mision_no_existe" | "tarea_no_existe" }`;
    - `type EstadoMision = { estado: "en_curso" | "aprobada"; tareasAprobadas: string[] }`;
    - `type ProgresoCaso = { misiones: Record<string, EstadoMision>; entregable: string | null; completo: boolean }`;
    - `registrarIntento(db, userId, intento): Promise<{ misionAprobada: boolean; casoCompleto: boolean }>`;
    - `guardarEntregable(db, userId, { caso, url }): Promise<{ casoCompleto: boolean }>`;
    - `obtenerProgresoCaso(db, userId, casoSlug): Promise<ProgresoCaso | null>`;
    - `sincronizarIntentos(db, userId, intentos): Promise<{ aplicados: number; rechazados: number }>`;
    - `listarCasosDelUsuario(db, userId): Promise<{ slug; titulo; misionesAprobadas; totalMisiones; completo }[]>`.
  - API: `GET /api/progreso?caso=`, `POST /api/progreso`, `POST /api/progreso/sync`, `POST /api/entregables`. Sin sesión responden 401.
  - `@/lib/progreso/cliente`:
    - `type Almacen`, `type Dependencias = { fetch: typeof fetch; almacen: Almacen | null }`, `dependenciasNavegador(): Dependencias`;
    - `type ProgresoVisible = { sesion: boolean; misiones: Record<string, EstadoMision>; entregable: string | null; completo: boolean }`;
    - `reportarTarea(intento, deps): Promise<"servidor" | "local" | "descartado">`;
    - `sincronizarPendientes(deps): Promise<number>`;
    - `cargarProgreso(caso, tareasPorMision: Record<string, string[]>, deps): Promise<ProgresoVisible>` (une servidor y `localStorage`).
  - `<SincronizarProgreso />`: al montarse sube lo pendiente en `localStorage`.

- [x] **Step 1: Escribir el test que falla, `src/lib/progreso/servicio.test.ts`**

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casoInscripciones, casos, misionProgreso, rutaCasos, rutaInscripciones, rutas, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import {
  ErrorProgreso,
  guardarEntregable,
  listarCasosDelUsuario,
  obtenerProgresoCaso,
  registrarIntento,
  sincronizarIntentos,
} from "./servicio";

const { db, close } = createTestDb();

async function prepararCaso() {
  const [usuario] = await db.insert(users).values({ email: "alumna@correo.cl" }).returning({ id: users.id });
  const [ruta] = await db
    .insert(rutas)
    .values({ slug: "analista", titulo: "Analista", cargo: "Analista junior", descripcion: "Ruta", estado: "publicada" })
    .returning({ id: rutas.id });
  const [caso] = await db
    .insert(casos)
    .values({
      slug: "ventas",
      titulo: "Ventas",
      cargo: "Analista junior",
      empresa: "Distribuidora",
      entregable: "Repositorio",
      misiones: [
        { slug: "m1", titulo: "M1", tareas: ["t1", "t2"] },
        { slug: "m2", titulo: "M2", tareas: ["t3"] },
      ],
    })
    .returning({ id: casos.id });
  await db.insert(rutaCasos).values({ rutaId: ruta.id, casoId: caso.id, orden: 0 });
  return { userId: usuario.id, rutaId: ruta.id, casoId: caso.id };
}

const intento = (mision: string, tarea: string, aprobada = true) => ({ caso: "ventas", mision, tarea, aprobada });

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("registrarIntento", () => {
  it("aprueba la misión cuando todas sus tareas están aprobadas", async () => {
    const { userId } = await prepararCaso();
    expect(await registrarIntento(db, userId, intento("m1", "t1"))).toEqual({ misionAprobada: false, casoCompleto: false });
    expect(await registrarIntento(db, userId, intento("m1", "t2"))).toEqual({ misionAprobada: true, casoCompleto: false });
    const [fila] = await db.select().from(misionProgreso);
    expect(fila).toMatchObject({ mision: "m1", estado: "aprobada", intentos: 2, tareasAprobadas: ["t1", "t2"] });
    expect(fila.aprobadaEn).toBeInstanceOf(Date);
  });

  it("un intento fallido suma intentos pero no aprueba la tarea", async () => {
    const { userId } = await prepararCaso();
    expect(await registrarIntento(db, userId, intento("m2", "t3", false))).toEqual({
      misionAprobada: false,
      casoCompleto: false,
    });
    const [fila] = await db.select().from(misionProgreso);
    expect(fila).toMatchObject({ estado: "en_curso", intentos: 1, tareasAprobadas: [] });
  });

  it("aprobar dos veces la misma tarea no la duplica ni cambia la fecha de aprobación", async () => {
    const { userId } = await prepararCaso();
    await registrarIntento(db, userId, intento("m2", "t3"));
    const [primera] = await db.select().from(misionProgreso);
    await registrarIntento(db, userId, intento("m2", "t3"));
    const [segunda] = await db.select().from(misionProgreso);
    expect(segunda).toMatchObject({ estado: "aprobada", intentos: 2, tareasAprobadas: ["t3"] });
    expect(segunda.aprobadaEn).toEqual(primera.aprobadaEn);
  });

  it("inscribe a la alumna en el caso y en sus rutas", async () => {
    const { userId } = await prepararCaso();
    await registrarIntento(db, userId, intento("m1", "t1"));
    expect(await db.select().from(casoInscripciones)).toHaveLength(1);
    expect(await db.select().from(rutaInscripciones)).toHaveLength(1);
  });

  it("rechaza caso, misión o tarea que no existen", async () => {
    const { userId } = await prepararCaso();
    await expect(registrarIntento(db, userId, { ...intento("m1", "t1"), caso: "otro" })).rejects.toMatchObject({
      codigo: "caso_no_existe",
    });
    await expect(registrarIntento(db, userId, intento("m9", "t1"))).rejects.toMatchObject({ codigo: "mision_no_existe" });
    await expect(registrarIntento(db, userId, intento("m1", "t9"))).rejects.toBeInstanceOf(ErrorProgreso);
  });
});

describe("guardarEntregable", () => {
  it("con todas las misiones aprobadas completa el caso y la ruta", async () => {
    const { userId, casoId, rutaId } = await prepararCaso();
    for (const [mision, tarea] of [["m1", "t1"], ["m1", "t2"], ["m2", "t3"]]) {
      await registrarIntento(db, userId, intento(mision, tarea));
    }
    expect(await obtenerProgresoCaso(db, userId, "ventas")).toMatchObject({ completo: false, entregable: null });

    expect(await guardarEntregable(db, userId, { caso: "ventas", url: "https://github.com/alumna/ventas" })).toEqual({
      casoCompleto: true,
    });
    const [inscripcion] = await db.select().from(casoInscripciones).where(eq(casoInscripciones.casoId, casoId));
    expect(inscripcion.completadoEn).toBeInstanceOf(Date);
    const [enRuta] = await db.select().from(rutaInscripciones).where(eq(rutaInscripciones.rutaId, rutaId));
    expect(enRuta.completadoEn).toBeInstanceOf(Date);
  });

  it("sin las misiones no completa el caso, y guardarlo de nuevo reemplaza la URL", async () => {
    const { userId } = await prepararCaso();
    expect(await guardarEntregable(db, userId, { caso: "ventas", url: "https://github.com/alumna/v1" })).toEqual({
      casoCompleto: false,
    });
    await guardarEntregable(db, userId, { caso: "ventas", url: "https://github.com/alumna/v2" });
    expect(await obtenerProgresoCaso(db, userId, "ventas")).toMatchObject({ entregable: "https://github.com/alumna/v2" });
  });
});

describe("sincronizarIntentos", () => {
  it("aplica los válidos, cuenta los rechazados y no duplica lo que ya estaba", async () => {
    const { userId } = await prepararCaso();
    await registrarIntento(db, userId, intento("m1", "t1"));
    const lote = [intento("m1", "t1"), intento("m1", "t2"), intento("m1", "t2"), { ...intento("m1", "t1"), caso: "borrado" }];
    expect(await sincronizarIntentos(db, userId, lote)).toEqual({ aplicados: 3, rechazados: 1 });
    expect(await obtenerProgresoCaso(db, userId, "ventas")).toEqual({
      misiones: { m1: { estado: "aprobada", tareasAprobadas: ["t1", "t2"] } },
      entregable: null,
      completo: false,
    });
  });
});

describe("consultas", () => {
  it("obtenerProgresoCaso devuelve null si el caso no existe", async () => {
    const { userId } = await prepararCaso();
    expect(await obtenerProgresoCaso(db, userId, "otro")).toBeNull();
  });

  it("listarCasosDelUsuario resume el avance de cada caso", async () => {
    const { userId } = await prepararCaso();
    await registrarIntento(db, userId, intento("m1", "t1"));
    await registrarIntento(db, userId, intento("m1", "t2"));
    expect(await listarCasosDelUsuario(db, userId)).toEqual([
      { slug: "ventas", titulo: "Ventas", misionesAprobadas: 1, totalMisiones: 2, completo: false },
    ]);
  });
});
```

- [x] **Step 2: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/progreso/servicio.test.ts`
Expected: FAIL, porque no se puede resolver `./servicio`.

- [x] **Step 3: Crear `src/lib/progreso/esquemas.ts` y `src/lib/progreso/servicio.ts`**

`src/lib/progreso/esquemas.ts`:
```ts
import { z } from "zod";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const intentoSchema = z.object({ caso: slug, mision: slug, tarea: slug, aprobada: z.boolean() });
export type IntentoTarea = z.infer<typeof intentoSchema>;

export const sincronizacionSchema = z.object({ intentos: z.array(intentoSchema).max(200) });

export const entregableSchema = z.object({
  caso: slug,
  url: z
    .string()
    .trim()
    .max(500)
    .url()
    .refine((url) => url.startsWith("https://"), "El enlace debe empezar con https://"),
});
```

`src/lib/progreso/servicio.ts`:
```ts
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { AppDb, DbClient } from "@syntaxerror/db/client";
import {
  casoInscripciones,
  casos,
  entregables,
  misionProgreso,
  rutaCasos,
  rutaInscripciones,
} from "@syntaxerror/db/schema";
import type { IntentoTarea } from "./esquemas";

export type CodigoErrorProgreso = "caso_no_existe" | "mision_no_existe" | "tarea_no_existe";

export class ErrorProgreso extends Error {
  constructor(readonly codigo: CodigoErrorProgreso) {
    super(codigo);
    this.name = "ErrorProgreso";
  }
}

export type EstadoMision = { estado: "en_curso" | "aprobada"; tareasAprobadas: string[] };
export type ProgresoCaso = { misiones: Record<string, EstadoMision>; entregable: string | null; completo: boolean };
export type CasoDelUsuario = {
  slug: string;
  titulo: string;
  misionesAprobadas: number;
  totalMisiones: number;
  completo: boolean;
};

type CasoGuardado = typeof casos.$inferSelect;

async function buscarCaso(db: DbClient, slug: string): Promise<CasoGuardado> {
  const [caso] = await db.select().from(casos).where(eq(casos.slug, slug));
  if (!caso) throw new ErrorProgreso("caso_no_existe");
  return caso;
}

async function inscribir(tx: DbClient, userId: string, casoId: string): Promise<void> {
  await tx.insert(casoInscripciones).values({ userId, casoId }).onConflictDoNothing();
  const rutasDelCaso = await tx.select({ rutaId: rutaCasos.rutaId }).from(rutaCasos).where(eq(rutaCasos.casoId, casoId));
  if (rutasDelCaso.length > 0) {
    await tx
      .insert(rutaInscripciones)
      .values(rutasDelCaso.map(({ rutaId }) => ({ userId, rutaId })))
      .onConflictDoNothing();
  }
}

// Un caso se completa con todas sus misiones aprobadas y el entregable enlazado (spec §7.5).
async function actualizarCompletitud(tx: DbClient, userId: string, caso: CasoGuardado): Promise<boolean> {
  const aprobadas = await tx
    .select({ mision: misionProgreso.mision })
    .from(misionProgreso)
    .where(
      and(eq(misionProgreso.userId, userId), eq(misionProgreso.casoId, caso.id), eq(misionProgreso.estado, "aprobada"))
    );
  const slugsAprobados = new Set(aprobadas.map((fila) => fila.mision));
  const [entregable] = await tx
    .select({ id: entregables.id })
    .from(entregables)
    .where(and(eq(entregables.userId, userId), eq(entregables.casoId, caso.id)));

  const completo =
    caso.misiones.length > 0 && caso.misiones.every((mision) => slugsAprobados.has(mision.slug)) && Boolean(entregable);
  if (!completo) return false;

  await tx
    .update(casoInscripciones)
    .set({ completadoEn: sql`coalesce(${casoInscripciones.completadoEn}, now())` })
    .where(and(eq(casoInscripciones.userId, userId), eq(casoInscripciones.casoId, caso.id)));

  const rutasDelCaso = await tx.select({ rutaId: rutaCasos.rutaId }).from(rutaCasos).where(eq(rutaCasos.casoId, caso.id));
  for (const { rutaId } of rutasDelCaso) {
    const casosDeRuta = await tx.select({ casoId: rutaCasos.casoId }).from(rutaCasos).where(eq(rutaCasos.rutaId, rutaId));
    const completos = await tx
      .select({ casoId: casoInscripciones.casoId })
      .from(casoInscripciones)
      .where(
        and(
          eq(casoInscripciones.userId, userId),
          inArray(
            casoInscripciones.casoId,
            casosDeRuta.map((fila) => fila.casoId)
          ),
          isNotNull(casoInscripciones.completadoEn)
        )
      );
    if (completos.length === casosDeRuta.length) {
      await tx
        .update(rutaInscripciones)
        .set({ completadoEn: sql`coalesce(${rutaInscripciones.completadoEn}, now())` })
        .where(and(eq(rutaInscripciones.userId, userId), eq(rutaInscripciones.rutaId, rutaId)));
    }
  }
  return true;
}

export async function registrarIntento(
  db: AppDb,
  userId: string,
  intento: IntentoTarea
): Promise<{ misionAprobada: boolean; casoCompleto: boolean }> {
  return db.transaction(async (tx) => {
    const caso = await buscarCaso(tx, intento.caso);
    const mision = caso.misiones.find((candidata) => candidata.slug === intento.mision);
    if (!mision) throw new ErrorProgreso("mision_no_existe");
    if (!mision.tareas.includes(intento.tarea)) throw new ErrorProgreso("tarea_no_existe");

    await inscribir(tx, userId, caso.id);
    const clave = and(
      eq(misionProgreso.userId, userId),
      eq(misionProgreso.casoId, caso.id),
      eq(misionProgreso.mision, mision.slug)
    );
    await tx.insert(misionProgreso).values({ userId, casoId: caso.id, mision: mision.slug }).onConflictDoNothing();
    const [fila] = await tx.select().from(misionProgreso).where(clave).for("update");

    const tareas =
      intento.aprobada && !fila.tareasAprobadas.includes(intento.tarea)
        ? [...fila.tareasAprobadas, intento.tarea]
        : fila.tareasAprobadas;
    const aprobada = mision.tareas.every((tarea) => tareas.includes(tarea));
    const ahora = new Date();
    await tx
      .update(misionProgreso)
      .set({
        intentos: fila.intentos + 1,
        tareasAprobadas: tareas,
        estado: aprobada ? "aprobada" : "en_curso",
        aprobadaEn: aprobada ? (fila.aprobadaEn ?? ahora) : null,
        actualizadoEn: ahora,
      })
      .where(clave);

    return { misionAprobada: aprobada, casoCompleto: await actualizarCompletitud(tx, userId, caso) };
  });
}

export async function guardarEntregable(
  db: AppDb,
  userId: string,
  entrada: { caso: string; url: string }
): Promise<{ casoCompleto: boolean }> {
  return db.transaction(async (tx) => {
    const caso = await buscarCaso(tx, entrada.caso);
    await inscribir(tx, userId, caso.id);
    await tx
      .insert(entregables)
      .values({ userId, casoId: caso.id, url: entrada.url })
      .onConflictDoUpdate({
        target: [entregables.userId, entregables.casoId],
        set: { url: entrada.url, actualizadoEn: new Date() },
      });
    return { casoCompleto: await actualizarCompletitud(tx, userId, caso) };
  });
}

export async function obtenerProgresoCaso(db: AppDb, userId: string, slug: string): Promise<ProgresoCaso | null> {
  const [caso] = await db.select({ id: casos.id }).from(casos).where(eq(casos.slug, slug));
  if (!caso) return null;

  const [filas, [entregable], [inscripcion]] = await Promise.all([
    db
      .select({
        mision: misionProgreso.mision,
        estado: misionProgreso.estado,
        tareasAprobadas: misionProgreso.tareasAprobadas,
      })
      .from(misionProgreso)
      .where(and(eq(misionProgreso.userId, userId), eq(misionProgreso.casoId, caso.id))),
    db
      .select({ url: entregables.url })
      .from(entregables)
      .where(and(eq(entregables.userId, userId), eq(entregables.casoId, caso.id))),
    db
      .select({ completadoEn: casoInscripciones.completadoEn })
      .from(casoInscripciones)
      .where(and(eq(casoInscripciones.userId, userId), eq(casoInscripciones.casoId, caso.id))),
  ]);

  return {
    misiones: Object.fromEntries(
      filas.map((fila) => [
        fila.mision,
        { estado: fila.estado === "aprobada" ? "aprobada" : "en_curso", tareasAprobadas: fila.tareasAprobadas },
      ])
    ),
    entregable: entregable?.url ?? null,
    completo: Boolean(inscripcion?.completadoEn),
  };
}

export async function sincronizarIntentos(
  db: AppDb,
  userId: string,
  intentos: IntentoTarea[]
): Promise<{ aplicados: number; rechazados: number }> {
  let aplicados = 0;
  let rechazados = 0;
  for (const intento of intentos) {
    try {
      await registrarIntento(db, userId, intento);
      aplicados += 1;
    } catch (error) {
      if (!(error instanceof ErrorProgreso)) throw error;
      rechazados += 1;
    }
  }
  return { aplicados, rechazados };
}

export async function listarCasosDelUsuario(db: AppDb, userId: string): Promise<CasoDelUsuario[]> {
  const inscritos = await db
    .select({
      casoId: casos.id,
      slug: casos.slug,
      titulo: casos.titulo,
      misiones: casos.misiones,
      completadoEn: casoInscripciones.completadoEn,
    })
    .from(casoInscripciones)
    .innerJoin(casos, eq(casos.id, casoInscripciones.casoId))
    .where(eq(casoInscripciones.userId, userId))
    .orderBy(desc(casoInscripciones.inscritoEn));
  if (inscritos.length === 0) return [];

  const aprobadas = await db
    .select({ casoId: misionProgreso.casoId, mision: misionProgreso.mision })
    .from(misionProgreso)
    .where(and(eq(misionProgreso.userId, userId), eq(misionProgreso.estado, "aprobada")));

  return inscritos.map((caso) => ({
    slug: caso.slug,
    titulo: caso.titulo,
    totalMisiones: caso.misiones.length,
    misionesAprobadas: aprobadas.filter(
      (fila) => fila.casoId === caso.casoId && caso.misiones.some((mision) => mision.slug === fila.mision)
    ).length,
    completo: caso.completadoEn !== null,
  }));
}
```

- [x] **Step 4: Correr el test del servicio**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/progreso/servicio.test.ts`
Expected: PASS (10 tests).

- [x] **Step 5: Escribir los tests de las rutas de API**

`src/app/api/progreso/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));

const { GET, POST } = await import("./route");
const { POST: SINCRONIZAR } = await import("./sync/route");
const { obtenerUsuarioId } = await import("@/lib/sesion");

const { db, close } = createTestDb();

async function iniciarSesion() {
  const [usuario] = await db.insert(users).values({ email: "alumna@correo.cl" }).returning({ id: users.id });
  await db.insert(casos).values({
    slug: "ventas",
    titulo: "Ventas",
    cargo: "Analista junior",
    empresa: "Distribuidora",
    entregable: "Repositorio",
    misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }],
  });
  vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
}

function enviar(handler: (request: Request) => Promise<Response>, cuerpo: unknown) {
  return handler(
    new Request("http://localhost:3000/api/progreso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  );
}

const consultar = (caso: string) => GET(new Request(`http://localhost:3000/api/progreso?caso=${caso}`));
const aprobado = { caso: "ventas", mision: "m1", tarea: "t1", aprobada: true };

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("/api/progreso", () => {
  it("responde 401 sin sesión", async () => {
    expect((await consultar("ventas")).status).toBe(401);
    expect((await enviar(POST, aprobado)).status).toBe(401);
    expect((await enviar(SINCRONIZAR, { intentos: [aprobado] })).status).toBe(401);
  });

  it("registra un intento y devuelve el progreso del caso", async () => {
    await iniciarSesion();
    const respuesta = await enviar(POST, aprobado);
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ misionAprobada: true, casoCompleto: false });
    expect(await (await consultar("ventas")).json()).toEqual({
      misiones: { m1: { estado: "aprobada", tareasAprobadas: ["t1"] } },
      entregable: null,
      completo: false,
    });
  });

  it("responde 400 con datos inválidos y 404 si el caso no existe", async () => {
    await iniciarSesion();
    expect((await enviar(POST, { caso: "ventas" })).status).toBe(400);
    expect((await enviar(POST, { ...aprobado, caso: "otro" })).status).toBe(404);
    expect((await consultar("otro")).status).toBe(404);
  });

  it("sync aplica el lote y cuenta los rechazados", async () => {
    await iniciarSesion();
    const respuesta = await enviar(SINCRONIZAR, { intentos: [aprobado, { ...aprobado, caso: "otro" }] });
    expect(await respuesta.json()).toEqual({ aplicados: 1, rechazados: 1 });
  });
});
```

`src/app/api/entregables/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));

const { POST } = await import("./route");
const { obtenerUsuarioId } = await import("@/lib/sesion");

const { db, close } = createTestDb();

function enviar(cuerpo: unknown) {
  return POST(
    new Request("http://localhost:3000/api/entregables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  );
}

beforeEach(async () => {
  await truncateAll(db);
  const [usuario] = await db.insert(users).values({ email: "alumna@correo.cl" }).returning({ id: users.id });
  await db.insert(casos).values({
    slug: "ventas",
    titulo: "Ventas",
    cargo: "Analista junior",
    empresa: "Distribuidora",
    entregable: "Repositorio",
    misiones: [{ slug: "m1", titulo: "M1", tareas: ["t1"] }],
  });
  vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
});
afterAll(() => close());

describe("POST /api/entregables", () => {
  it("responde 401 sin sesión", async () => {
    vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
    expect((await enviar({ caso: "ventas", url: "https://github.com/alumna/ventas" })).status).toBe(401);
  });

  it("rechaza enlaces que no son https", async () => {
    expect((await enviar({ caso: "ventas", url: "http://github.com/alumna/ventas" })).status).toBe(400);
    expect((await enviar({ caso: "ventas", url: "mi repo" })).status).toBe(400);
  });

  it("guarda el entregable", async () => {
    const respuesta = await enviar({ caso: "ventas", url: "https://github.com/alumna/ventas" });
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ casoCompleto: false });
  });

  it("responde 404 si el caso no existe", async () => {
    expect((await enviar({ caso: "otro", url: "https://github.com/alumna/ventas" })).status).toBe(404);
  });
});
```

- [x] **Step 6: Crear `src/lib/sesion.ts` y las rutas de API**

`src/lib/sesion.ts`:
```ts
import { auth } from "./auth";

export async function obtenerUsuarioId(): Promise<string | null> {
  const sesion = await auth();
  return sesion?.user?.id ?? null;
}
```

`src/app/api/progreso/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { intentoSchema } from "@/lib/progreso/esquemas";
import { ErrorProgreso, obtenerProgresoCaso, registrarIntento } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const caso = new URL(request.url).searchParams.get("caso");
  if (!caso) return NextResponse.json({ error: "falta_caso" }, { status: 400 });

  const progreso = await obtenerProgresoCaso(getDb(), userId, caso);
  if (!progreso) return NextResponse.json({ error: "caso_no_existe" }, { status: 404 });
  return NextResponse.json(progreso, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = intentoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });

  try {
    return NextResponse.json(await registrarIntento(getDb(), userId, parsed.data));
  } catch (error) {
    if (error instanceof ErrorProgreso) return NextResponse.json({ error: error.codigo }, { status: 404 });
    throw error;
  }
}
```

`src/app/api/progreso/sync/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { sincronizacionSchema } from "@/lib/progreso/esquemas";
import { sincronizarIntentos } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = sincronizacionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  return NextResponse.json(await sincronizarIntentos(getDb(), userId, parsed.data.intentos));
}
```

`src/app/api/entregables/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { entregableSchema } from "@/lib/progreso/esquemas";
import { ErrorProgreso, guardarEntregable } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = entregableSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "url_invalida" }, { status: 400 });

  try {
    return NextResponse.json(await guardarEntregable(getDb(), userId, parsed.data));
  } catch (error) {
    if (error instanceof ErrorProgreso) return NextResponse.json({ error: error.codigo }, { status: 404 });
    throw error;
  }
}
```

- [x] **Step 7: Correr los tests de las rutas**

Run: `docker compose run --rm tools pnpm --filter web test -- src/app/api/progreso src/app/api/entregables`
Expected: PASS (8 tests).

- [x] **Step 8: Escribir el test que falla, `src/lib/progreso/cliente.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { cargarProgreso, leerPendientes, reportarTarea, sincronizarPendientes, type Almacen } from "./cliente";

function almacenEnMemoria(): Almacen {
  const datos = new Map<string, string>();
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => void datos.set(clave, valor),
    removeItem: (clave) => void datos.delete(clave),
  };
}

function fetchFalso(responder: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const llamadas: { url: string; cuerpo: unknown }[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    llamadas.push({ url, cuerpo: init?.body ? JSON.parse(String(init.body)) : null });
    return responder(url, init);
  }) as unknown as typeof globalThis.fetch;
  return { fetch, llamadas };
}

const json = (status: number, cuerpo: unknown = {}) => new Response(JSON.stringify(cuerpo), { status });
const aprobado = { caso: "ventas", mision: "m1", tarea: "t1", aprobada: true };

describe("reportarTarea", () => {
  it("con sesión lo guarda en el servidor", async () => {
    const almacen = almacenEnMemoria();
    const { fetch, llamadas } = fetchFalso(() => json(200));
    expect(await reportarTarea(aprobado, { fetch, almacen })).toBe("servidor");
    expect(llamadas[0]).toEqual({ url: "/api/progreso", cuerpo: aprobado });
    expect(leerPendientes(almacen)).toEqual([]);
  });

  it("sin sesión guarda la tarea aprobada una sola vez en localStorage", async () => {
    const almacen = almacenEnMemoria();
    const { fetch } = fetchFalso(() => json(401));
    expect(await reportarTarea(aprobado, { fetch, almacen })).toBe("local");
    await reportarTarea(aprobado, { fetch, almacen });
    expect(leerPendientes(almacen)).toEqual([{ caso: "ventas", mision: "m1", tarea: "t1" }]);
  });

  it("sin conexión también la guarda local", async () => {
    const almacen = almacenEnMemoria();
    const { fetch } = fetchFalso(() => Promise.reject(new TypeError("Failed to fetch")));
    expect(await reportarTarea(aprobado, { fetch, almacen })).toBe("local");
  });

  it("descarta los intentos fallidos y los rechazos del servidor", async () => {
    const almacen = almacenEnMemoria();
    expect(await reportarTarea({ ...aprobado, aprobada: false }, { fetch: fetchFalso(() => json(401)).fetch, almacen })).toBe(
      "descartado"
    );
    expect(await reportarTarea(aprobado, { fetch: fetchFalso(() => json(404)).fetch, almacen })).toBe("descartado");
    expect(leerPendientes(almacen)).toEqual([]);
  });

  it("funciona aunque no haya localStorage", async () => {
    expect(await reportarTarea(aprobado, { fetch: fetchFalso(() => json(401)).fetch, almacen: null })).toBe("local");
  });
});

describe("sincronizarPendientes", () => {
  it("sube lo pendiente y lo borra si el servidor responde bien", async () => {
    const almacen = almacenEnMemoria();
    await reportarTarea(aprobado, { fetch: fetchFalso(() => json(401)).fetch, almacen });
    const { fetch, llamadas } = fetchFalso(() => json(200, { aplicados: 1, rechazados: 0 }));
    expect(await sincronizarPendientes({ fetch, almacen })).toBe(1);
    expect(llamadas[0]).toEqual({ url: "/api/progreso/sync", cuerpo: { intentos: [aprobado] } });
    expect(leerPendientes(almacen)).toEqual([]);
  });

  it("sin sesión conserva lo pendiente", async () => {
    const almacen = almacenEnMemoria();
    await reportarTarea(aprobado, { fetch: fetchFalso(() => json(401)).fetch, almacen });
    expect(await sincronizarPendientes({ fetch: fetchFalso(() => json(401)).fetch, almacen })).toBe(0);
    expect(leerPendientes(almacen)).toHaveLength(1);
  });
});

describe("cargarProgreso", () => {
  const tareasPorMision = { m1: ["t1", "t2"], m2: ["t3"] };

  it("une lo del servidor con lo pendiente en localStorage", async () => {
    const almacen = almacenEnMemoria();
    await reportarTarea({ ...aprobado, tarea: "t2" }, { fetch: fetchFalso(() => json(401)).fetch, almacen });
    const servidor = {
      misiones: { m1: { estado: "en_curso", tareasAprobadas: ["t1"] } },
      entregable: null,
      completo: false,
    };
    const progreso = await cargarProgreso("ventas", tareasPorMision, { fetch: fetchFalso(() => json(200, servidor)).fetch, almacen });
    expect(progreso).toEqual({
      sesion: true,
      misiones: { m1: { estado: "aprobada", tareasAprobadas: ["t1", "t2"] } },
      entregable: null,
      completo: false,
    });
  });

  it("sin sesión usa solo localStorage", async () => {
    const almacen = almacenEnMemoria();
    await reportarTarea({ ...aprobado, mision: "m2", tarea: "t3" }, { fetch: fetchFalso(() => json(401)).fetch, almacen });
    const progreso = await cargarProgreso("ventas", tareasPorMision, { fetch: fetchFalso(() => json(401)).fetch, almacen });
    expect(progreso).toEqual({
      sesion: false,
      misiones: { m2: { estado: "aprobada", tareasAprobadas: ["t3"] } },
      entregable: null,
      completo: false,
    });
  });
});
```

- [x] **Step 9: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/progreso/cliente.test.ts`
Expected: FAIL, porque no se puede resolver `./cliente`.

- [x] **Step 10: Crear `src/lib/progreso/cliente.ts` y `src/components/sincronizar-progreso.tsx`**

`src/lib/progreso/cliente.ts`:
```ts
import type { IntentoTarea } from "./esquemas";
import type { EstadoMision } from "./servicio";

export type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type Dependencias = { fetch: typeof fetch; almacen: Almacen | null };
export type ProgresoVisible = {
  sesion: boolean;
  misiones: Record<string, EstadoMision>;
  entregable: string | null;
  completo: boolean;
};

type Pendiente = Omit<IntentoTarea, "aprobada">;

const CLAVE = "syntaxerror:progreso-pendiente";
const LOTE = 200;
const JSON_HEADERS = { "Content-Type": "application/json" };

const claveDe = (pendiente: Pendiente) => `${pendiente.caso}/${pendiente.mision}/${pendiente.tarea}`;

export function leerPendientes(almacen: Almacen | null): Pendiente[] {
  if (!almacen) return [];
  try {
    const guardado = almacen.getItem(CLAVE);
    const valor: unknown = guardado ? JSON.parse(guardado) : [];
    return Array.isArray(valor) ? (valor as Pendiente[]) : [];
  } catch {
    return [];
  }
}

function escribirPendientes(almacen: Almacen | null, pendientes: Pendiente[]): void {
  if (!almacen) return;
  try {
    if (pendientes.length > 0) almacen.setItem(CLAVE, JSON.stringify(pendientes));
    else almacen.removeItem(CLAVE);
  } catch {
    // Sin espacio o almacenamiento bloqueado: el progreso queda solo en la sesión actual.
  }
}

function guardarPendiente(almacen: Almacen | null, intento: IntentoTarea): void {
  const pendientes = leerPendientes(almacen);
  const nuevo = { caso: intento.caso, mision: intento.mision, tarea: intento.tarea };
  if (pendientes.some((pendiente) => claveDe(pendiente) === claveDe(nuevo))) return;
  escribirPendientes(almacen, [...pendientes, nuevo]);
}

export async function reportarTarea(
  intento: IntentoTarea,
  deps: Dependencias
): Promise<"servidor" | "local" | "descartado"> {
  try {
    const respuesta = await deps.fetch("/api/progreso", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(intento),
    });
    if (respuesta.ok) return "servidor";
    if (respuesta.status !== 401 && respuesta.status < 500) return "descartado";
  } catch {
    // Sin conexión: se guarda local y se sube después.
  }
  if (!intento.aprobada) return "descartado";
  guardarPendiente(deps.almacen, intento);
  return "local";
}

export async function sincronizarPendientes(deps: Dependencias): Promise<number> {
  const lote = leerPendientes(deps.almacen).slice(0, LOTE);
  if (lote.length === 0) return 0;
  try {
    const respuesta = await deps.fetch("/api/progreso/sync", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ intentos: lote.map((pendiente) => ({ ...pendiente, aprobada: true })) }),
    });
    if (!respuesta.ok) return 0;
    const { aplicados } = (await respuesta.json()) as { aplicados: number };
    const enviados = new Set(lote.map(claveDe));
    escribirPendientes(
      deps.almacen,
      leerPendientes(deps.almacen).filter((pendiente) => !enviados.has(claveDe(pendiente)))
    );
    return aplicados;
  } catch {
    return 0;
  }
}

export async function cargarProgreso(
  caso: string,
  tareasPorMision: Record<string, string[]>,
  deps: Dependencias
): Promise<ProgresoVisible> {
  let servidor: Omit<ProgresoVisible, "sesion"> | null = null;
  try {
    const respuesta = await deps.fetch(`/api/progreso?caso=${encodeURIComponent(caso)}`, { cache: "no-store" });
    if (respuesta.ok) servidor = (await respuesta.json()) as Omit<ProgresoVisible, "sesion">;
  } catch {
    servidor = null;
  }

  const locales = leerPendientes(deps.almacen).filter((pendiente) => pendiente.caso === caso);
  const misiones: Record<string, EstadoMision> = {};
  for (const [mision, tareas] of Object.entries(tareasPorMision)) {
    const delServidor = servidor?.misiones[mision];
    const aprobadas = new Set([
      ...(delServidor?.tareasAprobadas ?? []),
      ...locales.filter((pendiente) => pendiente.mision === mision).map((pendiente) => pendiente.tarea),
    ]);
    if (!delServidor && aprobadas.size === 0) continue;
    misiones[mision] = {
      estado: tareas.length > 0 && tareas.every((tarea) => aprobadas.has(tarea)) ? "aprobada" : "en_curso",
      tareasAprobadas: [...aprobadas],
    };
  }

  return {
    sesion: servidor !== null,
    misiones,
    entregable: servidor?.entregable ?? null,
    completo: servidor?.completo ?? false,
  };
}

export function dependenciasNavegador(): Dependencias {
  let almacen: Almacen | null = null;
  try {
    almacen = window.localStorage;
  } catch {
    almacen = null;
  }
  return { fetch: window.fetch.bind(window), almacen };
}
```

`src/components/sincronizar-progreso.tsx`:
```tsx
"use client";

import { useEffect } from "react";
import { dependenciasNavegador, sincronizarPendientes } from "@/lib/progreso/cliente";

// Sube el progreso que se guardó en localStorage mientras no había sesión o conexión.
export function SincronizarProgreso() {
  useEffect(() => {
    void sincronizarPendientes(dependenciasNavegador());
  }, []);
  return null;
}
```

- [x] **Step 11: Mostrar los casos en el dashboard y sincronizar ahí también**

Reemplazar `src/app/(dashboard)/layout.tsx` por:
```tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { SincronizarProgreso } from "@/components/sincronizar-progreso";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");
  return (
    <>
      <SiteHeader />
      <SincronizarProgreso />
      {children}
      <SiteFooter />
    </>
  );
}
```

Reemplazar `src/app/(dashboard)/dashboard/page.tsx` por:
```tsx
import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { auth } from "@/lib/auth";
import { listarCasosDelUsuario } from "@/lib/progreso/servicio";

export const metadata = { title: "Tu panel" };

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "estudiante";
  const casosDelUsuario = session?.user?.id ? await listarCasosDelUsuario(getDb(), session.user.id) : [];

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-sm font-bold text-primary">{"> whoami"}</p>
      <h1 className="text-3xl font-black">Hola, {name}</h1>
      <p className="max-w-2xl leading-7 text-muted-foreground">
        Aquí vas a ver tus casos en curso, tus entregables y tus certificados.
      </p>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus casos</h2>
        {casosDelUsuario.length === 0 ? (
          <p className="text-muted-foreground">
            Todavía no empiezas ningún caso.{" "}
            <Link className="font-bold text-primary hover:underline" href="/rutas">
              Mira las rutas
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-3">
            {casosDelUsuario.map((caso) => (
              <li key={caso.slug}>
                <Link
                  href={`/casos/${caso.slug}`}
                  className="card flex items-center justify-between gap-4 p-4 hover:border-primary"
                >
                  <span className="font-bold">{caso.titulo}</span>
                  <span className="badge">
                    {caso.completo ? "Completo" : `${caso.misionesAprobadas}/${caso.totalMisiones} misiones`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
```

- [x] **Step 12: Correr todos los tests de web y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS (todos los tests de web, incluidos los 27 nuevos de esta tarea) y `tsc` sin errores.

- [x] **Step 13: Commit**

```bash
git add apps/web
git commit -m "feat(web): progreso por mision, entregables y sincronizacion desde localStorage

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Bloques de misión y tareas SQL y de planilla en el navegador

**Files:**
- Create: `apps/web/src/lib/mezclar.ts`
- Create: `apps/web/src/components/mision/mision-provider.tsx`, `bloques.tsx`, `decision.tsx`, `debrief.tsx`, `panel-tarea.tsx`, `tabla-resultado.tsx`, `editor-codigo.tsx`, `sql-task.tsx`, `sql-ejemplo.tsx`, `sheet-task.tsx`
- Test: `apps/web/src/lib/mezclar.test.ts`
- Modify: `apps/web/package.json` (dependencia `@syntaxerror/engines`), `apps/web/next.config.ts` (`transpilePackages`)

**Interfaces:**
- Consumes: motores `sql` y `sheet` (Tasks 1 y 2), `reportarTarea`, `cargarProgreso`, `dependenciasNavegador` (Task 7).
- Produces:
  - `mezclar<T>(lista: readonly T[], aleatorio?: () => number): T[]` (Fisher-Yates, no muta).
  - `<MisionProvider caso mision tareas>` y `useMision(): { completa: boolean; tareaAprobada(id): boolean; registrarResultado(id, aprobada): void }`. Al montarse carga lo ya aprobado (servidor o `localStorage`) y cada resultado se reporta con `reportarTarea`.
  - Componentes de bloque: `Brief`, `Concepto` (server), `Decision`, `Debrief`, `SqlEjemplo`, `SqlTask`, `SheetTask` (client).
  - Textos que usan los e2e: etiqueta `Consulta SQL`, botones `Ejecutar` y `Validar`, mensaje `¡Tarea aprobada!`, título `Misión aprobada` (Debrief), botones `Celda F2`, campo `Fórmula`.
  - `SqlTask` recibe `esperadas` (filas) y nunca la `solucion`.

- [x] **Step 1: Agregar los motores a `web`**

Run: `docker compose run --rm tools pnpm --filter web add "@syntaxerror/engines@workspace:*"`

En `apps/web/next.config.ts`, cambiar `transpilePackages` por:
```ts
  transpilePackages: ["@syntaxerror/db", "@syntaxerror/ui", "@syntaxerror/engines"],
```

- [x] **Step 2: Escribir el test que falla, `src/lib/mezclar.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { mezclar } from "./mezclar";

describe("mezclar", () => {
  it("devuelve los mismos elementos sin tocar la lista original", () => {
    const original = [1, 2, 3, 4];
    const mezclada = mezclar(original);
    expect([...mezclada].sort()).toEqual([1, 2, 3, 4]);
    expect(original).toEqual([1, 2, 3, 4]);
  });

  it("usa la fuente de azar que recibe", () => {
    expect(mezclar([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
    expect(mezclar([1, 2, 3], () => 0.99)).toEqual([1, 2, 3]);
  });
});
```

- [x] **Step 3: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/mezclar.test.ts`
Expected: FAIL, porque no se puede resolver `./mezclar`.

- [x] **Step 4: Crear `src/lib/mezclar.ts`**

```ts
export function mezclar<T>(lista: readonly T[], aleatorio: () => number = Math.random): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
```

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/mezclar.test.ts`
Expected: PASS (2 tests).

- [x] **Step 5: Crear el proveedor de la misión y los bloques de texto**

`src/components/mision/mision-provider.tsx`:
```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cargarProgreso, dependenciasNavegador, reportarTarea } from "@/lib/progreso/cliente";

type ContextoMision = {
  completa: boolean;
  tareaAprobada: (id: string) => boolean;
  registrarResultado: (id: string, aprobada: boolean) => void;
};

const Contexto = createContext<ContextoMision | null>(null);

export function MisionProvider({
  caso,
  mision,
  tareas,
  children,
}: {
  caso: string;
  mision: string;
  tareas: string[];
  children: ReactNode;
}) {
  const [aprobadas, setAprobadas] = useState<ReadonlySet<string>>(new Set());
  const claveTareas = tareas.join("|");

  useEffect(() => {
    let vigente = true;
    void cargarProgreso(caso, { [mision]: claveTareas.split("|") }, dependenciasNavegador()).then((progreso) => {
      const previas = progreso.misiones[mision]?.tareasAprobadas ?? [];
      if (vigente && previas.length > 0) setAprobadas((actuales) => new Set([...actuales, ...previas]));
    });
    return () => {
      vigente = false;
    };
  }, [caso, mision, claveTareas]);

  const registrarResultado = useCallback(
    (id: string, aprobada: boolean) => {
      if (aprobada) setAprobadas((actuales) => new Set(actuales).add(id));
      void reportarTarea({ caso, mision, tarea: id, aprobada }, dependenciasNavegador());
    },
    [caso, mision]
  );

  const valor = useMemo<ContextoMision>(
    () => ({
      completa: tareas.length > 0 && tareas.every((tarea) => aprobadas.has(tarea)),
      tareaAprobada: (id) => aprobadas.has(id),
      registrarResultado,
    }),
    [aprobadas, tareas, registrarResultado]
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useMision(): ContextoMision {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useMision debe usarse dentro de MisionProvider");
  return contexto;
}
```

`src/components/mision/bloques.tsx`:
```tsx
import type { ReactNode } from "react";

export function Brief({ de, children }: { de: string; children: ReactNode }) {
  return (
    <section className="card grid gap-2 border-l-4 border-l-primary p-5">
      <p className="font-mono text-xs font-bold uppercase text-muted-foreground">{`Mensaje de ${de}`}</p>
      <div className="grid gap-3 leading-7">{children}</div>
    </section>
  );
}

export function Concepto({ children }: { children: ReactNode }) {
  return (
    <section className="grid gap-3 leading-7">
      <p className="section-kicker">Concepto</p>
      {children}
    </section>
  );
}
```

`src/components/mision/debrief.tsx`:
```tsx
"use client";

import type { ReactNode } from "react";
import { useMision } from "./mision-provider";

export function Debrief({ entrevista, children }: { entrevista: string; children: ReactNode }) {
  const { completa } = useMision();
  if (!completa) {
    return (
      <section className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
        Aprueba las tareas de esta misión para ver el cierre.
      </section>
    );
  }
  return (
    <section className="card grid gap-3 border-l-4 border-l-primary p-5">
      <h2 className="text-xl font-black">Misión aprobada</h2>
      <div className="grid gap-3 leading-7">{children}</div>
      <div className="rounded-md bg-surface-raised p-4 text-sm leading-6">
        <p className="font-bold">En una entrevista</p>
        <p>{entrevista}</p>
      </div>
    </section>
  );
}
```

`src/components/mision/decision.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@syntaxerror/ui/cn";
import { Button } from "@syntaxerror/ui/components/button";
import { mezclar } from "@/lib/mezclar";

type Opcion = { texto: string; correcta: boolean; porque: string };

export function Decision({ pregunta, opciones }: { pregunta: string; opciones: Opcion[] }) {
  const [orden, setOrden] = useState<number[] | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const cantidad = opciones.length;

  // Se mezcla al montar, no en el servidor: cada carga muestra otro orden sin romper la hidratación.
  useEffect(() => {
    setOrden(mezclar(Array.from({ length: cantidad }, (_, indice) => indice)));
  }, [cantidad]);

  return (
    <section className="card grid gap-4 p-5">
      <p className="font-mono text-sm font-bold text-primary">{"> decisión"}</p>
      <p className="font-bold leading-7">{pregunta}</p>
      {orden ? (
        <ul className="grid gap-2">
          {orden.map((indice) => {
            const opcion = opciones[indice];
            const esElegida = elegida === indice;
            return (
              <li key={indice} className="grid gap-1">
                <button
                  type="button"
                  aria-pressed={esElegida}
                  disabled={elegida !== null}
                  onClick={() => setElegida(indice)}
                  className={cn(
                    "w-full rounded-md border p-3 text-left text-sm leading-6",
                    esElegida && opcion.correcta && "border-primary bg-primary/10",
                    esElegida && !opcion.correcta && "border-destructive bg-destructive/10",
                    !esElegida && "border-border hover:border-primary"
                  )}
                >
                  {opcion.texto}
                </button>
                {elegida !== null ? (
                  <p className="px-3 text-sm text-muted-foreground">
                    {opcion.correcta ? "✓ " : "✗ "}
                    {opcion.porque}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Cargando opciones…</p>
      )}
      {elegida !== null ? (
        <div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setElegida(null)}>
            Elegir otra vez
          </Button>
        </div>
      ) : null}
    </section>
  );
}
```

- [x] **Step 6: Crear las piezas compartidas de las tareas**

`src/components/mision/panel-tarea.tsx`:
```tsx
"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@syntaxerror/ui/components/badge";
import { Button } from "@syntaxerror/ui/components/button";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";

export function PanelTarea({
  titulo,
  enunciado,
  aprobada,
  resultado,
  pistas,
  acciones,
  children,
}: {
  titulo: string;
  enunciado?: string;
  aprobada: boolean;
  resultado: ResultadoTarea | null;
  pistas: string[];
  acciones: ReactNode;
  children: ReactNode;
}) {
  const [pistasVistas, setPistasVistas] = useState(0);

  return (
    <section className="card grid gap-4 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-bold text-primary">{`> ${titulo}`}</p>
        {aprobada ? <Badge>Aprobada</Badge> : null}
      </header>
      {enunciado ? <p className="leading-7">{enunciado}</p> : null}
      {children}
      <div className="flex flex-wrap gap-3">
        {acciones}
        {pistasVistas < pistas.length ? (
          <Button type="button" variant="ghost" onClick={() => setPistasVistas((vistas) => vistas + 1)}>
            Ver pista
          </Button>
        ) : null}
      </div>
      {pistasVistas > 0 ? (
        <ol className="grid list-decimal gap-1 pl-5 text-sm text-muted-foreground">
          {pistas.slice(0, pistasVistas).map((pista) => (
            <li key={pista}>{pista}</li>
          ))}
        </ol>
      ) : null}
      {resultado ? (
        <p
          role="status"
          className={
            resultado.aprobada
              ? "rounded-md border border-primary/40 bg-primary/10 p-3 text-sm font-bold"
              : "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-bold text-destructive"
          }
        >
          {resultado.aprobada ? "¡Tarea aprobada!" : (resultado.diagnostico ?? "Todavía no. Revisa tu respuesta.")}
        </p>
      ) : null}
    </section>
  );
}
```

`src/components/mision/tabla-resultado.tsx`:
```tsx
import type { Fila } from "@syntaxerror/engines/tipos";

function formatear(valor: unknown): string {
  return valor === null || valor === undefined ? "NULL" : String(valor);
}

export function TablaResultado({ filas }: { filas: Fila[] }) {
  if (filas.length === 0) return <p className="text-sm text-muted-foreground">La consulta no devolvió filas.</p>;
  const columnas = Object.keys(filas[0]);
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left font-mono text-sm">
        <thead className="bg-surface-raised">
          <tr>
            {columnas.map((columna) => (
              <th key={columna} className="px-3 py-2 font-bold">
                {columna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, indice) => (
            <tr key={indice} className="border-t border-border">
              {columnas.map((columna) => (
                <td key={columna} className="px-3 py-2">
                  {formatear(fila[columna])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

`src/components/mision/editor-codigo.tsx`:
```tsx
"use client";

export function EditorCodigo({
  etiqueta,
  valor,
  onCambio,
  filas = 6,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  filas?: number;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {etiqueta}
      <textarea
        value={valor}
        onChange={(evento) => onCambio(evento.target.value)}
        rows={filas}
        spellCheck={false}
        className="w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-sm font-normal leading-6 text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}
```

- [x] **Step 7: Crear `SqlTask` y `SqlEjemplo`**

`src/components/mision/sql-task.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { compararSql, crearBaseSql, ejecutarSql, type ModoComparacion, type Tablas } from "@syntaxerror/engines/sql";
import type { Fila, ResultadoTarea } from "@syntaxerror/engines/tipos";
import { EditorCodigo } from "./editor-codigo";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";
import { TablaResultado } from "./tabla-resultado";

export type SqlTaskProps = {
  id: string;
  enunciado?: string;
  inicial: string;
  comparar: ModoComparacion;
  verificar?: string;
  esperadas: Fila[];
  pistas: string[];
  tablas: Tablas;
};

function TablasDelCaso({ tablas }: { tablas: Tablas }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer font-bold text-muted-foreground">Tablas disponibles</summary>
      <ul className="mt-2 grid gap-1 font-mono">
        {Object.entries(tablas).map(([nombre, filas]) => (
          <li key={nombre}>
            <strong>{nombre}</strong>: {Object.keys(filas[0] ?? {}).join(", ")}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function SqlTask({ id, enunciado, inicial, comparar, verificar, esperadas, pistas, tablas }: SqlTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const [consulta, setConsulta] = useState(inicial);
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);

  function ejecutar() {
    try {
      setFilas(ejecutarSql(crearBaseSql(tablas), consulta, { permitirEscritura: comparar === "estado-tabla" }));
      setError(null);
    } catch (causa) {
      setFilas(null);
      setError(causa instanceof Error ? causa.message : String(causa));
    }
  }

  function validar() {
    const revision = compararSql(tablas, { comparar, verificar, esperadas }, consulta);
    setResultado(revision);
    registrarResultado(id, revision.aprobada);
  }

  return (
    <PanelTarea
      titulo="tarea SQL"
      enunciado={enunciado}
      aprobada={tareaAprobada(id)}
      resultado={resultado}
      pistas={pistas}
      acciones={
        <>
          <Button type="button" variant="secondary" onClick={ejecutar}>
            Ejecutar
          </Button>
          <Button type="button" onClick={validar}>
            Validar
          </Button>
        </>
      }
    >
      <TablasDelCaso tablas={tablas} />
      <EditorCodigo etiqueta="Consulta SQL" valor={consulta} onCambio={setConsulta} />
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 font-mono text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {filas ? <TablaResultado filas={filas} /> : null}
    </PanelTarea>
  );
}
```

`src/components/mision/sql-ejemplo.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { crearBaseSql, ejecutarSql, type Tablas } from "@syntaxerror/engines/sql";
import type { Fila } from "@syntaxerror/engines/tipos";
import { TablaResultado } from "./tabla-resultado";

export function SqlEjemplo({ consulta, tablas }: { consulta: string; tablas: Tablas }) {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function probar() {
    try {
      setFilas(ejecutarSql(crearBaseSql(tablas), consulta));
      setError(null);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : String(causa));
    }
  }

  return (
    <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
      <pre className="overflow-x-auto font-mono text-sm">{consulta}</pre>
      <div>
        <Button type="button" size="sm" variant="secondary" onClick={probar}>
          Probar ejemplo
        </Button>
      </div>
      {error ? <p className="font-mono text-sm text-destructive">{error}</p> : null}
      {filas ? <TablaResultado filas={filas} /> : null}
    </div>
  );
}
```

- [x] **Step 8: Crear `SheetTask`**

`src/components/mision/sheet-task.tsx`:
```tsx
"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { cn } from "@syntaxerror/ui/cn";
import { Button } from "@syntaxerror/ui/components/button";
import {
  columnaALetra,
  crearHoja,
  dimensiones,
  escribirCelda,
  formatearValor,
  leerDireccion,
  leerFormula,
  leerValor,
  revisarHoja,
  type CeldaEsperada,
  type Grilla,
} from "@syntaxerror/engines/sheet";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";

export type SheetTaskProps = {
  id: string;
  enunciado?: string;
  grilla: Grilla;
  celdas: CeldaEsperada[];
  pistas: string[];
};

const COLUMNAS_EXTRA = 2;
const FILAS_EXTRA = 1;

export function SheetTask({ id, enunciado, grilla, celdas, pistas }: SheetTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const [hoja, setHoja] = useState(() => crearHoja(grilla));
  const [version, setVersion] = useState(0);
  const [seleccionada, setSeleccionada] = useState(celdas[0]?.celda ?? "A1");
  const [entrada, setEntrada] = useState("");
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);

  const objetivos = useMemo(() => new Set(celdas.map((celda) => celda.celda)), [celdas]);
  const tamano = useMemo(() => {
    const { filas, columnas } = dimensiones(hoja);
    const posiciones = celdas.map((celda) => leerDireccion(celda.celda));
    return {
      filas: Math.max(filas, ...posiciones.map((posicion) => posicion.row + 1)) + FILAS_EXTRA,
      columnas: Math.max(columnas, ...posiciones.map((posicion) => posicion.col + 1)) + COLUMNAS_EXTRA,
    };
    // version cambia cuando se escribe una celda: HyperFormula se modifica en el lugar.
  }, [hoja, celdas, version]);

  function seleccionar(a1: string) {
    setSeleccionada(a1);
    setEntrada(leerFormula(hoja, a1) ?? formatearValor(leerValor(hoja, a1)));
  }

  function aplicar() {
    escribirCelda(hoja, seleccionada, entrada);
    setVersion((actual) => actual + 1);
  }

  function alPresionar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== "Enter") return;
    evento.preventDefault();
    aplicar();
  }

  function validar() {
    const revision = revisarHoja(hoja, { celdas });
    setResultado(revision);
    registrarResultado(id, revision.aprobada);
  }

  function reiniciar() {
    setHoja(crearHoja(grilla));
    setEntrada("");
    setResultado(null);
  }

  return (
    <PanelTarea
      titulo="tarea de planilla"
      enunciado={enunciado}
      aprobada={tareaAprobada(id)}
      resultado={resultado}
      pistas={pistas}
      acciones={
        <>
          <Button type="button" onClick={validar}>
            Validar
          </Button>
          <Button type="button" variant="secondary" onClick={reiniciar}>
            Reiniciar hoja
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <span className="rounded-md border border-border bg-surface-raised px-3 py-2 font-mono text-sm font-bold">
          {seleccionada}
        </span>
        <label className="grid flex-1 gap-1 text-sm font-bold">
          Fórmula
          <input
            value={entrada}
            onChange={(evento) => setEntrada(evento.target.value)}
            onKeyDown={alPresionar}
            spellCheck={false}
            placeholder="=SUMA(D2:D7)"
            className="field font-mono"
          />
        </label>
        <Button type="button" variant="secondary" onClick={aplicar}>
          Aplicar
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="border-collapse font-mono text-sm">
          <thead>
            <tr>
              <th className="w-10 bg-surface-raised" />
              {Array.from({ length: tamano.columnas }, (_, columna) => (
                <th key={columna} className="min-w-24 border-l border-border bg-surface-raised px-2 py-1">
                  {columnaALetra(columna)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: tamano.filas }, (_, fila) => (
              <tr key={fila}>
                <th className="bg-surface-raised px-2 py-1 text-muted-foreground">{fila + 1}</th>
                {Array.from({ length: tamano.columnas }, (_, columna) => {
                  const a1 = `${columnaALetra(columna)}${fila + 1}`;
                  return (
                    <td key={a1} className="border-l border-t border-border p-0">
                      <button
                        type="button"
                        aria-label={`Celda ${a1}`}
                        onClick={() => seleccionar(a1)}
                        className={cn(
                          "block h-8 w-full min-w-24 truncate px-2 text-left",
                          objetivos.has(a1) && "bg-primary/10",
                          seleccionada === a1 && "outline outline-2 -outline-offset-2 outline-primary"
                        )}
                      >
                        {formatearValor(leerValor(hoja, a1))}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelTarea>
  );
}
```

- [x] **Step 9: Correr los tests de web y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS y `tsc` sin errores.

- [x] **Step 10: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): bloques de mision y tareas sql y de planilla

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Python en el navegador (Web Worker) y CSP por ruta

**Files:**
- Create: `apps/web/src/engines/python.worker.ts`
- Create: `apps/web/src/components/mision/python-contexto.tsx`, `python-task.tsx`, `python-ejemplo.tsx`
- Create: `apps/web/src/lib/csp.ts`
- Test: `apps/web/src/lib/csp.test.ts`
- Modify: `apps/web/src/components/mision/mision-provider.tsx` (prop `python`), `apps/web/next.config.ts` (CSP)

**Interfaces:**
- Consumes: `crearSesionPython`, `PYODIDE_CDN`, `OpcionesPython` (Task 3), `crearClientePython`, `MensajeWorker`, `RespuestaWorker`, `TrabajadorLike` (Task 3), `MisionProvider`, `PanelTarea`, `EditorCodigo` (Task 8).
- Produces:
  - `<MisionProvider caso mision tareas python={OpcionesPython | null}>`: con `python` monta un `PythonProvider` que carga Pyodide en un Web Worker la primera vez que se usa.
  - `usePython(): { estado: "inactivo" | "cargando" | "listo" | "error"; iniciar(): void; cliente(): ClientePython }`.
  - `PythonTask` (etiqueta `Código Python`, estado `Python listo`, botón `Reintentar` si Pyodide no carga) y `PythonEjemplo` (botón `Probar ejemplo`).
  - `construirCsp({ motores: boolean; socket: string }): string`. En producción, `/casos/:caso/:mision` recibe la CSP con motores (`'unsafe-eval'` para alasql, `'wasm-unsafe-eval'` y jsDelivr para Pyodide). El resto del sitio mantiene la CSP estricta. `/_next/*` no lleva CSP, para que el worker (que se sirve desde ahí) pueda importar Pyodide.

- [x] **Step 1: Escribir el test que falla, `src/lib/csp.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { construirCsp } from "./csp";

function directiva(csp: string, nombre: string): string {
  return csp.split("; ").find((parte) => parte.startsWith(`${nombre} `)) ?? "";
}

describe("construirCsp", () => {
  it("sin motores no permite eval ni el CDN", () => {
    const csp = construirCsp({ motores: false, socket: "" });
    expect(directiva(csp, "script-src")).toBe("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("cdn.jsdelivr.net");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("con motores permite alasql, WebAssembly y Pyodide desde jsDelivr", () => {
    const csp = construirCsp({ motores: true, socket: "" });
    expect(directiva(csp, "script-src")).toBe(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net"
    );
    expect(directiva(csp, "connect-src")).toBe("connect-src 'self' https://cdn.jsdelivr.net");
    expect(directiva(csp, "worker-src")).toBe("worker-src 'self' blob:");
  });

  it("agrega el socket del worker en http y ws", () => {
    const csp = construirCsp({ motores: false, socket: "http://localhost:4001" });
    expect(directiva(csp, "connect-src")).toBe("connect-src 'self' http://localhost:4001 ws://localhost:4001");
  });
});
```

- [x] **Step 2: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/csp.test.ts`
Expected: FAIL, porque no se puede resolver `./csp`.

- [x] **Step 3: Crear `src/lib/csp.ts` y usarlo en `next.config.ts`**

`src/lib/csp.ts`:
```ts
const CDN_PYODIDE = "https://cdn.jsdelivr.net";

// alasql compila las consultas con new Function ('unsafe-eval') y Pyodide necesita
// compilar WebAssembly ('wasm-unsafe-eval') y descargar sus archivos desde jsDelivr.
export function construirCsp({ motores, socket }: { motores: boolean; socket: string }): string {
  const script = ["'self'", "'unsafe-inline'"];
  const connect = ["'self'"];
  if (socket) connect.push(socket, socket.replace(/^http/, "ws"));
  if (motores) {
    script.push("'unsafe-eval'", "'wasm-unsafe-eval'", CDN_PYODIDE);
    connect.push(CDN_PYODIDE);
  }
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    `connect-src ${connect.join(" ")}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
  ].join("; ");
}
```

Reemplazar `apps/web/next.config.ts` por:
```ts
import type { NextConfig } from "next";
import { construirCsp } from "./src/lib/csp";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  transpilePackages: ["@syntaxerror/db", "@syntaxerror/ui", "@syntaxerror/engines"],
  async headers() {
    const reglas = [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
    if (process.env.NODE_ENV === "production") {
      const socket = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ?? "";
      reglas.push(
        {
          // Todo menos las misiones y /_next/*: el worker de Python se sirve desde /_next y
          // tomaría esta CSP como propia, lo que le impediría cargar Pyodide.
          source: "/((?!_next/|casos/[^/]+/[^/]+).*)",
          headers: [{ key: "Content-Security-Policy", value: construirCsp({ motores: false, socket }) }],
        },
        {
          source: "/casos/:caso/:mision",
          headers: [{ key: "Content-Security-Policy", value: construirCsp({ motores: true, socket }) }],
        }
      );
    }
    return reglas;
  },
};

export default nextConfig;
```

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/csp.test.ts`
Expected: PASS (3 tests).

- [x] **Step 4: Crear el worker de Python**

`src/engines/python.worker.ts`:
```ts
import { crearSesionPython, PYODIDE_CDN, type PyodideLike, type SesionPython } from "@syntaxerror/engines/python";
import type { MensajeWorker, RespuestaWorker } from "@syntaxerror/engines/python-cliente";

type AmbitoWorker = {
  onmessage: ((evento: MessageEvent<MensajeWorker>) => void) | null;
  postMessage(respuesta: RespuestaWorker): void;
};

const ambito = self as unknown as AmbitoWorker;
let sesion: SesionPython | null = null;

async function cargarPyodide(): Promise<PyodideLike> {
  // Pyodide se carga desde el CDN: no pasa por el bundle ni por el servidor de la app.
  const modulo = (await import(/* webpackIgnore: true */ `${PYODIDE_CDN}pyodide.mjs`)) as {
    loadPyodide: (opciones: { indexURL: string }) => Promise<PyodideLike>;
  };
  return modulo.loadPyodide({ indexURL: PYODIDE_CDN });
}

async function atender(mensaje: MensajeWorker): Promise<unknown> {
  if (mensaje.tipo === "iniciar") {
    sesion = await crearSesionPython(await cargarPyodide(), mensaje.opciones);
    return null;
  }
  if (!sesion) throw new Error("Python no está iniciado.");
  if (mensaje.tipo === "ejecutar") return sesion.ejecutar(mensaje.preparacion, mensaje.codigo);
  return sesion.revisar({ preparacion: mensaje.preparacion, pruebas: mensaje.pruebas }, mensaje.codigo);
}

ambito.onmessage = (evento) => {
  const mensaje = evento.data;
  atender(mensaje).then(
    (resultado) => ambito.postMessage({ id: mensaje.id, ok: true, resultado }),
    (error: unknown) =>
      ambito.postMessage({ id: mensaje.id, ok: false, error: error instanceof Error ? error.message : String(error) })
  );
};
```

- [x] **Step 5: Crear `python-contexto.tsx`, `python-task.tsx` y `python-ejemplo.tsx`**

`src/components/mision/python-contexto.tsx`:
```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import type { OpcionesPython } from "@syntaxerror/engines/python";
import { crearClientePython, type ClientePython, type TrabajadorLike } from "@syntaxerror/engines/python-cliente";

type FaseCarga = "inactivo" | "cargando" | "listo" | "error";
type ContextoPython = { estado: FaseCarga; iniciar: () => void; cliente: () => ClientePython };

const Contexto = createContext<ContextoPython | null>(null);

function crearTrabajador(): TrabajadorLike {
  return new Worker(new URL("../../engines/python.worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as TrabajadorLike;
}

export function PythonProvider({ opciones, children }: { opciones: OpcionesPython; children: ReactNode }) {
  const clienteRef = useRef<ClientePython | null>(null);
  const [estado, setEstado] = useState<FaseCarga>("inactivo");

  const cliente = useCallback(() => {
    clienteRef.current ??= crearClientePython(opciones, { crearTrabajador });
    return clienteRef.current;
  }, [opciones]);

  const iniciar = useCallback(() => {
    setEstado("cargando");
    cliente()
      .iniciar()
      .then(
        () => setEstado("listo"),
        () => setEstado("error")
      );
  }, [cliente]);

  useEffect(() => () => clienteRef.current?.destruir(), []);

  const valor = useMemo(() => ({ estado, iniciar, cliente }), [estado, iniciar, cliente]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePython(): ContextoPython {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("usePython debe usarse dentro de PythonProvider");
  const { estado, iniciar } = contexto;
  useEffect(() => {
    if (estado === "inactivo") iniciar();
  }, [estado, iniciar]);
  return contexto;
}

export function EstadoPython({ estado, onReintentar }: { estado: FaseCarga; onReintentar: () => void }) {
  if (estado === "listo") return <p className="text-sm font-bold text-primary">Python listo</p>;
  if (estado === "error") {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
        <span>No pudimos cargar Python. Revisa tu conexión; lo que escribiste se mantiene.</span>
        <Button type="button" size="sm" variant="secondary" onClick={onReintentar}>
          Reintentar
        </Button>
      </div>
    );
  }
  return <p className="text-sm text-muted-foreground">Cargando Python… la primera vez puede tardar unos segundos.</p>;
}
```

`src/components/mision/python-task.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { EditorCodigo } from "./editor-codigo";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";
import { EstadoPython, usePython } from "./python-contexto";

export type PythonTaskProps = {
  id: string;
  enunciado?: string;
  inicial: string;
  preparacion: string;
  pruebas: string;
  pistas: string[];
};

const FALLO = "Algo falló al ejecutar Python. Intenta de nuevo.";

export function PythonTask({ id, enunciado, inicial, preparacion, pruebas, pistas }: PythonTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const python = usePython();
  const [codigo, setCodigo] = useState(inicial);
  const [salida, setSalida] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  const [corriendo, setCorriendo] = useState(false);

  async function correr(accion: () => Promise<void>) {
    setCorriendo(true);
    try {
      await accion();
    } catch {
      setSalida(FALLO);
    } finally {
      setCorriendo(false);
    }
  }

  const ejecutar = () =>
    correr(async () => {
      const ejecucion = await python.cliente().ejecutar(preparacion, codigo);
      setSalida(ejecucion.ok ? ejecucion.salida : [ejecucion.salida, ejecucion.error].filter(Boolean).join("\n"));
    });

  const validar = () =>
    correr(async () => {
      const revision = await python.cliente().revisar({ preparacion, pruebas }, codigo);
      setResultado(revision);
      setSalida(revision.salida || null);
      registrarResultado(id, revision.aprobada);
    });

  const disponible = python.estado === "listo" && !corriendo;

  return (
    <PanelTarea
      titulo="tarea Python"
      enunciado={enunciado}
      aprobada={tareaAprobada(id)}
      resultado={resultado}
      pistas={pistas}
      acciones={
        <>
          <Button type="button" variant="secondary" disabled={!disponible} onClick={() => void ejecutar()}>
            Ejecutar
          </Button>
          <Button type="button" disabled={!disponible} onClick={() => void validar()}>
            {corriendo ? "Ejecutando…" : "Validar"}
          </Button>
        </>
      }
    >
      <EstadoPython estado={python.estado} onReintentar={python.iniciar} />
      <EditorCodigo etiqueta="Código Python" valor={codigo} onCambio={setCodigo} filas={8} />
      {salida ? (
        <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-sm">{salida}</pre>
      ) : null}
    </PanelTarea>
  );
}
```

`src/components/mision/python-ejemplo.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { usePython } from "./python-contexto";

export function PythonEjemplo({ codigo }: { codigo: string }) {
  const python = usePython();
  const [salida, setSalida] = useState<string | null>(null);
  const [corriendo, setCorriendo] = useState(false);

  async function probar() {
    setCorriendo(true);
    try {
      const ejecucion = await python.cliente().ejecutar("", codigo);
      setSalida(ejecucion.ok ? ejecucion.salida || "(sin salida)" : ejecucion.error);
    } catch {
      setSalida("Algo falló al ejecutar Python. Intenta de nuevo.");
    } finally {
      setCorriendo(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-md border border-border bg-surface p-4">
      <pre className="overflow-x-auto font-mono text-sm">{codigo}</pre>
      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={python.estado !== "listo" || corriendo}
          onClick={() => void probar()}
        >
          Probar ejemplo
        </Button>
      </div>
      {salida ? (
        <pre className="overflow-x-auto rounded-md border border-border bg-background p-3 font-mono text-sm">{salida}</pre>
      ) : null}
    </div>
  );
}
```

- [x] **Step 6: Montar Python desde `MisionProvider`**

En `src/components/mision/mision-provider.tsx`:

1. Agregar los imports:
```tsx
import type { OpcionesPython } from "@syntaxerror/engines/python";
import { PythonProvider } from "./python-contexto";
```

2. Cambiar la firma para recibir `python`:
```tsx
export function MisionProvider({
  caso,
  mision,
  tareas,
  python,
  children,
}: {
  caso: string;
  mision: string;
  tareas: string[];
  python: OpcionesPython | null;
  children: ReactNode;
}) {
```

3. Cambiar el `return` por:
```tsx
  return (
    <Contexto.Provider value={valor}>
      {python ? <PythonProvider opciones={python}>{children}</PythonProvider> : children}
    </Contexto.Provider>
  );
```

- [x] **Step 7: Correr los tests de web y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS y `tsc` sin errores.

- [x] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): python en un web worker y csp con excepciones solo en misiones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Páginas de rutas, casos y misiones (estáticas)

**Files:**
- Create: `apps/web/src/lib/contenido.ts`
- Create: `apps/web/src/components/misiones-header.tsx`, `apps/web/src/components/mision/componentes.tsx`, `apps/web/src/components/mision/panel-caso.tsx`
- Create: `apps/web/src/app/(misiones)/layout.tsx`, `(misiones)/rutas/page.tsx`, `(misiones)/rutas/[ruta]/page.tsx`, `(misiones)/casos/[caso]/page.tsx`, `(misiones)/casos/[caso]/[mision]/page.tsx`
- Modify: `apps/web/package.json` (dependencias `@syntaxerror/content`, `@types/mdx`; script `build`), `apps/web/next.config.ts` (`transpilePackages`), `apps/web/src/app/(marketing)/page.tsx` (enlace a rutas), `docker-compose.yml` (`CONTENT_INCLUDE_DRAFTS` en `web`)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces:
  - `@/lib/contenido`: `obtenerContenido()`, `rutasParaPublicar()`, `casosParaPublicar()`, `obtenerRuta(slug)`, `obtenerCaso(slug)`, `casosDeRuta(ruta)`. En producción el contenido se lee una vez; en desarrollo se relee en cada request para ver los cambios al escribir un caso.
  - `componentesMision(caso: Caso): MDXComponents`: valida las props de cada bloque con su schema, calcula las filas esperadas de SQL en el build y quita la `solucion` de todas las tareas.
  - Páginas `/rutas`, `/rutas/[ruta]`, `/casos/[caso]` y `/casos/[caso]/[mision]`, todas con `dynamic = "error"` (el build falla si alguna se vuelve dinámica) y `dynamicParams = false`.
  - En `/casos/[caso]`: `data-testid="estado-<mision>"` con `Aprobada`, `En curso` o `Pendiente`; campo `Enlace a tu entregable`, botón `Guardar entregable` y estado `Caso completo`.

- [x] **Step 1: Dependencias, build y variables**

Run: `docker compose run --rm tools pnpm --filter web add "@syntaxerror/content@workspace:*" && docker compose run --rm tools pnpm --filter web add -D "@types/mdx@^2.0.13"`

En `apps/web/package.json`, cambiar el script `build` por:
```json
"build": "pnpm --filter @syntaxerror/content validate && next build"
```

En `apps/web/next.config.ts`, cambiar `transpilePackages` por:
```ts
  transpilePackages: ["@syntaxerror/db", "@syntaxerror/ui", "@syntaxerror/engines", "@syntaxerror/content"],
```

En `docker-compose.yml`, agregar al `environment` de `web`:
```yaml
      CONTENT_INCLUDE_DRAFTS: "true"
```

- [x] **Step 2: Crear `src/lib/contenido.ts`**

```ts
import path from "node:path";
import { cargarContenido } from "@syntaxerror/content/cargar";
import { casosVisibles, rutasVisibles } from "@syntaxerror/content/publicacion";
import type { Caso, Contenido, Ruta } from "@syntaxerror/content/tipos";

let enCache: Promise<Contenido> | null = null;

function directorio(): string {
  return process.env.CONTENT_DIR ?? path.resolve(process.cwd(), "../../content");
}

function incluirBorradores(): boolean {
  return process.env.CONTENT_INCLUDE_DRAFTS === "true";
}

export function obtenerContenido(): Promise<Contenido> {
  if (process.env.NODE_ENV !== "production") return cargarContenido(directorio());
  enCache ??= cargarContenido(directorio());
  return enCache;
}

export async function rutasParaPublicar(): Promise<Ruta[]> {
  return rutasVisibles(await obtenerContenido(), incluirBorradores());
}

export async function casosParaPublicar(): Promise<Caso[]> {
  return casosVisibles(await obtenerContenido(), incluirBorradores());
}

export async function obtenerRuta(slug: string): Promise<Ruta | null> {
  return (await rutasParaPublicar()).find((ruta) => ruta.slug === slug) ?? null;
}

export async function obtenerCaso(slug: string): Promise<Caso | null> {
  return (await casosParaPublicar()).find((caso) => caso.slug === slug) ?? null;
}

export async function casosDeRuta(ruta: Ruta): Promise<Caso[]> {
  const casos = await casosParaPublicar();
  return ruta.casos.flatMap((slug) => casos.filter((caso) => caso.slug === slug));
}
```

- [x] **Step 3: Crear el layout de misiones y su encabezado**

El encabezado no llama a `auth()`: estas páginas son estáticas.

`src/components/misiones-header.tsx`:
```tsx
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function MisionesHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-auto flex items-center gap-2 font-black text-foreground">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary font-mono text-sm text-primary-foreground">
            {"{}"}
          </span>
          <span className="hidden sm:inline">syntaxError.cl</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Principal">
          <Link className="nav-link" href="/rutas">
            Rutas
          </Link>
          <Link className="nav-link" href="/dashboard">
            Tu panel
          </Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
```

`src/app/(misiones)/layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { MisionesHeader } from "@/components/misiones-header";
import { SincronizarProgreso } from "@/components/sincronizar-progreso";
import { SiteFooter } from "@/components/site-footer";

export default function MisionesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MisionesHeader />
      <SincronizarProgreso />
      {children}
      <SiteFooter />
    </>
  );
}
```

- [x] **Step 4: Crear las páginas de rutas**

`src/app/(misiones)/rutas/page.tsx`:
```tsx
import Link from "next/link";
import { rutasParaPublicar } from "@/lib/contenido";

export const dynamic = "error";
export const metadata = { title: "Rutas" };

export default async function RutasPage() {
  const rutas = await rutasParaPublicar();
  return (
    <main className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-bold text-primary">{"> ls rutas/"}</p>
      <h1 className="text-3xl font-black">Rutas</h1>
      {rutas.length === 0 ? (
        <p className="text-muted-foreground">Estamos terminando la primera ruta. Vuelve pronto.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {rutas.map((ruta) => (
            <li key={ruta.slug}>
              <Link href={`/rutas/${ruta.slug}`} className="card grid gap-2 p-5 hover:border-primary">
                <span className="font-mono text-xs text-muted-foreground">{ruta.cargo}</span>
                <span className="text-xl font-black">{ruta.titulo}</span>
                <span className="text-sm leading-6 text-muted-foreground">{ruta.descripcion}</span>
                {ruta.estado === "borrador" ? <span className="badge w-fit">Borrador</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

`src/app/(misiones)/rutas/[ruta]/page.tsx`:
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
        {casos.map((caso, indice) => (
          <li key={caso.slug}>
            <Link href={`/casos/${caso.slug}`} className="card grid gap-1 p-5 hover:border-primary">
              <span className="font-mono text-xs text-muted-foreground">{`Caso ${indice + 1} · ${caso.empresa}`}</span>
              <span className="text-lg font-black">{caso.titulo}</span>
              <span className="text-sm text-muted-foreground">{`${caso.misiones.length} misiones`}</span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
```

- [x] **Step 5: Crear la página del caso y su panel de progreso y entregable**

`src/components/mision/panel-caso.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { cargarProgreso, dependenciasNavegador, type ProgresoVisible } from "@/lib/progreso/cliente";

type MisionDelCaso = { slug: string; titulo: string; tiempo: number; tareas: string[] };

function etiquetaEstado(estado: "en_curso" | "aprobada" | undefined): string {
  if (estado === "aprobada") return "Aprobada";
  if (estado === "en_curso") return "En curso";
  return "Pendiente";
}

export function PanelCaso({
  caso,
  misiones,
  entregable,
}: {
  caso: string;
  misiones: MisionDelCaso[];
  entregable: string;
}) {
  const [progreso, setProgreso] = useState<ProgresoVisible | null>(null);
  const [url, setUrl] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const tareasPorMision = useMemo(
    () => Object.fromEntries(misiones.map((mision) => [mision.slug, mision.tareas])),
    [misiones]
  );

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

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      const respuesta = await fetch("/api/entregables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caso, url }),
      });
      if (respuesta.status === 400) {
        setMensaje("El enlace debe ser una URL completa que empiece con https://");
        return;
      }
      if (!respuesta.ok) {
        setMensaje("No pudimos guardar el entregable. Intenta de nuevo.");
        return;
      }
      const { casoCompleto } = (await respuesta.json()) as { casoCompleto: boolean };
      setProgreso((actual) => (actual ? { ...actual, entregable: url, completo: casoCompleto } : actual));
      setMensaje(casoCompleto ? "Entregable guardado. ¡Terminaste el caso!" : "Entregable guardado. Te faltan misiones por aprobar.");
    } catch {
      setMensaje("No pudimos guardar el entregable. Revisa tu conexión.");
    } finally {
      setEnviando(false);
    }
  }

  const volverAqui = `/login?callbackUrl=${encodeURIComponent(`/casos/${caso}`)}`;

  return (
    <div className="grid gap-8">
      <ol className="grid gap-3">
        {misiones.map((mision, indice) => (
          <li key={mision.slug}>
            <Link
              href={`/casos/${caso}/${mision.slug}`}
              className="card flex items-center justify-between gap-4 p-4 hover:border-primary"
            >
              <span>
                <span className="block font-mono text-xs text-muted-foreground">{`Misión ${indice + 1} · ${mision.tiempo} min`}</span>
                <span className="block font-bold">{mision.titulo}</span>
              </span>
              <span data-testid={`estado-${mision.slug}`} className="badge">
                {etiquetaEstado(progreso?.misiones[mision.slug]?.estado)}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-black">Tu entregable</h2>
        <p className="leading-7 text-muted-foreground">{entregable}</p>
        {progreso?.completo ? (
          <p role="status" className="font-bold text-primary">
            Caso completo
          </p>
        ) : null}
        {progreso && !progreso.sesion ? (
          <p className="text-sm">
            Para enlazar tu entregable necesitas una cuenta.{" "}
            <Link className="font-bold text-primary hover:underline" href={volverAqui}>
              Entrar
            </Link>
          </p>
        ) : (
          <form className="grid gap-3" onSubmit={guardar}>
            <Label>
              Enlace a tu entregable
              <Input
                name="url"
                type="url"
                required
                placeholder="https://github.com/tu-usuario/tu-repo"
                value={url}
                onChange={(evento) => setUrl(evento.target.value)}
              />
            </Label>
            <div>
              <Button type="submit" disabled={enviando}>
                {enviando ? "Guardando..." : "Guardar entregable"}
              </Button>
            </div>
            {mensaje ? (
              <p role="status" className="text-sm font-bold">
                {mensaje}
              </p>
            ) : null}
          </form>
        )}
      </section>
    </div>
  );
}
```

`src/app/(misiones)/casos/[caso]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { tareasDeMision } from "@syntaxerror/content/publicacion";
import { PanelCaso } from "@/components/mision/panel-caso";
import { casosParaPublicar, obtenerCaso } from "@/lib/contenido";

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

  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-3">
        <p className="font-mono text-sm font-bold text-primary">{`> caso: ${caso.empresa}`}</p>
        <h1 className="text-3xl font-black">{caso.titulo}</h1>
        <p className="leading-7 text-muted-foreground">
          {`Llegas como ${caso.cargo.toLowerCase()} a ${caso.empresa}. Datos del caso: ${caso.dataset}.`}
        </p>
      </header>
      <PanelCaso
        caso={caso.slug}
        entregable={caso.entregable}
        misiones={caso.misiones.map((mision) => ({
          slug: mision.slug,
          titulo: mision.titulo,
          tiempo: mision.tiempo,
          tareas: tareasDeMision(mision).map((tarea) => tarea.props.id),
        }))}
      />
    </main>
  );
}
```

- [x] **Step 6: Crear el mapa de componentes y la página de misión**

`src/components/mision/componentes.tsx` (módulo de servidor: corre en el build):
```tsx
import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import { grillaDeHoja, tablasSql } from "@syntaxerror/content/datos";
import { bloqueSchemas } from "@syntaxerror/content/esquemas";
import type { Caso } from "@syntaxerror/content/tipos";
import { calcularEsperado } from "@syntaxerror/engines/sql";
import { Brief, Concepto } from "./bloques";
import { Debrief } from "./debrief";
import { Decision } from "./decision";
import { PythonEjemplo } from "./python-ejemplo";
import { PythonTask } from "./python-task";
import { SheetTask } from "./sheet-task";
import { SqlEjemplo } from "./sql-ejemplo";
import { SqlTask } from "./sql-task";

type PropsMdx = Record<string, unknown> & { children?: ReactNode };

// Las props se validan de nuevo con su schema (aplica los valores por defecto) y
// ninguna solución llega al navegador: SQL recibe las filas esperadas ya calculadas.
export function componentesMision(caso: Caso): MDXComponents {
  const tablas = tablasSql(caso);
  return {
    Brief: ({ children, ...props }: PropsMdx) => <Brief {...bloqueSchemas.Brief.parse(props)}>{children}</Brief>,
    Concepto: ({ children }: PropsMdx) => <Concepto>{children}</Concepto>,
    SqlEjemplo: (props: PropsMdx) => <SqlEjemplo {...bloqueSchemas.SqlEjemplo.parse(props)} tablas={tablas} />,
    PythonEjemplo: (props: PropsMdx) => <PythonEjemplo {...bloqueSchemas.PythonEjemplo.parse(props)} />,
    SqlTask: (props: PropsMdx) => {
      const { solucion, ...tarea } = bloqueSchemas.SqlTask.parse(props);
      const esperadas = calcularEsperado(tablas, { solucion, comparar: tarea.comparar, verificar: tarea.verificar });
      return <SqlTask {...tarea} esperadas={esperadas} tablas={tablas} />;
    },
    SheetTask: (props: PropsMdx) => {
      const { solucion: _solucion, ...tarea } = bloqueSchemas.SheetTask.parse(props);
      return <SheetTask {...tarea} grilla={grillaDeHoja(caso, tarea.hoja)} />;
    },
    PythonTask: (props: PropsMdx) => {
      const { solucion: _solucion, paquetes: _paquetes, ...tarea } = bloqueSchemas.PythonTask.parse(props);
      return <PythonTask {...tarea} />;
    },
    Decision: (props: PropsMdx) => <Decision {...bloqueSchemas.Decision.parse(props)} />,
    Debrief: ({ children, ...props }: PropsMdx) => (
      <Debrief {...bloqueSchemas.Debrief.parse(props)}>{children}</Debrief>
    ),
  };
}
```

`src/app/(misiones)/casos/[caso]/[mision]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { compilarMision } from "@syntaxerror/content/bloques";
import { archivosPython, paquetesPython } from "@syntaxerror/content/datos";
import { tareasDeMision } from "@syntaxerror/content/publicacion";
import { componentesMision } from "@/components/mision/componentes";
import { MisionProvider } from "@/components/mision/mision-provider";
import { casosParaPublicar, obtenerCaso } from "@/lib/contenido";

export const dynamic = "error";
export const dynamicParams = false;

type Parametros = { params: Promise<{ caso: string; mision: string }> };

export async function generateStaticParams() {
  return (await casosParaPublicar()).flatMap((caso) =>
    caso.misiones.map((mision) => ({ caso: caso.slug, mision: mision.slug }))
  );
}

async function buscar(params: Parametros["params"]) {
  const { caso: slugCaso, mision: slugMision } = await params;
  const caso = await obtenerCaso(slugCaso);
  const indice = caso ? caso.misiones.findIndex((mision) => mision.slug === slugMision) : -1;
  return caso && indice >= 0 ? { caso, indice, mision: caso.misiones[indice] } : null;
}

export async function generateMetadata({ params }: Parametros) {
  const encontrada = await buscar(params);
  return { title: encontrada ? `${encontrada.mision.titulo} · ${encontrada.caso.titulo}` : "Misión" };
}

export default async function MisionPage({ params }: Parametros) {
  const encontrada = await buscar(params);
  if (!encontrada) notFound();
  const { caso, indice, mision } = encontrada;

  const Contenido = await compilarMision(mision.fuente);
  const usaPython = mision.bloques.some((bloque) => bloque.tipo === "PythonTask" || bloque.tipo === "PythonEjemplo");
  const anterior = caso.misiones[indice - 1];
  const siguiente = caso.misiones[indice + 1];

  return (
    <main className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6">
      <nav className="text-sm">
        <Link className="font-bold text-primary hover:underline" href={`/casos/${caso.slug}`}>
          {`← ${caso.titulo}`}
        </Link>
      </nav>
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-primary">
          {`> misión ${indice + 1}/${caso.misiones.length} · ${mision.tiempo} min`}
        </p>
        <h1 className="text-3xl font-black">{mision.titulo}</h1>
      </header>
      <MisionProvider
        caso={caso.slug}
        mision={mision.slug}
        tareas={tareasDeMision(mision).map((tarea) => tarea.props.id)}
        python={usaPython ? { paquetes: paquetesPython(mision), archivos: archivosPython(caso) } : null}
      >
        <article className="grid gap-6">
          <Contenido components={componentesMision(caso)} />
        </article>
      </MisionProvider>
      <nav className="flex justify-between gap-4 text-sm font-bold">
        {anterior ? (
          <Link className="text-primary hover:underline" href={`/casos/${caso.slug}/${anterior.slug}`}>
            {`← ${anterior.titulo}`}
          </Link>
        ) : (
          <span />
        )}
        {siguiente ? (
          <Link className="text-primary hover:underline" href={`/casos/${caso.slug}/${siguiente.slug}`}>
            {`${siguiente.titulo} →`}
          </Link>
        ) : null}
      </nav>
    </main>
  );
}
```

- [x] **Step 7: Enlazar las rutas desde la portada**

En `src/app/(marketing)/page.tsx`, después del enlace `Ya tengo cuenta` y antes del `</div>` que los contiene, agregar:
```tsx
          <Link href="/rutas" className="btn btn-secondary">
            Ver rutas
          </Link>
```

- [x] **Step 8: Typecheck y verificación en el entorno de desarrollo**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS y `tsc` sin errores.

Run: `docker compose up -d --build && until curl -sf localhost:3000/api/health >/dev/null; do sleep 2; done && echo arriba`
Expected: `arriba`.

Run:
```bash
curl -s localhost:3000/rutas | grep -c "Data Analyst"
curl -s localhost:3000/casos/demo-motor | grep -c "Clientes de regiones"
curl -s localhost:3000/casos/demo-motor/01-clientes-de-regiones | grep -c "Consulta SQL"
curl -s localhost:3000/casos/demo-motor/02-total-de-ventas | grep -c "Fórmula"
curl -s localhost:3000/casos/demo-motor/03-ticket-promedio | grep -c "Código Python"
curl -s localhost:3000/casos/demo-motor/01-clientes-de-regiones | grep -c '\\"solucion\\"'
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/casos/no-existe
```
Expected: `1` o más en las cinco primeras, `0` en la sexta (la solución no llega al navegador) y `404` en la última.

Abrir `http://localhost:3000/casos/demo-motor/01-clientes-de-regiones` en el navegador, validar una consulta incorrecta (debe mostrar el diagnóstico), luego la correcta (debe mostrar `¡Tarea aprobada!` y el cierre `Misión aprobada`), elegir una opción de la decisión (deben aparecer las explicaciones) y recargar: el orden de las opciones cambia.

Run: `docker compose down`

- [x] **Step 9: Commit**

```bash
git add apps/web docker-compose.yml pnpm-lock.yaml
git commit -m "feat(web): paginas estaticas de rutas, casos y misiones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: E2E de misiones, verificación en build de producción y README

**Files:**
- Create: `e2e/tests/misiones.spec.ts`
- Create: `docker/compose.prod-check.yml`
- Modify: `docker-compose.yml` (healthcheck de `web`; `e2e` espera a que `web` esté sano), `package.json` raíz (script `test:e2e:prod`), `README.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces:
  - `npm run test:e2e` (contra el servidor de desarrollo) y `npm run test:e2e:prod` (compila `web` en modo producción, con la CSP real, y corre los mismos e2e).
  - README con la sección de contenido.

- [x] **Step 1: Healthcheck de `web` y espera en `e2e`**

En `docker-compose.yml`, agregar al servicio `web`:
```yaml
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:3000/api/health"]
      interval: 5s
      timeout: 5s
      retries: 120
```

Y en el servicio `e2e`, cambiar `depends_on` por:
```yaml
    depends_on:
      web: { condition: service_healthy }
```

- [x] **Step 2: Crear `docker/compose.prod-check.yml` y el script**

`docker/compose.prod-check.yml`:
```yaml
# Levanta web como en producción (next build + next start) para probar la CSP y las páginas estáticas.
services:
  web:
    command: sh -c "pnpm --filter web build && pnpm --filter web start -H 0.0.0.0 -p 3000"
    environment:
      CONTENT_INCLUDE_DRAFTS: "true"
```

En el `package.json` raíz, agregar a `scripts`:
```json
"test:e2e:prod": "docker compose -f docker-compose.yml -f docker/compose.prod-check.yml --profile e2e run --rm e2e"
```

- [x] **Step 3: Escribir `e2e/tests/misiones.spec.ts`**

```ts
import { expect, test, type Page } from "@playwright/test";

const CASO = "/casos/demo-motor";
const MISION_SQL = `${CASO}/01-clientes-de-regiones`;
const MISION_HOJA = `${CASO}/02-total-de-ventas`;
const MISION_PYTHON = `${CASO}/03-ticket-promedio`;
const CONSULTA_CORRECTA = "SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago';";

async function registrarse(page: Page, callbackUrl: string) {
  await page.goto(`/registro?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.locator('input[name="name"]').fill("Valentina Muñoz");
  await page.locator('input[name="email"]').fill(`misiones-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
}

// Espera a que el intento llegue al servidor antes de navegar, para no cortar el fetch.
async function validarYEsperar(page: Page) {
  const reportado = page.waitForResponse(
    (respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;
}

test("sin sesión: aprueba la misión SQL y el progreso se sube al crear la cuenta", async ({ page }) => {
  await page.goto(MISION_SQL);
  await page.getByLabel("Consulta SQL").fill("SELECT nombre, ciudad FROM clientes");
  await validarYEsperar(page);
  await expect(page.getByText("Tu consulta trae 6 filas, se esperan 4.")).toBeVisible();

  await page.getByLabel("Consulta SQL").fill(CONSULTA_CORRECTA);
  await validarYEsperar(page);
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Misión aprobada" })).toBeVisible();

  const sincronizado = page.waitForResponse(
    (respuesta) => respuesta.url().endsWith("/api/progreso/sync") && respuesta.ok()
  );
  await registrarse(page, CASO);
  await expect(page).toHaveURL(new RegExp(`${CASO}$`));
  await sincronizado;

  await page.reload();
  await expect(page.getByTestId("estado-01-clientes-de-regiones")).toHaveText("Aprobada");
  expect(await page.evaluate(() => localStorage.getItem("syntaxerror:progreso-pendiente"))).toBeNull();
});

test("con sesión: aprueba las tres misiones y completa el caso con su entregable", async ({ page }) => {
  test.setTimeout(240_000);
  await registrarse(page, "/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto(MISION_SQL);
  await page.getByLabel("Consulta SQL").fill(CONSULTA_CORRECTA);
  await validarYEsperar(page);
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  await page.goto(MISION_HOJA);
  await page.getByRole("button", { name: "Celda F2" }).click();
  await page.getByLabel("Fórmula").fill("=suma(d2;d7)");
  await page.getByLabel("Fórmula").press("Enter");
  await expect(page.getByRole("button", { name: "Celda F2" })).toHaveText("1049000");
  await validarYEsperar(page);
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  await page.goto(MISION_PYTHON);
  await expect(page.getByText("Python listo")).toBeVisible({ timeout: 150_000 });
  await page.getByLabel("Código Python").fill('ticket_promedio = round(ventas["monto"].mean())');
  await validarYEsperar(page);
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  await page.goto(CASO);
  for (const mision of ["01-clientes-de-regiones", "02-total-de-ventas", "03-ticket-promedio"]) {
    await expect(page.getByTestId(`estado-${mision}`)).toHaveText("Aprobada");
  }
  await page.getByLabel("Enlace a tu entregable").fill("https://github.com/valentina/demo-motor");
  await page.getByRole("button", { name: "Guardar entregable" }).click();
  await expect(page.getByText("Caso completo", { exact: true })).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("Completo", { exact: true })).toBeVisible();
});
```

- [x] **Step 4: Correr todo contra el entorno de desarrollo**

Run: `npm test`
Expected: PASS en todos los paquetes (`engines`, `content`, `db`, `ui`, `web`, `worker`).

Run: `docker compose up -d --build && npm run test:e2e`
Expected: `5 passed` (los 3 de `auth.spec.ts` y los 2 de `misiones.spec.ts`).

Run: `docker compose down`

- [x] **Step 5: Correr los e2e contra el build de producción y revisar la CSP**

Run: `npm run test:e2e:prod`
Expected: el `web` compila (el validador de contenido corre primero e imprime `[content] ok: 1 rutas, 1 casos, 3 misiones`), `next start` puede avisar que `output: standalone` recomienda `node server.js` (es solo un aviso) y los e2e terminan con `5 passed`. En particular, la misión de Python carga Pyodide con la CSP de producción.

Run:
```bash
curl -sI localhost:3000/ | grep -ci "content-security-policy"
curl -sI localhost:3000/ | grep -i "content-security-policy" | grep -c "unsafe-eval"
curl -sI localhost:3000/casos/demo-motor/03-ticket-promedio | grep -i "content-security-policy" | grep -c "'wasm-unsafe-eval' https://cdn.jsdelivr.net"
curl -sI "localhost:3000$(curl -s localhost:3000/ | grep -o '/_next/static/chunks/[^"]*\.js' | head -1)" | grep -ci "content-security-policy"
```
Expected: `1`, `0`, `1` y `0`: una sola CSP en la portada y sin `unsafe-eval`; la misión con las excepciones de los motores; los archivos de `/_next` sin CSP.

Run: `docker compose exec web ls apps/web/.next/server/app/casos/demo-motor/`
Expected: aparecen `01-clientes-de-regiones.html`, `02-total-de-ventas.html` y `03-ticket-promedio.html` (las misiones se generaron estáticas en el build).

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml down`

- [x] **Step 6: Documentar el contenido en `README.md`**

Agregar a la tabla de comandos:
```markdown
| `npm run content:validate` | Valida `content/`: schemas, al menos una tarea por misión, briefs de hasta 150 palabras, entregable declarado y que cada solución pase su propio motor |
| `npm run test:e2e:prod` | Compila `web` como en producción (CSP real, páginas estáticas) y corre los e2e contra ese build |
```

Y agregar al final:
~~~markdown
## Escribir un caso

Un caso es contenido, no código:

```
content/
  rutas/<ruta>.yaml              slug, titulo, cargo, descripcion, estado (publicada | borrador), casos
  casos/<caso>/
    caso.yaml                    slug, titulo, cargo, empresa, dataset, entregable, misiones (en orden)
    datos/<tabla>.csv            cada CSV es una tabla SQL, un archivo datos/<tabla>.csv en Python y una hoja para SheetTask
    misiones/<mision>.mdx        frontmatter (titulo, tiempo) y bloques
```

Bloques disponibles: `Brief`, `Concepto`, `SqlEjemplo`, `PythonEjemplo`, `SqlTask`, `SheetTask`, `PythonTask`, `Decision` y `Debrief`. El caso `content/casos/demo-motor` usa todos. Sus schemas están en `packages/content/src/esquemas.ts`.

- En desarrollo se ven también las rutas en `borrador` (`CONTENT_INCLUDE_DRAFTS=true`). En producción solo se publican las rutas `publicada` y sus casos.
- `db-setup` sincroniza rutas y casos con la base en cada `npm run dev`.
- El build de `web` corre `content:validate` primero y falla si algo no cumple.
- El validador ejecuta las soluciones de Python con Pyodide y descarga pandas desde jsDelivr la primera vez, así que necesita red.
~~~

- [x] **Step 7: Commit**

```bash
git add e2e docker docker-compose.yml package.json README.md
git commit -m "test(e2e): misiones de punta a punta y verificacion en build de produccion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
