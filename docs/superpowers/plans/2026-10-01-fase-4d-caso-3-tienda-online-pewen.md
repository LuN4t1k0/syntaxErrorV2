# Fase 4d: Caso 3, Tienda Online Pewen. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar el Caso 3 de la ruta Data Analyst, "Tienda Online Pewen": nueve misiones de Python con pandas sobre los pedidos de un e-commerce chileno de hogar y vestuario.
- De la planilla a Python, cargar, filtrar, limpiar, agrupar y cruzar.
- Detectar patrones y revisar código escrito por una IA.
- Una misión final sin guía, con cinco respuestas para el negocio.

**Architecture:**
- **Datos generados con semilla fija** (`packages/content/src/generadores/tienda-online-pewen.ts`): 90 clientes, 24 productos y 424 pedidos de julio a diciembre de 2025.
  - Los defectos son reales y para limpiar con pandas: 4 pedidos duplicados, 5 sin cantidad y 6 clientes sin región.
  - Los patrones salen de los datos, no del enunciado: Vestuario se devuelve en un 23 % de sus pedidos (el resto, entre 5 % y 7 %) y noviembre (Black Friday) vende más del doble que un mes normal.
- **Las tareas de Python comparan valores escritos en sus `pruebas`,** con mensajes que orientan sin entregar la solución. El validador ejecuta cada solución con pandas en Pyodide y comprueba que pase sus pruebas.
- **La limpieza se reutiliza:** desde la misión 5, la preparación de cada tarea incluye la limpieza de la misión 4, como haría un notebook real. La misión 9, sin guía, parte de los archivos tal como están.
- **El traductor de errores de Python** reconoce los dos errores más típicos de pandas al filtrar: `&` sin paréntesis y `and`/`or` con columnas completas.

**Tech Stack:** Pyodide 0.28.3 con pandas, papaparse 5.7.0, Next.js 15, Vitest 4 y Playwright 1.55.

**Spec:** `docs/propuesta-pedagogica-data-analyst.md`:
- 4: misión y repaso intercalado;
- 5: misión sin guía;
- 8: Caso 3 y el hilo "IA aplicada";
- 10: consolas, con las tablas de pandas visibles.

También los acuerdos del equipo del 2026-10-01: la empresa es "Tienda Online Pewen" y los datos son sintéticos, de un script reproducible.

## Global Constraints

**El contenido se copia literal**
- Cada archivo `.mdx` y `.yaml` de este plan se copia exactamente como está: sin resumir Briefs, Conceptos, Decisiones ni Debriefs, sin quitar pistas y sin cambiar valores.
- El contenido se verificó contra los datos al planear. Un Concepto recortado deja a la persona sin lo que necesita para la tarea.
- Si algo parece largo o repetido, se comenta en la revisión; no se cambia al implementar.

**Entorno y texto**
- Todo se ejecuta con `docker compose run --rm tools ...`.
- `npm run test:e2e` corre contra el build de producción.
- El texto visible va en español de Chile, tratando de tú, sin voseo y con lenguaje neutro.

**Escribir tareas de Python en MDX**
- El código va en expresiones JSX con `\n` y `\"`: `solucion={"x = 1\ny = \"a\""}`.
- Un atributo entre comillas simples de HTML (`pregunta="…"`) no admite `\"`. Si el texto lleva comillas dobles, va como expresión: `pregunta={"…"}`.

**Pruebas de las tareas**
- Cada `assert` lleva un mensaje que dice qué debe cumplir la variable, sin mostrar el código.
- Si falta una variable, el motor ya responde "Falta crear «x»".
- En la misión sin guía los mensajes son neutros ("no coincide").

**Páginas**
- `/casos/[caso]` y `/casos/[caso]/[mision]` siguen estáticas, con `x-nextjs-cache: HIT`.
- Python se descarga una sola vez por visita, desde el CDN de Pyodide.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Filtrar con `&` sin paréntesis** (`pedidos[pedidos["cantidad"] >= 3 & pedidos["estado"] == "entregado"]`). La persona ve "Combinaste condiciones con & o | sin paréntesis." y un ejemplo, no "tipos incompatibles". Tests en Task 1 (motor) y Task 4 (e2e).
2. **El código "de la IA" de la misión 8** no da error, pero deja `entregados` vacío (`nan` y 0 clientes) y, al corregir el filtro, cuenta pedidos en vez de clientes (353 en vez de 85). Las pruebas rechazan ambas versiones con mensajes que no dan la respuesta. Comprobado al planear; se revisa en la Task 3, Step 3.
3. **Limpiar en el orden equivocado:** contar los vacíos después de quitarlos (da 0) o pasar a entero antes de quitar los vacíos (error de pandas). La prueba de `nulos` lo detecta y las pistas explican el orden. Test en la misión 4: el validador ejecuta la solución y las pruebas.
4. **Alguien edita a mano un CSV o cambia la semilla.** La prueba "los CSV son los generados" falla, y "esconde los dos patrones del caso" falla si Vestuario deja de devolverse más o noviembre deja de ser el mes más fuerte. Tests en Task 2.
5. **Una solución del contenido que no pasa sus propias pruebas** con los datos generados, por ejemplo un valor esperado mal copiado. El validador ejecuta las 10 soluciones con pandas en Pyodide. Test: `pnpm --filter @syntaxerror/content validate` en la Task 3.

## Estructura de archivos

```
packages/engines/src/python-errores.ts           & sin paréntesis y and/or con columnas
packages/content/src/generadores/tienda-online-pewen.ts
packages/content/src/generar-cli.ts              registra el generador del caso
content/casos/tienda-online-pewen/               caso.yaml, datos/ (generados) y 9 misiones
content/rutas/data-analyst.yaml                  agrega tienda-online-pewen
e2e/tests/progreso.ts                            agrega las misiones de minimarkets-del-sur
e2e/tests/pewen.spec.ts, e2e/calentar.ts
README.md
```

---

### Task 1: Python: explicar los errores de pandas al combinar condiciones

**Files:**
- Modify: `packages/engines/src/python-errores.ts`
- Test: `packages/engines/src/python-errores.test.ts`

**Interfaces:**
- Consumes: `explicarErrorPython` (Fase 3e2).
- Produces dos explicaciones nuevas:
  - para `TypeError: Cannot perform 'rand_' …` (también `and_`, `or_`, `ror_`) y para `unsupported operand type(s) for &`: el mensaje "Combinaste condiciones con & o | sin paréntesis." y la sugerencia con un ejemplo;
  - para `ValueError: The truth value of a … is ambiguous`: el mensaje "Usaste and, or o un if con una columna completa.".

- [ ] **Step 1: Escribir la prueba**

En `packages/engines/src/python-errores.test.ts`, antes de `it("archivo, módulo, posición y conversión"`, agrega:
```ts
  it("los errores típicos de pandas al combinar condiciones", () => {
    expect(explicarErrorPython(traza(enLinea(1), "TypeError: Cannot perform 'rand_' with a dtyped [object] array and scalar of type [bool]"))).toMatchObject({
      mensaje: "Combinaste condiciones con & o | sin paréntesis.",
      sugerencia: 'Pon cada condición entre paréntesis: (tabla["cantidad"] >= 3) & (tabla["estado"] == "entregado").',
    });
    expect(explicarErrorPython(traza(enLinea(1), "ValueError: The truth value of a Series is ambiguous. Use a.empty, a.bool(), a.item(), a.any() or a.all()."))).toMatchObject({
      mensaje: "Usaste and, or o un if con una columna completa.",
    });
  });
```

