# Fase 8d: Claridad del avance. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el estudiante vea de un vistazo cómo va y dónde seguir, según la auditoría de experiencia del 2026-10-05 (hallazgos 1, 2 y 5).

**Architecture:**
- **Estados que se distinguen (hallazgo 1).** En la lista de un caso, "Pendiente", "En curso" y "Aprobada" usaban la misma etiqueta violeta. Ahora `EtiquetaEstado` les da color, ícono y texto:
  - pendiente: neutro, con un círculo;
  - en curso: violeta, con un círculo con punto;
  - aprobada: verde, con un check;
  - bloqueada: punteada, con un candado.

  El texto se mantiene, así que las pruebas que leen `estado-<misión>` siguen igual.
- **La siguiente misión.** `estadosDeMisiones` (`lib/progreso/estados.ts`, sin imports y probada sola) decide el estado de cada misión y cuál es la siguiente:
  - **bloqueadas:** las que vienen después de la primera sin aprobar, salvo con orden libre o sin sesión. Si el caso está bloqueado o en beta, todo lo no aprobado.
  - **la siguiente:** se destaca, con `aria-current="step"`, y lleva "Empieza aquí →" o "Continuar aquí →".
- **El mapa dice dónde estás (hallazgo 2).**
  - La tarjeta en curso dice **Estás aquí** y lleva un botón **Continuar →** ("Empezar →" si no hay avance; "Ver tu entregable →" si está en revisión).
  - Una leyenda plegable, **¿Cómo leer este mapa?**, traduce el lenguaje git: main, clases/…, HEAD, merged, PR en revisión, LOCKED y tag.
- **El asistente en el teléfono (hallazgo 5).** El botón flotante pasaba sobre las etiquetas al bajar por la lista. Ahora, en pantallas de menos de 640 px, se esconde mientras se baja y vuelve al subir (`data-oculto`, `inert` mientras está escondido). Con el panel abierto siempre se ve, y en el computador no cambia.
  - Se probó también dejar espacio al final de las páginas, pero no resolvía nada: el pie ya deja libre lo último, y el problema era al desplazarse.
- **Las e2e parten con el orden normal.** `calentar.ts` entra como admin y apaga el "orden libre para todos" antes de la suite. Las e2e usan la misma base que el desarrollo local: si quedaba encendido desde la administración, las pruebas que esperan bloqueos fallaban (pasó el 2026-10-06).

**Tech Stack:** Next 15, React 19, Tailwind 4, lucide-react, Vitest 4 y Playwright 1.55.

**Spec:** auditoría de experiencia del 2026-10-05 y decisión de orden 8c, 8d y 8e.

## Global Constraints

- **Plataformas:** debe funcionar en el teléfono (375 px) y en los temas claro y oscuro.
- **El estado no depende solo del color:** cada etiqueta lleva ícono y texto.
- **Entorno:** todo se ejecuta con `docker compose run --rm tools ...`. El paquete de la app se llama `web`.
- **Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Sin sesión** no se marca nada como bloqueado, porque se puede leer todo. Probado en `estados.test.ts`.
2. **Con orden libre** nada queda bloqueado. Con el caso bloqueado o en beta no hay "siguiente". Probado en `estados.test.ts`.
3. **El botón del asistente escondido** no se puede alcanzar con el teclado (`inert`) y vuelve al subir. Probado en `avance.spec.ts`.
4. **En el computador**, el botón no se esconde. Probado en `avance.spec.ts`.
5. **Las pruebas existentes** que leen "Aprobada" en `estado-…` siguen pasando (`misiones.spec.ts`).

---

### Task 1: Los estados y la siguiente misión

**Files:**
- Create: `apps/web/src/lib/progreso/estados.ts`, `apps/web/src/components/mision/etiqueta-estado.tsx`
- Modify: `apps/web/src/components/mision/panel-caso.tsx`
- Test: `apps/web/src/lib/progreso/estados.test.ts`

**Interfaces:**
- Produces:
  - `EstadoVisible` y `estadosDeMisiones(slugs, progreso, { sesion, ordenLibre?, casoBloqueado? }): { estados, siguiente }`;
  - `<EtiquetaEstado estado testId />`.

- [ ] **Step 1: Escribir la prueba**

