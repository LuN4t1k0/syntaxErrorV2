# Fase 6b: Clases de Excel. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Traer las 23 lecciones del aula de Excel de la v1 como "Clases de Excel", entre el Caso 0 (Herramientas del oficio) y el Caso 1 (Despachos Rápidos), sin reescribirlas. Para eso la plataforma suma dos piezas que también van a servir para Python y Power BI: planillas propias de cada lección y lecciones de lectura.

**Architecture:**
- **Planilla propia:** `SheetTask` acepta `grilla`, la planilla de la lección fila por fila desde A1, como alternativa a `hoja` (un CSV de `datos/`). Debe venir exactamente una de las dos. Se corresponde directo con el `initialGrid` de cada lección de la v1.
- **Lecturas:** `<LecturaTask pregunta respuesta />` es una tarea sin validación automática, como las lecturas de la v1 ("Para reflexionar" y "Marcar como completada").
  - Muestra la pregunta; al marcarla, aparece la respuesta del curso y la lección queda aprobada.
  - Cuenta como tarea práctica para el validador. Power BI tiene varias lecciones de este tipo.
- **`<Sintaxis>`** acepta `lenguaje="planilla"`: muestra la fórmula sin resaltado.
- **El importador** generaliza su formato común (`leccion.ts`) a tres tipos de tarea (consulta SQL, planilla y lectura), y suma el adaptador `aula-excel.ts`.
  - La v1 guardaba solo el valor esperado de cada celda. La fórmula de la solución se saca de la pista ("En D2 escribe =B2*C2", "D3 =MAX(B2:B5)", "E2=C2*D2").
  - Cuando la pista dice "repite la misma lógica en C3 y C4", la fórmula se baja de fila como al arrastrarla.
  - Sin fórmula, la solución es el valor esperado (lección 1: escribir un monto).
  - El validador comprueba que cada solución dé el valor esperado: las 21 lo dan en el motor de la v2.
  - En Excel no se protegen los títulos de columna al corregir tildes (en SQL sí, porque se escriben en las consultas): el texto dice "descripción" aunque la columna se llame `descripcion`. La planilla queda tal cual.
- **Revisión editorial,** sin reescribir el contenido:
  - tildes que dependen del contexto ("está", "cuánto", "quién") y los "¿" que faltaban en las preguntas;
  - dos pistas por lección que orientan sin dar la fórmula (las de la v1 la traían).

**Tech Stack:** Zod, MDX 3, HyperFormula 3.4.0 (esES), Vitest 4 y Playwright 1.55.

**Spec:** `docs/propuesta-pedagogica-data-analyst.md`, sección 3 (clases) y decisión 6 (traer el contenido de las aulas sin reescribirlo), actualizada con el orden Caso 0 → clases de Excel → Caso 1. Acuerdo del 2026-10-02: incorporar los cursos de la v1 uno a uno, sin reescribir; todo en local, sin despliegue.

## Global Constraints

**Copia literal:** cada archivo completo de este plan se copia exactamente como está, con sus comentarios. Las 23 lecciones son la versión final después de la revisión editorial: compáralas con `diff` contra el plan antes del commit.

**Entorno**
- Todo se ejecuta con `docker compose run --rm tools ...`, salvo la exportación del aula (Task 3), que usa el Node del equipo.
- El paquete de la app se llama `web`.

**Contenido:** no se reescribe el texto de la v1. La planilla de cada lección se copia sin cambios, incluidos sus valores sin tilde ("tecnologia", "Venta maxima"), porque son los datos que revisa la tarea.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Una tarea de planilla sin hoja ni grilla, o con las dos:** el esquema la rechaza. Probado en `bloques.test.ts`.
2. **Una solución de Excel que no da el valor esperado,** por ejemplo una fórmula mal sacada de la pista o una función que HyperFormula no conoce: el validador lo informa con el valor obtenido. Probado en `validar.test.ts`.
3. **El texto de la pista que no es fórmula** ("D5 = BUSCARV(...) = Mouse" en la explicación) no se toma como solución, y una fórmula con comillas y paréntesis ('=MAYUSC(A2)&" ("&B2&")"') se lee completa. Probado en `aula-excel.test.ts`.
4. **Una lectura se aprueba sin validar nada,** pero solo cuando la persona la marca, y el Caso 1 sigue bloqueado hasta completar las 23 lecciones. Probado en `clases.spec.ts` y en `despachos.spec.ts`.
5. **Una corrección de tildes que rompe un nombre de columna dentro de una fórmula del enunciado** ("&categoria&"): la revisión editorial la deja sin tilde. Revisado en la lección 23.

## Estructura de archivos

```
packages/content/src/esquemas.ts, datos.ts, validar.ts (+ bloques.test, validar.test)   grilla y LecturaTask
apps/web/src/components/mision/lectura-task.tsx, componentes.tsx                        pantallas
packages/content/src/importar/leccion.ts, aula-excel.ts (+ test), importar-cli.ts        importador
content/casos/clases-de-excel/ (caso.yaml y 23 lecciones), content/rutas/data-analyst.yaml
apps/web/src/db/release.test.ts                                                           9 casos
e2e/tests/progreso.ts, clases.spec.ts, despachos, minimarkets, pewen, clinica y proyecto-final .spec.ts, e2e/calentar.ts
README.md
```

---

### Task 1: Planillas propias y lecturas

**Files:**
- Modify: `packages/content/src/esquemas.ts`, `packages/content/src/datos.ts`, `packages/content/src/validar.ts`
- Test: `packages/content/src/bloques.test.ts`, `packages/content/src/validar.test.ts`
- Create: `apps/web/src/components/mision/lectura-task.tsx`
- Modify: `apps/web/src/components/mision/componentes.tsx`

**Interfaces:**
- Produces:
  - `SheetTask.hoja` pasa a ser opcional, y se suma `SheetTask.grilla?: (string | number | null)[][]`: exactamente una de las dos;
  - `hojaDeTarea(caso, { hoja?, grilla?, otras, inicial })`; con `grilla`, la hoja se llama `Hoja1`;
  - el bloque `LecturaTask: { id, pregunta, respuesta, pistas }`, que suma `"LecturaTask"` a `TIPOS_TAREA`;
  - `Sintaxis.lenguaje` acepta `"planilla"`;
  - `<LecturaTask id pregunta respuesta />`.

- [ ] **Step 1: Escribir las pruebas**

En `packages/content/src/bloques.test.ts`, reemplaza el `});` que cierra `describe("tareas de planilla con varias hojas", ...)`, al final del archivo, por la prueba de la grilla, ese cierre y el `describe` de las lecturas:
```ts
  it("la planilla viene de un CSV (hoja) o escrita en la lección (grilla), una de las dos", async () => {
    const { bloqueSchemas } = await import("./esquemas");
    const base = { id: "x", celdas: [{ celda: "B3", valor: 310000 }], solucion: { B3: 310000 } };
    expect(bloqueSchemas.SheetTask.parse({ ...base, grilla: [["vendedor", "monto"], ["Diego", null]] })).toMatchObject({ grilla: [["vendedor", "monto"], ["Diego", null]] });
    expect(bloqueSchemas.SheetTask.safeParse(base).success).toBe(false);
    expect(bloqueSchemas.SheetTask.safeParse({ ...base, hoja: "ventas", grilla: [["a"]] }).success).toBe(false);
  });
});

describe("lecturas", () => {
  it("tienen una pregunta y la respuesta del curso", async () => {
    const { bloqueSchemas } = await import("./esquemas");
    expect(bloqueSchemas.LecturaTask.parse({ id: "x", pregunta: "¿Excel o una base?", respuesta: "Una base." })).toEqual({ id: "x", pregunta: "¿Excel o una base?", respuesta: "Una base.", pistas: [] });
    expect(bloqueSchemas.LecturaTask.safeParse({ id: "x", pregunta: "¿Excel o una base?" }).success).toBe(false);
  });
});
```

En `packages/content/src/validar.test.ts`:
1. El mensaje esperado de "rechaza una misión sin tarea práctica" pasa a terminar en `(SqlTask, PythonTask, SheetTask, MarkdownTask, GithubTask o LecturaTask)`.
2. En "una tarea de planilla no puede consultar su propia hoja", `tarea.props.otras = [tarea.props.hoja];` pasa a `tarea.props.otras = [tarea.props.hoja ?? ""];`.
3. Antes de `it("una tarea de GitHub cuenta como tarea práctica ...")`, agrega:
```ts
  it("una tarea de planilla con su propia grilla se valida con su solución", async () => {
    const filtrar = mision("01-filtrar");
    const tarea = (solucion: Record<string, string | number>) => ({
      tipo: "SheetTask" as const,
      props: { id: "primera-formula", grilla: [["producto", "precio", "cantidad", "total"], ["Notebook", 450000, 3, null]], otras: [], inicial: {}, celdas: [{ celda: "D2", valor: 1350000 }], solucion, pistas: [] },
      texto: null,
    });
    filtrar.bloques.push(tarea({ D2: "=B2*C2" }));
    expect(await validar()).toEqual([]);
    filtrar.bloques.push({ ...tarea({ D2: "=B2+C2" }), props: { ...tarea({ D2: "=B2+C2" }).props, id: "otra" } });
    expect(await validar()).toContain('casos/ventas/misiones/01-filtrar.mdx: la solución de la tarea "otra" no pasa su propio validador: La celda D2 muestra "450003" y se espera "1350000".');
  });

  it("una lectura cuenta como tarea práctica y no tiene solución que validar", async () => {
    const filtrar = mision("01-filtrar");
    filtrar.bloques = filtrar.bloques.filter((candidato) => candidato.tipo !== "SqlTask");
    filtrar.bloques.push({ tipo: "LecturaTask", props: { id: "lectura", pregunta: "¿Excel o una base de datos?", respuesta: "Una base de datos.", pistas: [] }, texto: null });
    expect(await validar()).toEqual([]);
  });
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/bloques.test.ts src/validar.test.ts`
Expected: FAIL. `grilla` y `LecturaTask` no existen.

- [ ] **Step 3: Implementar el contenido**

En `packages/content/src/esquemas.ts`:
1. `SheetTask` se reemplaza por:
```ts
  SheetTask: z
    .object({
      id: idTarea,
      enunciado: z.string().optional(),
      // La planilla sale de un CSV de datos/ (hoja) o viene escrita en la lección (grilla), como en las aulas de la v1.
      hoja: nombreHoja.optional(),
      grilla: z.array(z.array(z.union([z.string(), z.number(), z.null()]))).min(1, "la grilla necesita al menos una fila").optional(),
      // Hojas de consulta (por ejemplo comunas), que se leen con referencias como comunas!A2:E13.
      otras: z.array(nombreHoja).default([]),
      // Celdas escritas de antemano: títulos de columna, un valor de referencia o una fórmula a corregir.
      inicial: z.record(rangoCeldas, contenidoCelda).default({}),
      celdas: z.array(celdaEsperada).min(1, "indica al menos una celda a revisar"),
      solucion: z.record(rangoCeldas, contenidoCelda),
      pistas,
    })
    .refine((tarea) => (tarea.hoja === undefined) !== (tarea.grilla === undefined), {
      message: "indica la hoja (un CSV de datos/) o la grilla, una de las dos",
      path: ["hoja"],
    }),
```
2. Antes del comentario del `Debrief` ("En una lección de clases, el cierre ..."), agrega:
```ts
  // Una lección de lectura de las aulas de la v1: una pregunta para pensar y la respuesta del curso, que se ve al
  // marcarla como completada. No tiene validación automática.
  LecturaTask: z.object({ id: idTarea, pregunta: texto, respuesta: texto, pistas }),
```
3. En `Sintaxis`, el lenguaje queda `z.enum(["sql", "python", "planilla"])`.
4. `TIPOS_TAREA` queda:
```ts
export const TIPOS_TAREA = ["SqlTask", "PythonTask", "SheetTask", "MarkdownTask", "GithubTask", "LecturaTask"] as const;
```

En `packages/content/src/datos.ts`, `hojaDeTarea` queda:
```ts
export function hojaDeTarea(
  caso: Caso,
  tarea: { hoja?: string; grilla?: (string | number | null)[][]; otras: string[]; inicial: Record<string, string | number> }
): { grilla: Grilla; opciones: OpcionesHoja } {
  const otras = Object.fromEntries(tarea.otras.map((nombre) => [nombre, grillaDeHoja(caso, nombre)]));
  // Una grilla escrita en la lección no viene de datos/: la hoja se llama como en una planilla nueva.
  if (tarea.grilla) return { grilla: tarea.grilla.map((fila) => fila.map((celda) => celda ?? "")), opciones: { nombre: "Hoja1", otras, inicial: tarea.inicial } };
  if (!tarea.hoja) throw new Error("La tarea de planilla necesita hoja o grilla");
  return { grilla: grillaDeHoja(caso, tarea.hoja), opciones: { nombre: tarea.hoja, otras, inicial: tarea.inicial } };
}
```

