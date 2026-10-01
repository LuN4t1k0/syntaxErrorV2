# Fase 4b: Caso 1, Despachos Rápidos. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar el Caso 1 de la ruta Data Analyst, "Despachos Rápidos": nueve misiones de planilla con datos de una pyme de despachos.
- Fórmulas y referencias, totales y condiciones.
- Buscar en otra tabla, limpiar datos y resumir por comuna.
- Indicadores de entrega y la revisión de una fórmula escrita por una IA.
- Una misión final sin guía: el resumen para la dueña.

**Architecture:**
- **Datos generados con semilla fija:**
  - `packages/content/src/generadores/despachos-rapidos.ts` produce siempre los mismos CSV: comunas, despachos sin limpiar y despachos limpios.
  - Los defectos están en posiciones fijas: comunas con espacios o en otras mayúsculas, fechas guardadas como texto, costos vacíos y filas duplicadas.
  - `pnpm --filter @syntaxerror/content generar` escribe los CSV. Una prueba falla si alguien los edita a mano.
- **La planilla crece:**
  - **Varias hojas:** la principal se edita y las demás se consultan con referencias como `comunas!$A$2:$E$13`, con pestañas.
  - **Rellenar hacia abajo:** copia la fórmula ajustando las referencias, como Excel.
  - **Fechas legibles:** se muestran como DD/MM/AAAA, no como número de serie.
  - **Celdas iniciales por tarea:** títulos, un valor de referencia o una fórmula a corregir.
  - **Soluciones con rangos de una columna:** `"I2:I63": "=G2*(1+$K$2)"` escribe I2 y la rellena.
- **El caso:**
  - Va segundo en la ruta `data-analyst`, después del Caso 0.
  - Las misiones 1 a 5 trabajan sobre la planilla sin limpiar, para encontrar sus problemas. Desde la 6 se usa `despachos_limpios`.

**Tech Stack:** HyperFormula 3.4.0 (`esES`, `buildFromSheets`, `copy`/`paste`, `getCellValueDetailedType`), papaparse 5.7.0, Next.js 15, Vitest 4 y Playwright 1.55.

**Spec:** `docs/propuesta-pedagogica-data-analyst.md`:
- 4: cómo es una misión, con repaso intercalado;
- 5: misión sin guía;
- 8: Caso 1, Planillas, y el hilo "IA aplicada";
- 10: consolas.

También los acuerdos del equipo del 2026-10-01: la empresa es "Despachos Rápidos" y los datos son sintéticos, de un script reproducible, con defectos reales.

## Global Constraints

**Entorno y texto**
- Todo se ejecuta con `docker compose run --rm tools ...`.
- El texto visible va en español de Chile, tratando de tú, sin voseo y con lenguaje neutro.
- Las fórmulas del contenido usan `;` como separador, como Excel en español. La planilla acepta `;` y `,`, y los decimales van con punto (`0.19`); el Concepto de la misión 1 lo explica.

**Funciones de HyperFormula**
- No usar ninguna de estas (sondeado al planear):
  - no existen: `PROMEDIO.SI.CONJUNTO`, `DIAS`, `FECHANUMERO` con texto ISO;
  - no se comportan como en Excel: `SUMAPRODUCTO` con operaciones de matrices y el desborde de `UNICOS`.
- Las diferencias de fechas se calculan restando: `=C2-B2`.

**Datos**
- Los CSV de `content/casos/despachos-rapidos/datos/` salen solo del generador. Para cambiarlos se cambia el generador, se corre `generar` y se actualizan los valores esperados de las tareas.
- `BUSCARV` y `BUSCARX` no distinguen mayúsculas, pero sí los espacios. Por eso, en la misión 4, solo las filas con espacios de más (6 y 31) dan `#N/D`, y las tareas no revisan esas filas.

**Pedagogía**
- **Repaso intercalado:**
  - rellenar con `$` (misión 1) se usa de nuevo en las misiones 3 a 9;
  - `CONTAR.SI` y `SUMAR.SI` (misión 3) vuelven en las 6, 7 y 9;
  - `BUSCARV` (misión 4) vuelve en las 7, 8 y 9.
- **Misión 8 (IA):** la fórmula "del asistente" no da error pero trae 6200 en casi todas las filas. Se aprende a verificar contra los datos, no a desconfiar de la IA.
- **Misión 9:** es sin guía, sin concepto ni pistas. Pide columnas de apoyo que la persona decide.

**Páginas:** `/casos/[caso]` y `/casos/[caso]/[mision]` siguen estáticas, con `x-nextjs-cache: HIT`.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Rellenar una fórmula con la referencia al IVA sin `$`** (`=G2*(1+K2)`). Las filas de abajo apuntan a celdas vacías, y la tarea falla en I40 con "muestra … y se espera 4593.4". Rellenar respeta las referencias absolutas. Test en Task 1.
2. **Alguien corrige a mano un CSV del caso** en vez de cambiar el generador. La prueba "los CSV del repositorio son los generados" falla, y nadie publica datos que no se pueden reproducir. Test en Task 2.
3. **Fechas:**
   - una fecha como `2025-03-14` queda como texto (`ESNUMERO` da FALSO);
   - las fechas DD/MM/AAAA se muestran legibles y se restan como días;
   - un despacho devuelto, sin fecha de entrega, no rompe el promedio de días (`SI(C2="";"";…)`).

   Tests en Task 1 (motor) y Task 4 (validador del contenido).
4. **Una tarea mal escrita en el contenido:** una hoja que es a la vez principal y de consulta, o una clave de solución inválida (`i2`, `F2:G4`, `Comunas`). El validador o el esquema la rechazan antes de publicar. Tests en Task 3.
5. **Una persona intenta escribir en la hoja de consulta, o rellenar una celda sin fórmula.** La barra de fórmula queda desactivada en las pestañas de consulta, y "Rellenar" solo se activa con una fórmula en la hoja principal. Test e2e en Task 5.

## Estructura de archivos

```
packages/engines/src/sheet.ts                    OpcionesHoja, crearHoja con varias hojas e iniciales,
                                                 nombresDeHojas, rellenarHaciaAbajo, escribirRango,
                                                 mostrarValor; leer/dimensiones por hoja; aplicarSolucion
packages/content/src/generadores/aleatorio.ts    crearAleatorio (mulberry32)
packages/content/src/generadores/despachos-rapidos.ts
packages/content/src/generar-cli.ts              escribe los CSV generados
packages/content/src/esquemas.ts                 SheetTask: otras, inicial, soluciones con rangos
packages/content/src/datos.ts                    hojaDeTarea
packages/content/src/validar.ts                  valida con hojas de consulta e iniciales
apps/web/src/components/mision/sheet-task.tsx    pestañas, rellenar, fechas
apps/web/src/components/mision/componentes.tsx   SheetTask con hojaDeTarea
content/casos/despachos-rapidos/                 caso.yaml, datos/ (generados) y 9 misiones
content/rutas/data-analyst.yaml                  agrega despachos-rapidos
e2e/tests/despachos.spec.ts, e2e/calentar.ts
README.md
```

---

### Task 1: Planilla con varias hojas, rellenar hacia abajo y fechas

**Files:**
- Modify: `packages/engines/src/sheet.ts`
- Test: `packages/engines/src/sheet.test.ts`

**Interfaces:**
- Consumes: HyperFormula (`buildFromSheets`, `copy`, `paste`, `getSheetNames`, `getCellValueDetailedType`, `numberToDate`).
- Produces en `@syntaxerror/engines/sheet`:
  - `type OpcionesHoja = { nombre?: string; otras?: Record<string, Grilla>; inicial?: Record<string, string | number> }`;
  - `crearHoja(grilla, opciones?)`: la hoja 0 es la principal; `inicial` acepta celdas y rangos de una columna;
  - `nombresDeHojas(hoja): string[]`;
  - `rellenarHaciaAbajo(hoja, a1, hastaFila)`: `hastaFila` cuenta como en la planilla, la primera es 1;
  - `escribirRango(hoja, "F2" | "F2:F41", contenido)`;
  - `leerValor`, `leerFormula`, `dimensiones` y `mostrarValor`, que aceptan el índice de la hoja como último argumento (0 por defecto);
  - `mostrarValor(hoja, a1, indice?)`: muestra las fechas como DD/MM/AAAA;
  - `aplicarSolucion(grilla, solucion, opciones?)`: `solucion` acepta rangos de una columna.

Las llamadas existentes (`crearHoja(grilla)`, `leerValor(hoja, a1)`, `aplicarSolucion(grilla, solucion)`) siguen funcionando igual.

- [ ] **Step 1: Escribir las pruebas**

En `packages/engines/src/sheet.test.ts`:

1. Agrega al import de `./sheet`: `mostrarValor`, `nombresDeHojas` y `rellenarHaciaAbajo`.
2. Agrega al final:
```ts
describe("varias hojas, rellenar hacia abajo y fechas", () => {
  const despachos: Grilla = [
    ["id", "fecha_pedido", "fecha_entrega", "comuna", "costo"],
    [1001, "03/03/2025", "05/03/2025", "Maipú", 4700],
    [1002, "04/03/2025", "2025-03-06", "Ñuñoa", 3900],
    [1003, "05/03/2025", "06/03/2025", "Maipú", 5300],
  ];
  const comunas: Grilla = [
    ["comuna", "tarifa", "dias_compromiso"],
    ["Ñuñoa", 3100, 1],
    ["Maipú", 3500, 2],
  ];
  const opciones = { nombre: "despachos", otras: { comunas } };

  it("consulta otra hoja por su nombre", () => {
    const hoja = crearHoja(despachos, opciones);
    expect(nombresDeHojas(hoja)).toEqual(["despachos", "comunas"]);
    escribirCelda(hoja, "F2", "=BUSCARV(D2;comunas!A2:C3;2;FALSO())");
    expect(leerValor(hoja, "F2")).toBe(3500);
    expect(leerValor(hoja, "B3", 1)).toBe(3500);
  });

  it("rellena hacia abajo ajustando las referencias relativas y no las absolutas", () => {
    const hoja = crearHoja(despachos, { ...opciones, inicial: { H1: 0.19 } });
    escribirCelda(hoja, "F2", "=E2*(1+$H$1)");
    rellenarHaciaAbajo(hoja, "F2", 4);
    expect(leerFormula(hoja, "F4")).toBe("=E4*(1+$H$1)");
    expect(leerValor(hoja, "F4")).toBeCloseTo(6307, 4);
    expect(leerValor(hoja, "F5")).toBeNull();
  });

  it("aplica soluciones con rangos de una columna y celdas iniciales", () => {
    const hoja = aplicarSolucion(despachos, { "F2:F4": "=C2-B2", G2: "=PROMEDIO(F2:F4)" }, { ...opciones, inicial: { "H2:H4": "=D2" } });
    expect(leerValor(hoja, "F2")).toBe(2);
    expect(leerValor(hoja, "H4")).toBe("Maipú");
    expect(() => aplicarSolucion(despachos, { "F2:G4": "=1" }, opciones)).toThrow("El rango F2:G4 debe ser una sola columna");
  });

  it("muestra las fechas como DD/MM/AAAA y deja como texto las que no lo son", () => {
    const hoja = crearHoja(despachos, opciones);
    expect(mostrarValor(hoja, "B2")).toBe("03/03/2025");
    expect(mostrarValor(hoja, "C3")).toBe("2025-03-06");
    escribirCelda(hoja, "F2", "=C2-B2");
    expect(mostrarValor(hoja, "F2")).toBe("2");
    expect(mostrarValor(hoja, "A1", 1)).toBe("comuna");
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/sheet.test.ts`
Expected: FAIL, porque `nombresDeHojas`, `rellenarHaciaAbajo` y `mostrarValor` no existen.

