# Fase 7b: Búsqueda con Ctrl+K. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Traer la búsqueda de la v1: una ventana que se abre con Ctrl+K (⌘K en Mac) o con el botón Buscar, desde cualquier página.

**Architecture:**
- **El buscador es el de la v2.** `buscar()` y `construirIndice()` no cambian de forma: la v1 usaba MiniSearch, pero el de la v2 ya busca sin tildes ni mayúsculas y nunca indexa respuestas. Solo se agregan dos cosas:
  - las lecciones de unas clases salen como "Lección" (tipo `leccion`), no como "Misión";
  - se busca también en la pregunta de una lectura y en las preguntas de un quiz, sin su respuesta, sus opciones ni sus explicaciones.
- **El índice** se sirve como archivo estático en `/buscar/indice.json` (unos 214 KB, generado al construir la app). La ventana lo descarga una sola vez, la primera vez que se abre.
- **La ventana** (`busqueda-rapida.tsx`) es un `<dialog>`:
  - **Atajos:** Ctrl+K o ⌘K la abren; las flechas recorren los resultados (8 como máximo); Enter abre el elegido; Escape o un clic fuera la cierran.
  - **Avisos:** usa los de la v1 (`NO_MATCH_FOUND:` y `SEARCH_OFFLINE:`, con el efecto glitch que ya existe en la v2).
  - **Página completa:** "Ver todos los resultados" lleva a `/buscar?q=...`.
  - **Sin JavaScript,** el botón es un enlace a `/buscar`.
- **Dónde está:** reemplaza el enlace Buscar en los dos encabezados, el general (`site-header.tsx`) y el de rutas, casos y misiones (`misiones-header.tsx`).
- **Dos detalles probados al construirla:**
  - El navegador avisa el cierre de un `<dialog>` un instante después. Si la ventana se vuelve a abrir enseguida (Escape y Ctrl+K seguidos), ese aviso tardío la cerraba. Ahora solo cuenta si la ventana sigue cerrada.
  - El campo es de texto, con `enterKeyHint="search"`, y no de tipo `search`. Así no aparece la "✕" del navegador junto a la nuestra, y Escape cierra la ventana en vez de borrar el texto.

**Tech Stack:** Next 15, React 19, Vitest 4 y Playwright 1.55.

**Spec:** decisión del 2026-10-03 de traer las funciones de la v1 (fase 7b).

## Global Constraints

- **Entorno:** todo se ejecuta con `docker compose run --rm tools ...`. El paquete de la app se llama `web`.
- **Respuestas fuera del índice:** el buscador nunca debe revelar respuestas (soluciones, pruebas, pistas, cierres, respuestas de lecturas, opciones ni explicaciones de quizzes).
- **Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Una respuesta encontrable por búsqueda:** probado en `indice.test.ts` con textos "secretos" que no deben aparecer.
2. **Ctrl+K dentro de una misión,** que usa otro encabezado: probado en `busqueda.spec.ts`.
3. **Cerrar y volver a abrir enseguida:** probado en `busqueda.spec.ts` (Escape y luego Ctrl+K).
4. **Un atajo antes de que la página se active:** no hace nada, y la prueba reintenta hasta que la página responde.

---

### Task 1: Lecciones y preguntas en el índice

**Files:**
- Modify: `apps/web/src/lib/buscador/buscar.ts`, `apps/web/src/lib/buscador/indice.ts`, `apps/web/src/components/buscador.tsx`
- Test: `apps/web/src/lib/buscador/indice.test.ts`

**Interfaces:**
- Produces:
  - `EntradaBusqueda["tipo"]` suma `"leccion"`;
  - `ETIQUETAS` se exporta desde `components/buscador.tsx` (`leccion: "Lección"`).

- [ ] **Step 1: Escribir la prueba**

`apps/web/src/lib/buscador/indice.test.ts` completo:
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
          props: {
            id: "t1",
            enunciado: "Trae nombre y ciudad.",
            inicial: "",
            solucion: "SELECT zzsolucionsecreta FROM clientes",
            comparar: "filas-sin-orden",
            pistas: ["usa pistasecreta"],
          },
          texto: null,
        },
        { tipo: "Debrief", props: { entrevista: "preguntaentrevista" }, texto: "cierrerevelador con la respuesta" },
      ],
    },
  ],
} as unknown as Caso;

