# Fase 7d: El mapa de la ruta como git log. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la página de una ruta (`/rutas/<ruta>`) deje de ser una lista de tarjetas iguales y sea un mapa con forma de `git log --graph`, con el avance de cada persona. Debe funcionar en el teléfono y en los temas claro y oscuro.

**Architecture:**
- **La metáfora** (decisión del 2026-10-04): la ruta enseña git, así que se ve como su historia, leída de arriba hacia abajo (`--reverse`):
  - **main** avanza con los casos, que son los commits y van numerados desde el Caso 0, como en la propuesta;
  - **cada clase es una rama** (`clases/sql`) que sale de main y se fusiona en el caso que la aplica (`Merge branch 'clases/sql'`). Así se ve que primero se aprende y después se aplica, en orden y no en paralelo;
  - **el primer caso** es el `Initial commit`, **el proyecto final** lleva `deploy`, y **el certificado de la ruta** es el `tag: v1.0`.
- **Los estados de cada commit:**
  - `✔ merged`: lo completo, con su nodo verde;
  - `HEAD -> tú` con su barra: lo siguiente, con el nodo animado;
  - `PR en revisión`: un caso con todas sus misiones y el entregable sin aprobar;
  - `LOCKED`: lo bloqueado, con el efecto glitch y la línea punteada.

  Siguen el mismo orden que los requisitos del servidor: lo completo, después la primera pieza sin completar, y después el resto, bloqueado.
- **El avance:** la página sigue siendo estática y el mapa pide el avance al cargar, a `GET /api/progreso/resumen`, que usa `listarCasosDelUsuario`. Arriba van dos barras, lecciones y casos. Sin sesión se ve el mapa sin avance, con la invitación `$ git config user.name` a crear la cuenta.
- **El diseño:**
  - las dos líneas del grafo ocupan 3 rem y las tarjetas el resto, así que en un teléfono de 360 px cabe sin desbordar;
  - los colores salen de los tokens del tema (`success`, `primary`, `warning` y `border`), y las etiquetas de git son bordes de color con texto normal, legibles en los dos temas;
  - el glitch y la animación del HEAD respetan "reducir movimiento".
- **Una corrección:** la lista anterior numeraba los casos desde 1 (Minimarkets salía como "Caso 3"). La propuesta y el resto de la plataforma los numeran desde 0 (Minimarkets es el Caso 2). Se ajusta la prueba de `clases.spec.ts`.
- **La lógica** (agrupar en ramas, estados y resumen) está en `lib/rutas/mapa.ts`, sin imports, y se prueba sola. Acepta rutas sin clases (la demo) y una clase al final sin caso.

**Requisito:** la Fase 7c implementada. El plan se armó sobre ella: el README completo de la Task 3 la incluye.

**Tech Stack:** Next 15, React 19, Tailwind 4, Vitest 4 y Playwright 1.55.

**Spec:** decisión del 2026-10-04: mapa `git log`, con el avance de cada persona, en móvil y en los temas claro y oscuro.

## Global Constraints

- **Plataformas:** debe funcionar en un teléfono (360 px, sin scroll horizontal) y en los temas claro y oscuro.
- **Entorno:** todo se ejecuta con `docker compose run --rm tools ...`. El paquete de la app se llama `web`.
- **Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Un teléfono de 360 px:** el mapa no desborda y las etiquetas de estado no se parten ("LOC / KED"). Probado en `mapa-ruta.spec.ts`; el estado lleva `shrink-0 whitespace-nowrap`.
2. **Sin sesión:** no hay estados ni `LOCKED`, sino la invitación a crear la cuenta. Probado en `mapa-ruta.spec.ts`.
3. **Un caso con todas sus misiones y el entregable en revisión** no aparece como completo ni bloquea mal lo siguiente. Probado en `mapa.test.ts`.
4. **La API sin sesión** responde 401, y el mapa lo trata como visita. Probado en `route.test.ts`.

---

### Task 1: La lógica del mapa

**Files:**
- Create: `apps/web/src/lib/rutas/mapa.ts`
- Test: `apps/web/src/lib/rutas/mapa.test.ts`

**Interfaces:**
- Produces:
  - `PiezaRuta`, `AvanceCaso`, `EstadoPieza`, `PiezaMapa`, `Etapa` y `ResumenRuta`;
  - `armarMapa(piezas, avance | null): { etapas, resumen }` y `hashCorto(texto)`.