- [ ] **Step 3: Implementar**

En `packages/engines/src/sheet.ts`, reemplaza desde `export function crearHoja` hasta el final de `dimensiones` por:
```ts
// Una tarea trabaja sobre su hoja principal (índice 0, la única que se edita) y puede consultar otras,
// por ejemplo «comunas», con referencias como comunas!A2:E13. «inicial» deja celdas escritas de antemano.
export type OpcionesHoja = { nombre?: string; otras?: Record<string, Grilla>; inicial?: Record<string, string | number> };

function normalizar(grilla: Grilla): Grilla {
  return grilla.map((fila) => fila.map((valor) => (typeof valor === "string" ? normalizarFormula(valor) : valor)));
}

export function crearHoja(grilla: Grilla, { nombre = "Hoja1", otras = {}, inicial = {} }: OpcionesHoja = {}): Hoja {
  const hojas: Record<string, Grilla> = { [nombre]: normalizar(grilla) };
  for (const [otra, datos] of Object.entries(otras)) hojas[otra] = normalizar(datos);
  const hoja = HyperFormula.buildFromSheets(hojas, { licenseKey: "gpl-v3", language: "esES" });
  for (const [rango, contenido] of Object.entries(inicial)) escribirRango(hoja, rango, contenido);
  return hoja;
}

export function nombresDeHojas(hoja: Hoja): string[] {
  return hoja.getSheetNames();
}

export function escribirCelda(hoja: Hoja, a1: string, contenido: string | number): void {
  const valor = typeof contenido === "string" ? normalizarFormula(contenido.trim()) : contenido;
  hoja.setCellContents({ sheet: 0, ...leerDireccion(a1) }, valor);
}

// Copia la fórmula de a1 a las filas de abajo, hasta «hastaFila» (como en la planilla: 1 es la primera),
// ajustando las referencias relativas igual que Excel al arrastrar.
export function rellenarHaciaAbajo(hoja: Hoja, a1: string, hastaFila: number): void {
  const { row, col } = leerDireccion(a1);
  hoja.copy({ start: { sheet: 0, row, col }, end: { sheet: 0, row, col } });
  for (let fila = row + 1; fila < hastaFila; fila += 1) hoja.paste({ sheet: 0, row: fila, col });
}

const RANGO_DE_COLUMNA = /^([A-Z]+)([1-9][0-9]*):([A-Z]+)([1-9][0-9]*)$/;

// "F2" escribe una celda; "F2:F41" escribe F2 y la rellena hacia abajo hasta F41.
export function escribirRango(hoja: Hoja, rango: string, contenido: string | number): void {
  const coincidencia = RANGO_DE_COLUMNA.exec(rango);
  if (!coincidencia) {
    escribirCelda(hoja, rango, contenido);
    return;
  }
  const [, desde, filaDesde, hasta, filaHasta] = coincidencia;
  if (desde !== hasta || Number(filaHasta) < Number(filaDesde)) throw new Error(`El rango ${rango} debe ser una sola columna, de arriba hacia abajo`);
  escribirCelda(hoja, `${desde}${filaDesde}`, contenido);
  rellenarHaciaAbajo(hoja, `${desde}${filaDesde}`, Number(filaHasta));
}

export function leerValor(hoja: Hoja, a1: string, indice = 0): unknown {
  return hoja.getCellValue({ sheet: indice, ...leerDireccion(a1) });
}

export function leerFormula(hoja: Hoja, a1: string, indice = 0): string | undefined {
  return hoja.getCellFormula({ sheet: indice, ...leerDireccion(a1) });
}

export function dimensiones(hoja: Hoja, indice = 0): { filas: number; columnas: number } {
  const { height, width } = hoja.getSheetDimensions(indice);
  return { filas: height, columnas: width };
}

const dosDigitos = (numero: number) => String(numero).padStart(2, "0");

// Lo que ve la persona en la celda: las fechas como DD/MM/AAAA, no como el número de serie que guarda la planilla.
export function mostrarValor(hoja: Hoja, a1: string, indice = 0): string {
  const direccion = { sheet: indice, ...leerDireccion(a1) };
  const valor = hoja.getCellValue(direccion);
  if (typeof valor === "number" && hoja.getCellValueDetailedType(direccion) === "NUMBER_DATE") {
    const fecha = hoja.numberToDate(valor);
    if ("year" in fecha) return `${dosDigitos(fecha.day)}/${dosDigitos(fecha.month)}/${fecha.year}`;
  }
  return formatearValor(valor);
}
```

Y reemplaza `aplicarSolucion` por:
```ts
export function aplicarSolucion(grilla: Grilla, solucion: Record<string, string | number>, opciones: OpcionesHoja = {}): Hoja {
  const hoja = crearHoja(grilla, opciones);
  for (const [rango, contenido] of Object.entries(solucion)) escribirRango(hoja, rango, contenido);
  return hoja;
}
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines test && pnpm --filter @syntaxerror/engines exec tsc --noEmit -p ."`
Expected: PASS (17 pruebas en `sheet.test.ts`) y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add packages/engines/src/sheet.ts packages/engines/src/sheet.test.ts
git commit -m "feat(planilla): varias hojas, rellenar hacia abajo, celdas iniciales y fechas legibles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Generador de datos de Despachos Rápidos

**Files:**
- Create:
  - `packages/content/src/generadores/aleatorio.ts`;
  - `packages/content/src/generadores/despachos-rapidos.ts`;
  - `packages/content/src/generar-cli.ts`.
- Test: `packages/content/src/generadores/despachos-rapidos.test.ts`
- Modify: `packages/content/package.json` (script `generar`)
- Create (generados): `content/casos/despachos-rapidos/datos/comunas.csv`, `despachos.csv` y `despachos_limpios.csv`

**Interfaces:**
- Produces en `generadores/aleatorio`: `crearAleatorio(semilla): Aleatorio`, con `siguiente`, `entero`, `elegir` y `elegirConPeso`.
- Produces en `generadores/despachos-rapidos`:
  - `SEMILLA`, `CANTIDAD_DESPACHOS = 60`, `COMUNAS` (12 filas) y `DEFECTOS`;
  - `generarDespachosRapidos(): { comunas; despachos; despachos_limpios }`;
  - `aCsv(filas): string`.
- Produces los datos que usan las misiones:
  - **`comunas`, filas 2 a 13:** comuna, region, zona, tarifa, dias_compromiso.
  - **`despachos`, filas 2 a 63:** id, fecha_pedido, fecha_entrega, comuna, cliente, peso_kg, costo, estado. Los 60 despachos más 2 duplicados al final, con los defectos en estas posiciones (índice desde 0, fila = índice + 2):
    - comuna mal escrita en los índices 4, 17, 29 y 41;
    - fecha de entrega como texto ISO en los 9, 33 y 52;
    - costo vacío en los 12 y 47;
    - copias de los 21 y 38 al final.
  - **`despachos_limpios`, filas 2 a 61:** los mismos 60 despachos, sin defectos.

- [ ] **Step 1: Escribir las pruebas**

`packages/content/src/generadores/despachos-rapidos.test.ts`:
```ts
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { crearAleatorio } from "./aleatorio";
import { aCsv, CANTIDAD_DESPACHOS, COMUNAS, DEFECTOS, generarDespachosRapidos } from "./despachos-rapidos";

const DATOS = fileURLToPath(new URL("../../../../content/casos/despachos-rapidos/datos/", import.meta.url));
const FECHA = /^\d{2}\/\d{2}\/2025$/;
const NOMBRES = new Set(COMUNAS.map((fila) => fila.comuna));

describe("crearAleatorio", () => {
  it("con la misma semilla repite la secuencia", () => {
    const a = crearAleatorio(7);
    const b = crearAleatorio(7);
    expect([a.siguiente(), a.entero(1, 6), a.elegir(["x", "y"])]).toEqual([b.siguiente(), b.entero(1, 6), b.elegir(["x", "y"])]);
  });
});

describe("generarDespachosRapidos", () => {
  const datos = generarDespachosRapidos();

  it("genera siempre lo mismo", () => {
    expect(generarDespachosRapidos()).toEqual(datos);
  });

  it("los CSV del repositorio son los generados: no se editan a mano", async () => {
    for (const [tabla, filas] of Object.entries(datos)) {
      expect(await readFile(`${DATOS}${tabla}.csv`, "utf8"), tabla).toBe(aCsv(filas));
    }
  });

  it("la versión limpia no tiene defectos", () => {
    const limpios = datos.despachos_limpios;
    expect(limpios).toHaveLength(CANTIDAD_DESPACHOS);
    expect(new Set(limpios.map((fila) => fila.id)).size).toBe(CANTIDAD_DESPACHOS);
    for (const fila of limpios) {
      expect(NOMBRES.has(fila.comuna)).toBe(true);
      expect(fila.fecha_pedido).toMatch(FECHA);
      expect(typeof fila.costo).toBe("number");
      if (fila.estado === "devuelto") expect(fila.fecha_entrega).toBeNull();
      else expect(fila.fecha_entrega).toMatch(FECHA);
    }
  });

  it("la versión sin limpiar trae los defectos que enseña el caso, en sus posiciones", () => {
    const sucios = datos.despachos;
    expect(sucios).toHaveLength(CANTIDAD_DESPACHOS + DEFECTOS.duplicados.length);
    for (const indice of Object.keys(DEFECTOS.comunaMalEscrita).map(Number)) {
      expect(NOMBRES.has(sucios[indice].comuna), String(sucios[indice].comuna)).toBe(false);
      expect(String(sucios[indice].comuna).trim().toLowerCase()).toBe(String(datos.despachos_limpios[indice].comuna).toLowerCase());
    }
    for (const indice of DEFECTOS.fechaComoTexto) expect(sucios[indice].fecha_entrega).toMatch(/^2025-\d{2}-\d{2}$/);
    for (const indice of DEFECTOS.costoVacio) expect(sucios[indice].costo).toBeNull();
    expect(sucios.slice(CANTIDAD_DESPACHOS)).toEqual(DEFECTOS.duplicados.map((indice) => sucios[indice]));
  });

  it("tiene variedad para los resúmenes: devoluciones, atrasos y comunas con distinto volumen", () => {
    const limpios = datos.despachos_limpios;
    expect(limpios.filter((fila) => fila.estado === "devuelto").length).toBeGreaterThanOrEqual(3);
    expect(new Set(limpios.map((fila) => fila.comuna)).size).toBeGreaterThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/generadores`
Expected: FAIL, "Failed to resolve import ./aleatorio".

- [ ] **Step 3: Implementar**

