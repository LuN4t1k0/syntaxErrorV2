# Fase 7e: El carrusel de la portada. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Traer el carrusel de la portada de la v1, adaptado a la v2. El texto actual de la portada queda fijo a la izquierda y a la derecha rotan tres maquetas animadas de la ruta Data Analyst. En el teléfono, el carrusel va debajo del texto.

**Architecture:**
- **Las láminas** (decisión del 2026-10-05). La v1 tenía una lámina por ruta (datos, ciberseguridad e IA aplicada), pero en la v2 solo existe Data Analyst. Por eso las tres maquetas son tres momentos de esa ruta, con datos que calzan entre sí:
  1. **`terminal`** (Caso 0): `git init`, `add`, `commit` y `push` del primer repositorio. Reemplaza la terminal de seguridad de la v1.
  2. **`ventas.sql`** (Minimarkets del Sur): un JOIN con GROUP BY por ciudad, su resultado (Temuco 1.284.500, Valdivia 968.200 y Osorno 731.900) y "¡Tarea aprobada!".
  3. **`asistente`** (clases de IA para datos): la IA resume esas mismas ventas (total $2.984.600; Temuco el 43 %; Valdivia y Osorno el 57 %), y una revisión antes de enviar marca qué falta: "¿Dice de dónde salen los datos? ✗ Pide la fuente". Es la idea del curso: usar la IA sin perder el criterio.
- **Son dibujos** (`aria-hidden`): nada se ejecuta. La base común (`ventana-maqueta.tsx`) dibuja la ventana con la barra de tres puntos y la columna lateral, que solo se ve desde pantallas medianas. También trae `useEscritura`, que muestra las piezas de a una.
- **Los temas:** la consulta usa los colores de las consolas (`tok-keyword`, `tok-propertyName` y `tok-definition`), con contraste AA en los dos temas. Los ✓ y ✗ son íconos y no caracteres, porque en los teléfonos esos caracteres salen como emoji y pierden el color.
- **El carrusel** (`carrusel-portada.tsx`):
  - rota cada 7 s y se pausa con el mouse o el foco encima;
  - se elige la lámina con tres botones (`aria-pressed`), y la etiqueta y la descripción se anuncian (`aria-live`);
  - con "reducir movimiento" no rota ni escribe: cada maqueta aparece completa.
- **La portada:** la sección del encabezado pasa a dos columnas en pantallas grandes, y el título baja a `sm:text-5xl xl:text-6xl` para caber en su columna. El texto, los botones y las tarjetas de abajo no cambian.

**Tech Stack:** Next 15, React 19, Tailwind 4 y Playwright 1.55.

**Spec:** decisión del 2026-10-03 de traer las funciones de la v1. Láminas y portada, decisión del 2026-10-05.

## Global Constraints

- **Plataformas:** debe funcionar en un teléfono (360 px, sin scroll horizontal) y en los temas claro y oscuro.
- **Entorno:** todo se ejecuta con `docker compose run --rm tools ...`. El paquete de la app se llama `web`.
- **Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **"Reducir movimiento":** sin rotación ni escritura. Probado en `portada.spec.ts`, que espera 7,5 s y la lámina no cambia.
2. **Un teléfono de 360 px:** el carrusel va bajo el título y no desborda. Probado en `portada.spec.ts`.
3. **Los botones del carrusel** dicen cuál está activo (`aria-pressed`). Probado en `portada.spec.ts`.

---

### Task 1: El carrusel en la portada

**Files:**
- Create: `apps/web/src/components/portada/ventana-maqueta.tsx`, `maqueta-git.tsx`, `maqueta-sql.tsx`, `maqueta-ia.tsx` y `carrusel-portada.tsx`
- Modify: `apps/web/src/app/(marketing)/page.tsx`, `apps/web/src/app/globals.css`, `README.md`
- Test: `e2e/tests/portada.spec.ts`

**Interfaces:**
- Produces:
  - `<CarruselPortada />`;
  - `useEscritura(total, intervaloMs)`, `<VentanaMaqueta archivo lateral>` y `<Cursor listo>`;
  - la animación `aparecer` en `globals.css`.

- [ ] **Step 1: Escribir la prueba**