- [ ] **Step 1: Escribir la prueba**

`apps/web/src/lib/rutas/mapa.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { armarMapa, hashCorto, type PiezaRuta } from "./mapa";

const pieza = (slug: string, tipo: PiezaRuta["tipo"], unidades = 3): PiezaRuta => ({ slug, titulo: slug, tipo, empresa: tipo === "caso" ? "Empresa" : "", unidades });

const RUTA: PiezaRuta[] = [
  pieza("herramientas-del-oficio", "caso", 7),
  pieza("clases-de-excel", "clases", 23),
  pieza("despachos-rapidos", "caso", 9),
  pieza("clases-de-sql", "clases", 18),
  pieza("minimarkets-del-sur", "caso", 8),
];

describe("armarMapa", () => {
  it("agrupa cada clase con el caso que la sigue, como una rama que se fusiona, y numera los casos desde 0", () => {
    const { etapas } = armarMapa(RUTA, null);
    expect(etapas.map((etapa) => [etapa.rama, etapa.clases?.slug ?? null, etapa.caso?.slug ?? null, etapa.caso?.numeroCaso ?? null])).toEqual([
      [null, null, "herramientas-del-oficio", 0],
      ["clases/excel", "clases-de-excel", "despachos-rapidos", 1],
      ["clases/sql", "clases-de-sql", "minimarkets-del-sur", 2],
    ]);
  });

  it("sin sesión todo queda disponible y sin avance", () => {
    const { etapas, resumen } = armarMapa(RUTA, null);
    expect(etapas.flatMap((etapa) => [etapa.clases, etapa.caso]).filter(Boolean).map((p) => p?.estado)).toEqual(Array(5).fill("disponible"));
    expect(resumen).toEqual({ leccionesAprobadas: 0, lecciones: 41, casosCompletos: 0, casos: 3, completa: false });
  });

  it("con avance: lo completo, lo que sigue en curso y el resto bloqueado", () => {
    const { etapas, resumen } = armarMapa(RUTA, {
      "herramientas-del-oficio": { aprobadas: 7, completo: true },
      "clases-de-excel": { aprobadas: 23, completo: true },
      "despachos-rapidos": { aprobadas: 4, completo: false },
    });
    const estados = Object.fromEntries(etapas.flatMap((etapa) => [etapa.clases, etapa.caso]).filter((p) => p !== null).map((p) => [p.slug, [p.estado, p.aprobadas]]));
    expect(estados).toEqual({
      "herramientas-del-oficio": ["completo", 7],
      "clases-de-excel": ["completo", 23],
      "despachos-rapidos": ["en_curso", 4],
      "clases-de-sql": ["bloqueado", 0],
      "minimarkets-del-sur": ["bloqueado", 0],
    });
    expect(resumen).toEqual({ leccionesAprobadas: 23, lecciones: 41, casosCompletos: 1, casos: 3, completa: false });
  });

  it("un caso con todas sus misiones pero sin el entregable aprobado queda en revisión", () => {
    const { etapas } = armarMapa(RUTA, { "herramientas-del-oficio": { aprobadas: 7, completo: false } });
    expect(etapas[0].caso?.estado).toBe("en_revision");
    expect(etapas[1].clases?.estado).toBe("bloqueado");
  });

  it("con todo completo la ruta queda completa", () => {
    const avance = Object.fromEntries(RUTA.map((p) => [p.slug, { aprobadas: p.unidades, completo: true }]));
    expect(armarMapa(RUTA, avance).resumen.completa).toBe(true);
  });

  it("acepta rutas sin clases y clases al final, sin caso", () => {
    expect(armarMapa([pieza("demo-motor", "caso")], null).etapas).toHaveLength(1);
    const { etapas } = armarMapa([pieza("demo-motor", "caso"), pieza("clases-de-r", "clases")], null);
    expect(etapas.map((etapa) => [etapa.rama, etapa.caso?.slug ?? null])).toEqual([
      [null, "demo-motor"],
      ["clases/r", null],
    ]);
  });
});

describe("hashCorto", () => {
  it("da siete caracteres hexadecimales, siempre los mismos para el mismo texto", () => {
    expect(hashCorto("clases-de-sql")).toMatch(/^[0-9a-f]{7}$/);
    expect(hashCorto("clases-de-sql")).toBe(hashCorto("clases-de-sql"));
    expect(hashCorto("clases-de-sql")).not.toBe(hashCorto("clases-de-excel"));
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/rutas"`
Expected: FAIL, no existe `./mapa`.