`packages/content/src/validar.ts` completo:
```ts
import { revisarMarkdown } from "@syntaxerror/engines/markdown";
import { aplicarSolucion, revisarHoja } from "@syntaxerror/engines/sheet";
import { revisarSql } from "@syntaxerror/engines/sql";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { hojaDeTarea, tablasSql } from "./datos";
import type { BloqueTarea, PropsBloque } from "./esquemas";
import { tareasDeMision } from "./publicacion";
import type { Caso, Contenido } from "./tipos";

export type RevisorPython = (tarea: PropsBloque<"PythonTask">, caso: Caso) => Promise<ResultadoTarea>;

const MAXIMO_PALABRAS_BRIEF = 150;
const BLOQUES_DE_GUIA = new Set(["Concepto", "SqlEjemplo", "PythonEjemplo", "Sintaxis"]);

// Para comparar una pista con la solución sin que importen los espacios, el punto y coma final ni las mayúsculas.
const normalizarCodigo = (codigo: string) => codigo.replace(/\s+/g, " ").replace(/;\s*$/, "").trim().toLowerCase();

// Las pistas orientan; la respuesta la escribe la persona (propuesta pedagógica, sección 6). Las aulas de la v1 tenían
// pistas con la consulta completa: esta regla evita que se cuelen al importarlas.
function pistaConSolucion(tarea: BloqueTarea): string | undefined {
  if (tarea.tipo !== "SqlTask" && tarea.tipo !== "PythonTask") return undefined;
  const solucion = normalizarCodigo(tarea.props.solucion);
  return tarea.props.pistas.find((pista) => normalizarCodigo(pista).includes(solucion));
}

function contarPalabras(texto: string): number {
  return texto.split(/\s+/).filter(Boolean).length;
}

async function revisarSolucion(tarea: BloqueTarea, caso: Caso, revisarPython: RevisorPython): Promise<ResultadoTarea> {
  switch (tarea.tipo) {
    case "SqlTask": {
      const tablas = tablasSql(caso);
      if (Object.keys(tablas).length === 0) return { aprobada: false, diagnostico: "el caso no tiene tablas en datos/" };
      return revisarSql(tablas, tarea.props, tarea.props.solucion);
    }
    case "SheetTask": {
      if (tarea.props.hoja && tarea.props.otras.includes(tarea.props.hoja)) return { aprobada: false, diagnostico: `la hoja ${tarea.props.hoja} no puede ser también una hoja de consulta` };
      const { grilla, opciones } = hojaDeTarea(caso, tarea.props);
      return revisarHoja(aplicarSolucion(grilla, tarea.props.solucion, opciones), tarea.props);
    }
    case "PythonTask":
      return revisarPython(tarea.props, caso);
    case "MarkdownTask":
      return revisarMarkdown(tarea.props.solucion, tarea.props.requisitos);
    case "GithubTask":
      // Se revisa contra el repositorio de cada persona: no hay una solución que validar de antemano.
      return { aprobada: true, diagnostico: null };
    case "LecturaTask":
      // Una lectura se completa al marcarla: no hay solución que validar.
      return { aprobada: true, diagnostico: null };
  }
}

export async function validarContenido(contenido: Contenido, { revisarPython }: { revisarPython: RevisorPython }): Promise<string[]> {
  const problemas: string[] = [];
  for (const caso of contenido.casos) {
    for (const mision of caso.misiones) {
      const donde = `casos/${caso.slug}/misiones/${mision.slug}.mdx`;
      const tareas = tareasDeMision(mision);
      if (tareas.length === 0) problemas.push(`${donde}: la misión no tiene ninguna tarea práctica (SqlTask, PythonTask, SheetTask, MarkdownTask, GithubTask o LecturaTask)`);
      for (const bloque of mision.bloques) {
        if (bloque.tipo !== "Brief") continue;
        const palabras = contarPalabras(bloque.texto ?? "");
        if (palabras > MAXIMO_PALABRAS_BRIEF) problemas.push(`${donde}: el Brief tiene ${palabras} palabras (máximo ${MAXIMO_PALABRAS_BRIEF})`);
      }
      const vistos = new Set<string>();
      for (const tarea of tareas) {
        if (vistos.has(tarea.props.id)) problemas.push(`${donde}: el id de tarea "${tarea.props.id}" está repetido`);
        vistos.add(tarea.props.id);
      }
      if (mision.sinGuia) {
        for (const bloque of mision.bloques) {
          if (BLOQUES_DE_GUIA.has(bloque.tipo)) problemas.push(`${donde}: una misión sin guía no puede tener <${bloque.tipo}>`);
        }
        for (const tarea of tareas) {
          if (tarea.props.pistas.length > 0) problemas.push(`${donde}: una misión sin guía no puede tener pistas (tarea "${tarea.props.id}")`);
        }
      }
      for (const tarea of tareas) {
        if (pistaConSolucion(tarea)) problemas.push(`${donde}: una pista de la tarea "${tarea.props.id}" trae la solución completa`);
        let resultado: ResultadoTarea;
        try {
          resultado = await revisarSolucion(tarea, caso, revisarPython);
        } catch (error) {
          resultado = { aprobada: false, diagnostico: error instanceof Error ? error.message : String(error) };
        }
        if (!resultado.aprobada) {
          problemas.push(`${donde}: la solución de la tarea "${tarea.props.id}" no pasa su propio validador: ${resultado.diagnostico ?? "sin detalle"}`);
        }
      }
    }
    const publicado = contenido.rutas.some((ruta) => ruta.estado === "publicada" && ruta.casos.includes(caso.slug));
    const ultima = caso.misiones.at(-1);
    // En unas clases no se exige: el caso que viene después hace de misión sin guía.
    if (publicado && caso.tipo === "caso" && ultima && !ultima.sinGuia) {
      problemas.push(`casos/${caso.slug}: la última misión (${ultima.slug}) debe ser sin guía: agrega sinGuia: true a su frontmatter`);
    }
  }
  return problemas;
}
```

- [ ] **Step 4: Implementar las pantallas**

`apps/web/src/components/mision/lectura-task.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";

// Una lección de lectura de las aulas de la v1: se piensa la pregunta y, al marcarla como completada, aparece la
// respuesta del curso. No tiene validación automática, igual que en la v1.
export function LecturaTask({ id, pregunta, respuesta }: { id: string; pregunta: string; respuesta: string }) {
  const { tareaAprobada, registrarResultado } = useMision();
  const [vista, setVista] = useState(false);
  const aprobada = tareaAprobada(id);
  function completar() {
    setVista(true);
    registrarResultado(id, { aprobada: true });
  }
  return (
    <PanelTarea
      id={id}
      titulo="para reflexionar"
      enunciado={pregunta}
      aprobada={aprobada}
      resultado={null}
      pistas={[]}
      acciones={aprobada ? null : <Button type="button" onClick={completar}>Ver la respuesta y marcar como completada</Button>}
    >
      {aprobada || vista ? (
        <p className="rounded-md bg-surface-raised p-4 text-sm leading-6">{respuesta}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Piensa tu respuesta antes de ver la del curso.</p>
      )}
    </PanelTarea>
  );
}
```

`apps/web/src/components/mision/componentes.tsx` completo:
```tsx
import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
import { hojaDeTarea, tablasSql } from "@syntaxerror/content/datos";
import { bloqueSchemas } from "@syntaxerror/content/esquemas";
import type { Caso } from "@syntaxerror/content/tipos";
import { calcularEsperado } from "@syntaxerror/engines/sql";
import { CodigoResaltado } from "@/components/consola/codigo-resaltado";
import { unidad } from "@/lib/unidad";
import { Brief, Concepto } from "./bloques";
import { Debrief } from "./debrief";
import { Decision } from "./decision";
import { GithubTask } from "./github-task";
import { LecturaTask } from "./lectura-task";
import { MarkdownTask } from "./markdown-task";
import { PythonEjemplo } from "./python-ejemplo";
import { PythonTask } from "./python-task";
import { SheetTask } from "./sheet-task";
import { SqlEjemplo } from "./sql-ejemplo";
import { SqlTask } from "./sql-task";

type PropsMdx = Record<string, unknown> & { children?: ReactNode };

export function componentesMision(caso: Caso): MDXComponents {
  const tablas = tablasSql(caso);
  return {
    Brief: ({ children, ...props }: PropsMdx) => <Brief {...bloqueSchemas.Brief.parse(props)}>{children}</Brief>,
    Concepto: ({ children }: PropsMdx) => <Concepto>{children}</Concepto>,
    SqlEjemplo: (props: PropsMdx) => {
      const ejemplo = bloqueSchemas.SqlEjemplo.parse(props);
      return <SqlEjemplo {...ejemplo} tablas={tablas} resaltado={<CodigoResaltado codigo={ejemplo.consulta} lenguaje="sql" />} />;
    },
    PythonEjemplo: (props: PropsMdx) => {
      const ejemplo = bloqueSchemas.PythonEjemplo.parse(props);
      return <PythonEjemplo {...ejemplo} resaltado={<CodigoResaltado codigo={ejemplo.codigo} lenguaje="python" />} />;
    },
    SqlTask: (props: PropsMdx) => {
      const { solucion, ...tarea } = bloqueSchemas.SqlTask.parse(props);
      const esperadas = calcularEsperado(tablas, { solucion, comparar: tarea.comparar, verificar: tarea.verificar });
      return <SqlTask {...tarea} esperadas={esperadas} tablas={tablas} />;
    },
    SheetTask: (props: PropsMdx) => {
      const { solucion: _solucion, ...resto } = bloqueSchemas.SheetTask.parse(props);
      const { grilla, opciones } = hojaDeTarea(caso, resto);
      const { hoja: _hoja, grilla: _grilla, otras: _otras, inicial: _inicial, ...tarea } = resto;
      return <SheetTask {...tarea} grilla={grilla} opciones={opciones} />;
    },
    PythonTask: (props: PropsMdx) => {
      const { solucion: _solucion, paquetes: _paquetes, ...tarea } = bloqueSchemas.PythonTask.parse(props);
      return <PythonTask {...tarea} />;
    },
    MarkdownTask: (props: PropsMdx) => {
      const { solucion: _solucion, ...tarea } = bloqueSchemas.MarkdownTask.parse(props);
      return <MarkdownTask {...tarea} />;
    },
    GithubTask: (props: PropsMdx) => <GithubTask {...bloqueSchemas.GithubTask.parse(props)} />,
    LecturaTask: (props: PropsMdx) => {
      const { pistas: _pistas, ...tarea } = bloqueSchemas.LecturaTask.parse(props);
      return <LecturaTask {...tarea} />;
    },
    Decision: (props: PropsMdx) => <Decision {...bloqueSchemas.Decision.parse(props)} />,
    Debrief: ({ children, ...props }: PropsMdx) => (
      <Debrief {...bloqueSchemas.Debrief.parse(props)} unidad={unidad(caso.tipo)}>
        {children}
      </Debrief>
    ),
    Sintaxis: (props: PropsMdx) => {
      const { codigo, lenguaje } = bloqueSchemas.Sintaxis.parse(props);
      return (
        <figure className="grid gap-2 rounded-md border border-dashed border-border p-4">
          <figcaption className="font-mono text-xs font-bold uppercase text-muted-foreground">Sintaxis</figcaption>
          {/* Las fórmulas de planilla no tienen resaltado: se muestran tal cual. */}
          {lenguaje === "planilla" ? <pre className="overflow-x-auto font-mono text-sm leading-6">{codigo}</pre> : <CodigoResaltado codigo={codigo} lenguaje={lenguaje} />}
        </figure>
      );
    },
  };
}
```

- [ ] **Step 5: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content test && pnpm --filter @syntaxerror/content exec tsc --noEmit && pnpm --filter web exec tsc --noEmit"`
Expected: PASS y sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add packages/content/src/esquemas.ts packages/content/src/datos.ts packages/content/src/validar.ts packages/content/src/bloques.test.ts packages/content/src/validar.test.ts apps/web/src/components/mision
git commit -m "feat(contenido): planillas propias de cada leccion y lecturas que se completan al marcarlas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: El adaptador de Excel

**Files:**
- Modify: `packages/content/src/importar/leccion.ts`, `packages/content/src/importar/importar-cli.ts`
- Create: `packages/content/src/importar/aula-excel.ts`
- Test: `packages/content/src/importar/aula-excel.test.ts`; ajustes en `leccion.test.ts` y `aula-sql.test.ts`

**Interfaces:**
- Consumes: el formato común de la Fase 6a.
- Produces:
  - en `importar/leccion`: los tipos `Celda`, `TareaHoja`, `TareaLectura` y `Tarea` (la unión de los tres tipos de tarea), y `Seccion.formula`. `Leccion.sintaxis.lenguaje` acepta `"planilla"`;
  - en `importar/aula-excel`: `LeccionExcelV1`, `convertirLeccionExcel(v1, numero)`, `solucionExcel(v1)`, `formulasDelTexto(texto)`, `leerFormula(texto, desde)`, `moverFormula(formula, filas)` y `pistaExcelUtil(pista)`;
  - el comando `importar <sql|excel> <aula.json> <destino> <lecciones>`.

- [ ] **Step 1: Escribir las pruebas**

`packages/content/src/importar/aula-excel.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { convertirLeccionExcel, formulasDelTexto, leerFormula, moverFormula, pistaExcelUtil, solucionExcel, type LeccionExcelV1 } from "./aula-excel";

const base: LeccionExcelV1 = {
  slug: "la-funcion-si",
  title: "La funcion SI",
  duration: "14 min",
  type: "exercise",
  intro: ["SI sirve para tomar una decision."],
  syntaxExample: '=SI(condicion;"si";"no")',
  sections: [
    { heading: "Concepto principal", body: ["Una formula con SI."], formula: '=SI(condicion;"si";"no")' },
    { heading: "Uso", body: ["Para alertas."], formula: "=SI(B2<5;1;0)" },
  ],
  initialGrid: [["producto", "stock", "estado"], ["Notebook", 8, null], ["Mouse", 2, null], ["Teclado", 15, null]],
  targetCells: ["C2", "C3", "C4"],
  expectedValues: ["Stock ok", "Stock bajo", "Stock ok"],
  prompt: "Completa C2:C4 segun el stock.",
  hint: 'En C2 puedes usar =SI(B2<5;"Stock bajo";"Stock ok"). Luego repite la misma logica en C3 y C4.',
  explanation: "Solo Mouse tiene stock menor a 5.",
};

describe("fórmulas de las pistas", () => {
  it("lee una fórmula hasta el punto final, sin cortarla en los paréntesis ni en las comillas", () => {
    const texto = 'Usa =MAYUSC(A2)&" ("&B2&")". Después sigue.';
    expect(leerFormula(texto, texto.indexOf("="))).toBe('=MAYUSC(A2)&" ("&B2&")"');
  });

  it("asocia cada fórmula a su celda y se queda con la primera", () => {
    expect(formulasDelTexto("En D2 escribe =B2*C2. B2 es el precio.")).toEqual({ D2: "=B2*C2" });
    expect(formulasDelTexto("Usa el mismo rango: D2 =CONTAR(B2:B5), D3 =MAX(B2:B5), D4 =MIN(B2:B5).")).toEqual({ D2: "=CONTAR(B2:B5)", D3: "=MAX(B2:B5)", D4: "=MIN(B2:B5)" });
    expect(formulasDelTexto("Usa E2=C2*D2 y E3=C3*D3.")).toEqual({ E2: "=C2*D2", E3: "=C3*D3" });
    expect(formulasDelTexto("D5 = BUSCARV(B5,A2:C4,2,0) = Mouse.")).toEqual({});
  });

  it("baja una fórmula de fila como al arrastrarla, sin mover las referencias fijas ni el texto", () => {
    expect(moverFormula('=SI(B2<5;"B2 bajo";$B$5)', 2)).toBe('=SI(B4<5;"B2 bajo";$B$5)');
    expect(moverFormula("=B2*(1+$B$5)", 1)).toBe("=B3*(1+$B$5)");
  });

  it("la solución usa la fórmula de la pista, la repite en la misma columna o, sin fórmula, el valor esperado", () => {
    expect(solucionExcel(base)).toEqual({ C2: '=SI(B2<5;"Stock bajo";"Stock ok")', C3: '=SI(B3<5;"Stock bajo";"Stock ok")', C4: '=SI(B4<5;"Stock bajo";"Stock ok")' });
    expect(solucionExcel({ ...base, targetCells: ["B3"], expectedValues: [310000], hint: "Escribe el monto en B3." })).toEqual({ B3: 310000 });
  });

  it("descarta las pistas que traen una fórmula", () => {
    expect(pistaExcelUtil("En D2 escribe =B2*C2.")).toEqual([]);
    expect(pistaExcelUtil("Busca la fila de Diego.")).toEqual(["Busca la fila de Diego."]);
  });
});

describe("convertirLeccionExcel", () => {
  it("convierte un ejercicio con su propia planilla, sin repetir la sintaxis en las secciones", () => {
    const leccion = convertirLeccionExcel(base, 9);
    expect(leccion).toMatchObject({ slug: "09-la-funcion-si", titulo: "La función SI", intro: ["SI sirve para tomar una decisión."], sintaxis: { lenguaje: "planilla", codigo: base.syntaxExample } });
    expect(leccion.secciones.map((seccion) => seccion.formula)).toEqual([null, "=SI(B2<5;1;0)"]);
    expect(leccion.tarea).toMatchObject({
      tipo: "SheetTask",
      id: "la-funcion-si",
      enunciado: "Completa C2:C4 según el stock.",
      grilla: base.initialGrid,
      celdas: [{ celda: "C2", valor: "Stock ok" }, { celda: "C3", valor: "Stock bajo" }, { celda: "C4", valor: "Stock ok" }],
      pistas: [],
    });
  });

  it("una lectura pasa a LecturaTask con la pregunta y la respuesta del curso", () => {
    const lectura = convertirLeccionExcel({ slug: "excel-vs-base", title: "Excel vs. una base", duration: "12 min", type: "reading", prompt: "Excel o una base?", explanation: "Una base de datos." }, 22);
    expect(lectura.tarea).toEqual({ tipo: "LecturaTask", id: "excel-vs-base", pregunta: "Excel o una base?", respuesta: "Una base de datos." });
    expect(lectura.cierre).toBeNull();
    expect(() => convertirLeccionExcel({ ...base, initialGrid: undefined }, 1)).toThrow("no tiene planilla");
  });
});
```