`e2e/tests/portada.spec.ts`:
```ts
import { expect, test } from "./fixtures";

test("la portada muestra el carrusel de la v1 junto a su texto y se elige la lámina con los botones", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Aprende resolviendo casos reales");
  const carrusel = page.getByRole("region", { name: "Así se aprende en syntaxError.cl" });
  // Con "reducir movimiento" no hay escritura animada: la maqueta aparece completa.
  await expect(carrusel.getByText("Caso 0 · git y GitHub")).toBeVisible();
  await expect(carrusel.getByText("git push -u origin main")).toBeVisible();
  await expect(carrusel.getByRole("button", { name: "Ver: Caso 0 · git y GitHub" })).toHaveAttribute("aria-pressed", "true");

  await carrusel.getByRole("button", { name: "Ver: SQL · Minimarkets del Sur" }).click();
  await expect(carrusel.getByText("Ventas por ciudad")).toBeVisible();
  await expect(carrusel.getByText("✔ ¡Tarea aprobada!")).toBeVisible();

  await carrusel.getByRole("button", { name: "Ver: IA para datos" }).click();
  await expect(carrusel.getByText("¿Dice de dónde salen los datos?")).toBeVisible();
  await expect(carrusel.getByText("Pide la fuente.")).toBeVisible();
  // Con "reducir movimiento" tampoco rota sola.
  await page.waitForTimeout(7_500);
  await expect(carrusel.getByText("Pide la fuente.")).toBeVisible();

  await carrusel.getByRole("link", { name: "Ver la ruta Data Analyst →" }).click();
  await expect(page).toHaveURL(/\/rutas\/data-analyst$/);
});

test("en un teléfono, el carrusel va bajo el texto y no desborda la página", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  const titulo = await page.getByRole("heading", { level: 1 }).boundingBox();
  const carrusel = await page.getByRole("region", { name: "Así se aprende en syntaxError.cl" }).boundingBox();
  expect(carrusel!.y).toBeGreaterThan(titulo!.y + titulo!.height);
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run test:e2e -- tests/portada.spec.ts`
Expected: `2 failed`. No existe el carrusel.

- [ ] **Step 3: La base de las maquetas**

`apps/web/src/components/portada/ventana-maqueta.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";

// Muestra `total` piezas de a una, como si se escribieran. Con "reducir movimiento", todo aparece de inmediato.
export function useEscritura(total: number, intervaloMs: number): number {
  const [visibles, setVisibles] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibles(total);
      return;
    }
    const id = window.setInterval(() => {
      setVisibles((actual) => {
        if (actual >= total) window.clearInterval(id);
        return Math.min(actual + 1, total);
      });
    }, intervaloMs);
    return () => window.clearInterval(id);
  }, [total, intervaloMs]);
  return visibles;
}

// La ventana de las maquetas de la portada: una barra con tres puntos y el nombre del archivo, y una columna lateral
// que solo se ve desde pantallas medianas. Son dibujos: nada se ejecuta.
export function VentanaMaqueta({ archivo, lateral, children }: { archivo: string; lateral: { titulo: string; items: string[]; activo: number }; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-2xl" aria-hidden="true">
      <div className="flex h-11 items-center gap-2 border-b border-border px-4">
        <span className="size-2.5 rounded-full bg-destructive" />
        <span className="size-2.5 rounded-full bg-warning" />
        <span className="size-2.5 rounded-full bg-success" />
        <span className="ml-3 font-mono text-xs text-muted-foreground">{archivo}</span>
      </div>
      <div className="grid min-h-[24rem] md:grid-cols-[11rem_1fr]">
        <div className="hidden border-r border-border bg-background p-4 md:block">
          <p className="text-xs font-black uppercase text-muted-foreground">{lateral.titulo}</p>
          {lateral.items.map((item, indice) => (
            <p
              key={item}
              className={`mt-2 rounded-md px-2 py-2 text-xs font-bold ${indice === lateral.activo ? "bg-primary/15 text-primary" : indice < lateral.activo ? "text-foreground" : "text-muted-foreground"}`}
            >
              {indice < lateral.activo ? "✔ " : indice === lateral.activo ? "▸ " : "· "}
              {item}
            </p>
          ))}
        </div>
        <div className="min-w-0 p-5">{children}</div>
      </div>
    </div>
  );
}

export function Cursor({ listo }: { listo: boolean }) {
  return <span className={`text-primary ${listo ? "motion-safe:animate-pulse" : ""}`}>_</span>;
}
```

- [ ] **Step 4: Las tres maquetas**