- [ ] **Step 3: Implementar**

`apps/web/src/lib/rutas/mapa.ts`:
```ts
// El mapa de una ruta como un `git log --graph`: cada clase es una rama que sale de main y se fusiona en el caso que
// la aplica. Sin imports: este módulo corre en el navegador.

export type PiezaRuta = { slug: string; titulo: string; tipo: "caso" | "clases"; empresa: string; unidades: number };
export type AvanceCaso = { aprobadas: number; completo: boolean };
export type EstadoPieza = "completo" | "en_curso" | "en_revision" | "bloqueado" | "disponible";
export type PiezaMapa = PiezaRuta & { hash: string; numeroCaso: number | null; aprobadas: number; estado: EstadoPieza };
export type Etapa = { rama: string | null; clases: PiezaMapa | null; caso: PiezaMapa | null };
export type ResumenRuta = { leccionesAprobadas: number; lecciones: number; casosCompletos: number; casos: number; completa: boolean };

// Un hash corto y estable para mostrar junto a cada "commit" (FNV-1a de 32 bits).
export function hashCorto(texto: string): string {
  let hash = 0x811c9dc5;
  for (const caracter of texto) {
    hash ^= caracter.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

function rama(slug: string): string {
  return `clases/${slug.replace(/^clases-de-/, "")}`;
}

// Sin avance (sin sesión) todo queda disponible. Con avance, la ruta se recorre en orden: lo completo, después la
// primera pieza sin completar (en curso, o en revisión si es un caso con todas sus misiones y falta el entregable)
// y el resto bloqueado, igual que los requisitos del servidor.
export function armarMapa(piezas: PiezaRuta[], avance: Record<string, AvanceCaso> | null): { etapas: Etapa[]; resumen: ResumenRuta } {
  let actualEncontrada = false;
  let casosAntes = 0;
  const conEstado = piezas.map((pieza): PiezaMapa => {
    const propio = avance?.[pieza.slug];
    const aprobadas = Math.min(propio?.aprobadas ?? 0, pieza.unidades);
    let estado: EstadoPieza = "disponible";
    if (avance) {
      if (propio?.completo) estado = "completo";
      else if (!actualEncontrada) {
        actualEncontrada = true;
        estado = pieza.tipo === "caso" && pieza.unidades > 0 && aprobadas >= pieza.unidades ? "en_revision" : "en_curso";
      } else estado = "bloqueado";
    }
    const numeroCaso = pieza.tipo === "caso" ? casosAntes++ : null;
    return { ...pieza, hash: hashCorto(pieza.slug), numeroCaso, aprobadas, estado };
  });

  const etapas: Etapa[] = [];
  let pendiente: PiezaMapa | null = null;
  for (const pieza of conEstado) {
    if (pieza.tipo === "clases") {
      if (pendiente) etapas.push({ rama: rama(pendiente.slug), clases: pendiente, caso: null });
      pendiente = pieza;
    } else {
      etapas.push({ rama: pendiente ? rama(pendiente.slug) : null, clases: pendiente, caso: pieza });
      pendiente = null;
    }
  }
  if (pendiente) etapas.push({ rama: rama(pendiente.slug), clases: pendiente, caso: null });

  const clases = conEstado.filter((pieza) => pieza.tipo === "clases");
  const casos = conEstado.filter((pieza) => pieza.tipo === "caso");
  return {
    etapas,
    resumen: {
      leccionesAprobadas: clases.reduce((total, pieza) => total + pieza.aprobadas, 0),
      lecciones: clases.reduce((total, pieza) => total + pieza.unidades, 0),
      casosCompletos: casos.filter((pieza) => pieza.estado === "completo").length,
      casos: casos.length,
      completa: conEstado.length > 0 && conEstado.every((pieza) => pieza.estado === "completo"),
    },
  };
}
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/rutas"`
Expected: PASS (7 pruebas).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/rutas
git commit -m "feat(rutas): la ruta agrupada como ramas de git, con el estado de cada pieza

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: El avance de la persona

**Files:**
- Create: `apps/web/src/app/api/progreso/resumen/route.ts`
- Test: `apps/web/src/app/api/progreso/resumen/route.test.ts`