- [ ] **Step 2: Correr y ver que falla**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/python-errores.test.ts`
Expected: FAIL, porque el mensaje es "Estás combinando tipos de datos o argumentos que no son compatibles.".

- [ ] **Step 3: Implementar**

En `packages/engines/src/python-errores.ts`:

1. Reemplaza el inicio de `function tipos(detalle: string): Explicacion {` por:
```ts
// En pandas, & y | se evalúan antes que las comparaciones: sin paréntesis, compara un número con una columna de texto.
const SIN_PARENTESIS = "Pon cada condición entre paréntesis: (tabla[\"cantidad\"] >= 3) & (tabla[\"estado\"] == \"entregado\").";

function tipos(detalle: string): Explicacion {
  if (/Cannot perform '(?:r?and_|r?or_)' with a dtyped/.test(detalle) || /unsupported operand type\(s\) for [&|]/.test(detalle)) {
    return { mensaje: "Combinaste condiciones con & o | sin paréntesis.", sugerencia: SIN_PARENTESIS };
  }
```
2. En la regla `ValueError`, agrega como primera comprobación:
```ts
    if (detalle.startsWith("The truth value of a")) {
      return {
        mensaje: "Usaste and, or o un if con una columna completa.",
        sugerencia: "Para combinar condiciones fila por fila, pandas usa & (y) y | (o), con cada condición entre paréntesis.",
      };
    }
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines test && pnpm --filter @syntaxerror/engines exec tsc --noEmit -p ."`
Expected: PASS (11 pruebas en `python-errores.test.ts`) y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add packages/engines/src/python-errores.ts packages/engines/src/python-errores.test.ts
git commit -m "feat(python): explicar los errores de pandas al combinar condiciones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Generador de datos de Tienda Online Pewen

**Files:**
- Create: `packages/content/src/generadores/tienda-online-pewen.ts`
- Test: `packages/content/src/generadores/tienda-online-pewen.test.ts`
- Modify: `packages/content/src/generar-cli.ts`
- Create (generados): `content/casos/tienda-online-pewen/datos/clientes.csv`, `productos.csv` y `pedidos.csv`

**Interfaces:**
- Consumes: `crearAleatorio`, `FilaDato` y `aCsv` (Fase 4b).
- Produces en `generadores/tienda-online-pewen`:
  - `SEMILLA_PEWEN`, `CANTIDAD_CLIENTES = 90`, `CANTIDAD_PEDIDOS = 420`;
  - `PRODUCTOS_PEWEN` (24) y `DEFECTOS_PEWEN`;
  - `generarTiendaOnlinePewen(): { clientes; productos; pedidos }`.
- Produces las tablas que usa el caso:
  - `clientes`: cliente_id, region, canal, fecha_registro;
  - `productos`: producto_id, nombre, categoria, precio;
  - `pedidos`: pedido_id, fecha, cliente_id, producto_id, cantidad, precio_unitario, estado. Son 420 pedidos más 4 duplicados al final.

- [ ] **Step 1: Escribir las pruebas**

`packages/content/src/generadores/tienda-online-pewen.test.ts`:
```ts
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { aCsv } from "./despachos-rapidos";
import { CANTIDAD_CLIENTES, CANTIDAD_PEDIDOS, DEFECTOS_PEWEN, generarTiendaOnlinePewen, PRODUCTOS_PEWEN } from "./tienda-online-pewen";

const DATOS = fileURLToPath(new URL("../../../../content/casos/tienda-online-pewen/datos/", import.meta.url));

describe("generarTiendaOnlinePewen", () => {
  const datos = generarTiendaOnlinePewen();
  const pedidos = datos.pedidos.slice(0, CANTIDAD_PEDIDOS);
  const categoria = new Map(PRODUCTOS_PEWEN.map((producto) => [producto.producto_id, producto.categoria]));

  it("genera siempre lo mismo", () => {
    expect(generarTiendaOnlinePewen()).toEqual(datos);
  });

  it("los CSV del repositorio son los generados: no se editan a mano", async () => {
    for (const [tabla, filas] of Object.entries(datos)) {
      expect(await readFile(`${DATOS}${tabla}.csv`, "utf8"), tabla).toBe(aCsv(filas));
    }
  });

  it("trae los defectos que enseña la misión de limpieza, en sus posiciones", () => {
    expect(datos.clientes).toHaveLength(CANTIDAD_CLIENTES);
    expect(datos.pedidos).toHaveLength(CANTIDAD_PEDIDOS + DEFECTOS_PEWEN.duplicados.length);
    expect(pedidos.filter((pedido) => pedido.cantidad === null).map((pedido) => pedido.pedido_id)).toEqual(DEFECTOS_PEWEN.cantidadVacia.map((indice) => 5001 + indice));
    expect(datos.pedidos.slice(CANTIDAD_PEDIDOS)).toEqual(DEFECTOS_PEWEN.duplicados.map((indice) => datos.pedidos[indice]));
    expect(datos.clientes.filter((cliente) => cliente.region === null)).toHaveLength(DEFECTOS_PEWEN.regionVacia.length);
  });

  it("los pedidos son coherentes: fechas del segundo semestre, en orden, con precio y referencias válidas", () => {
    const clientes = new Set(datos.clientes.map((cliente) => cliente.cliente_id));
    expect(pedidos.map((pedido) => pedido.fecha)).toEqual([...pedidos.map((pedido) => pedido.fecha)].sort());
    for (const pedido of pedidos) {
      expect(pedido.fecha).toMatch(/^2025-(0[7-9]|1[0-2])-\d{2}$/);
      expect(clientes.has(pedido.cliente_id)).toBe(true);
      expect(PRODUCTOS_PEWEN.find((producto) => producto.producto_id === pedido.producto_id)?.precio).toBe(pedido.precio_unitario);
    }
  });

  it("esconde los dos patrones del caso: Vestuario se devuelve más y noviembre vende más", () => {
    const tasa = (nombre: string) => {
      const deLaCategoria = pedidos.filter((pedido) => categoria.get(pedido.producto_id) === nombre);
      return deLaCategoria.filter((pedido) => pedido.estado === "devuelto").length / deLaCategoria.length;
    };
    for (const otra of ["Hogar", "Cocina", "Decoración"]) expect(tasa("Vestuario")).toBeGreaterThan(tasa(otra) * 2);
    const porMes = (mes: string) => pedidos.filter((pedido) => String(pedido.fecha).startsWith(`2025-${mes}`)).length;
    for (const mes of ["07", "08", "09", "10", "12"]) expect(porMes("11")).toBeGreaterThan(porMes(mes));
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/generadores/tienda-online-pewen.test.ts`
Expected: FAIL, "Failed to resolve import ./tienda-online-pewen".

- [ ] **Step 3: Implementar**

`packages/content/src/generadores/tienda-online-pewen.ts`:
```ts
import { crearAleatorio } from "./aleatorio";
import type { FilaDato } from "./despachos-rapidos";

// Datos del Caso 3, "Tienda Online Pewen": un e-commerce chileno de hogar y vestuario, julio a diciembre de 2025.
// Traen defectos para limpiar con pandas (misión 4): pedidos duplicados, cantidades vacías y regiones vacías.
// Y dos patrones para descubrir (misión 7): Vestuario se devuelve mucho más que el resto, y noviembre
// (Black Friday) vende más que cualquier otro mes.

export type DatosPewen = { clientes: FilaDato[]; productos: FilaDato[]; pedidos: FilaDato[] };

export const SEMILLA_PEWEN = 20250701;
export const CANTIDAD_CLIENTES = 90;
export const CANTIDAD_PEDIDOS = 420;
const PRIMER_PEDIDO = 5001;

export const PRODUCTOS_PEWEN: FilaDato[] = [
  { producto_id: "P01", nombre: "Juego de sábanas 2 plazas", categoria: "Hogar", precio: 24990 },
  { producto_id: "P02", nombre: "Toalla de baño", categoria: "Hogar", precio: 8990 },
  { producto_id: "P03", nombre: "Plumón nórdico", categoria: "Hogar", precio: 39990 },
  { producto_id: "P04", nombre: "Almohada viscoelástica", categoria: "Hogar", precio: 14990 },
  { producto_id: "P05", nombre: "Cortina blackout", categoria: "Hogar", precio: 19990 },
  { producto_id: "P06", nombre: "Manta de lana", categoria: "Hogar", precio: 22990 },
  { producto_id: "P07", nombre: "Sartén antiadherente", categoria: "Cocina", precio: 17990 },
  { producto_id: "P08", nombre: "Set de cuchillos", categoria: "Cocina", precio: 29990 },
  { producto_id: "P09", nombre: "Tetera eléctrica", categoria: "Cocina", precio: 21990 },
  { producto_id: "P10", nombre: "Juego de tazas", categoria: "Cocina", precio: 12990 },
  { producto_id: "P11", nombre: "Tabla de madera nativa", categoria: "Cocina", precio: 15990 },
  { producto_id: "P12", nombre: "Olla de greda", categoria: "Cocina", precio: 18990 },
  { producto_id: "P13", nombre: "Cojín de lino", categoria: "Decoración", precio: 11990 },
  { producto_id: "P14", nombre: "Lámpara de mimbre", categoria: "Decoración", precio: 34990 },
  { producto_id: "P15", nombre: "Florero de cerámica", categoria: "Decoración", precio: 13990 },
  { producto_id: "P16", nombre: "Cuadro de paisaje", categoria: "Decoración", precio: 27990 },
  { producto_id: "P17", nombre: "Vela aromática", categoria: "Decoración", precio: 7990 },
  { producto_id: "P18", nombre: "Polerón de algodón", categoria: "Vestuario", precio: 24990 },
  { producto_id: "P19", nombre: "Chaqueta impermeable", categoria: "Vestuario", precio: 49990 },
  { producto_id: "P20", nombre: "Pantalón de buzo", categoria: "Vestuario", precio: 19990 },
  { producto_id: "P21", nombre: "Polera básica", categoria: "Vestuario", precio: 9990 },
  { producto_id: "P22", nombre: "Calcetines de lana", categoria: "Vestuario", precio: 6990 },
  { producto_id: "P23", nombre: "Pijama polar", categoria: "Vestuario", precio: 21990 },
  { producto_id: "P24", nombre: "Gorro tejido", categoria: "Vestuario", precio: 8990 },
];

const REGIONES = [["Metropolitana", 9], ["Valparaíso", 3], ["Biobío", 3], ["La Araucanía", 2], ["Los Lagos", 2], ["Maule", 1], ["Coquimbo", 1]] as const;
const CANALES = [["instagram", 4], ["google", 3], ["recomendación", 2], ["tiktok", 2]] as const;
// En noviembre (Black Friday) se vende más del doble que en un mes normal.
const MESES = [[7, 2], [8, 2], [9, 2], [10, 2.2], [11, 5], [12, 3]] as const;
const DIAS_DEL_MES: Record<number, number> = { 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31 };
// La ropa se devuelve más: tallas que no calzan.
const PROBABILIDAD_DEVOLUCION: Record<string, number> = { Vestuario: 0.22, Hogar: 0.05, Cocina: 0.04, Decoración: 0.06 };

// Los defectos, en posiciones fijas (índice de pedido, desde 0).
export const DEFECTOS_PEWEN = {
  cantidadVacia: [14, 77, 150, 233, 301],
  duplicados: [40, 120, 260, 380],
  regionVacia: [5, 22, 37, 58, 71, 84],
};

const dosDigitos = (numero: number) => String(numero).padStart(2, "0");

export function generarTiendaOnlinePewen(): DatosPewen {
  const aleatorio = crearAleatorio(SEMILLA_PEWEN);
  const clientes: FilaDato[] = [];
  for (let indice = 0; indice < CANTIDAD_CLIENTES; indice += 1) {
    clientes.push({
      cliente_id: `C${String(indice + 1).padStart(3, "0")}`,
      region: DEFECTOS_PEWEN.regionVacia.includes(indice) ? null : aleatorio.elegirConPeso(REGIONES),
      canal: aleatorio.elegirConPeso(CANALES),
      fecha_registro: `2025-${dosDigitos(aleatorio.entero(1, 6))}-${dosDigitos(aleatorio.entero(1, 28))}`,
    });
  }
  // Pocos clientes compran mucho y muchos compran una o dos veces, como en toda tienda.
  const pesosCliente = clientes.map((cliente, indice) => [cliente.cliente_id, indice % 9 === 0 ? 6 : indice % 3 === 0 ? 2 : 1] as const);
  const pesosProducto = PRODUCTOS_PEWEN.map((producto) => [producto, producto.categoria === "Vestuario" ? 4 : 3] as const);

  const pedidos: FilaDato[] = [];
  for (let indice = 0; indice < CANTIDAD_PEDIDOS; indice += 1) {
    const mes = aleatorio.elegirConPeso(MESES);
    const producto = aleatorio.elegirConPeso(pesosProducto);
    const azar = aleatorio.siguiente();
    const devolucion = PROBABILIDAD_DEVOLUCION[String(producto.categoria)];
    pedidos.push({
      fecha: `2025-${dosDigitos(mes)}-${dosDigitos(aleatorio.entero(1, DIAS_DEL_MES[mes]))}`,
      cliente_id: aleatorio.elegirConPeso(pesosCliente),
      producto_id: producto.producto_id,
      cantidad: aleatorio.elegirConPeso([[1, 7], [2, 3], [3, 1], [4, 1]] as const),
      precio_unitario: producto.precio,
      estado: azar < devolucion ? "devuelto" : azar < devolucion + 0.03 ? "cancelado" : "entregado",
    });
  }
  pedidos.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  const conId = pedidos.map((pedido, indice) => ({
    pedido_id: PRIMER_PEDIDO + indice,
    ...pedido,
    cantidad: DEFECTOS_PEWEN.cantidadVacia.includes(indice) ? null : pedido.cantidad,
  }));
  for (const indice of DEFECTOS_PEWEN.duplicados) conId.push({ ...conId[indice] });
  return { clientes, productos: PRODUCTOS_PEWEN, pedidos: conId };
}
```

En `packages/content/src/generar-cli.ts`:

1. Agrega el import:
```ts
import { generarTiendaOnlinePewen } from "./generadores/tienda-online-pewen";
```
2. Agrega a `generadores`:
```ts
  "tienda-online-pewen": generarTiendaOnlinePewen,
```

- [ ] **Step 4: Generar y correr las pruebas**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content generar`
Expected: los datos de los casos 1 y 2 sin cambios, más:
```
[content] casos/tienda-online-pewen/datos/clientes.csv: 90 filas
[content] casos/tienda-online-pewen/datos/productos.csv: 24 filas
[content] casos/tienda-online-pewen/datos/pedidos.csv: 424 filas
```

Las primeras líneas de `pedidos.csv` deben ser exactamente estas:
```
pedido_id,fecha,cliente_id,producto_id,cantidad,precio_unitario,estado
5001,2025-07-01,C019,P24,1,8990,entregado
5002,2025-07-02,C049,P16,1,27990,entregado
```

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content exec vitest run src/generadores && pnpm --filter @syntaxerror/content exec tsc --noEmit -p ."`
Expected: PASS (16 pruebas) y sin errores de tipos. `git status` no debe mostrar cambios en los datos de los casos 1 y 2.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/generadores packages/content/src/generar-cli.ts content/casos/tienda-online-pewen/datos
git commit -m "feat(contenido): generador reproducible de los datos de tienda online pewen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: El contenido del Caso 3

**Files:**
- Create: `content/casos/tienda-online-pewen/caso.yaml` y sus 9 misiones
- Modify: `content/rutas/data-analyst.yaml`

**Interfaces:**
- Consumes: los datos de la Task 2, y `PythonTask` y `PythonEjemplo`, que ya existen.
- Produces:
  - el caso `tienda-online-pewen`, cuarto en la ruta;
  - estos ids de tarea, por misión:
    1. `totales-del-carrito` y `primera-tabla`;
    2. `explorar-pedidos`;
    3. `devueltos` y `envios-grandes`;
    4. `limpiar-pedidos`;
    5. `mejores-clientes`;
    6. `ventas-por-categoria-y-region`;
    7. `devoluciones-y-meses`;
    8. `corregir-codigo-ia`;
    9. `cinco-respuestas`.

El recorrido del caso:

| # | Misión | Lo que se practica | Repasa |
|---|---|---|---|
| 1 | De la planilla a Python | variables, listas, `sum`/`len`/`round`, el primer `DataFrame` | Caso 1 |
| 2 | Cargar y explorar | `read_csv`, `len`, `head`, `info`, `value_counts` | |
| 3 | Filtrar y seleccionar | condiciones, `&` con paréntesis, `.loc` | Caso 2 (`WHERE`) |
| 4 | Limpiar | `isna`, `drop_duplicates`, `dropna`, `fillna`, `astype`, `to_datetime` | 2 |
| 5 | Agrupar y resumir | columnas calculadas, `groupby`, `sort_values`, `head` | 3 y 4 |
| 6 | Cruzar tablas | `merge` y control de filas | 5, Caso 2 (`JOIN`) |
| 7 | Detectar patrones | tasas con `mean` de booleanos, `.dt.month`, `idxmax` | 5 y 6 |
| 8 | Revisar el código de la IA | verificar resultados intermedios, `nunique` | 3 y 5 |
| 9 | Recomendaciones para el negocio (sin guía) | todo el caso, desde los archivos sin limpiar | todo |

Todos los valores de las `pruebas` se calcularon con pandas en Pyodide sobre los datos generados. El Step 3 lo comprueba ejecutando cada solución.

- [ ] **Step 1: Caso y ruta**

`content/casos/tienda-online-pewen/caso.yaml`:
```yaml
slug: tienda-online-pewen
titulo: "Tienda Online Pewen: analizar ventas con Python y pandas"
cargo: Analista de datos junior
empresa: Tienda Online Pewen
dataset: Pedidos, productos y clientes de julio a diciembre de 2025 (datos generados con un script reproducible)
entregable: Un repositorio en GitHub con tu notebook de análisis (.ipynb, por ejemplo hecho en Google Colab), que cargue y limpie los datos, responda las preguntas de Antonia y cierre con recomendaciones, más un README que resuma lo que encontraste.
archivos:
  - .ipynb
rubrica:
  - "El notebook se puede ejecutar de principio a fin y cada paso tiene una explicación breve en texto."
  - "La limpieza está documentada: qué problemas había, cuántas filas afectaba cada uno y qué se hizo."
  - "Las recomendaciones se apoyan en resultados del notebook, como las devoluciones de Vestuario o el peso de noviembre."
misiones:
  - 01-de-la-planilla-a-python
  - 02-cargar-y-explorar
  - 03-filtrar-y-seleccionar
  - 04-limpiar
  - 05-agrupar-y-resumir
  - 06-cruzar-tablas
  - 07-detectar-patrones
  - 08-revisar-el-codigo-de-la-ia
  - 09-recomendaciones-para-el-negocio
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
  - tienda-online-pewen
```

- [ ] **Step 2: Las misiones (copia literal)**

`content/casos/tienda-online-pewen/misiones/01-de-la-planilla-a-python.mdx`:
```mdx
---
titulo: De la planilla a Python
tiempo: 25
---

<Brief de="Antonia Llancaqueo, cofundadora de Tienda Online Pewen">
Hola, bienvenida o bienvenido a Pewen. Vendemos productos de hogar y vestuario por internet, y cada semana alguien arma los informes a mano en planillas. Queremos automatizarlos con Python. Antes de tocar los datos reales, quiero que te sientas cómoda o cómodo con lo básico: guardar valores, calcular con listas y armar tu primera tabla.
</Brief>

<Concepto>
En Python, una **variable** guarda un valor con un nombre: `precio = 24990`. Ese nombre se usa después en los cálculos, como una celda con nombre en una planilla.

Una **lista** guarda varios valores en orden, entre corchetes: `precios = [24990, 8990, 39990]`. Algunas funciones que vas a usar mucho:

| Python | Qué hace | En planilla |
| --- | --- | --- |
| `sum(precios)` | suma la lista | `SUMA` |
| `len(precios)` | cuenta los elementos | `CONTAR` |
| `max(precios)` | el mayor | `MAX` |
| `round(valor)` | redondea al entero | `REDONDEAR(valor; 0)` |

<PythonEjemplo codigo={"precios = [24990, 8990, 39990]\ntotal = sum(precios)\nprint(\"Total:\", total)\nprint(\"Productos:\", len(precios))"} />

Para trabajar con tablas se usa **pandas**. Una tabla de pandas se llama `DataFrame` y se puede crear a partir de columnas:

<PythonEjemplo codigo={"import pandas as pd\ntabla = pd.DataFrame({\"producto\": [\"Toalla\", \"Manta\"], \"precio\": [8990, 22990]})\nprint(tabla)"} />

Después de **Ejecutar**, las tablas que quedan en variables se muestran ordenadas bajo el editor.
</Concepto>

<PythonTask
  id="totales-del-carrito"
  enunciado="La lista precios tiene los productos de un carrito. Guarda en total la suma de los precios y en promedio el precio promedio, redondeado a pesos."
  preparacion={"precios = [24990, 8990, 39990, 14990]"}
  inicial={"total = None\npromedio = None"}
  solucion={"total = sum(precios)\npromedio = round(total / len(precios))"}
  pruebas={"assert total == 88960, \"total debe ser la suma de los precios de la lista.\"\nassert promedio == 22240, \"promedio debe ser el total dividido por la cantidad de productos, redondeado.\""}
  paquetes={["pandas"]}
  pistas={["sum(precios) suma la lista y len(precios) cuenta cuántos precios hay.", "El promedio es el total dividido por la cantidad; round() lo deja sin decimales."]}
/>

<PythonTask
  id="primera-tabla"
  enunciado="Crea un DataFrame llamado catalogo con dos columnas: nombre (Juego de sábanas, Toalla de baño y Plumón nórdico) y precio (24990, 8990 y 39990). Luego guarda en mas_caro el precio más alto de la tabla."
  preparacion={"import pandas as pd"}
  inicial={"catalogo = None\nmas_caro = None"}
  solucion={"catalogo = pd.DataFrame({\"nombre\": [\"Juego de sábanas\", \"Toalla de baño\", \"Plumón nórdico\"], \"precio\": [24990, 8990, 39990]})\nmas_caro = catalogo[\"precio\"].max()"}
  pruebas={"assert isinstance(catalogo, pd.DataFrame), \"catalogo debe ser un DataFrame de pandas.\"\nassert list(catalogo.columns) == [\"nombre\", \"precio\"], \"catalogo debe tener las columnas nombre y precio, en ese orden.\"\nassert len(catalogo) == 3, \"catalogo debe tener tres productos.\"\nassert mas_caro == 39990, \"mas_caro debe ser el precio más alto de la columna precio.\""}
  paquetes={["pandas"]}
  pistas={["pd.DataFrame recibe un diccionario: cada clave es una columna y su valor, una lista.", "Una columna se lee con catalogo[\"precio\"], y .max() da el mayor valor."]}
/>

<Decision
  pregunta="¿Por qué conviene pasar de la planilla a Python para el informe semanal?"
  opciones={[
    { texto: "Porque el código se puede volver a ejecutar cada semana con datos nuevos y hace siempre los mismos pasos, sin copiar y pegar.", correcta: true, porque: "Automatizar no es hacer algo más difícil: es dejar escrito el proceso para que sea repetible y revisable." },
    { texto: "Porque Python da resultados más exactos que una planilla.", porque: "Ambos calculan bien. La ventaja está en repetir el análisis sin errores manuales y en manejar más datos." },
  ]}
/>

<Debrief entrevista="Es común que pregunten '¿qué diferencia hay entre una lista y un DataFrame?'. Una respuesta clara: la lista guarda valores en orden; el DataFrame es una tabla con columnas con nombre, como una hoja de planilla.">
Variables, listas y funciones como `sum` y `len` son la base de todo lo que viene. pandas agrega las tablas (`DataFrame`), y con ellas vas a hacer en Python lo mismo que en la planilla y en SQL: filtrar, resumir y cruzar.
</Debrief>
```

`content/casos/tienda-online-pewen/misiones/02-cargar-y-explorar.mdx`:
```mdx
---
titulo: Cargar y explorar
tiempo: 25
---

<Brief de="Antonia Llancaqueo, cofundadora de Tienda Online Pewen">
Te dejé los pedidos de julio a diciembre en datos/pedidos.csv. Antes de analizar nada, quiero que me cuentes qué hay en el archivo: cuántas filas trae y cuántos pedidos hay en cada estado. Ojo, que nunca lo hemos revisado a fondo.
</Brief>

<Concepto>
`pd.read_csv` lee un archivo CSV y lo convierte en un DataFrame:

<PythonEjemplo codigo={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")\nprint(pedidos.head())"} />

Lo primero que se hace con una tabla nueva es conocerla:

| Código | Qué muestra |
| --- | --- |
| `pedidos.head()` | las primeras 5 filas |
| `len(pedidos)` | cuántas filas tiene |
| `pedidos.columns` | los nombres de las columnas |
| `pedidos.info()` | columnas, tipos y celdas no vacías |
| `pedidos["estado"].value_counts()` | cuántas veces aparece cada valor de una columna |

`value_counts()` es como un `CONTAR.SI` de cada valor a la vez.
</Concepto>

<PythonTask
  id="explorar-pedidos"
  enunciado="Carga datos/pedidos.csv en la variable pedidos. Guarda en filas la cantidad de filas y en estados la cantidad de pedidos de cada estado."
  preparacion={"import pandas as pd"}
  inicial={"pedidos = None\nfilas = None\nestados = None"}
  solucion={"pedidos = pd.read_csv(\"datos/pedidos.csv\")\nfilas = len(pedidos)\nestados = pedidos[\"estado\"].value_counts()"}
  pruebas={"assert isinstance(pedidos, pd.DataFrame), \"pedidos debe ser la tabla leída desde datos/pedidos.csv.\"\nassert filas == 424, \"filas debe ser la cantidad de filas de pedidos.\"\nassert estados[\"entregado\"] == 362 and estados[\"devuelto\"] == 52, \"estados debe contar cuántos pedidos hay en cada estado.\""}
  paquetes={["pandas"]}
  pistas={["pd.read_csv(\"datos/pedidos.csv\") lee el archivo.", "len(pedidos) cuenta las filas.", "La columna se llama estado; value_counts() cuenta cada valor."]}
/>

<Decision
  pregunta="info() muestra que la columna cantidad tiene 419 valores y la tabla tiene 424 filas. ¿Qué haces?"
  opciones={[
    { texto: "Lo anoto: hay 5 pedidos sin cantidad. Antes de calcular montos hay que decidir qué hacer con ellos.", correcta: true, porque: "Explorar sirve justamente para encontrar estos problemas antes de que se cuelen en los resultados." },
    { texto: "Nada: pandas los ignora solo.", porque: "Algunos cálculos los ignoran y otros no, y el resultado puede cambiar sin avisar. Hay que decidirlo a propósito." },
  ]}
/>

<Debrief entrevista="Si te dan un archivo nuevo en una prueba técnica, empieza en voz alta: 'primero veo cuántas filas tiene, qué columnas, de qué tipo y si hay vacíos'. Eso muestra método.">
`read_csv`, `head`, `info` y `value_counts` son tu primera mirada a cualquier tabla. Explorar antes de analizar evita conclusiones construidas sobre datos con problemas.
</Debrief>
```

`content/casos/tienda-online-pewen/misiones/03-filtrar-y-seleccionar.mdx`:
```mdx
---
titulo: Filtrar y seleccionar
tiempo: 25
---

<Brief de="Antonia Llancaqueo, cofundadora de Tienda Online Pewen">
Atención al cliente me pide los pedidos devueltos para llamar a esos clientes. Y logística quiere los pedidos entregados de 3 unidades o más, solo con el número de pedido y la cantidad, para revisar el embalaje de los envíos grandes.
</Brief>

<Concepto>
Para **filtrar filas**, se escribe una condición entre corchetes. La condición da `True` o `False` para cada fila, y quedan solo las `True`:

<PythonEjemplo codigo={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")\ncancelados = pedidos[pedidos[\"estado\"] == \"cancelado\"]\nprint(len(cancelados))"} />

Para combinar condiciones se usan `&` (y) y `|` (o), con **cada condición entre paréntesis**:

`pedidos[(pedidos["cantidad"] >= 3) & (pedidos["estado"] == "entregado")]`

Para **elegir columnas**, se pasa una lista de nombres: `pedidos[["pedido_id", "cantidad"]]`. Filtrar filas y elegir columnas a la vez se hace con `.loc[filas, columnas]`:

`pedidos.loc[pedidos["cantidad"] >= 3, ["pedido_id", "cantidad"]]`

Es lo mismo que un `WHERE` con un `SELECT` de columnas en SQL.
</Concepto>

<PythonTask
  id="devueltos"
  enunciado="Guarda en devueltos los pedidos cuyo estado es devuelto."
  preparacion={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")"}
  inicial="devueltos = None"
  solucion={"devueltos = pedidos[pedidos[\"estado\"] == \"devuelto\"]"}
  pruebas={"assert isinstance(devueltos, pd.DataFrame), \"devueltos debe ser una tabla filtrada de pedidos.\"\nassert len(devueltos) == 52, \"devueltos debe tener solo los pedidos con estado devuelto.\"\nassert (devueltos[\"estado\"] == \"devuelto\").all(), \"devueltos tiene pedidos con otro estado.\""}
  paquetes={["pandas"]}
  pistas={["La condición es pedidos[\"estado\"] == \"devuelto\".", "La condición va entre corchetes, después de pedidos."]}
/>

<PythonTask
  id="envios-grandes"
  enunciado="Guarda en grandes los pedidos entregados de 3 unidades o más, solo con las columnas pedido_id y cantidad."
  preparacion={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")"}
  inicial="grandes = None"
  solucion={"grandes = pedidos.loc[(pedidos[\"cantidad\"] >= 3) & (pedidos[\"estado\"] == \"entregado\"), [\"pedido_id\", \"cantidad\"]]"}
  pruebas={"assert isinstance(grandes, pd.DataFrame), \"grandes debe ser una tabla.\"\nassert list(grandes.columns) == [\"pedido_id\", \"cantidad\"], \"grandes debe tener solo las columnas pedido_id y cantidad, en ese orden.\"\nassert len(grandes) == 71, \"grandes debe tener los pedidos entregados de 3 unidades o más.\""}
  paquetes={["pandas"]}
  pistas={["Son dos condiciones a la vez: únelas con & y pon cada una entre paréntesis.", "Para quedarte con dos columnas usa .loc[condición, [\"pedido_id\", \"cantidad\"]]."]}
/>

<Decision
  pregunta={"Escribes pedidos[pedidos[\"cantidad\"] >= 3 & pedidos[\"estado\"] == \"entregado\"] y Python responde con un error. ¿Por qué?"}
  opciones={[
    { texto: "Porque & se evalúa antes que >= y ==: cada condición tiene que ir entre paréntesis.", correcta: true, porque: "Es la misma idea que los paréntesis con AND y OR en SQL: sin ellos, el orden de evaluación cambia el significado." },
    { texto: "Porque en pandas se escribe and en vez de &.", porque: "and funciona con un solo valor; para comparar columnas completas, fila por fila, pandas usa & y |." },
  ]}
/>

<Debrief entrevista="Una pregunta técnica frecuente: '¿cómo filtras un DataFrame por dos condiciones?'. Responde con el código y menciona los paréntesis: es el error que más se comete.">
Filtrar es escribir una condición que da `True` o `False` por fila. `&` y `|` combinan condiciones (siempre con paréntesis), y `.loc` filtra filas y elige columnas a la vez.
</Debrief>
```

`content/casos/tienda-online-pewen/misiones/04-limpiar.mdx`:
```mdx
---
titulo: Limpiar
tiempo: 30
---

<Brief de="Antonia Llancaqueo, cofundadora de Tienda Online Pewen">
Con lo que encontraste me quedé preocupada: pedidos sin cantidad, fechas que parecen texto y clientes sin región. Antes de calcular ventas, deja los datos listos. Y cuéntame cuántos pedidos venían sin cantidad, para hablarlo con quien carga los datos.
</Brief>

<Concepto>
Cuatro herramientas para los problemas más comunes:

**Vacíos.** `isna()` marca las celdas vacías (en pandas se llaman `NaN`) y `.sum()` las cuenta:

`pedidos["cantidad"].isna().sum()`

Después se decide qué hacer: `dropna(subset=["cantidad"])` quita esas filas, y `fillna("Sin región")` las rellena con un valor.

**Duplicados.** `drop_duplicates()` quita las filas idénticas a otra.

**Tipos.** Una columna con vacíos queda como decimal (`4.0`). `astype(int)` la pasa a entero, una vez que ya no tiene vacíos. Las fechas llegan como texto: `pd.to_datetime` las convierte en fechas de verdad, con las que se puede agrupar por mes.

<PythonEjemplo codigo={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")\nprint(pedidos.dtypes)\nprint(\"Duplicados:\", pedidos.duplicated().sum())"} />

Un cambio sobre una columna se guarda asignándolo: `pedidos["fecha"] = pd.to_datetime(pedidos["fecha"])`. Las operaciones sobre la tabla completa devuelven una tabla nueva, así que hay que guardarla: `pedidos = pedidos.drop_duplicates()`.
</Concepto>

<PythonTask
  id="limpiar-pedidos"
  enunciado="Guarda en nulos cuántos pedidos vienen sin cantidad. Después limpia pedidos: quita los duplicados y las filas sin cantidad, deja cantidad como entero y fecha como fecha. Por último, rellena las regiones vacías de clientes con «Sin región»."
  preparacion={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")\nclientes = pd.read_csv(\"datos/clientes.csv\")"}
  inicial="nulos = None"
  solucion={"nulos = pedidos[\"cantidad\"].isna().sum()\npedidos = pedidos.drop_duplicates()\npedidos = pedidos.dropna(subset=[\"cantidad\"])\npedidos[\"cantidad\"] = pedidos[\"cantidad\"].astype(int)\npedidos[\"fecha\"] = pd.to_datetime(pedidos[\"fecha\"])\nclientes[\"region\"] = clientes[\"region\"].fillna(\"Sin región\")"}
  pruebas={"assert nulos == 5, \"nulos debe contar los pedidos sin cantidad, antes de quitar nada.\"\nassert len(pedidos) == 415, \"pedidos debe quedar sin duplicados y sin filas sin cantidad.\"\nassert pedidos.duplicated().sum() == 0, \"pedidos todavía tiene filas duplicadas.\"\nassert str(pedidos[\"cantidad\"].dtype).startswith(\"int\"), \"La columna cantidad debe quedar como número entero.\"\nassert pd.api.types.is_datetime64_any_dtype(pedidos[\"fecha\"]), \"La columna fecha debe quedar como fecha, no como texto.\"\nassert clientes[\"region\"].isna().sum() == 0 and (clientes[\"region\"] == \"Sin región\").sum() == 6, \"Las regiones vacías de clientes deben quedar como «Sin región».\""}
  paquetes={["pandas"]}
  pistas={["Cuenta los vacíos antes de quitarlos: después ya no estarán.", "Cada operación sobre la tabla se guarda: pedidos = pedidos.drop_duplicates().", "astype(int) falla si quedan vacíos: quítalos primero con dropna(subset=[\"cantidad\"])."]}
/>

<Decision
  pregunta="Hay 5 pedidos sin cantidad. ¿Por qué no rellenarlos con 1, que es la cantidad más común?"
  opciones={[
    { texto: "Porque inventaría ventas que no sabemos si ocurrieron así. Prefiero quitarlos, contarlos y avisar a quien carga los datos.", correcta: true, porque: "Rellenar es razonable cuando el valor por defecto es seguro (como «Sin región»), no cuando cambia los montos que se van a informar." },
    { texto: "Porque pandas no permite rellenar números.", porque: "fillna rellena números sin problema; la decisión es de criterio, no técnica." },
  ]}
/>

<Debrief entrevista="Casi siempre preguntan: '¿qué haces con los valores faltantes?'. La mejor respuesta no es una regla fija: depende de qué representa el dato, cuántos son y cómo afecta el resultado, y siempre se documenta.">
Limpiar es medir el problema (cuántos vacíos y cuántos duplicados), decidir qué hacer con cada uno y dejarlo escrito. Desde la próxima misión, este código de limpieza corre automáticamente antes del tuyo.
</Debrief>
```

`content/casos/tienda-online-pewen/misiones/05-agrupar-y-resumir.mdx`:
```mdx
---
titulo: Agrupar y resumir
tiempo: 25
---

<Brief de="Antonia Llancaqueo, cofundadora de Tienda Online Pewen">
Con los datos limpios, quiero conocer a nuestros mejores clientes. Calcula cuánto vale cada pedido, cuánto nos compró cada cliente en pedidos entregados y dame el top 5. Les vamos a enviar un regalo de fin de año.
</Brief>

<Concepto>
Una **columna nueva** se calcula con otras columnas, fila por fila, como una fórmula rellenada hacia abajo:

`pedidos["monto"] = pedidos["cantidad"] * pedidos["precio_unitario"]`

`groupby` agrupa y resume, igual que `GROUP BY` en SQL o una tabla dinámica:

<PythonEjemplo codigo={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")\nprint(pedidos.groupby(\"estado\")[\"cantidad\"].sum())"} />

Se lee así: agrupa por `estado`, toma la columna `cantidad` y súmala. En vez de `sum()` puedes usar `mean()`, `count()`, `max()` o `min()`.

Para un top: `sort_values(ascending=False)` ordena de mayor a menor y `head(5)` deja los primeros cinco.

En esta misión, `pedidos` ya viene limpio: el código de la misión anterior corre antes del tuyo.
</Concepto>

<PythonTask
  id="mejores-clientes"
  enunciado="Agrega a pedidos la columna monto (cantidad por precio unitario). Guarda en entregados los pedidos entregados, en ventas_por_cliente la suma del monto de cada cliente en esos pedidos, y en top_5 los cinco clientes que más compraron, de mayor a menor."
  preparacion={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")\nclientes = pd.read_csv(\"datos/clientes.csv\")\npedidos = pedidos.drop_duplicates().dropna(subset=[\"cantidad\"])\npedidos[\"cantidad\"] = pedidos[\"cantidad\"].astype(int)\npedidos[\"fecha\"] = pd.to_datetime(pedidos[\"fecha\"])\nclientes[\"region\"] = clientes[\"region\"].fillna(\"Sin región\")"}
  inicial={"entregados = None\nventas_por_cliente = None\ntop_5 = None"}
  solucion={"pedidos[\"monto\"] = pedidos[\"cantidad\"] * pedidos[\"precio_unitario\"]\nentregados = pedidos[pedidos[\"estado\"] == \"entregado\"]\nventas_por_cliente = entregados.groupby(\"cliente_id\")[\"monto\"].sum()\ntop_5 = ventas_por_cliente.sort_values(ascending=False).head(5)"}
  pruebas={"assert \"monto\" in pedidos.columns, \"Falta la columna monto en pedidos.\"\nassert pedidos[\"monto\"].sum() == (pedidos[\"cantidad\"] * pedidos[\"precio_unitario\"]).sum(), \"monto debe ser la cantidad por el precio unitario.\"\nassert len(entregados) == 353, \"entregados debe tener solo los pedidos con estado entregado.\"\nassert ventas_por_cliente[\"C055\"] == 660720, \"ventas_por_cliente debe sumar el monto de los pedidos entregados de cada cliente.\"\nassert list(top_5.index) == [\"C055\", \"C073\", \"C064\", \"C046\", \"C028\"], \"top_5 debe tener los cinco clientes que más compraron, de mayor a menor.\""}
  paquetes={["pandas"]}
  pistas={["La columna nueva se crea asignándola: pedidos[\"monto\"] = ...", "Agrupa entregados por cliente_id y suma la columna monto.", "Ordena con sort_values(ascending=False) y quédate con head(5)."]}
/>

<Decision
  pregunta="El top 5 suma solo pedidos entregados. Un cliente con muchos pedidos devueltos queda fuera. ¿Está bien?"
  opciones={[
    { texto: "Sí, para un regalo por compras conviene contar solo lo que de verdad compraron, y vale la pena decirlo en el informe.", correcta: true, porque: "Qué se cuenta depende de la pregunta. Lo importante es elegirlo a propósito y dejarlo explícito." },
    { texto: "No, hay que sumar todos los pedidos sin importar el estado.", porque: "Un pedido devuelto o cancelado no es una venta: premiarlo distorsiona quiénes son los mejores clientes." },
  ]}
/>

<Debrief entrevista="groupby es la operación más usada de pandas en entrevistas. Si te piden 'el top N de algo', muestra los tres pasos: agrupar, ordenar y cortar, y aclara qué filas incluiste.">
`groupby` resume una tabla por grupos, como `GROUP BY` o una tabla dinámica. Las columnas calculadas, como `monto`, se crean una vez y se usan en todo el análisis.
</Debrief>
```

`content/casos/tienda-online-pewen/misiones/06-cruzar-tablas.mdx`:
```mdx
---
titulo: Cruzar tablas
tiempo: 30
---

<Brief de="Antonia Llancaqueo, cofundadora de Tienda Online Pewen">
Para planificar el próximo año necesito dos cosas: cuánto vendimos por categoría de producto y cuánto por región de nuestros clientes, siempre en pedidos entregados. La categoría está en productos y la región en clientes: vas a tener que juntar las tablas.
</Brief>

<Concepto>
`merge` une dos tablas por una columna en común, como `JOIN` en SQL o `BUSCARV` en una planilla:

<PythonEjemplo codigo={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")\nproductos = pd.read_csv(\"datos/productos.csv\")\ncon_producto = pedidos.merge(productos, on=\"producto_id\")\nprint(con_producto[[\"pedido_id\", \"nombre\", \"categoria\"]].head())"} />

- `on="producto_id"` dice qué columna tienen que compartir las dos tablas.
- El resultado tiene las columnas de ambas tablas, y luego se filtra y agrupa como siempre.
- Revisa que la cantidad de filas no cambie: si sube, la columna de unión tenía valores repetidos en la otra tabla.

En esta misión, `pedidos` ya viene limpio y con la columna `monto`.
</Concepto>

<PythonTask
  id="ventas-por-categoria-y-region"
  enunciado="Une pedidos con productos en con_producto y guarda en ventas_por_categoria el monto de los pedidos entregados de cada categoría. Luego une pedidos con clientes en con_cliente y guarda en ventas_por_region el monto entregado de cada región."
  preparacion={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")\nclientes = pd.read_csv(\"datos/clientes.csv\")\nproductos = pd.read_csv(\"datos/productos.csv\")\npedidos = pedidos.drop_duplicates().dropna(subset=[\"cantidad\"])\npedidos[\"cantidad\"] = pedidos[\"cantidad\"].astype(int)\npedidos[\"fecha\"] = pd.to_datetime(pedidos[\"fecha\"])\nclientes[\"region\"] = clientes[\"region\"].fillna(\"Sin región\")\npedidos[\"monto\"] = pedidos[\"cantidad\"] * pedidos[\"precio_unitario\"]"}
  inicial={"con_producto = None\nventas_por_categoria = None\ncon_cliente = None\nventas_por_region = None"}
  solucion={"con_producto = pedidos.merge(productos, on=\"producto_id\")\nventas_por_categoria = con_producto[con_producto[\"estado\"] == \"entregado\"].groupby(\"categoria\")[\"monto\"].sum()\ncon_cliente = pedidos.merge(clientes, on=\"cliente_id\")\nventas_por_region = con_cliente[con_cliente[\"estado\"] == \"entregado\"].groupby(\"region\")[\"monto\"].sum()"}
  pruebas={"assert len(con_producto) == 415, \"con_producto debe tener una fila por pedido.\"\nassert \"categoria\" in con_producto.columns, \"con_producto debe traer la categoría desde productos.\"\nassert ventas_por_categoria[\"Hogar\"] == 3300350, \"ventas_por_categoria debe sumar el monto de los pedidos entregados de cada categoría.\"\nassert len(con_cliente) == 415, \"con_cliente debe tener una fila por pedido.\"\nassert ventas_por_region[\"Metropolitana\"] == 6466700, \"ventas_por_region debe sumar el monto entregado de cada región.\"\nassert ventas_por_region[\"Sin región\"] == 341800, \"ventas_por_region debe incluir a los clientes Sin región.\""}
  paquetes={["pandas"]}
  pistas={["pedidos.merge(productos, on=\"producto_id\") trae la categoría a cada pedido.", "Filtra los entregados y agrupa por categoria, sumando monto.", "Para la región es lo mismo con clientes y la columna cliente_id."]}
/>

<Decision
  pregunta="Después de un merge, la tabla tiene más filas que pedidos. ¿Qué significa?"
  opciones={[
    { texto: "Que en la otra tabla hay valores repetidos en la columna de unión, y cada pedido se cruzó con más de una fila. Hay que revisarlo antes de sumar.", correcta: true, porque: "Un merge que multiplica filas infla los totales sin dar error. Comparar la cantidad de filas antes y después es el control más simple." },
    { texto: "Que el merge agregó información nueva, así que está bien.", porque: "Un merge de búsqueda (traer la categoría) no debería cambiar cuántos pedidos hay." },
  ]}
/>

<Debrief entrevista="Si te preguntan por merge o JOIN, menciona el control de filas: 'antes y después del cruce reviso que la cantidad de filas tenga sentido'. Es una señal clara de experiencia.">
`merge` cruza tablas por una columna en común. Con él puedes llevar a cada pedido los datos de su producto o de su cliente, y después resumir por cualquiera de ellos.
</Debrief>
```

`content/casos/tienda-online-pewen/misiones/07-detectar-patrones.mdx`:
```mdx
---
titulo: Detectar patrones
tiempo: 30
---

<Brief de="Antonia Llancaqueo, cofundadora de Tienda Online Pewen">
Tengo dos sospechas y quiero datos. Primero, que la ropa se nos devuelve mucho más que lo demás. Segundo, que nos jugamos el año en noviembre, con el Black Friday. Calcula la tasa de devolución de cada categoría y las ventas de cada mes, y dime cuál fue el mes más fuerte.
</Brief>

<Concepto>
Una **tasa** es una proporción: de cada 100 pedidos, cuántos se devolvieron. En pandas hay un truco útil: el promedio de una columna de `True`/`False` es la proporción de `True`.

`con_producto["devuelto"] = con_producto["estado"] == "devuelto"` crea una columna con `True` o `False`, y `groupby("categoria")["devuelto"].mean()` da la tasa de cada categoría.

Con fechas de verdad (las convertiste en la misión de limpieza), `.dt` da acceso a sus partes: `.dt.month` es el mes, `.dt.year` el año y `.dt.dayofweek` el día de la semana:

<PythonEjemplo codigo={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")\npedidos[\"fecha\"] = pd.to_datetime(pedidos[\"fecha\"])\nprint(pedidos.groupby(pedidos[\"fecha\"].dt.month)[\"pedido_id\"].count())"} />

`idxmax()` devuelve la etiqueta del valor más alto, por ejemplo el mes con más ventas.

En esta misión ya tienes `pedidos` limpio con `monto`, `entregados` y `con_producto`.
</Concepto>

<PythonTask
  id="devoluciones-y-meses"
  enunciado="Guarda en tasa_devolucion la proporción de pedidos devueltos de cada categoría, redondeada a 2 decimales. Guarda en ventas_por_mes el monto de los pedidos entregados de cada mes (el número del mes) y en mes_top el mes con más ventas."
  preparacion={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")\nproductos = pd.read_csv(\"datos/productos.csv\")\npedidos = pedidos.drop_duplicates().dropna(subset=[\"cantidad\"])\npedidos[\"cantidad\"] = pedidos[\"cantidad\"].astype(int)\npedidos[\"fecha\"] = pd.to_datetime(pedidos[\"fecha\"])\npedidos[\"monto\"] = pedidos[\"cantidad\"] * pedidos[\"precio_unitario\"]\nentregados = pedidos[pedidos[\"estado\"] == \"entregado\"]\ncon_producto = pedidos.merge(productos, on=\"producto_id\")"}
  inicial={"tasa_devolucion = None\nventas_por_mes = None\nmes_top = None"}
  solucion={"con_producto[\"devuelto\"] = con_producto[\"estado\"] == \"devuelto\"\ntasa_devolucion = con_producto.groupby(\"categoria\")[\"devuelto\"].mean().round(2)\nventas_por_mes = entregados.groupby(entregados[\"fecha\"].dt.month)[\"monto\"].sum()\nmes_top = ventas_por_mes.idxmax()"}
  pruebas={"assert round(float(tasa_devolucion[\"Vestuario\"]), 2) == 0.23, \"tasa_devolucion debe ser la proporción de pedidos devueltos de cada categoría.\"\nassert round(float(tasa_devolucion[\"Cocina\"]), 2) == 0.05, \"tasa_devolucion no coincide en Cocina: revisa que cuentes todos los pedidos de la categoría.\"\nassert ventas_por_mes[11] == 3585120, \"ventas_por_mes debe sumar el monto de los pedidos entregados de cada mes, con el mes como número.\"\nassert mes_top == 11, \"mes_top debe ser el mes con más ventas.\""}
  paquetes={["pandas"]}
  pistas={["Crea en con_producto una columna con estado == \"devuelto\" y promedia esa columna por categoría.", "El mes de una fecha es entregados[\"fecha\"].dt.month; úsalo dentro del groupby.", "idxmax() da el mes del valor más alto."]}
/>

<Decision
  pregunta="Vestuario se devuelve 23 % de las veces y lo demás entre 5 % y 7 %. ¿Qué le recomiendas a Antonia?"
  opciones={[
    { texto: "Investigar por qué: si es por tallas, mejorar la guía de tallas puede bajar las devoluciones. Y medir de nuevo en unos meses.", correcta: true, porque: "Un patrón en los datos es el punto de partida, no la respuesta. La recomendación propone una causa a verificar y cómo medir si funcionó." },
    { texto: "Dejar de vender ropa.", porque: "Vestuario igual vende mucho. Cortar una categoría por un problema que tal vez tiene arreglo es una decisión apurada." },
  ]}
/>

<Debrief entrevista="Un clásico de entrevistas: 'encontraste que X sube en noviembre, ¿qué haces?'. Distingue entre describir (subió) y explicar (por qué), y propone cómo verificar la explicación.">
Las tasas comparan grupos de distinto tamaño de forma justa, y las fechas permiten ver estacionalidad. Juntas convierten sospechas en datos: Vestuario se devuelve casi cuatro veces más que el resto y noviembre vende más del doble que un mes normal.
</Debrief>
```

`content/casos/tienda-online-pewen/misiones/08-revisar-el-codigo-de-la-ia.mdx`:
```mdx
---
titulo: Revisar el código de la IA
tiempo: 20
---

<Brief de="Antonia Llancaqueo, cofundadora de Tienda Online Pewen">
Le pedí a un asistente de IA el código para dos números del directorio: el ticket promedio de los pedidos entregados y cuántos clientes compraron algo. Lo pegué en el editor tal cual. No da error, pero el ticket sale «nan» y los clientes salen 0. Cuando lo arregles, revisa también que la cantidad de clientes tenga sentido: somos una tienda chica.
</Brief>

<Concepto>
Igual que con la fórmula del Caso 1, el código de un asistente de IA se revisa antes de usarlo:

1. **Ejecútalo y mira las tablas y valores intermedios.** Si `entregados` queda vacía, todo lo que se calcula después está mal.
2. **Compara con lo que ya sabes.** Ya contaste los pedidos por estado en la misión de explorar: ¿calza?
3. **Lee cada línea preguntando qué cuenta.** ¿Cuenta pedidos o clientes? ¿Filas o valores distintos?

`nan` significa «no es un número»: aparece, por ejemplo, al promediar una tabla vacía. En pandas, `nunique()` cuenta cuántos valores **distintos** tiene una columna.
</Concepto>

<PythonTask
  id="corregir-codigo-ia"
  enunciado="Revisa y corrige el código del asistente para que ticket_promedio sea el monto promedio de los pedidos entregados y clientes_activos la cantidad de clientes que tuvieron al menos un pedido entregado."
  preparacion={"import pandas as pd\npedidos = pd.read_csv(\"datos/pedidos.csv\")\npedidos = pedidos.drop_duplicates().dropna(subset=[\"cantidad\"])\npedidos[\"cantidad\"] = pedidos[\"cantidad\"].astype(int)\npedidos[\"monto\"] = pedidos[\"cantidad\"] * pedidos[\"precio_unitario\"]"}
  inicial={"# Código sugerido por un asistente de IA\nentregados = pedidos[pedidos[\"estado\"] == \"Entregado\"]\nticket_promedio = entregados[\"monto\"].mean()\nclientes_activos = len(entregados[\"cliente_id\"])"}
  solucion={"entregados = pedidos[pedidos[\"estado\"] == \"entregado\"]\nticket_promedio = entregados[\"monto\"].mean()\nclientes_activos = entregados[\"cliente_id\"].nunique()"}
  pruebas={"assert len(entregados) == 353, \"entregados no tiene los pedidos entregados: revisa la condición del filtro.\"\nassert abs(ticket_promedio - 32286.01) < 0.01, \"ticket_promedio no es el monto promedio de los pedidos entregados.\"\nassert clientes_activos == 85, \"clientes_activos no coincide con la cantidad de clientes que tuvieron al menos un pedido entregado.\""}
  paquetes={["pandas"]}
  pistas={["Ejecuta el código y mira la tabla entregados: ¿tiene filas?", "Compara el texto del filtro con los valores de la columna estado: ¿se escriben igual?", "len() cuenta filas, no clientes distintos."]}
/>

<Decision
  pregunta="El código del asistente no daba ningún error. ¿Qué te dice eso?"
  opciones={[
    { texto: "Nada sobre si el resultado es correcto: los errores más peligrosos son los que no avisan. Por eso se verifica contra los datos.", correcta: true, porque: "Un filtro con mayúsculas distintas o un conteo de filas en vez de clientes producen números creíbles y equivocados." },
    { texto: "Que el código está bien: si hubiera un problema, Python lo diría.", porque: "Python solo avisa cuando no puede ejecutar algo; no sabe qué querías calcular." },
  ]}
/>

<Debrief entrevista="Al hablar de IA en entrevistas, un ejemplo concreto vale más que una opinión: 'un asistente me dio un filtro con «Entregado» en mayúscula; no fallaba, pero dejaba la tabla vacía. Desde entonces reviso los resultados intermedios'.">
El asistente escribió un filtro que no calzaba con los datos (mayúscula) y contó filas en vez de clientes distintos. Ninguno de los dos errores avisa: aparecen solo al mirar los resultados intermedios y compararlos con lo que ya sabes de los datos.
</Debrief>
```

`content/casos/tienda-online-pewen/misiones/09-recomendaciones-para-el-negocio.mdx`:
```mdx
---
titulo: Recomendaciones para el negocio
tiempo: 45
sinGuia: true
---

<Brief de="Antonia Llancaqueo, cofundadora de Tienda Online Pewen">
Mañana es la planificación del próximo año con mi socio y necesito cinco respuestas, solo con pedidos entregados salvo que diga lo contrario. Qué categoría vendió más en pesos. Qué tasa de devolución tuvo Vestuario, sobre todos sus pedidos, con dos decimales. Qué mes vendió más. Cuántos clientes compraron dos veces o más. Y qué canal de captación de clientes nos trajo más ventas. Los datos vienen tal como están en los archivos.
</Brief>

<PythonTask
  id="cinco-respuestas"
  enunciado="Guarda las respuestas en categoria_mas_vendida, tasa_devolucion_vestuario, mes_mas_vendido (el número del mes), clientes_recurrentes y canal_que_mas_vende."
  preparacion={"import pandas as pd"}
  inicial={"categoria_mas_vendida = None\ntasa_devolucion_vestuario = None\nmes_mas_vendido = None\nclientes_recurrentes = None\ncanal_que_mas_vende = None"}
  solucion={"pedidos = pd.read_csv(\"datos/pedidos.csv\")\nclientes = pd.read_csv(\"datos/clientes.csv\")\nproductos = pd.read_csv(\"datos/productos.csv\")\npedidos = pedidos.drop_duplicates().dropna(subset=[\"cantidad\"])\npedidos[\"cantidad\"] = pedidos[\"cantidad\"].astype(int)\npedidos[\"fecha\"] = pd.to_datetime(pedidos[\"fecha\"])\npedidos[\"monto\"] = pedidos[\"cantidad\"] * pedidos[\"precio_unitario\"]\ncompleto = pedidos.merge(productos, on=\"producto_id\").merge(clientes, on=\"cliente_id\")\nentregados = completo[completo[\"estado\"] == \"entregado\"]\ncategoria_mas_vendida = entregados.groupby(\"categoria\")[\"monto\"].sum().idxmax()\nvestuario = completo[completo[\"categoria\"] == \"Vestuario\"]\ntasa_devolucion_vestuario = round((vestuario[\"estado\"] == \"devuelto\").mean(), 2)\nmes_mas_vendido = entregados.groupby(entregados[\"fecha\"].dt.month)[\"monto\"].sum().idxmax()\nclientes_recurrentes = (entregados.groupby(\"cliente_id\").size() >= 2).sum()\ncanal_que_mas_vende = entregados.groupby(\"canal\")[\"monto\"].sum().idxmax()"}
  pruebas={"assert categoria_mas_vendida == \"Hogar\", \"categoria_mas_vendida no coincide.\"\nassert round(float(tasa_devolucion_vestuario), 2) == 0.23, \"tasa_devolucion_vestuario no coincide.\"\nassert mes_mas_vendido == 11, \"mes_mas_vendido no coincide.\"\nassert clientes_recurrentes == 67, \"clientes_recurrentes no coincide.\"\nassert canal_que_mas_vende == \"google\", \"canal_que_mas_vende no coincide.\""}
  paquetes={["pandas"]}
/>

<Decision
  pregunta="Vestuario no es la categoría que más vende, aunque tiene más pedidos que las demás. ¿Cómo lo explicas en tu informe?"
  opciones={[
    { texto: "Por las devoluciones: casi uno de cada cuatro pedidos de ropa vuelve. Si se reducen, Vestuario podría pasar a ser la primera.", correcta: true, porque: "Conectar dos resultados (ventas y devoluciones) en una sola historia es lo que convierte números en una recomendación." },
    { texto: "Porque la ropa es más barata.", porque: "Es una hipótesis que los datos no muestran: las devoluciones sí están medidas y explican la diferencia." },
  ]}
/>

<Debrief entrevista="Un caso final como este es típico de las pruebas técnicas para analista. Lo que más se valora es la última parte: dos o tres recomendaciones concretas, cada una con el dato que la respalda.">
Este es tu entregable: arma un notebook (por ejemplo en Google Colab) que cargue, limpie y analice los datos, responda estas cinco preguntas y termine con tus recomendaciones. Súbelo a un repositorio con un README y envíalo desde la página del caso.
</Debrief>
```

- [ ] **Step 3: Validar**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content validate`
Expected: `[content] ok: 2 rutas, 5 casos, 36 misiones`. Tarda un poco más que antes, porque ejecuta las 10 soluciones de Python con pandas.

Antes de seguir, compara cada archivo `.mdx` con el de este plan (por ejemplo con `diff`). Deben ser idénticos.

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && cd apps/web && pnpm exec tsc --noEmit -p . && pnpm build"`
Expected: PASS en todos los paquetes, incluido `contenido-real.test.ts`, y el build con las páginas de misión estáticas.

- [ ] **Step 4: Commit**

```bash
git add content
git commit -m "feat(contenido): caso 3 tienda online pewen, nueve misiones de python con pandas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: e2e y README

**Files:**
- Create: `e2e/tests/pewen.spec.ts`
- Modify: `e2e/tests/progreso.ts`, `e2e/calentar.ts`, `README.md`

**Interfaces:**
- Consumes: `registrarse`, `aprobar`, `completarCaso` y `entrarComoAdmin` (`./progreso`, Fase 4c), y los ids de las Tasks 3 y de los casos 0, 1 y 2.
- Produces:
  - `MISIONES["minimarkets-del-sur"]` en `progreso.ts`, para que las pruebas de los casos siguientes puedan completarlo;
  - `e2e/tests/pewen.spec.ts`, con 1 prueba.

- [ ] **Step 1: El helper y la prueba**

`e2e/tests/progreso.ts` completo:
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

`e2e/tests/pewen.spec.ts`:
```ts
import { expect, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, registrarse } from "./progreso";

const CASO = "tienda-online-pewen";

test("con los casos 0, 1 y 2 completos: filtra con pandas, entiende el error de paréntesis y ve las tablas", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(300_000);
  const email = await registrarse(page, "Florencia Huenchumilla");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "despachos-rapidos", "minimarkets-del-sur"]) await completarCaso(page, admin, ip, email, caso);

  await aprobar(page, ip, CASO, [
    ["01-de-la-planilla-a-python", "totales-del-carrito"],
    ["01-de-la-planilla-a-python", "primera-tabla"],
    ["02-cargar-y-explorar", "explorar-pedidos"],
  ]);

  await page.goto(`/casos/${CASO}/03-filtrar-y-seleccionar`);
  await expect(page.getByText("Python listo").first()).toBeVisible({ timeout: 150_000 });
  const codigo = page.getByLabel("Código Python");
  const ejecutar = page.getByRole("button", { name: "Ejecutar" });

  await codigo.nth(1).fill('grandes = pedidos[pedidos["cantidad"] >= 3 & pedidos["estado"] == "entregado"]');
  await ejecutar.nth(1).click();
  await expect(page.getByText("Combinaste condiciones con & o | sin paréntesis.", { exact: false })).toBeVisible();

  await codigo.nth(1).fill('grandes = pedidos.loc[(pedidos["cantidad"] >= 3) & (pedidos["estado"] == "entregado"), ["pedido_id", "cantidad"]]');
  await ejecutar.nth(1).click();
  await expect(page.locator("caption", { hasText: "grandes" })).toContainText("71 filas");

  await codigo.first().fill('devueltos = pedidos[pedidos["estado"] == "devuelto"]');
  const primera = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).first().click();
  await primera;
  await page.getByRole("button", { name: "Validar" }).nth(1).click();
  await expect(page.getByRole("heading", { name: "Misión aprobada" })).toBeVisible();
});
```

En `e2e/calentar.ts`, agrega a `RUTAS`, antes de `"/casos/demo-motor"`:
```ts
  "/casos/tienda-online-pewen",
  "/casos/tienda-online-pewen/03-filtrar-y-seleccionar",