`apps/web/src/lib/progreso/estados.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { estadosDeMisiones } from "./estados";

const slugs = ["m1", "m2", "m3", "m4"];

describe("estadosDeMisiones", () => {
  it("con sesión: lo aprobado, lo empezado, la siguiente para continuar y lo que sigue bloqueado", () => {
    expect(estadosDeMisiones(slugs, { m1: "aprobada", m2: "en_curso" }, { sesion: true })).toEqual({
      estados: ["aprobada", "en_curso", "bloqueada", "bloqueada"],
      siguiente: 1,
    });
  });

  it("sin nada empezado, la primera es la siguiente; sin sesión no se marca nada bloqueado", () => {
    expect(estadosDeMisiones(slugs, {}, { sesion: true })).toEqual({ estados: ["pendiente", "bloqueada", "bloqueada", "bloqueada"], siguiente: 0 });
    expect(estadosDeMisiones(slugs, {}, { sesion: false })).toEqual({ estados: ["pendiente", "pendiente", "pendiente", "pendiente"], siguiente: 0 });
  });

  it("con orden libre nada queda bloqueado; con el caso bloqueado (o en beta) todo lo no aprobado lo está y no hay siguiente", () => {
    expect(estadosDeMisiones(slugs, { m1: "aprobada" }, { sesion: true, ordenLibre: true })).toEqual({ estados: ["aprobada", "pendiente", "pendiente", "pendiente"], siguiente: 1 });
    expect(estadosDeMisiones(slugs, { m1: "aprobada" }, { sesion: true, casoBloqueado: true })).toEqual({ estados: ["aprobada", "bloqueada", "bloqueada", "bloqueada"], siguiente: null });
  });

  it("con todo aprobado no hay siguiente", () => {
    expect(estadosDeMisiones(["m1"], { m1: "aprobada" }, { sesion: true })).toEqual({ estados: ["aprobada"], siguiente: null });
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/progreso/estados.test.ts"`
Expected: FAIL, no existe `./estados`.

- [ ] **Step 3: Implementar**

`apps/web/src/lib/progreso/estados.ts`:
```ts
// El estado que se muestra de cada misión de un caso y cuál es la siguiente. Sin imports: corre en el navegador.
export type EstadoVisible = "pendiente" | "en_curso" | "aprobada" | "bloqueada";

export function estadosDeMisiones(
  slugs: string[],
  progreso: Record<string, "en_curso" | "aprobada" | undefined>,
  { sesion, ordenLibre = false, casoBloqueado = false }: { sesion: boolean; ordenLibre?: boolean; casoBloqueado?: boolean }
): { estados: EstadoVisible[]; siguiente: number | null } {
  const primeraSinAprobar = slugs.findIndex((slug) => progreso[slug] !== "aprobada");
  const estados = slugs.map((slug, indice): EstadoVisible => {
    const estado = progreso[slug];
    if (estado === "aprobada") return "aprobada";
    if (casoBloqueado) return "bloqueada";
    if (estado === "en_curso") return "en_curso";
    // Una misión se habilita al aprobar la anterior: después de la primera sin aprobar, todas esperan.
    if (sesion && !ordenLibre && indice > primeraSinAprobar) return "bloqueada";
    return "pendiente";
  });
  return { estados, siguiente: casoBloqueado || primeraSinAprobar < 0 ? null : primeraSinAprobar };
}
```

`apps/web/src/components/mision/etiqueta-estado.tsx`:
```tsx
import { Check, Circle, CircleDot, Lock } from "lucide-react";
import type { EstadoVisible } from "@/lib/progreso/estados";

// El estado de una misión o lección: color, ícono y texto, para que no dependa solo de leer la palabra.
const ESTILOS: Record<EstadoVisible, { texto: string; clase: string; Icono: typeof Check }> = {
  pendiente: { texto: "Pendiente", clase: "border-border text-muted-foreground", Icono: Circle },
  en_curso: { texto: "En curso", clase: "border-primary bg-primary/10 text-foreground", Icono: CircleDot },
  aprobada: { texto: "Aprobada", clase: "border-success bg-success/15 text-foreground", Icono: Check },
  bloqueada: { texto: "Bloqueada", clase: "border-dashed border-border text-muted-foreground", Icono: Lock },
};

export function EtiquetaEstado({ estado, testId }: { estado: EstadoVisible; testId?: string }) {
  const { texto, clase, Icono } = ESTILOS[estado];
  return (
    <span data-testid={testId} className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${clase}`}>
      <Icono className={`size-3.5 ${estado === "aprobada" ? "text-success" : estado === "en_curso" ? "text-primary" : ""}`} strokeWidth={3} aria-hidden="true" />
      {texto}
    </span>
  );
}
```

`apps/web/src/components/mision/panel-caso.tsx` completo:
```tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { PLAZO_REVISION_DIAS_HABILES } from "@/lib/entregables/plazo";
import { cargarProgreso, dependenciasNavegador, type ProgresoVisible } from "@/lib/progreso/cliente";
import type { TipoCaso } from "@syntaxerror/content/tipos";
import type { CasoCorto } from "@/lib/progreso/requisitos";
import { unidad } from "@/lib/unidad";
import { AvisoBeta } from "./aviso-beta";
import { ResultadoRevision } from "./resultado-revision";
import { estadosDeMisiones } from "@/lib/progreso/estados";
import { EtiquetaEstado } from "./etiqueta-estado";

type MisionDelCaso = { slug: string; titulo: string; tiempo: number; tareas: string[]; sinGuia: boolean };