**Interfaces:**
- Consumes: `AvanceCaso` (Task 1) y `listarCasosDelUsuario` (`lib/progreso/servicio.ts`).
- Produces: `GET /api/progreso/resumen`, que responde `{ casos: Record<slug, { aprobadas, completo }> }` sin caché, o 401 sin sesión.

- [ ] **Step 1: Escribir la prueba**

`apps/web/src/app/api/progreso/resumen/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const { GET } = await import("./route");
const { POST } = await import("../route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { db, close } = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("GET /api/progreso/resumen", () => {
  it("sin sesión responde 401", async () => {
    expect((await GET()).status).toBe(401);
  });

  it("devuelve el avance de cada caso que la persona empezó, por slug", async () => {
    const [usuario] = await db.insert(users).values({ email: "alumna@correo.cl" }).returning({ id: users.id });
    await db.insert(casos).values({
      slug: "ventas",
      titulo: "Ventas",
      cargo: "Analista junior",
      empresa: "Distribuidora",
      entregable: "Repositorio",
      misiones: [
        { slug: "m1", titulo: "M1", tareas: ["t1"] },
        { slug: "m2", titulo: "M2", tareas: ["t2"] },
      ],
    });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(usuario.id);
    expect(await (await GET()).json()).toEqual({ casos: {} });

    const aprobar = { caso: "ventas", mision: "m1", tarea: "t1", aprobada: true };
    await POST(new Request("http://localhost:3000/api/progreso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(aprobar) }));
    const respuesta = await GET();
    expect(respuesta.headers.get("cache-control")).toBe("no-store");
    expect(await respuesta.json()).toEqual({ casos: { ventas: { aprobadas: 1, completo: false } } });
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/app/api/progreso/resumen"`
Expected: FAIL, no existe `./route`.

- [ ] **Step 3: Implementar**

`apps/web/src/app/api/progreso/resumen/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { listarCasosDelUsuario } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";
import type { AvanceCaso } from "@/lib/rutas/mapa";

export const dynamic = "force-dynamic";

// El avance de la persona en cada caso que empezó, para el mapa de la ruta (la página de la ruta es estática).
export async function GET() {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const casos: Record<string, AvanceCaso> = {};
  for (const caso of await listarCasosDelUsuario(getDb(), userId)) casos[caso.slug] = { aprobadas: caso.misionesAprobadas, completo: caso.completo };
  return NextResponse.json({ casos }, { headers: { "Cache-Control": "no-store" } });
}
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/app/api/progreso && npx tsc --noEmit"`
Expected: PASS y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/progreso/resumen
git commit -m "feat(progreso): el resumen del avance por caso para el mapa de la ruta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: El mapa en la página de la ruta

**Files:**
- Create: `apps/web/src/components/rutas/mapa-ruta.tsx`
- Modify: `apps/web/src/app/(misiones)/rutas/[ruta]/page.tsx`, `e2e/tests/clases.spec.ts`, `README.md`
- Test: `e2e/tests/mapa-ruta.spec.ts`

**Interfaces:**
- Consumes: `armarMapa` (Task 1) y `GET /api/progreso/resumen` (Task 2).
- Produces: `<MapaRuta ruta={{ slug, titulo }} piezas={PiezaRuta[]} />`.

- [ ] **Step 1: Escribir la prueba**

