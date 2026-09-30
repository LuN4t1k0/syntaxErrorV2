# Fase 3d: Cierre de la plataforma. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar lista la parte periférica de la plataforma para que la Fase 4 se dedique solo al contenido:
- el buscador de rutas, casos y misiones;
- "continuar donde quedé";
- la limpieza periódica de la bitácora;
- `robots.txt`, `sitemap.xml`, el ícono y la imagen para redes;
- el monitoreo de errores con Sentry.

**Architecture:**
- **Buscador:**
  - `/buscar` es una página estática. El índice (rutas, casos y misiones publicadas, con el texto del encargo, los conceptos y los enunciados) se arma en el build desde `content/` y viaja en la página.
  - La búsqueda corre en el navegador, sin base ni API, e ignora mayúsculas y tildes.
  - El índice nunca incluye soluciones, pruebas ni el cierre (`Debrief`), para que el buscador no revele respuestas.
- **Continuar donde quedé:** en el panel, `siguientePaso()` toma el caso con actividad más reciente que no esté completo y lleva a la misión en curso o a la siguiente pendiente. Si solo falta el entregable, lleva al caso. Solo considera casos publicados, así que nunca enlaza a una página que no existe.
- **Mantenimiento:**
  - Una cola nueva, `mantenimiento`, con un programador de BullMQ que corre una vez al día.
  - Borra las entradas de `audit_log` y de `ai_chat_questions` más antiguas que `RETENCION_BITACORA_DIAS` (365 por defecto, mínimo 30), igual que la v1.
  - Los registros de derechos ARCO (`data_exported` y `account_deleted`) no se borran nunca: el spec los conserva por obligación legal.
- **SEO de lanzamiento:**
  - `robots.ts` y `sitemap.ts`. El sitemap sale del contenido publicado, no de la base, y queda estático.
  - El ícono y la imagen para redes de la v1. `siteConfig` ya apunta a `/images/data-learning-hero.png`, pero en la v2 el archivo no existe.
- **Sentry:**
  - `@sentry/nextjs` en la web y `@sentry/node` en el worker, con 10 % de muestreo de trazas y sin datos personales.
  - Sin `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` queda apagado, que es lo normal en local y en los tests.
  - Los errores del navegador pasan por `/monitoring`, en el mismo dominio, así que la CSP no cambia.

**Tech Stack:** Next.js 15, React 19, Drizzle ORM 0.36, BullMQ 5 (`upsertJobScheduler`), `@sentry/nextjs` 10, `@sentry/node` 10, Vitest 4, Playwright 1.55.

**Spec:** `docs/superpowers/specs/2026-09-29-syntaxerror-v2-design.md`. Secciones:
- 9: "continuar donde quedé", buscador y seguridad;
- 10: los registros ARCO se conservan;
- 11: Sentry con muestreo bajo;
- 13: páginas de misiones estáticas; ningún asset pasa por `auth()` ni por la base.

## Global Constraints

**Entorno**
- Todo se ejecuta en contenedores. Ningún paso corre `pnpm` o `node` en el host: se usa `docker compose run --rm tools ...`.
- Si los contenedores de la v1 (`cursos-*`) están arriba, ocupan los puertos 5432, 5433, 6379, 1025 y 8025. Detenlos antes con `docker compose -p cursos stop`.

**Texto y páginas**
- El texto visible va en español de Chile, con tildes y `¿`/`¡`, tratando de tú, sin voseo y con lenguaje neutro.
- `/buscar`, `/casos/[caso]` y `/casos/[caso]/[mision]` usan `dynamic = "error"` y se sirven con `x-nextjs-cache: HIT`. Nada de esta fase llama a `auth()` ni a la base en esas páginas ni en el layout `(misiones)`.

**Datos y monitoreo**
- El índice de búsqueda nunca incluye `solucion`, `pruebas`, `verificar`, `preparacion` ni el texto del `Debrief`.
- La limpieza nunca borra acciones de derechos ARCO. Con un valor de retención inválido usa 365 días; nunca menos de 30.
- Sentry queda apagado si no está definido su DSN, envía `sendDefaultPii: false` y muestrea el 10 % de las trazas.

**Commits**
- Mensajes en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Búsquedas con tildes, mayúsculas, espacios dobles o símbolos** (`"SQL  básico!"`, `"CLIENTES"`, `"ñ"`, `"***"`). Encuentran lo mismo que la versión limpia, y una búsqueda vacía o solo de símbolos no muestra resultados ni falla. Test en Task 1.
2. **Una búsqueda que intenta encontrar la solución** (el texto exacto de una `solucion` o de un `Debrief`) no devuelve la misión por ese texto. Test en Task 1.
3. **"Continuar" con un caso que pasó a borrador o una misión que ya no está en el contenido.** El panel no enlaza a una página inexistente: salta a otro caso o no muestra la tarjeta. Test en Task 2.
4. **`RETENCION_BITACORA_DIAS` inválido** (`abc`, `0`, `5`, `-1`). Usa 365 o el mínimo de 30, nunca borra toda la bitácora, y nunca borra registros ARCO. Test en Task 3.
5. **El worker se reinicia varias veces.** Sigue habiendo un solo programador de limpieza, no uno por arranque. Test en Task 3.

## Estructura de archivos

```
apps/web/src/lib/buscador/
  buscar.ts                              normalizar y buscar (sin dependencias: corre en el navegador)
  indice.ts                              construirIndice desde el contenido (sin soluciones)
apps/web/src/components/buscador.tsx     cuadro de búsqueda y resultados
apps/web/src/app/(misiones)/buscar/page.tsx
apps/web/src/lib/progreso/continuar.ts   siguientePaso
packages/db/src/mantenimiento.ts         purgarBitacora, purgarPreguntasTutor
packages/queue/src/mantenimiento.ts      cola y programador diario
apps/worker/src/mantenimiento/procesar.ts
apps/web/src/lib/seo-rutas.ts            entradasSitemap y reglasRobots
apps/web/src/app/robots.ts, sitemap.ts, icon.svg
apps/web/public/images/data-learning-hero.png
apps/web/sentry.server.config.ts, sentry.edge.config.ts
apps/web/src/instrumentation.ts, instrumentation-client.ts
apps/web/src/lib/monitoreo.ts, apps/worker/src/monitoreo.ts
e2e/tests/plataforma.spec.ts
```

---

### Task 1: Buscador

**Files:**
- Create: `apps/web/src/lib/buscador/buscar.ts`, `apps/web/src/lib/buscador/indice.ts`
- Test: `apps/web/src/lib/buscador/buscar.test.ts`, `apps/web/src/lib/buscador/indice.test.ts`
- Create: `apps/web/src/components/buscador.tsx`, `apps/web/src/app/(misiones)/buscar/page.tsx`
- Modify: `apps/web/src/components/misiones-header.tsx`, `apps/web/src/components/site-header.tsx`

**Interfaces:**
- Consumes: `rutasParaPublicar()` y `casosParaPublicar()` (`@/lib/contenido`), y los tipos `Ruta`, `Caso` y `Mision` (`@syntaxerror/content/tipos`).
- Produces en `@/lib/buscador/buscar`, un módulo sin imports que corre en el navegador:
  - `type EntradaBusqueda = { tipo: "ruta" | "caso" | "mision"; titulo: string; contexto: string; href: string; texto: string }`, donde `texto` ya viene normalizado;
  - `normalizar(texto: string): string`, que pasa a minúsculas, quita tildes y cambia los símbolos por espacios;
  - `buscar(indice, consulta, limite = 20): EntradaBusqueda[]`. Deben aparecer todas las palabras; primero van los resultados con más palabras en el título y, a igual puntaje, rutas antes que casos y casos antes que misiones.
- Produces en `@/lib/buscador/indice`: `MAXIMO_TEXTO_MISION = 1500` y `construirIndice(rutas: Ruta[], casos: Caso[]): EntradaBusqueda[]`.
- Produces la página estática `/buscar?q=`, y el enlace `Buscar` en los dos encabezados.