Con la tarea ahora como unión de tres tipos, dos pruebas de la 6a se ajustan para compilar:
- En `aula-sql.test.ts`, `expect(sinOrden.tarea.comparar).toBe("filas-sin-orden");` pasa a `expect(sinOrden.tarea).toMatchObject({ comparar: "filas-sin-orden" });`.
- En `leccion.test.ts`, en el `toMatchObject` de la tarea, `solucion: leccion.tarea.solucion` pasa a `solucion: "SELECT nombre FROM estudiantes WHERE ciudad = 'Santiago';"`.

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/importar`
Expected: FAIL, "Failed to resolve import ./aula-excel".

- [ ] **Step 3: Implementar**

`packages/content/src/importar/leccion.ts` completo:
```ts
// Formato común de una lección importada desde un aula de la v1, y su escritura como MDX de la v2.
// Cada aula tiene su adaptador (aula-sql.ts, y después Excel, Python y Power BI) que llena este formato; el resto
// del camino (escribir el MDX, el caso.yaml y los datos) es el mismo para todas.
//
// Lo que sale de aquí es un borrador: después viene la revisión editorial (tildes que el diccionario no cubre, tono
// de tú, pistas que orientan sin dar la respuesta). El validador de contenido revisa que cada solución pase.

// Una sección del concepto: párrafos y, si la tiene, una consulta que se puede probar (ejemplo) o una fórmula de
// planilla que solo se muestra (formula).
export type Seccion = { titulo: string; parrafos: string[]; ejemplo: string | null; formula?: string | null };

export type TareaSql = {
  tipo: "SqlTask";
  id: string;
  enunciado: string;
  inicial: string;
  solucion: string;
  comparar: "filas-en-orden" | "filas-sin-orden";
  pistas: string[];
};

export type Celda = string | number | null;

export type TareaHoja = {
  tipo: "SheetTask";
  id: string;
  enunciado: string;
  // La planilla de la lección, fila por fila desde A1.
  grilla: Celda[][];
  celdas: { celda: string; valor: string | number }[];
  solucion: Record<string, string | number>;
  pistas: string[];
};

// Una lección de lectura: una pregunta para pensar y la respuesta del curso.
export type TareaLectura = { tipo: "LecturaTask"; id: string; pregunta: string; respuesta: string };

export type Tarea = TareaSql | TareaHoja | TareaLectura;

export type Leccion = {
  slug: string;
  titulo: string;
  minutos: number;
  intro: string[];
  sintaxis: { lenguaje: "sql" | "python" | "planilla"; codigo: string } | null;
  secciones: Seccion[];
  tarea: Tarea;
  // Se muestra al aprobar la lección: explica por qué la solución funciona.
  cierre: string | null;
};

// En el texto de MDX, «{» abre una expresión y «<» una etiqueta: se escriben como caracteres.
export function escaparTexto(texto: string): string {
  return texto.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;").replace(/</g, "&lt;");
}

// Los atributos van como expresión JavaScript ({"..."}): así pueden tener comillas y saltos de línea.
const atributo = (valor: string) => `{${JSON.stringify(valor)}}`;

function seccionMdx(seccion: Seccion): string {
  const partes = [`**${escaparTexto(seccion.titulo)}.** ${seccion.parrafos.map(escaparTexto).join(" ")}`];
  if (seccion.ejemplo) partes.push(`<SqlEjemplo consulta=${atributo(seccion.ejemplo)} />`);
  if (seccion.formula) partes.push(`<Sintaxis lenguaje="planilla" codigo=${atributo(seccion.formula)} />`);
  return partes.join("\n\n");
}

function tareaMdx(tarea: Tarea): string[] {
  switch (tarea.tipo) {
    case "SqlTask":
      return [
        "<SqlTask",
        `  id="${tarea.id}"`,
        `  enunciado=${atributo(tarea.enunciado)}`,
        `  inicial=${atributo(tarea.inicial)}`,
        `  solucion=${atributo(tarea.solucion)}`,
        `  comparar="${tarea.comparar}"`,
        `  pistas={${JSON.stringify(tarea.pistas)}}`,
        "/>",
      ];
    case "SheetTask":
      return [
        "<SheetTask",
        `  id="${tarea.id}"`,
        `  enunciado=${atributo(tarea.enunciado)}`,
        `  grilla={${JSON.stringify(tarea.grilla)}}`,
        `  celdas={${JSON.stringify(tarea.celdas)}}`,
        `  solucion={${JSON.stringify(tarea.solucion)}}`,
        `  pistas={${JSON.stringify(tarea.pistas)}}`,
        "/>",
      ];
    case "LecturaTask":
      return ["<LecturaTask", `  id="${tarea.id}"`, `  pregunta=${atributo(tarea.pregunta)}`, `  respuesta=${atributo(tarea.respuesta)}`, "/>"];
  }
}

export function leccionAMdx(leccion: Leccion): string {
  const concepto = [
    ...leccion.intro.map(escaparTexto),
    ...(leccion.sintaxis ? [`<Sintaxis lenguaje="${leccion.sintaxis.lenguaje}" codigo=${atributo(leccion.sintaxis.codigo)} />`] : []),
    ...leccion.secciones.map(seccionMdx),
  ];
  const lineas = [
    "---",
    `titulo: ${JSON.stringify(leccion.titulo)}`,
    `tiempo: ${leccion.minutos}`,
    "---",
    "",
    "<Concepto>",
    concepto.join("\n\n"),
    "</Concepto>",
    "",
    ...tareaMdx(leccion.tarea),
  ];
  if (leccion.cierre) lineas.push("", "<Debrief>", escaparTexto(leccion.cierre), "</Debrief>");
  return `${lineas.join("\n")}\n`;
}

// Tildes que faltan en los textos de la v1. Solo palabras sin ambigüedad («mas» puede ser «más» o «mas», y «practica»,
// verbo o sustantivo: quedan para la revisión). No se aplica a los nombres de tablas y columnas, que se escriben sin
// tilde a propósito.
const TILDES: Record<string, string> = {
  accion: "acción",
  ademas: "además",
  agregacion: "agregación",
  ahi: "ahí",
  alfabetico: "alfabético",
  analisis: "análisis",
  analitica: "analítica",
  anio: "año",
  anios: "años",
  antiguedad: "antigüedad",
  aqui: "aquí",
  area: "área",
  aritmeticos: "aritméticos",
  asi: "así",
  automaticos: "automáticos",
  basico: "básico",
  botin: "botín",
  busqueda: "búsqueda",
  calculo: "cálculo",
  calculos: "cálculos",
  categoria: "categoría",
  categorias: "categorías",
  cirugia: "cirugía",
  codigo: "código",
  codigos: "códigos",
  como: "cómo",
  comodo: "cómodo",
  comun: "común",
  condicion: "condición",
  configuracion: "configuración",
  critico: "crítico",
  criticos: "críticos",
  cupon: "cupón",
  deberia: "debería",
  decision: "decisión",
  desafio: "desafío",
  descripcion: "descripción",
  despues: "después",
  dia: "día",
  diagnostico: "diagnóstico",
  dias: "días",
  dificil: "difícil",
  dinamica: "dinámica",
  dinamicas: "dinámicas",
  dinamico: "dinámico",
  direccion: "dirección",
  dolar: "dólar",
  dolio: "dolió",
  donde: "dónde",
  edicion: "edición",
  especifica: "específica",
  especificas: "específicas",
  evalua: "evalúa",
  exploracion: "exploración",
  expresion: "expresión",
  facil: "fácil",
  formula: "fórmula",
  formulas: "fórmulas",
  funcion: "función",
  graficos: "gráficos",
  informacion: "información",
  inscribio: "inscribió",
  inscripcion: "inscripción",
  instruccion: "instrucción",
  intentaria: "intentaría",
  interseccion: "intersección",
  leccion: "lección",
  linea: "línea",
  logica: "lógica",
  manipulacion: "manipulación",
  margenes: "márgenes",
  matematicas: "matemáticas",
  maximo: "máximo",
  mayusculas: "mayúsculas",
  mecanicos: "mecánicos",
  minimo: "mínimo",
  minusculas: "minúsculas",
  mision: "misión",
  numerica: "numérica",
  numericas: "numéricas",
  numero: "número",
  numeros: "números",
  operacion: "operación",
  pagina: "página",
  parentesis: "paréntesis",
  pelicula: "película",
  piensalo: "piénsalo",
  posicion: "posición",
  presentacion: "presentación",
  proximo: "próximo",
  quedarian: "quedarían",
  quedate: "quédate",
  rapida: "rápida",
  rapido: "rápido",
  region: "región",
  relacion: "relación",
  repeticion: "repetición",
  segun: "según",
  semaforo: "semáforo",
  sesion: "sesión",
  simultanea: "simultánea",
  solucion: "solución",
  tambien: "también",
  tendran: "tendrán",
  tenias: "tenías",
  tipico: "típico",
  todavia: "todavía",
  trio: "trío",
  ultima: "última",
  ultimo: "último",
  unica: "única",
  util: "útil",
  utiles: "útiles",
  vacia: "vacía",
  vacio: "vacío",
  valido: "válido",
  vendio: "vendió",
};

// «como» y «donde» solo llevan tilde en preguntas o títulos: se corrigen al inicio del texto o después de «¿»
// (por ejemplo «Como pensarlo» → «Cómo pensarlo»). El resto de las palabras se corrige siempre.
const SOLO_AL_INICIO = new Set(["como", "donde"]);

// Frases fijas de las aulas de la v1 que el diccionario no puede corregir solo («que» lleva tilde solo en preguntas).
const FRASES: [RegExp, string][] = [[/\bPara que sirve\b/g, "Para qué sirve"]];