`e2e/tests/mapa-ruta.spec.ts`:
```ts
import { expect, test } from "./fixtures";
import { completarCaso, entrarComoAdmin, registrarse } from "./progreso";

test("sin sesión, el mapa de la ruta muestra cada clase como una rama de su caso e invita a crear la cuenta", async ({ page }) => {
  await page.goto("/rutas/data-analyst");
  await expect(page.getByText("$ git log --graph --reverse data-analyst")).toBeVisible();
  const mapa = page.getByRole("list", { name: "Mapa de la ruta Data Analyst" });
  await expect(mapa.getByRole("link", { name: /Herramientas del oficio/ })).toContainText("Initial commit");
  const sql = mapa.getByRole("link", { name: /Clases de SQL/ });
  await expect(sql).toContainText("clases/sql");
  await expect(sql).toContainText("18 lecciones");
  await expect(mapa.getByRole("link", { name: /Minimarkets del Sur/ })).toContainText("Merge branch 'clases/sql'");
  await expect(mapa.getByRole("link", { name: /Proyecto final/ })).toContainText("deploy");
  await expect(mapa.getByText("Certificado Data Analyst")).toBeVisible();
  await expect(page.getByRole("link", { name: "Crea tu cuenta" })).toHaveAttribute("href", "/registro?callbackUrl=%2Frutas%2Fdata-analyst");
  await expect(mapa.getByText("LOCKED")).toHaveCount(0);
});

test("con el Caso 0 completo, el mapa marca lo hecho, dónde está tu HEAD y lo bloqueado, y cabe en un teléfono", async ({ page, ip, nuevaPagina }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const email = await registrarse(page, "Ignacia Paredes");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await completarCaso(page, admin, ip, email, "herramientas-del-oficio");

  await page.goto("/rutas/data-analyst");
  const mapa = page.getByRole("list", { name: "Mapa de la ruta Data Analyst" });
  await expect(mapa.getByRole("link", { name: "Herramientas del oficio: GitHub y tu portafolio: completo" })).toContainText("✔ merged");
  const excel = mapa.getByRole("link", { name: /Clases de Excel.*: siguiente$/ });
  await expect(excel).toContainText("HEAD -> tú");
  await expect(excel).toContainText("0/23 lecciones");
  await expect(mapa.getByRole("link", { name: /Despachos Rápidos.*: bloqueado$/ })).toContainText("LOCKED");
  await expect(page.getByRole("progressbar", { name: "Casos completados" })).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByRole("link", { name: "Crea tu cuenta" })).toHaveCount(0);
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});
```

En `e2e/tests/clases.spec.ts`, en "la ruta muestra las clases antes del caso de SQL...", las dos líneas sobre Minimarkets quedan:
```ts
  // Las clases no cuentan en la numeración, que parte del Caso 0 como en la propuesta: Minimarkets es el Caso 2.
  await expect(page.getByRole("link", { name: /Minimarkets del Sur/ })).toContainText("Caso 2 · Minimarkets del Sur");
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run test:e2e -- tests/mapa-ruta.spec.ts tests/clases.spec.ts:6`
Expected: `3 failed`. No existe el mapa y Minimarkets sale como "Caso 3".

- [ ] **Step 3: El componente**

`apps/web/src/components/rutas/mapa-ruta.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { armarMapa, hashCorto, type AvanceCaso, type EstadoPieza, type PiezaMapa, type PiezaRuta } from "@/lib/rutas/mapa";

// La ruta como un `git log --graph --reverse`: main avanza con los casos y cada clase es una rama que sale de main y
// se fusiona en el caso que la aplica. La página es estática; el avance de la persona se pide al cargar.

type Props = { ruta: { slug: string; titulo: string }; piezas: PiezaRuta[] };

const NODO: Record<EstadoPieza, string> = {
  completo: "border-success bg-success",
  en_curso: "border-primary bg-background",
  en_revision: "border-warning bg-warning/40",
  bloqueado: "border-dashed border-muted-foreground bg-background",
  disponible: "border-primary bg-background",
};

// La línea que llega a un nodo: verde si ese tramo ya se recorrió, punteada si está bloqueado.
function linea(estado: EstadoPieza | "release") {
  if (estado === "completo") return "border-success";
  if (estado === "bloqueado" || estado === "release") return "border-dashed border-border";
  return "border-border";
}

function Decoracion({ children, tono }: { children: React.ReactNode; tono: "head" | "rama" | "tag" }) {
  const borde = tono === "head" ? "border-primary" : tono === "rama" ? "border-success" : "border-warning";
  return <span className={`rounded border px-1 font-mono text-[11px] font-bold leading-5 text-foreground ${borde}`}>{children}</span>;
}

function Estado({ pieza }: { pieza: PiezaMapa }) {
  // Sin encogerse ni partirse: en un teléfono la etiqueta queda junto al título, completa.
  const base = "shrink-0 whitespace-nowrap font-mono text-[11px] font-black uppercase";
  if (pieza.estado === "completo") return <span className={`${base} text-foreground`}>✔ merged</span>;
  if (pieza.estado === "en_revision") return <span className={`${base} text-foreground`}>PR en revisión</span>;
  if (pieza.estado === "bloqueado") {
    return (
      <span className={`${base} typographic-glitch text-muted-foreground`} data-text="LOCKED">
        LOCKED
      </span>
    );
  }
  return null;
}

function Commit({ pieza, mensaje, decoraciones }: { pieza: PiezaMapa; mensaje: string; decoraciones: React.ReactNode }) {
  const unidad = pieza.tipo === "clases" ? "lecciones" : "misiones";
  const conAvance = pieza.estado === "en_curso" || pieza.estado === "en_revision" || (pieza.estado === "bloqueado" && pieza.aprobadas > 0);
  const detalle = pieza.tipo === "clases" ? `${pieza.unidades} ${unidad}` : `Caso ${pieza.numeroCaso} · ${pieza.empresa} · ${pieza.unidades} ${unidad}`;
  return (
    <Link
      href={`/casos/${pieza.slug}`}
      aria-label={`${pieza.titulo}: ${etiquetaEstado(pieza)}`}
      className={`card grid min-w-0 flex-1 gap-1.5 p-4 hover:border-primary ${pieza.estado === "bloqueado" ? "opacity-70" : ""} ${pieza.estado === "en_curso" ? "border-primary" : ""}`}
    >
      <span className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <span>{pieza.hash}</span>
        {decoraciones}
        <span className="min-w-0 truncate">{mensaje}</span>
      </span>
      <span className="flex items-start justify-between gap-3">
        <span className="font-black leading-snug">{pieza.titulo}</span>
        <Estado pieza={pieza} />
      </span>
      <span className="text-sm text-muted-foreground">{detalle}</span>
      {conAvance ? (
        <span className="grid gap-1">
          <span className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round((pieza.aprobadas / Math.max(pieza.unidades, 1)) * 100)}%` }} />
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {pieza.estado === "en_revision" ? "Misiones listas: falta que aprueben tu entregable" : `${pieza.aprobadas}/${pieza.unidades} ${unidad}`}
          </span>
        </span>
      ) : null}
    </Link>
  );
}