- [ ] **Step 1: Escribir los tests que fallan**

`apps/web/src/lib/buscador/buscar.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buscar, normalizar, type EntradaBusqueda } from "./buscar";

const entrada = (tipo: EntradaBusqueda["tipo"], titulo: string, texto = ""): EntradaBusqueda => ({
  tipo,
  titulo,
  contexto: "Contexto",
  href: `/${titulo}`,
  texto: normalizar(texto),
});

const INDICE = [
  entrada("mision", "Clientes de regiones", "WHERE filtra las filas de una tabla"),
  entrada("caso", "Ventas de marzo", "clientes y ventas de la distribuidora"),
  entrada("ruta", "Data Analyst", "SQL básico, planillas y Python"),
  entrada("mision", "Ticket promedio", "promedio con pandas"),
];

describe("buscador", () => {
  it("normaliza mayúsculas, tildes, eñes y símbolos", () => {
    expect(normalizar("  SQL  Básico!  ")).toBe("sql basico");
    expect(normalizar("Año ÚLTIMO")).toBe("ano ultimo");
    expect(normalizar("***")).toBe("");
  });

  it("encuentra con o sin tildes y exige todas las palabras", () => {
    expect(buscar(INDICE, "sql basico").map((resultado) => resultado.titulo)).toEqual(["Data Analyst"]);
    expect(buscar(INDICE, "SQL  BÁSICO!").map((resultado) => resultado.titulo)).toEqual(["Data Analyst"]);
    expect(buscar(INDICE, "sql pandas")).toEqual([]);
  });

  it("prioriza el título y, a igual puntaje, rutas, casos y misiones en ese orden", () => {
    expect(buscar(INDICE, "clientes").map((resultado) => resultado.titulo)).toEqual(["Clientes de regiones", "Ventas de marzo"]);
    expect(buscar(INDICE, "promedio").map((resultado) => resultado.titulo)).toEqual(["Ticket promedio"]);
  });

  it("una búsqueda vacía o solo de símbolos no devuelve nada, y respeta el límite", () => {
    expect(buscar(INDICE, "")).toEqual([]);
    expect(buscar(INDICE, "***")).toEqual([]);
    expect(buscar(INDICE, "a", 2)).toHaveLength(2);
  });
});
```

`apps/web/src/lib/buscador/indice.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import type { Caso, Ruta } from "@syntaxerror/content/tipos";
import { buscar } from "./buscar";
import { construirIndice } from "./indice";

const RUTA: Ruta = {
  slug: "data-analyst",
  titulo: "Data Analyst",
  cargo: "Analista de datos junior",
  descripcion: "Resuelve casos reales con SQL.",
  estado: "publicada",
  casos: ["ventas"],
};

const CASO = {
  slug: "ventas",
  titulo: "Ventas de marzo",
  cargo: "Analista de datos junior",
  empresa: "Distribuidora Los Andes",
  dataset: "Clientes y ventas",
  entregable: "Un repositorio con la consulta",
  datos: [],
  misiones: [
    {
      slug: "01-clientes",
      titulo: "Clientes de regiones",
      tiempo: 10,
      fuente: "",
      bloques: [
        { tipo: "Brief", props: { de: "Paula" }, texto: "Necesito los clientes de fuera de Santiago." },
        { tipo: "Concepto", props: {}, texto: "WHERE filtra filas." },
        {
          tipo: "SqlTask",
          props: { id: "t1", enunciado: "Trae nombre y ciudad.", inicial: "", solucion: "SELECT zzsolucionsecreta FROM clientes", comparar: "filas-sin-orden", pistas: ["usa pistasecreta"] },
          texto: null,
        },
        { tipo: "Debrief", props: { entrevista: "preguntaentrevista" }, texto: "cierrerevelador con la respuesta" },
      ],
    },
  ],
} as unknown as Caso;

describe("construirIndice", () => {
  it("indexa rutas, casos y misiones con sus enlaces", () => {
    const indice = construirIndice([RUTA], [CASO]);
    expect(indice.map(({ tipo, titulo, contexto, href }) => ({ tipo, titulo, contexto, href }))).toEqual([
      { tipo: "ruta", titulo: "Data Analyst", contexto: "Analista de datos junior", href: "/rutas/data-analyst" },
      { tipo: "caso", titulo: "Ventas de marzo", contexto: "Distribuidora Los Andes · Analista de datos junior", href: "/casos/ventas" },
      { tipo: "mision", titulo: "Clientes de regiones", contexto: "Ventas de marzo", href: "/casos/ventas/01-clientes" },
    ]);
  });

  it("busca en el encargo, los conceptos y los enunciados, pero nunca en soluciones, pistas ni el cierre", () => {
    const indice = construirIndice([RUTA], [CASO]);
    expect(buscar(indice, "fuera de santiago").map((resultado) => resultado.titulo)).toEqual(["Clientes de regiones"]);
    expect(buscar(indice, "where filtra").map((resultado) => resultado.titulo)).toEqual(["Clientes de regiones"]);
    expect(buscar(indice, "nombre y ciudad").map((resultado) => resultado.titulo)).toEqual(["Clientes de regiones"]);
    for (const secreto of ["zzsolucionsecreta", "pistasecreta", "cierrerevelador", "preguntaentrevista"]) {
      expect(buscar(indice, secreto)).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/buscador`
Expected: FAIL, porque no se pueden resolver `./buscar` ni `./indice`.

- [ ] **Step 3: Crear `apps/web/src/lib/buscador/buscar.ts`**

```ts
// Sin imports: este módulo corre en el navegador.
export type EntradaBusqueda = { tipo: "ruta" | "caso" | "mision"; titulo: string; contexto: string; href: string; texto: string };

const PRIORIDAD: Record<EntradaBusqueda["tipo"], number> = { ruta: 3, caso: 2, mision: 1 };

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buscar(indice: EntradaBusqueda[], consulta: string, limite = 20): EntradaBusqueda[] {
  const palabras = normalizar(consulta).split(" ").filter(Boolean);
  if (palabras.length === 0) return [];
  const encontradas: { entrada: EntradaBusqueda; puntaje: number; orden: number }[] = [];
  indice.forEach((entrada, orden) => {
    const titulo = normalizar(entrada.titulo);
    const resto = `${normalizar(entrada.contexto)} ${entrada.texto}`;
    if (!palabras.every((palabra) => titulo.includes(palabra) || resto.includes(palabra))) return;
    const enTitulo = palabras.filter((palabra) => titulo.includes(palabra)).length;
    encontradas.push({ entrada, puntaje: enTitulo * 10 + PRIORIDAD[entrada.tipo], orden });
  });
  return encontradas
    .sort((a, b) => b.puntaje - a.puntaje || a.orden - b.orden)
    .slice(0, limite)
    .map((resultado) => resultado.entrada);
}
```

- [ ] **Step 4: Crear `apps/web/src/lib/buscador/indice.ts`**