`apps/web/src/components/portada/maqueta-git.tsx`:
```tsx
"use client";

import { Cursor, useEscritura, VentanaMaqueta } from "./ventana-maqueta";

// Caso 0: el primer repositorio, del git init al push.
const LINEAS: { texto: string; comando?: boolean }[] = [
  { texto: "git init portafolio", comando: true },
  { texto: "Initialized empty Git repository in ~/portafolio/.git/" },
  { texto: "git add README.md", comando: true },
  { texto: 'git commit -m "docs: mi primer README"', comando: true },
  { texto: "[main (root-commit) e763497] docs: mi primer README" },
  { texto: " 1 file changed, 12 insertions(+)" },
  { texto: "git push -u origin main", comando: true },
  { texto: " * [new branch]      main -> main" },
];

export function MaquetaGit() {
  const visibles = useEscritura(LINEAS.length + 1, 450);
  const listo = visibles > LINEAS.length;
  return (
    <VentanaMaqueta archivo="terminal" lateral={{ titulo: "Caso 0", items: ["Tu primer repositorio", "Archivos y commits", "Escribe un buen README", "Tu perfil de GitHub"], activo: 0 }}>
      <p className="font-mono text-xs font-bold uppercase text-primary">Herramientas del oficio</p>
      <p className="mt-1 font-black">Tu primer repositorio</p>
      <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-xs leading-6 sm:text-sm">
        {LINEAS.slice(0, visibles).map((linea, indice) => (
          <span key={indice} className="block">
            {linea.comando ? (
              <>
                <span className="text-primary">$ </span>
                <span className="text-foreground">{linea.texto}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{linea.texto}</span>
            )}
          </span>
        ))}
        <span className="text-primary">$ </span>
        <Cursor listo={listo} />
      </pre>
      <p className={`mt-4 font-mono text-sm font-bold transition-opacity duration-300 ${listo ? "opacity-100" : "opacity-0"}`}>✔ Misión aprobada: el repositorio está en GitHub.</p>
    </VentanaMaqueta>
  );
}
```

`apps/web/src/components/portada/maqueta-sql.tsx`:
```tsx
"use client";

import { Cursor, useEscritura, VentanaMaqueta } from "./ventana-maqueta";

// Minimarkets del Sur: ventas por ciudad con JOIN y GROUP BY. Los colores son los de las consolas (tok-*), con
// contraste en los dos temas.
const CONSULTA: { texto: string; clase?: string }[] = [
  { texto: "SELECT ", clase: "tok-keyword" },
  { texto: "l.ciudad, " },
  { texto: "SUM", clase: "tok-keyword" },
  { texto: "(v.monto) " },
  { texto: "AS ", clase: "tok-keyword" },
  { texto: "ventas", clase: "tok-definition" },
  { texto: "\nFROM ", clase: "tok-keyword" },
  { texto: "ventas ", clase: "tok-propertyName" },
  { texto: "v\n" },
  { texto: "JOIN ", clase: "tok-keyword" },
  { texto: "locales ", clase: "tok-propertyName" },
  { texto: "l " },
  { texto: "ON ", clase: "tok-keyword" },
  { texto: "v.local_id = l.id\n" },
  { texto: "GROUP BY ", clase: "tok-keyword" },
  { texto: "l.ciudad;" },
];
const FILAS = [
  ["Temuco", "1.284.500"],
  ["Valdivia", "968.200"],
  ["Osorno", "731.900"],
];

export function MaquetaSql() {
  const visibles = useEscritura(CONSULTA.length, 110);
  const listo = visibles >= CONSULTA.length;
  return (
    <VentanaMaqueta archivo="ventas.sql" lateral={{ titulo: "Clases de SQL", items: ["SELECT", "WHERE", "JOIN", "GROUP BY"], activo: 2 }}>
      <p className="font-mono text-xs font-bold uppercase text-primary">Minimarkets del Sur</p>
      <p className="mt-1 font-black">Ventas por ciudad</p>
      <pre className="mt-4 overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-xs leading-6 sm:text-sm">
        {CONSULTA.slice(0, visibles).map((pieza, indice) => (
          <span key={indice} className={pieza.clase}>
            {pieza.texto}
          </span>
        ))}
        <Cursor listo={listo} />
      </pre>
      <div className={`mt-4 grid grid-cols-2 overflow-hidden rounded-md border border-border text-sm transition-opacity duration-300 ${listo ? "opacity-100" : "opacity-0"}`}>
        <span className="border-b border-r border-border bg-surface-raised px-3 py-1.5 font-bold">ciudad</span>
        <span className="border-b border-border bg-surface-raised px-3 py-1.5 font-bold">ventas</span>
        {FILAS.map(([ciudad, ventas]) => [
          <span key={ciudad} className="border-b border-r border-border px-3 py-1.5 last:border-b-0">
            {ciudad}
          </span>,
          <span key={`${ciudad}-v`} className="border-b border-border px-3 py-1.5 font-mono">
            {ventas}
          </span>,
        ])}
      </div>
      <p className={`mt-3 font-mono text-sm font-bold transition-opacity duration-300 ${listo ? "opacity-100" : "opacity-0"}`}>✔ ¡Tarea aprobada!</p>
    </VentanaMaqueta>
  );
}
```