function etiquetaEstado(pieza: PiezaMapa): string {
  if (pieza.estado === "completo") return "completo";
  if (pieza.estado === "en_curso") return pieza.aprobadas > 0 ? "en curso" : "siguiente";
  if (pieza.estado === "en_revision") return "entregable en revisión";
  if (pieza.estado === "bloqueado") return "bloqueado";
  return "disponible";
}

// Las dos líneas del grafo: main (izquierda) y la rama de las clases (derecha). `tramo` dibuja cada fila.
function Carril({ main, rama, nodo }: { main: string | null; rama?: string | null; nodo?: { carril: "main" | "rama"; clase: string; actual: boolean } }) {
  return (
    <span aria-hidden="true" className="relative block w-12 shrink-0 self-stretch">
      {main ? <span className={`absolute inset-y-0 left-[11px] border-l-2 ${main}`} /> : null}
      {rama ? <span className={`absolute inset-y-0 left-[35px] border-l-2 ${rama}`} /> : null}
      {nodo ? (
        <span className={`absolute top-5 size-4 rounded-full border-2 ${nodo.carril === "main" ? "left-1" : "left-7"} ${nodo.clase}`}>
          {nodo.actual ? <span className="absolute -inset-1 rounded-full border-2 border-primary motion-safe:animate-ping" /> : null}
        </span>
      ) : null}
    </span>
  );
}

// La curva que sale de main hacia la rama (o vuelve), en una fila corta.
function Curva({ hacia, main, rama }: { hacia: "rama" | "main"; main: string; rama: string }) {
  return (
    <li aria-hidden="true" className="flex h-6">
      <span className="relative block w-12 shrink-0">
        <span className={`absolute inset-y-0 left-[11px] border-l-2 ${main}`} />
        <svg className="absolute inset-0 overflow-visible" width="48" height="24" viewBox="0 0 48 24" fill="none">
          <path
            d={hacia === "rama" ? "M12 0 C 12 14, 36 10, 36 24" : "M36 0 C 36 14, 12 10, 12 24"}
            className={rama.includes("success") ? "stroke-success" : "stroke-border"}
            strokeWidth="2"
            strokeDasharray={rama.includes("dashed") ? "4 3" : undefined}
          />
        </svg>
      </span>
    </li>
  );
}