```ts
import type { Caso, Mision, Ruta } from "@syntaxerror/content/tipos";
import { normalizar, type EntradaBusqueda } from "./buscar";

export const MAXIMO_TEXTO_MISION = 1500;

// Solo lo que la persona ve antes de resolver: encargo, conceptos, enunciados y preguntas de decisión.
// Nunca soluciones, pruebas, pistas ni el Debrief, para que el buscador no revele respuestas.
function textoDeMision(mision: Mision): string {
  const partes: string[] = [];
  for (const bloque of mision.bloques) {
    if ((bloque.tipo === "Brief" || bloque.tipo === "Concepto") && bloque.texto) partes.push(bloque.texto);
    if (bloque.tipo === "Decision") partes.push(bloque.props.pregunta);
    if ((bloque.tipo === "SqlTask" || bloque.tipo === "PythonTask" || bloque.tipo === "SheetTask") && bloque.props.enunciado) {
      partes.push(bloque.props.enunciado);
    }
  }
  return normalizar(partes.join(" ")).slice(0, MAXIMO_TEXTO_MISION);
}

export function construirIndice(rutas: Ruta[], casos: Caso[]): EntradaBusqueda[] {
  const rutasDelCaso = (slug: string) => rutas.filter((ruta) => ruta.casos.includes(slug)).map((ruta) => ruta.titulo).join(" ");
  return [
    ...rutas.map((ruta) => ({
      tipo: "ruta" as const,
      titulo: ruta.titulo,
      contexto: ruta.cargo,
      href: `/rutas/${ruta.slug}`,
      texto: normalizar(ruta.descripcion),
    })),
    ...casos.flatMap((caso) => [
      {
        tipo: "caso" as const,
        titulo: caso.titulo,
        contexto: `${caso.empresa} · ${caso.cargo}`,
        href: `/casos/${caso.slug}`,
        texto: normalizar(`${caso.dataset} ${caso.entregable} ${rutasDelCaso(caso.slug)}`),
      },
      ...caso.misiones.map((mision) => ({
        tipo: "mision" as const,
        titulo: mision.titulo,
        contexto: caso.titulo,
        href: `/casos/${caso.slug}/${mision.slug}`,
        texto: textoDeMision(mision),
      })),
    ]),
  ];
}
```

- [ ] **Step 5: Correr los tests**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/buscador`
Expected: PASS (6 tests).

- [ ] **Step 6: Crear el componente y la página**

`apps/web/src/components/buscador.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { buscar, type EntradaBusqueda } from "@/lib/buscador/buscar";

const ETIQUETAS: Record<EntradaBusqueda["tipo"], string> = { ruta: "Ruta", caso: "Caso", mision: "Misión" };