`apps/web/src/components/portada/maqueta-ia.tsx`:
```tsx
"use client";

import { Check, X } from "lucide-react";
import { Cursor, useEscritura, VentanaMaqueta } from "./ventana-maqueta";

// Clases de IA para datos: la IA resume las mismas ventas de Minimarkets y la persona revisa el resultado antes de
// enviarlo, que es la idea del curso: usar la IA sin perder el criterio.
const RESPUESTA = ["> Ventas de marzo: $2.984.600", "> Temuco lidera con el 43 %", "> Valdivia y Osorno suman el 57 %"];
const REVISION: [string, boolean][] = [
  ["¿Los números calzan con la tabla?", true],
  ["¿Dice de dónde salen los datos?", false],
];

export function MaquetaIa() {
  const visibles = useEscritura(RESPUESTA.length + REVISION.length, 700);
  return (
    <VentanaMaqueta archivo="asistente" lateral={{ titulo: "IA para datos", items: ["Calidad de datos", "SQL asistido por IA", "Explicar hallazgos", "Sesgos y errores en datos"], activo: 2 }}>
      <p className="font-mono text-xs font-bold uppercase text-primary">Explicar hallazgos</p>
      <p className="mt-3 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm">Resume estas ventas en 3 puntos para gerencia.</p>
      <div className="mt-3 grid gap-1 rounded-md border border-border bg-background p-4 font-mono text-xs leading-6 sm:text-sm">
        {RESPUESTA.slice(0, visibles).map((linea) => (
          <span key={linea}>{linea}</span>
        ))}
        {visibles < RESPUESTA.length ? <Cursor listo={false} /> : null}
      </div>
      <p className="mt-4 text-xs font-black uppercase text-muted-foreground">Revisa antes de enviar</p>
      <ul className="mt-2 grid gap-1.5 text-sm">
        {REVISION.slice(0, Math.max(visibles - RESPUESTA.length, 0)).map(([pregunta, bien]) => (
          <li key={pregunta} className="flex items-start gap-2">
            {/* Íconos y no ✔ ✖: en los teléfonos esos caracteres salen como emoji y pierden el color. */}
            {bien ? <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={3} /> : <X className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={3} />}
            <span>
              {pregunta}
              {bien ? null : <span className="font-bold"> Pide la fuente.</span>}
            </span>
          </li>
        ))}
      </ul>
    </VentanaMaqueta>
  );
}
```

- [ ] **Step 5: El carrusel y la portada**

`apps/web/src/components/portada/carrusel-portada.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MaquetaGit } from "./maqueta-git";
import { MaquetaIa } from "./maqueta-ia";
import { MaquetaSql } from "./maqueta-sql";

// El carrusel de la portada de la v1, con tres momentos de la ruta Data Analyst. El texto de la portada queda fijo;
// solo rota la maqueta. Se pausa con el mouse o el foco encima y no rota con "reducir movimiento".
const LAMINAS = [
  { id: "git", etiqueta: "Caso 0 · git y GitHub", descripcion: "Partes publicando tu primer repositorio: es tu portafolio desde el día uno.", Maqueta: MaquetaGit },
  { id: "sql", etiqueta: "SQL · Minimarkets del Sur", descripcion: "Respondes a gerencia con consultas que se validan al instante en tu navegador.", Maqueta: MaquetaSql },
  { id: "ia", etiqueta: "IA para datos", descripcion: "Usas la IA para avanzar más rápido, sin dejar de revisar lo que te entrega.", Maqueta: MaquetaIa },
] as const;

export const ROTACION_MS = 7000;

export function siguienteLamina(actual: number, total: number): number {
  return total <= 0 ? 0 : (actual + 1) % total;
}

export function CarruselPortada() {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndice((actual) => siguienteLamina(actual, LAMINAS.length)), ROTACION_MS);
    return () => window.clearInterval(id);
  }, [pausado, indice]);

  const lamina = LAMINAS[indice];
  return (
    <section
      aria-label="Así se aprende en syntaxError.cl"
      className="grid min-w-0 gap-4"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1" aria-live="polite">
          <p className="font-mono text-xs font-bold uppercase text-primary">{lamina.etiqueta}</p>
          <p className="text-sm text-muted-foreground">{lamina.descripcion}</p>
        </div>
        <div className="flex gap-2">
          {LAMINAS.map((opcion, posicion) => (
            <button
              key={opcion.id}
              type="button"
              aria-label={`Ver: ${opcion.etiqueta}`}
              aria-pressed={posicion === indice}
              onClick={() => setIndice(posicion)}
              className={`h-2.5 rounded-full transition-all ${posicion === indice ? "w-8 bg-primary" : "w-2.5 bg-border hover:bg-muted-foreground"}`}
            />
          ))}
        </div>
      </div>
      {/* La key reinicia la animación de escritura en cada lámina. */}
      <div key={lamina.id} className="motion-safe:animate-[aparecer_300ms_ease-out]">
        <lamina.Maqueta />
      </div>
      <Link href="/rutas/data-analyst" className="justify-self-start text-sm font-bold text-primary hover:underline">
        Ver la ruta Data Analyst →
      </Link>
    </section>
  );
}
```

