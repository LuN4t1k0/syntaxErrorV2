# Fase 8a: Mejoras del recorrido. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir los tres detalles que dejó el recorrido de la ruta completa del 2026-10-02:
- Python se volvía a cargar en cada lección;
- el panel llamaba "casos" y "misiones" a las clases;
- quedaban dos detalles de contenido en Excel.

**Architecture:**
- **Python entre lecciones.**
  - **Antes:** cada lección creaba su worker y cargaba Pyodide desde cero (unos 2,4 s), y al salir lo destruía.
  - **Ahora:** hay un solo cliente por pestaña (`python-contexto.tsx`). Al cambiar de lección sin recargar la página, el cliente se `reconfigura` con los paquetes y archivos de la nueva lección, y el worker reutiliza el Pyodide que ya tiene: solo carga los paquetes que falten (por ejemplo pandas) y cambia los archivos.
  - **Lo que no pasa de una lección a otra:**
    - las variables, porque cada ejecución ya empieza con `LIMPIAR_VARIABLES`;
    - los archivos de otro caso, que el worker borra con `quitarArchivos`.
  - **El worker atiende los mensajes de a uno,** para que dos `iniciar` seguidos no terminen en desorden.
  - **Si una ejecución se corta** (ciclo infinito), el cliente crea un worker nuevo, como antes.
- **El panel.** "Tus casos" pasa a "Tus casos y clases". Las clases se cuentan en lecciones ("1/18 lecciones") y se continúan como lecciones ("Sigue con …, de Clases de SQL" y "Continuar lección"). El tipo sale del contenido, porque el progreso guardado no lo tiene.
- **Excel:**
  - **"cafes" pasa a "cafés".**
  - **Las fórmulas pasan a punto y coma:** los bloques de sintaxis y una fórmula del texto del proyecto final usaban comas (venían así de la v1), mientras el texto de las lecciones, las soluciones y la ayuda de funciones de la planilla usan punto y coma, que es lo de Excel en español. La planilla del curso acepta los dos (`normalizarFormula`), así que nada deja de funcionar.
  - **`=SUM(1,2)` de "Errores comunes" no cambia:** es el ejemplo a propósito de una función escrita en inglés.

**Tech Stack:** Pyodide 0.28, Web Workers, Next 15, Vitest 4 y Playwright 1.55.

**Spec:** recorrido de la ruta completa del 2026-10-02 ("detalles que vi de paso").

## Global Constraints

- **Contenido:** no se reescribe el texto de la v1; solo tildes y separadores.
- **Entorno:** todo se ejecuta con `docker compose run --rm tools ...`. Los paquetes son `@syntaxerror/engines` y `web`.
- **Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Que algo de una lección quede en la siguiente** (una variable o un archivo de otro caso). Probado en `python-entre-lecciones.spec.ts` (`huella`) y en `python.test.ts` (`quitarArchivos`).
2. **Que Python se vuelva a cargar:** la e2e cuenta las descargas de `pyodide.asm.wasm` al pasar de la lección 12 a la 13 y espera 1.
3. **Una lección que necesita un paquete que la anterior no tenía** (la 13 usa pandas; la 12 no). Probado en la misma e2e.
4. **Un caso normal en el panel** sigue diciendo "misiones" y "Continuar misión". Lo prueba `plataforma.spec.ts`.

---

### Task 1: Un solo Python por pestaña

**Files:**
- Modify: `packages/engines/src/python.ts`, `packages/engines/src/python-cliente.ts`, `apps/web/src/engines/python.worker.ts`, `apps/web/src/components/mision/python-contexto.tsx`, `README.md`
- Test: `packages/engines/src/python-cliente.test.ts`, `packages/engines/src/python.test.ts`, `e2e/tests/python-entre-lecciones.spec.ts`

**Interfaces:**
- Produces:
  - `ClientePython.reconfigurar(opciones): Promise<void>`;
  - `quitarArchivos(py, rutas)`;
  - `PyodideLike.FS.unlink?(ruta)`.

- [ ] **Step 1: Escribir las pruebas**