```

Run: `npm run test:e2e -- tests/pewen.spec.ts`
Expected: `1 passed`. La prueba completa los casos 0, 1 y 2, carga Python desde el CDN y aprueba la misión 3.

- [ ] **Step 2: README**

Agrega al final de `README.md`:
```markdown
## Caso 3: Tienda Online Pewen

- **Datos generados:** `packages/content/src/generadores/tienda-online-pewen.ts`, con semilla fija.
  - 90 clientes, 24 productos y 424 pedidos de julio a diciembre de 2025.
  - Defectos para limpiar con pandas: 4 pedidos duplicados, 5 sin cantidad y 6 clientes sin región.
  - Patrones para descubrir: Vestuario se devuelve en un 23 % de sus pedidos y noviembre (Black Friday) vende más del doble que un mes normal.
- **Tareas de Python:** sus `pruebas` comparan valores calculados con los datos generados, con mensajes que orientan sin dar la solución. El validador ejecuta cada solución con pandas en Pyodide.
  - Desde la misión 5, la `preparacion` incluye la limpieza de la misión 4.
  - La misión 9, sin guía, parte de los archivos sin limpiar.
- **Entregable:** un notebook (`.ipynb`, por ejemplo hecho en Google Colab) con el análisis y las recomendaciones.
```

- [ ] **Step 3: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes.

Run: `npm run test:e2e`
Expected: `35 passed`. Dos corridas seguidas deben dar lo mismo.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml up -d --force-recreate --wait web && for p in /casos/tienda-online-pewen /casos/tienda-online-pewen/04-limpiar; do curl -s -o /dev/null localhost:3000$p; curl -s -D - -o /dev/null localhost:3000$p | grep -i x-nextjs-cache; done; docker compose up -d --force-recreate web`
Expected: `x-nextjs-cache: HIT` dos veces. Al final, `web` vuelve a modo desarrollo.

- [ ] **Step 4: Recorrerlo como estudiante**

Con una cuenta que tenga los casos 0, 1 y 2 completos, resuelve a mano las misiones 4, 8 y 9. Revisa tres cosas:
- que los mensajes de las pruebas orienten sin dar la respuesta;
- que las tablas de pandas ayuden a ver qué pasó, por ejemplo `entregados` con 0 filas en la misión 8;
- que la misión 9 se pueda resolver sin pistas, solo con lo visto en el caso.

- [ ] **Step 5: Commit**

```bash
git add e2e README.md
git commit -m "test(e2e): caso 3 con filtro de pandas, error de parentesis explicado y tablas visibles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Fase 4e: el Caso 4, Visualización.**
- Preparar datos con SQL y planilla en la plataforma, y construir el dashboard fuera de ella:
  - Power BI Desktop, con Windows;
  - o Looker Studio, en la web.
- Cada herramienta lleva una guía paso a paso.
- **Antes de planificarlo, el equipo tiene que elegir el nombre de la clínica.** La recomendación es "Clínica Cordillera Central".