const CLASES = {
  slug: "clases-de-sql",
  tipo: "clases",
  titulo: "Clases de SQL",
  cargo: "Analista de datos junior",
  empresa: "syntaxError.cl",
  dataset: "Tablas de práctica",
  entregable: "",
  datos: [],
  misiones: [
    {
      slug: "01-que-es-sql",
      titulo: "Qué es SQL",
      tiempo: 10,
      fuente: "",
      bloques: [
        { tipo: "LecturaTask", props: { id: "l1", pregunta: "¿Para qué sirve una base relacional?", respuesta: "respuestasecreta", pistas: [] }, texto: null },
        {
          tipo: "QuizTask",
          props: {
            id: "q1",
            enunciado: "Responde sobre las llaves.",
            preguntas: [{ pregunta: "¿Qué identifica una fila?", opciones: ["opcionsecreta", "otra"], correcta: 0, explicacion: "explicacionsecreta" }],
            pistas: [],
          },
          texto: null,
        },
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

  it("marca las lecciones de unas clases como lecciones y busca en las preguntas de lecturas y quizzes, sin sus respuestas", () => {
    const indice = construirIndice([RUTA], [CLASES]);
    expect(indice.at(-1)).toMatchObject({ tipo: "leccion", titulo: "Qué es SQL", contexto: "Clases de SQL", href: "/casos/clases-de-sql/01-que-es-sql" });
    expect(buscar(indice, "base relacional").map((resultado) => resultado.titulo)).toEqual(["Qué es SQL"]);
    expect(buscar(indice, "identifica una fila").map((resultado) => resultado.titulo)).toEqual(["Qué es SQL"]);
    expect(buscar(indice, "llaves").map((resultado) => resultado.titulo)).toEqual(["Qué es SQL"]);
    for (const secreto of ["respuestasecreta", "opcionsecreta", "explicacionsecreta"]) {
      expect(buscar(indice, secreto)).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/buscador"`
Expected: FAIL en "marca las lecciones de unas clases como lecciones...".

- [ ] **Step 3: Implementar**

`apps/web/src/lib/buscador/buscar.ts` completo:
```ts
// Sin imports: este módulo corre en el navegador.
export type EntradaBusqueda = {
  tipo: "ruta" | "caso" | "mision" | "leccion";
  titulo: string;
  contexto: string;
  href: string;
  texto: string;
};

const PRIORIDAD: Record<EntradaBusqueda["tipo"], number> = { ruta: 3, caso: 2, mision: 1, leccion: 1 };

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

`apps/web/src/lib/buscador/indice.ts` completo:
```ts
import type { Caso, Mision, Ruta } from "@syntaxerror/content/tipos";
import { normalizar, type EntradaBusqueda } from "./buscar";

export const MAXIMO_TEXTO_MISION = 1500;

// Solo lo que la persona ve antes de resolver. Nunca soluciones, pruebas,
// pistas ni Debrief, para que el buscador no revele respuestas: de una lectura
// entra la pregunta y no la respuesta; de un quiz, las preguntas y no sus
// opciones ni explicaciones.
function textoDeMision(mision: Mision): string {
  const partes: string[] = [];
  for (const bloque of mision.bloques) {
    if ((bloque.tipo === "Brief" || bloque.tipo === "Concepto") && bloque.texto) partes.push(bloque.texto);
    if (bloque.tipo === "Decision") partes.push(bloque.props.pregunta);
    if ((bloque.tipo === "SqlTask" || bloque.tipo === "PythonTask" || bloque.tipo === "SheetTask" || bloque.tipo === "MarkdownTask" || bloque.tipo === "GithubTask") && bloque.props.enunciado) {
      partes.push(bloque.props.enunciado);
    }
    if (bloque.tipo === "LecturaTask") partes.push(bloque.props.pregunta);
    if (bloque.tipo === "QuizTask") partes.push(bloque.props.enunciado ?? "", ...bloque.props.preguntas.map((pregunta) => pregunta.pregunta));
  }
  return normalizar(partes.join(" ")).slice(0, MAXIMO_TEXTO_MISION);
}

export function construirIndice(rutas: Ruta[], casos: Caso[]): EntradaBusqueda[] {
  const rutasDelCaso = (slug: string) =>
    rutas
      .filter((ruta) => ruta.casos.includes(slug))
      .map((ruta) => ruta.titulo)
      .join(" ");

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
        tipo: caso.tipo === "clases" ? ("leccion" as const) : ("mision" as const),
        titulo: mision.titulo,
        contexto: caso.titulo,
        href: `/casos/${caso.slug}/${mision.slug}`,
        texto: textoDeMision(mision),
      })),
    ]),
  ];
}
```

En `apps/web/src/components/buscador.tsx`, `ETIQUETAS` queda exportado y con las lecciones:
```tsx
export const ETIQUETAS: Record<EntradaBusqueda["tipo"], string> = { ruta: "Ruta", caso: "Caso", mision: "Misión", leccion: "Lección" };
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/buscador && npx tsc --noEmit"`
Expected: PASS (7 pruebas) y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/buscador apps/web/src/components/buscador.tsx
git commit -m "feat(buscador): las lecciones salen como lecciones y se busca en las preguntas de lecturas y quizzes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: La ventana de búsqueda

**Files:**
- Create: `apps/web/src/app/(misiones)/buscar/indice.json/route.ts`, `apps/web/src/components/busqueda-rapida.tsx`
- Modify: `apps/web/src/components/site-header.tsx`, `apps/web/src/components/misiones-header.tsx`, `e2e/calentar.ts`, `README.md`
- Test: `e2e/tests/busqueda.spec.ts`

**Interfaces:**
- Consumes: `buscar`, `EntradaBusqueda` y `ETIQUETAS` (Task 1).
- Produces:
  - `GET /buscar/indice.json` (estático);
  - `<BusquedaRapida />`, en los dos encabezados.

- [ ] **Step 1: Escribir la prueba**

`e2e/tests/busqueda.spec.ts`:
```ts
import { expect, test } from "./fixtures";

test("Ctrl+K abre la búsqueda en cualquier página y Enter lleva al primer resultado", async ({ page }) => {
  await page.goto("/rutas");
  const ventana = page.getByRole("dialog", { name: "Buscar en syntaxError.cl" });
  const consulta = ventana.getByLabel("Busca rutas, casos, misiones o lecciones");
  // El atajo funciona una vez que la página se activó en el navegador: se reintenta hasta entonces.
  await expect(async () => {
    await page.keyboard.press("Control+k");
    await expect(consulta).toBeFocused({ timeout: 1_000 });
  }).toPass();
  await consulta.fill("zzzqqq");
  await expect(ventana.getByText("No encontramos resultados para «zzzqqq».")).toBeVisible();
  await consulta.fill("CLIENTES de REGIÓNES");
  await expect(ventana.getByRole("link", { name: /Clientes de regiones/ })).toContainText("Misión · ");
  await consulta.press("Enter");
  await expect(page).toHaveURL(/\/casos\/demo-motor\/01-clientes-de-regiones$/);
  await expect(ventana).toBeHidden();

  // También dentro de una misión, con el encabezado de las misiones.
  await expect(async () => {
    await page.keyboard.press("Control+k");
    await expect(consulta).toBeFocused({ timeout: 1_000 });
  }).toPass();
  await consulta.fill("join");
  await expect(ventana.getByRole("link", { name: /Lección · Clases de SQL/ }).first()).toBeVisible();
});

test("el botón Buscar abre la ventana, marca las lecciones y lleva a todos los resultados", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Buscar" }).click();
  const ventana = page.getByRole("dialog", { name: "Buscar en syntaxError.cl" });
  await ventana.getByLabel("Busca rutas, casos, misiones o lecciones").fill("inner join");
  await expect(ventana.getByRole("link", { name: /Lección · Clases de SQL/ }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(ventana).toBeHidden();

  await page.keyboard.press("Control+k");
  await ventana.getByLabel("Busca rutas, casos, misiones o lecciones").fill("inner join");
  await ventana.getByRole("link", { name: "Ver todos los resultados" }).click();
  await expect(page).toHaveURL(/\/buscar\?q=inner%20join$/);
  await expect(page.getByRole("list", { name: "Resultados" }).getByText("Lección · Clases de SQL").first()).toBeVisible();
});
```

En `e2e/calentar.ts`, en `RUTAS`, después de `"/buscar",`, agrega:
```ts
  "/buscar/indice.json",
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run test:e2e -- tests/busqueda.spec.ts`
Expected: `2 failed`. No existe la ventana.

- [ ] **Step 3: El índice y la ventana**

`apps/web/src/app/(misiones)/buscar/indice.json/route.ts`:
```ts
import { construirIndice } from "@/lib/buscador/indice";
import { casosParaPublicar, rutasParaPublicar } from "@/lib/contenido";

// El índice que descarga la búsqueda rápida (Ctrl+K) la primera vez que se abre. Se genera al construir la app.
export const dynamic = "force-static";

export async function GET() {
  return Response.json(construirIndice(await rutasParaPublicar(), await casosParaPublicar()));
}
```

`apps/web/src/components/busqueda-rapida.tsx`:
```tsx
"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buscar, type EntradaBusqueda } from "@/lib/buscador/buscar";
import { ETIQUETAS } from "./buscador";

type Estado = "sin-cargar" | "cargando" | "listo" | "error";

const MAXIMO_RESULTADOS = 8;

// La búsqueda de la v1: una ventana que se abre con Ctrl+K (⌘K en Mac) desde cualquier página. Sin JavaScript, el
// enlace lleva a /buscar.
export function BusquedaRapida() {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [abierta, setAbierta] = useState(false);
  const [estado, setEstado] = useState<Estado>("sin-cargar");
  const [indice, setIndice] = useState<EntradaBusqueda[]>([]);
  const [consulta, setConsulta] = useState("");
  const [seleccion, setSeleccion] = useState(0);
  const [atajo, setAtajo] = useState("Ctrl K");

  const abrir = useCallback(() => setAbierta(true), []);
  const cerrar = useCallback(() => setAbierta(false), []);

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setAtajo("⌘K");
    function alPresionar(evento: KeyboardEvent) {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setAbierta(true);
      }
    }
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);

  useEffect(() => {
    const ventana = dialogo.current;
    if (!ventana) return;
    if (abierta && !ventana.open) ventana.showModal();
    if (!abierta && ventana.open) ventana.close();
  }, [abierta]);

  // El índice se descarga una sola vez, la primera vez que se abre la ventana.
  useEffect(() => {
    if (!abierta || estado !== "sin-cargar") return;
    setEstado("cargando");
    fetch("/buscar/indice.json")
      .then((respuesta) => (respuesta.ok ? respuesta.json() : Promise.reject(new Error(String(respuesta.status)))))
      .then((datos: EntradaBusqueda[]) => {
        setIndice(datos);
        setEstado("listo");
      })
      .catch(() => setEstado("error"));
  }, [abierta, estado]);

  const resultados = useMemo(() => buscar(indice, consulta, MAXIMO_RESULTADOS), [indice, consulta]);

  function ir(href: string) {
    cerrar();
    setConsulta("");
    router.push(href);
  }

  function alEscribir(valor: string) {
    setConsulta(valor);
    setSeleccion(0);
  }

  function alNavegar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setSeleccion((actual) => Math.min(actual + 1, Math.max(resultados.length - 1, 0)));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setSeleccion((actual) => Math.max(actual - 1, 0));
    } else if (evento.key === "Escape") {
      // Escape cierra la ventana aunque el foco esté en el campo.
      evento.preventDefault();
      cerrar();
    } else if (evento.key === "Enter" && resultados[seleccion]) {
      evento.preventDefault();
      ir(resultados[seleccion].href);
    }
  }

  const hayConsulta = consulta.trim() !== "";

  return (
    <>
      <a
        href="/buscar"
        className="nav-link"
        aria-label="Buscar"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={(evento) => {
          evento.preventDefault();
          abrir();
        }}
      >
        <Search size={16} />
        <span className="hidden sm:inline">Buscar</span>
        <kbd className="hidden rounded border border-border px-1.5 font-mono text-xs text-muted-foreground lg:inline">{atajo}</kbd>
      </a>
      <dialog
        ref={dialogo}
        aria-label="Buscar en syntaxError.cl"
        className="fixed inset-0 m-0 size-full max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/60"
        // El navegador avisa el cierre después: si la ventana ya se volvió a abrir (Ctrl+K seguido), ese aviso no cuenta.
        onClose={() => {
          if (!dialogo.current?.open) cerrar();
        }}
        onClick={(evento) => {
          if (evento.target === evento.currentTarget) cerrar();
        }}
      >
        {abierta ? (
          <div className="mx-auto mt-20 w-[calc(100%-2rem)] max-w-lg rounded-md border border-border bg-surface shadow-2xl">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Search size={16} className="text-muted-foreground" />
              <input
                type="text"
                enterKeyHint="search"
                aria-label="Busca rutas, casos, misiones o lecciones"
                value={consulta}
                onChange={(evento) => alEscribir(evento.target.value)}
                onKeyDown={alNavegar}
                maxLength={100}
                autoFocus
                placeholder="Busca rutas, casos, misiones o lecciones..."
                className="flex-1 bg-transparent text-base text-foreground outline-none"
              />
              <button type="button" onClick={cerrar} aria-label="Cerrar la búsqueda" className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {estado === "cargando" ? <p className="p-3 text-sm text-muted-foreground">Cargando...</p> : null}
              {estado === "error" ? (
                <p role="status" className="p-3 text-sm text-muted-foreground">
                  <span className="typographic-glitch font-mono font-black text-primary" data-text="SEARCH_OFFLINE:">
                    SEARCH_OFFLINE:
                  </span>{" "}
                  La búsqueda no está disponible por ahora.
                </p>
              ) : null}
              {estado === "listo" && hayConsulta && resultados.length === 0 ? (
                <p role="status" className="p-3 text-sm text-muted-foreground">
                  <span className="typographic-glitch font-mono font-black text-primary" data-text="NO_MATCH_FOUND:">
                    NO_MATCH_FOUND:
                  </span>{" "}
                  {`No encontramos resultados para «${consulta.trim()}».`}
                </p>
              ) : null}
              {resultados.length > 0 ? (
                <ul aria-label="Resultados" className="grid gap-1">
                  {resultados.map((resultado, posicion) => (
                    <li key={resultado.href}>
                      <Link
                        href={resultado.href}
                        aria-current={posicion === seleccion ? "true" : undefined}
                        onClick={(evento) => {
                          evento.preventDefault();
                          ir(resultado.href);
                        }}
                        onMouseEnter={() => setSeleccion(posicion)}
                        className={`grid gap-0.5 rounded-md px-3 py-2 text-sm ${posicion === seleccion ? "bg-surface-raised" : ""}`}
                      >
                        <span className="font-bold">{resultado.titulo}</span>
                        <span className="font-mono text-xs text-muted-foreground">{`${ETIQUETAS[resultado.tipo]} · ${resultado.contexto}`}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {hayConsulta && estado === "listo" ? (
              <div className="border-t border-border px-4 py-2 text-sm">
                <Link href={`/buscar?q=${encodeURIComponent(consulta.trim())}`} onClick={cerrar} className="font-bold text-primary hover:underline">
                  Ver todos los resultados
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </>
  );
}
```

- [ ] **Step 4: Los encabezados**

En `apps/web/src/components/site-header.tsx`:
1. El import de íconos queda sin `Search`:
```tsx
import { GraduationCap, LayoutDashboard, Mail, Shield, SquareTerminal, UserRound } from "lucide-react";
```
2. Antes de `import { SignOutButton } from "./sign-out-button";`, agrega:
```tsx
import { BusquedaRapida } from "./busqueda-rapida";
```
3. Reemplaza el enlace a `/buscar` (las cuatro líneas de `<Link className="nav-link" href="/buscar" aria-label="Buscar">` a su `</Link>`) por:
```tsx
        <BusquedaRapida />
```

`apps/web/src/components/misiones-header.tsx` completo:
```tsx
import Link from "next/link";
import { BusquedaRapida } from "./busqueda-rapida";
import { ThemeToggle } from "./theme-toggle";

export function MisionesHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-auto flex items-center gap-2 font-black text-foreground">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary font-mono text-sm text-primary-foreground">{"{}"}</span>
          <span className="hidden sm:inline">syntaxError.cl</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Principal">
          <BusquedaRapida />
          <Link className="nav-link" href="/rutas">Rutas</Link>
          <Link className="nav-link" href="/dashboard">Tu panel</Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
```

- [ ] **Step 5: README**

En `README.md`, la línea del buscador queda:
```markdown
- **Buscador:** `/buscar` busca rutas, casos, misiones y lecciones publicadas en el encargo, los conceptos, los enunciados y las preguntas de lecturas y quizzes, sin distinguir mayúsculas ni tildes. El índice se arma en el build desde `content/` y nunca incluye soluciones, pruebas, pistas, el cierre ni las respuestas, opciones o explicaciones. Desde cualquier página, **Ctrl+K** (⌘K en Mac) o el botón Buscar abre una ventana de búsqueda, como en la v1: descarga el índice (`/buscar/indice.json`) la primera vez que se abre, se recorre con las flechas y Enter abre el resultado.
```

- [ ] **Step 6: Correr todo**

Run: `npm run test:e2e -- tests/busqueda.spec.ts --repeat-each 5`
Expected: `10 passed`.

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec tsc --noEmit && pnpm --filter web test"`
Expected: sin errores de tipos; 338 pruebas pasan.

Run: `npm run test:e2e`
Expected: `49 passed`, dos corridas seguidas.

- [ ] **Step 7: Commit**

```bash
git add "apps/web/src/app/(misiones)/buscar/indice.json" apps/web/src/components/busqueda-rapida.tsx apps/web/src/components/site-header.tsx apps/web/src/components/misiones-header.tsx e2e/calentar.ts e2e/tests/busqueda.spec.ts README.md
git commit -m "feat(web): busqueda con ctrl+k desde cualquier pagina, como en la v1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

7c: descargar el certificado.