En `packages/engines/src/python-cliente.test.ts`, antes de `it("corta un ciclo infinito, ...")`, agrega:
```ts
  it("reconfigurar con otras opciones reusa el mismo worker: le manda las nuevas sin volver a cargar Python", async () => {
    const creados: TrabajadorFalso[] = [];
    const cliente = crearClientePython(opciones, {
      crearTrabajador: () => {
        const trabajador = new TrabajadorFalso(responde({ iniciar: null, revisar: aprobada }));
        creados.push(trabajador);
        return trabajador;
      },
    });
    await cliente.iniciar();
    const otras = { paquetes: [], archivos: [{ ruta: "datos/ventas.csv", contenido: "id\n1\n" }] };
    await cliente.reconfigurar(otras);
    await cliente.revisar(tarea, "x = 1");
    // Las mismas opciones no vuelven a configurar nada.
    await cliente.reconfigurar({ ...otras });

    expect(creados).toHaveLength(1);
    expect(creados[0].mensajes.map((mensaje) => mensaje.tipo)).toEqual(["iniciar", "iniciar", "revisar"]);
    expect(creados[0].mensajes[1]).toMatchObject({ tipo: "iniciar", opciones: otras });
  });

  it("reconfigurar antes de iniciar solo cambia las opciones con las que va a partir", async () => {
    const creados: TrabajadorFalso[] = [];
    const cliente = crearClientePython(opciones, {
      crearTrabajador: () => {
        const trabajador = new TrabajadorFalso(responde({ iniciar: null }));
        creados.push(trabajador);
        return trabajador;
      },
    });
    const otras = { paquetes: [], archivos: [] };
    await cliente.reconfigurar(otras);
    expect(creados).toHaveLength(1);
    expect(creados[0].mensajes).toEqual([expect.objectContaining({ tipo: "iniciar", opciones: otras })]);
  });
```

En `packages/engines/src/python.test.ts`:
1. El import de `./python` queda:
```ts
import { columnasDeArchivos, crearSesionPython, PYODIDE_VERSION, quitarArchivos, type PyodideLike, type SesionPython, type TareaPython } from "./python";
```
2. El comienzo queda:
```ts
let sesion: SesionPython;
let py: PyodideLike;

beforeAll(async () => {
  py = (await loadPyodide()) as unknown as PyodideLike;
```
3. Al final, agrega:
```ts
describe("quitarArchivos", () => {
  it("borra los archivos de otro caso, para que no queden al cambiar de lección", async () => {
    const otra = await crearSesionPython(py, { paquetes: [], archivos: [{ ruta: "datos/clientes.csv", contenido: "id\n7\n" }] });
    expect(await otra.ejecutar("", 'print(open("datos/clientes.csv").read().strip())')).toMatchObject({ ok: true, salida: "id\n7" });
    quitarArchivos(py, ["datos/clientes.csv", "datos/no-existe.csv"]);
    const resultado = await otra.ejecutar("", 'open("datos/clientes.csv")');
    expect(resultado.ok).toBe(false);
  });
});
```

`e2e/tests/python-entre-lecciones.spec.ts`:
```ts
import { expect, reporteDeTarea, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, MISIONES, registrarse } from "./progreso";

const CLASES = "clases-de-python";

test("al pasar a la lección siguiente, Python no se vuelve a cargar y no queda nada de la anterior", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(240_000);
  const email = await registrarse(page, "Florencia Ríos");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur"]) {
    await completarCaso(page, admin, ip, email, caso);
  }
  await aprobar(page, ip, CLASES, MISIONES[CLASES].slice(0, 11));

  // El wasm de Pyodide pesa varios MB: se cuenta cuántas veces se pide.
  let cargas = 0;
  page.context().on("request", (pedido) => {
    if (pedido.url().endsWith("pyodide.asm.wasm")) cargas += 1;
  });

  await page.goto(`/casos/${CLASES}/12-funciones`);
  await expect(page.getByText("Python listo")).toBeVisible({ timeout: 150_000 });
  const codigo = page.getByLabel("Código Python");
  await codigo.fill("def calcular_total(precio, cantidad):\n    return precio * cantidad\n\nresultado = calcular_total(precio, cantidad)\nhuella = 1");
  const aprobada = reporteDeTarea(page, true);
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;

  // Navegación sin recargar, con el enlace a la lección siguiente.
  await page.getByRole("navigation", { name: "Misiones cercanas" }).getByRole("link", { name: "Series →" }).click();
  await expect(page).toHaveURL(new RegExp(`/casos/${CLASES}/13-series$`));
  await expect(page.getByText("Python listo")).toBeVisible({ timeout: 30_000 });
  await codigo.fill("print(huella)");
  await page.getByRole("button", { name: "Ejecutar" }).click();
  await expect(page.getByText("No existe nada llamado «huella»", { exact: false })).toBeVisible();

  // La 13 usa pandas, que la 12 no cargaba.
  await codigo.fill("resultado = int(calificaciones.sum())");
  const conPandas = reporteDeTarea(page, true);
  await page.getByRole("button", { name: "Validar" }).click();
  await conPandas;
  await expect(page.getByText("¡Lección aprobada!").or(page.getByRole("heading", { name: "Lección aprobada" })).first()).toBeVisible();
  expect(cargas).toBe(1);
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools sh -c "cd packages/engines && npx vitest run src/python-cliente.test.ts src/python.test.ts"`
Expected: FAIL (3 pruebas). No existen `reconfigurar` ni `quitarArchivos`.