const MENSAJES_409: Record<string, string> = {
  misiones_pendientes: "Aprueba todas las misiones antes de enviar tu entregable.",
  entregable_aprobado: "Tu entregable ya fue aprobado.",
  caso_bloqueado: "Primero completa el caso anterior de la ruta.",
};


export function PanelCaso({
  caso,
  tipo = "caso",
  misiones,
  entregable,
  requisitos,
  soloProbadores = false,
}: {
  caso: string;
  tipo?: TipoCaso;
  misiones: MisionDelCaso[];
  entregable: string;
  requisitos: CasoCorto[];
  soloProbadores?: boolean;
}) {
  const [progreso, setProgreso] = useState<ProgresoVisible | null>(null);
  const [url, setUrl] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const tareasPorMision = useMemo(() => Object.fromEntries(misiones.map((mision) => [mision.slug, mision.tareas])), [misiones]);

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

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensaje(null);
    setProblemas([]);
    try {
      const respuesta = await fetch("/api/entregables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caso, url }) });
      const datos = (await respuesta.json().catch(() => ({}))) as { error?: string; problemas?: string[] };
      if (respuesta.ok) {
        setProgreso((actual) => (actual ? { ...actual, entregable: url, revision: { estado: "pendiente", puntajes: {}, observaciones: {}, comentario: null } } : actual));
        setMensaje("Recibimos tu entregable. Te avisaremos por email cuando lo revisen.");
      } else if (respuesta.status === 422) setProblemas(datos.problemas ?? []);
      else if (respuesta.status === 400) setMensaje("El enlace debe ser un repositorio de GitHub: https://github.com/tu-usuario/tu-repositorio");
      else if (respuesta.status === 409) setMensaje(MENSAJES_409[datos.error ?? ""] ?? "No pudimos enviar tu entregable.");
      else if (respuesta.status === 429) setMensaje("Enviaste varios entregables seguidos. Espera un rato antes de volver a intentarlo.");
      else setMensaje("No pudimos enviar tu entregable. Intenta de nuevo.");
    } catch {
      setMensaje("No pudimos enviar tu entregable. Revisa tu conexión.");
    } finally {
      setEnviando(false);
    }
  }

  // En una ruta beta, quien no es probador ve el aviso de beta en vez del de orden.
  const enBeta = soloProbadores && progreso !== null && (progreso.soloProbadores || !progreso.sesion);
  const casoPendiente = progreso && !enBeta ? (progreso.sesion ? progreso.bloqueadoPor : (requisitos[0] ?? null)) : null;
  const todasAprobadas = misiones.every((mision) => progreso?.misiones[mision.slug]?.estado === "aprobada");
  // Hasta que carga el progreso todo se ve pendiente; después se marca la siguiente para continuar.
  const { estados, siguiente } = estadosDeMisiones(
    misiones.map((mision) => mision.slug),
    Object.fromEntries(misiones.map((mision) => [mision.slug, progreso?.misiones[mision.slug]?.estado])),
    { sesion: progreso?.sesion ?? false, ordenLibre: progreso?.ordenLibre ?? false, casoBloqueado: enBeta || casoPendiente !== null }
  );
  const empezado = misiones.some((mision) => progreso?.misiones[mision.slug]);
  const revision = progreso?.revision ?? null;
  const volverAqui = `/login?callbackUrl=${encodeURIComponent(`/casos/${caso}`)}`;

  const formulario = (
    <form className="grid gap-3" onSubmit={enviar}>
      <Label>
        Enlace a tu repositorio de GitHub
        <Input name="url" type="url" required placeholder="https://github.com/tu-usuario/tu-repositorio" value={url} onChange={(evento) => setUrl(evento.target.value)} />
      </Label>
      <div><Button type="submit" disabled={enviando}>{enviando ? "Revisando tu repositorio…" : "Enviar a revisión"}</Button></div>
    </form>
  );

  return (
    <div className="grid gap-8">
      {enBeta ? <AvisoBeta sesion={progreso.sesion} volverA={`/casos/${caso}`} className="card p-4" /> : null}
      {casoPendiente ? (
        <p role="status" className="card p-4 text-sm leading-6">
          Puedes recorrer este caso, pero sus tareas se habilitan al completar{" "}
          <Link className="font-bold text-primary hover:underline" href={`/casos/${casoPendiente.slug}`}>{`«${casoPendiente.titulo}»`}</Link>.
          {progreso && !progreso.sesion ? <> <Link className="font-bold text-primary hover:underline" href={volverAqui}>Entrar</Link></> : null}
        </p>
      ) : null}
      <ol className="grid gap-3">
        {misiones.map((mision, indice) => (
          <li key={mision.slug}>
            <Link
              href={`/casos/${caso}/${mision.slug}`}
              aria-current={progreso && indice === siguiente ? "step" : undefined}
              className={`card flex items-center justify-between gap-4 p-4 hover:border-primary ${progreso && indice === siguiente ? "border-primary ring-2 ring-primary/50" : ""}`}
            >
              <span className="grid min-w-0 gap-0.5">
                <span className="block font-mono text-xs text-muted-foreground">{`${unidad(tipo).Nombre} ${indice + 1} · ${mision.tiempo} min${mision.sinGuia ? " · sin guía" : ""}`}</span>
                <span className="block font-bold">{mision.titulo}</span>
                {progreso && indice === siguiente ? <span className="text-sm font-bold text-primary">{empezado ? "Continuar aquí →" : "Empieza aquí →"}</span> : null}
              </span>
              <EtiquetaEstado estado={estados[indice]} testId={`estado-${mision.slug}`} />
            </Link>
          </li>
        ))}
      </ol>
      {tipo === "clases" ? (
        // Unas clases no tienen entregable: se completan al aprobar todas sus lecciones.
        <section className="card grid gap-3 p-5">
          <h2 className="text-xl font-black">Tu avance</h2>
          {progreso?.completo ? (
            <p role="status" className="font-bold text-primary">Clases completas: ya puedes seguir con el caso siguiente de la ruta.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Aprueba todas las lecciones para completar las clases y habilitar el caso siguiente.</p>
          )}
        </section>
      ) : (
      <section className="card grid gap-4 p-5">
        <h2 className="text-xl font-black">Tu entregable</h2>
        <p className="leading-7 text-muted-foreground">{entregable}</p>
        {progreso?.completo ? <p role="status" className="font-bold text-primary">Caso completo</p> : null}
        {progreso?.certificados.length ? (
          <ul className="grid gap-2">
            {progreso.certificados.map((certificado) => (
              <li key={certificado.codigo}>
                <Link className="font-bold text-primary hover:underline" href={`/certificados/${certificado.codigo}`}>
                  Ver certificado de {certificado.tipo === "ruta" ? "ruta" : "caso"}: {certificado.titulo}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {!progreso ? null : !progreso.sesion ? (
          <p className="text-sm">Para enviar tu entregable necesitas una cuenta. <Link className="font-bold text-primary hover:underline" href={volverAqui}>Entrar</Link></p>
        ) : revision?.estado === "aprobado" ? (
          <div className="grid gap-3 text-sm leading-6">
            <p>
              Entregable aprobado: <a className="font-bold text-primary hover:underline" href={progreso.entregable ?? "#"} target="_blank" rel="noopener noreferrer">{progreso.entregable}</a>
            </p>
            <ResultadoRevision revision={revision} />
          </div>
        ) : revision?.estado === "pendiente" ? (
          <p role="status" className="text-sm leading-6">
            {`Tu entregable está en revisión. Te responderemos en un plazo de ${PLAZO_REVISION_DIAS_HABILES} días hábiles y te avisaremos por email. Enviaste: `}
            <a className="font-bold text-primary hover:underline" href={progreso.entregable ?? "#"} target="_blank" rel="noopener noreferrer">{progreso.entregable}</a>
          </p>
        ) : !todasAprobadas ? (
          <p className="text-sm text-muted-foreground">Aprueba todas las misiones, incluida la misión sin guía, para enviar tu entregable a revisión.</p>
        ) : (
          <>
            {revision?.estado === "observado" ? (
              <div role="status" className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6">
                <p className="font-bold">Tu docente pidió cambios:</p>
                <ResultadoRevision revision={revision} />
                <p>Haz los ajustes en tu repositorio y vuelve a enviarlo, sin penalización.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Revisaremos que tu repositorio sea público, tenga un README y los archivos del caso. Luego, una persona lo revisa con la rúbrica del caso.</p>
            )}
            {formulario}
          </>
        )}

        {problemas.length > 0 ? (
          <div role="alert" className="grid gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <p className="font-bold">No pudimos aceptar tu entregable:</p>
            <ul className="list-disc pl-5">{problemas.map((problema) => <li key={problema}>{problema}</li>)}</ul>
          </div>
        ) : null}
        {mensaje ? <p role="status" className="text-sm font-bold">{mensaje}</p> : null}
      </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/progreso && npx tsc --noEmit"`
Expected: PASS y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/progreso/estados.ts apps/web/src/lib/progreso/estados.test.ts apps/web/src/components/mision/etiqueta-estado.tsx apps/web/src/components/mision/panel-caso.tsx
git commit -m "feat(avance): estados con color e icono y la siguiente mision destacada en el caso

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Dónde estás en el mapa, el asistente y las e2e

**Files:**
- Modify: `apps/web/src/components/rutas/mapa-ruta.tsx`, `apps/web/src/components/ia/asistente-flotante.tsx`, `e2e/calentar.ts`, `README.md`
- Test: `e2e/tests/avance.spec.ts`

**Interfaces:**
- Consumes: `EtiquetaEstado` y la siguiente misión (Task 1).

- [ ] **Step 1: Escribir la prueba**

`e2e/tests/avance.spec.ts`:
```ts
import { expect, test } from "./fixtures";
import { aprobar, MISIONES, registrarse } from "./progreso";

const CASO = "herramientas-del-oficio";

test("el caso muestra dónde empezar y, al avanzar, dónde continuar, con estados que se distinguen", async ({ page, ip }) => {
  await registrarse(page, "Antonia Gálvez");
  await page.goto(`/casos/${CASO}`);
  const primera = page.getByRole("link", { name: /Tu primer repositorio/ });
  await expect(primera).toContainText("Empieza aquí →");
  await expect(primera).toHaveAttribute("aria-current", "step");
  await expect(page.getByTestId("estado-01-tu-primer-repositorio")).toHaveText("Pendiente");
  await expect(page.getByTestId("estado-02-escribe-un-readme")).toHaveText("Bloqueada");

  await aprobar(page, ip, CASO, MISIONES[CASO].slice(0, 1));
  await page.reload();
  await expect(page.getByTestId("estado-01-tu-primer-repositorio")).toHaveText("Aprobada");
  const segunda = page.getByRole("link", { name: /Escribe un buen README/ });
  await expect(segunda).toContainText("Continuar aquí →");
  await expect(segunda).toHaveAttribute("aria-current", "step");
  await expect(primera).not.toHaveAttribute("aria-current", "step");

  // En el mapa: "Estás aquí" y el botón para seguir, y una leyenda que traduce el lenguaje git.
  await page.goto("/rutas/data-analyst");
  const aqui = page.getByRole("list", { name: "Mapa de la ruta Data Analyst" }).getByRole("link", { name: /Herramientas del oficio/ });
  await expect(aqui).toContainText("Estás aquí");
  await expect(aqui).toContainText("Continuar →");
  await page.getByText("¿Cómo leer este mapa?").click();
  await expect(page.getByText("se habilita al completar lo anterior")).toBeVisible();
});

test("en un teléfono, el botón del asistente se esconde al bajar por la lista y vuelve al subir", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto(`/casos/${CASO}`);
  const flotante = page.locator("[data-oculto]");
  await expect(page.getByRole("button", { name: "Asistente del curso" })).toBeVisible();
  await expect(flotante).toHaveAttribute("data-oculto", "false");
  // Bajando por la lista de misiones ya no pasa sobre sus etiquetas.
  await page.mouse.wheel(0, 500);
  await expect(flotante).toHaveAttribute("data-oculto", "true");
  await page.mouse.wheel(0, -200);
  await expect(flotante).toHaveAttribute("data-oculto", "false");
  await page.getByRole("button", { name: "Asistente del curso" }).click();
  await expect(page.getByRole("region", { name: "Asistente del curso" })).toBeVisible();
});

test("en el computador, el botón del asistente no se esconde al bajar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/casos/${CASO}`);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(300);
  await expect(page.locator("[data-oculto]")).toHaveAttribute("data-oculto", "false");
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run test:e2e -- tests/avance.spec.ts`
Expected: FAIL. No hay "Estás aquí" ni `data-oculto`.

- [ ] **Step 3: El mapa y el asistente**

`apps/web/src/components/rutas/mapa-ruta.tsx` completo:
```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { armarMapa, hashCorto, type AvanceCaso, type EstadoPieza, type PiezaMapa, type PiezaRuta } from "@/lib/rutas/mapa";
import { AvisoBeta } from "../mision/aviso-beta";

// La ruta como un `git log --graph --reverse`: main avanza con los casos y cada clase es una rama que sale de main y
// se fusiona en el caso que la aplica. La página es estática; el avance de la persona se pide al cargar.

type Props = { ruta: { slug: string; titulo: string; beta?: boolean }; piezas: PiezaRuta[] };

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

function etiquetaEstado(pieza: PiezaMapa): string {
  if (pieza.estado === "completo") return "completo";
  if (pieza.estado === "en_curso") return pieza.aprobadas > 0 ? "en curso" : "siguiente";
  if (pieza.estado === "en_revision") return "entregable en revisión";
  if (pieza.estado === "bloqueado") return "bloqueado";
  return "disponible";
}

function Commit({ pieza, mensaje, decoraciones }: { pieza: PiezaMapa; mensaje: string; decoraciones: React.ReactNode }) {
  const unidad = pieza.tipo === "clases" ? "lecciones" : "misiones";
  const conAvance = pieza.estado === "en_curso" || pieza.estado === "en_revision" || ((pieza.estado === "bloqueado" || pieza.estado === "disponible") && pieza.aprobadas > 0);
  const detalle = pieza.tipo === "clases" ? `${pieza.unidades} ${unidad}` : `Caso ${pieza.numeroCaso} · ${pieza.empresa} · ${pieza.unidades} ${unidad}`;
  // Donde está la persona: se destaca y lleva a seguir, con palabras simples junto al lenguaje git.
  const aqui = pieza.estado === "en_curso" || pieza.estado === "en_revision";
  const accion = pieza.estado === "en_revision" ? "Ver tu entregable →" : pieza.aprobadas > 0 ? "Continuar →" : "Empezar →";
  return (
    <Link
      href={`/casos/${pieza.slug}`}
      aria-label={`${pieza.titulo}: ${etiquetaEstado(pieza)}`}
      className={`card grid min-w-0 flex-1 gap-1.5 p-4 hover:border-primary ${pieza.estado === "bloqueado" ? "opacity-70" : ""} ${aqui ? "border-primary ring-2 ring-primary/50" : ""}`}
    >
      {aqui ? <span className="text-xs font-black uppercase tracking-wide text-primary">Estás aquí</span> : null}
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
      {aqui ? <span className="mt-1 w-fit rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">{accion}</span> : null}
    </Link>
  );
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
  const [ordenLibre, setOrdenLibre] = useState(false);
  const [conBeta, setConBeta] = useState(false);
  const [sesion, setSesion] = useState<"cargando" | "con" | "sin">("cargando");

  useEffect(() => {
    let vigente = true;
    fetch("/api/progreso/resumen", { cache: "no-store" })
      .then(async (respuesta) => {
        if (!vigente) return;
        if (!respuesta.ok) return setSesion("sin");
        const datos = (await respuesta.json()) as { casos: Record<string, AvanceCaso>; ordenLibre?: boolean; accesoBeta?: boolean };
        if (!vigente) return;
        setAvance(datos.casos);
        setOrdenLibre(Boolean(datos.ordenLibre));
        setConBeta(Boolean(datos.accesoBeta));
        setSesion("con");
      })
      .catch(() => vigente && setSesion("sin"));
    return () => {
      vigente = false;
    };
  }, []);

  const { etapas, resumen } = armarMapa(piezas, avance, { ordenLibre });
  const ultimoCaso = [...etapas].reverse().find((etapa) => etapa.caso)?.caso ?? null;
  const release = resumen.completa ? "completo" : "release";

  return (
    <div className="grid gap-6">
      {ruta.beta && sesion !== "cargando" ? (
        sesion === "con" && conBeta ? (
          <p role="status" className="card p-4 text-sm leading-6">
            <span className="badge mr-2">Beta</span>
            Estás probando esta ruta antes que el resto. Si algo falla o no se entiende, usa «Reportar un problema» al pie de la página.
          </p>
        ) : (
          <AvisoBeta sesion={sesion === "con"} volverA={`/rutas/${ruta.slug}`} className="card p-4" />
        )
      ) : null}
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

      <Leyenda />
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

// El mapa usa palabras de git (lo que enseña la ruta); esto las traduce para quien recién empieza.
function Leyenda() {
  const filas: [string, string][] = [
    ["main", "la ruta, de arriba hacia abajo"],
    ["clases/…", "una rama de clases: aprendes ahí y se fusiona en el caso que lo aplica"],
    ["HEAD -> tú", "dónde estás"],
    ["✔ merged", "completado"],
    ["PR en revisión", "tus misiones están listas; falta que aprueben tu entregable"],
    ["LOCKED", "se habilita al completar lo anterior"],
    ["tag: v1.0", "el certificado de la ruta"],
  ];
  return (
    <details className="card p-4 text-sm">
      <summary className="cursor-pointer font-bold">¿Cómo leer este mapa?</summary>
      <dl className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr] sm:gap-x-4">
        {filas.map(([termino, significado]) => (
          <div key={termino} className="grid gap-0.5 sm:contents">
            <dt className="font-mono text-xs font-bold text-foreground sm:pt-0.5">{termino}</dt>
            <dd className="text-muted-foreground">{significado}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
```

`apps/web/src/components/ia/asistente-flotante.tsx` completo:
```tsx
"use client";

import { MessageCircle, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Conversacion } from "./conversacion";
import { useConversacionIA } from "./use-conversacion";

const AVISOS = {
  limite: "Llegaste al límite de preguntas al asistente por esta hora. Vuelve a intentarlo más tarde.",
  noDisponible: "El asistente no está disponible ahora. Puedes seguir con el curso.",
  demora: "El asistente está tardando demasiado. Intenta preguntar de nuevo.",
};

// El "Asistente del curso" de la v1: un chat flotante, siempre disponible, para dudas de conceptos. No ve las tareas
// del caso, así que no reemplaza al tutor de cada misión, que se habilita al intentar.
export function AsistenteFlotante({ caso }: { caso: string }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  // Una vez abierto, sigue escuchando: si la respuesta llega con el panel cerrado, el botón lo avisa.
  const [usado, setUsado] = useState(false);
  const [vistas, setVistas] = useState(0);
  const [pregunta, setPregunta] = useState("");
  const [oculto, setOculto] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const fin = useRef<HTMLDivElement>(null);
  const { sesion, mensajes, enviando, aviso, enviar } = useConversacionIA({ activa: usado, url: "/api/asistente/preguntas", cuerpo: { caso }, avisos: AVISOS });
  const respondidas = mensajes.filter((mensaje) => mensaje.estado !== "pendiente").length;
  const sinLeer = !abierto && respondidas > vistas;

  useEffect(() => {
    if (abierto) setVistas(respondidas);
  }, [abierto, respondidas]);

  useEffect(() => {
    if (!abierto) return;
    campo.current?.focus();
    const alPresionar = (evento: KeyboardEvent) => evento.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [abierto]);

  useEffect(() => {
    if (abierto) fin.current?.scrollIntoView({ block: "end" });
  }, [abierto, mensajes, aviso]);

  // En el teléfono, el botón se esconde mientras se baja por la página (pasaba sobre las etiquetas de las misiones) y
  // vuelve al subir. Con el panel abierto siempre se ve.
  useEffect(() => {
    if (abierto) {
      setOculto(false);
      return;
    }
    const telefono = window.matchMedia("(max-width: 639px)");
    let anterior = window.scrollY;
    const alDesplazar = () => {
      const actual = window.scrollY;
      if (!telefono.matches) setOculto(false);
      else if (Math.abs(actual - anterior) >= 8) setOculto(actual > anterior && actual > 80);
      if (Math.abs(actual - anterior) >= 8 || !telefono.matches) anterior = actual;
    };
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, [abierto]);

  function abrir() {
    setUsado(true);
    setAbierto(true);
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = pregunta.trim();
    if (texto && (await enviar(texto))) setPregunta("");
  }

  return (
    <div
      data-oculto={oculto}
      inert={oculto}
      className={`fixed bottom-4 right-4 z-40 grid justify-items-end gap-3 transition-all duration-200 motion-reduce:transition-none ${oculto ? "pointer-events-none translate-y-24 opacity-0" : ""}`}
    >
      {abierto ? (
        <section aria-label="Asistente del curso" className="grid max-h-[min(36rem,calc(100svh-6rem))] w-[min(calc(100vw-2rem),24rem)] grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
          <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="font-mono text-sm font-black text-primary">{"> asistente_"}</h2>
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar el asistente" className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </header>
          <div className="grid content-start gap-3 overflow-y-auto p-4 text-sm leading-6" aria-live="polite">
            <p className="text-muted-foreground">
              Pregúntame sobre programación, SQL, planillas, Python, Power BI o datos. No resuelvo las tareas: para eso están las pistas y el tutor de cada misión.
            </p>
            {sesion === "no" ? (
              <Link className="font-bold text-primary hover:underline" href={`/login?callbackUrl=${encodeURIComponent(ruta)}`}>
                Entra para preguntarle al asistente
              </Link>
            ) : (
              <Conversacion mensajes={mensajes} pensando="El asistente está pensando…" desdeCache="Respondida desde respuestas anteriores de este curso." />
            )}
            {aviso ? (
              <p role="status" className="font-bold">
                {aviso}
              </p>
            ) : null}
            <div ref={fin} />
          </div>
          {sesion === "no" ? null : (
            <form onSubmit={alEnviar} className="flex gap-2 border-t border-border p-3">
              <input
                ref={campo}
                value={pregunta}
                onChange={(evento) => setPregunta(evento.target.value)}
                maxLength={500}
                required
                aria-label="Tu pregunta al asistente"
                placeholder="Escribe tu pregunta"
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-base text-foreground outline-none focus:border-primary sm:text-sm"
              />
              <button
                type="submit"
                disabled={enviando || sesion === "cargando"}
                aria-label="Enviar pregunta al asistente"
                className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </section>
      ) : null}
      <button
        type="button"
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        aria-expanded={abierto}
        aria-label={sinLeer ? "Asistente del curso: tienes una respuesta nueva" : "Asistente del curso"}
        className="relative flex items-center gap-2 rounded-full border border-border bg-primary px-4 py-3 font-bold text-primary-foreground shadow-lg hover:bg-primary-hover"
      >
        <MessageCircle size={18} />
        <span className="hidden sm:inline">Asistente</span>
        {sinLeer ? <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-background bg-success" /> : null}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Las e2e con el orden normal y el README**

`e2e/calentar.ts` completo:
```ts
import { chromium } from "@playwright/test";

// En desarrollo, Next compila cada ruta la primera vez que se pide. Si eso ocurre con varias pruebas en
// paralelo, las recompilaciones abortan navegaciones de otras pruebas (net::ERR_ABORTED). Se piden las
// rutas una vez, en orden, antes de empezar. Contra el build de producción no cuesta nada.
const RUTAS = [
  "/",
  "/login",
  "/registro",
  "/rutas",
  "/buscar",
  "/buscar/indice.json",
  "/reportar",
  "/lun4t1k0",
  "/nosotros",
  "/casos/herramientas-del-oficio",
  "/casos/herramientas-del-oficio/01-tu-primer-repositorio",
  "/casos/herramientas-del-oficio/02-escribe-un-readme",
  "/casos/clases-de-excel",
  "/casos/clases-de-excel/02-primera-formula",
  "/casos/clases-de-excel/22-excel-vs-base-de-datos",
  "/casos/despachos-rapidos",
  "/casos/despachos-rapidos/04-buscar-en-otra-tabla",
  "/casos/despachos-rapidos/08-revisar-la-formula-de-la-ia",
  "/casos/clases-de-sql",
  "/casos/clases-de-sql/01-select-basico",
  "/casos/minimarkets-del-sur",
  "/casos/minimarkets-del-sur/06-cruzar-tablas",
  "/casos/clases-de-python",
  "/casos/clases-de-python/02-operadores",
  "/casos/tienda-online-pewen",
  "/casos/tienda-online-pewen/03-filtrar-y-seleccionar",
  "/casos/clases-de-power-bi",
  "/casos/clases-de-power-bi/02-instalar-y-conectar-datos",
  "/casos/clinica-cordillera-central",
  "/casos/clinica-cordillera-central/03-calcular-indicadores",
  "/casos/clases-de-ia-para-datos",
  "/casos/clases-de-ia-para-datos/03-calidad-de-datos",
  "/casos/proyecto-final",
  "/casos/proyecto-final/01-elegir-tus-datos",
  "/casos/proyecto-final/02-leer-un-archivo-publico",
  "/casos/demo-motor",
  "/casos/demo-motor/01-clientes-de-regiones",
  "/casos/demo-motor/02-total-de-ventas",
  "/casos/demo-motor/03-ticket-promedio",
  "/dashboard",
  "/dashboard/mensajes",
  "/perfil",
  "/p/calentamiento",
  "/verificar/calentamiento",
  "/certificados/calentamiento",
  "/profesor",
  "/profesor/entregables",
  "/admin",
  "/admin/reportes",
  "/admin/bitacora",
];

// Las e2e usan la misma base que el desarrollo local: si quedó encendido el orden libre para todos (desde la
// administración), las pruebas que esperan bloqueos fallan. Se deja en el orden normal antes de empezar.
async function dejarOrdenNormal(): Promise<void> {
  const navegador = await chromium.launch();
  try {
    const ip = `10.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;
    const contexto = await navegador.newContext({ baseURL: "http://localhost:3000", extraHTTPHeaders: { "x-forwarded-for": ip } });
    const pagina = await contexto.newPage();
    await pagina.goto("/login");
    await pagina.locator('input[name="email"]').fill("admin@local.test");
    await pagina.locator('input[name="password"]').fill("admin123456");
    await pagina.getByRole("button", { name: "Entrar", exact: true }).click();
    await pagina.waitForURL(/\/dashboard/);
    const respuesta = await pagina.request.patch("/api/admin/ajustes", { headers: { Origin: "http://localhost:3000" }, data: { ordenLibre: false } });
    if (!respuesta.ok()) throw new Error(`No se pudo dejar el orden normal: ${respuesta.status()}`);
  } finally {
    await navegador.close();
  }
}

export default async function calentar(): Promise<void> {
  for (const ruta of RUTAS) {
    try {
      await fetch(`http://localhost:3000${ruta}`, { redirect: "manual", signal: AbortSignal.timeout(60_000) });
    } catch {
      // Una ruta que no responde se compila igual en su prueba; el calentamiento nunca hace fallar la suite.
    }
  }
  await dejarOrdenNormal();
}
```

En `README.md`, en "Mapa de la ruta", la oración "La lógica está en `lib/rutas/mapa.ts`." queda:
```markdown
La tarjeta donde está la persona dice **Estás aquí** y lleva un botón **Continuar**, y una leyenda plegable ("¿Cómo leer este mapa?") traduce el lenguaje git. La lógica está en `lib/rutas/mapa.ts`.
- **Avance en un caso:** cada misión o lección muestra su estado con color, ícono y texto (pendiente, en curso, aprobada o bloqueada), y la siguiente se destaca con "Empieza aquí" o "Continuar aquí" (`lib/progreso/estados.ts`). En el teléfono, el botón del asistente se esconde al bajar por la página y vuelve al subir.
```

- [ ] **Step 5: Correr todo**

Run: `npm run test:e2e -- tests/avance.spec.ts tests/asistente.spec.ts --repeat-each 2`
Expected: `10 passed`.

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec tsc --noEmit && pnpm -r --if-present test"`
Expected: sin errores de tipos; web 377 pruebas.

Run: `npm run test:e2e`
Expected: `64 passed`, dos corridas seguidas.

Revisa en el navegador un caso con avance y el mapa, en el teléfono y en los dos temas.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/rutas/mapa-ruta.tsx apps/web/src/components/ia/asistente-flotante.tsx e2e/calentar.ts e2e/tests/avance.spec.ts README.md
git commit -m "feat(avance): estas aqui y continuar en el mapa, leyenda del lenguaje git y asistente que no tapa en el telefono

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Fase 8e: mantenimiento para la administración y los docentes** (hallazgos 3 y 4 de la auditoría):
- paginación donde falta (solicitudes y reseñas, preguntas y entregables del docente, clases);
- archivar clases;
- acciones con íconos y confirmación.