export function MapaRuta({ ruta, piezas }: Props) {
  const [avance, setAvance] = useState<Record<string, AvanceCaso> | null>(null);
  const [sesion, setSesion] = useState<"cargando" | "con" | "sin">("cargando");

  useEffect(() => {
    let vigente = true;
    fetch("/api/progreso/resumen", { cache: "no-store" })
      .then(async (respuesta) => {
        if (!vigente) return;
        if (!respuesta.ok) return setSesion("sin");
        const datos = (await respuesta.json()) as { casos: Record<string, AvanceCaso> };
        if (!vigente) return;
        setAvance(datos.casos);
        setSesion("con");
      })
      .catch(() => vigente && setSesion("sin"));
    return () => {
      vigente = false;
    };
  }, []);

  const { etapas, resumen } = armarMapa(piezas, avance);
  const ultimoCaso = [...etapas].reverse().find((etapa) => etapa.caso)?.caso ?? null;
  const release = resumen.completa ? "completo" : "release";

  return (
    <div className="grid gap-6">
      {sesion === "con" ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Tu avance en la ruta">
          <Barra etiqueta="Lecciones" descripcion="Lecciones aprobadas" valor={resumen.leccionesAprobadas} total={resumen.lecciones} />
          <Barra etiqueta="Casos" descripcion="Casos completados" valor={resumen.casosCompletos} total={resumen.casos} />
        </div>
      ) : sesion === "sin" ? (
        <p className="card p-4 text-sm leading-6">
          <span className="font-mono font-bold text-primary">{"$ git config user.name "}</span>
          <span className="text-muted-foreground">sin configurar. </span>
          <Link className="font-bold text-primary hover:underline" href={`/registro?callbackUrl=${encodeURIComponent(`/rutas/${ruta.slug}`)}`}>
            Crea tu cuenta
          </Link>{" "}
          para guardar tu avance y ver dónde está tu HEAD.
        </p>
      ) : (
        <div className="h-14" aria-hidden="true" />
      )}

      <ol className="grid" aria-label={`Mapa de la ruta ${ruta.titulo}`}>
        {etapas.map((etapa, indice) => {
          const clases = etapa.clases;
          const caso = etapa.caso;
          const lineaMain = linea(clases?.estado ?? caso?.estado ?? "disponible");
          return [
            clases ? <Curva key={`${indice}-sale`} hacia="rama" main={lineaMain} rama={linea(clases.estado)} /> : null,
            clases ? (
              <li key={clases.slug} className="flex gap-1 pb-3">
                <Carril main={lineaMain} rama={linea(clases.estado)} nodo={{ carril: "rama", clase: NODO[clases.estado], actual: clases.estado === "en_curso" }} />
                <Commit
                  pieza={clases}
                  mensaje={`feat: ${clases.unidades} lecciones`}
                  decoraciones={
                    <>
                      {clases.estado === "en_curso" ? <Decoracion tono="head">HEAD -&gt; tú</Decoracion> : null}
                      <Decoracion tono="rama">{etapa.rama}</Decoracion>
                    </>
                  }
                />
              </li>
            ) : null,
            clases && caso ? <Curva key={`${indice}-vuelve`} hacia="main" main={lineaMain} rama={linea(clases.estado)} /> : null,
            caso ? (
              <li key={caso.slug} className="flex gap-1 pb-3">
                <Carril main={linea(caso.estado)} nodo={{ carril: "main", clase: NODO[caso.estado], actual: caso.estado === "en_curso" }} />
                <Commit
                  pieza={caso}
                  mensaje={indice === 0 && !clases ? "Initial commit" : etapa.rama ? `Merge branch '${etapa.rama}'` : "feat: caso"}
                  decoraciones={
                    <>
                      {caso.estado === "en_curso" || caso.estado === "en_revision" ? <Decoracion tono="head">HEAD -&gt; tú</Decoracion> : null}
                      {caso === ultimoCaso ? <Decoracion tono="tag">deploy</Decoracion> : null}
                    </>
                  }
                />
              </li>
            ) : null,
          ];
        })}
        <li className="flex gap-1">
          <Carril main={linea(release)} nodo={{ carril: "main", clase: resumen.completa ? NODO.completo : "border-warning bg-background", actual: false }} />
          <div className={`card grid min-w-0 flex-1 gap-1.5 border-warning p-4 ${resumen.completa ? "" : "opacity-80"}`}>
            <span className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <span>{hashCorto(`${ruta.slug}-release`)}</span>
              <Decoracion tono="tag">tag: v1.0</Decoracion>
              <span>release</span>
            </span>
            <span className="font-black">{`Certificado ${ruta.titulo}`}</span>
            <span className="text-sm text-muted-foreground">
              {resumen.completa ? (
                <Link className="font-bold text-primary hover:underline" href="/dashboard">
                  Ver tu certificado en el panel
                </Link>
              ) : (
                "Se publica al completar todos los casos y clases de la ruta."
              )}
            </span>
          </div>
        </li>
      </ol>
    </div>
  );
}