- [ ] **Step 3: El motor**

En `packages/engines/src/python.ts`:
1. En `PyodideLike`, `FS` queda:
```ts
  // unlink existe en Pyodide, pero sus tipos no lo declaran.
  FS: { mkdirTree(ruta: string): void; writeFile(ruta: string, datos: string): void; unlink?(ruta: string): void };
```
2. Antes de `export async function crearSesionPython(`, agrega:
```ts
// Borra archivos de una sesión anterior (de otro caso), cuando el mismo Python se reutiliza al cambiar de lección.
export function quitarArchivos(py: PyodideLike, rutas: string[]): void {
  for (const ruta of rutas) {
    try {
      py.FS.unlink?.(`${DIRECTORIO_TRABAJO}/${ruta}`);
    } catch {
      // Ya no estaba.
    }
  }
}
```

`packages/engines/src/python-cliente.ts` completo:
```ts
import { errorSimple } from "./consola";
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
  // Cambia los paquetes y archivos sin volver a cargar Python: el worker reutiliza el Pyodide que ya tiene.
  reconfigurar(opciones: OpcionesPython): Promise<void>;
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
  let actuales = opciones;
  let trabajador: TrabajadorLike | null = null;
  let listo: Promise<void> | null = null;
  let siguienteId = 1;
  const pendientes = new Map<number, { resolver: (valor: unknown) => void; rechazar: (error: Error) => void }>();

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
      configurar(actuales);
    }
    return listo!;
  }

  function configurar(nuevas: OpcionesPython) {
    const carga = enviar({ tipo: "iniciar", opciones: nuevas }, limiteCargaMs).then(() => undefined);
    carga.catch(() => reiniciar());
    listo = carga;
  }

  function reconfigurar(nuevas: OpcionesPython): Promise<void> {
    if (JSON.stringify(nuevas) === JSON.stringify(actuales)) return iniciar();
    actuales = nuevas;
    if (!trabajador) return iniciar();
    configurar(nuevas);
    return listo!;
  }

  return {
    iniciar,
    reconfigurar,
    async ejecutar(preparacion, codigo) {
      await iniciar();
      try {
        return (await enviar({ tipo: "ejecutar", preparacion, codigo }, limiteMs)) as ResultadoEjecucion;
      } catch (error) {
        if (error instanceof ErrorDeTiempo) return { ok: false, error: errorSimple(mensajeDeTiempo(limiteMs)), salida: "" };
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

- [ ] **Step 4: El worker y el proveedor**

`apps/web/src/engines/python.worker.ts` completo:
```ts
import { crearSesionPython, PYODIDE_CDN, quitarArchivos, type PyodideLike, type SesionPython } from "@syntaxerror/engines/python";
import type { MensajeWorker, RespuestaWorker } from "@syntaxerror/engines/python-cliente";

type AmbitoWorker = { onmessage: ((evento: MessageEvent<MensajeWorker>) => void) | null; postMessage(respuesta: RespuestaWorker): void };