`packages/content/src/generadores/aleatorio.ts`:
```ts
// Números pseudoaleatorios con semilla (mulberry32): la misma semilla produce siempre los mismos datos,
// así las soluciones de las tareas no cambian al volver a generar.
export type Aleatorio = {
  siguiente(): number;
  entero(minimo: number, maximo: number): number;
  elegir<T>(opciones: readonly T[]): T;
  elegirConPeso<T>(opciones: readonly (readonly [T, number])[]): T;
};

export function crearAleatorio(semilla: number): Aleatorio {
  let estado = semilla >>> 0;
  const siguiente = () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    siguiente,
    entero: (minimo, maximo) => minimo + Math.floor(siguiente() * (maximo - minimo + 1)),
    elegir: (opciones) => opciones[Math.floor(siguiente() * opciones.length)],
    elegirConPeso: (opciones) => {
      const total = opciones.reduce((suma, [, peso]) => suma + peso, 0);
      let punto = siguiente() * total;
      for (const [opcion, peso] of opciones) {
        punto -= peso;
        if (punto < 0) return opcion;
      }
      return opciones[opciones.length - 1][0];
    },
  };
}
```

`packages/content/src/generadores/despachos-rapidos.ts`:
```ts
import Papa from "papaparse";
import { crearAleatorio } from "./aleatorio";

// Datos del Caso 1, "Despachos Rápidos": una pyme de despachos de la Región Metropolitana y regiones, marzo de 2025.
// Son inventados, pero con los defectos de una planilla real, que el caso enseña a encontrar y limpiar (misión 5).

export type FilaDato = Record<string, string | number | null>;
export type DatosDespachos = { comunas: FilaDato[]; despachos: FilaDato[]; despachos_limpios: FilaDato[] };

export const SEMILLA = 20250301;
export const CANTIDAD_DESPACHOS = 60;
const PRIMER_ID = 1001;
const COSTO_POR_KILO = 120;

export const COMUNAS: FilaDato[] = [
  { comuna: "Santiago", region: "Metropolitana", zona: "Centro", tarifa: 2900, dias_compromiso: 1 },
  { comuna: "Providencia", region: "Metropolitana", zona: "Oriente", tarifa: 3100, dias_compromiso: 1 },
  { comuna: "Ñuñoa", region: "Metropolitana", zona: "Oriente", tarifa: 3100, dias_compromiso: 1 },
  { comuna: "Las Condes", region: "Metropolitana", zona: "Oriente", tarifa: 3400, dias_compromiso: 2 },
  { comuna: "La Florida", region: "Metropolitana", zona: "Sur", tarifa: 3300, dias_compromiso: 2 },
  { comuna: "Puente Alto", region: "Metropolitana", zona: "Sur", tarifa: 3800, dias_compromiso: 2 },
  { comuna: "Maipú", region: "Metropolitana", zona: "Poniente", tarifa: 3500, dias_compromiso: 2 },
  { comuna: "Pudahuel", region: "Metropolitana", zona: "Poniente", tarifa: 3600, dias_compromiso: 2 },
  { comuna: "Quilicura", region: "Metropolitana", zona: "Norte", tarifa: 3700, dias_compromiso: 2 },
  { comuna: "San Bernardo", region: "Metropolitana", zona: "Sur", tarifa: 3900, dias_compromiso: 2 },
  { comuna: "Rancagua", region: "O'Higgins", zona: "Regiones", tarifa: 5900, dias_compromiso: 3 },
  { comuna: "Valparaíso", region: "Valparaíso", zona: "Regiones", tarifa: 6200, dias_compromiso: 3 },
];

// Más pedidos donde vive más gente: así los resúmenes por comuna no salen parejos.
const PESO_COMUNA: Record<string, number> = { Maipú: 9, "Puente Alto": 8, Santiago: 7, "La Florida": 6, Ñuñoa: 5, Providencia: 4 };

// Los defectos, en posiciones fijas (índice de despacho, desde 0) para que las tareas puedan apuntar a ellos.
export const DEFECTOS = {
  comunaMalEscrita: { 4: (comuna: string) => `  ${comuna}`, 17: (comuna: string) => comuna.toLowerCase(), 29: (comuna: string) => `${comuna}  `, 41: (comuna: string) => comuna.toUpperCase() } as Record<number, (comuna: string) => string>,
  fechaComoTexto: [9, 33, 52],
  costoVacio: [12, 47],
  duplicados: [21, 38],
};

const dosDigitos = (numero: number) => String(numero).padStart(2, "0");
const fechaChilena = (fecha: Date) => `${dosDigitos(fecha.getUTCDate())}/${dosDigitos(fecha.getUTCMonth() + 1)}/${fecha.getUTCFullYear()}`;
const fechaIso = (fecha: Date) => `${fecha.getUTCFullYear()}-${dosDigitos(fecha.getUTCMonth() + 1)}-${dosDigitos(fecha.getUTCDate())}`;
const sumarDias = (fecha: Date, dias: number) => new Date(fecha.getTime() + dias * 86_400_000);

export function generarDespachosRapidos(): DatosDespachos {
  const aleatorio = crearAleatorio(SEMILLA);
  const pesos = COMUNAS.map((fila) => [fila, PESO_COMUNA[String(fila.comuna)] ?? 2] as const);
  const limpios: FilaDato[] = [];
  const entregas: Date[] = [];
  for (let indice = 0; indice < CANTIDAD_DESPACHOS; indice += 1) {
    const comuna = aleatorio.elegirConPeso(pesos);
    const pedido = new Date(Date.UTC(2025, 2, aleatorio.entero(1, 27)));
    const compromiso = Number(comuna.dias_compromiso);
    const demora = Math.max(1, compromiso + aleatorio.elegirConPeso([[-1, 2], [0, 6], [1, 2], [2, 1]] as const));
    const devuelto = aleatorio.siguiente() < 0.12 && !DEFECTOS.fechaComoTexto.includes(indice) && !DEFECTOS.duplicados.includes(indice);
    const peso = aleatorio.entero(1, 20);
    const entrega = sumarDias(pedido, demora);
    entregas.push(entrega);
    limpios.push({
      id: PRIMER_ID + indice,
      fecha_pedido: fechaChilena(pedido),
      fecha_entrega: devuelto ? null : fechaChilena(entrega),
      comuna: comuna.comuna,
      cliente: aleatorio.elegirConPeso([["persona", 3], ["empresa", 2]] as const),
      peso_kg: peso,
      costo: Number(comuna.tarifa) + peso * COSTO_POR_KILO,
      estado: devuelto ? "devuelto" : "entregado",
    });
  }

  const despachos = limpios.map((fila, indice) => {
    const sucia = { ...fila };
    const malEscrita = DEFECTOS.comunaMalEscrita[indice];
    if (malEscrita) sucia.comuna = malEscrita(String(fila.comuna));
    if (DEFECTOS.fechaComoTexto.includes(indice)) sucia.fecha_entrega = fechaIso(entregas[indice]);
    if (DEFECTOS.costoVacio.includes(indice)) sucia.costo = null;
    return sucia;
  });
  for (const indice of DEFECTOS.duplicados) despachos.push({ ...despachos[indice] });

  return { comunas: COMUNAS, despachos, despachos_limpios: limpios };
}

export function aCsv(filas: FilaDato[]): string {
  return `${Papa.unparse(filas, { newline: "\n" })}\n`;
}
```

`packages/content/src/generar-cli.ts`:
```ts
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aCsv, generarDespachosRapidos } from "./generadores/despachos-rapidos";

// Escribe los datos generados de cada caso en content/casos/<caso>/datos/. Se corre después de cambiar un generador.
const CONTENIDO = fileURLToPath(new URL("../../../content", import.meta.url));

const generadores: Record<string, () => Record<string, Record<string, string | number | null>[]>> = {
  "despachos-rapidos": generarDespachosRapidos,
};

for (const [caso, generar] of Object.entries(generadores)) {
  for (const [tabla, filas] of Object.entries(generar())) {
    const archivo = path.join(CONTENIDO, "casos", caso, "datos", `${tabla}.csv`);
    await writeFile(archivo, aCsv(filas));
    console.log(`[content] ${path.relative(CONTENIDO, archivo)}: ${filas.length} filas`);
  }
}
```

En `packages/content/package.json`, agrega a `scripts`:
```json
    "generar": "tsx src/generar-cli.ts"
```

- [ ] **Step 4: Generar los datos y correr las pruebas**

Run: `mkdir -p content/casos/despachos-rapidos/datos && docker compose run --rm tools pnpm --filter @syntaxerror/content generar`
Expected:
```
[content] casos/despachos-rapidos/datos/comunas.csv: 12 filas
[content] casos/despachos-rapidos/datos/despachos.csv: 62 filas
[content] casos/despachos-rapidos/datos/despachos_limpios.csv: 60 filas
```

Revisa las primeras líneas de `despachos.csv`. Deben ser exactamente estas; si no lo son, el generador no es idéntico al del plan:
```
id,fecha_pedido,fecha_entrega,comuna,cliente,peso_kg,costo,estado
1001,01/03/2025,03/03/2025,Puente Alto,persona,19,6080,entregado
1002,12/03/2025,13/03/2025,Ñuñoa,empresa,2,3340,entregado
```

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content exec vitest run src/generadores && pnpm --filter @syntaxerror/content exec tsc --noEmit -p ."`
Expected: PASS (6 pruebas) y sin errores de tipos.

La prueba `contenido-real.test.ts` falla hasta la Task 4, porque la carpeta del caso todavía no tiene `caso.yaml`.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/generadores packages/content/src/generar-cli.ts packages/content/package.json content/casos/despachos-rapidos/datos
git commit -m "feat(contenido): generador reproducible de los datos de despachos rapidos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Tareas de planilla con hojas de consulta en el contenido y en la misión

**Files:**
- Modify:
  - `packages/content/src/esquemas.ts`, `packages/content/src/datos.ts`, `packages/content/src/validar.ts`;
  - `apps/web/src/components/mision/componentes.tsx`, `apps/web/src/components/mision/sheet-task.tsx`.
- Test: `packages/content/src/validar.test.ts`, `packages/content/src/bloques.test.ts`

**Interfaces:**
- Consumes: `OpcionesHoja`, `crearHoja`, `aplicarSolucion`, `rellenarHaciaAbajo`, `mostrarValor` y `nombresDeHojas` (Task 1).
- Produces en `bloqueSchemas.SheetTask`:
  - `otras: string[]` (por defecto `[]`);
  - `inicial: Record<celda o rango, string | number>` (por defecto `{}`);
  - `solucion` con claves de celda (`F2`) o rango de una columna (`F2:F41`).
- Produces en `@syntaxerror/content/datos`: `hojaDeTarea(caso, { hoja, otras, inicial }): { grilla; opciones: OpcionesHoja }`.
- Produces en `SheetTask`: la prop `opciones?: OpcionesHoja`. Además:
  - pestañas (`role="tab"`) con el nombre de cada hoja; las de consulta son de solo lectura y desactivan la barra de fórmula;
  - el botón "Rellenar hasta la fila N", donde N es la última fila de los datos de la hoja principal.

- [ ] **Step 1: Escribir las pruebas**

En `packages/content/src/validar.test.ts`, antes de `it("rechaza un Brief de más de 150 palabras"`, agrega:
```ts
  it("una tarea de planilla no puede consultar su propia hoja", async () => {
    const tarea = bloque(mision("02-hoja"), "SheetTask");
    tarea.props.otras = [tarea.props.hoja];
    expect(await validar()).toContain(
      `casos/ventas/misiones/02-hoja.mdx: la solución de la tarea "total" no pasa su propio validador: la hoja ${tarea.props.hoja} no puede ser también una hoja de consulta`
    );
  });
```