// El texto entre comillas simples es un valor de los datos ('Sin inscripcion', 'Santiago'): tiene que quedar igual
// que en la solución, así que no se corrige.
export function corregirTildes(texto: string, excepto: ReadonlySet<string> = new Set()): string {
  return texto
    .split(/('[^']*')/)
    .map((parte) => (parte.startsWith("'") ? parte : corregirTramo(parte, excepto)))
    .join("");
}

function corregirTramo(texto: string, excepto: ReadonlySet<string>): string {
  const conFrases = FRASES.reduce((actual, [patron, correcta]) => actual.replace(patron, correcta), texto);
  return conFrases.replace(/(^|[^\p{L}\p{N}_])([\p{L}]+)(?=$|[^\p{L}\p{N}_])/gu, (coincidencia, antes: string, palabra: string, desde: number) => {
    const minuscula = palabra.toLowerCase();
    const correcta = TILDES[minuscula];
    if (!correcta || excepto.has(minuscula)) return coincidencia;
    if (SOLO_AL_INICIO.has(minuscula) && !(desde === 0 || /¿\s*$/.test(conFrases.slice(0, desde + antes.length)))) return coincidencia;
    const conMayuscula = palabra[0] !== palabra[0].toLowerCase();
    return `${antes}${conMayuscula ? correcta[0].toUpperCase() + correcta.slice(1) : correcta}`;
  });
}
```

`packages/content/src/importar/aula-excel.ts`:
```ts
import { corregirTildes, type Celda, type Leccion } from "./leccion";

// Adaptador del aula de Excel de la v1 (aula-excel/src/data/lessons.js, exportado a JSON).
// Cada lección trae su propia planilla (initialGrid) y los valores esperados en sus celdas. La v1 no guardaba la
// fórmula de la solución: se saca de la pista o de la explicación, y el validador comprueba que dé el valor esperado.

export type SeccionExcelV1 = { heading: string; body: string[]; formula: string | null };
export type LeccionExcelV1 = {
  slug: string;
  title: string;
  duration: string;
  type: "exercise" | "reading";
  intro?: string[];
  syntaxExample?: string | null;
  sections?: SeccionExcelV1[];
  initialGrid?: Celda[][];
  targetCells?: string[];
  expectedValues?: (string | number)[];
  prompt?: string;
  hint?: string;
  explanation?: string;
};

const CELDA = /\$?([A-Z]{1,2})\$?([1-9][0-9]*)/;

// Lee una fórmula desde su «=» hasta el primer espacio, punto o coma fuera de paréntesis y de comillas.
export function leerFormula(texto: string, desde: number): string {
  let profundidad = 0;
  let enComillas = false;
  let fin = desde + 1;
  for (; fin < texto.length; fin += 1) {
    const caracter = texto[fin];
    if (caracter === '"') enComillas = !enComillas;
    else if (enComillas) continue;
    else if (caracter === "(") profundidad += 1;
    else if (caracter === ")") profundidad -= 1;
    else if (profundidad === 0 && /[\s,]/.test(caracter)) break;
    else if (profundidad === 0 && caracter === "." && (fin + 1 === texto.length || /\s/.test(texto[fin + 1]))) break;
  }
  return texto.slice(desde, fin);
}

// Las fórmulas que la pista o la explicación asocian a una celda: «En D2 escribe =B2*C2», «D3 =MAX(B2:B5)» o
// «E2=C2*D2». Se queda con la primera de cada celda.
export function formulasDelTexto(texto: string): Record<string, string> {
  const formulas: Record<string, string> = {};
  const patron = /\b([A-Z]{1,2}[1-9][0-9]*)\s*(?:(?:escribe|usa|puedes usar)\s*)?(?==)/g;
  for (const coincidencia of texto.matchAll(patron)) {
    const celda = coincidencia[1];
    if (formulas[celda]) continue;
    const formula = leerFormula(texto, (coincidencia.index ?? 0) + coincidencia[0].length);
    if (formula.length > 1) formulas[celda] = formula;
  }
  return formulas;
}

// Baja (o sube) una fórmula de fila como al arrastrarla: cambian las filas relativas, no las fijas con $ ni el texto
// entre comillas.
export function moverFormula(formula: string, filas: number): string {
  return formula
    .split(/("[^"]*")/)
    .map((parte) =>
      parte.startsWith('"')
        ? parte
        : parte.replace(/(\$?)([A-Z]{1,2})(\$?)([1-9][0-9]*)/g, (_todo, fijaColumna: string, columna: string, fijaFila: string, fila: string) =>
            `${fijaColumna}${columna}${fijaFila}${fijaFila ? fila : Number(fila) + filas}`
          )
    )
    .join("");
}

// La solución de cada celda revisada: la fórmula de la pista; si la pista dice «repite la misma lógica», la de otra
// celda de la misma columna, movida de fila; si no hay fórmula, el valor esperado (por ejemplo, escribir un monto).
export function solucionExcel(v1: LeccionExcelV1): Record<string, string | number> {
  const formulas = { ...formulasDelTexto(v1.explanation ?? ""), ...formulasDelTexto(v1.hint ?? "") };
  const solucion: Record<string, string | number> = {};
  (v1.targetCells ?? []).forEach((celda, indice) => {
    if (formulas[celda]) {
      solucion[celda] = formulas[celda];
      return;
    }
    const [, columna, fila] = CELDA.exec(celda) ?? [];
    const vecina = Object.keys(formulas).find((otra) => CELDA.exec(otra)?.[1] === columna);
    solucion[celda] = vecina ? moverFormula(formulas[vecina], Number(fila) - Number(CELDA.exec(vecina)?.[2])) : (v1.expectedValues ?? [])[indice];
  });
  return solucion;
}

// Las pistas de la v1 suelen traer la fórmula de la respuesta: esas no se importan (la revisión escribe pistas que
// orienten sin dar la respuesta).
export function pistaExcelUtil(pista: string | undefined): string[] {
  return pista && !pista.includes("=") ? [pista] : [];
}

// En Excel el texto no usa los títulos de columna como código (a diferencia de SQL), así que se corrige todo. La
// planilla, en cambio, queda tal como en la v1: sus valores y títulos son los que revisa la tarea.
export function convertirLeccionExcel(v1: LeccionExcelV1, numero: number): Leccion {
  const texto = (valor: string) => corregirTildes(valor);
  const base = {
    slug: `${String(numero).padStart(2, "0")}-${v1.slug}`,
    titulo: texto(v1.title),
    minutos: Number.parseInt(v1.duration, 10) || 15,
    intro: (v1.intro ?? []).map(texto),
    sintaxis: v1.syntaxExample ? { lenguaje: "planilla" as const, codigo: v1.syntaxExample } : null,
    // La fórmula de una sección que repite la sintaxis de la lección no se muestra dos veces.
    secciones: (v1.sections ?? []).map((seccion) => ({
      titulo: texto(seccion.heading),
      parrafos: seccion.body.map(texto),
      ejemplo: null,
      formula: seccion.formula && seccion.formula !== v1.syntaxExample ? seccion.formula : null,
    })),
  };
  if (v1.type === "reading") {
    if (!v1.prompt || !v1.explanation) throw new Error(`La lectura ${v1.slug} no tiene pregunta o respuesta`);
    return { ...base, tarea: { tipo: "LecturaTask", id: v1.slug, pregunta: texto(v1.prompt), respuesta: texto(v1.explanation) }, cierre: null };
  }
  if (!v1.initialGrid || !v1.targetCells?.length || !v1.expectedValues || !v1.prompt) {
    throw new Error(`La lección ${v1.slug} no tiene planilla, celdas o valores esperados`);
  }
  const valores = v1.expectedValues;
  return {
    ...base,
    tarea: {
      tipo: "SheetTask",
      id: v1.slug,
      enunciado: texto(v1.prompt),
      grilla: v1.initialGrid,
      celdas: v1.targetCells.map((celda, indice) => ({ celda, valor: valores[indice] })),
      solucion: solucionExcel(v1),
      pistas: pistaExcelUtil(v1.hint).map(texto),
    },
    cierre: v1.explanation ? texto(v1.explanation) : null,
  };
}
```

`packages/content/src/importar/importar-cli.ts` completo:
```ts
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { aCsv } from "../generadores/despachos-rapidos";
import { convertirLeccionExcel, type LeccionExcelV1 } from "./aula-excel";
import { convertirLeccionSql, datosSql, identificadores, type AulaV1 } from "./aula-sql";
import { leccionAMdx, type Leccion } from "./leccion";

// Escribe el borrador de unas clases a partir de un aula de la v1 exportada a JSON (scripts/exportar-aula-v1.mjs).
// Uso: pnpm --filter @syntaxerror/content importar <sql|excel> <aula.json> <carpeta de destino> <lecciones separadas por coma>
// Escribe misiones/NN-<lección>.mdx, un caso.yaml para completar y, en SQL, datos/<tabla>.csv con las tablas que usan
// (en Excel cada lección trae su planilla). No pisa contenido: la carpeta de destino no debe existir. Después del
// borrador viene la revisión editorial.

const AULAS = { sql: "Clases de SQL", excel: "Clases de Excel" } as const;
type Aula = keyof typeof AULAS;

const [aula, entrada, destino, seleccion] = process.argv.slice(2);
if (!(aula in AULAS) || !entrada || !destino || !seleccion) {
  console.error("Uso: importar <sql|excel> <aula.json> <carpeta de destino> <lección,lección,...>");
  process.exit(1);
}

// Cada aula tiene la forma de sus lecciones: se leen como tales en su rama.
const datos = JSON.parse(await readFile(entrada, "utf8")) as { lessons: { slug: string }[]; datasets: AulaV1["datasets"] };
const slugs = seleccion.split(",").map((slug) => slug.trim()).filter(Boolean);
const elegidas = slugs.map((slug) => {
  const v1 = datos.lessons.find((leccion) => leccion.slug === slug);
  if (!v1) throw new Error(`El aula no tiene la lección ${slug}`);
  return v1;
});

let lecciones: Leccion[];
let tablas: string[] = [];
if ((aula as Aula) === "sql") {
  const sql = elegidas as AulaV1["lessons"];
  const excepto = identificadores({ lessons: sql, datasets: datos.datasets });
  lecciones = sql.map((v1, indice) => convertirLeccionSql(v1, indice + 1, excepto));
  tablas = [...new Set(sql.flatMap((v1) => v1.datasetTables ?? []))].sort();
} else {
  lecciones = (elegidas as LeccionExcelV1[]).map((v1, indice) => convertirLeccionExcel(v1, indice + 1));
}

if (existsSync(destino)) throw new Error(`${destino} ya existe: el importador no pisa contenido`);
await mkdir(path.join(destino, "misiones"), { recursive: true });
for (const leccion of lecciones) await writeFile(path.join(destino, "misiones", `${leccion.slug}.mdx`), leccionAMdx(leccion));
if (tablas.length > 0) {
  await mkdir(path.join(destino, "datos"), { recursive: true });
  for (const [tabla, filas] of Object.entries(datosSql({ lessons: [], datasets: datos.datasets }, tablas))) await writeFile(path.join(destino, "datos", `${tabla}.csv`), aCsv(filas));
}
await writeFile(
  path.join(destino, "caso.yaml"),
  `slug: ${path.basename(destino)}\ntipo: clases\ntitulo: "${AULAS[aula as Aula]}"\ndataset: "Completar: qué datos de práctica usan las lecciones"\nmisiones:\n${lecciones.map((leccion) => `  - ${leccion.slug}`).join("\n")}\n`
);
console.log(`[importar] ${lecciones.length} lecciones y ${tablas.length} tablas en ${destino}`);
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content exec vitest run src/importar && pnpm --filter @syntaxerror/content exec tsc --noEmit"`
Expected: PASS (17 pruebas) y sin errores de tipos.

El importador de SQL tiene que seguir dando lo mismo. Re-importa las clases de SQL en una carpeta temporal y compáralas con las del repositorio: solo deben cambiar las pistas y los textos de la revisión editorial de la 6a.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/importar
git commit -m "feat(contenido): importador con planillas y lecturas, y adaptador del aula de excel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Las clases de Excel

**Files:**
- Create: `content/casos/clases-de-excel/caso.yaml` y 23 lecciones en `misiones/`
- Modify: `content/rutas/data-analyst.yaml`, `apps/web/src/db/release.test.ts`

**Interfaces:**
- Consumes: el importador (Task 2), y `grilla` y `LecturaTask` (Task 1).
- Produces: las clases `clases-de-excel`, segundas en la ruta. Las lecciones se llaman `NN-<slug de la v1>`, y el id de su tarea es el slug de la v1. Las 21 y 22 son lecturas.

- [ ] **Step 1: El borrador del importador**

Exporta el aula con el Node de tu equipo, desde la raíz de la v2:

Run: `mkdir -p tmp && node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-excel > tmp/aula-excel.json`
Expected: `tmp/aula-excel.json`, de unos 58 KB.

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content importar excel /app/tmp/aula-excel.json /app/content/casos/clases-de-excel que-es-una-hoja-de-calculo,primera-formula,orden-de-operaciones,funcion-suma,funcion-promedio,contar-max-min,referencias-relativas,referencias-absolutas,la-funcion-si,y-o-condiciones,si-anidados,sumar-si,contar-si,funciones-conjunto,buscarv,indice-coincidir,buscarv-vs-indice,funciones-de-texto,fechas,descripcion-de-venta,errores-comunes,excel-vs-base-de-datos,proyecto-final-reporte-ventas`
Expected: `[importar] 23 lecciones y 0 tablas en /app/content/casos/clases-de-excel`.

- [ ] **Step 2: La revisión editorial (copia literal)**

Reemplaza cada archivo por su versión final.

`content/casos/clases-de-excel/caso.yaml`:
```yaml
slug: clases-de-excel
tipo: clases
titulo: "Clases de Excel: de la primera fórmula a BUSCARV"
dataset: "planillas pequeñas de ventas, productos e inventario, una por lección"
misiones:
  - 01-que-es-una-hoja-de-calculo
  - 02-primera-formula
  - 03-orden-de-operaciones
  - 04-funcion-suma
  - 05-funcion-promedio
  - 06-contar-max-min
  - 07-referencias-relativas
  - 08-referencias-absolutas
  - 09-la-funcion-si
  - 10-y-o-condiciones
  - 11-si-anidados
  - 12-sumar-si
  - 13-contar-si
  - 14-funciones-conjunto
  - 15-buscarv
  - 16-indice-coincidir
  - 17-buscarv-vs-indice
  - 18-funciones-de-texto
  - 19-fechas
  - 20-descripcion-de-venta
  - 21-errores-comunes
  - 22-excel-vs-base-de-datos
  - 23-proyecto-final-reporte-ventas
```

`content/casos/clases-de-excel/misiones/01-que-es-una-hoja-de-calculo.mdx`:
```mdx
---
titulo: "Qué es una hoja de cálculo"
tiempo: 10
---

<Concepto>
Una hoja de cálculo es como un tablero de inventario para datos: cada cuadrito guarda una pieza de información.

Si sabes leer filas, columnas y celdas, Excel deja de parecer una nave alienigena y empieza a parecer una libreta ordenada con superpoderes.

**Filas, columnas y celdas.** Las columnas van con letras: A, B, C. Las filas van con números: 1, 2, 3. Cuando juntas ambos, aparece una dirección como B3. En esta tabla, Diego está en la fila 3 y el monto está en la columna B. Por eso el dato que falta vive en B3.

**Seleccionar una celda.** Seleccionar una celda es decirle a Excel: trabaja exactamente aquí. Es como poner el cursor en el chat correcto antes de mandar el mensaje. Si escribes 310000 en B3, completas el monto de Diego. Si lo escribes en B2, le cambias la venta a Camila y armas caos de oficina.

**Texto y números.** Los nombres como Camila o Diego son texto. Los montos como 250000 son números. Excel puede mostrar ambos, pero solo con los números puede calcular. Piensa en texto como etiquetas y números como piezas que Excel puede sumar, comparar o multiplicar.

**Editar una celda.** Para corregir una celda, la seleccionas, escribes el nuevo valor y presionas Enter. Es el equivalente spreadsheet de editar un mensaje antes de enviarlo. En el desafío no necesitas fórmula todavía: solo ubicar la coordenada correcta y escribir el monto correcto.
</Concepto>

<SheetTask
  id="que-es-una-hoja-de-calculo"
  enunciado={"Completa B3 con el monto de venta de Diego: 310000."}
  grilla={[["vendedor","monto"],["Camila",250000],["Diego",null],["Antonia",180000]]}
  celdas={[{"celda":"B3","valor":310000}]}
  solucion={{"B3":310000}}
  pistas={["La columna monto es la B; busca en qué fila está Diego.", "La dirección de una celda es su letra de columna seguida de su número de fila."]}
/>

<Debrief>
B3 es la fila de Diego y la columna monto; el valor esperado es 310000.
</Debrief>
```

`content/casos/clases-de-excel/misiones/02-primera-formula.mdx`:
```mdx
---
titulo: "Escribir tu primera fórmula"
tiempo: 12
---

<Concepto>
Una fórmula es una instrucción para que Excel calcule por ti. Si una calculadora normal es una linterna, una fórmula es poner sensores automáticos en la planilla.

En esta clase vas a calcular el total de una venta: precio por cantidad. Es lo mismo que preguntarte cuánto cuesta comprar 3 notebooks.

<Sintaxis lenguaje="planilla" codigo={"=celda1*celda2"} />

**Concepto principal.** Toda fórmula empieza con =. Ese signo le avisa a Excel que no estás escribiendo texto, estás dando una orden. Para multiplicar se usa *. Entonces precio por cantidad se escribe como B2*C2 si el precio está en B2 y la cantidad en C2.

**Cómo pensarlo.** Lee la fila como una boleta: Notebook cuesta 450000 y se vendieron 3. Total = precio * cantidad. No escribas 1350000 a mano si puedes evitarlo. La gracia es que si cambia el precio o la cantidad, la fórmula recalcula sin drama.

**Uso en reportes.** Esto aparece en ventas, inventario, presupuestos y cualquier tabla donde una fila tenga partes que juntas forman un resultado. Es la fórmula base para decir: cuánto vendimos realmente por esta línea?
</Concepto>

<SheetTask
  id="primera-formula"
  enunciado={"Completa D2 con una fórmula que calcule precio por cantidad para el Notebook."}
  grilla={[["producto","precio","cantidad","total"],["Notebook",450000,3,null],["Mouse",12000,10,null]]}
  celdas={[{"celda":"D2","valor":1350000}]}
  solucion={{"D2":"=B2*C2"}}
  pistas={["Toda fórmula empieza con =.", "En vez de escribir los números, usa las celdas donde están el precio y la cantidad, unidas por *."]}
/>

<Debrief>
D2 debe ser =B2*C2, que da 1350000.
</Debrief>
```

`content/casos/clases-de-excel/misiones/03-orden-de-operaciones.mdx`:
```mdx
---
titulo: "Orden de las operaciones"
tiempo: 12
---

<Concepto>
Excel sigue reglas matemáticas. Si mezclas multiplicaciones, restas y paréntesis, el orden importa.

Esta clase sirve para descuentos: primero calculas qué porcentaje queda por pagar y después lo multiplicas por el precio.

<Sintaxis lenguaje="planilla" codigo={"=precio*(1-descuento)"} />

**Concepto principal.** Los paréntesis son como decirle a Excel: resuelve esta parte primero. Sin paréntesis, una fórmula puede hacer algo distinto a lo que tenías en la cabeza. Para un descuento de 10%, no multiplicas por 0.1; multiplicas por 1-0.1, porque quieres quedarte con el 90% del precio.

**Cómo pensarlo.** Notebook cuesta 450000 y tiene descuento 0.1. Primero haces 1-0.1 = 0.9. Luego 450000*0.9 = 405000. Es como aplicar un cupón gamer: no guardas el descuento, guardas el precio final que pagara la persona.

**Uso en reportes.** Se usa para precios finales, impuestos, comisiones, márgenes y cualquier cálculo donde una parte modifica a otra. Los paréntesis evitan errores silenciosos, que son los peores: la planilla no grita, solo te da un número malo con cara seria.
</Concepto>

<SheetTask
  id="orden-de-operaciones"
  enunciado={"Completa D2 aplicando el descuento como precio * (1 - descuento)."}
  grilla={[["producto","precio","descuento","precio_final"],["Notebook",450000,0.1,null],["Mouse",12000,0.05,null]]}
  celdas={[{"celda":"D2","valor":405000}]}
  solucion={{"D2":"=B2*(1-C2)"}}
  pistas={["Primero calcula qué parte del precio queda por pagar: 1 menos el descuento.", "Ese cálculo tiene que ir entre paréntesis para que Excel lo resuelva antes de multiplicar por el precio."]}
/>

<Debrief>
D2 = B2*(1-C2) = 405000.
</Debrief>
```

`content/casos/clases-de-excel/misiones/04-funcion-suma.mdx`:
```mdx
---
titulo: "La función SUMA"
tiempo: 12
---

<Concepto>
SUMA junta varios números sin obligarte a escribirlos uno por uno. Es el modo turbo para responder cuánto hay en total.

La vas a usar para sumar ventas de varios productos y obtener el total general.

<Sintaxis lenguaje="planilla" codigo={"=SUMA(rango)"} />

**Concepto principal.** Un rango es un grupo de celdas. B2:B5 significa desde B2 hasta B5, todo seguido en la misma columna. SUMA(B2:B5) le dice a Excel: toma todas esas ventas y juntalas en un solo número.

**Cómo pensarlo.** Imagina que cada producto dejó monedas sobre la mesa. SUMA es barrer todas esas monedas y contar el botín final. En vez de escribir B2+B3+B4+B5, usas el rango y dejas la fórmula limpia.

**Uso en reportes.** Toda tabla de ventas, gastos, horas o inventario termina preguntando por un total. SUMA suele ser la primera función que convierte una lista de datos en una respuesta de negocio.
</Concepto>

<SheetTask
  id="funcion-suma"
  enunciado={"Completa B6 con la suma total de ventas usando SUMA."}
  grilla={[["producto","total_vendido"],["Notebook",1350000],["Mouse",120000],["Teclado",125000],["Monitor",360000],["Total",null]]}
  celdas={[{"celda":"B6","valor":1955000}]}
  solucion={{"B6":"=SUMA(B2:B5)"}}
  pistas={["SUMA recibe un rango: la primera y la última celda, separadas por dos puntos.", "El rango va desde la primera venta hasta la última, sin incluir la celda donde escribes."]}
/>

<Debrief>
B6 = SUMA(B2:B5) = 1955000.
</Debrief>
```

`content/casos/clases-de-excel/misiones/05-funcion-promedio.mdx`:
```mdx
---
titulo: "La función PROMEDIO"
tiempo: 12
---

<Concepto>
PROMEDIO responde una pregunta distinta a SUMA: no cuánto vendimos en total, sino cuál fue el valor típico.

Sirve para no dejar que un número gigante o muy chico te haga perder la vista general.

<Sintaxis lenguaje="planilla" codigo={"=PROMEDIO(rango)"} />

**Concepto principal.** PROMEDIO toma varios números, los suma y divide por la cantidad de datos. Excel hace esa parte aburrida por ti. PROMEDIO(B2:B5) calcula el promedio de las ventas de los cuatro productos.

**Cómo pensarlo.** Si cada producto fuera un jugador del equipo, PROMEDIO te dice el rendimiento medio del equipo, no el golazo individual. Notebook vende mucho más que Mouse, pero el promedio te da una referencia para comparar productos.

**Uso en reportes.** Se usa para ticket promedio, ventas promedio por producto, tiempos promedio de respuesta o notas promedio. Es una buena pregunta cuando quieres saber si algo está sobre o bajo lo normal.
</Concepto>

<SheetTask
  id="funcion-promedio"
  enunciado={"Completa B6 con el promedio de ventas usando PROMEDIO."}
  grilla={[["producto","total_vendido"],["Notebook",1350000],["Mouse",120000],["Teclado",125000],["Monitor",360000],["Promedio",null]]}
  celdas={[{"celda":"B6","valor":488750}]}
  solucion={{"B6":"=PROMEDIO(B2:B5)"}}
  pistas={["PROMEDIO se escribe igual que SUMA: el nombre de la función y el rango entre paréntesis.", "Usa el mismo rango de ventas de la lección anterior."]}
/>

<Debrief>
B6 = PROMEDIO(B2:B5) = 488750.
</Debrief>
```

`content/casos/clases-de-excel/misiones/06-contar-max-min.mdx`:
```mdx
---
titulo: "CONTAR, MAX y MIN"
tiempo: 12
---

<Concepto>
CONTAR, MAX y MIN son el trío de exploración rápida: cuántos datos tengo, cuál es el más grande y cuál es el más chico.

Antes de analizar una tabla enorme, estas funciones son como mirar el minimapa de un videojuego.

<Sintaxis lenguaje="planilla" codigo={"=CONTAR(rango)"} />

**Concepto principal.** CONTAR cuenta celdas con números. MAX encuentra el número mayor. MIN encuentra el número menor. Con una sola columna de ventas puedes saber cantidad de productos, mejor venta y venta más baja.

**Cómo pensarlo.** D2 pregunta cuántos valores hay en B2:B5. D3 pregunta quién ganó la carrera. D4 pregunta quién quedó último. No estás cambiando los datos, estás creando un mini resumen al lado de la tabla.

**Uso en reportes.** Sirven para detectar extremos: producto estrella, venta más baja, cantidad de registros cargados. Son funciones simples, pero ayudan mucho a revisar si una tabla tiene sentido antes de sacar conclusiones.
</Concepto>

<SheetTask
  id="contar-max-min"
  enunciado={"Completa D2 con CONTAR, D3 con MAX y D4 con MIN sobre B2:B5."}
  grilla={[["producto","total_vendido","resumen","valor"],["Notebook",1350000,"Cantidad de productos",null],["Mouse",120000,"Venta maxima",null],["Teclado",125000,"Venta minima",null],["Monitor",360000,null,null]]}
  celdas={[{"celda":"D2","valor":4},{"celda":"D3","valor":1350000},{"celda":"D4","valor":120000}]}
  solucion={{"D2":"=CONTAR(B2:B5)","D3":"=MAX(B2:B5)","D4":"=MIN(B2:B5)"}}
  pistas={["Las tres funciones usan el mismo rango: la columna de ventas.", "Cada celda lleva su función: la cantidad, el mayor y el menor."]}
/>

<Debrief>
D2 = 4, D3 = 1350000 y D4 = 120000.
</Debrief>
```

`content/casos/clases-de-excel/misiones/07-referencias-relativas.mdx`:
```mdx
---
titulo: "Referencias relativas"
tiempo: 12
---

<Concepto>
Una referencia relativa cambia cuando copias la fórmula a otra fila. Excel entiende que quieres repetir la misma lógica, no mirar siempre las mismas celdas.

Es como una receta: en cada fila toma el precio y la cantidad de esa misma fila.

<Sintaxis lenguaje="planilla" codigo={"=B2*C2"} />

**Concepto principal.** Si en D2 escribes =B2*C2, Excel mira el precio y la cantidad del Notebook. Cuando haces la misma idea en D3, la referencia baja a B3*C3. No es magia negra, es Excel siguiendo la posición.

**Cómo pensarlo.** Cada fila es independiente: Notebook tiene su precio y cantidad; Mouse también. La fórmula debe comportarse como un clon educado: misma estructura, celdas de la fila correspondiente.

**Uso en reportes.** Las referencias relativas son clave cuando tienes 10, 100 o 10000 filas y no quieres escribir una fórmula distinta para cada una. Son la base de casi cualquier tabla con totales por fila.
</Concepto>

<SheetTask
  id="referencias-relativas"
  enunciado={"Completa D2 y D3 con el total de cada fila."}
  grilla={[["producto","precio","cantidad","total"],["Notebook",450000,3,null],["Mouse",12000,10,null]]}
  celdas={[{"celda":"D2","valor":1350000},{"celda":"D3","valor":120000}]}
  solucion={{"D2":"=B2*C2","D3":"=B3*C3"}}
  pistas={["La fórmula de la fila 3 es la misma de la fila 2, con el número de fila cambiado.", "Si escribes la de D2 y la rellenas hacia abajo, Excel ajusta las filas solo."]}
/>

<Debrief>
D2 = B2*C2 y D3 = B3*C3.
</Debrief>
```

`content/casos/clases-de-excel/misiones/08-referencias-absolutas.mdx`:
```mdx
---
titulo: "Referencias absolutas con $"
tiempo: 12
---

<Concepto>
A veces una fórmula debe moverse por varias filas, pero una celda debe quedarse quieta. Para eso sirve el signo $.

Piensa en la tasa de IVA como un jefe final: todos los productos la miran, pero ella no se mueve.

<Sintaxis lenguaje="planilla" codigo={"=B2*(1+$B$5)"} />

**Concepto principal.** $B$5 significa: quédate pegado a la celda B5 aunque copie la fórmula a otra fila. Sin los $, al bajar la fórmula Excel intentaría mirar B6, B7 y así. Pero la tasa de IVA esta fija en B5.

**Cómo pensarlo.** El precio cambia por producto: B2 para Notebook, B3 para Mouse. La tasa no cambia: siempre B5. La fórmula combina una parte movil y una parte anclada: precio de la fila * (1 + tasa fija).

**Uso en reportes.** Se usa para IVA, dólar observado, comisiones, descuentos generales o metas que aplican a muchas filas. Cuando algo es una configuración global de la planilla, probablemente merece una referencia absoluta.
</Concepto>

<SheetTask
  id="referencias-absolutas"
  enunciado={"Completa C2 y C3 usando la tasa fija en B5 como referencia absoluta."}
  grilla={[["producto","precio","precio_con_iva"],["Notebook",450000,null],["Mouse",12000,null],["","",""],["tasa_iva",0.19,""]]}
  celdas={[{"celda":"C2","valor":535500},{"celda":"C3","valor":14280}]}
  solucion={{"C2":"=B2*(1+$B$5)","C3":"=B3*(1+$B$5)"}}
  pistas={["El precio cambia en cada fila, pero la tasa está siempre en la misma celda.", "Para que una referencia no se mueva al copiar la fórmula, pon $ antes de la letra y antes del número."]}
/>

<Debrief>
C2 = B2*(1+$B$5) y C3 = B3*(1+$B$5).
</Debrief>
```

`content/casos/clases-de-excel/misiones/09-la-funcion-si.mdx`:
```mdx
---
titulo: "La función SI"
tiempo: 12
---

<Concepto>
SI sirve para que Excel tome una decisión simple: si pasa algo, muestra una cosa; si no pasa, muestra otra.

Es el semáforo de las planillas. Verde si todo bien, rojo si hay que mirar con lupa.

<Sintaxis lenguaje="planilla" codigo={"=SI(condicion,valor_si_verdadero,valor_si_falso)"} />

**Concepto principal.** La estructura es SI(condición; valor_si_verdadero; valor_si_falso). Primero haces una pregunta, después defines las dos respuestas posibles. Ejemplo humano: si queda stock menor a 5, alerta; si no, todo tranquilo.

**Cómo pensarlo.** Notebook tiene stock 8, así que no es urgente. Mouse tiene stock 2, así que necesita alerta. Teclado tiene stock 15, todo ok. Cada fila responde la misma pregunta: el stock de este producto es menor a 5?

**Uso en reportes.** SI se usa para estados, alertas, aprobaciones, clasificaciones y mensajes automáticos. Es mejor que una persona lea Stock bajo a que tenga que interpretar números a las 6 de la tarde con tres cafes encima.
</Concepto>

<SheetTask
  id="la-funcion-si"
  enunciado={"Completa C2:C4: si el stock es menor a 5, Stock bajo; si no, Stock ok."}
  grilla={[["producto","stock","estado"],["Notebook",8,null],["Mouse",2,null],["Teclado",15,null]]}
  celdas={[{"celda":"C2","valor":"Stock ok"},{"celda":"C3","valor":"Stock bajo"},{"celda":"C4","valor":"Stock ok"}]}
  solucion={{"C2":"=SI(B2<5;\"Stock bajo\";\"Stock ok\")","C3":"=SI(B3<5;\"Stock bajo\";\"Stock ok\")","C4":"=SI(B4<5;\"Stock bajo\";\"Stock ok\")"}}
  pistas={["SI recibe tres partes: la condición, lo que muestra si se cumple y lo que muestra si no.", "Los textos van entre comillas, escritos igual que en el enunciado."]}
/>

<Debrief>
Solo Mouse tiene stock menor a 5.
</Debrief>
```

`content/casos/clases-de-excel/misiones/10-y-o-condiciones.mdx`:
```mdx
---
titulo: "Y, O y condiciones combinadas"
tiempo: 12
---

<Concepto>
A veces no basta con preguntar una sola cosa. En una planilla real necesitas decidir solo cuando se cumplen dos reglas al mismo tiempo.

Piénsalo como comprar un notebook: no sirve que esté barato si no hay stock, y no sirve que haya stock si se sale del presupuesto. Con SI + Y puedes pedirle a Excel que revise ambas cosas antes de responder.

<Sintaxis lenguaje="planilla" codigo={"=SI(Y(condicion1;condicion2);valor_si_verdadero;valor_si_falso)"} />

**Concepto principal.** Y significa: todas las condiciones deben ser verdaderas. Si una falla, el resultado completo falla. La estructura es SI(Y(condicion1; condicion2); que_muestro_si_ambas_se_cumplen; que_muestro_si_no). Es como un filtro con dos candados: solo pasa si abre los dos.

<Sintaxis lenguaje="planilla" codigo={"=SI(Y(stock>0;precio<450000);\"Comprar\";\"Esperar\")"} />

**Cómo pensarlo.** Lee cada fila como una mini historia. Notebook tiene stock 3 y precio 450000: hay pocas unidades y además es caro, así que conviene revisar antes de prometerlo. Mouse tiene mucho stock, pero no es caro. Teclado tiene poco stock, pero tampoco es caro. Como el desafío pide poco stock Y precio alto, solo Notebook prende la alerta.

**Uso en reportes.** Esto se usa para marcar casos que necesitan acción: productos críticos, pedidos atrasados, clientes VIP con deuda, o compras que solo apruebas si cumplen presupuesto y disponibilidad. La columna alerta no esta calculando ventas; esta ayudando a decidir donde mirar primero.
</Concepto>

<SheetTask
  id="y-o-condiciones"
  enunciado={"Marca Revisar solo si stock < 5 Y precio > 100000."}
  grilla={[["producto","stock","precio","alerta"],["Notebook",3,450000,null],["Mouse",20,12000,null],["Teclado",2,25000,null]]}
  celdas={[{"celda":"D2","valor":"Revisar"},{"celda":"D3","valor":"OK"},{"celda":"D4","valor":"OK"}]}
  solucion={{"D2":"=SI(Y(B2<5;C2>100000);\"Revisar\";\"OK\")","D3":"=SI(Y(B3<5;C3>100000);\"Revisar\";\"OK\")","D4":"=SI(Y(B4<5;C4>100000);\"Revisar\";\"OK\")"}}
  pistas={["Y devuelve verdadero solo si todas sus condiciones se cumplen.", "Pon el Y como condición dentro de un SI, y los textos entre comillas."]}
/>

<Debrief>
Solo Notebook cumple ambas condiciones: stock 3 es menor a 5 y precio 450000 es mayor a 100000. Mouse tiene stock suficiente, y Teclado tiene poco stock pero no supera el precio crítico.
</Debrief>
```

`content/casos/clases-de-excel/misiones/11-si-anidados.mdx`:
```mdx
---
titulo: "SI anidados"
tiempo: 12
---

<Concepto>
Un SI anidado sirve cuando tienes más de dos respuestas posibles. No es solo si/no: ahora hay niveles.

Piénsalo como clasificar loot: legendario, raro o común, pero con montos de venta.

<Sintaxis lenguaje="planilla" codigo={"=SI(condicion1,resultado1,SI(condicion2,resultado2,resultado3))"} />

**Concepto principal.** Un SI puede vivir dentro de otro SI. Primero preguntas por la condición más fuerte; si no se cumple, preguntas la siguiente. Aquí la regla es: mayor a 300000 es Alto; si no, mayor a 50000 es Medio; si no, Bajo.

**Cómo pensarlo.** Ordena las preguntas de mayor a menor. Si Notebook ya es Alto, no necesitas seguir preguntando. Mouse no pasa 300000 ni 50000, cae en Bajo. Monitor no pasa 300000, pero si pasa 50000, entonces es Medio.

**Uso en reportes.** Sirve para segmentar clientes, productos, riesgos, prioridades o tickets de soporte. Cuando un dashboard necesita colores tipo Alto/Medio/Bajo, casi siempre hay una lógica como esta debajo.
</Concepto>

<SheetTask
  id="si-anidados"
  enunciado={"Clasifica: >300000 Alto, >50000 Medio, si no Bajo."}
  grilla={[["producto","monto","categoria"],["Notebook",450000,null],["Mouse",12000,null],["Monitor",180000,null]]}
  celdas={[{"celda":"C2","valor":"Alto"},{"celda":"C3","valor":"Bajo"},{"celda":"C4","valor":"Medio"}]}
  solucion={{"C2":"=SI(B2>300000;\"Alto\";SI(B2>50000;\"Medio\";\"Bajo\"))","C3":"=SI(B3>300000;\"Alto\";SI(B3>50000;\"Medio\";\"Bajo\"))","C4":"=SI(B4>300000;\"Alto\";SI(B4>50000;\"Medio\";\"Bajo\"))"}}
  pistas={["Pregunta primero por el nivel más alto; en el caso «si no», pon otro SI.", "El último SI ya no necesita preguntar nada más: lo que queda es Bajo."]}
/>

<Debrief>
Notebook es Alto, Mouse Bajo y Monitor Medio.
</Debrief>
```

`content/casos/clases-de-excel/misiones/12-sumar-si.mdx`:
```mdx
---
titulo: "SUMAR.SI"
tiempo: 12
---

<Concepto>
SUMAR.SI suma solo las filas que cumplen una condición. Es como decir: suma el carrito, pero solo los productos de tecnologia.

Cuando una tabla mezcla categorías, esta función evita sumar peras con teclados mecánicos.

<Sintaxis lenguaje="planilla" codigo={"=SUMAR.SI(rango_condicion,criterio,rango_a_sumar)"} />

**Concepto principal.** SUMAR.SI necesita tres piezas: dónde mirar la condición, qué criterio buscar y qué montos sumar. En esta tabla miras categorías en B2:B5, buscas tecnologia y sumas los montos de C2:C5.

**Cómo pensarlo.** Excel revisa fila por fila: Notebook es tecnologia, suma 450000. Mouse es tecnologia, suma 12000. Escritorio y Silla no entran. El resultado es 462000 porque solo entran las filas que tienen la etiqueta correcta.

**Uso en reportes.** Se usa para ventas por categoría, gastos por área, horas por proyecto o ingresos por canal. Es una de las funciones más útiles para responder: ¿cuánto corresponde solo a este grupo?
</Concepto>

<SheetTask
  id="sumar-si"
  enunciado={"Completa E2 sumando los montos de categoría tecnologia."}
  grilla={[["producto","categoria","monto","",""],["Notebook","tecnologia",450000,"total_tecnologia",null],["Mouse","tecnologia",12000,"",""],["Escritorio","muebles",180000,"",""],["Silla","muebles",95000,"",""]]}
  celdas={[{"celda":"E2","valor":462000}]}
  solucion={{"E2":"=SUMAR.SI(B2:B5;\"tecnologia\";C2:C5)"}}
  pistas={["SUMAR.SI recibe tres partes: dónde mirar la condición, qué buscar y qué sumar.", "El criterio es un texto: va entre comillas, escrito igual que en la tabla."]}
/>

<Debrief>
E2 = SUMAR.SI(B2:B5,"tecnologia",C2:C5) = 462000.
</Debrief>
```

`content/casos/clases-de-excel/misiones/13-contar-si.mdx`:
```mdx
---
titulo: "CONTAR.SI"
tiempo: 12
---

<Concepto>
CONTAR.SI cuenta cuántas filas cumplen una condición. No suma dinero: cuenta casos.

Es perfecto cuando quieres saber cuántos productos, clientes o tickets pertenecen a un grupo.

<Sintaxis lenguaje="planilla" codigo={"=CONTAR.SI(rango,criterio)"} />

**Concepto principal.** La estructura es CONTAR.SI(rango; criterio). El rango es donde Excel mira, y el criterio es lo que debe encontrar. Aquí quieres contar cuántas veces aparece muebles en la columna categoría.

**Cómo pensarlo.** Notebook y Mouse son tecnologia, no cuentan. Escritorio y Silla son muebles, sí cuentan. El resultado no depende del monto; solo importa la categoría.

**Uso en reportes.** Sirve para contar productos por categoría, alumnos aprobados, reclamos abiertos o pedidos atrasados. Si SUMAR.SI responde cuánto, CONTAR.SI responde cuántos.
</Concepto>

<SheetTask
  id="contar-si"
  enunciado={"Completa E2 contando productos de categoría muebles."}
  grilla={[["producto","categoria","monto","",""],["Notebook","tecnologia",450000,"cantidad_muebles",null],["Mouse","tecnologia",12000,"",""],["Escritorio","muebles",180000,"",""],["Silla","muebles",95000,"",""]]}
  celdas={[{"celda":"E2","valor":2}]}
  solucion={{"E2":"=CONTAR.SI(B2:B5;\"muebles\")"}}
  pistas={["CONTAR.SI recibe dos partes: dónde mirar y qué contar.", "El criterio es un texto: va entre comillas, escrito igual que en la tabla."]}
/>

<Debrief>
E2 = CONTAR.SI(B2:B5,"muebles") = 2.
</Debrief>
```

`content/casos/clases-de-excel/misiones/14-funciones-conjunto.mdx`:
```mdx
---
titulo: "SUMAR.SI.CONJUNTO y CONTAR.SI.CONJUNTO"
tiempo: 16
---

<Concepto>
Las funciones CONJUNTO sirven cuando una sola condición ya no alcanza. Puedes pedir categoría y región al mismo tiempo.

Es como buscar una misión específica: no cualquier tecnologia, sino tecnologia del norte; no cualquier mueble, sino muebles del norte.

<Sintaxis lenguaje="planilla" codigo={"=SUMAR.SI.CONJUNTO(rango_suma,rango_cond1,criterio1,rango_cond2,criterio2)"} />

**Concepto principal.** SUMAR.SI.CONJUNTO suma montos que cumplen varias reglas. CONTAR.SI.CONJUNTO cuenta filas que cumplen varias reglas. Cada condición viene como pareja: rango donde mirar y criterio que debe aparecer.

**Cómo pensarlo.** Para tecnologia norte, solo entra Notebook: categoría tecnologia y región norte. Mouse falla porque es sur. Para muebles norte, entran Escritorio y Silla. Por eso el conteo da 2.

**Uso en reportes.** Se usa para reportes por categoría + región, vendedor + mes, producto + canal, o cualquier filtro doble. Es el puente entre una tabla simple y un análisis más cercano a un dashboard.
</Concepto>

<SheetTask
  id="funciones-conjunto"
  enunciado={"Completa E2 con SUMAR.SI.CONJUNTO y F2 con CONTAR.SI.CONJUNTO."}
  grilla={[["producto","categoria","region","monto","total_norte_tecnologia","cantidad_muebles_norte"],["Notebook","tecnologia","norte",450000,null,null],["Mouse","tecnologia","sur",12000,"",""],["Escritorio","muebles","norte",180000,"",""],["Silla","muebles","norte",95000,"",""]]}
  celdas={[{"celda":"E2","valor":450000},{"celda":"F2","valor":2}]}
  solucion={{"E2":"=SUMAR.SI.CONJUNTO(D2:D5;B2:B5;\"tecnologia\";C2:C5;\"norte\")","F2":"=CONTAR.SI.CONJUNTO(B2:B5;\"muebles\";C2:C5;\"norte\")"}}
  pistas={["En SUMAR.SI.CONJUNTO el rango que se suma va primero, y después cada pareja de rango y criterio.", "CONTAR.SI.CONJUNTO no tiene rango para sumar: solo parejas de rango y criterio."]}
/>

<Debrief>
E2 = 450000 y F2 = 2.
</Debrief>
```

`content/casos/clases-de-excel/misiones/15-buscarv.mdx`:
```mdx
---
titulo: "BUSCARV"
tiempo: 16
---

<Concepto>
BUSCARV sirve para buscar un dato por una llave, como cuando escribes un ID y esperas que aparezca el producto correcto.

Es el equivalente planilla de preguntarle al inventario: oye, quien tiene el código 102?

<Sintaxis lenguaje="planilla" codigo={"=BUSCARV(valor_buscado,rango,columna,0)"} />

**Concepto principal.** BUSCARV busca el valor en la primera columna del rango y devuelve un dato desde otra columna de esa misma fila. El último 0 significa coincidencia exacta. Para códigos e IDs casi siempre quieres exactitud, no aproximaciones creativas.

**Cómo pensarlo.** B5 contiene el id 102. Excel lo busca en A2:A4, encuentra la fila del Mouse y devuelve la columna 2 del rango A2:C4. Si el rango es A2:C4, la columna 1 es id, la columna 2 es producto y la columna 3 es precio.

**Uso en reportes.** Se usa para traer nombres, precios, categorías o datos maestros desde una tabla de referencia. Es útil cuando quieres que una persona escriba solo el ID y la planilla complete el resto, como autocompletar pero con celdas.
</Concepto>

<SheetTask
  id="buscarv"
  enunciado={"Completa D5 buscando el id de B5 en A2:C4 y devolviendo la columna producto."}
  grilla={[["id","producto","precio","",""],[101,"Notebook",450000,"",""],[102,"Mouse",12000,"",""],[103,"Teclado",25000,"",""],["Buscar id:",102,"Producto:",null,""]]}
  celdas={[{"celda":"D5","valor":"Mouse"}]}
  solucion={{"D5":"=BUSCARV(B5;A2:C4;2;0)"}}
  pistas={["BUSCARV recibe cuatro partes: qué buscar, dónde, qué columna devolver y si la coincidencia es exacta.", "La columna se cuenta desde la primera columna del rango, no desde la A."]}
/>

<Debrief>
D5 = BUSCARV(B5,A2:C4,2,0) = Mouse.
</Debrief>
```

`content/casos/clases-de-excel/misiones/16-indice-coincidir.mdx`:
```mdx
---
titulo: "INDICE y COINCIDIR"
tiempo: 18
---

<Concepto>
INDICE + COINCIDIR es una forma más flexible de buscar datos. Parece más larga, pero te da más control.

COINCIDIR encuentra la posición; INDICE trae el dato que está en esa posición. Uno es el GPS, el otro abre la caja.

<Sintaxis lenguaje="planilla" codigo={"=INDICE(rango_resultado,COINCIDIR(valor_buscado,rango_busqueda,0))"} />

**Concepto principal.** COINCIDIR("Teclado";B2:B4;0) responde en qué posición está Teclado dentro de la lista de productos. INDICE(C2:C4;posición) usa esa posición para traer el precio desde la columna de precios.

**Cómo pensarlo.** Primero preguntas: ¿dónde está Teclado? La respuesta es posición 3. Después preguntas: ¿qué hay en la posición 3 de los precios? 25000. Separar buscar posición y traer resultado hace que la fórmula sea más fácil de depurar.

**Uso en reportes.** Se usa cuando BUSCARV queda corto, especialmente si necesitas buscar por una columna y traer datos de otra sin depender tanto del orden. Es una herramienta de búsqueda más pro, como cambiar de bicicleta con rueditas a nave con coordenadas.
</Concepto>

<SheetTask
  id="indice-coincidir"
  enunciado={"Completa D5 con INDICE y COINCIDIR para traer el precio de Teclado."}
  grilla={[["id","producto","precio","",""],[101,"Notebook",450000,"",""],[102,"Mouse",12000,"",""],[103,"Teclado",25000,"",""],["Buscar producto:","Teclado","Precio:",null,""]]}
  celdas={[{"celda":"D5","valor":25000}]}
  solucion={{"D5":"=INDICE(C2:C4;COINCIDIR(B5;B2:B4;0))"}}
  pistas={["COINCIDIR te dice en qué posición de una lista está un valor.", "INDICE usa esa posición para traer el dato de otra columna."]}
/>

<Debrief>
D5 = INDICE(C2:C4,COINCIDIR(B5,B2:B4,0)) = 25000.
</Debrief>
```

`content/casos/clases-de-excel/misiones/17-buscarv-vs-indice.mdx`:
```mdx
---
titulo: "BUSCARV frente a INDICE+COINCIDIR"
tiempo: 16
---

<Concepto>
BUSCARV busca hacia la derecha. Si el dato que quieres está a la izquierda, se complica.

INDICE + COINCIDIR no se asusta: puede buscar por producto y traer el ID aunque el ID este antes en la tabla.

<Sintaxis lenguaje="planilla" codigo={"=INDICE(rango_a_la_izquierda,COINCIDIR(valor,rango_busqueda,0))"} />

**Concepto principal.** En esta tabla, producto está en C y el ID está en B. BUSCARV no es cómodo porque quiere buscar desde la primera columna del rango hacia la derecha. Con INDICE eliges directamente el rango resultado B2:B4 y con COINCIDIR buscas Teclado en C2:C4.

**Cómo pensarlo.** COINCIDIR busca Teclado en la columna producto y devuelve su posición. INDICE usa esa posición para leer el ID. Es como decir: encuentra al personaje por nombre y luego dame su número de jugador.

**Uso en reportes.** Sirve cuando no controlas el orden de las columnas o cuando las tablas cambian con frecuencia. También ayuda a construir planillas menos fragiles, porque no dependes tanto de contar columnas a mano.
</Concepto>

<SheetTask
  id="buscarv-vs-indice"
  enunciado={"Completa D5 para encontrar el id de Teclado usando INDICE y COINCIDIR."}
  grilla={[["precio","id","producto","",""],[450000,101,"Notebook","",""],[12000,102,"Mouse","",""],[25000,103,"Teclado","",""],["Buscar producto:","Teclado","id:",null,""]]}
  celdas={[{"celda":"D5","valor":103}]}
  solucion={{"D5":"=INDICE(B2:B4;COINCIDIR(B5;C2:C4;0))"}}
  pistas={["Aquí lo que se busca está a la derecha del dato que quieres traer: BUSCARV no sirve.", "COINCIDIR busca el producto en su columna, e INDICE trae el id desde la otra."]}
/>

<Debrief>
D5 = INDICE(B2:B4,COINCIDIR(B5,C2:C4,0)) = 103.
</Debrief>
```

`content/casos/clases-de-excel/misiones/18-funciones-de-texto.mdx`:
```mdx
---
titulo: "Funciones de texto"
tiempo: 12
---

<Concepto>
Excel no solo calcula números: también limpia, corta y arma textos. Eso sirve mucho cuando llegan datos escritos de mil formas distintas.

En esta clase vas a crear códigos cortos con nombre y apellido, como tags de usuario estilo gamer.

<Sintaxis lenguaje="planilla" codigo={"=IZQUIERDA(texto,cantidad)"} />

**Concepto principal.** IZQUIERDA(texto;3) toma las primeras 3 letras. MAYUSC convierte texto a mayúsculas. & une pedazos de texto. Juntas esas piezas para crear códigos como CAMROJ desde Camila Rojas.

**Cómo pensarlo.** Para Camila Rojas, tomas CAM de Camila y ROJ de Rojas. Luego los unes y los dejas en mayúsculas. No estás inventando el código a mano; estás creando una regla que funciona para cualquier fila.

**Uso en reportes.** Sirve para crear códigos, limpiar nombres, extraer partes de un RUT, armar etiquetas o estandarizar textos. Muchas bases de datos reales llegan desordenadas; las funciones de texto son la escoba y el trapero.
</Concepto>

<SheetTask
  id="funciones-de-texto"
  enunciado={"Completa C2 y C3 con las primeras 3 letras del nombre y apellido en mayúsculas."}
  grilla={[["nombre","apellido","codigo"],["Camila","Rojas",null],["Diego","Soto",null]]}
  celdas={[{"celda":"C2","valor":"CAMROJ"},{"celda":"C3","valor":"DIESOT"}]}
  solucion={{"C2":"=MAYUSC(IZQUIERDA(A2;3)&IZQUIERDA(B2;3))","C3":"=MAYUSC(IZQUIERDA(A3;3)&IZQUIERDA(B3;3))"}}
  pistas={["IZQUIERDA trae los primeros caracteres de un texto.", "El & une dos textos, y MAYUSC pasa el resultado a mayúsculas."]}
/>

<Debrief>
C2 = CAMROJ y C3 = DIESOT.
</Debrief>
```

`content/casos/clases-de-excel/misiones/19-fechas.mdx`:
```mdx
---
titulo: "Fechas en formato DD/MM/AAAA"
tiempo: 12
---

<Concepto>
Las fechas en Excel son calculables. Puedes restarlas para saber días entre eventos o extraer el año para agrupar reportes.

Esto sirve para cosas reales: cuánto demoró un pago, en qué año se vendió algo, o si un plazo ya se pasó.

<Sintaxis lenguaje="planilla" codigo={"=fecha2-fecha1"} />

**Concepto principal.** Si restas fecha_pago - fecha_venta, Excel devuelve la cantidad de días entre ambas. AÑO(fecha) extrae solo el año, útil cuando quieres agrupar ventas sin mirar día y mes.

**Cómo pensarlo.** Notebook se vendió el 15/01/2026 y se pagó el 30/01/2026. Entre esas fechas pasaron 15 días. El año de venta es 2026, que puede servir para filtros, gráficos o comparaciones anuales.

**Uso en reportes.** Se usa para plazos de pago, antigüedad de clientes, vencimientos, seguimiento de tickets y reportes por año. Las fechas son donde muchas planillas se vuelven peligrosas; tratarlas como datos calculables baja el riesgo.
</Concepto>

<SheetTask
  id="fechas"
  enunciado={"Completa D2 con los días entre fechas y E2 con el año de venta."}
  grilla={[["producto","fecha_venta","fecha_pago","dias_para_pagar","anio_venta"],["Notebook","15/01/2026","30/01/2026",null,null]]}
  celdas={[{"celda":"D2","valor":15},{"celda":"E2","valor":2026}]}
  solucion={{"D2":"=C2-B2","E2":"=AÑO(B2)"}}
  pistas={["Restar dos fechas da los días que hay entre ellas.", "Para el año hay una función con ñ en su nombre."]}
/>

<Debrief>
D2 = C2-B2 = 15 y E2 = AÑO(B2) = 2026.
</Debrief>
```

`content/casos/clases-de-excel/misiones/20-descripcion-de-venta.mdx`:
```mdx
---
titulo: "Armar una descripción de venta"
tiempo: 12
---

<Concepto>
A veces un reporte necesita frases legibles, no solo números. Excel puede armar textos mezclando columnas y cálculos.

Aquí vamos a construir una descripción tipo boleta: producto, cantidad y total en una sola celda.

<Sintaxis lenguaje="planilla" codigo={"=texto1&valor&texto2"} />

**Concepto principal.** El simbolo & une textos y valores. Si quieres espacios o simbolos como x o $, los escribes entre comillas. También puedes meter cálculos dentro del texto, como B2*C2 para mostrar el total vendido.

**Cómo pensarlo.** La celda debe decir Notebook x3 - $1350000. Eso sale de A2, luego texto fijo " x", luego C2, luego texto fijo " - $", luego B2*C2. Es como armar una frase con bloques LEGO: algunos vienen de celdas y otros los escribes tu.

**Uso en reportes.** Sirve para etiquetas, glosas contables, descripciones de pedidos, códigos legibles o mensajes para copiar a otro sistema. Cuando una tabla debe hablar en humano, las fórmulas de texto hacen de traductor.
</Concepto>

<SheetTask
  id="descripcion-de-venta"
  enunciado={"Completa D2 con producto & \" x\" & cantidad & \" - $\" & (precio*cantidad)."}
  grilla={[["producto","precio","cantidad","descripcion"],["Notebook",450000,3,null]]}
  celdas={[{"celda":"D2","valor":"Notebook x3 - $1350000"}]}
  solucion={{"D2":"=A2&\" x\"&C2&\" - $\"&(B2*C2)"}}
  pistas={["El & une textos y celdas; los textos fijos van entre comillas, con sus espacios.", "El total es precio por cantidad, entre paréntesis para calcularlo antes de unirlo."]}
/>

<Debrief>
D2 = A2&" x"&C2&" - $"&(B2*C2).
</Debrief>
```

`content/casos/clases-de-excel/misiones/21-errores-comunes.mdx`:
```mdx
---
titulo: "Errores comunes y tablas dinámicas"
tiempo: 14
---

<Concepto>
Los errores de Excel no son fracasos personales; son mensajes de diagnóstico. La planilla te está diciendo dónde le dolió.

También veremos tablas dinámicas: una forma rápida de resumir muchos datos sin escribir fórmulas para todo.

**#DIV/0!: dividir por cero.** Aparece cuando una fórmula intenta dividir por cero o por una celda vacía que Excel interpreta como cero. Ejemplo típico: calcular promedio por ventas cuando todavía no hay ventas. La solución es revisar el denominador antes de culpar al universo.

<Sintaxis lenguaje="planilla" codigo={"=10/0"} />

**#¿NOMBRE?: función mal escrita.** Aparece cuando Excel no reconoce algo en la fórmula: una función mal escrita, una función en otro idioma o un nombre que no existe. Si escribes SUM en una hoja configurada en español, puede fallar porque espera SUMA. Excel es literal, como robot de película vieja.

<Sintaxis lenguaje="planilla" codigo={"=SUM(1,2)"} />

**#REF!: referencia rota.** #REF! suele aparecer cuando una fórmula apuntaba a una celda o columna que fue eliminada. Es como tener un link a una carpeta que alguien borró. La fórmula sigue preguntando, pero la dirección ya no existe.

**Qué es una tabla dinámica.** Una tabla dinámica resume datos arrastrando campos: categoría por filas, suma de monto por valores, región como filtro. No reemplaza las fórmulas, pero ayuda a explorar una tabla rápido, como cambiar la camara del mapa para ver patrones.
</Concepto>

<LecturaTask
  id="errores-comunes"
  pregunta={"Si una fórmula muestra #¿NOMBRE?, ¿qué dos cosas conviene revisar primero?"}
  respuesta={"Revisar que el nombre de la función esté bien escrito y que esté en el idioma correcto."}
/>
```

`content/casos/clases-de-excel/misiones/22-excel-vs-base-de-datos.mdx`:
```mdx
---
titulo: "Excel vs. una base de datos"
tiempo: 12
---

<Concepto>
Excel es excelente para explorar, calcular y armar reportes chicos o medianos. Pero no todo problema de datos debería vivir en una planilla.

La clave profesional es saber cuando Excel alcanza y cuando conviene pasarle la posta a una base de datos.

**Cuando Excel alcanza.** Excel alcanza cuando el volumen es manejable, pocas personas editan, y necesitas analizar o presentar datos rápido. Para presupuestos, reportes mensuales, listas limpias y análisis exploratorio, Excel es una navaja suiza bastante poderosa.

**Los limites de Excel.** Excel empieza a sufrir cuando hay millones de filas, muchas personas editando al mismo tiempo o reglas de seguridad fuertes. También se vuelve fragil cuando una celda editada a mano puede romper un reporte completo sin dejar huella clara.

**SQL entra cuando los datos crecen.** Una base de datos está hecha para guardar muchos datos, permitir consultas, controlar accesos y soportar varios usuarios. Si Excel es una mesa de trabajo, SQL es una bodega con inventario, guardias y pasillos etiquetados.

**No son excluyentes.** En la vida real se usan juntos: la base de datos guarda la información confiable y Excel ayuda a analizar, prototipar o presentar. La decisión no es Team Excel vs Team SQL. Es usar la herramienta correcta para el tamaño del monstruo.
</Concepto>

<LecturaTask
  id="excel-vs-base-de-datos"
  pregunta={"Si tuvieras una tabla de 5 millones de filas que actualizan 10 personas al mismo tiempo, ¿usarías Excel o una base de datos?"}
  respuesta={"Una base de datos: el volumen y la edición simultánea son escenarios donde SQL funciona mejor."}
/>
```

`content/casos/clases-de-excel/misiones/23-proyecto-final-reporte-ventas.mdx`:
```mdx
---
titulo: "Proyecto final: reporte de ventas"
tiempo: 20
---

<Concepto>
Este es el proyecto final: una mini planilla de ventas que mezcla cálculos, texto y condiciones.

La idea es que armes algo que se parece más a trabajo real: no una fórmula aislada, sino varias piezas conversando en la misma hoja.

**Totales por fila.** Primero calcula cada línea: precio por cantidad. Sin esta columna, el reporte no tiene base. Es la parte caja registradora: cada producto dice cuánto aportó al total.

<Sintaxis lenguaje="planilla" codigo={"=C2*D2"} />

**Texto: armar una descripción.** Después arma una descripción legible combinando producto y categoría. MAYUSC deja el producto con presencia de cartel luminoso, y & pega las piezas del texto.

<Sintaxis lenguaje="planilla" codigo={"=MAYUSC(A2)&\" (\"&B2&\")\""} />

**Condicional: total por categoría.** Finalmente, SUMAR.SI suma solo la categoría tecnologia usando los totales ya calculados. Es el cierre del mini reporte: pasas de filas sueltas a una pregunta de negocio.

<Sintaxis lenguaje="planilla" codigo={"=SUMAR.SI(B2:B4,\"tecnologia\",E2:E4)"} />
</Concepto>

<SheetTask
  id="proyecto-final-reporte-ventas"
  enunciado={"Completa E2:E4 con el total de cada fila (precio*cantidad), F2 con MAYUSC(producto)&\" (\"&categoria&\")\", y G2 con el total de ventas de la categoría tecnologia usando SUMAR.SI sobre E2:E4."}
  grilla={[["producto","categoria","precio","cantidad","total","descripcion","total_tecnologia"],["Notebook","tecnologia",450000,2,null,null,null],["Mouse","tecnologia",12000,5,null,null,null],["Escritorio","muebles",180000,1,null,null,null]]}
  celdas={[{"celda":"E2","valor":900000},{"celda":"E3","valor":60000},{"celda":"E4","valor":180000},{"celda":"F2","valor":"NOTEBOOK (tecnologia)"},{"celda":"G2","valor":960000}]}
  solucion={{"E2":"=C2*D2","E3":"=C3*D3","E4":"=C4*D4","F2":"=MAYUSC(A2)&\" (\"&B2&\")\"","G2":"=SUMAR.SI(B2:B4;\"tecnologia\";E2:E4)"}}
  pistas={["Empieza por la columna de totales: precio por cantidad en cada fila.", "Para la categoría usa & y MAYUSC, y para el total de tecnología, SUMAR.SI sobre la columna que acabas de calcular."]}
/>

<Debrief>
E2=900000, E3=60000, E4=180000 (precio*cantidad de cada fila); F2="NOTEBOOK (tecnologia)"; G2=SUMAR.SI(B2:B4,"tecnologia",E2:E4)=900000+60000=960000, porque Notebook y Mouse son categoría tecnologia.
</Debrief>
```

- [ ] **Step 3: La ruta y el release**

`content/rutas/data-analyst.yaml` completo:
```yaml
slug: data-analyst
titulo: Data Analyst
cargo: Analista de datos junior
descripcion: Resuelve casos reales de una empresa chilena con SQL, planillas, Python y Power BI, y termina con un portafolio que puedes mostrar en una entrevista.
estado: borrador
# Orden aprobado en la propuesta pedagógica (sección 7), del Caso 0 al proyecto final.
casos:
  - herramientas-del-oficio
  - clases-de-excel
  - despachos-rapidos
  - clases-de-sql
  - minimarkets-del-sur
  - tienda-online-pewen
  - clinica-cordillera-central
  - proyecto-final
```

En `apps/web/src/db/release.test.ts`, `2 rutas, 8 casos` pasa a `2 rutas, 9 casos` (las dos veces), y `toHaveLength(8)` pasa a `toHaveLength(9)`.

- [ ] **Step 4: Validar**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content validate`
Expected: `[content] ok: 2 rutas, 9 casos, 92 misiones`.

Compara cada `.mdx` y `caso.yaml` con `diff` contra este plan: deben ser idénticos.

Run: `docker compose run --rm tools pnpm -r --if-present test`
Expected: PASS en todos los paquetes (content 82, web 336).

- [ ] **Step 5: Commit**

```bash
git add content apps/web/src/db/release.test.ts
git commit -m "feat(contenido): clases de excel, veintitres lecciones traidas del aula de la v1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: e2e y documentación

**Files:**
- Modify: `e2e/tests/progreso.ts`, `e2e/tests/clases.spec.ts`, `e2e/tests/despachos.spec.ts`, `e2e/tests/minimarkets.spec.ts`, `e2e/tests/pewen.spec.ts`, `e2e/tests/clinica.spec.ts`, `e2e/tests/proyecto-final.spec.ts`, `e2e/calentar.ts`, `README.md`

**Interfaces:**
- Consumes: los ids de la Task 3.
- Produces:
  - `MISIONES["clases-de-excel"]`, y `CLASES` con las dos clases;
  - una prueba más en `clases.spec.ts`.

- [ ] **Step 1: Los helpers y las cadenas de casos**

`e2e/tests/progreso.ts` completo:
```ts
import { expect, type Page } from "./fixtures";
import { entrarComoAdmin } from "./revision";

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
  "clases-de-excel": [
    ["01-que-es-una-hoja-de-calculo", "que-es-una-hoja-de-calculo"],
    ["02-primera-formula", "primera-formula"],
    ["03-orden-de-operaciones", "orden-de-operaciones"],
    ["04-funcion-suma", "funcion-suma"],
    ["05-funcion-promedio", "funcion-promedio"],
    ["06-contar-max-min", "contar-max-min"],
    ["07-referencias-relativas", "referencias-relativas"],
    ["08-referencias-absolutas", "referencias-absolutas"],
    ["09-la-funcion-si", "la-funcion-si"],
    ["10-y-o-condiciones", "y-o-condiciones"],
    ["11-si-anidados", "si-anidados"],
    ["12-sumar-si", "sumar-si"],
    ["13-contar-si", "contar-si"],
    ["14-funciones-conjunto", "funciones-conjunto"],
    ["15-buscarv", "buscarv"],
    ["16-indice-coincidir", "indice-coincidir"],
    ["17-buscarv-vs-indice", "buscarv-vs-indice"],
    ["18-funciones-de-texto", "funciones-de-texto"],
    ["19-fechas", "fechas"],
    ["20-descripcion-de-venta", "descripcion-de-venta"],
    ["21-errores-comunes", "errores-comunes"],
    ["22-excel-vs-base-de-datos", "excel-vs-base-de-datos"],
    ["23-proyecto-final-reporte-ventas", "proyecto-final-reporte-ventas"],
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
  "clases-de-sql": [
    ["01-select-basico", "select-basico"],
    ["02-alias-expresiones", "alias-expresiones"],
    ["03-where-filtros", "where-filtros"],
    ["04-busqueda-orden-limite", "busqueda-orden-limite"],
    ["05-join-inner", "join-inner"],
    ["06-join-multiple-left", "join-multiple-left"],
    ["07-null-coalesce", "null-coalesce"],
    ["08-funciones-texto", "funciones-texto"],
    ["09-funciones-numericas", "funciones-numericas"],
    ["10-funciones-agregacion", "funciones-agregacion"],
    ["11-group-by-having", "group-by-having"],
    ["12-case-when", "case-when"],
    ["13-subconsultas-where", "subconsultas-where"],
    ["14-subconsultas-from", "subconsultas-from"],
    ["15-cte-with", "cte-with"],
    ["16-union", "union"],
    ["17-exists", "exists"],
    ["18-proyecto-final-sql", "proyecto-final-sql"],
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
  "tienda-online-pewen": [
    ["01-de-la-planilla-a-python", "totales-del-carrito"],
    ["01-de-la-planilla-a-python", "primera-tabla"],
    ["02-cargar-y-explorar", "explorar-pedidos"],
    ["03-filtrar-y-seleccionar", "devueltos"],
    ["03-filtrar-y-seleccionar", "envios-grandes"],
    ["04-limpiar", "limpiar-pedidos"],
    ["05-agrupar-y-resumir", "mejores-clientes"],
    ["06-cruzar-tablas", "ventas-por-categoria-y-region"],
    ["07-detectar-patrones", "devoluciones-y-meses"],
    ["08-revisar-el-codigo-de-la-ia", "corregir-codigo-ia"],
    ["09-recomendaciones-para-el-negocio", "cinco-respuestas"],
  ],
  "clinica-cordillera-central": [
    ["01-la-pregunta-del-dashboard", "ficha-del-dashboard"],
    ["02-preparar-los-datos", "atenciones-con-nombres"],
    ["02-preparar-los-datos", "control-por-tipo"],
    ["03-calcular-indicadores", "tasa-de-inasistencia"],
    ["03-calcular-indicadores", "espera-por-sede"],
    ["04-elegir-el-grafico", "serie-mensual-de-urgencias"],
    ["04-elegir-el-grafico", "ranking-de-inasistencia"],
    ["05-disenar-el-dashboard", "boceto-del-dashboard"],
    ["06-construir-el-dashboard", "dashboard-publicado"],
    ["07-presentar-en-cinco-minutos", "presentacion-al-directorio"],
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

// Las clases no tienen entregable: se completan al aprobar todas sus lecciones.
export const CLASES = new Set(["clases-de-excel", "clases-de-sql"]);

// Completa un caso entero: todas sus misiones y, si es un caso, el entregable aprobado por administración.
export async function completarCaso(page: Page, admin: Page, ip: string, email: string, caso: string) {
  await aprobar(page, ip, caso, MISIONES[caso]);
  if (CLASES.has(caso)) return;
  await page.goto(`/casos/${caso}`);
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill(`https://github.com/e2e/${caso}`);
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();
  // Se aprueba por la API de revisión, con 2 en las tres dimensiones: es más rápido y no depende de que la página
  // hidrate. La revisión con clics en la rúbrica la prueba recorrido.spec.
  await admin.goto("/profesor/entregables");
  const tarjeta = admin.locator("li", { hasText: email });
  await expect(tarjeta).toHaveCount(1);
  const entregableId = await tarjeta.locator("[data-entregable-id]").getAttribute("data-entregable-id");
  expect(entregableId, `${caso}: entregable sin id`).not.toBeNull();
  const respuesta = await admin.request.post(`/api/revision/entregables/${entregableId}`, {
    headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
    data: { puntajes: { claridad: 2, ejecucion: 2, coherencia: 2 }, observaciones: {}, comentario: null },
  });
  expect(respuesta.ok(), `${caso}: aprobación de entregable`).toBe(true);
}

export { entrarComoAdmin };
```

Desde ahora, el Caso 1 exige completar antes las clases de Excel:
- en `despachos.spec.ts` y `minimarkets.spec.ts`, después de `await completarCaso(page, admin, ip, email, "herramientas-del-oficio");`, agrega `await completarCaso(page, admin, ip, email, "clases-de-excel");`;
- en `clases.spec.ts`, `clinica.spec.ts`, `pewen.spec.ts` y `proyecto-final.spec.ts`, en la lista de casos, `"herramientas-del-oficio", "despachos-rapidos"` pasa a `"herramientas-del-oficio", "clases-de-excel", "despachos-rapidos"`;
- los nombres de las pruebas: en `despachos.spec.ts`, "con el Caso 0 completo:" pasa a "con el Caso 0 y las clases de Excel completos:" (y el comentario de arriba agrega ", y las clases de Excel"); en `minimarkets.spec.ts`, "con los casos 0 y 1 y las clases de SQL completos:" pasa a "con los casos 0 y 1 y sus clases completos:".

En `e2e/calentar.ts`, en `RUTAS`, antes de `"/casos/despachos-rapidos"`, agrega:
```ts
  "/casos/clases-de-excel",
  "/casos/clases-de-excel/02-primera-formula",
  "/casos/clases-de-excel/22-excel-vs-base-de-datos",
```

- [ ] **Step 2: La prueba de las clases de Excel**

Agrega al final de `e2e/tests/clases.spec.ts`:
```ts
test("con el Caso 0 completo: las clases de Excel traen su propia planilla y una lectura se completa al marcarla", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(180_000);
  const email = await registrarse(page, "Martina Rojas");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  await completarCaso(page, admin, ip, email, "herramientas-del-oficio");
  const excel = MISIONES["clases-de-excel"];
  await aprobar(page, ip, "clases-de-excel", excel.slice(0, 1));

  await page.goto("/casos/clases-de-excel/02-primera-formula");
  await expect(page.getByText("> lección 2/23", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Celda A2", exact: true })).toHaveText("Notebook");
  await expect(async () => {
    await page.getByRole("button", { name: "Celda D2", exact: true }).click();
    await page.getByLabel("Fórmula").fill("=B2*C2");
    await page.getByLabel("Fórmula").press("Enter");
    await expect(page.getByRole("button", { name: "Celda D2", exact: true })).toHaveText("1350000", { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  const aprobada = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;
  await expect(page.getByRole("heading", { name: "Lección aprobada" })).toBeVisible();

  await aprobar(page, ip, "clases-de-excel", excel.slice(2, 21));
  await page.goto("/casos/clases-de-excel/22-excel-vs-base-de-datos");
  await expect(page.getByText("¿usarías Excel o una base de datos?", { exact: false })).toBeVisible();
  const marcada = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Ver la respuesta y marcar como completada" }).click();
  await marcada;
  await expect(page.getByText("Una base de datos: el volumen y la edición simultánea", { exact: false })).toBeVisible();
  await expect(page.getByText("Aprobada", { exact: true })).toBeVisible();
});
```

Run: `npm run test:e2e -- tests/clases.spec.ts tests/despachos.spec.ts`
Expected: `4 passed`.

- [ ] **Step 3: README**

`## Clases` en `README.md` queda:
```markdown
## Clases

- **Qué son:** antes del caso que las aplica, una lección por tema, traída de las aulas de la v1. En `caso.yaml` llevan `tipo: clases` y solo `slug`, `titulo`, `dataset` y `misiones`: no tienen empresa, entregable, rúbrica ni certificado propio.
  - Se completan al aprobar todas sus lecciones y habilitan el caso siguiente de la ruta. Cuentan para el certificado de la ruta, pero no van al portafolio.
  - Cada lección es una misión con `<Concepto>`, `<Sintaxis>` (la forma general, que no se ejecuta), ejemplos, un ejercicio y un `<Debrief>` sin consejo de entrevista.
  - La última lección no tiene que ser sin guía: el caso siguiente cumple ese papel.
  - En la ruta Data Analyst: clases de Excel antes del Caso 1 y clases de SQL antes del Caso 2.
- **Planillas propias:** una tarea de planilla (`SheetTask`) toma su hoja de un CSV de `datos/` (`hoja`) o la trae escrita en la lección (`grilla`, fila por fila desde A1), como las aulas de la v1.
- **Lecturas:** `<LecturaTask pregunta respuesta />` es una lección sin validación automática, como las lecturas de la v1: se piensa la pregunta y, al marcarla como completada, aparece la respuesta del curso.
- **Importar un aula de la v1:**
  1. Exporta sus datos a JSON, con el Node de tu equipo: `node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-sql > tmp/aula-sql.json`.
  2. Escribe el borrador: `docker compose run --rm tools pnpm --filter @syntaxerror/content importar <sql|excel> /app/tmp/aula-<aula>.json /app/content/casos/<carpeta> <lección,lección,...>`.
  3. Revisa el borrador: tildes que el diccionario no corrige solo (`mas`, `aun`, `que` en preguntas), dos pistas por lección que orienten sin dar la respuesta, y el título y el dataset de `caso.yaml`. Después corre `npm run content:validate`.
- **El importador** (`packages/content/src/importar/`) tiene un formato común (`leccion.ts`: consultas, planillas y lecturas) y un adaptador por aula (`aula-sql.ts`, `aula-excel.ts`). Para Python o Power BI se agrega su adaptador.
  - En Excel, la v1 guardaba solo el valor esperado de cada celda: la fórmula de la solución se saca de la pista ("En D2 escribe =B2*C2"), se repite fila abajo cuando la pista dice "repite la misma lógica", y el validador comprueba que dé el valor esperado.
  - Corrige tildes con un diccionario y nombres propios de los datos (Concepción, Tomás), pero no toca los valores entre comillas simples, los nombres de tablas y columnas de SQL ni las planillas, para que los ejercicios sigan calzando con sus soluciones.
  - Descarta las pistas de la v1 que traían la consulta o la fórmula: el validador rechaza una pista de SQL o Python con la solución completa.
```

- [ ] **Step 4: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes.

Run: `npm run test:e2e`
Expected: `42 passed`. Dos corridas seguidas deben dar lo mismo.

- [ ] **Step 5: Commit**

```bash
git add e2e README.md
git commit -m "test(e2e): clases de excel antes del caso 1, con planilla propia y una lectura

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Python (34 lecciones), antes del Caso 3.** El aula de Python de la v1 tiene 32 ejercicios y 2 lecturas. Hace falta:
- un adaptador `aula-python.ts` hacia `PythonTask`;
- ver cómo valida la v1 los ejercicios, para convertir sus revisiones en las `pruebas` de la v2;
- las lecturas ya están resueltas con `LecturaTask`.

**Después:** Power BI (34 lecciones, prácticas en Power BI Desktop con autocorrección, que se resuelven con `LecturaTask` y su respuesta) e IA para datos (14 lecciones).