const ambito = self as unknown as AmbitoWorker;
let sesion: SesionPython | null = null;
// Pyodide se carga una vez por worker: al cambiar de lección, "iniciar" llega de nuevo con otras opciones y solo se
// cargan los paquetes que falten y se cambian los archivos.
let pyodide: Promise<PyodideLike> | null = null;
let archivosAnteriores: string[] = [];
// Los mensajes se atienden de a uno, para que dos "iniciar" seguidos no terminen en desorden.
let cola: Promise<unknown> = Promise.resolve();

async function cargarPyodide(): Promise<PyodideLike> {
  const modulo = (await import(/* webpackIgnore: true */ `${PYODIDE_CDN}pyodide.mjs`)) as { loadPyodide: (opciones: { indexURL: string }) => Promise<PyodideLike> };
  return modulo.loadPyodide({ indexURL: PYODIDE_CDN });
}

async function atender(mensaje: MensajeWorker): Promise<unknown> {
  if (mensaje.tipo === "iniciar") {
    pyodide ??= cargarPyodide();
    const py = await pyodide.catch((error: unknown) => {
      pyodide = null;
      throw error;
    });
    const rutas = mensaje.opciones.archivos.map((archivo) => archivo.ruta);
    quitarArchivos(py, archivosAnteriores.filter((ruta) => !rutas.includes(ruta)));
    sesion = await crearSesionPython(py, mensaje.opciones);
    archivosAnteriores = rutas;
    return null;
  }
  if (!sesion) throw new Error("Python no está iniciado.");
  if (mensaje.tipo === "ejecutar") return sesion.ejecutar(mensaje.preparacion, mensaje.codigo);
  return sesion.revisar({ preparacion: mensaje.preparacion, pruebas: mensaje.pruebas }, mensaje.codigo);
}

ambito.onmessage = (evento) => {
  const mensaje = evento.data;
  const turno = cola.then(() => atender(mensaje));
  cola = turno.catch(() => undefined);
  turno.then(
    (resultado) => ambito.postMessage({ id: mensaje.id, ok: true, resultado }),
    (error: unknown) => ambito.postMessage({ id: mensaje.id, ok: false, error: error instanceof Error ? error.message : String(error) })
  );
};
```

`apps/web/src/components/mision/python-contexto.tsx` completo:
```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import type { OpcionesPython } from "@syntaxerror/engines/python";
import { crearClientePython, type ClientePython, type TrabajadorLike } from "@syntaxerror/engines/python-cliente";

type FaseCarga = "inactivo" | "cargando" | "listo" | "error";
type ContextoPython = { estado: FaseCarga; iniciar: () => void; cliente: () => ClientePython; opciones: OpcionesPython };

const Contexto = createContext<ContextoPython | null>(null);

function crearTrabajador(): TrabajadorLike {
  return new Worker(new URL("../../engines/python.worker.ts", import.meta.url), { type: "module" }) as unknown as TrabajadorLike;
}

// Un solo Python por pestaña: al pasar de una lección a otra sin recargar la página se reutiliza y solo cambian sus
// paquetes y archivos (cargarlo de nuevo tomaba unos 2,5 s por lección). Si se corta por un ciclo infinito, el cliente
// crea otro worker en la siguiente ejecución.
let compartido: ClientePython | null = null;

function clienteCompartido(opciones: OpcionesPython): ClientePython {
  compartido ??= crearClientePython(opciones, { crearTrabajador });
  return compartido;
}