Al final de `packages/content/src/bloques.test.ts`, agrega:
```ts
describe("tareas de planilla con varias hojas", () => {
  it("aceptan hojas de consulta, celdas iniciales y soluciones con rangos de una columna", async () => {
    const { bloqueSchemas } = await import("./esquemas");
    const base = { id: "x", hoja: "despachos", celdas: [{ celda: "I2", valor: 1 }] };
    const tarea = bloqueSchemas.SheetTask.parse({ ...base, otras: ["comunas"], inicial: { K2: 0.19, "I2:I10": "=1" }, solucion: { "I2:I63": "=G2" } });
    expect(tarea).toMatchObject({ otras: ["comunas"], inicial: { K2: 0.19, "I2:I10": "=1" } });
    expect(bloqueSchemas.SheetTask.parse({ ...base, solucion: { I2: "=1" } })).toMatchObject({ otras: [], inicial: {} });
    expect(bloqueSchemas.SheetTask.safeParse({ ...base, solucion: { i2: "=1" } }).success).toBe(false);
    expect(bloqueSchemas.SheetTask.safeParse({ ...base, otras: ["Comunas"], solucion: { I2: "=1" } }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/validar.test.ts src/bloques.test.ts`
Expected: FAIL, porque `otras` e `inicial` no existen en el esquema.

- [ ] **Step 3: Esquema, datos y validador**

En `packages/content/src/esquemas.ts`:

1. Antes de `const celdaEsperada`, agrega:
```ts
const nombreHoja = z.string().regex(/^[a-z_][a-z0-9_]*$/, "debe ser el nombre de un CSV de datos/");
// Una celda (F2) o una columna que se rellena hacia abajo desde la primera (F2:F41).
const rangoCeldas = z.string().regex(/^[A-Z]+[1-9][0-9]*(?::[A-Z]+[1-9][0-9]*)?$/, "debe ser una celda como F2 o un rango de una columna como F2:F41");
const contenidoCelda = z.union([z.string(), z.number()]);
```
2. En `SheetTask`, reemplaza las líneas de `hoja`, `celdas` y `solucion` por:
```ts
    hoja: nombreHoja,
    // Hojas de consulta (por ejemplo comunas), que se leen con referencias como comunas!A2:E13.
    otras: z.array(nombreHoja).default([]),
    // Celdas escritas de antemano: títulos de columna, un valor de referencia o una fórmula a corregir.
    inicial: z.record(rangoCeldas, contenidoCelda).default({}),
    celdas: z.array(celdaEsperada).min(1, "indica al menos una celda a revisar"),
    solucion: z.record(rangoCeldas, contenidoCelda),
```

En `packages/content/src/datos.ts`:

1. Cambia el import de planilla por:
```ts
import { grillaDesdeFilas, type Grilla, type OpcionesHoja } from "@syntaxerror/engines/sheet";
```
2. Agrega al final:
```ts
// La hoja principal de una tarea de planilla, con sus hojas de consulta y sus celdas iniciales.
export function hojaDeTarea(caso: Caso, tarea: { hoja: string; otras: string[]; inicial: Record<string, string | number> }): { grilla: Grilla; opciones: OpcionesHoja } {
  const otras = Object.fromEntries(tarea.otras.map((nombre) => [nombre, grillaDeHoja(caso, nombre)]));
  return { grilla: grillaDeHoja(caso, tarea.hoja), opciones: { nombre: tarea.hoja, otras, inicial: tarea.inicial } };
}
```

En `packages/content/src/validar.ts`:

1. Cambia `import { grillaDeHoja, tablasSql } from "./datos";` por `import { hojaDeTarea, tablasSql } from "./datos";`.
2. Reemplaza el caso `"SheetTask"` de `revisarSolucion` por:
```ts
    case "SheetTask": {
      if (tarea.props.otras.includes(tarea.props.hoja)) return { aprobada: false, diagnostico: `la hoja ${tarea.props.hoja} no puede ser también una hoja de consulta` };
      const { grilla, opciones } = hojaDeTarea(caso, tarea.props);
      return revisarHoja(aplicarSolucion(grilla, tarea.props.solucion, opciones), tarea.props);
    }
```

- [ ] **Step 4: La tarea de planilla en la misión**

En `apps/web/src/components/mision/componentes.tsx`:

1. Cambia `grillaDeHoja` por `hojaDeTarea` en el import de `@syntaxerror/content/datos`.
2. Reemplaza el cuerpo de `SheetTask` por:
```tsx
      const { solucion: _solucion, ...resto } = bloqueSchemas.SheetTask.parse(props);
      const { grilla, opciones } = hojaDeTarea(caso, resto);
      const { hoja: _hoja, otras: _otras, inicial: _inicial, ...tarea } = resto;
      return <SheetTask {...tarea} grilla={grilla} opciones={opciones} />;
```

`apps/web/src/components/mision/sheet-task.tsx` completo:
```tsx
"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@syntaxerror/ui/cn";
import { Button } from "@syntaxerror/ui/components/button";
import { columnaALetra, crearHoja, dimensiones, escribirCelda, leerDireccion, leerFormula, leerValor, mostrarValor, nombresDeHojas, rellenarHaciaAbajo, revisarHoja, type CeldaEsperada, type Grilla, type OpcionesHoja } from "@syntaxerror/engines/sheet";
import { aplicarSugerencia, explicarErrorHoja, funcionEnEscritura, sugerenciasDeFuncion } from "@syntaxerror/engines/sheet-ayuda";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { ExplicacionError } from "@/components/consola/explicacion";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";

export type SheetTaskProps = { id: string; enunciado?: string; grilla: Grilla; opciones?: OpcionesHoja; celdas: CeldaEsperada[]; pistas: string[] };
const COLUMNAS_EXTRA = 2;
const FILAS_EXTRA = 1;

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

export function SheetTask({ id, enunciado, grilla, opciones = {}, celdas, pistas }: SheetTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const [hoja, setHoja] = useState(() => crearHoja(grilla, opciones));
  const [version, setVersion] = useState(0);
  const [indice, setIndice] = useState(0);
  const [seleccionada, setSeleccionada] = useState(celdas[0]?.celda ?? "A1");
  const [entrada, setEntrada] = useState("");
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const nombres = useMemo(() => nombresDeHojas(hoja), [hoja]);
  const editable = indice === 0;
  // Rellenar llega hasta la última fila de los datos originales, como al hacer doble clic en el borde en Excel.
  const ultimaFila = Math.max(grilla.length, 2);
  const filaSeleccionada = leerDireccion(seleccionada).row + 1;
  const puedeRellenar = editable && Boolean(leerFormula(hoja, seleccionada)) && filaSeleccionada < ultimaFila;
  const errorCelda = useMemo(() => (editable ? explicarErrorHoja(leerValor(hoja, seleccionada)) : null), [hoja, seleccionada, version, editable]);
  const objetivos = useMemo(() => new Set(celdas.map((celda) => celda.celda)), [celdas]);
  const tamano = useMemo(() => {
    const { filas, columnas } = dimensiones(hoja, indice);
    if (!editable) return { filas, columnas };
    const posiciones = celdas.map((celda) => leerDireccion(celda.celda));
    return { filas: Math.max(filas, ...posiciones.map((posicion) => posicion.row + 1)) + FILAS_EXTRA, columnas: Math.max(columnas, ...posiciones.map((posicion) => posicion.col + 1)) + COLUMNAS_EXTRA };
  }, [hoja, celdas, version, indice, editable]);

  function sugerir(nombre: string) {
    setEntrada((actual) => aplicarSugerencia(actual, nombre));
    campo.current?.focus();
  }
  function seleccionar(a1: string) {
    setSeleccionada(a1);
    setEntrada(leerFormula(hoja, a1) ?? mostrarValor(hoja, a1));
  }
  function aplicar() {
    escribirCelda(hoja, seleccionada, entrada);
    setVersion((actual) => actual + 1);
  }
  function rellenar() {
    rellenarHaciaAbajo(hoja, seleccionada, ultimaFila);
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
    setHoja(crearHoja(grilla, opciones));
    setIndice(0);
    setEntrada("");
    setResultado(null);
  }
  return (
    <PanelTarea id={id} titulo="tarea de planilla" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<><Button type="button" onClick={validar}>Validar</Button><Button type="button" variant="secondary" onClick={reiniciar}>Reiniciar hoja</Button></>}>
      <div className="flex flex-wrap items-end gap-2">
        <span className="rounded-md border border-border bg-surface-raised px-3 py-2 font-mono text-sm font-bold">{seleccionada}</span>
        <label className="grid flex-1 gap-1 text-sm font-bold">Fórmula<input ref={campo} value={entrada} onChange={(evento) => setEntrada(evento.target.value)} onKeyDown={alPresionar} disabled={!editable} spellCheck={false} autoComplete="off" aria-describedby="ayuda-formula" placeholder="=SUMA(D2:D7)" className="field font-mono" /></label>
        <Button type="button" variant="secondary" disabled={!editable} onClick={aplicar}>Aplicar</Button>
        <Button type="button" variant="secondary" disabled={!puedeRellenar} onClick={rellenar} title="Copia la fórmula de la celda seleccionada en las filas de abajo, ajustando las referencias">{`Rellenar hasta la fila ${ultimaFila}`}</Button>
      </div>
      <AyudaFormula entrada={entrada} onSugerencia={sugerir} />
      {errorCelda ? <ExplicacionError error={{ ...errorCelda, mensaje: `${seleccionada}: ${errorCelda.mensaje}` }} /> : null}
      {nombres.length > 1 ? (
        <div className="grid gap-2">
          <div role="tablist" aria-label="Hojas" className="flex flex-wrap gap-1">
            {nombres.map((nombre, posicion) => (
              <button key={nombre} type="button" role="tab" aria-selected={indice === posicion} onClick={() => setIndice(posicion)} className={cn("rounded-t-md border border-b-0 border-border px-3 py-1 font-mono text-sm", indice === posicion ? "bg-primary/10 font-bold" : "text-muted-foreground")}>
                {nombre}
              </button>
            ))}
          </div>
          {!editable ? <p className="text-sm text-muted-foreground">{`La hoja «${nombres[indice]}» es de consulta. Escribe tus fórmulas en «${nombres[0]}» y usa referencias como ${nombres[indice]}!A2:B10.`}</p> : null}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="border-collapse font-mono text-sm" aria-label={`Hoja ${nombres[indice]}`}>
          <thead><tr><th className="w-10 bg-surface-raised" />{Array.from({ length: tamano.columnas }, (_, columna) => <th key={columna} className="min-w-24 border-l border-border bg-surface-raised px-2 py-1">{columnaALetra(columna)}</th>)}</tr></thead>
          <tbody>
            {Array.from({ length: tamano.filas }, (_, fila) => (
              <tr key={fila}>
                <th className="bg-surface-raised px-2 py-1 text-muted-foreground">{fila + 1}</th>
                {Array.from({ length: tamano.columnas }, (_, columna) => {
                  const a1 = `${columnaALetra(columna)}${fila + 1}`;
                  const texto = mostrarValor(hoja, a1, indice);
                  if (!editable) return <td key={a1} className="h-8 min-w-24 truncate border-l border-t border-border px-2">{texto}</td>;
                  return <td key={a1} className="border-l border-t border-border p-0"><button type="button" aria-label={`Celda ${a1}`} onClick={() => seleccionar(a1)} className={cn("block h-8 w-full min-w-24 truncate px-2 text-left", objetivos.has(a1) && "bg-primary/10", seleccionada === a1 && "outline outline-2 -outline-offset-2 outline-primary")}>{texto}</button></td>;
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

- [ ] **Step 5: Correr las pruebas y los tipos**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content exec vitest run src/validar.test.ts src/bloques.test.ts && pnpm --filter @syntaxerror/content exec tsc --noEmit -p . && cd apps/web && pnpm exec tsc --noEmit -p . && pnpm exec vitest run"`
Expected: PASS y sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add packages/content/src apps/web/src/components/mision
git commit -m "feat(planilla): tareas con hojas de consulta, celdas iniciales, rellenar y pestanas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: El contenido del Caso 1

