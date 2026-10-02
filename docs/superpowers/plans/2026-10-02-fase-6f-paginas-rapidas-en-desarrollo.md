# Fase 6f: Páginas rápidas en desarrollo. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la plataforma en local (`npm run dev`) responda en décimas de segundo y no en 4 a 5 segundos por página.

**Architecture:**
- **La causa:** fuera de producción, `obtenerContenido()` (`apps/web/src/lib/contenido.ts`) leía y analizaba todo `content/` en cada llamada, y una página de misión la llama 3 o 4 veces. Cargar el contenido toma unos 300 ms; con las clases la ruta pasó de unas 40 misiones a 174, y cada página llegó a tardar entre 4 y 5 segundos, aun en la segunda visita.
- **El arreglo:** en desarrollo el contenido también queda en memoria, junto con una firma: la cantidad de archivos de `content/` y su fecha de modificación más reciente. Si la firma cambia (se editó, creó o borró un archivo), se vuelve a cargar. Calcular la firma de los 209 archivos toma unos 9 ms.
- **Producción no cambia:** ahí el contenido ya se cargaba una vez, y las páginas de misión son estáticas.

**Medido en local:**
- Antes, una misión en la segunda visita tardaba entre 4,3 y 5,3 s.
- Después, entre 0,11 y 0,21 s.
- La primera visita a una página sigue compilándola: eso es propio de `next dev`.

**Tech Stack:** Next 15 y Vitest 4.

**Spec:** recorrido de la ruta completa del 2026-10-02: las páginas se sentían muy lentas en local.

## Global Constraints

- Todo se ejecuta con `docker compose run --rm tools ...`. El paquete de la app se llama `web`.
- Commits en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Editar una lección con `npm run dev` levantado:** el cambio se ve al recargar la página, sin reiniciar. Probado en `contenido.test.ts` (cambia la fecha de un archivo) y a mano.
2. **Agregar una lección cuya fecha es anterior a la última** (por ejemplo, copiada con su fecha original): la firma cuenta archivos, así que también se recarga. Probado en `contenido.test.ts`.
3. **Producción:** el código de producción no cambia (`enCache ??= ...`).

---

### Task 1: El contenido en memoria también en desarrollo

**Files:**
- Modify: `apps/web/src/lib/contenido.ts`
- Test: `apps/web/src/lib/contenido.test.ts`

**Interfaces:**
- Produces: `obtenerContenido()` mantiene su firma; fuera de producción reutiliza la carga mientras no cambie `content/`.

- [ ] **Step 1: Escribir la prueba**

`apps/web/src/lib/contenido.test.ts`:
```ts
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const cargarContenido = vi.hoisted(() => vi.fn(async () => ({ rutas: [], casos: [] })));
vi.mock("@syntaxerror/content/cargar", () => ({ cargarContenido }));

import { obtenerContenido } from "./contenido";

describe("obtenerContenido fuera de producción", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "contenido-"));
  const anterior = process.env.CONTENT_DIR;
  beforeAll(() => {
    mkdirSync(path.join(dir, "casos"));
    writeFileSync(path.join(dir, "casos", "caso.yaml"), "titulo: Uno\n");
    process.env.CONTENT_DIR = dir;
  });
  afterAll(() => {
    process.env.CONTENT_DIR = anterior;
  });

  it("carga el contenido una vez y lo vuelve a cargar solo si cambia un archivo", async () => {
    await obtenerContenido();
    await obtenerContenido();
    expect(cargarContenido).toHaveBeenCalledTimes(1);

    const despues = new Date(Date.now() + 60_000);
    utimesSync(path.join(dir, "casos", "caso.yaml"), despues, despues);
    await obtenerContenido();
    expect(cargarContenido).toHaveBeenCalledTimes(2);

    writeFileSync(path.join(dir, "casos", "otro.yaml"), "titulo: Dos\n");
    utimesSync(path.join(dir, "casos", "otro.yaml"), new Date(0), new Date(0));
    await obtenerContenido();
    expect(cargarContenido).toHaveBeenCalledTimes(3);
    expect(cargarContenido).toHaveBeenLastCalledWith(dir);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/contenido.test.ts"`
Expected: FAIL, `expected "vi.fn()" to be called 1 times, but got 2 times`.

- [ ] **Step 3: Implementar**

`apps/web/src/lib/contenido.ts` completo:
```ts
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { cargarContenido } from "@syntaxerror/content/cargar";
import { casosVisibles, rutasVisibles } from "@syntaxerror/content/publicacion";
import type { Caso, Contenido, Ruta } from "@syntaxerror/content/tipos";

let enCache: Promise<Contenido> | null = null;
let firmaEnCache = "";

function directorio(): string {
  return process.env.CONTENT_DIR ?? path.resolve(process.cwd(), "../../content");
}

export function incluirBorradores(): boolean {
  return process.env.CONTENT_INCLUDE_DRAFTS === "true";
}

// La fecha de modificación más reciente y la cantidad de archivos del contenido: cambia al editar, crear o borrar uno.
function firmaContenido(dir: string): string {
  let ultima = 0;
  let archivos = 0;
  for (const entrada of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entrada.isFile()) continue;
    archivos += 1;
    ultima = Math.max(ultima, statSync(path.join(entrada.parentPath, entrada.name)).mtimeMs);
  }
  return `${archivos}:${ultima}`;
}

// En producción el contenido se carga una vez. En desarrollo se vuelve a cargar solo si cambió algún archivo:
// cargarlo entero en cada llamada (varias por página, con 174 misiones) hacía que cada página tardara segundos.
export function obtenerContenido(): Promise<Contenido> {
  if (process.env.NODE_ENV !== "production") {
    const firma = firmaContenido(directorio());
    if (!enCache || firma !== firmaEnCache) {
      enCache = cargarContenido(directorio());
      firmaEnCache = firma;
    }
    return enCache;
  }
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

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && pnpm --filter web exec tsc --noEmit"`
Expected: PASS (337 pruebas) y sin errores de tipos.

Con `npm run dev` levantado, mide una misión dos veces:

Run: `for i in 1 2 3; do curl -s -o /dev/null -w "%{time_total}s\n" http://localhost:3000/casos/clases-de-sql/05-join-inner; done`
Expected: la primera puede tardar (compila); la segunda y la tercera, menos de medio segundo.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/contenido.ts apps/web/src/lib/contenido.test.ts
git commit -m "perf(web): en desarrollo el contenido queda en memoria y se recarga solo si cambia un archivo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