export function PythonProvider({ opciones, children }: { opciones: OpcionesPython; children: ReactNode }) {
  const [estado, setEstado] = useState<FaseCarga>("inactivo");
  const cliente = useCallback(() => clienteCompartido(opciones), [opciones]);
  const iniciar = useCallback(() => {
    setEstado("cargando");
    cliente()
      .reconfigurar(opciones)
      .then(
        () => setEstado("listo"),
        () => setEstado("error")
      );
  }, [cliente, opciones]);
  const valor = useMemo(() => ({ estado, iniciar, cliente, opciones }), [estado, iniciar, cliente, opciones]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePython(): ContextoPython {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("usePython debe usarse dentro de PythonProvider");
  const { estado, iniciar } = contexto;
  useEffect(() => { if (estado === "inactivo") iniciar(); }, [estado, iniciar]);
  return contexto;
}

export function EstadoPython({ estado, onReintentar }: { estado: FaseCarga; onReintentar: () => void }) {
  if (estado === "listo") return <p className="text-sm font-bold text-primary">Python listo</p>;
  if (estado === "error") {
    return <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"><span>No pudimos cargar Python. Revisa tu conexión; lo que escribiste se mantiene.</span><Button type="button" size="sm" variant="secondary" onClick={onReintentar}>Reintentar</Button></div>;
  }
  return <p className="text-sm text-muted-foreground">Cargando Python… la primera vez puede tardar unos segundos.</p>;
}
```

En `README.md`, después de la línea "El validador ejecuta soluciones de Python con Pyodide...", agrega:
```markdown
- En el navegador, Python (Pyodide) corre en un worker que se carga una vez por pestaña: al pasar de una misión o lección a otra sin recargar la página, se reutiliza y solo cambian sus paquetes y archivos (`reconfigurar`). Las variables se limpian en cada ejecución y los archivos de otro caso se borran.
```

- [ ] **Step 5: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "cd packages/engines && npx vitest run && npx tsc --noEmit && cd /app/apps/web && npx tsc --noEmit"`
Expected: PASS (engines 131) y sin errores de tipos.

Run: `npm run test:e2e -- tests/python-entre-lecciones.spec.ts tests/consolas.spec.ts tests/pewen.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/engines/src/python.ts packages/engines/src/python.test.ts packages/engines/src/python-cliente.ts packages/engines/src/python-cliente.test.ts apps/web/src/engines/python.worker.ts apps/web/src/components/mision/python-contexto.tsx e2e/tests/python-entre-lecciones.spec.ts README.md
git commit -m "perf(python): un solo python por pestana, que se reconfigura al pasar de leccion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Las clases en el panel

> **Nota del 2026-10-06:** el cambio del panel ya entró con la Fase 8c, porque su `dashboard/page.tsx` completo lo incluye. **No copies el `dashboard/page.tsx` de esta tarea:** borraría la sección "Rutas en beta". Haz solo el Step 1 (la prueba en `clases.spec.ts`), corre el Step 4 y haz el commit con `e2e/tests/clases.spec.ts`.

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- Test: `e2e/tests/clases.spec.ts`

- [ ] **Step 1: Escribir la prueba**

En `e2e/tests/clases.spec.ts`, en "con los casos 0 y 1 completos: resuelve una lección...", después de `await expect(page.getByRole("heading", { name: "Lección aprobada" })).toBeVisible();` y antes de `await page.goto("/casos/minimarkets-del-sur");`, agrega:
```ts
  // En el panel, las clases se cuentan en lecciones y se continúan como lecciones.
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Tus casos y clases" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Clases de SQL/ }).filter({ hasText: "1/18 lecciones" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Continuar" })).toContainText("Sigue con Alias y expresiones calculadas, de Clases de SQL");
  await expect(page.getByRole("link", { name: "Continuar lección" })).toHaveAttribute("href", `/casos/${CLASES}/02-alias-expresiones`);
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run test:e2e -- tests/clases.spec.ts`
Expected: FAIL, no existe el título "Tus casos y clases".

- [ ] **Step 3: Implementar**

`apps/web/src/app/(dashboard)/dashboard/page.tsx` completo:
```tsx
import Link from "next/link";
import { getDb } from "@syntaxerror/db/client";
import { AvisoVerificacion } from "@/components/cuenta/aviso-verificacion";
import { auth } from "@/lib/auth";
import { fechaCertificado } from "@/lib/certificados/formato";
import { listarCertificados } from "@/lib/certificados/servicio";
import { casosParaPublicar } from "@/lib/contenido";
import { necesitaVerificar } from "@/lib/cuenta/verificacion";
import { calcularNivel } from "@/lib/puntos/niveles";
import { obtenerNivel } from "@/lib/puntos/servicio";
import { siguientePaso } from "@/lib/progreso/continuar";
import { listarCasosDelUsuario } from "@/lib/progreso/servicio";
import { unidad } from "@/lib/unidad";