**Files:**
- Create: `content/casos/despachos-rapidos/caso.yaml` y sus 9 misiones
- Modify: `content/rutas/data-analyst.yaml`

**Interfaces:**
- Consumes: los datos de la Task 2 y `SheetTask` con `otras`, `inicial` y rangos (Task 3).
- Produces:
  - el caso `despachos-rapidos`, segundo en la ruta;
  - estos ids de tarea, que usa el e2e de la Task 5:
    1. `costo-con-iva`;
    2. `totales`;
    3. `condiciones`;
    4. `buscar-tarifas`;
    5. `marcar-problemas`;
    6. `resumen-por-comuna`;
    7. `indicadores`;
    8. `corregir-buscarv`;
    9. `resumen-de-marzo`.

El recorrido del caso:

| # | Misión | Hoja principal (consulta) | Lo que se practica | Repasa |
|---|---|---|---|---|
| 1 | Conoce la planilla | despachos | referencias, `$`, rellenar | |
| 2 | Los totales del mes | despachos | `SUMA`, `PROMEDIO`, `CONTAR`, `CONTARA`, `REDONDEAR` | |
| 3 | Condiciones | despachos | `SI`, `CONTAR.SI`, `SUMAR.SI` | 1 |
| 4 | Buscar en otra tabla | despachos (comunas) | `BUSCARV`, `BUSCARX`, `#N/D` | 1 |
| 5 | Limpiar los datos | despachos | `ESPACIOS`, `NOMPROPIO`, duplicados, `ESNUMERO` | 3 y 4 |
| 6 | Resumir por comuna | comunas (despachos_limpios) | la tabla dinámica con fórmulas | 3 |
| 7 | Indicadores de entrega | despachos_limpios (comunas) | restar fechas, `SI` anidado, porcentajes | 3 y 4 |
| 8 | Revisar la fórmula de la IA | despachos_limpios (comunas) | verificar una fórmula de un asistente | 4 |
| 9 | El resumen para la dueña (sin guía) | despachos_limpios (comunas) | todo el caso | todo |

Todos los valores esperados se calcularon aplicando la solución a los datos generados, y el validador lo comprueba en el Step 3.

- [ ] **Step 1: Caso y ruta**

`content/casos/despachos-rapidos/caso.yaml`:
```yaml
slug: despachos-rapidos
titulo: "Despachos Rápidos: ordenar el mes con planillas"
cargo: Analista de datos junior
empresa: Despachos Rápidos
dataset: Despachos de marzo de 2025 y tarifas por comuna (datos generados con un script reproducible)
entregable: Un repositorio en GitHub con tu planilla del análisis (.xlsx), con una hoja de conclusiones, y un README que explique qué encontraste y qué le recomiendas a la dueña.
archivos:
  - .xlsx
rubrica:
  - "Responde las preguntas de Carla con números que salen de la planilla."
  - "La planilla se entiende: columnas con título, fórmulas en vez de números escritos a mano y los datos limpios separados de los originales."
  - "El README explica qué se encontró y qué se recomienda, con los datos que lo respaldan."
misiones:
  - 01-conoce-la-planilla
  - 02-totales-del-mes
  - 03-condiciones
  - 04-buscar-en-otra-tabla
  - 05-limpiar-los-datos
  - 06-resumir-por-comuna
  - 07-indicadores-de-entrega
  - 08-revisar-la-formula-de-la-ia
  - 09-resumen-para-la-duena
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
```

- [ ] **Step 2: Las misiones**

`content/casos/despachos-rapidos/misiones/01-conoce-la-planilla.mdx`:
```mdx
---
titulo: Conoce la planilla
tiempo: 20
---

<Brief de="Carla Muñoz, dueña de Despachos Rápidos">
Hola, bienvenida o bienvenido. Somos una pyme de despachos: llevamos pedidos a comunas de Santiago y a un par de ciudades de regiones. Te dejé la planilla de marzo tal como la llevamos, con sus errores. Partamos por algo simple: necesito ver cada costo con IVA incluido, en una columna nueva, para cotizar con las empresas.
</Brief>

<Concepto>
Una planilla es una grilla: las **columnas** tienen letras (A, B, C…) y las **filas**, números. Cada celda tiene una dirección, como `G2`: columna G, fila 2. Un **rango** es un grupo de celdas, como `G2:G63`.

Una fórmula empieza con `=` y puede usar otras celdas: `=G2+1000` suma mil pesos al costo de la fila 2. Al **rellenar hacia abajo**, la planilla copia la fórmula en cada fila y ajusta las referencias: en la fila 3 queda `=G3+1000`.

Si el valor del IVA está en una celda, por ejemplo `K2`, la referencia tiene que quedar fija al rellenar: eso se escribe `$K$2`. El `$` fija la columna y la fila.

- `=G2*(1+K2)` → en la fila 3 queda `=G3*(1+K3)`, y `K3` está vacía: error.
- `=G2*(1+$K$2)` → en la fila 3 queda `=G3*(1+$K$2)`: correcto.

En esta planilla escribes la fórmula en la barra **Fórmula**, la aplicas y usas **Rellenar hasta la fila…** para copiarla hacia abajo. Los decimales se escriben con punto (`0.19`); en Excel en español van con coma.
</Concepto>

<SheetTask
  id="costo-con-iva"
  hoja="despachos"
  inicial={{ I1: "costo_con_iva", K1: "IVA", K2: 0.19 }}
  enunciado="En la columna I calcula el costo con IVA de cada despacho, usando el IVA de la celda K2. Escribe la fórmula en I2 y rellénala hasta la última fila."
  celdas={[{ celda: "I2", valor: 7235.2 }, { celda: "I40", valor: 4593.4 }, { celda: "I63", valor: 4593.4 }]}
  solucion={{ "I2:I63": "=G2*(1+$K$2)" }}
  pistas={["El costo está en la columna G y el IVA en K2.", "Si al rellenar aparecen ceros o errores, revisa que la referencia al IVA esté fija: $K$2.", "La fórmula de I2 es el costo de G2 multiplicado por (1 + el IVA)."]}
/>

<Decision
  pregunta="En la fila 14 el costo con IVA da 0. ¿Qué haces?"
  opciones={[
    { texto: "Reviso la fila: el costo está vacío, así que lo anoto como un dato por corregir y le pregunto a Carla.", correcta: true, porque: "El 0 no es un costo real: viene de una celda vacía. Hay que encontrar la causa antes de usar ese número." },
    { texto: "Escribo a mano un costo parecido al de otras filas.", porque: "Inventar un dato esconde el problema y nadie va a saber que ese número no es real." },
    { texto: "Nada: es solo una fila.", porque: "Un 0 baja los promedios y los totales. Si no se explica, termina en un informe." },
  ]}
/>

<Debrief entrevista="Una pregunta clásica de planillas: '¿qué diferencia hay entre A1 y $A$1?'. La respuesta: la primera se ajusta al copiar la fórmula; la segunda queda fija.">
Las fórmulas se escriben una vez y se rellenan: así la planilla se actualiza sola si cambia un dato. Las referencias relativas cambian al copiar y las absolutas (`$K$2`) no. Un resultado raro, como un 0, casi siempre es una pista de un dato con problemas.
</Debrief>
```

`content/casos/despachos-rapidos/misiones/02-totales-del-mes.mdx`:
```mdx
---
titulo: Los totales del mes
tiempo: 20
---

<Brief de="Carla Muñoz, dueña de Despachos Rápidos">
Para la reunión con el banco necesito cuatro números de marzo: cuánto cobramos en total por despachos, el costo promedio de un despacho, cuántos despachos tienen costo registrado y cuántas filas tiene la planilla. Te dejé los títulos en la columna J.
</Brief>

<Concepto>
Cuatro funciones que vas a usar todo el tiempo. Todas reciben un rango, como `G2:G63`:

| Función | Qué hace | Ejemplo |
| --- | --- | --- |
| `SUMA` | Suma los números | `=SUMA(G2:G63)` |
| `PROMEDIO` | Promedia los números, sin contar las celdas vacías | `=PROMEDIO(G2:G63)` |
| `CONTAR` | Cuenta las celdas **con números** | `=CONTAR(G2:G63)` |
| `CONTARA` | Cuenta las celdas **que no están vacías**, con lo que sea | `=CONTARA(A2:A63)` |

`REDONDEAR(valor; decimales)` deja un número con los decimales que pidas: `=REDONDEAR(PROMEDIO(G2:G63); 0)` lo deja en pesos, sin decimales.

En las planillas en español, los argumentos se separan con `;`.
</Concepto>

<SheetTask
  id="totales"
  hoja="despachos"
  inicial={{ J2: "Total cobrado", J3: "Costo promedio", J4: "Despachos con costo", J5: "Filas de la planilla" }}
  enunciado="En K2 calcula el total cobrado; en K3, el costo promedio redondeado a pesos; en K4, cuántos despachos tienen costo, y en K5, cuántas filas con id tiene la planilla."
  celdas={[
    { celda: "K2", valor: 290560, funcion: "SUMA" },
    { celda: "K3", valor: 4843, funcion: "PROMEDIO" },
    { celda: "K4", valor: 60, funcion: "CONTAR" },
    { celda: "K5", valor: 62, funcion: "CONTARA" },
  ]}
  solucion={{ K2: "=SUMA(G2:G63)", K3: "=REDONDEAR(PROMEDIO(G2:G63);0)", K4: "=CONTAR(G2:G63)", K5: "=CONTARA(A2:A63)" }}
  pistas={["Los costos están en G2:G63 y los id en A2:A63.", "Para el promedio en pesos, pon PROMEDIO dentro de REDONDEAR, con 0 decimales.", "CONTAR cuenta solo números; CONTARA cuenta cualquier celda con algo escrito."]}
/>

<Decision
  pregunta="K4 dice 60 despachos con costo y K5 dice 62 filas. ¿Cuántos despachos hubo en marzo?"
  opciones={[
    { texto: "Todavía no lo sé: la diferencia indica filas sin costo o repetidas, y hay que revisarlas antes de responder.", correcta: true, porque: "Dos conteos que no cuadran son una señal. Responder sin revisar es apostar." },
    { texto: "62, porque son las filas de la planilla.", porque: "Una fila no siempre es un despacho: puede estar repetida." },
    { texto: "60, porque son los que tienen costo.", porque: "Un despacho sin costo registrado igual existió: falta el dato, no el despacho." },
  ]}
/>

<Debrief entrevista="Es común que pregunten la diferencia entre CONTAR y CONTARA, o por qué un promedio cambia si hay celdas vacías. Explicar que PROMEDIO ignora las vacías, pero no los ceros, muestra criterio.">
`SUMA`, `PROMEDIO`, `CONTAR` y `CONTARA` resumen una columna en un número. Comparar dos conteos que deberían coincidir es una de las formas más rápidas de encontrar problemas en los datos. Ya tienes dos pistas: filas sin costo y algo que hace que haya más filas que despachos.
</Debrief>
```