function Barra({ etiqueta, descripcion, valor, total }: { etiqueta: string; descripcion: string; valor: number; total: number }) {
  const porcentaje = Math.round((valor / Math.max(total, 1)) * 100);
  return (
    <div className="card grid gap-2 p-4">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-black">{etiqueta}</span>
        <span className="font-mono text-sm text-muted-foreground">{`${valor}/${total}`}</span>
      </span>
      <span className="h-2 overflow-hidden rounded-full bg-surface-raised" role="progressbar" aria-label={descripcion} aria-valuemin={0} aria-valuemax={total} aria-valuenow={valor}>
        <span className="block h-full rounded-full bg-primary" style={{ width: `${porcentaje}%` }} />
      </span>
    </div>
  );
}
```

- [ ] **Step 4: La página**

`apps/web/src/app/(misiones)/rutas/[ruta]/page.tsx` completo:
```tsx
import { notFound } from "next/navigation";
import { MapaRuta } from "@/components/rutas/mapa-ruta";
import { casosDeRuta, obtenerRuta, rutasParaPublicar } from "@/lib/contenido";
import type { PiezaRuta } from "@/lib/rutas/mapa";

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
  const piezas: PiezaRuta[] = (await casosDeRuta(ruta)).map((caso) => ({
    slug: caso.slug,
    titulo: caso.titulo,
    tipo: caso.tipo,
    empresa: caso.empresa,
    unidades: caso.misiones.length,
  }));
  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-3">
        <p className="font-mono text-sm font-bold text-primary">{`$ git log --graph --reverse ${ruta.slug}`}</p>
        <h1 className="text-3xl font-black">{ruta.titulo}</h1>
        <p className="text-sm font-bold text-muted-foreground">{ruta.cargo}</p>
        <p className="leading-7 text-muted-foreground">{ruta.descripcion}</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Cada clase es una rama: aprendes en ella y se fusiona en el caso que la aplica, en un trabajo real.
        </p>
      </header>
      <MapaRuta ruta={{ slug: ruta.slug, titulo: ruta.titulo }} piezas={piezas} />
    </main>
  );
}
```

- [ ] **Step 5: README**

En `README.md`, antes de la línea `- **Buscador:**`, agrega:
```markdown
- **Mapa de la ruta:** `/rutas/<ruta>` muestra la ruta como un `git log --graph --reverse`: main avanza con los casos (numerados desde el Caso 0) y cada clase es una rama (`clases/sql`) que sale de main y se fusiona en el caso que la aplica; el proyecto final lleva `deploy` y el certificado de la ruta es el `tag: v1.0`. La página es estática y el avance de cada persona se pide al cargar a `GET /api/progreso/resumen`: lo completo sale `merged`, lo siguiente con `HEAD -> tú` y su barra, un caso con todas sus misiones y el entregable pendiente como `PR en revisión`, y el resto `LOCKED`. Sin sesión se ve el mapa sin avance, con la invitación a crear la cuenta. La lógica está en `lib/rutas/mapa.ts`.
```

- [ ] **Step 6: Correr todo**

Run: `npm run test:e2e -- tests/mapa-ruta.spec.ts tests/clases.spec.ts:6`
Expected: `3 passed`.

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec tsc --noEmit && pnpm --filter web test"`
Expected: sin errores de tipos; 352 pruebas pasan.

Run: `npm run test:e2e`
Expected: `52 passed`, dos corridas seguidas.

Revisa `/rutas/data-analyst` en el navegador, con y sin sesión, en un teléfono (o con el modo responsivo del navegador) y en los dos temas.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/rutas "apps/web/src/app/(misiones)/rutas" e2e/tests/mapa-ruta.spec.ts e2e/tests/clases.spec.ts README.md
git commit -m "feat(rutas): el mapa de la ruta como git log, con el avance de cada persona

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

7e: el carrusel de la portada. Después, 7f: el asistente del curso.