export const metadata = { title: "Tu panel" };

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "estudiante";
  const userId = session?.user?.id;
  const db = getDb();
  const casosDelUsuario = userId ? await listarCasosDelUsuario(db, userId) : [];
  const certificados = userId ? await listarCertificados(db, userId) : [];
  const nivel = userId ? await obtenerNivel(db, userId) : calcularNivel(0);
  const verificar = userId ? await necesitaVerificar(db, userId) : false;
  const casos = await casosParaPublicar();
  const publicados = new Set(casos.map((caso) => caso.slug));
  // Las clases se cuentan en lecciones; el progreso guardado no sabe el tipo, el contenido sí.
  const esClases = (slug: string) => casos.find((caso) => caso.slug === slug)?.tipo === "clases";
  const paso = userId ? await siguientePaso(db, userId, publicados) : null;
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-sm font-bold text-primary">{"> whoami"}</p>
      <h1 className="text-3xl font-black">Hola, {name}</h1>
      <p className="max-w-2xl leading-7 text-muted-foreground">
        Aquí vas a ver tus casos y clases en curso, tus entregables y tus certificados.
      </p>
      {verificar ? <AvisoVerificacion /> : null}
      {paso ? (
        <section className="card grid gap-3 border-primary p-5" aria-label="Continuar">
          <p className="font-mono text-sm font-bold text-primary">{"> continuar"}</p>
          {paso.tipo === "mision" ? (
            <p className="leading-7">
              {esClases(paso.caso.slug) ? (
                <>
                  Sigue con <strong>{paso.mision.titulo}</strong>, de <strong>{paso.caso.titulo}</strong>.
                </>
              ) : (
                <>
                  Sigue con <strong>{paso.mision.titulo}</strong>, del caso <strong>{paso.caso.titulo}</strong>.
                </>
              )}
            </p>
          ) : (
            <p className="leading-7">
              Aprobaste todas las misiones de <strong>{paso.caso.titulo}</strong>. Te falta enlazar tu entregable para completarlo.
            </p>
          )}
          <div>
            <Link href={paso.href} className="btn btn-primary">{paso.tipo === "mision" ? `Continuar ${unidad(esClases(paso.caso.slug) ? "clases" : "caso").nombre}` : "Ir al caso"}</Link>
          </div>
        </section>
      ) : null}
      <section className="card grid gap-1 p-4" aria-label="Tu nivel">
        <p className="font-mono text-sm font-bold text-primary">{`> nivel ${nivel.nivel}`}</p>
        <p className="text-xl font-black">{`${nivel.puntos} puntos`}</p>
        <p className="text-sm text-muted-foreground">
          {`Te faltan ${nivel.faltan} para el nivel ${nivel.nivel + 1}. Sumas puntos al aprobar misiones, completar casos y acertar decisiones.`}
        </p>
      </section>
      <nav className="flex flex-wrap gap-3 text-sm font-bold" aria-label="Comunidad">
        <Link className="text-primary hover:underline" href="/dashboard/preguntas">Tus preguntas a docentes</Link>
        <Link className="text-primary hover:underline" href="/dashboard/clases">Tus clases</Link>
        <Link className="text-primary hover:underline" href="/dashboard/mensajes">Tus mensajes</Link>
      </nav>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus casos y clases</h2>
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
                <Link href={`/casos/${caso.slug}`} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
                  <span className="font-bold">{caso.titulo}</span>
                  <span className="badge">{caso.completo ? "Completo" : `${caso.misionesAprobadas}/${caso.totalMisiones} ${esClases(caso.slug) ? "lecciones" : "misiones"}`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus certificados</h2>
        {certificados.length === 0 ? (
          <p className="text-muted-foreground">Cuando completes casos o rutas, aparecerán aquí.</p>
        ) : (
          <ul className="grid gap-3">
            {certificados.map((certificado) => (
              <li key={certificado.codigo}>
                <Link href={`/certificados/${certificado.codigo}`} className="card flex items-center justify-between gap-4 p-4 hover:border-primary">
                  <span>
                    <span className="block font-bold">{certificado.titulo}</span>
                    <span className="block text-sm text-muted-foreground">{fechaCertificado(certificado.emitidoEn)}</span>
                  </span>
                  <span className="badge">{certificado.tipo === "ruta" ? "Ruta" : "Caso"}</span>
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

- [ ] **Step 4: Correr las pruebas**

Run: `npm run test:e2e -- tests/clases.spec.ts tests/plataforma.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/(dashboard)/dashboard/page.tsx" e2e/tests/clases.spec.ts
git commit -m "fix(panel): las clases se cuentan y se continuan como lecciones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Los detalles de Excel

**Files:**
- Modify: 10 lecciones de `content/casos/clases-de-excel/misiones/` (09, 11 a 18 y 23)

- [ ] **Step 1: Los cambios**

**En la lección 09,** "con tres cafes encima" pasa a "con tres cafés encima".

**En los bloques `<Sintaxis lenguaje="planilla" ...>`** de las lecciones 09, 11 a 18 y 23, las comas que separan argumentos pasan a punto y coma. En la 23 también la fórmula del cierre: `G2=SUMAR.SI(B2:B4,"tecnologia",E2:E4)` pasa a `G2=SUMAR.SI(B2:B4;"tecnologia";E2:E4)`. La lección 21 (`=SUM(1,2)`) no se toca.

Las líneas quedan así (una por cambio, en el orden de los archivos):
```mdx
<Sintaxis lenguaje="planilla" codigo={"=SI(condicion;valor_si_verdadero;valor_si_falso)"} />
**Uso en reportes.** SI se usa para estados, alertas, aprobaciones, clasificaciones y mensajes automáticos. Es mejor que una persona lea Stock bajo a que tenga que interpretar números a las 6 de la tarde con tres cafés encima.
<Sintaxis lenguaje="planilla" codigo={"=SI(condicion1;resultado1;SI(condicion2;resultado2;resultado3))"} />
<Sintaxis lenguaje="planilla" codigo={"=SUMAR.SI(rango_condicion;criterio;rango_a_sumar)"} />
<Sintaxis lenguaje="planilla" codigo={"=CONTAR.SI(rango;criterio)"} />
<Sintaxis lenguaje="planilla" codigo={"=SUMAR.SI.CONJUNTO(rango_suma;rango_cond1;criterio1;rango_cond2;criterio2)"} />
<Sintaxis lenguaje="planilla" codigo={"=BUSCARV(valor_buscado;rango;columna;0)"} />
<Sintaxis lenguaje="planilla" codigo={"=INDICE(rango_resultado;COINCIDIR(valor_buscado;rango_busqueda;0))"} />
<Sintaxis lenguaje="planilla" codigo={"=INDICE(rango_a_la_izquierda;COINCIDIR(valor;rango_busqueda;0))"} />
<Sintaxis lenguaje="planilla" codigo={"=IZQUIERDA(texto;cantidad)"} />
<Sintaxis lenguaje="planilla" codigo={"=SUMAR.SI(B2:B4;\"tecnologia\";E2:E4)"} />
E2=900000, E3=60000, E4=180000 (precio*cantidad de cada fila); F2="NOTEBOOK (tecnologia)"; G2=SUMAR.SI(B2:B4;"tecnologia";E2:E4)=900000+60000=960000, porque Notebook y Mouse son categoría tecnologia.
```

Comprueba que no quedó ninguna con coma:

Run: `grep -n 'lenguaje="planilla" codigo={"[^}]*,' content/casos/clases-de-excel/misiones/*.mdx`
Expected: solo `21-errores-comunes.mdx` (`=SUM(1,2)`).

- [ ] **Step 2: Validar y correr todo**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content validate`
Expected: `[content] ok: 2 rutas, 12 casos, 174 misiones`.

Run: `docker compose run --rm tools pnpm -r --if-present test`
Expected: PASS (engines 131, web 360).

Run: `npm run test:e2e`
Expected: `57 passed`, dos corridas seguidas.

- [ ] **Step 3: Commit**

```bash
git add content/casos/clases-de-excel
git commit -m "fix(contenido): excel con punto y coma en la sintaxis, como el texto y la planilla, y cafes con tilde

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