export function Buscador({ indice }: { indice: EntradaBusqueda[] }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [consulta, setConsulta] = useState(parametros.get("q") ?? "");
  const resultados = useMemo(() => buscar(indice, consulta), [indice, consulta]);

  function cambiar(valor: string) {
    setConsulta(valor);
    // replace, no push: escribir no llena el historial del navegador.
    router.replace(valor.trim() ? `/buscar?q=${encodeURIComponent(valor)}` : "/buscar", { scroll: false });
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold">
        Busca rutas, casos, misiones o conceptos
        <input
          type="search"
          value={consulta}
          onChange={(evento) => cambiar(evento.target.value)}
          maxLength={100}
          autoFocus
          placeholder="Por ejemplo: WHERE, promedio o ventas"
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-base font-normal text-foreground outline-none focus:border-primary"
        />
      </label>
      {consulta.trim() === "" ? null : resultados.length === 0 ? (
        <p role="status" className="text-muted-foreground">{`No encontramos resultados para «${consulta.trim()}».`}</p>
      ) : (
        <ul className="grid gap-3" aria-label="Resultados">
          {resultados.map((resultado) => (
            <li key={resultado.href}>
              <Link href={resultado.href} className="card grid gap-1 p-4 hover:border-primary">
                <span className="font-mono text-xs text-muted-foreground">{`${ETIQUETAS[resultado.tipo]} · ${resultado.contexto}`}</span>
                <span className="font-bold">{resultado.titulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`apps/web/src/app/(misiones)/buscar/page.tsx`:
```tsx
import { Suspense } from "react";
import { Buscador } from "@/components/buscador";
import { construirIndice } from "@/lib/buscador/indice";
import { casosParaPublicar, rutasParaPublicar } from "@/lib/contenido";

export const dynamic = "error";
export const metadata = { title: "Buscar", description: "Busca rutas, casos y misiones de syntaxError.cl." };

export default async function BuscarPage() {
  const indice = construirIndice(await rutasParaPublicar(), await casosParaPublicar());
  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-bold text-primary">{"> grep -ri"}</p>
      <h1 className="text-3xl font-black">Buscar</h1>
      {/* useSearchParams en una página estática necesita Suspense: el índice llega en el HTML y la consulta se lee en el navegador. */}
      <Suspense fallback={<p className="text-muted-foreground">Cargando el buscador…</p>}>
        <Buscador indice={indice} />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 7: Enlaces en los encabezados**

En `apps/web/src/components/misiones-header.tsx`, dentro del `<nav aria-label="Principal">` y antes del enlace `Rutas`, agregar:
```tsx
          <Link className="nav-link" href="/buscar">Buscar</Link>
```

En `apps/web/src/components/site-header.tsx`:
- agregar `Search` al import de `lucide-react`;
- justo antes de `<ThemeToggle />`, agregar:
```tsx
        <Link className="nav-link" href="/buscar" aria-label="Buscar">
          <Search size={16} />
          <span className="hidden sm:inline">Buscar</span>
        </Link>
```

- [ ] **Step 8: Correr los tests, el typecheck y el build**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p . && pnpm build"`
Expected:
- PASS y `tsc` sin errores;
- en la tabla de rutas del build, `/buscar` aparece como estática (`○`) y el build no falla por `dynamic = "error"`.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/lib/buscador apps/web/src/components/buscador.tsx "apps/web/src/app/(misiones)/buscar" apps/web/src/components/misiones-header.tsx apps/web/src/components/site-header.tsx
git commit -m "feat(plataforma): buscador estatico de rutas, casos y misiones sin soluciones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Continuar donde quedé

**Files:**
- Create: `apps/web/src/lib/progreso/continuar.ts`
- Test: `apps/web/src/lib/progreso/continuar.test.ts`
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `misionProgreso`, `casos` y `casoInscripciones` (Fase 2), y `casosParaPublicar()`.
- Produces en `@/lib/progreso/continuar`:
  - `type SiguientePaso = { tipo: "mision"; caso: { slug; titulo }; mision: { slug; titulo }; href } | { tipo: "entregable"; caso: { slug; titulo }; href }`;
  - `siguientePaso(db, userId, publicados: ReadonlySet<string>): Promise<SiguientePaso | null>`.
- Reglas de `siguientePaso`:
  - Recorre los casos del más reciente al más antiguo según `mision_progreso.actualizado_en`, y se salta los no publicados y los completos.
  - En el primero que quede, si la misión que la persona tocó al final sigue en curso y existe en el caso, vuelve ahí.
  - Si no, busca la siguiente misión pendiente en el orden del caso, dando la vuelta al inicio.
  - Si no hay pendientes, lleva al caso para enlazar el entregable.
- Produces en `/dashboard` la tarjeta `Continuar`, arriba de todo.

- [ ] **Step 1: Escribir el test que falla, `apps/web/src/lib/progreso/continuar.test.ts`**

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casoInscripciones, casos, misionProgreso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { siguientePaso } from "./continuar";

const { db, close } = createTestDb();
const MISIONES = [
  { slug: "m1", titulo: "Uno", tareas: ["t1"] },
  { slug: "m2", titulo: "Dos", tareas: ["t1"] },
  { slug: "m3", titulo: "Tres", tareas: ["t1"] },
];
const hace = (minutos: number) => new Date(Date.now() - minutos * 60_000);

async function preparar() {
  const [ana] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
  const [ventas, stock] = await db
    .insert(casos)
    .values([
      { slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: MISIONES },
      { slug: "stock", titulo: "Stock", cargo: "A", empresa: "D", entregable: "R", misiones: MISIONES },
    ])
    .returning({ id: casos.id });
  return { userId: ana.id, ventasId: ventas.id, stockId: stock.id };
}

const TODOS = new Set(["ventas", "stock"]);

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("siguientePaso", () => {
  it("sin actividad no hay tarjeta", async () => {
    const { userId } = await preparar();
    expect(await siguientePaso(db, userId, TODOS)).toBeNull();
  });

  it("vuelve a la misión en curso más reciente", async () => {
    const { userId, ventasId } = await preparar();
    await db.insert(misionProgreso).values([
      { userId, casoId: ventasId, mision: "m1", estado: "aprobada", actualizadoEn: hace(30) },
      { userId, casoId: ventasId, mision: "m2", estado: "en_curso", actualizadoEn: hace(5) },
    ]);
    expect(await siguientePaso(db, userId, TODOS)).toEqual({
      tipo: "mision",
      caso: { slug: "ventas", titulo: "Ventas" },
      mision: { slug: "m2", titulo: "Dos" },
      href: "/casos/ventas/m2",
    });
  });

  it("si la última quedó aprobada, sigue con la siguiente pendiente, dando la vuelta", async () => {
    const { userId, ventasId } = await preparar();
    await db.insert(misionProgreso).values([
      { userId, casoId: ventasId, mision: "m2", estado: "aprobada", actualizadoEn: hace(20) },
      { userId, casoId: ventasId, mision: "m3", estado: "aprobada", actualizadoEn: hace(5) },
    ]);
    expect((await siguientePaso(db, userId, TODOS))?.href).toBe("/casos/ventas/m1");
  });

  it("con todas aprobadas y sin entregable, lleva al caso", async () => {
    const { userId, ventasId } = await preparar();
    await db.insert(misionProgreso).values(MISIONES.map((mision, indice) => ({ userId, casoId: ventasId, mision: mision.slug, estado: "aprobada", actualizadoEn: hace(indice) })));
    expect(await siguientePaso(db, userId, TODOS)).toEqual({ tipo: "entregable", caso: { slug: "ventas", titulo: "Ventas" }, href: "/casos/ventas" });
  });

  it("salta casos completos, casos no publicados y misiones que ya no están en el contenido", async () => {
    const { userId, ventasId, stockId } = await preparar();
    await db.insert(casoInscripciones).values({ userId, casoId: ventasId, completadoEn: new Date() });
    await db.insert(misionProgreso).values([
      { userId, casoId: ventasId, mision: "m1", estado: "aprobada", actualizadoEn: hace(1) },
      { userId, casoId: stockId, mision: "m-borrada", estado: "en_curso", actualizadoEn: hace(10) },
    ]);
    expect((await siguientePaso(db, userId, TODOS))?.href).toBe("/casos/stock/m1");
    expect(await siguientePaso(db, userId, new Set(["ventas"]))).toBeNull();
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/progreso/continuar.test.ts`
Expected: FAIL, porque no se puede resolver `./continuar`.

- [ ] **Step 3: Crear `apps/web/src/lib/progreso/continuar.ts`**

```ts
import { and, desc, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { casoInscripciones, casos, misionProgreso } from "@syntaxerror/db/schema";

type CasoCorto = { slug: string; titulo: string };
export type SiguientePaso =
  | { tipo: "mision"; caso: CasoCorto; mision: { slug: string; titulo: string }; href: string }
  | { tipo: "entregable"; caso: CasoCorto; href: string };

export async function siguientePaso(db: AppDb, userId: string, publicados: ReadonlySet<string>): Promise<SiguientePaso | null> {
  const filas = await db
    .select({
      casoSlug: casos.slug,
      casoTitulo: casos.titulo,
      misiones: casos.misiones,
      mision: misionProgreso.mision,
      estado: misionProgreso.estado,
      completadoEn: casoInscripciones.completadoEn,
    })
    .from(misionProgreso)
    .innerJoin(casos, eq(casos.id, misionProgreso.casoId))
    .leftJoin(casoInscripciones, and(eq(casoInscripciones.userId, misionProgreso.userId), eq(casoInscripciones.casoId, misionProgreso.casoId)))
    .where(eq(misionProgreso.userId, userId))
    .orderBy(desc(misionProgreso.actualizadoEn));

  const revisados = new Set<string>();
  for (const ultima of filas) {
    if (revisados.has(ultima.casoSlug)) continue;
    revisados.add(ultima.casoSlug);
    // Solo casos que existen como página: uno que pasó a borrador no se enlaza.
    if (!publicados.has(ultima.casoSlug) || ultima.completadoEn) continue;

    const caso = { slug: ultima.casoSlug, titulo: ultima.casoTitulo };
    const aprobadas = new Set(filas.filter((fila) => fila.casoSlug === ultima.casoSlug && fila.estado === "aprobada").map((fila) => fila.mision));
    const indice = ultima.misiones.findIndex((mision) => mision.slug === ultima.mision);
    const enCurso = indice >= 0 && ultima.estado !== "aprobada" ? ultima.misiones[indice] : undefined;
    const orden = indice >= 0 ? [...ultima.misiones.slice(indice + 1), ...ultima.misiones.slice(0, indice + 1)] : ultima.misiones;
    const destino = enCurso ?? orden.find((mision) => !aprobadas.has(mision.slug));

    if (destino) {
      return { tipo: "mision", caso, mision: { slug: destino.slug, titulo: destino.titulo }, href: `/casos/${caso.slug}/${destino.slug}` };
    }
    return { tipo: "entregable", caso, href: `/casos/${caso.slug}` };
  }
  return null;
}
```

- [ ] **Step 4: Correr el test**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/progreso/continuar.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Tarjeta en `apps/web/src/app/(dashboard)/dashboard/page.tsx`**

Agregar a los imports:
```ts
import { casosParaPublicar } from "@/lib/contenido";
import { siguientePaso } from "@/lib/progreso/continuar";
```

Después de `const verificar = ...`, agregar:
```ts
  const publicados = new Set((await casosParaPublicar()).map((caso) => caso.slug));
  const paso = userId ? await siguientePaso(db, userId, publicados) : null;
```

Justo después de `<h1 className="text-3xl font-black">Hola, {name}</h1>`, agregar:
```tsx
      {paso ? (
        <section className="card grid gap-3 border-primary p-5" aria-label="Continuar">
          <p className="font-mono text-sm font-bold text-primary">{"> continuar"}</p>
          {paso.tipo === "mision" ? (
            <p className="leading-7">
              Sigue con <strong>{paso.mision.titulo}</strong>, del caso <strong>{paso.caso.titulo}</strong>.
            </p>
          ) : (
            <p className="leading-7">
              Aprobaste todas las misiones de <strong>{paso.caso.titulo}</strong>. Te falta enlazar tu entregable para completarlo.
            </p>
          )}
          <div>
            <Link href={paso.href} className="btn btn-primary">{paso.tipo === "mision" ? "Continuar misión" : "Ir al caso"}</Link>
          </div>
        </section>
      ) : null}
```

- [ ] **Step 6: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS y `tsc` sin errores.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/progreso/continuar.ts apps/web/src/lib/progreso/continuar.test.ts "apps/web/src/app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(plataforma): continuar donde quede en el panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Limpieza periódica de la bitácora

**Files:**
- Create: `packages/db/src/mantenimiento.ts`
- Test: `packages/db/src/mantenimiento.test.ts`
- Modify: `packages/db/package.json` (export `./mantenimiento`)
- Create: `packages/queue/src/mantenimiento.ts`
- Test: `packages/queue/src/mantenimiento.test.ts`
- Modify: `packages/queue/package.json` (export `./mantenimiento`)
- Create: `apps/worker/src/mantenimiento/procesar.ts`
- Test: `apps/worker/src/mantenimiento/procesar.test.ts`
- Modify: `apps/worker/src/index.ts`

**Interfaces:**
- Consumes: `auditLog` y `tutorPreguntas` (`@syntaxerror/db/schema`), y `conexionWorker` (`@syntaxerror/queue/conexion`).
- Produces en `@syntaxerror/db/mantenimiento`:
  - `ACCIONES_ARCO = ["data_exported", "account_deleted"]`;
  - `purgarBitacora(db, antesDe: Date): Promise<number>`, que nunca borra acciones ARCO;
  - `purgarPreguntasTutor(db, antesDe: Date): Promise<number>`.
- Produces en `@syntaxerror/queue/mantenimiento`:
  - `COLA_MANTENIMIENTO = "mantenimiento"`, `PROGRAMADOR_LIMPIEZA = "limpieza-diaria"` y `UN_DIA_MS`;
  - `programarMantenimiento(url, { nombre?, cadaMs? }): Promise<void>`. Es idempotente: siempre deja un solo programador.
- Produces en el worker:
  - `RETENCION_POR_DEFECTO = 365` y `RETENCION_MINIMA = 30`;
  - `leerRetencion(valor: string | undefined): number`;
  - `crearProcesadorMantenimiento({ db, retencionDias, ahora? })`, que devuelve `() => Promise<{ bitacora: number; preguntas: number }>`.
- Variable de entorno: `RETENCION_BITACORA_DIAS` (opcional, 365 por defecto).

- [ ] **Step 1: Escribir los tests que fallan**

`packages/db/src/mantenimiento.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { purgarBitacora, purgarPreguntasTutor } from "./mantenimiento";
import { auditLog, casos, tutorPreguntas, users } from "./schema";
import { createTestDb, truncateAll } from "./testing";

const { db, close } = createTestDb();
const CORTE = new Date("2026-01-01T00:00:00Z");
const antes = new Date("2025-06-01T00:00:00Z");
const despues = new Date("2026-06-01T00:00:00Z");

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("mantenimiento", () => {
  it("borra la bitácora anterior al corte, pero nunca los registros ARCO", async () => {
    await db.insert(auditLog).values([
      { action: "login_success", createdAt: antes },
      { action: "role_changed", createdAt: antes },
      { action: "data_exported", createdAt: antes },
      { action: "account_deleted", createdAt: antes },
      { action: "login_success", createdAt: despues },
    ]);
    expect(await purgarBitacora(db, CORTE)).toBe(2);
    expect((await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action).sort()).toEqual([
      "account_deleted",
      "data_exported",
      "login_success",
    ]);
  });

  it("borra las preguntas al tutor anteriores al corte", async () => {
    const [ana] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    const [caso] = await db.insert(casos).values({ slug: "ventas", titulo: "Ventas", cargo: "A", empresa: "D", entregable: "R", misiones: [] }).returning({ id: casos.id });
    await db.insert(tutorPreguntas).values([
      { userId: ana.id, casoId: caso.id, mision: "m1", pregunta: "¿Vieja?", estado: "respondida", creadoEn: antes },
      { userId: ana.id, casoId: caso.id, mision: "m1", pregunta: "¿Nueva?", estado: "respondida", creadoEn: despues },
    ]);
    expect(await purgarPreguntasTutor(db, CORTE)).toBe(1);
    expect((await db.select({ pregunta: tutorPreguntas.pregunta }).from(tutorPreguntas)).map((fila) => fila.pregunta)).toEqual(["¿Nueva?"]);
  });
});
```

`packages/queue/src/mantenimiento.test.ts`:
```ts
import { Queue } from "bullmq";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { conexionWorker } from "./conexion";
import { PROGRAMADOR_LIMPIEZA, programarMantenimiento } from "./mantenimiento";

const url = process.env.REDIS_URL ?? "redis://redis:6379";
const nombre = `mantenimiento-test-${process.pid}`;
const inspector = new Queue(nombre, { connection: conexionWorker(url) });

afterEach(() => inspector.obliterate({ force: true }));
afterAll(() => inspector.close());

describe("programarMantenimiento", () => {
  it("deja un solo programador diario aunque se llame en cada arranque", async () => {
    await programarMantenimiento(url, { nombre });
    await programarMantenimiento(url, { nombre });
    await programarMantenimiento(url, { nombre, cadaMs: 3_600_000 });
    const programadores = await inspector.getJobSchedulers();
    expect(programadores).toHaveLength(1);
    expect(programadores[0]).toMatchObject({ key: PROGRAMADOR_LIMPIEZA, every: 3_600_000 });
  });
});
```

`apps/worker/src/mantenimiento/procesar.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { crearProcesadorMantenimiento, leerRetencion } from "./procesar";

const { db, close } = createTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("mantenimiento del worker", () => {
  it("lee la retención con un mínimo de 30 días y 365 por defecto", () => {
    expect(leerRetencion(undefined)).toBe(365);
    expect(leerRetencion("")).toBe(365);
    expect(leerRetencion("abc")).toBe(365);
    expect(leerRetencion("0")).toBe(365);
    expect(leerRetencion("-1")).toBe(365);
    expect(leerRetencion("1.5")).toBe(365);
    expect(leerRetencion("5")).toBe(30);
    expect(leerRetencion("90")).toBe(90);
  });

  it("borra lo anterior a la retención contando desde ahora", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const ahora = new Date("2026-09-30T00:00:00Z");
    await db.insert(auditLog).values([
      { action: "login_success", createdAt: new Date("2026-06-01T00:00:00Z") },
      { action: "login_success", createdAt: new Date("2026-09-01T00:00:00Z") },
    ]);
    const limpiar = crearProcesadorMantenimiento({ db, retencionDias: 90, ahora: () => ahora });
    expect(await limpiar()).toEqual({ bitacora: 1, preguntas: 0 });
    expect(await db.select().from(auditLog)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/db test; pnpm --filter @syntaxerror/queue test; pnpm --filter worker test"`
Expected: FAIL en los tres, porque no se resuelven `./mantenimiento` ni `./procesar`.

- [ ] **Step 3: Crear `packages/db/src/mantenimiento.ts`**

```ts
import { and, lt, notInArray } from "drizzle-orm";
import type { DbClient } from "./client";
import { auditLog, tutorPreguntas } from "./schema";

// Registros de derechos ARCO: se conservan por obligación legal (spec, sección 10).
export const ACCIONES_ARCO = ["data_exported", "account_deleted"] as const;

export async function purgarBitacora(db: DbClient, antesDe: Date): Promise<number> {
  const borradas = await db
    .delete(auditLog)
    .where(and(lt(auditLog.createdAt, antesDe), notInArray(auditLog.action, [...ACCIONES_ARCO])))
    .returning({ id: auditLog.id });
  return borradas.length;
}

export async function purgarPreguntasTutor(db: DbClient, antesDe: Date): Promise<number> {
  const borradas = await db.delete(tutorPreguntas).where(lt(tutorPreguntas.creadoEn, antesDe)).returning({ id: tutorPreguntas.id });
  return borradas.length;
}
```

En `packages/db/package.json`, agregar a `exports`:
```json
"./mantenimiento": "./src/mantenimiento.ts"
```

- [ ] **Step 4: Crear `packages/queue/src/mantenimiento.ts`**

```ts
import { Queue } from "bullmq";
import { conexionWorker } from "./conexion";

export const COLA_MANTENIMIENTO = "mantenimiento";
export const PROGRAMADOR_LIMPIEZA = "limpieza-diaria";
export const UN_DIA_MS = 86_400_000;

// upsertJobScheduler reemplaza al programador con la misma clave: reiniciar el worker no lo duplica.
export async function programarMantenimiento(
  url: string,
  { nombre = COLA_MANTENIMIENTO, cadaMs = UN_DIA_MS }: { nombre?: string; cadaMs?: number } = {}
): Promise<void> {
  const cola = new Queue(nombre, { connection: conexionWorker(url) });
  try {
    await cola.upsertJobScheduler(PROGRAMADOR_LIMPIEZA, { every: cadaMs }, { name: PROGRAMADOR_LIMPIEZA, opts: { removeOnComplete: 30, removeOnFail: 30 } });
  } finally {
    await cola.close();
  }
}
```

En `packages/queue/package.json`, agregar a `exports`:
```json
"./mantenimiento": "./src/mantenimiento.ts"
```

- [ ] **Step 5: Crear `apps/worker/src/mantenimiento/procesar.ts`**

```ts
import type { DbClient } from "@syntaxerror/db/client";
import { purgarBitacora, purgarPreguntasTutor } from "@syntaxerror/db/mantenimiento";

export const RETENCION_POR_DEFECTO = 365;
export const RETENCION_MINIMA = 30;

// Un valor inválido nunca debe dejar la bitácora vacía: se usa 365, y nunca menos de 30 días.
export function leerRetencion(valor: string | undefined): number {
  const dias = Number(valor);
  if (!valor || !Number.isInteger(dias) || dias < 1) return RETENCION_POR_DEFECTO;
  return Math.max(dias, RETENCION_MINIMA);
}

export function crearProcesadorMantenimiento({ db, retencionDias, ahora = () => new Date() }: { db: DbClient; retencionDias: number; ahora?: () => Date }) {
  return async (): Promise<{ bitacora: number; preguntas: number }> => {
    const antesDe = new Date(ahora().getTime() - retencionDias * 86_400_000);
    const bitacora = await purgarBitacora(db, antesDe);
    const preguntas = await purgarPreguntasTutor(db, antesDe);
    console.log(`[mantenimiento] ${bitacora} registros de bitácora y ${preguntas} preguntas al tutor anteriores a ${antesDe.toISOString()}`);
    return { bitacora, preguntas };
  };
}
```

- [ ] **Step 6: Levantar el worker de mantenimiento en `apps/worker/src/index.ts`**

Agregar a los imports:
```ts
import { COLA_MANTENIMIENTO, programarMantenimiento } from "@syntaxerror/queue/mantenimiento";
import { crearProcesadorMantenimiento, leerRetencion } from "./mantenimiento/procesar";
```

Después del bloque del worker de `avisos`, agregar:
```ts
const retencionDias = leerRetencion(process.env.RETENCION_BITACORA_DIAS);
const mantenimiento = new Worker(COLA_MANTENIMIENTO, crearProcesadorMantenimiento({ db: getDb(), retencionDias }), {
  connection: conexionWorker(redisUrl),
});
mantenimiento.on("failed", (_job, error) => {
  console.error(`[mantenimiento] falló la limpieza: ${error.message}`);
});
mantenimiento.on("error", (error) => {
  console.error(`[mantenimiento] error de worker: ${error.message}`);
});
void programarMantenimiento(redisUrl).catch((error: unknown) => {
  console.error("[mantenimiento] no se pudo programar la limpieza diaria", error);
});
```

En `shutdown`, después de `await avisos.close();`, agregar:
```ts
  await mantenimiento.close();
```

- [ ] **Step 7: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && for p in apps/worker packages/queue packages/db; do (cd \$p && pnpm exec tsc --noEmit -p .) || exit 1; done"`
Expected:
- PASS: `db` suma 2 tests, `queue` 1 y `worker` 2;
- `tsc` sin errores.

- [ ] **Step 8: Commit**

```bash
git add packages/db/src/mantenimiento.ts packages/db/src/mantenimiento.test.ts packages/db/package.json packages/queue/src/mantenimiento.ts packages/queue/src/mantenimiento.test.ts packages/queue/package.json apps/worker/src/mantenimiento apps/worker/src/index.ts
git commit -m "feat(plataforma): limpieza diaria de bitacora y preguntas al tutor, sin tocar registros arco

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: robots, sitemap, ícono e imagen para redes

**Files:**
- Create: `apps/web/src/lib/seo-rutas.ts`
- Test: `apps/web/src/lib/seo-rutas.test.ts`
- Create: `apps/web/src/app/robots.ts`, `apps/web/src/app/sitemap.ts`
- Create (copiados de la v1): `apps/web/src/app/icon.svg`, `apps/web/public/images/data-learning-hero.png`

**Interfaces:**
- Consumes: `siteConfig` (`@/lib/seo`), `rutasParaPublicar()` y `casosParaPublicar()`.
- Produces en `@/lib/seo-rutas`:
  - `RUTAS_PRIVADAS: string[]`;
  - `reglasRobots(): MetadataRoute.Robots`;
  - `entradasSitemap(rutas: Ruta[], casos: Caso[], ahora?: Date): MetadataRoute.Sitemap`.
- Produces las URLs `/robots.txt`, `/sitemap.xml`, `/icon.svg` e `/images/data-learning-hero.png`.
- El sitemap incluye:
  - la portada, `/rutas`, `/buscar`, `/privacidad` y `/terminos`;
  - las rutas, casos y misiones publicadas.
- No incluye portafolios (son opcionales y personales) ni certificados.

- [ ] **Step 1: Escribir el test que falla, `apps/web/src/lib/seo-rutas.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import type { Caso, Ruta } from "@syntaxerror/content/tipos";
import { entradasSitemap, reglasRobots } from "./seo-rutas";

const RUTA = { slug: "data-analyst", titulo: "Data Analyst", cargo: "A", descripcion: "D", estado: "publicada", casos: ["ventas"] } as Ruta;
const CASO = { slug: "ventas", titulo: "Ventas", misiones: [{ slug: "01-clientes" }, { slug: "02-total" }] } as unknown as Caso;

describe("SEO", () => {
  it("robots deja fuera las páginas privadas y apunta al sitemap", () => {
    const robots = reglasRobots();
    const reglas = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    expect(reglas.disallow).toEqual(expect.arrayContaining(["/admin", "/api", "/dashboard", "/perfil", "/profesor", "/login", "/registro", "/monitoring"]));
    expect(robots.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it("el sitemap lista las páginas públicas, las rutas, los casos y las misiones", () => {
    const urls = entradasSitemap([RUTA], [CASO], new Date("2026-09-30T00:00:00Z")).map((entrada) => new URL(entrada.url).pathname);
    expect(urls).toEqual([
      "/",
      "/rutas",
      "/buscar",
      "/privacidad",
      "/terminos",
      "/rutas/data-analyst",
      "/casos/ventas",
      "/casos/ventas/01-clientes",
      "/casos/ventas/02-total",
    ]);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/seo-rutas.test.ts`
Expected: FAIL, porque no se puede resolver `./seo-rutas`.

- [ ] **Step 3: Crear `apps/web/src/lib/seo-rutas.ts`**

```ts
import type { MetadataRoute } from "next";
import type { Caso, Ruta } from "@syntaxerror/content/tipos";
import { siteConfig } from "./seo";

export const RUTAS_PRIVADAS = [
  "/admin",
  "/api",
  "/dashboard",
  "/perfil",
  "/profesor",
  "/login",
  "/registro",
  "/reportar",
  "/recuperar-clave",
  "/restablecer-clave",
  "/confirmar-email",
  "/verificar-email",
  "/monitoring",
];

const PUBLICAS = ["/", "/rutas", "/buscar", "/privacidad", "/terminos"];

export function reglasRobots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: RUTAS_PRIVADAS },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}

export function entradasSitemap(rutas: Ruta[], casos: Caso[], ahora = new Date()): MetadataRoute.Sitemap {
  const entrada = (ruta: string, prioridad: number): MetadataRoute.Sitemap[number] => ({
    url: ruta === "/" ? `${siteConfig.url}/` : `${siteConfig.url}${ruta}`,
    lastModified: ahora,
    changeFrequency: "weekly",
    priority: prioridad,
  });
  return [
    ...PUBLICAS.map((ruta) => entrada(ruta, ruta === "/" ? 1 : 0.7)),
    ...rutas.map((ruta) => entrada(`/rutas/${ruta.slug}`, 0.9)),
    ...casos.flatMap((caso) => [entrada(`/casos/${caso.slug}`, 0.9), ...caso.misiones.map((mision) => entrada(`/casos/${caso.slug}/${mision.slug}`, 0.6))]),
  ];
}
```

- [ ] **Step 4: Crear `apps/web/src/app/robots.ts` y `apps/web/src/app/sitemap.ts`**

`apps/web/src/app/robots.ts`:
```ts
import type { MetadataRoute } from "next";
import { reglasRobots } from "@/lib/seo-rutas";

export default function robots(): MetadataRoute.Robots {
  return reglasRobots();
}
```

`apps/web/src/app/sitemap.ts`:
```ts
import type { MetadataRoute } from "next";
import { casosParaPublicar, rutasParaPublicar } from "@/lib/contenido";
import { entradasSitemap } from "@/lib/seo-rutas";

// Sale del contenido publicado (no de la base), así que se genera en el build.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return entradasSitemap(await rutasParaPublicar(), await casosParaPublicar());
}
```

- [ ] **Step 5: Copiar el ícono y la imagen para redes desde la v1**

```bash
mkdir -p apps/web/public/images
cp ../cursos/apps/web/src/app/icon.svg apps/web/src/app/icon.svg
cp ../cursos/apps/web/public/images/data-learning-hero.png apps/web/public/images/data-learning-hero.png
```

Son archivos, no código: se copian en el host (el repo de la v1 está en `../cursos`). `siteConfig.image` ya apunta a `/images/data-learning-hero.png`, así que las vistas previas en redes dejan de mostrar una imagen rota. En la Fase 4 se puede reemplazar por una captura de la v2.

- [ ] **Step 6: Correr los tests y comprobar las URLs**

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec vitest run src/lib/seo-rutas.test.ts && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS (2 tests) y `tsc` sin errores.

Run: `docker compose up -d --build && for p in /robots.txt /sitemap.xml /icon.svg /images/data-learning-hero.png; do echo "$p $(curl -s -o /dev/null -w '%{http_code}' localhost:3000$p)"; done && curl -s localhost:3000/robots.txt | grep -c Disallow`
Expected:
- las cuatro URLs responden `200`;
- `robots.txt` tiene 13 líneas `Disallow`;
- `sitemap.xml` incluye `/casos/demo-motor/01-clientes-de-regiones`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/seo-rutas.ts apps/web/src/lib/seo-rutas.test.ts apps/web/src/app/robots.ts apps/web/src/app/sitemap.ts apps/web/src/app/icon.svg apps/web/public/images/data-learning-hero.png
git commit -m "feat(plataforma): robots, sitemap, icono e imagen para redes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Monitoreo de errores con Sentry

**Files:**
- Modify: `apps/web/package.json`, `apps/worker/package.json`, `pnpm-lock.yaml` (con `pnpm add`)
- Create: `apps/web/src/lib/monitoreo.ts`, `apps/worker/src/monitoreo.ts`
- Test: `apps/web/src/lib/monitoreo.test.ts`, `apps/worker/src/monitoreo.test.ts`
- Create: `apps/web/sentry.server.config.ts`, `apps/web/sentry.edge.config.ts`, `apps/web/src/instrumentation.ts`, `apps/web/src/instrumentation-client.ts`
- Modify: `apps/web/next.config.ts`, `apps/web/src/app/global-error.tsx`, `apps/worker/src/index.ts`

**Interfaces:**
- Produces en `@/lib/monitoreo` (web) y en `apps/worker/src/monitoreo.ts`:
  - `MUESTREO_TRAZAS = 0.1`;
  - `opcionesSentry(dsn: string | undefined): { dsn: string | undefined; enabled: boolean; tracesSampleRate: number; sendDefaultPii: false }`.
- Produces en el worker:
  - `iniciarMonitoreo(dsn?: string): boolean` (`false` si no hay DSN);
  - `reportarError(error, etiquetas: Record<string, string>)`.
- Variables de entorno:
  - `NEXT_PUBLIC_SENTRY_DSN` (web);
  - `SENTRY_DSN` (worker);
  - opcionales, para subir sourcemaps en el build: `SENTRY_ORG`, `SENTRY_PROJECT` y `SENTRY_AUTH_TOKEN`.
- Produces el túnel `/monitoring`: los errores del navegador viajan por el mismo dominio y la CSP (`connect-src 'self'`) no cambia.

- [ ] **Step 1: Instalar las dependencias**

Run: `docker compose run --rm tools sh -c "pnpm --filter web add @sentry/nextjs@^10.64.0 && pnpm --filter worker add @sentry/node@^10.64.0"`
Expected: se actualizan `apps/web/package.json`, `apps/worker/package.json` y `pnpm-lock.yaml`.

- [ ] **Step 2: Escribir los tests que fallan**

`apps/web/src/lib/monitoreo.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { opcionesSentry } from "./monitoreo";

describe("opcionesSentry", () => {
  it("sin DSN queda apagado", () => {
    expect(opcionesSentry(undefined)).toEqual({ dsn: undefined, enabled: false, tracesSampleRate: 0.1, sendDefaultPii: false });
    expect(opcionesSentry("   ").enabled).toBe(false);
  });

  it("con DSN se enciende con muestreo bajo y sin datos personales", () => {
    expect(opcionesSentry(" https://clave@o1.ingest.sentry.io/2 ")).toEqual({
      dsn: "https://clave@o1.ingest.sentry.io/2",
      enabled: true,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
  });
});
```

`apps/worker/src/monitoreo.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { iniciarMonitoreo, opcionesSentry, reportarError } from "./monitoreo";

describe("monitoreo del worker", () => {
  it("sin DSN no se inicia y reportar un error no falla", () => {
    expect(opcionesSentry(undefined).enabled).toBe(false);
    expect(iniciarMonitoreo(undefined)).toBe(false);
    expect(() => reportarError(new Error("prueba"), { cola: "emails" })).not.toThrow();
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec vitest run src/lib/monitoreo.test.ts; pnpm --filter worker exec vitest run src/monitoreo.test.ts"`
Expected: FAIL, porque no se resuelve `./monitoreo`.

- [ ] **Step 4: Crear los módulos de monitoreo**

`apps/web/src/lib/monitoreo.ts`:
```ts
export const MUESTREO_TRAZAS = 0.1;

// Sin DSN (local, tests) Sentry queda apagado. Nunca envía IP ni cookies.
export function opcionesSentry(dsn: string | undefined) {
  const limpio = dsn?.trim() || undefined;
  return { dsn: limpio, enabled: Boolean(limpio), tracesSampleRate: MUESTREO_TRAZAS, sendDefaultPii: false as const };
}
```

`apps/worker/src/monitoreo.ts`:
```ts
import * as Sentry from "@sentry/node";

export const MUESTREO_TRAZAS = 0.1;

export function opcionesSentry(dsn: string | undefined) {
  const limpio = dsn?.trim() || undefined;
  return { dsn: limpio, enabled: Boolean(limpio), tracesSampleRate: MUESTREO_TRAZAS, sendDefaultPii: false as const };
}

export function iniciarMonitoreo(dsn: string | undefined = process.env.SENTRY_DSN): boolean {
  const opciones = opcionesSentry(dsn);
  if (!opciones.enabled) return false;
  Sentry.init(opciones);
  return true;
}

// Sin Sentry iniciado, captureException no hace nada.
export function reportarError(error: unknown, etiquetas: Record<string, string>): void {
  Sentry.captureException(error, { tags: etiquetas });
}
```

- [ ] **Step 5: Correr los tests**

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec vitest run src/lib/monitoreo.test.ts && pnpm --filter worker exec vitest run src/monitoreo.test.ts"`
Expected: PASS (3 tests).

- [ ] **Step 6: Conectar Sentry en la web**

`apps/web/sentry.server.config.ts`:
```ts
import * as Sentry from "@sentry/nextjs";
import { opcionesSentry } from "./src/lib/monitoreo";

Sentry.init(opcionesSentry(process.env.NEXT_PUBLIC_SENTRY_DSN));
```

`apps/web/sentry.edge.config.ts`:
```ts
import * as Sentry from "@sentry/nextjs";
import { opcionesSentry } from "./src/lib/monitoreo";

Sentry.init(opcionesSentry(process.env.NEXT_PUBLIC_SENTRY_DSN));
```

`apps/web/src/instrumentation.ts`:
```ts
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("../sentry.edge.config");
}

export const onRequestError = Sentry.captureRequestError;
```

`apps/web/src/instrumentation-client.ts`:
```ts
import * as Sentry from "@sentry/nextjs";
import { opcionesSentry } from "@/lib/monitoreo";

Sentry.init(opcionesSentry(process.env.NEXT_PUBLIC_SENTRY_DSN));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
```

En `apps/web/next.config.ts`:
- agregar `import { withSentryConfig } from "@sentry/nextjs";`;
- reemplazar `export default nextConfig;` por:
```ts
// Los errores del navegador viajan por /monitoring (mismo dominio): la CSP sigue con connect-src 'self'.
// Sin SENTRY_AUTH_TOKEN no se suben sourcemaps y el build no falla.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  tunnelRoute: "/monitoring",
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
```

Reemplazar `apps/web/src/app/global-error.tsx` por:
```tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui", padding: "3rem", background: "#0a0a0a", color: "#fafafa" }}>
        <h1>syntaxError: algo se rompió</h1>
        <p>Recarga la página. Si el problema sigue, vuelve a intentarlo en unos minutos.</p>
        <button type="button" onClick={() => reset()}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Conectar Sentry en el worker, `apps/worker/src/index.ts`**

Agregar a los imports:
```ts
import { iniciarMonitoreo, reportarError } from "./monitoreo";
```

Como primera línea de código, antes de `const port = ...`, agregar:
```ts
const monitoreo = iniciarMonitoreo();
```

En `emails.on("failed", ...)`, al final del callback, agregar:
```ts
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) reportarError(error, { cola: "emails", tipo: job.name });
```

En `tutor?.on("failed", ...)`, dentro del `if (job && job.attemptsMade >= ...)`, agregar:
```ts
    reportarError(error, { cola: "tutor" });
```

En `mantenimiento.on("failed", ...)`, agregar:
```ts
  reportarError(error, { cola: "mantenimiento" });
```

En el `console.log` de `httpServer.listen`, agregar `${monitoreo ? " · con Sentry" : ""}` al final del texto.

- [ ] **Step 8: Correr los tests, el typecheck, el build y los e2e**

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && (cd apps/worker && pnpm exec tsc --noEmit -p .) && cd apps/web && pnpm exec tsc --noEmit -p . && pnpm build"`
Expected:
- PASS y `tsc` sin errores;
- el build termina sin DSN ni token, sin errores de Sentry;
- `/casos/[caso]/[mision]` y `/buscar` siguen estáticas.

Run: `docker compose down && npm run test:e2e:prod`
Expected: todos los e2e pasan contra el build de producción, con Sentry instalado y apagado. La CSP no bloquea nada.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml down`

- [ ] **Step 9: Commit**

```bash
git add apps/web/package.json apps/worker/package.json pnpm-lock.yaml apps/web/src/lib/monitoreo.ts apps/web/src/lib/monitoreo.test.ts apps/worker/src/monitoreo.ts apps/worker/src/monitoreo.test.ts apps/web/sentry.server.config.ts apps/web/sentry.edge.config.ts apps/web/src/instrumentation.ts apps/web/src/instrumentation-client.ts apps/web/next.config.ts apps/web/src/app/global-error.tsx apps/worker/src/index.ts
git commit -m "feat(plataforma): monitoreo de errores con sentry, apagado sin dsn

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: E2E de la plataforma y README

**Files:**
- Create: `e2e/tests/plataforma.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces 3 e2e: el buscador, continuar donde quedé, y robots con sitemap.

- [ ] **Step 1: Escribir `e2e/tests/plataforma.spec.ts`**

```ts
import { expect, test } from "./fixtures";

test("el buscador encuentra una misión sin importar tildes ni mayúsculas", async ({ page }) => {
  await page.goto("/buscar?q=zzzqqq");
  await expect(page.getByText("No encontramos resultados para «zzzqqq».")).toBeVisible();
  await page.getByLabel("Busca rutas, casos, misiones o conceptos").fill("CLIENTES de REGIÓNES");
  await page.getByRole("link", { name: /Clientes de regiones/ }).click();
  await expect(page).toHaveURL(/\/casos\/demo-motor\/01-clientes-de-regiones$/);
});

test("el panel lleva a la siguiente misión pendiente", async ({ page }) => {
  await page.goto("/registro");
  await page.locator('input[name="name"]').fill("Antonia Vidal");
  await page.locator('input[name="email"]').fill(`continuar-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("link", { name: "Continuar misión" })).toHaveCount(0);

  await page.goto("/casos/demo-motor/01-clientes-de-regiones");
  await page.getByLabel("Consulta SQL").fill("SELECT nombre, ciudad FROM clientes WHERE ciudad <> 'Santiago';");
  const reportado = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await reportado;

  await page.goto("/dashboard");
  const continuar = page.getByRole("link", { name: "Continuar misión" });
  await expect(continuar).toHaveAttribute("href", "/casos/demo-motor/02-total-de-ventas");
});

test("robots y sitemap están publicados", async ({ page }) => {
  const robots = await (await page.request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toContain("Sitemap:");
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/casos/demo-motor/01-clientes-de-regiones");
});
```

- [ ] **Step 2: Documentar en `README.md`**

Agregar al final:
~~~markdown
## Plataforma

- **Buscador:** `/buscar` busca rutas, casos y misiones publicadas en el encargo, los conceptos y los enunciados, sin distinguir mayúsculas ni tildes. El índice se arma en el build desde `content/` y nunca incluye soluciones, pruebas ni el cierre de las misiones.
- **Continuar donde quedé:** el panel lleva a la misión en curso más reciente o a la siguiente pendiente. Si el caso solo necesita el entregable, lleva a la página del caso.
- **Limpieza diaria (worker, cola `mantenimiento`):** borra la bitácora y las preguntas al tutor con más de `RETENCION_BITACORA_DIAS` días (365 por defecto, mínimo 30). Los registros de derechos ARCO no se borran.
- **SEO:** `robots.txt` deja fuera las páginas privadas y `sitemap.xml` lista el contenido publicado.
- **Sentry:**
  - Se enciende con `NEXT_PUBLIC_SENTRY_DSN` (web) y `SENTRY_DSN` (worker); sin ellas queda apagado.
  - Muestrea el 10 % de las trazas y no envía datos personales.
  - Para subir sourcemaps en el build, define `SENTRY_ORG`, `SENTRY_PROJECT` y `SENTRY_AUTH_TOKEN`.
~~~

- [ ] **Step 3: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes.

Run: `docker compose up -d --build && npm run test:e2e`
Expected: `24 passed` (los 21 anteriores y los 3 de plataforma).

Run: `docker compose down && npm run test:e2e:prod`
Expected: `24 passed` contra el build de producción.

Run: `for p in /buscar /casos/demo-motor /casos/demo-motor/01-clientes-de-regiones; do curl -s -o /dev/null localhost:3000$p; curl -s -D - -o /dev/null localhost:3000$p | grep -i x-nextjs-cache; done`
Expected: `x-nextjs-cache: HIT` tres veces.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml down`

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/plataforma.spec.ts README.md
git commit -m "test(e2e): buscador, continuar donde quede, robots y sitemap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué queda después

- **Fase 4 (contenido):** los 5 casos de Data Analyst. Con esta fase, la plataforma no necesita cambios para recibirlos: un caso nuevo se escribe en `content/`.
- **Fase 5 (lanzamiento):**
  - la migración desde la v1;
  - las imágenes Docker de producción (deben copiar `public/`);
  - el deploy en Railway, con las variables de Sentry y `RETENCION_BITACORA_DIAS`;
  - la verificación de los criterios de éxito.