En `apps/web/src/app/globals.css`, antes de `@keyframes leak-scan {`, agrega:
```css
/* La entrada de cada lámina del carrusel de la portada. */
@keyframes aparecer {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

`apps/web/src/app/(marketing)/page.tsx` completo:
```tsx
import Link from "next/link";
import { CarruselPortada } from "@/components/portada/carrusel-portada";
import { auth } from "@/lib/auth";

const STEPS = [
  {
    tag: "01_caso",
    title: "Un trabajo real, no un temario",
    body: "Cada curso es un caso de una empresa ficticia chilena. Llegas como junior y te piden resultados.",
  },
  {
    tag: "02_misiones",
    title: "Resuelves en herramientas de verdad",
    body: "SQL, Python, planillas y terminal corren en tu navegador. Cada misión se valida al instante.",
  },
  {
    tag: "03_portafolio",
    title: "Terminas con evidencia",
    body: "Cada caso deja un entregable para tu GitHub y un certificado verificable para tu CV.",
  },
];

export default async function HomePage() {
  const session = await auth();
  const estaAutenticado = Boolean(session?.user);

  return (
    <main>
      {/* El texto queda fijo a la izquierda y el carrusel de la v1 rota a la derecha; en el teléfono va debajo. */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:px-8 lg:py-24">
        <div className="grid gap-8">
          <p className="font-mono text-sm font-bold text-primary">SYNTAXERROR_ / v2.0</p>
          <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-5xl xl:text-6xl">
            Aprende resolviendo casos reales y consigue tu primer trabajo en tecnología
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
            Academia 100% gratuita. Sin videos eternos ni quizzes de memoria: practicas con datos y
            herramientas reales desde tu navegador y armas un portafolio que puedes mostrar.
          </p>
          <div className="flex flex-wrap gap-3">
            {estaAutenticado ? (
              <Link href="/dashboard" className="btn btn-primary">
                Ir al dashboard
              </Link>
            ) : (
              <>
                <Link href="/registro" className="btn btn-primary">
                  Crear cuenta gratis
                </Link>
                <Link href="/login" className="btn btn-secondary">
                  Ya tengo cuenta
                </Link>
              </>
            )}
            <Link href="/rutas" className="btn btn-secondary">
              Ver rutas
            </Link>
          </div>
        </div>
        <CarruselPortada />
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
        {STEPS.map((step) => (
          <article key={step.tag} className="card grid gap-3 p-6">
            <span className="font-mono text-xs font-bold text-primary">{step.tag}</span>
            <h2 className="text-xl font-black">{step.title}</h2>
            <p className="leading-7 text-muted-foreground">{step.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
```

En `README.md`, antes de la línea `- **Mapa de la ruta:**`, agrega:
```markdown
- **Portada:** el texto de la portada queda fijo y a su lado rota el carrusel de la v1, con tres maquetas animadas de la ruta Data Analyst (`components/portada/`): la terminal con git del Caso 0, la consola de SQL de Minimarkets del Sur y el asistente de las clases de IA para datos. Son dibujos, nada se ejecuta. Rota cada 7 segundos, se pausa con el mouse o el foco y, con "reducir movimiento", ni rota ni escribe: muestra cada maqueta completa.
```

- [ ] **Step 6: Correr todo**

Run: `npm run test:e2e -- tests/portada.spec.ts`
Expected: `2 passed`.

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec tsc --noEmit && pnpm --filter web test"`
Expected: sin errores de tipos; 353 pruebas pasan.

Run: `npm run test:e2e`
Expected: `54 passed`, dos corridas seguidas.

Revisa la portada en el navegador: computador y teléfono, en los dos temas, y deja pasar una rotación.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/portada "apps/web/src/app/(marketing)/page.tsx" apps/web/src/app/globals.css e2e/tests/portada.spec.ts README.md
git commit -m "feat(portada): el carrusel de la v1 con tres momentos de la ruta data analyst

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

7f: el asistente del curso (el chat flotante de la v1), junto al tutor de cada misión.