`content/casos/despachos-rapidos/misiones/03-condiciones.mdx`:
```mdx
---
titulo: Condiciones
tiempo: 25
---

<Brief de="Carla Muñoz, dueña de Despachos Rápidos">
Los despachos de más de 10 kilos nos cuestan más: necesito marcarlos como pesados. También quiero saber cuántos despachos se devolvieron, cuánto nos pagaron las empresas y cuántos despachos pesados hubo en marzo.
</Brief>

<Concepto>
**`SI`** elige entre dos resultados según una condición:

`=SI(F2>10; "pesado"; "liviano")` → si el peso de F2 es mayor que 10, escribe "pesado"; si no, "liviano".

**`CONTAR.SI`** cuenta las celdas de un rango que cumplen un criterio:

`=CONTAR.SI(H2:H63; "devuelto")` → cuántas veces aparece "devuelto" en la columna H.

**`SUMAR.SI`** suma solo las filas que cumplen el criterio. Recibe el rango donde busca, el criterio y el rango que suma:

`=SUMAR.SI(E2:E63; "empresa"; G2:G63)` → suma los costos (G) de las filas cuyo cliente (E) es "empresa".

Los textos van entre comillas dobles. Los criterios también pueden ser comparaciones: `">10"`.
</Concepto>

<SheetTask
  id="condiciones"
  hoja="despachos"
  inicial={{ I1: "tamano", K2: "Devueltos", K3: "Cobrado a empresas", K4: "Despachos pesados" }}
  enunciado="En la columna I marca cada despacho como pesado (más de 10 kilos) o liviano y rellénala. En L2 cuenta los devueltos; en L3 suma lo cobrado a empresas, y en L4 cuenta los despachos pesados usando la columna I."
  celdas={[
    { celda: "I2", valor: "pesado" },
    { celda: "I25", valor: "pesado" },
    { celda: "L2", valor: 6, funcion: "CONTAR.SI" },
    { celda: "L3", valor: 113700, funcion: "SUMAR.SI" },
    { celda: "L4", valor: 31, funcion: "CONTAR.SI" },
  ]}
  solucion={{ "I2:I63": '=SI(F2>10;"pesado";"liviano")', L2: '=CONTAR.SI(H2:H63;"devuelto")', L3: '=SUMAR.SI(E2:E63;"empresa";G2:G63)', L4: '=CONTAR.SI(I2:I63;"pesado")' }}
  pistas={["El peso está en la columna F, el cliente en E y el estado en H.", "Escribe el SI en I2 y usa Rellenar, como con el IVA.", "En SUMAR.SI el orden es: dónde buscar, qué buscar y qué sumar."]}
/>

<Decision
  pregunta="Carla pregunta: '¿Los clientes empresa son los que más nos pagan?'. Tienes el total cobrado a empresas. ¿Te basta para responder?"
  opciones={[
    { texto: "No: necesito compararlo con lo cobrado a personas y, mejor aún, con cuántos despachos hizo cada uno.", correcta: true, porque: "Un total solo no dice si es mucho o poco: hay que compararlo, y el promedio por despacho cuenta otra historia que el total." },
    { texto: "Sí: 113.700 es bastante plata.", porque: "Sin un punto de comparación, «bastante» es una opinión, no un análisis." },
  ]}
/>

<Debrief entrevista="Un ejercicio típico: 'cuenta los pedidos de más de 50 mil pesos de una región'. Ahí se usan CONTAR.SI.CONJUNTO o SUMAR.SI.CONJUNTO, que aceptan varios criterios a la vez.">
`SI` transforma una regla del negocio en una columna nueva. `CONTAR.SI` y `SUMAR.SI` responden "¿cuántos?" y "¿cuánto?" para un grupo. Juntas son la base de casi cualquier resumen en una planilla.
</Debrief>
```

`content/casos/despachos-rapidos/misiones/04-buscar-en-otra-tabla.mdx`:
```mdx
---
titulo: Buscar en otra tabla
tiempo: 25
---

<Brief de="Carla Muñoz, dueña de Despachos Rápidos">
En la hoja comunas está la tarifa de cada comuna y cuántos días le prometemos al cliente para entregar. Quiero tener esos dos datos al lado de cada despacho, sin copiarlos a mano: el mes pasado alguien se equivocó copiando y cobramos mal a medio Maipú.
</Brief>

<Concepto>
**`BUSCARV`** busca un valor en la primera columna de una tabla y devuelve el de otra columna de la misma fila:

`=BUSCARV(D2; comunas!$A$2:$E$13; 4; FALSO())`

1. `D2`: lo que buscas, la comuna del despacho.
2. `comunas!$A$2:$E$13`: la tabla donde buscas, en la hoja comunas, fija con `$` para poder rellenar.
3. `4`: la columna de la tabla que quieres traer (la tarifa es la cuarta).
4. `FALSO()`: coincidencia exacta. Sin él, la planilla busca un valor «aproximado» y puede traer otro.

**`BUSCARX`** hace lo mismo con rangos separados, y no depende del número de columna:

`=BUSCARX(D2; comunas!$A$2:$A$13; comunas!$E$2:$E$13)` → busca la comuna en la columna A y devuelve la E.

Para ver la tabla de comunas, cambia de pestaña sobre la grilla.
</Concepto>

<SheetTask
  id="buscar-tarifas"
  hoja="despachos"
  otras={["comunas"]}
  inicial={{ I1: "tarifa", J1: "dias_compromiso" }}
  enunciado="En la columna I trae la tarifa de la comuna de cada despacho con BUSCARV, y en la J los días de compromiso con BUSCARX. Rellena ambas columnas."
  celdas={[
    { celda: "I2", valor: 3800, funcion: "BUSCARV" },
    { celda: "I10", valor: 3500 },
    { celda: "J3", valor: 1, funcion: "BUSCARX" },
    { celda: "J50", valor: 1 },
  ]}
  solucion={{ "I2:I63": "=BUSCARV(D2;comunas!$A$2:$E$13;4;FALSO())", "J2:J63": "=BUSCARX(D2;comunas!$A$2:$A$13;comunas!$E$2:$E$13)" }}
  pistas={["La comuna del despacho está en D2. La tabla de comunas va de A2 a E13 en la hoja comunas.", "La tarifa es la columna 4 de la tabla y los días de compromiso, la 5.", "Fija la tabla con $ antes de rellenar: comunas!$A$2:$E$13."]}
/>

<Decision
  pregunta="Al rellenar, la fila 6 muestra #N/D aunque Valparaíso sí está en la hoja comunas. ¿Qué pasa?"
  opciones={[
    { texto: "El nombre en la fila 6 tiene algo distinto, por ejemplo espacios antes del nombre: la búsqueda exige que sea idéntico.", correcta: true, porque: "«  Valparaíso» con espacios no es igual a «Valparaíso». Es un problema de los datos, no de la fórmula." },
    { texto: "BUSCARV no funciona con tildes.", porque: "Funciona sin problemas con tildes; lo que falla es que el texto no sea exactamente el mismo." },
    { texto: "Hay que quitar el FALSO() para que encuentre algo.", porque: "Sin FALSO() la búsqueda es aproximada y puede traer la tarifa de otra comuna, que es peor que un #N/D visible." },
  ]}
/>

<Debrief entrevista="BUSCARV es la función más preguntada en las pruebas de Excel. Lo que más distingue a quien la domina es explicar por qué siempre lleva FALSO() y qué significa un #N/D.">
Buscar en otra tabla evita copiar datos a mano y los mantiene al día. Un `#N/D` dice que el valor no está tal cual en la tabla: casi siempre por espacios o diferencias de escritura. En la próxima misión vas a limpiar justamente eso.
</Debrief>
```

`content/casos/despachos-rapidos/misiones/05-limpiar-los-datos.mdx`:
```mdx
---
titulo: Limpiar los datos
tiempo: 30
---

<Brief de="Carla Muñoz, dueña de Despachos Rápidos">
Ya viste que la planilla tiene problemas: comunas escritas de distintas formas, filas repetidas y fechas raras. Antes de sacar conclusiones quiero saber cuántos de estos problemas hay y dónde. No borres nada todavía: márcalos en columnas nuevas para que podamos revisarlos.
</Brief>

<Concepto>
Tres problemas comunes y cómo encontrarlos sin cambiar los datos originales:

**Textos mal escritos.** `ESPACIOS` quita los espacios de más y `NOMPROPIO` deja la primera letra de cada palabra en mayúscula:

`=NOMPROPIO(ESPACIOS(D2))` → "  maipú " queda "Maipú".

**Filas repetidas.** Si un id aparece más de una vez, la fila está repetida:

`=CONTAR.SI($A$2:$A$63; A2)>1` → VERDADERO si el id de la fila aparece más de una vez. El rango va fijo con `$` para poder rellenar.

**Fechas que no son fechas.** Una fecha que la planilla entiende es un número por dentro. `ESNUMERO` detecta las que quedaron como texto, como `2025-03-14`:

`=ESNUMERO(C2)` → VERDADERO si C2 es una fecha de verdad. Ojo: también da FALSO si la celda está vacía, como en los despachos devueltos.

Marcar antes de borrar permite revisar cada caso y explicar qué se corrigió.
</Concepto>

<SheetTask
  id="marcar-problemas"
  hoja="despachos"
  inicial={{ I1: "comuna_limpia", J1: "repetido", K1: "fecha_ok" }}
  enunciado="Rellena tres columnas nuevas: en I la comuna limpia, en J si el id está repetido y en K si la fecha de entrega es una fecha de verdad."
  celdas={[
    { celda: "I6", valor: "Valparaíso" },
    { celda: "I43", valor: "La Florida" },
    { celda: "J5", valor: false },
    { celda: "J23", valor: true },
    { celda: "K2", valor: true },
    { celda: "K11", valor: false },
  ]}
  solucion={{ "I2:I63": "=NOMPROPIO(ESPACIOS(D2))", "J2:J63": "=CONTAR.SI($A$2:$A$63;A2)>1", "K2:K63": "=ESNUMERO(C2)" }}
  pistas={["Las comunas están en D, los id en A y las fechas de entrega en C.", "Puedes poner una función dentro de otra: primero ESPACIOS y, sobre el resultado, NOMPROPIO.", "En el CONTAR.SI, el rango de los id va fijo ($A$2:$A$63) y lo que buscas es el id de la fila (A2)."]}
/>

