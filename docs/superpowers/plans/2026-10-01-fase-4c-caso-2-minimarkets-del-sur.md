# Fase 4c: Caso 2, Minimarkets del Sur. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar el Caso 2 de la ruta Data Analyst, "Minimarkets del Sur": ocho misiones de SQL para responder preguntas de gerencia de una cadena de minimarkets entre Talca y Puerto Montt.
- `SELECT`, `WHERE` y `LIKE`, orden y límite.
- `GROUP BY` y `HAVING`, `JOIN` y fechas.
- Una misión final sin guía con cinco preguntas.

**Architecture:**
- **Datos generados con semilla fija** (`packages/content/src/generadores/minimarkets-del-sur.ts`): 8 locales, 36 productos y 650 ventas de enero a marzo de 2025.
- **Los datos están limpios:** el caso trata de preguntar bien, no de limpiar.
- **La historia que esconden:**
  - en marzo, Osorno Centro vende un tercio de lo normal porque estuvo en remodelación;
  - la Kombucha artesanal nunca se vendió.
- **Las tareas SQL no llevan valores escritos a mano:** el resultado esperado se calcula desde la solución, y el validador comprueba que cada solución pase.
- **Una mejora del motor SQL:** cuando un `ORDER BY` deja filas empatadas y solo cambia una columna, el diagnóstico sugiere desempatar, en vez de "revisa el cálculo".
- **Un helper e2e** (`e2e/tests/progreso.ts`) completa los casos anteriores. Cada caso de la ruta exige el anterior, y las pruebas de los casos siguientes lo van a necesitar.

**Tech Stack:** alasql 4.19.1, papaparse 5.7.0, Next.js 15, Vitest 4 y Playwright 1.55.

**Spec:** `docs/propuesta-pedagogica-data-analyst.md`:
- 4: misión y repaso intercalado;
- 5: misión sin guía;
- 7: orden;
- 8: Caso 2, SQL.

También los acuerdos del equipo del 2026-10-01: la empresa es "Minimarkets del Sur" y los datos son sintéticos, de un script reproducible.

## Global Constraints

**Entorno y texto**
- Todo se ejecuta con `docker compose run --rm tools ...`.
- `npm run test:e2e` corre contra el build de producción. Para una prueba suelta: `npm run test:e2e -- tests/minimarkets.spec.ts`.
- El texto visible va en español de Chile, tratando de tú, sin voseo y con lenguaje neutro.

**Lo que alasql permite (sondeado al planear)**
- **`LIKE` no distingue mayúsculas en alasql, pero sí en PostgreSQL:** el contenido enseña `LOWER(nombre) LIKE '%queso%'`, que funciona igual en ambos.
- **Fechas:**
  - funcionan `MONTH(fecha)`, `YEAR(fecha)` y `SUBSTRING(fecha, 1, 7)`, con fechas en texto ISO;
  - `LEFT()` no existe;
  - `DAYOFWEEK` numera distinto que MySQL; no se usa.
- **Nombres de columna:** ninguna columna de datos se llama `total`. alasql la reserva y `v.total` falla. El monto de una venta se llama `monto`.

**Pedagogía**
- **Desempate explícito:** toda tarea con `ORDER BY` + `LIMIT` donde los datos empatan en el corte pide el desempate en su enunciado ("si empatan, ordénalos por nombre").
- **Repaso intercalado:**
  - `GROUP BY` (misión 4) se usa en las 5, 6, 7 y 8;
  - `JOIN` (misión 6), en las 7 y 8;
  - los empates (misión 3), en las 6 y 8.
- **Misión 8:** es sin guía (sin concepto ni pistas) y sus cinco preguntas combinan todo el caso. La 1 y la 2 llevan a descubrir lo de Osorno.

**Páginas:** `/casos/[caso]` y `/casos/[caso]/[mision]` siguen estáticas, con `x-nextjs-cache: HIT`. Una misión SQL pesa unos 130 KB de HTML, 19 KB comprimido, con las 650 ventas incluidas.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Top 10 sin desempate** (`ORDER BY unidades DESC LIMIT 10`): cerca del corte hay productos con las mismas unidades. El diagnóstico sugiere agregar otra columna al `ORDER BY`, y con el desempate se aprueba. Tests en Task 1 (motor) y Task 4 (e2e).
2. **Alias equivocado en un `JOIN`** (`venta.local_id` con el alias `v`). El error explicado dice "«venta» no es una tabla ni un alias de esta consulta". Test e2e en Task 4.
3. **Una solución correcta del contenido que dispara avisos** (alias que se llaman como una tabla, `AS ventas`, o funciones como `MONTH`). Ninguna de las 29 consultas del caso (soluciones y ejemplos) produce avisos: un aviso falso enseña mal. Comprobado al planear; se revisa en la Task 3, Step 3.
4. **Alguien edita a mano un CSV o cambia la semilla.** La prueba "los CSV son los generados" falla, y "cuenta la historia del caso" falla si Osorno deja de ser el último en marzo. Tests en Task 2.
5. **Mezclar `AND` y `OR` sin paréntesis:** la decisión de la misión 2 lo enseña con un ejemplo que tiene que ser cierto en los datos, y lo es: la consulta sin paréntesis trae a Osorno Centro, de 170 m², con el filtro `metros2 > 180`. Comprobado al planear; la Task 3, Step 3 lo vuelve a revisar.

## Estructura de archivos

```
packages/engines/src/sql.ts                       describirDiferencia sugiere desempatar con ORDER BY
packages/content/src/generadores/minimarkets-del-sur.ts
packages/content/src/generar-cli.ts               registra el generador del caso
content/casos/minimarkets-del-sur/                caso.yaml, datos/ (generados) y 8 misiones
content/rutas/data-analyst.yaml                   agrega minimarkets-del-sur
e2e/tests/progreso.ts                             MISIONES, registrarse, aprobar, completarCaso
e2e/tests/minimarkets.spec.ts, e2e/tests/despachos.spec.ts (usa progreso.ts), e2e/calentar.ts
README.md
```

---

### Task 1: SQL: sugerir el desempate cuando el ORDER BY deja filas empatadas

**Files:**
- Modify: `packages/engines/src/sql.ts`
- Test: `packages/engines/src/sql.test.ts`

**Interfaces:**
- Consumes: `describirDiferencia` y `compararSql` (Fase 3e2).
- Produces: `describirDiferencia(esperadas, actuales, sinOrden, consulta)`. Si una sola columna difiere y la consulta de la persona tiene `ORDER BY`, el diagnóstico es: "La columna 'x' no coincide en algunas filas. Si hay valores empatados en tu ORDER BY, agrega otra columna para desempatar; si no, revisa el cálculo o el filtro.". Sin `ORDER BY`, el mensaje no cambia.

- [ ] **Step 1: Escribir la prueba**

En `packages/engines/src/sql.test.ts`, antes de `it("compara el estado de la tabla después de un UPDATE"`, agrega:
```ts
  it("si solo cambia una columna y hay ORDER BY, sugiere revisar los empates", () => {
    const empates: Tablas = {
      productos: [
        { nombre: "Té", unidades: 73 },
        { nombre: "Pan", unidades: 53 },
        { nombre: "Bebida", unidades: 53 },
        { nombre: "Arroz", unidades: 40 },
      ],
    };
    const tarea: SqlTarea = { solucion: "SELECT nombre, unidades FROM productos ORDER BY unidades DESC, nombre LIMIT 2", comparar: "filas-en-orden" };
    expect(revisarSql(empates, tarea, "SELECT nombre, unidades FROM productos ORDER BY unidades DESC LIMIT 2").diagnostico).toBe(
      "La columna 'nombre' no coincide en algunas filas. Si hay valores empatados en tu ORDER BY, agrega otra columna para desempatar; si no, revisa el cálculo o el filtro."
    );
    expect(revisarSql(empates, tarea, "SELECT nombre, unidades FROM productos ORDER BY unidades DESC, nombre LIMIT 2").aprobada).toBe(true);
  });
```