<Decision
  pregunta="Encontraste dos filas repetidas. Carla te dice: 'Bórralas y listo'. ¿Qué haces?"
  opciones={[
    { texto: "Antes de borrar, reviso que sean idénticas en todas las columnas y anoto cuáles quité y por qué.", correcta: true, porque: "Dos filas con el mismo id pueden ser un error de copia o dos despachos distintos mal numerados. El registro permite que otra persona revise la limpieza." },
    { texto: "Las borro de inmediato en la planilla original.", porque: "Si te equivocas, perdiste el dato y nadie puede saber qué cambió." },
  ]}
/>

<Debrief entrevista="Una pregunta frecuente: '¿cuánto tiempo de un análisis se va en limpiar datos?'. Una respuesta honesta es 'gran parte', con un ejemplo: espacios de más que rompen una búsqueda, fechas guardadas como texto o filas duplicadas que inflan un total.">
Limpiar es encontrar los problemas, decidir qué hacer con cada uno y dejarlo registrado. Desde aquí, Carla te deja una versión limpia de la planilla (despachos_limpios), con estos problemas corregidos, para que el análisis use datos confiables.
</Debrief>
```

`content/casos/despachos-rapidos/misiones/06-resumir-por-comuna.mdx`:
```mdx
---
titulo: Resumir por comuna
tiempo: 25
---

<Brief de="Carla Muñoz, dueña de Despachos Rápidos">
Con la planilla limpia, quiero ver marzo por comuna: cuántos despachos hicimos en cada una y cuánto nos pagaron. Así decido dónde conviene poner un segundo repartidor. Te dejé la lista de comunas lista para que agregues las dos columnas.
</Brief>

<Concepto>
Para resumir por grupo, en Excel y Google Sheets se usa una **tabla dinámica**: eliges la columna para agrupar (comuna) y qué calcular (contar, sumar). Es lo primero que vas a usar en tu planilla del entregable.

La misma tabla se puede construir con fórmulas, y así se entiende qué hace la tabla dinámica por dentro:

`=CONTAR.SI(despachos_limpios!$D$2:$D$61; A2)` → cuántos despachos tiene la comuna de A2.

`=SUMAR.SI(despachos_limpios!$D$2:$D$61; A2; despachos_limpios!$G$2:$G$61)` → cuánto se cobró en esa comuna.

Esta vez la hoja principal es **comunas**, y los despachos se leen desde la hoja **despachos_limpios**.
</Concepto>

<SheetTask
  id="resumen-por-comuna"
  hoja="comunas"
  otras={["despachos_limpios"]}
  inicial={{ F1: "despachos", G1: "cobrado" }}
  enunciado="En la columna F cuenta los despachos de cada comuna y en la G suma lo cobrado, usando la hoja despachos_limpios. Rellena las dos columnas para las 12 comunas."
  celdas={[
    { celda: "F2", valor: 7, funcion: "CONTAR.SI" },
    { celda: "F8", valor: 14 },
    { celda: "G8", valor: 64720, funcion: "SUMAR.SI" },
    { celda: "G13", valor: 13360 },
  ]}
  solucion={{ "F2:F13": "=CONTAR.SI(despachos_limpios!$D$2:$D$61;A2)", "G2:G13": "=SUMAR.SI(despachos_limpios!$D$2:$D$61;A2;despachos_limpios!$G$2:$G$61)" }}
  pistas={["La comuna de cada fila está en A2. En despachos_limpios, la comuna está en la columna D y el costo en la G.", "Los rangos de la otra hoja van fijos con $ para que no se muevan al rellenar.", "Es el mismo CONTAR.SI y SUMAR.SI de la misión de condiciones; lo que cambia es que el criterio es una celda (A2) y no un texto."]}
/>

<Decision
  pregunta="Maipú tiene la mayor cantidad de despachos. ¿Es donde conviene poner el segundo repartidor?"
  opciones={[
    { texto: "Es una buena candidata, pero antes miraría también los atrasos y la distancia: más despachos no siempre significa más problemas.", correcta: true, porque: "La cantidad muestra la demanda; para decidir dónde poner un repartidor también importa dónde se está fallando." },
    { texto: "Sí, sin dudas: tiene más despachos.", porque: "Puede que Maipú se esté atendiendo bien y el problema esté en otra comuna con menos despachos pero más atrasos." },
  ]}
/>

<Debrief entrevista="En casi toda prueba de Excel piden una tabla dinámica. Saber armarla con fórmulas (CONTAR.SI y SUMAR.SI) demuestra que entiendes lo que calcula, y te salva cuando la tabla dinámica no alcanza.">
Resumir por grupo convierte 60 filas en 12 que se pueden leer de una vez. En tu entregable, haz este mismo resumen con una tabla dinámica y compáralo con tus fórmulas: si los números coinciden, ambos están bien.
</Debrief>
```

`content/casos/despachos-rapidos/misiones/07-indicadores-de-entrega.mdx`:
```mdx
---
titulo: Indicadores de entrega
tiempo: 30
---

<Brief de="Carla Muñoz, dueña de Despachos Rápidos">
Los clientes se están quejando de atrasos y quiero saber si es cierto. Para cada despacho entregado calcula cuántos días tardó y compáralo con lo que prometemos en su comuna. Después dame tres números: el promedio de días de entrega, cuántos despachos llegaron atrasados y qué porcentaje de los entregados representan.
</Brief>

<Concepto>
**Restar fechas** da los días entre ellas: `=C2-B2` son los días entre el pedido y la entrega.

Los despachos devueltos no tienen fecha de entrega. Para no restar una celda vacía, se combina con `SI`:

`=SI(C2=""; ""; C2-B2)` → si no hay fecha de entrega, deja la celda vacía.

Un **indicador** resume el desempeño en un número que se puede seguir mes a mes:
- **Promedio de días de entrega:** `PROMEDIO` ignora las celdas vacías.
- **Atrasados:** los días de entrega superan los días comprometidos de la comuna.
- **Porcentaje de atrasos:** atrasados ÷ entregados. Como número, 0.26 es el 26 %.

Un `SI` dentro de otro `SI` permite tres resultados: `=SI(I2=""; "devuelto"; SI(I2>J2; "atrasado"; "a tiempo"))`.
</Concepto>

<SheetTask
  id="indicadores"
  hoja="despachos_limpios"
  otras={["comunas"]}
  inicial={{ I1: "dias_entrega", J1: "compromiso", K1: "resultado", M2: "Promedio de días", M3: "Atrasados", M4: "Porcentaje de atrasos" }}
  enunciado="Rellena tres columnas: en I los días de entrega (vacío si no hay fecha), en J los días de compromiso de la comuna y en K si el despacho fue devuelto, atrasado o a tiempo. Luego, en N2 el promedio de días con un decimal, en N3 los atrasados y en N4 el porcentaje de atrasos sobre los entregados, con dos decimales."
  celdas={[
    { celda: "I2", valor: 2 },
    { celda: "K2", valor: "a tiempo" },
    { celda: "N2", valor: 2, funcion: "PROMEDIO" },
    { celda: "N3", valor: 14, funcion: "CONTAR.SI" },
    { celda: "N4", valor: 0.26 },
  ]}
  solucion={{ "I2:I61": '=SI(C2="";"";C2-B2)', "J2:J61": "=BUSCARV(D2;comunas!$A$2:$E$13;5;FALSO())", "K2:K61": '=SI(I2="";"devuelto";SI(I2>J2;"atrasado";"a tiempo"))', N2: "=REDONDEAR(PROMEDIO(I2:I61);1)", N3: '=CONTAR.SI(K2:K61;"atrasado")', N4: '=REDONDEAR(N3/CONTAR.SI(H2:H61;"entregado");2)' }}
  pistas={["Los días de compromiso se traen igual que en la misión de buscar en otra tabla: BUSCARV a comunas, columna 5.", "Un despacho está atrasado si sus días de entrega (I) son más que su compromiso (J).", "Para el porcentaje, divide los atrasados (N3) por la cantidad de despachos con estado «entregado» y redondea a 2 decimales."]}
/>

<Decision
  pregunta="El promedio de días de entrega es 2 y el compromiso suele ser de 1 o 2 días. Carla concluye: 'Entonces no hay atrasos'. ¿Qué le respondes?"
  opciones={[
    { texto: "Que el promedio esconde los casos: el 26 % de los entregados llegó atrasado, y eso es lo que sienten los clientes.", correcta: true, porque: "Un promedio razonable puede convivir con muchos casos malos. Para un problema de servicio importa la proporción de clientes afectados." },
    { texto: "Que tiene razón: el promedio está dentro del compromiso.", porque: "Ningún cliente recibe el promedio: cada uno recibe su despacho, y uno de cada cuatro llegó tarde." },
  ]}
/>

<Debrief entrevista="Te pueden pedir que propongas indicadores para un negocio. Una buena respuesta define la fórmula exacta (atrasados ÷ entregados), explica por qué ese y no otro, y dice con qué frecuencia mirarlo.">
Un indicador bien definido convierte una sensación ("hay atrasos") en un número que se puede seguir. El promedio y el porcentaje cuentan historias distintas: un buen análisis muestra los dos y explica la diferencia.
</Debrief>
```

`content/casos/despachos-rapidos/misiones/08-revisar-la-formula-de-la-ia.mdx`:
```mdx
---
titulo: Revisar la fórmula de la IA
tiempo: 20
---

<Brief de="Carla Muñoz, dueña de Despachos Rápidos">
Ayer le pedí a un asistente de inteligencia artificial una fórmula para traer la tarifa de cada comuna. Me dio una, la pegué en la columna I de la planilla limpia y la rellené. No me tiró ningún error, pero los números no me cuadran. ¿Me ayudas a revisarla y corregirla?
</Brief>

<Concepto>
Los asistentes de IA escriben fórmulas rápido, pero **no revisan tus datos**: una fórmula puede verse bien, no dar ningún error y traer números equivocados. Por eso lo que produce la IA se revisa como el trabajo de un colega nuevo:

1. **Lee la fórmula parte por parte.** ¿Cada argumento hace lo que crees? ¿Falta alguno?
2. **Compara con dos o tres filas a mano.** Busca la comuna en la hoja de comunas y mira si la tarifa coincide.
3. **Desconfía de los patrones raros:** todos los resultados iguales, ceros donde no debería haberlos o totales demasiado redondos.

Un argumento que se omite toma su valor por defecto, y ese valor no siempre es el que necesitas.
</Concepto>

<SheetTask
  id="corregir-buscarv"
  hoja="despachos_limpios"
  otras={["comunas"]}
  inicial={{ I1: "tarifa", "I2:I61": "=BUSCARV(D2;comunas!$A$2:$E$13;4)" }}
  enunciado="Revisa la fórmula de la columna I comparando algunas filas con la hoja comunas. Corrígela en I2 y vuelve a rellenar la columna."
  celdas={[
    { celda: "I2", valor: 3800, funcion: "BUSCARV" },
    { celda: "I3", valor: 3100 },
    { celda: "I4", valor: 2900 },
    { celda: "I61", valor: 3300 },
  ]}
  solucion={{ "I2:I61": "=BUSCARV(D2;comunas!$A$2:$E$13;4;FALSO())" }}
  pistas={["Compara I2 con la tarifa de Puente Alto en la hoja comunas: ¿coincide?", "¿Todas las filas muestran la misma tarifa? Eso no tiene sentido si las comunas son distintas.", "Revisa cuántos argumentos tiene el BUSCARV. ¿Qué pasa cuando falta el cuarto?"]}
/>

<Decision
  pregunta="Corregiste la fórmula. La próxima vez que uses una fórmula de un asistente de IA, ¿qué haces?"
  opciones={[
    { texto: "La uso, pero la reviso: leo cada argumento y comparo algunos resultados con los datos antes de entregar.", correcta: true, porque: "La IA ahorra tiempo escribiendo, pero la responsabilidad por el número que entregas sigue siendo tuya." },
    { texto: "Dejo de usar IA: se equivoca.", porque: "Bien usada ahorra mucho tiempo. El problema no es usarla, sino no revisar lo que entrega." },
    { texto: "Le pido que la revise ella misma y confío en su respuesta.", porque: "Puede volver a equivocarse con la misma seguridad. La verificación tiene que hacerse contra los datos." },
  ]}
/>

<Debrief entrevista="Cada vez más preguntan '¿usas IA en tu trabajo?'. Una respuesta que destaca: 'Sí, para escribir fórmulas y consultas más rápido, y siempre las verifico contra los datos; una vez una fórmula traía la misma tarifa para todas las comunas sin dar error'.">
Sin `FALSO()`, `BUSCARV` hace una búsqueda aproximada que supone la tabla ordenada. Como la tabla de comunas no lo está, devolvía la misma tarifa en casi todas las filas, sin ningún error visible. Usar IA para analizar datos es parte del oficio; verificar lo que entrega, también.
</Debrief>
```

`content/casos/despachos-rapidos/misiones/09-resumen-para-la-duena.mdx`:
```mdx
---
titulo: El resumen para la dueña
tiempo: 40
sinGuia: true
---

<Brief de="Carla Muñoz, dueña de Despachos Rápidos">
Mañana me reúno con mi socio y quiero llevar el resumen de marzo en una sola mirada. Te dejé los títulos en la columna N de la planilla limpia: cuántos despachos hicimos, cuánto cobramos, el costo promedio de un despacho en pesos, cuántos se devolvieron y cuántos llegaron atrasados según lo que prometemos en cada comuna. Arma las columnas de apoyo que necesites. Confío en tu criterio.
</Brief>

<SheetTask
  id="resumen-de-marzo"
  hoja="despachos_limpios"
  otras={["comunas"]}
  inicial={{ N2: "Despachos del mes", N3: "Total cobrado", N4: "Costo promedio", N5: "Devueltos", N6: "Atrasados" }}
  enunciado="Completa la columna O con el resumen de marzo, a partir de la hoja despachos_limpios."
  celdas={[
    { celda: "O2", valor: 60 },
    { celda: "O3", valor: 290540 },
    { celda: "O4", valor: 4842 },
    { celda: "O5", valor: 6 },
    { celda: "O6", valor: 14 },
  ]}
  solucion={{ O2: "=CONTARA(A2:A61)", O3: "=SUMA(G2:G61)", O4: "=REDONDEAR(PROMEDIO(G2:G61);0)", O5: '=CONTAR.SI(H2:H61;"devuelto")', "I2:I61": '=SI(C2="";"";C2-B2)', "J2:J61": "=BUSCARV(D2;comunas!$A$2:$E$13;5;FALSO())", "K2:K61": '=SI(I2="";"devuelto";SI(I2>J2;"atrasado";"a tiempo"))', O6: '=CONTAR.SI(K2:K61;"atrasado")' }}
/>

<Decision
  pregunta="Tu resumen está listo. ¿Qué agregas antes de mandárselo a Carla?"
  opciones={[
    { texto: "Dos o tres frases con lo más importante y una recomendación, por ejemplo dónde se concentran los atrasos.", correcta: true, porque: "Los números sin interpretación obligan a Carla a hacer el análisis. Tu trabajo es decirle qué significan y qué haría." },
    { texto: "Nada: los números hablan por sí solos.", porque: "Para quien no estuvo en el análisis, cinco números sueltos no dicen qué hacer." },
  ]}
/>

<Debrief entrevista="Un cierre típico de las pruebas técnicas: 'Si tuvieras dos minutos con la gerencia, ¿qué le dirías de estos datos?'. Practica responder con un número, lo que significa y una recomendación.">
Este resumen es la base de tu entregable: arma la planilla completa en Excel o Google Sheets, con una hoja de conclusiones, súbela a un repositorio con un README que cuente qué encontraste y envíala desde la página del caso.
</Debrief>
```

- [ ] **Step 3: Validar**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content validate`
Expected: `[content] ok: 2 rutas, 3 casos, 19 misiones`.

Si una tarea no pasa su validador ("muestra X y se espera Y"), revisa primero que los CSV sean los del generador (Task 2, Step 4). Nunca ajustes el valor esperado para que coincida con datos distintos.

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && cd apps/web && pnpm exec tsc --noEmit -p . && pnpm build"`
Expected:
- PASS en todos los paquetes, incluido `contenido-real.test.ts`;
- el build termina con `/casos/[caso]/[mision]` estática.

- [ ] **Step 4: Commit**

```bash
git add content
git commit -m "feat(contenido): caso 1 despachos rapidos, nueve misiones de planilla

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: e2e y README

**Files:**
- Create: `e2e/tests/despachos.spec.ts`
- Modify: `e2e/calentar.ts`, `README.md`

**Interfaces:**
- Consumes:
  - los ids de las Tasks 4 y 4a (Caso 0);
  - `entrarComoAdmin` y `aprobarEntregable` (`e2e/tests/revision.ts`);
  - `/api/progreso`.
- Produces: `e2e/tests/despachos.spec.ts`, con 1 prueba que recorre las misiones 4 y 8 tras completar el Caso 0.

- [ ] **Step 1: Escribir la prueba**

`e2e/tests/despachos.spec.ts`:
```ts
import { expect, test, type Page } from "./fixtures";
import { aprobarEntregable, entrarComoAdmin } from "./revision";

const CASO = "/casos/despachos-rapidos";
const CASO_0: [string, string][] = [
  ["01-tu-primer-repositorio", "primer-repositorio"],
  ["02-escribe-un-readme", "readme-de-proyecto"],
  ["03-archivos-y-commits", "commits-propios"],
  ["04-ordena-tu-proyecto", "proyecto-ordenado"],
  ["05-el-readme-de-tu-proyecto", "readme-del-proyecto"],
  ["06-tu-perfil-de-github", "perfil"],
  ["07-tu-presentacion", "presentacion"],
];
const CASO_1: [string, string][] = [
  ["01-conoce-la-planilla", "costo-con-iva"],
  ["02-totales-del-mes", "totales"],
  ["03-condiciones", "condiciones"],
  ["04-buscar-en-otra-tabla", "buscar-tarifas"],
  ["05-limpiar-los-datos", "marcar-problemas"],
  ["06-resumir-por-comuna", "resumen-por-comuna"],
  ["07-indicadores-de-entrega", "indicadores"],
];

async function registrarse(page: Page): Promise<string> {
  const email = `despachos-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
  await page.goto("/registro?callbackUrl=%2Fdashboard");
  await page.locator('input[name="name"]').fill("Ignacia Soto");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return email;
}

// Aprueba misiones por la API, en orden, como si se hubieran resuelto en la página.
async function aprobar(page: Page, ip: string, caso: string, misiones: [string, string][]) {
  for (const [mision, tarea] of misiones) {
    const respuesta = await page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
      data: { caso, mision, tarea, aprobada: true },
    });
    expect(respuesta.ok(), `${caso}/${mision}`).toBe(true);
  }
}

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
  const email = await registrarse(page);

  // El Caso 1 se habilita al completar el Caso 0, con su entregable aprobado.
  await aprobar(page, ip, "herramientas-del-oficio", CASO_0);
  await page.goto("/casos/herramientas-del-oficio");
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill("https://github.com/ignacia/presentacion");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await aprobarEntregable(admin, email);

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
  "/casos/despachos-rapidos",
  "/casos/despachos-rapidos/04-buscar-en-otra-tabla",
  "/casos/despachos-rapidos/08-revisar-la-formula-de-la-ia",
```

Run: `docker compose up -d --force-recreate --wait web && docker compose --profile e2e run --rm e2e npx playwright test tests/despachos.spec.ts tests/misiones.spec.ts`
Expected: `3 passed`. Las pruebas de misiones confirman que la planilla del caso demo sigue igual.

- [ ] **Step 2: README**

Agrega al final de `README.md`:
```markdown
## Caso 1: Despachos Rápidos

- **Datos generados:** los CSV de `content/casos/despachos-rapidos/datos/` salen de `packages/content/src/generadores/despachos-rapidos.ts`, con semilla fija.
  - Para cambiarlos: edita el generador, corre `docker compose run --rm tools pnpm --filter @syntaxerror/content generar` y actualiza los valores esperados de las tareas.
  - Una prueba falla si los CSV se editan a mano.
- **Defectos a propósito:** `despachos.csv` trae comunas mal escritas, fechas como texto, costos vacíos y filas duplicadas, en posiciones fijas (`DEFECTOS`). `despachos_limpios.csv` es la versión corregida que usan las misiones 6 a 9.
- **Planilla:**
  - Una `SheetTask` puede consultar otras hojas (`otras`), traer celdas escritas de antemano (`inicial`) y resolver columnas completas con rangos en la solución (`"I2:I63": "=G2*(1+$K$2)"`).
  - En la misión se ven pestañas, el botón "Rellenar hasta la fila…" y las fechas como DD/MM/AAAA.
```

- [ ] **Step 3: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes.

Run: `npm run test:e2e`
Expected: `33 passed` (los 32 anteriores y el de Despachos Rápidos). En desarrollo puede fallar alguna prueba de formularios que no tiene que ver con este caso; si pasa, córrela sola. La verificación que manda es la de producción.

Run: `docker compose down && npm run test:e2e:prod`
Expected: `33 passed` contra el build de producción.

Run: `for p in /casos/despachos-rapidos /casos/despachos-rapidos/04-buscar-en-otra-tabla; do curl -s -o /dev/null localhost:3000$p; curl -s -D - -o /dev/null localhost:3000$p | grep -i x-nextjs-cache; done`
Expected: `x-nextjs-cache: HIT` dos veces.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml down`

- [ ] **Step 4: Recorrerlo como estudiante**

Con `npm run dev`, entra con una cuenta que tenga el Caso 0 completo y resuelve las misiones 1, 5 y 9 a mano. Revisa tres cosas:
- que el error de rellenar sin `$` se entienda;
- que la misión 5 encuentre los cuatro tipos de defecto;
- que la misión 9 se pueda resolver sin pistas, solo con lo visto en el caso.

- [ ] **Step 5: Commit**

```bash
git add e2e README.md
git commit -m "test(e2e): caso 1 con hojas de consulta, rellenar hacia abajo y la formula de la ia

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Fase 4c: el Caso 2, SQL, en "Minimarkets del Sur".**
- Un generador de datos de ventas, productos y locales, de Talca a Puerto Montt.
- Ocho misiones:
  - `SELECT` y `WHERE`;
  - orden y límite;
  - `GROUP BY` como la tabla dinámica del Caso 1;
  - `HAVING`;
  - `JOIN` como el `BUSCARV` del Caso 1;
  - fechas;
  - la misión sin guía, con cinco preguntas de gerencia.

**Pendiente del equipo:** elegir el nombre de la clínica del Caso 4. La recomendación es "Clínica Cordillera Central".