- [ ] **Step 2: Correr y ver que falla**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/sql.test.ts`
Expected: FAIL, porque el diagnóstico es "Revisa el cálculo o el filtro." sin la sugerencia de desempate.

- [ ] **Step 3: Implementar**

En `packages/engines/src/sql.ts`:

1. Cambia la firma por `function describirDiferencia(esperadas: Fila[], actuales: Fila[], sinOrden: boolean, consulta: string): string {`.
2. Cambia el `return` de la columna que no coincide por:
```ts
        // Con ORDER BY, que solo cambie una columna suele ser un empate: la base ordena como quiere las filas que empatan.
        if (/\border\s+by\b/i.test(consulta)) {
          return `La columna '${columna}' no coincide en algunas filas. Si hay valores empatados en tu ORDER BY, agrega otra columna para desempatar; si no, revisa el cálculo o el filtro.`;
        }
        return `La columna '${columna}' no coincide en algunas filas. Revisa el cálculo o el filtro.`;
```
3. En `compararSql`, pasa la consulta: `const diferencia = describirDiferencia(tarea.esperadas, actuales, sinOrden, consulta);`.

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines test && pnpm --filter @syntaxerror/engines exec tsc --noEmit -p ."`
Expected: PASS (19 pruebas en `sql.test.ts`) y sin errores de tipos. La prueba del `UPDATE` sigue con su mensaje anterior, porque su consulta no tiene `ORDER BY`.

- [ ] **Step 5: Commit**

```bash
git add packages/engines/src/sql.ts packages/engines/src/sql.test.ts
git commit -m "feat(sql): sugerir desempate cuando el order by deja filas empatadas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Generador de datos de Minimarkets del Sur

**Files:**
- Create: `packages/content/src/generadores/minimarkets-del-sur.ts`
- Test: `packages/content/src/generadores/minimarkets-del-sur.test.ts`
- Modify: `packages/content/src/generar-cli.ts`
- Create (generados): `content/casos/minimarkets-del-sur/datos/locales.csv`, `productos.csv` y `ventas.csv`

**Interfaces:**
- Consumes: `crearAleatorio` (`./aleatorio`), `FilaDato` y `aCsv` (`./despachos-rapidos`), de la Fase 4b.
- Produces en `generadores/minimarkets-del-sur`:
  - `SEMILLA_MINIMARKETS`, `CANTIDAD_VENTAS = 650` y `LOCAL_EN_REMODELACION = 7` (Osorno Centro);
  - `LOCALES` y `PRODUCTOS`;
  - `generarMinimarketsDelSur(): { locales; productos; ventas }`.
- Produces las tablas que usa el caso:
  - `locales`: id, nombre, ciudad, region, metros2;
  - `productos`: id, nombre, categoria, precio, proveedor;
  - `ventas`: id, fecha (`2025-MM-DD`), local_id, producto_id, cantidad, monto, medio_pago.

- [ ] **Step 1: Escribir las pruebas**

`packages/content/src/generadores/minimarkets-del-sur.test.ts`:
```ts
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { aCsv } from "./despachos-rapidos";
import { CANTIDAD_VENTAS, generarMinimarketsDelSur, LOCAL_EN_REMODELACION, PRODUCTOS } from "./minimarkets-del-sur";

const DATOS = fileURLToPath(new URL("../../../../content/casos/minimarkets-del-sur/datos/", import.meta.url));

describe("generarMinimarketsDelSur", () => {
  const datos = generarMinimarketsDelSur();
  const ventasDe = (local: number, mes: string) =>
    datos.ventas.filter((venta) => venta.local_id === local && String(venta.fecha).startsWith(`2025-${mes}`)).reduce((suma, venta) => suma + Number(venta.monto), 0);

  it("genera siempre lo mismo", () => {
    expect(generarMinimarketsDelSur()).toEqual(datos);
  });

  it("los CSV del repositorio son los generados: no se editan a mano", async () => {
    for (const [tabla, filas] of Object.entries(datos)) {
      expect(await readFile(`${DATOS}${tabla}.csv`, "utf8"), tabla).toBe(aCsv(filas));
    }
  });

  it("las ventas son coherentes: ids correlativos por fecha, montos y referencias válidas", () => {
    const productos = new Map(PRODUCTOS.map((producto) => [producto.id, producto]));
    expect(datos.ventas).toHaveLength(CANTIDAD_VENTAS);
    datos.ventas.forEach((venta, indice) => {
      expect(venta.id).toBe(indice + 1);
      expect(venta.fecha).toMatch(/^2025-0[1-3]-\d{2}$/);
      expect(Number(venta.monto)).toBe(Number(productos.get(venta.producto_id)?.precio) * Number(venta.cantidad));
      expect(datos.locales.some((local) => local.id === venta.local_id)).toBe(true);
    });
    expect([...datos.ventas].map((venta) => venta.fecha)).toEqual([...datos.ventas].map((venta) => venta.fecha).sort());
  });

  it("cuenta la historia del caso: Osorno es el último en marzo, no en enero, y cae mes a mes", () => {
    const ids = datos.locales.map((local) => Number(local.id));
    const ultimoDe = (mes: string) => ids.reduce((menor, id) => (ventasDe(id, mes) < ventasDe(menor, mes) ? id : menor));
    expect(ultimoDe("03")).toBe(LOCAL_EN_REMODELACION);
    expect(ultimoDe("01")).not.toBe(LOCAL_EN_REMODELACION);
    expect(ventasDe(LOCAL_EN_REMODELACION, "03")).toBeLessThan(ventasDe(LOCAL_EN_REMODELACION, "01") / 3);
  });

  it("la kombucha artesanal está en el catálogo pero no tiene ventas", () => {
    expect(datos.productos.some((producto) => producto.id === 406)).toBe(true);
    expect(datos.ventas.some((venta) => venta.producto_id === 406)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/generadores/minimarkets-del-sur.test.ts`
Expected: FAIL, "Failed to resolve import ./minimarkets-del-sur".

- [ ] **Step 3: Implementar**

`packages/content/src/generadores/minimarkets-del-sur.ts`:
```ts
import { crearAleatorio } from "./aleatorio";
import type { FilaDato } from "./despachos-rapidos";

// Datos del Caso 2, "Minimarkets del Sur": una cadena de ocho minimarkets entre Talca y Puerto Montt,
// enero a marzo de 2025. Son inventados y están limpios: el caso se trata de preguntar, no de limpiar.
// La historia que esconden: en marzo, Osorno vende mucho menos (estuvo en remodelación). La misión sin guía
// lleva a encontrarlo.

export type DatosMinimarkets = { locales: FilaDato[]; productos: FilaDato[]; ventas: FilaDato[] };

export const SEMILLA_MINIMARKETS = 20250115;
export const CANTIDAD_VENTAS = 650;
export const LOCAL_EN_REMODELACION = 7;

export const LOCALES: FilaDato[] = [
  { id: 1, nombre: "Talca Centro", ciudad: "Talca", region: "Maule", metros2: 180 },
  { id: 2, nombre: "Chillán Viejo", ciudad: "Chillán", region: "Ñuble", metros2: 150 },
  { id: 3, nombre: "Concepción Barrio Universitario", ciudad: "Concepción", region: "Biobío", metros2: 220 },
  { id: 4, nombre: "Los Ángeles Plaza", ciudad: "Los Ángeles", region: "Biobío", metros2: 160 },
  { id: 5, nombre: "Temuco Avenida Alemania", ciudad: "Temuco", region: "La Araucanía", metros2: 200 },
  { id: 6, nombre: "Valdivia Costanera", ciudad: "Valdivia", region: "Los Ríos", metros2: 140 },
  { id: 7, nombre: "Osorno Centro", ciudad: "Osorno", region: "Los Lagos", metros2: 170 },
  { id: 8, nombre: "Puerto Montt Angelmó", ciudad: "Puerto Montt", region: "Los Lagos", metros2: 190 },
];

// Peso de cada local en las ventas: los de ciudades más grandes venden más.
const PESO_LOCAL: Record<number, number> = { 1: 4, 2: 3, 3: 6, 4: 3, 5: 5, 6: 3, 7: 4, 8: 5 };

export const PRODUCTOS: FilaDato[] = [
  { id: 101, nombre: "Leche entera 1 L", categoria: "Lácteos", precio: 1190, proveedor: "Lechería del Ñuble" },
  { id: 102, nombre: "Leche descremada 1 L", categoria: "Lácteos", precio: 1190, proveedor: "Lechería del Ñuble" },
  { id: 103, nombre: "Queso gauda 500 g", categoria: "Lácteos", precio: 5490, proveedor: "Quesería Llanquihue" },
  { id: 104, nombre: "Queso fresco 300 g", categoria: "Lácteos", precio: 2990, proveedor: "Quesería Llanquihue" },
  { id: 105, nombre: "Yogur natural 1 kg", categoria: "Lácteos", precio: 2290, proveedor: "Lechería del Ñuble" },
  { id: 106, nombre: "Mantequilla 250 g", categoria: "Lácteos", precio: 2690, proveedor: "Quesería Llanquihue" },
  { id: 201, nombre: "Pan amasado 1 kg", categoria: "Panadería", precio: 2290, proveedor: "Panificadora Austral" },
  { id: 202, nombre: "Hallulla 1 kg", categoria: "Panadería", precio: 2190, proveedor: "Panificadora Austral" },
  { id: 203, nombre: "Kuchen de murta", categoria: "Panadería", precio: 6990, proveedor: "Panificadora Austral" },
  { id: 204, nombre: "Pan integral molde", categoria: "Panadería", precio: 2890, proveedor: "Panificadora Austral" },
  { id: 301, nombre: "Arroz grado 1 1 kg", categoria: "Abarrotes", precio: 1690, proveedor: "Distribuidora Sur" },
  { id: 302, nombre: "Tallarines 400 g", categoria: "Abarrotes", precio: 990, proveedor: "Distribuidora Sur" },
  { id: 303, nombre: "Aceite vegetal 1 L", categoria: "Abarrotes", precio: 2790, proveedor: "Distribuidora Sur" },
  { id: 304, nombre: "Azúcar 1 kg", categoria: "Abarrotes", precio: 1290, proveedor: "Distribuidora Sur" },
  { id: 305, nombre: "Harina 1 kg", categoria: "Abarrotes", precio: 1190, proveedor: "Molino del Maule" },
  { id: 306, nombre: "Porotos 1 kg", categoria: "Abarrotes", precio: 2490, proveedor: "Molino del Maule" },
  { id: 401, nombre: "Agua mineral 1,5 L", categoria: "Bebidas", precio: 990, proveedor: "Aguas de la Cordillera" },
  { id: 402, nombre: "Bebida cola 2 L", categoria: "Bebidas", precio: 1990, proveedor: "Embotelladora Sur" },
  { id: 403, nombre: "Jugo de manzana 1 L", categoria: "Bebidas", precio: 1490, proveedor: "Embotelladora Sur" },
  { id: 404, nombre: "Café en grano 250 g", categoria: "Bebidas", precio: 5990, proveedor: "Tostaduría Valdivia" },
  { id: 405, nombre: "Té 100 bolsitas", categoria: "Bebidas", precio: 2990, proveedor: "Distribuidora Sur" },
  { id: 406, nombre: "Kombucha artesanal", categoria: "Bebidas", precio: 3490, proveedor: "Fermentos del Sur" },
  { id: 501, nombre: "Detergente 3 L", categoria: "Aseo", precio: 7990, proveedor: "Limpieza Total" },
  { id: 502, nombre: "Papel higiénico 12 rollos", categoria: "Aseo", precio: 6490, proveedor: "Limpieza Total" },
  { id: 503, nombre: "Lavalozas 750 ml", categoria: "Aseo", precio: 1890, proveedor: "Limpieza Total" },
  { id: 504, nombre: "Cloro 1 L", categoria: "Aseo", precio: 990, proveedor: "Limpieza Total" },
  { id: 601, nombre: "Papas fritas 250 g", categoria: "Snacks", precio: 2490, proveedor: "Snacks del Biobío" },
  { id: 602, nombre: "Galletas de avena", categoria: "Snacks", precio: 1290, proveedor: "Snacks del Biobío" },
  { id: 603, nombre: "Maní salado 200 g", categoria: "Snacks", precio: 1590, proveedor: "Snacks del Biobío" },
  { id: 604, nombre: "Chocolate de leche 100 g", categoria: "Snacks", precio: 1390, proveedor: "Snacks del Biobío" },
  { id: 701, nombre: "Manzanas 1 kg", categoria: "Frutas y verduras", precio: 1490, proveedor: "Huertos del Maule" },
  { id: 702, nombre: "Papas 2 kg", categoria: "Frutas y verduras", precio: 1990, proveedor: "Huertos del Maule" },
  { id: 703, nombre: "Tomates 1 kg", categoria: "Frutas y verduras", precio: 1790, proveedor: "Huertos del Maule" },
  { id: 704, nombre: "Paltas 1 kg", categoria: "Frutas y verduras", precio: 4990, proveedor: "Huertos del Maule" },
  { id: 801, nombre: "Hamburguesas congeladas 4 un", categoria: "Congelados", precio: 4490, proveedor: "Frigorífico Austral" },
  { id: 802, nombre: "Helado de vainilla 1 L", categoria: "Congelados", precio: 3990, proveedor: "Frigorífico Austral" },
];

// La kombucha llegó al catálogo pero nunca se vendió: aparece al cruzar productos con ventas.
const SIN_VENTAS = new Set([406]);
// Lo que más se vende en un minimarket: lo de todos los días.
const PESO_CATEGORIA: Record<string, number> = { Lácteos: 6, Panadería: 6, Abarrotes: 5, Bebidas: 5, "Frutas y verduras": 4, Snacks: 3, Aseo: 2, Congelados: 2 };

const dosDigitos = (numero: number) => String(numero).padStart(2, "0");
const DIAS_POR_MES = [31, 28, 31];

export function generarMinimarketsDelSur(): DatosMinimarkets {
  const aleatorio = crearAleatorio(SEMILLA_MINIMARKETS);
  const vendibles = PRODUCTOS.filter((producto) => !SIN_VENTAS.has(Number(producto.id)));
  const pesosProducto = vendibles.map((producto) => [producto, PESO_CATEGORIA[String(producto.categoria)]] as const);
  const ventas: FilaDato[] = [];
  for (let indice = 0; indice < CANTIDAD_VENTAS; indice += 1) {
    const mes = aleatorio.elegirConPeso([[1, 1], [2, 1], [3, 1]] as const);
    // En marzo, Osorno estuvo en remodelación y vendió cerca de un tercio de lo normal.
    const pesosLocal = LOCALES.map((local) => {
      const id = Number(local.id);
      const peso = PESO_LOCAL[id] * (mes === 3 && id === LOCAL_EN_REMODELACION ? 0.3 : 1);
      return [id, peso] as const;
    });
    const local = aleatorio.elegirConPeso(pesosLocal);
    const producto = aleatorio.elegirConPeso(pesosProducto);
    const cantidad = aleatorio.elegirConPeso([[1, 6], [2, 4], [3, 2], [4, 1], [6, 1]] as const);
    ventas.push({
      id: indice + 1,
      fecha: `2025-${dosDigitos(mes)}-${dosDigitos(aleatorio.entero(1, DIAS_POR_MES[mes - 1]))}`,
      local_id: local,
      producto_id: producto.id,
      cantidad,
      monto: Number(producto.precio) * cantidad,
      medio_pago: aleatorio.elegirConPeso([["débito", 5], ["efectivo", 3], ["crédito", 2]] as const),
    });
  }
  ventas.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || Number(a.id) - Number(b.id));
  ventas.forEach((venta, indice) => (venta.id = indice + 1));
  return { locales: LOCALES, productos: PRODUCTOS, ventas };
}
```

En `packages/content/src/generar-cli.ts`:

1. Agrega el import:
```ts
import { generarMinimarketsDelSur } from "./generadores/minimarkets-del-sur";
```
2. Agrega a `generadores`:
```ts
  "minimarkets-del-sur": generarMinimarketsDelSur,
```

- [ ] **Step 4: Generar y correr las pruebas**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content generar`
Expected: las tres tablas de Despachos Rápidos sin cambios, más:
```
[content] casos/minimarkets-del-sur/datos/locales.csv: 8 filas
[content] casos/minimarkets-del-sur/datos/productos.csv: 36 filas
[content] casos/minimarkets-del-sur/datos/ventas.csv: 650 filas
```

Las primeras líneas de `ventas.csv` deben ser exactamente estas:
```
id,fecha,local_id,producto_id,cantidad,monto,medio_pago
1,2025-01-01,4,503,2,3780,crédito
2,2025-01-01,5,301,1,1690,crédito
```

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content exec vitest run src/generadores && pnpm --filter @syntaxerror/content exec tsc --noEmit -p ."`
Expected: PASS (11 pruebas, 6 de Despachos Rápidos y 5 de Minimarkets) y sin errores de tipos. `git status` no debe mostrar cambios en `content/casos/despachos-rapidos/datos/`.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/generadores packages/content/src/generar-cli.ts content/casos/minimarkets-del-sur/datos
git commit -m "feat(contenido): generador reproducible de los datos de minimarkets del sur

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: El contenido del Caso 2

**Files:**
- Create: `content/casos/minimarkets-del-sur/caso.yaml` y sus 8 misiones
- Modify: `content/rutas/data-analyst.yaml`

**Interfaces:**
- Consumes: los datos de la Task 2, y `SqlTask` y `SqlEjemplo`, que ya existen.
- Produces:
  - el caso `minimarkets-del-sur`, tercero en la ruta;
  - estos ids de tarea, por misión:
    1. `locales-y-ciudades` y `categorias`;
    2. `lacteos-caros`, `productos-de-queso` y `locales-del-sur`;
    3. `productos-mas-caros` y `ventas-mas-grandes`;
    4. `ventas-por-local` y `ventas-por-medio-de-pago`;
    5. `productos-populares` y `locales-con-ticket-alto`;
    6. `ventas-por-ciudad` y `top-10-productos`;
    7. `ventas-por-mes` y `ranking-de-marzo`;
    8. `local-con-menos-ventas-en-marzo`, `ese-local-mes-a-mes`, `categoria-mas-vendida`, `ticket-por-ciudad` y `productos-de-50-unidades`.

El recorrido del caso:

| # | Misión | Lo que se practica | Repasa |
|---|---|---|---|
| 1 | Conoce las tablas | qué es una fila, `SELECT`, `DISTINCT` | |
| 2 | Filtrar | `WHERE`, `AND`, `OR`, `LIKE` con `LOWER` | |
| 3 | Ordenar y limitar | `ORDER BY`, `DESC`, `LIMIT`, desempates | |
| 4 | Resumir con GROUP BY | `COUNT`, `SUM`, `AVG` (la tabla dinámica del Caso 1) | |
| 5 | Filtrar grupos | `HAVING` frente a `WHERE`, `ROUND` | 4 |
| 6 | Cruzar tablas | `JOIN` con alias (el `BUSCARV` del Caso 1), `LEFT JOIN` en la decisión | 3 y 4 |
| 7 | Ventas por mes | rangos de fechas, `MONTH` | 4 y 6 |
| 8 | Cinco preguntas de gerencia (sin guía) | todo el caso | todo |

- [ ] **Step 1: Caso y ruta**

`content/casos/minimarkets-del-sur/caso.yaml`:
```yaml
slug: minimarkets-del-sur
titulo: "Minimarkets del Sur: responder a gerencia con SQL"
cargo: Analista de datos junior
empresa: Minimarkets del Sur
dataset: Ventas de enero a marzo de 2025 de ocho locales entre Talca y Puerto Montt (datos generados con un script reproducible)
entregable: Un repositorio en GitHub con tus consultas en archivos .sql, cada una con un comentario que diga qué pregunta responde, y un README con lo que encontraste y qué le recomiendas a gerencia.
archivos:
  - .sql
rubrica:
  - "Cada consulta responde una pregunta concreta, y el comentario dice cuál."
  - "Las consultas se pueden leer: alias claros, una cláusula por línea y orden explícito cuando importa."
  - "El README explica qué se encontró, por ejemplo qué pasó con Osorno en marzo, y lo respalda con resultados de las consultas."
misiones:
  - 01-conoce-las-tablas
  - 02-filtrar
  - 03-ordenar-y-limitar
  - 04-resumir-con-group-by
  - 05-filtrar-grupos
  - 06-cruzar-tablas
  - 07-ventas-por-mes
  - 08-preguntas-de-gerencia
```

`content/rutas/data-analyst.yaml` completo:
```yaml
slug: data-analyst
titulo: Data Analyst
cargo: Analista de datos junior
descripcion: Resuelve casos reales de una empresa chilena con SQL, planillas, Python y Power BI, y termina con un portafolio que puedes mostrar en una entrevista.
estado: borrador
# Orden aprobado en la propuesta pedagógica (sección 7). Los casos siguientes se agregan al escribirlos.
casos:
  - herramientas-del-oficio
  - despachos-rapidos
  - minimarkets-del-sur
```

- [ ] **Step 2: Las misiones**

`content/casos/minimarkets-del-sur/misiones/01-conoce-las-tablas.mdx`:
```mdx
---
titulo: Conoce las tablas
tiempo: 20
---

<Brief de="Rodrigo Henríquez, gerente comercial de Minimarkets del Sur">
Hola, qué bueno que llegaste. Tenemos ocho minimarkets entre Talca y Puerto Montt, y todo lo que vendemos queda en una base de datos. Hasta ahora alguien exportaba planillas a mano y cada informe tardaba días. Quiero que aprendas a preguntarle directo a la base. Partamos por reconocer el terreno: dime dónde están nuestros locales y qué categorías de productos vendemos.
</Brief>

<Concepto>
Una base de datos guarda la información en **tablas**, como las hojas de una planilla. Este caso tiene tres:

| Tabla | Una fila es | Columnas |
| --- | --- | --- |
| `locales` | un minimarket | id, nombre, ciudad, region, metros2 |
| `productos` | un producto del catálogo | id, nombre, categoria, precio, proveedor |
| `ventas` | una venta en caja | id, fecha, local_id, producto_id, cantidad, monto, medio_pago |

**SQL** es el lenguaje para preguntarle a la base. La pregunta más básica elige columnas de una tabla:

<SqlEjemplo consulta="SELECT nombre, precio FROM productos" />

- `SELECT *` trae todas las columnas; sirve para mirar, pero en un informe conviene elegir solo las que se necesitan.
- `SELECT DISTINCT` quita los valores repetidos: con él ves cada categoría una sola vez, en vez de una por producto.

Las tablas del caso están siempre a mano en "Tablas disponibles", sobre el editor.
</Concepto>

<SqlTask
  id="locales-y-ciudades"
  enunciado="Trae el nombre y la ciudad de cada local."
  inicial="SELECT "
  solucion="SELECT nombre, ciudad FROM locales"
  comparar="filas-sin-orden"
  pistas={["Los locales están en la tabla locales.", "Después de SELECT van las columnas separadas por coma, y después de FROM, la tabla."]}
/>

<SqlTask
  id="categorias"
  enunciado="Trae la lista de categorías de productos, cada una una sola vez."
  solucion="SELECT DISTINCT categoria FROM productos"
  comparar="filas-sin-orden"
  pistas={["La categoría está en la tabla productos.", "Sin DISTINCT, cada categoría aparece una vez por producto."]}
/>

<Decision
  pregunta="Rodrigo te pide 'todo lo de ventas' para revisarlo él. ¿Qué le entregas?"
  opciones={[
    { texto: "Le pregunto qué quiere saber; con eso elijo las columnas y filas que responden su pregunta.", correcta: true, porque: "650 filas con siete columnas no responden nada por sí solas. La pregunta define la consulta." },
    { texto: "Un SELECT * FROM ventas y que él busque.", porque: "Le traspasas el trabajo de análisis y es probable que se pierda en los datos." },
  ]}
/>

<Debrief entrevista="En entrevistas suelen mostrar un esquema de tablas y preguntar '¿qué representa una fila de esta tabla?'. Responder eso antes de escribir cualquier consulta muestra que entiendes los datos.">
Antes de consultar, entiende qué es una fila en cada tabla: un local, un producto o una venta. `SELECT` elige columnas y `DISTINCT` quita repetidos. Con eso ya puedes explorar cualquier tabla nueva.
</Debrief>
```

`content/casos/minimarkets-del-sur/misiones/02-filtrar.mdx`:
```mdx
---
titulo: Filtrar
tiempo: 25
---

<Brief de="Rodrigo Henríquez, gerente comercial de Minimarkets del Sur">
Tres preguntas rápidas de la reunión de hoy. Compras quiere revisar los lácteos que cuestan más de 2.500 pesos. Marketing prepara una campaña de quesos y necesita todos los productos que tengan "queso" en el nombre, con mayúscula o sin ella. Y operaciones quiere la lista de locales de las regiones de Los Lagos y Los Ríos.
</Brief>

<Concepto>
`WHERE` deja solo las filas que cumplen una condición. Es el mismo filtro que usaste en las planillas, escrito como texto:

<SqlEjemplo consulta="SELECT nombre, precio FROM productos WHERE precio > 5000" />

Para combinar condiciones:
- `AND`: se tienen que cumplir las dos. `WHERE categoria = 'Bebidas' AND precio < 2000`.
- `OR`: basta con una. `WHERE ciudad = 'Talca' OR ciudad = 'Chillán'`.

`LIKE` busca un patrón en un texto, y `%` reemplaza cualquier cantidad de caracteres: `'%pan%'` es "pan" en cualquier parte.

Algunas bases distinguen mayúsculas en `LIKE` y otras no. Para que la consulta funcione en cualquiera, pasa el texto a minúsculas primero:

<SqlEjemplo consulta="SELECT nombre FROM productos WHERE LOWER(nombre) LIKE '%pan%'" />

Los textos van entre comillas simples: `'Lácteos'`.
</Concepto>

<SqlTask
  id="lacteos-caros"
  enunciado="Trae el nombre y el precio de los productos de la categoría Lácteos que cuestan más de 2500 pesos."
  solucion="SELECT nombre, precio FROM productos WHERE categoria = 'Lácteos' AND precio > 2500"
  comparar="filas-sin-orden"
  pistas={["Son dos condiciones que se cumplen a la vez: van unidas con AND.", "La categoría se escribe igual que en la tabla, con tilde: 'Lácteos'."]}
/>

<SqlTask
  id="productos-de-queso"
  enunciado="Trae el nombre de todos los productos que tienen la palabra queso en el nombre, sin importar mayúsculas."
  solucion="SELECT nombre FROM productos WHERE LOWER(nombre) LIKE '%queso%'"
  comparar="filas-sin-orden"
  pistas={["LIKE con % antes y después busca la palabra en cualquier parte del nombre.", "LOWER(nombre) pasa el nombre a minúsculas antes de comparar."]}
/>

<SqlTask
  id="locales-del-sur"
  enunciado="Trae el nombre de los locales que están en la región de Los Lagos o en la de Los Ríos."
  solucion="SELECT nombre FROM locales WHERE region = 'Los Lagos' OR region = 'Los Ríos'"
  comparar="filas-sin-orden"
  pistas={["Basta con que se cumpla una de las dos condiciones: OR.", "La región está en la tabla locales, columna region."]}
/>

<Decision
  pregunta="Quieres los locales de Los Lagos o Los Ríos con más de 180 m², y escribes WHERE region = 'Los Lagos' OR region = 'Los Ríos' AND metros2 > 180. El resultado trae Osorno Centro, que tiene 170 m². ¿Qué pasó?"
  opciones={[
    { texto: "AND se evalúa antes que OR: la consulta se lee como «Los Lagos, o (Los Ríos y más de 180 m²)». Hay que agrupar con paréntesis.", correcta: true, porque: "Igual que en matemática, el orden importa. Con (region = 'Los Lagos' OR region = 'Los Ríos') AND metros2 > 180 se lee como querías." },
    { texto: "Un error de la base de datos.", porque: "La base hizo exactamente lo que dice la consulta; el problema está en cómo se escribió." },
  ]}
/>

<Debrief entrevista="Una trampa común en pruebas de SQL es mezclar AND y OR sin paréntesis. Si te toca, dilo en voz alta: 'pongo paréntesis para que no dependa del orden en que se evalúan'.">
`WHERE` filtra filas con condiciones que se combinan con `AND` y `OR`. `LIKE` busca patrones en textos. Cuando mezcles `AND` y `OR`, usa paréntesis siempre: es más claro y evita errores.
</Debrief>
```

`content/casos/minimarkets-del-sur/misiones/03-ordenar-y-limitar.mdx`:
```mdx
---
titulo: Ordenar y limitar
tiempo: 20
---

<Brief de="Rodrigo Henríquez, gerente comercial de Minimarkets del Sur">
Para la vitrina de verano quiero los cinco productos más caros del catálogo. Y el área de prevención de fraudes me pide las diez ventas de mayor monto del trimestre, para revisarlas una por una. Si dos ventas tienen el mismo monto, ponlas en el orden en que se registraron.
</Brief>

<Concepto>
`ORDER BY` ordena el resultado. Por defecto es de menor a mayor (`ASC`); con `DESC`, de mayor a menor. `LIMIT` deja solo las primeras filas:

<SqlEjemplo consulta="SELECT nombre, precio FROM productos ORDER BY precio LIMIT 3" />

Cuando dos filas empatan en lo que ordenas, la base puede devolverlas en cualquier orden, y tu top 10 podría cambiar de un día para otro. Para que el resultado sea siempre el mismo, agrega una segunda columna de desempate:

`ORDER BY monto DESC, id` → primero por monto, de mayor a menor; si empatan, por id, de menor a mayor.

`ORDER BY` y `LIMIT` van al final de la consulta, en ese orden.
</Concepto>

<SqlTask
  id="productos-mas-caros"
  enunciado="Trae el nombre y el precio de los cinco productos más caros, del más caro al más barato."
  solucion="SELECT nombre, precio FROM productos ORDER BY precio DESC LIMIT 5"
  comparar="filas-en-orden"
  pistas={["Ordena por precio de mayor a menor: DESC.", "LIMIT 5 deja solo las cinco primeras filas."]}
/>

<SqlTask
  id="ventas-mas-grandes"
  enunciado="Trae el id y el monto de las diez ventas de mayor monto. Si dos ventas tienen el mismo monto, va primero la de id menor."
  solucion="SELECT id, monto FROM ventas ORDER BY monto DESC, id LIMIT 10"
  comparar="filas-en-orden"
  pistas={["Las ventas están en la tabla ventas.", "Hay montos repetidos: agrega id como segunda columna en el ORDER BY.", "El monto va de mayor a menor (DESC) y el id de menor a mayor (sin DESC)."]}
/>

<Decision
  pregunta="Tu top 10 de ventas de mayor monto termina en una venta de 27.960, y la siguiente (la 11) también es de 27.960. ¿Qué le dices a prevención de fraudes?"
  opciones={[
    { texto: "Que hay un empate en el corte y que la venta 11 merece la misma revisión; o les entrego todas las que empatan.", correcta: true, porque: "Un corte arbitrario en un empate deja fuera un caso igual de relevante. Avisarlo es parte de un buen análisis." },
    { texto: "Nada: pidieron diez.", porque: "Técnicamente cumples, pero la venta 11 es igual de sospechosa y queda sin revisar." },
  ]}
/>

<Debrief entrevista="El 'top N' es una de las preguntas de SQL más comunes en entrevistas. Mencionar los empates y cómo los desempatas (o que usarías funciones de ventana como RANK) muestra experiencia.">
`ORDER BY` ordena, `DESC` invierte el orden y `LIMIT` corta el resultado. Siempre que un orden decida qué filas quedan, piensa en los empates y desempata con otra columna.
</Debrief>
```

`content/casos/minimarkets-del-sur/misiones/04-resumir-con-group-by.mdx`:
```mdx
---
titulo: Resumir con GROUP BY
tiempo: 25
---

<Brief de="Rodrigo Henríquez, gerente comercial de Minimarkets del Sur">
El directorio quiere dos resúmenes del trimestre. Primero, cuánto vendió cada local, en pesos. Segundo, cómo nos pagan los clientes: cuántas ventas hubo con cada medio de pago y cuánto dinero entró por cada uno.
</Brief>

<Concepto>
En las planillas resumiste por comuna con una tabla dinámica (o con `CONTAR.SI` y `SUMAR.SI`). En SQL eso se hace con `GROUP BY`: junta las filas que comparten un valor y calcula algo para cada grupo.

<SqlEjemplo consulta="SELECT categoria, COUNT(*) AS productos FROM productos GROUP BY categoria" />

Las funciones de resumen más usadas:

| Función | Calcula |
| --- | --- |
| `COUNT(*)` | cuántas filas tiene el grupo |
| `SUM(columna)` | la suma |
| `AVG(columna)` | el promedio |
| `MIN(columna)` y `MAX(columna)` | el menor y el mayor |

`AS` le pone nombre a la columna calculada: `SUM(monto) AS ventas`.

La regla de oro: todo lo que aparece en el `SELECT` y no es una función de resumen, tiene que estar en el `GROUP BY`.
</Concepto>

<SqlTask
  id="ventas-por-local"
  enunciado="Trae el id de cada local (local_id) y la suma de sus montos de venta."
  solucion="SELECT local_id, SUM(monto) AS ventas FROM ventas GROUP BY local_id"
  comparar="filas-sin-orden"
  pistas={["Agrupa la tabla ventas por local_id.", "La suma de los montos es SUM(monto)."]}
/>

<SqlTask
  id="ventas-por-medio-de-pago"
  enunciado="Trae cada medio de pago, cuántas ventas tuvo y la suma de sus montos, en ese orden de columnas."
  solucion="SELECT medio_pago, COUNT(*) AS ventas, SUM(monto) AS monto FROM ventas GROUP BY medio_pago"
  comparar="filas-sin-orden"
  pistas={["Agrupa por medio_pago.", "COUNT(*) cuenta las ventas de cada grupo y SUM(monto) suma lo que entró."]}
/>

<Decision
  pregunta="El resumen por local muestra local_id 1, 2, 3… Rodrigo te dice: 'No sé qué local es el 3'. ¿Qué haces?"
  opciones={[
    { texto: "Traigo el nombre del local desde la tabla locales: eso se hace cruzando tablas, y lo vemos en la misión 6.", correcta: true, porque: "Un informe para personas usa nombres, no códigos. Los códigos sirven para unir tablas, no para leer." },
    { texto: "Le mando la tabla de locales aparte para que él cruce los códigos.", porque: "Le traspasas un trabajo que la consulta puede hacer, y es fácil que se equivoque al cruzar." },
  ]}
/>

<Debrief entrevista="Si te piden 'las ventas por categoría' en una prueba, la respuesta es casi siempre un GROUP BY. Un error frecuente que conviene evitar: poner en el SELECT una columna que no está en el GROUP BY.">
`GROUP BY` resume filas por grupo, como una tabla dinámica. `COUNT`, `SUM`, `AVG`, `MIN` y `MAX` calculan un valor para cada grupo, y `AS` les da un nombre legible.
</Debrief>
```

`content/casos/minimarkets-del-sur/misiones/05-filtrar-grupos.mdx`:
~~~~mdx
---
titulo: Filtrar grupos
tiempo: 25
---

<Brief de="Rodrigo Henríquez, gerente comercial de Minimarkets del Sur">
Vamos a negociar con proveedores y necesito saber qué productos vendieron 55 unidades o más en el trimestre. También quiero saber en qué locales el ticket promedio, lo que gasta un cliente por venta, supera los 6.000 pesos: ahí vamos a probar productos más caros.
</Brief>

<Concepto>
`WHERE` filtra **filas** antes de agrupar. Para filtrar **grupos** después de calcularlos se usa `HAVING`:

<SqlEjemplo consulta="SELECT categoria, COUNT(*) AS productos FROM productos GROUP BY categoria HAVING COUNT(*) >= 5" />

El orden de las cláusulas siempre es el mismo:

```
SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT …
```

Una forma de recordarlo: `WHERE` decide qué filas entran a los grupos y `HAVING` decide qué grupos salen en el resultado. En `HAVING` se repite la función de resumen: `HAVING SUM(cantidad) >= 55`.
</Concepto>

<SqlTask
  id="productos-populares"
  enunciado="Trae el id de cada producto (producto_id) y la suma de sus unidades vendidas, solo para los que vendieron 55 unidades o más."
  solucion="SELECT producto_id, SUM(cantidad) AS unidades FROM ventas GROUP BY producto_id HAVING SUM(cantidad) >= 55"
  comparar="filas-sin-orden"
  pistas={["Agrupa por producto_id y suma la columna cantidad.", "El filtro es sobre la suma, que existe después de agrupar: va en HAVING, no en WHERE."]}
/>

<SqlTask
  id="locales-con-ticket-alto"
  enunciado="Trae el id de cada local y su ticket promedio redondeado a pesos, solo para los locales con un ticket promedio mayor a 6000."
  solucion="SELECT local_id, ROUND(AVG(monto), 0) AS ticket FROM ventas GROUP BY local_id HAVING AVG(monto) > 6000"
  comparar="filas-sin-orden"
  pistas={["El ticket promedio es el promedio del monto de cada venta: AVG(monto).", "ROUND(valor, 0) lo deja sin decimales.", "El filtro va en HAVING, sobre AVG(monto)."]}
/>

<Decision
  pregunta="Un compañero escribió WHERE SUM(cantidad) >= 55 y la base le respondió con un error. ¿Por qué?"
  opciones={[
    { texto: "Porque WHERE se aplica a cada fila antes de agrupar, y en ese momento la suma todavía no existe.", correcta: true, porque: "Las sumas existen recién al agrupar. Por eso los filtros sobre ellas van en HAVING." },
    { texto: "Porque SUM no se puede usar con números enteros.", porque: "SUM funciona con cualquier número; el problema es dónde está escrito el filtro." },
  ]}
/>

<Debrief entrevista="'¿Cuál es la diferencia entre WHERE y HAVING?' es de las preguntas más repetidas en entrevistas de SQL. Responde con el orden: WHERE filtra filas antes de agrupar; HAVING filtra grupos después.">
`HAVING` filtra grupos usando funciones de resumen. Con `WHERE` y `HAVING` en la misma consulta puedes, por ejemplo, contar solo las ventas con tarjeta y quedarte con los locales que superan cierto número.
</Debrief>
~~~~

`content/casos/minimarkets-del-sur/misiones/06-cruzar-tablas.mdx`:
~~~~mdx
---
titulo: Cruzar tablas
tiempo: 30
---

<Brief de="Rodrigo Henríquez, gerente comercial de Minimarkets del Sur">
Los resúmenes con códigos no me sirven para el directorio. Necesito las ventas por ciudad, con el nombre de la ciudad, y el top 10 de productos más vendidos en unidades, con su nombre. Si dos productos venden lo mismo, ordénalos alfabéticamente.
</Brief>

<Concepto>
La tabla `ventas` guarda `local_id` y `producto_id`, no los nombres. Para traerlos se **cruzan** las tablas con `JOIN`, igual que el `BUSCARV` de las planillas, pero para todas las filas a la vez:

<SqlEjemplo consulta="SELECT v.id, v.monto, l.nombre FROM ventas v JOIN locales l ON v.local_id = l.id LIMIT 5" />

- `ventas v` y `locales l` les dan un **alias** corto a las tablas.
- `ON v.local_id = l.id` dice qué columnas tienen que coincidir.
- Con alias, cada columna se escribe con su tabla: `v.monto`, `l.nombre`. Así no hay dudas cuando dos tablas tienen una columna con el mismo nombre, como `id`.

Después del `JOIN` se puede agrupar, filtrar y ordenar como siempre:

```
SELECT l.ciudad, SUM(v.monto) AS ventas
FROM ventas v
JOIN locales l ON v.local_id = l.id
GROUP BY l.ciudad
```
</Concepto>

<SqlTask
  id="ventas-por-ciudad"
  enunciado="Trae cada ciudad y la suma de los montos de venta de su local."
  solucion="SELECT l.ciudad, SUM(v.monto) AS ventas FROM ventas v JOIN locales l ON v.local_id = l.id GROUP BY l.ciudad"
  comparar="filas-sin-orden"
  pistas={["Cruza ventas con locales: el local_id de la venta coincide con el id del local.", "Agrupa por la ciudad, que está en la tabla locales."]}
/>

<SqlTask
  id="top-10-productos"
  enunciado="Trae el nombre de los diez productos con más unidades vendidas y sus unidades, de mayor a menor. Si empatan, ordénalos por nombre."
  solucion="SELECT p.nombre, SUM(v.cantidad) AS unidades FROM ventas v JOIN productos p ON v.producto_id = p.id GROUP BY p.nombre ORDER BY unidades DESC, p.nombre LIMIT 10"
  comparar="filas-en-orden"
  pistas={["Cruza ventas con productos por producto_id.", "Agrupa por el nombre del producto y suma la cantidad.", "Hay empates en el corte del top 10: ordena por unidades (DESC) y luego por nombre."]}
/>

<Decision
  pregunta="Al cruzar productos con ventas, la Kombucha artesanal no aparece en ningún resultado, aunque está en el catálogo. ¿Qué significa?"
  opciones={[
    { texto: "Que no tiene ventas: JOIN solo deja las filas que coinciden en las dos tablas. Para ver los productos sin ventas se usa LEFT JOIN.", correcta: true, porque: "Un producto sin ventas es un dato valioso (¿se debe sacar del catálogo?), y JOIN lo esconde sin avisar." },
    { texto: "Que la consulta tiene un error.", porque: "La consulta está bien: hace exactamente lo que JOIN hace con las filas que no coinciden." },
  ]}
/>

<Debrief entrevista="Cruzar tablas es la base de casi toda prueba de SQL. Prepárate para explicar la diferencia entre JOIN (o INNER JOIN), que deja solo lo que coincide, y LEFT JOIN, que conserva todas las filas de la tabla de la izquierda.">
`JOIN` une tablas por una columna en común y permite reportar con nombres en vez de códigos. Recuerda que un `JOIN` deja fuera lo que no tiene pareja: cuando eso importa, `LEFT JOIN` lo conserva.
</Debrief>
~~~~

`content/casos/minimarkets-del-sur/misiones/07-ventas-por-mes.mdx`:
```mdx
---
titulo: Ventas por mes
tiempo: 25
---

<Brief de="Rodrigo Henríquez, gerente comercial de Minimarkets del Sur">
Gerencia general quiere ver cómo vamos mes a mes en el trimestre. Además, necesito el ranking de locales de marzo, del que más vendió al que menos, con el nombre de cada local. Algo pasó en marzo en uno de ellos y quiero verlo en los números.
</Brief>

<Concepto>
En esta base las fechas están escritas como texto con el formato año-mes-día: `2025-03-14`. Eso permite dos cosas:

**Filtrar por período**, comparando como texto. Funciona porque en ese formato el orden alfabético es el orden de las fechas:

`WHERE fecha >= '2025-03-01' AND fecha < '2025-04-01'` → todo marzo.

Usar `< '2025-04-01'` en vez de `<= '2025-03-31'` evita olvidar el último día de un mes de 30 o de 28 días.

**Agrupar por mes** con `MONTH(fecha)`, que devuelve el número del mes:

<SqlEjemplo consulta="SELECT MONTH(fecha) AS mes, COUNT(*) AS ventas FROM ventas GROUP BY MONTH(fecha) ORDER BY mes" />

`YEAR(fecha)` devuelve el año. Si los datos tuvieran más de un año, se agrupa por los dos: `GROUP BY YEAR(fecha), MONTH(fecha)`.
</Concepto>

<SqlTask
  id="ventas-por-mes"
  enunciado="Trae el número de cada mes y la suma de los montos vendidos, ordenado por mes."
  solucion="SELECT MONTH(fecha) AS mes, SUM(monto) AS ventas FROM ventas GROUP BY MONTH(fecha) ORDER BY mes"
  comparar="filas-en-orden"
  pistas={["MONTH(fecha) da el número del mes.", "Agrupa por MONTH(fecha) y ordena por el mes."]}
/>

<SqlTask
  id="ranking-de-marzo"
  enunciado="Trae el nombre de cada local y lo que vendió en marzo de 2025, del que más vendió al que menos."
  solucion="SELECT l.nombre, SUM(v.monto) AS ventas FROM ventas v JOIN locales l ON v.local_id = l.id WHERE v.fecha >= '2025-03-01' AND v.fecha < '2025-04-01' GROUP BY l.nombre ORDER BY ventas DESC"
  comparar="filas-en-orden"
  pistas={["Necesitas el nombre del local: cruza ventas con locales, como en la misión 6.", "Filtra marzo con WHERE antes de agrupar: fecha >= '2025-03-01' AND fecha < '2025-04-01'.", "Ordena por la suma, de mayor a menor."]}
/>

<Decision
  pregunta="En marzo, Osorno Centro aparece último, muy lejos del resto. ¿Qué haces antes de informarlo?"
  opciones={[
    { texto: "Reviso sus ventas de enero y febrero para ver si es una caída nueva y le pregunto a Rodrigo si hubo algo especial en ese local en marzo.", correcta: true, porque: "Un número bajo puede tener una explicación operativa (cierre, remodelación, falla de caja). Compararlo con su propia historia y preguntar evita conclusiones equivocadas." },
    { texto: "Lo informo como el peor local de la cadena.", porque: "Si en enero y febrero vendía bien, calificarlo como el peor por un solo mes puede ser injusto y llevar a una mala decisión." },
  ]}
/>

<Debrief entrevista="Las preguntas de fechas son frecuentes: 'ventas por mes', 'el mes con más ventas', 'comparar este mes con el anterior'. Explicar por qué filtras con < al primer día del mes siguiente muestra cuidado con los bordes.">
Con fechas en formato año-mes-día puedes filtrar períodos comparando textos y agrupar con `MONTH` y `YEAR`. Mirar la evolución en el tiempo es lo que convierte un número suelto en una historia.
</Debrief>
```

`content/casos/minimarkets-del-sur/misiones/08-preguntas-de-gerencia.mdx`:
```mdx
---
titulo: Cinco preguntas de gerencia
tiempo: 45
sinGuia: true
---

<Brief de="Rodrigo Henríquez, gerente comercial de Minimarkets del Sur">
Mañana presento el trimestre al directorio y llevo cinco preguntas. Necesito una consulta para cada una, con nombres y no códigos. Primero, qué local vendió menos en marzo. Segundo, cómo le fue a ese mismo local mes a mes. Tercero, qué categoría vendió más en pesos en el trimestre. Cuarto, el ticket promedio de cada ciudad, redondeado a pesos, de mayor a menor. Y quinto, qué productos vendieron 50 unidades o más, con sus unidades.
</Brief>

<SqlTask
  id="local-con-menos-ventas-en-marzo"
  enunciado="1. ¿Qué local vendió menos en marzo? Trae su nombre y lo que vendió."
  solucion="SELECT l.nombre, SUM(v.monto) AS ventas FROM ventas v JOIN locales l ON v.local_id = l.id WHERE v.fecha >= '2025-03-01' AND v.fecha < '2025-04-01' GROUP BY l.nombre ORDER BY ventas LIMIT 1"
  comparar="filas-en-orden"
/>

<SqlTask
  id="ese-local-mes-a-mes"
  enunciado="2. ¿Cómo le fue a ese local mes a mes? Trae el número del mes y sus ventas, ordenado por mes."
  solucion="SELECT MONTH(v.fecha) AS mes, SUM(v.monto) AS ventas FROM ventas v JOIN locales l ON v.local_id = l.id WHERE l.nombre = 'Osorno Centro' GROUP BY MONTH(v.fecha) ORDER BY mes"
  comparar="filas-en-orden"
/>

<SqlTask
  id="categoria-mas-vendida"
  enunciado="3. ¿Qué categoría vendió más en pesos en el trimestre? Trae la categoría y su total."
  solucion="SELECT p.categoria, SUM(v.monto) AS ventas FROM ventas v JOIN productos p ON v.producto_id = p.id GROUP BY p.categoria ORDER BY ventas DESC LIMIT 1"
  comparar="filas-en-orden"
/>

<SqlTask
  id="ticket-por-ciudad"
  enunciado="4. ¿Cuál es el ticket promedio de cada ciudad, redondeado a pesos? Trae la ciudad y el ticket, de mayor a menor."
  solucion="SELECT l.ciudad, ROUND(AVG(v.monto), 0) AS ticket FROM ventas v JOIN locales l ON v.local_id = l.id GROUP BY l.ciudad ORDER BY ticket DESC"
  comparar="filas-en-orden"
/>

<SqlTask
  id="productos-de-50-unidades"
  enunciado="5. ¿Qué productos vendieron 50 unidades o más? Trae el nombre y las unidades."
  solucion="SELECT p.nombre, SUM(v.cantidad) AS unidades FROM ventas v JOIN productos p ON v.producto_id = p.id GROUP BY p.nombre HAVING SUM(v.cantidad) >= 50"
  comparar="filas-sin-orden"
/>

<Decision
  pregunta="Tienes las cinco respuestas. ¿Cómo se las presentas a Rodrigo?"
  opciones={[
    { texto: "Con cada número, lo que significa y una recomendación; por ejemplo, que la caída de Osorno en marzo es puntual y conviene confirmar la causa antes de tomar medidas.", correcta: true, porque: "Gerencia decide con conclusiones, no con tablas. Tu trabajo es conectar los resultados con una acción." },
    { texto: "Le mando las cinco consultas para que las ejecute él.", porque: "Las consultas son tu herramienta, no el entregable. Él necesita las respuestas y lo que significan." },
  ]}
/>

<Debrief entrevista="Muchas pruebas técnicas terminan con un caso abierto como este: varias preguntas de negocio y una base de datos. Lo que más se valora es que cada consulta responda exactamente lo que se pidió y que puedas explicar el resultado en una frase.">
Este es tu entregable: guarda cada consulta en un archivo .sql con un comentario que diga qué pregunta responde, súbelas a un repositorio con un README que cuente lo que encontraste (incluido lo de Osorno) y envíalo desde la página del caso.
</Debrief>
```

- [ ] **Step 3: Validar**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content validate`
Expected: `[content] ok: 2 rutas, 4 casos, 27 misiones`.

Revisa además, sin agregarla al repositorio, que ninguna consulta del caso produzca avisos. Corre esta prueba temporal con `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run sonda.test.ts`, en `packages/content/sonda.test.ts`, y bórrala después:
```ts
import { expect, it } from "vitest";
import { avisosSql } from "@syntaxerror/engines/sql-errores";
import { ejecutarConsulta } from "@syntaxerror/engines/sql";
import { cargarContenido } from "./src/cargar";
import { tablasSql } from "./src/datos";

it("las consultas del caso no tienen avisos y la decisión de la misión 2 es cierta", async () => {
  const contenido = await cargarContenido("/app/content");
  const caso = contenido.casos.find((candidato) => candidato.slug === "minimarkets-del-sur")!;
  const tablas = tablasSql(caso);
  for (const mision of caso.misiones) {
    for (const bloque of mision.bloques) {
      if (bloque.tipo === "SqlTask") expect(avisosSql(bloque.props.solucion, tablas), bloque.props.id).toEqual([]);
      if (bloque.tipo === "SqlEjemplo") expect(avisosSql(bloque.props.consulta, tablas), bloque.props.consulta).toEqual([]);
    }
  }
  const decision = ejecutarConsulta(tablas, "SELECT nombre, metros2 FROM locales WHERE region = 'Los Lagos' OR region = 'Los Ríos' AND metros2 > 180");
  expect(decision).toMatchObject({ ok: true, filas: expect.arrayContaining([{ nombre: "Osorno Centro", metros2: 170 }]) });
});
```

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && cd apps/web && pnpm exec tsc --noEmit -p . && pnpm build"`
Expected: PASS en todos los paquetes, incluido `contenido-real.test.ts`, y el build con las páginas de misión estáticas.

- [ ] **Step 4: Commit**

```bash
git add content
git commit -m "feat(contenido): caso 2 minimarkets del sur, ocho misiones de sql

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: e2e y README

**Files:**
- Create: `e2e/tests/progreso.ts`, `e2e/tests/minimarkets.spec.ts`
- Modify: `e2e/tests/despachos.spec.ts` (usa `progreso.ts`), `e2e/calentar.ts`, `README.md`

**Interfaces:**
- Consumes: `aprobarEntregable` y `entrarComoAdmin` (`./revision`), los ids de los casos 0, 1 y 2, y `/api/progreso`.
- Produces en `e2e/tests/progreso.ts`:
  - `MISIONES: Record<caso, [mision, tarea][]>`, para los casos 0 y 1;
  - `registrarse(page, nombre): Promise<string>`;
  - `aprobar(page, ip, caso, misiones)`;
  - `completarCaso(page, admin, ip, email, caso)`, que aprueba las misiones y el entregable;
  - reexporta `entrarComoAdmin`.

Los casos siguientes agregan sus misiones a `MISIONES` para que las pruebas de los casos posteriores puedan completarlos.

- [ ] **Step 1: El helper y la prueba**

`e2e/tests/progreso.ts`:
```ts
import { expect, type Page } from "./fixtures";
import { aprobarEntregable, entrarComoAdmin } from "./revision";

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

// Completa un caso entero: todas sus misiones y el entregable aprobado por administración.
export async function completarCaso(page: Page, admin: Page, ip: string, email: string, caso: string) {
  await aprobar(page, ip, caso, MISIONES[caso]);
  await page.goto(`/casos/${caso}`);
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill(`https://github.com/e2e/${caso}`);
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();
  await aprobarEntregable(admin, email);
}

export { entrarComoAdmin };
```

`e2e/tests/minimarkets.spec.ts`:
```ts
import { expect, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, registrarse } from "./progreso";

const CASO = "minimarkets-del-sur";

test("con los casos 0 y 1 completos: cruza tablas con un error explicado y el top 10 con desempate", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(240_000);
  const email = await registrarse(page, "Benjamín Vera");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await completarCaso(page, admin, ip, email, "herramientas-del-oficio");
  await completarCaso(page, admin, ip, email, "despachos-rapidos");

  await aprobar(page, ip, CASO, [
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
  ]);

  await page.goto(`/casos/${CASO}/06-cruzar-tablas`);
  await expect(page.getByText("ventas: id, fecha, local_id, producto_id, cantidad, monto, medio_pago").first()).toBeVisible();
  const consultas = page.getByLabel("Consulta SQL");
  await consultas.first().fill("SELECT l.ciudad, SUM(v.monto) AS ventas FROM ventas v JOIN locales l ON venta.local_id = l.id GROUP BY l.ciudad");
  await page.getByRole("button", { name: "Ejecutar" }).first().click();
  await expect(page.getByText("«venta» no es una tabla ni un alias de esta consulta.")).toBeVisible();

  await consultas.first().fill("SELECT l.ciudad, SUM(v.monto) AS ventas FROM ventas v JOIN locales l ON v.local_id = l.id GROUP BY l.ciudad");
  const primera = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).first().click();
  await primera;

  await consultas.nth(1).fill("SELECT p.nombre, SUM(v.cantidad) AS unidades FROM ventas v JOIN productos p ON v.producto_id = p.id GROUP BY p.nombre ORDER BY unidades DESC LIMIT 10");
  await page.getByRole("button", { name: "Validar" }).nth(1).click();
  await expect(page.getByText("Si hay valores empatados en tu ORDER BY, agrega otra columna para desempatar", { exact: false })).toBeVisible();
  await consultas.nth(1).fill("SELECT p.nombre, SUM(v.cantidad) AS unidades FROM ventas v JOIN productos p ON v.producto_id = p.id GROUP BY p.nombre ORDER BY unidades DESC, p.nombre LIMIT 10");
  await page.getByRole("button", { name: "Validar" }).nth(1).click();
  await expect(page.getByRole("heading", { name: "Misión aprobada" })).toBeVisible();
});
```

`e2e/tests/despachos.spec.ts` completo, ahora con el helper:
```ts
import { expect, test, type Page } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, MISIONES, registrarse } from "./progreso";

const CASO = "/casos/despachos-rapidos";
const CASO_1 = MISIONES["despachos-rapidos"];

async function escribir(page: Page, celda: string, formula: string) {
  await page.getByRole("button", { name: `Celda ${celda}`, exact: true }).click();
  await page.getByLabel("Fórmula").fill(formula);
  await page.getByLabel("Fórmula").press("Enter");
}

async function validarYEsperar(page: Page) {
  const reportado = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;
}

test("con el Caso 0 completo: busca en otra hoja, rellena hacia abajo y corrige la fórmula de la IA", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(240_000);
  const email = await registrarse(page, "Ignacia Soto");

  // El Caso 1 se habilita al completar el Caso 0, con su entregable aprobado.
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await completarCaso(page, admin, ip, email, "herramientas-del-oficio");

  await aprobar(page, ip, "despachos-rapidos", CASO_1.slice(0, 3));
  await page.goto(`${CASO}/04-buscar-en-otra-tabla`);
  await expect(page.getByRole("button", { name: "Celda B2", exact: true })).toHaveText(/^\d{2}\/03\/2025$/);

  await page.getByRole("tab", { name: "comunas", exact: true }).click();
  await expect(page.getByRole("table", { name: "Hoja comunas" })).toContainText("Valparaíso");
  await expect(page.getByLabel("Fórmula")).toBeDisabled();
  await page.getByRole("tab", { name: "despachos", exact: true }).click();

  await escribir(page, "I2", "=BUSCARV(D2;comunas!$A$2:$E$13;4;FALSO())");
  await expect(page.getByRole("button", { name: "Celda I2", exact: true })).toHaveText("3800");
  await page.getByRole("button", { name: "Rellenar hasta la fila 63" }).click();
  await expect(page.getByRole("button", { name: "Celda I63", exact: true })).toHaveText(/^\d+$/);
  await escribir(page, "J2", "=BUSCARX(D2;comunas!$A$2:$A$13;comunas!$E$2:$E$13)");
  await page.getByRole("button", { name: "Rellenar hasta la fila 63" }).click();
  await validarYEsperar(page);
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  await aprobar(page, ip, "despachos-rapidos", CASO_1.slice(4));
  await page.goto(`${CASO}/08-revisar-la-formula-de-la-ia`);
  await expect(page.getByRole("button", { name: "Celda I3", exact: true })).toHaveText("6200");
  await escribir(page, "I2", "=BUSCARV(D2;comunas!$A$2:$E$13;4;FALSO())");
  await page.getByRole("button", { name: "Rellenar hasta la fila 61" }).click();
  await expect(page.getByRole("button", { name: "Celda I3", exact: true })).toHaveText("3100");
  await validarYEsperar(page);
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();
});
```

En `e2e/calentar.ts`, agrega a `RUTAS`, antes de `"/casos/demo-motor"`:
```ts
  "/casos/minimarkets-del-sur",
  "/casos/minimarkets-del-sur/06-cruzar-tablas",
```

Run: `npm run test:e2e -- tests/minimarkets.spec.ts tests/despachos.spec.ts`
Expected: `2 passed`.

- [ ] **Step 2: README**

Agrega al final de `README.md`:
```markdown
## Caso 2: Minimarkets del Sur

- **Datos generados:** `packages/content/src/generadores/minimarkets-del-sur.ts`, con semilla fija.
  - 8 locales, 36 productos y 650 ventas de enero a marzo de 2025.
  - Están limpios a propósito: el caso trata de preguntar bien.
  - La historia que esconden: en marzo Osorno Centro vende un tercio de lo normal (remodelación) y la Kombucha artesanal nunca se vendió. Una prueba falla si un cambio en el generador borra esa historia.
- **Tareas SQL:** no llevan valores escritos a mano; el resultado esperado se calcula desde la solución. Toda tarea con `ORDER BY` + `LIMIT` que tenga empates en el corte pide el desempate en su enunciado.
- **e2e:** `e2e/tests/progreso.ts` completa los casos anteriores (misiones y entregable aprobado). Cada caso nuevo agrega ahí sus misiones.
```

- [ ] **Step 3: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes.

Run: `npm run test:e2e`
Expected: `34 passed`. Dos corridas seguidas deben dar lo mismo.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml up -d --force-recreate --wait web && for p in /casos/minimarkets-del-sur /casos/minimarkets-del-sur/06-cruzar-tablas; do curl -s -o /dev/null localhost:3000$p; curl -s -D - -o /dev/null localhost:3000$p | grep -i x-nextjs-cache; done; docker compose up -d --force-recreate web`
Expected: `x-nextjs-cache: HIT` dos veces. Al final, `web` vuelve a modo desarrollo.

- [ ] **Step 4: Recorrerlo como estudiante**

Con una cuenta que tenga los casos 0 y 1 completos, resuelve a mano las misiones 3, 6 y 8. Revisa tres cosas:
- que el empate del top 10 se entienda con el diagnóstico;
- que el error del alias en el `JOIN` se explique;
- que las cinco preguntas de la misión 8 se puedan responder solo con lo visto en el caso.

- [ ] **Step 5: Commit**

```bash
git add e2e README.md
git commit -m "test(e2e): caso 2 con join, error de alias explicado y desempate; helper para completar casos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Fase 4d: el Caso 3, Python con pandas, en "Tienda Online Pewen".**
- Un generador de pedidos, productos y clientes de un e-commerce, con defectos para limpiar: nulos, tipos y duplicados.
- Ocho misiones:
  1. De la planilla a Python;
  2. cargar y explorar;
  3. filtrar y seleccionar;
  4. limpiar;
  5. agrupar;
  6. cruzar con `merge`;
  7. detectar patrones;
  8. la misión sin guía, con recomendaciones para el negocio.
- Incluye la misión de "IA para analizar datos": revisar código de pandas escrito por un asistente.
- Usa las tablas de pandas visibles (Fase 3e2) y las tareas de Python que ya existen.

**Pendiente del equipo:** elegir el nombre de la clínica del Caso 4. La recomendación es "Clínica Cordillera Central".
