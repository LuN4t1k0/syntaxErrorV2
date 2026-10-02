# Fase 6e: Clases de IA para datos. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Traer las 14 lecciones del aula de IA para datos de la v1 como "Clases de IA para datos", entre el Caso 4 (Clínica Cordillera Central) y el proyecto final, sin reescribirlas. Es la última aula de la ruta.

**Architecture:**
- **El aula está hecha de quizzes.** Cada lección de la v1 trae un objetivo, una explicación, conceptos, un caso breve y un quiz de 3 preguntas con 4 opciones. Se aprueba con todas las respuestas correctas.
- **La plataforma suma `QuizTask`:**
  - **El motor** está en `packages/engines/src/quiz.ts`. `revisarQuiz(preguntas, respuestas)` aprueba con todas correctas. Si no, dice cuántas están bien y cuáles revisar, nunca la respuesta correcta. Responder a medias no cuenta como intento fallido.
  - **El componente** mezcla las opciones al mostrarlas: en la v1 la correcta era siempre la primera. Marca las preguntas a revisar y, al aprobar, muestra la explicación de cada una.
  - **El validador** comprueba que responder la opción correcta de cada pregunta apruebe el quiz.
  - `Decision` no servía: no bloquea el avance y es de una sola pregunta.
- **El importador:**
  - el exportador trae también `lessonEnhancements` (conceptos, caso y quiz);
  - el formato común suma `TareaQuiz` y `Seccion.lista`, para mostrar los conceptos como lista;
  - el adaptador es `aula-ia.ts`.
- **Revisión editorial,** sin reescribir el contenido:
  - tildes de contexto;
  - los "¿" de las preguntas del quiz;
  - "Qué" con tilde en las opciones que responden una pregunta ("Un próximo paso responde... Qué acción se debe tomar después"), y sin tilde en las que completan una frase ("Un límite indica... Que no se puede afirmar todavía").

**Tech Stack:** Zod, MDX 3, React 19, Vitest 4 y Playwright 1.55.

**Spec:** `docs/propuesta-pedagogica-data-analyst.md`, sección 3 (clases) y decisión 6. Decisión del 2026-10-02: IA para datos va como clases propias, antes del proyecto final.

## Global Constraints

**Copia literal:** cada archivo completo de este plan se copia exactamente como está, con sus comentarios. Las 14 lecciones son la versión final después de la revisión editorial: compáralas con `diff` contra el plan antes del commit.

**Entorno**
- Todo se ejecuta con `docker compose run --rm tools ...`, salvo la exportación del aula (Task 3), que usa el Node del equipo.
- El paquete de la app se llama `web`.

**Contenido:** no se reescribe el texto de la v1. Las preguntas, opciones e índices de las respuestas correctas se copian sin cambios. El orden de las opciones lo mezcla el componente al mostrarlas, no el contenido.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Un quiz con la correcta siempre en la misma posición:** las opciones se mezclan en el navegador, así que la persona no puede aprender "la primera es la buena". Revisado en `quiz-task.tsx`, que usa `mezclar` igual que `Decision`.
2. **Un error que revela la respuesta:** el diagnóstico solo dice cuántas están bien y qué preguntas revisar, y las explicaciones aparecen recién al aprobar. Probado en `quiz.test.ts` y en `clases.spec.ts`.
3. **Responder a medias:** "Responde todas las preguntas antes de validar." no cuenta como intento fallido (`errorDeCodigo`). Probado en `quiz.test.ts`.
4. **Un `correcta` fuera de rango o una pregunta con una sola opción** en el contenido: el esquema la rechaza. Probado en `bloques.test.ts`.
5. **El proyecto final queda bloqueado hasta completar las 14 lecciones.** Probado en `proyecto-final.spec.ts`, que ahora completa las clases antes.

## Estructura de archivos

```
packages/engines/src/quiz.ts (+ test), package.json                              motor del quiz
packages/content/src/esquemas.ts, validar.ts (+ bloques.test, validar.test)       QuizTask
apps/web/src/components/mision/quiz-task.tsx, componentes.tsx                    pantalla
packages/content/scripts/exportar-aula-v1.mjs, src/importar/leccion.ts, aula-ia.ts (+ test), importar-cli.ts
content/casos/clases-de-ia-para-datos/ (caso.yaml y 14 lecciones), content/rutas/data-analyst.yaml
apps/web/src/db/release.test.ts                                                   12 casos
e2e/tests/progreso.ts, clases.spec.ts, proyecto-final.spec.ts, e2e/calentar.ts
README.md
```

---

### Task 1: El quiz

**Files:**
- Create: `packages/engines/src/quiz.ts`
- Test: `packages/engines/src/quiz.test.ts`
- Modify: `packages/engines/package.json`, `packages/content/src/esquemas.ts`, `packages/content/src/validar.ts`
- Test: `packages/content/src/bloques.test.ts`, `packages/content/src/validar.test.ts`
- Create: `apps/web/src/components/mision/quiz-task.tsx`
- Modify: `apps/web/src/components/mision/componentes.tsx`

**Interfaces:**
- Produces:
  - `PreguntaQuiz = { pregunta, opciones, correcta, explicacion }` y `revisarQuiz(preguntas, respuestas): ResultadoTarea & { incorrectas: number[] }`, en `@syntaxerror/engines/quiz`;
  - el bloque `QuizTask: { id, enunciado?, preguntas: PreguntaQuiz[], pistas }`, que suma `"QuizTask"` a `TIPOS_TAREA`;
  - `<QuizTask id enunciado preguntas pistas />`.

- [ ] **Step 1: Escribir las pruebas**

`packages/engines/src/quiz.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { revisarQuiz, type PreguntaQuiz } from "./quiz";

const preguntas: PreguntaQuiz[] = [
  { pregunta: "¿Qué manda en un análisis?", opciones: ["La fuente de datos", "El tono del modelo"], correcta: 0, explicacion: "Sin fuente no hay análisis." },
  { pregunta: "¿Antes de usar una conclusión?", opciones: ["Copiarla", "Validarla"], correcta: 1, explicacion: "La validación reduce errores." },
  { pregunta: "¿La IA garantiza conclusiones?", opciones: ["Sí", "No"], correcta: 1, explicacion: "Asiste, no garantiza." },
];

describe("revisarQuiz", () => {
  it("aprueba con todas las respuestas correctas", () => {
    expect(revisarQuiz(preguntas, [0, 1, 1])).toEqual({ aprobada: true, diagnostico: null, incorrectas: [] });
  });

  it("dice cuántas están bien y cuáles revisar, sin decir la correcta", () => {
    expect(revisarQuiz(preguntas, [0, 0, 1])).toEqual({ aprobada: false, diagnostico: "Tienes 2 de 3 respuestas correctas. Revisa la pregunta 2.", incorrectas: [1] });
    expect(revisarQuiz(preguntas, [1, 0, 1]).diagnostico).toBe("Tienes 1 de 3 respuestas correctas. Revisa las preguntas 1, 2.");
  });

  it("responder a medias no cuenta como intento fallido", () => {
    expect(revisarQuiz(preguntas, [0, null, 1])).toEqual({ aprobada: false, diagnostico: "Responde todas las preguntas antes de validar.", errorDeCodigo: true, incorrectas: [] });
  });
});
```

Al final de `packages/content/src/bloques.test.ts`, agrega:
```ts
describe("quiz", () => {
  it("cada pregunta tiene al menos dos opciones y la correcta es una de ellas", async () => {
    const { bloqueSchemas } = await import("./esquemas");
    const pregunta = { pregunta: "¿Qué manda?", opciones: ["La fuente", "El modelo"], correcta: 1, explicacion: "La fuente." };
    expect(bloqueSchemas.QuizTask.parse({ id: "x", preguntas: [pregunta] })).toEqual({ id: "x", preguntas: [pregunta], pistas: [] });
    expect(bloqueSchemas.QuizTask.safeParse({ id: "x", preguntas: [{ ...pregunta, correcta: 2 }] }).success).toBe(false);
    expect(bloqueSchemas.QuizTask.safeParse({ id: "x", preguntas: [{ ...pregunta, opciones: ["Una"] }] }).success).toBe(false);
    expect(bloqueSchemas.QuizTask.safeParse({ id: "x", preguntas: [] }).success).toBe(false);
  });
});
```

En `packages/content/src/validar.test.ts`:
1. El mensaje de "rechaza una misión sin tarea práctica" termina en `(SqlTask, PythonTask, SheetTask, MarkdownTask, GithubTask, LecturaTask o QuizTask)`.
2. Antes de `it("una lectura cuenta como tarea práctica ...")`, agrega:
```ts
  it("un quiz cuenta como tarea práctica", async () => {
    const filtrar = mision("01-filtrar");
    filtrar.bloques = filtrar.bloques.filter((candidato) => candidato.tipo !== "SqlTask");
    filtrar.bloques.push({ tipo: "QuizTask", props: { id: "quiz", preguntas: [{ pregunta: "¿Qué manda?", opciones: ["La fuente", "El modelo"], correcta: 0, explicacion: "La fuente." }], pistas: [] }, texto: null });
    expect(await validar()).toEqual([]);
  });
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines exec vitest run src/quiz.test.ts; pnpm --filter @syntaxerror/content exec vitest run src/bloques.test.ts src/validar.test.ts"`
Expected: FAIL. `./quiz` y `QuizTask` no existen.

- [ ] **Step 3: Implementar**

`packages/engines/src/quiz.ts`:
```ts
import type { ResultadoTarea } from "./tipos";

// Un quiz de opción única, como los de las aulas de la v1: se aprueba con todas las respuestas correctas.
export type PreguntaQuiz = { pregunta: string; opciones: string[]; correcta: number; explicacion: string };

// respuestas[i] es el índice de la opción elegida en la pregunta i (en el orden original), o null si no se respondió.
// El diagnóstico dice cuántas están bien y cuáles revisar, nunca cuál es la correcta.
export function revisarQuiz(preguntas: PreguntaQuiz[], respuestas: (number | null)[]): ResultadoTarea & { incorrectas: number[] } {
  const sinResponder = preguntas.map((_, indice) => indice).filter((indice) => respuestas[indice] === null || respuestas[indice] === undefined);
  if (sinResponder.length > 0) {
    // Responder a medias no es un resultado incorrecto: no cuenta como intento.
    return { aprobada: false, diagnostico: "Responde todas las preguntas antes de validar.", errorDeCodigo: true, incorrectas: [] };
  }
  const incorrectas = preguntas.map((pregunta, indice) => (respuestas[indice] === pregunta.correcta ? -1 : indice)).filter((indice) => indice >= 0);
  if (incorrectas.length === 0) return { aprobada: true, diagnostico: null, incorrectas };
  const buenas = preguntas.length - incorrectas.length;
  const cuales = incorrectas.map((indice) => indice + 1).join(", ");
  return {
    aprobada: false,
    diagnostico: `Tienes ${buenas} de ${preguntas.length} respuestas correctas. Revisa ${incorrectas.length === 1 ? `la pregunta ${cuales}` : `las preguntas ${cuales}`}.`,
    incorrectas,
  };
}
```

En `packages/engines/package.json`, agrega a `exports`, al final:
```json
    "./quiz": "./src/quiz.ts"
```

En `packages/content/src/esquemas.ts`:
1. Antes del comentario de `LecturaTask` ("Una lección de lectura de las aulas de la v1 ..."), agrega:
```ts
  // Un quiz de opción única, como los de las aulas de la v1: se aprueba con todas las respuestas correctas.
  QuizTask: z.object({
    id: idTarea,
    enunciado: z.string().optional(),
    preguntas: z
      .array(
        z
          .object({ pregunta: texto, opciones: z.array(texto).min(2, "necesita al menos dos opciones"), correcta: z.number().int().min(0), explicacion: texto })
          .refine((pregunta) => pregunta.correcta < pregunta.opciones.length, { message: "correcta debe ser el índice de una de las opciones", path: ["correcta"] })
      )
      .min(1, "el quiz necesita al menos una pregunta"),
    pistas,
  }),
```
2. `TIPOS_TAREA` termina en `"GithubTask", "LecturaTask", "QuizTask"] as const;`.

`packages/content/src/validar.ts` completo:
```ts
import { revisarMarkdown } from "@syntaxerror/engines/markdown";
import { revisarQuiz } from "@syntaxerror/engines/quiz";
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
    case "QuizTask":
      // Responder la opción correcta de cada pregunta tiene que aprobar el quiz.
      return revisarQuiz(tarea.props.preguntas, tarea.props.preguntas.map((pregunta) => pregunta.correcta));
  }
}

export async function validarContenido(contenido: Contenido, { revisarPython }: { revisarPython: RevisorPython }): Promise<string[]> {
  const problemas: string[] = [];
  for (const caso of contenido.casos) {
    for (const mision of caso.misiones) {
      const donde = `casos/${caso.slug}/misiones/${mision.slug}.mdx`;
      const tareas = tareasDeMision(mision);
      if (tareas.length === 0) problemas.push(`${donde}: la misión no tiene ninguna tarea práctica (SqlTask, PythonTask, SheetTask, MarkdownTask, GithubTask, LecturaTask o QuizTask)`);
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

`apps/web/src/components/mision/quiz-task.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { revisarQuiz, type PreguntaQuiz } from "@syntaxerror/engines/quiz";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { cn } from "@syntaxerror/ui/cn";
import { Button } from "@syntaxerror/ui/components/button";
import { mezclar } from "@/lib/mezclar";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";

// Un quiz de opción única. Las opciones se mezclan al mostrarse (en las aulas de la v1 la correcta era siempre la
// primera). Con un error se marcan las preguntas a revisar, sin decir la respuesta; al aprobar se ve la explicación.
export function QuizTask({ id, enunciado, preguntas, pistas }: { id: string; enunciado?: string; preguntas: PreguntaQuiz[]; pistas: string[] }) {
  const { tareaAprobada, registrarResultado } = useMision();
  const [ordenes, setOrdenes] = useState<number[][] | null>(null);
  const [respuestas, setRespuestas] = useState<(number | null)[]>(() => preguntas.map(() => null));
  const [resultado, setResultado] = useState<(ResultadoTarea & { incorrectas: number[] }) | null>(null);
  const aprobada = tareaAprobada(id);
  useEffect(() => setOrdenes(preguntas.map((pregunta) => mezclar(pregunta.opciones.map((_, indice) => indice)))), [preguntas]);

  function elegir(pregunta: number, opcion: number) {
    setRespuestas((actuales) => actuales.map((actual, indice) => (indice === pregunta ? opcion : actual)));
  }
  function validar() {
    const revision = revisarQuiz(preguntas, respuestas);
    setResultado(revision);
    registrarResultado(id, revision);
  }
  const mostrarExplicaciones = aprobada || resultado?.aprobada === true;

  return (
    <PanelTarea id={id} titulo="quiz" enunciado={enunciado} aprobada={aprobada} resultado={resultado} pistas={pistas} acciones={<Button type="button" disabled={!ordenes} onClick={validar}>Validar</Button>}>
      {ordenes ? (
        <ol className="grid gap-4">
          {preguntas.map((pregunta, indicePregunta) => {
            const revisar = resultado?.incorrectas.includes(indicePregunta) ?? false;
            return (
              <li key={pregunta.pregunta} className={cn("grid gap-2 rounded-md border p-3", revisar ? "border-destructive" : "border-border")}>
                <fieldset className="grid gap-2">
                  <legend className="font-bold leading-7">{`${indicePregunta + 1}. ${pregunta.pregunta}`}</legend>
                  {ordenes[indicePregunta].map((opcion) => (
                    <label key={opcion} className="flex items-start gap-2 text-sm leading-6">
                      <input type="radio" className="mt-1.5" name={`${id}-${indicePregunta}`} checked={respuestas[indicePregunta] === opcion} onChange={() => elegir(indicePregunta, opcion)} />
                      {pregunta.opciones[opcion]}
                    </label>
                  ))}
                </fieldset>
                {revisar ? <p className="text-sm font-bold text-destructive">Revisa esta pregunta.</p> : null}
                {mostrarExplicaciones ? <p className="text-sm text-muted-foreground">{pregunta.explicacion}</p> : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Cargando preguntas…</p>
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
import { QuizTask } from "./quiz-task";
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
    QuizTask: (props: PropsMdx) => <QuizTask {...bloqueSchemas.QuizTask.parse(props)} />,
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

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines test && pnpm --filter @syntaxerror/content test && pnpm --filter @syntaxerror/engines exec tsc --noEmit && pnpm --filter @syntaxerror/content exec tsc --noEmit && pnpm --filter web exec tsc --noEmit"`
Expected: PASS y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add packages/engines packages/content/src/esquemas.ts packages/content/src/validar.ts packages/content/src/bloques.test.ts packages/content/src/validar.test.ts apps/web/src/components/mision
git commit -m "feat(quiz): quiz de opcion unica con opciones mezcladas, que marca que revisar sin dar la respuesta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: El adaptador de IA para datos

**Files:**
- Modify: `packages/content/scripts/exportar-aula-v1.mjs`, `packages/content/src/importar/leccion.ts`, `packages/content/src/importar/importar-cli.ts`
- Create: `packages/content/src/importar/aula-ia.ts`
- Test: `packages/content/src/importar/aula-ia.test.ts`

**Interfaces:**
- Produces:
  - el JSON exportado suma `enhancements`;
  - en `importar/leccion`: `TareaQuiz` (que se suma a `Tarea`) y `Seccion.lista`; una sección sin párrafos se escribe sin espacio de más;
  - en `importar/aula-ia`: `LeccionIaV1`, `MejoraIaV1`, `PreguntaIaV1` y `convertirLeccionIa(v1, mejora, numero)`;
  - el comando `importar <sql|excel|python|powerbi|ia> ...`.

- [ ] **Step 1: Escribir las pruebas**

`packages/content/src/importar/aula-ia.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { convertirLeccionIa, type MejoraIaV1 } from "./aula-ia";
import { leccionAMdx } from "./leccion";

const v1 = { slug: "calidad-de-datos", title: "Calidad de datos", objective: "Reconocer problemas antes de analizar.", explanation: ["La calidad de datos determina el resultado."] };
const mejora: MejoraIaV1 = {
  concepts: ["Duplicado: registro repetido.", "Valor faltante: dato que no esta informado."],
  caseStudy: "La categoria 'Ventas' aparece como Ventas, venta y Vtas.",
  activity: { questions: [{ question: "Que causa una categoria mezclada?", options: ["Conteos incorrectos.", "Mas precision."], answerIndex: 0, explanation: "Se cuenta por separado." }], hint: "Revisa las categorias." },
};

describe("convertirLeccionIa", () => {
  it("lleva el objetivo, los conceptos y el caso al concepto, y el quiz a un QuizTask", () => {
    const leccion = convertirLeccionIa(v1, mejora, 3);
    expect(leccion).toMatchObject({ slug: "03-calidad-de-datos", minutos: 10, intro: ["**Objetivo:** Reconocer problemas antes de analizar.", "La calidad de datos determina el resultado."] });
    expect(leccion.secciones).toEqual([
      { titulo: "Conceptos clave", parrafos: [], ejemplo: null, lista: ["Duplicado: registro repetido.", "Valor faltante: dato que no esta informado."] },
      { titulo: "Un caso", parrafos: ["La categoría 'Ventas' aparece como Ventas, venta y Vtas."], ejemplo: null },
    ]);
    expect(leccion.tarea).toEqual({
      tipo: "QuizTask",
      id: "calidad-de-datos",
      preguntas: [{ pregunta: "Que causa una categoría mezclada?", opciones: ["Conteos incorrectos.", "Mas precisión."], correcta: 0, explicacion: "Se cuenta por separado." }],
      pistas: ["Revisa las categorías."],
    });
  });

  it("el MDX trae la lista de conceptos y el quiz; una lección sin quiz no se importa", () => {
    const mdx = leccionAMdx(convertirLeccionIa(v1, mejora, 3));
    expect(mdx).toContain("**Conceptos clave.**\n\n- Duplicado: registro repetido.\n- Valor faltante");
    expect(mdx).toContain('<QuizTask\n  id="calidad-de-datos"');
    expect(() => convertirLeccionIa(v1, undefined, 1)).toThrow("no tiene quiz");
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/importar/aula-ia.test.ts`
Expected: FAIL, "Failed to resolve import ./aula-ia".

- [ ] **Step 3: Implementar**

`packages/content/scripts/exportar-aula-v1.mjs` completo:
```js
// Exporta un aula de la v1 a JSON para importarla (packages/content/src/importar), con sus datasets descargables. Corre con el Node del equipo, fuera
// de Docker, porque lee el repositorio de la v1: node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-sql
// > tmp/aula-sql.json. Solo lee los módulos de datos del aula (lecciones y datasets); no ejecuta la app.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const aula = process.argv[2];
if (!aula) {
  console.error("Uso: node exportar-aula-v1.mjs <carpeta del aula de la v1>");
  process.exit(1);
}
const modulo = (nombre) => pathToFileURL(path.resolve(aula, "src", "data", nombre)).href;
const lecciones = await import(modulo("lessons.js"));
const datasets = existsSync(path.resolve(aula, "src", "data", "datasets.js")) ? (await import(modulo("datasets.js"))).datasets : {};
// Los CSV que el aula ofrecía para descargar (por ejemplo, las prácticas de Power BI), tal cual.
const carpeta = path.resolve(aula, "public", "datasets");
const archivos = existsSync(carpeta)
  ? Object.fromEntries(readdirSync(carpeta).filter((nombre) => nombre.endsWith(".csv")).sort().map((nombre) => [nombre, readFileSync(path.join(carpeta, nombre), "utf8")]))
  : {};
// Lo que algunas aulas guardan aparte de cada lección (en IA para datos: conceptos, caso y quiz).
const enhancements = lecciones.lessonEnhancements ?? {};
process.stdout.write(`${JSON.stringify({ modules: lecciones.modules ?? [], lessons: lecciones.lessons, datasets, archivos, enhancements }, null, 2)}\n`);
```

`packages/content/src/importar/leccion.ts` completo:
~~~~ts
// Formato común de una lección importada desde un aula de la v1, y su escritura como MDX de la v2.
// Cada aula tiene su adaptador (aula-sql.ts, y después Excel, Python y Power BI) que llena este formato; el resto
// del camino (escribir el MDX, el caso.yaml y los datos) es el mismo para todas.
//
// Lo que sale de aquí es un borrador: después viene la revisión editorial (tildes que el diccionario no cubre, tono
// de tú, pistas que orientan sin dar la respuesta). El validador de contenido revisa que cada solución pase.

// Una sección del concepto: párrafos y, si la tiene, una consulta que se puede probar (ejemplo), una fórmula de
// planilla que solo se muestra (formula) o código de Python que solo se muestra (codigo), porque usa los datos de la
// preparación de la tarea.
export type Seccion = { titulo: string; parrafos: string[]; ejemplo: string | null; formula?: string | null; codigo?: string | null; lenguaje?: string; lista?: string[] };

// Una práctica fuera de la plataforma (por ejemplo, en Power BI Desktop): qué se hace, los pasos y el archivo de datos.
export type Practica = { enunciado: string; pasos: string[]; datos: { nombre: string; enlace: string } | null };

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

export type TareaPython = {
  tipo: "PythonTask";
  id: string;
  enunciado: string;
  preparacion: string;
  inicial: string;
  solucion: string;
  pruebas: string;
  paquetes: "pandas"[];
  pistas: string[];
};

// Una lección de lectura: una pregunta para pensar y la respuesta del curso.
export type TareaLectura = { tipo: "LecturaTask"; id: string; pregunta: string; respuesta: string };

// Un quiz de opción única: se aprueba con todas las respuestas correctas.
export type TareaQuiz = {
  tipo: "QuizTask";
  id: string;
  preguntas: { pregunta: string; opciones: string[]; correcta: number; explicacion: string }[];
  pistas: string[];
};

export type Tarea = TareaSql | TareaHoja | TareaPython | TareaLectura | TareaQuiz;

export type Leccion = {
  slug: string;
  titulo: string;
  minutos: number;
  intro: string[];
  sintaxis: { lenguaje: "sql" | "python" | "planilla"; codigo: string } | null;
  secciones: Seccion[];
  practica?: Practica | null;
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
  const partes = [[`**${escaparTexto(seccion.titulo)}.**`, ...seccion.parrafos.map(escaparTexto)].join(" ")];
  if (seccion.lista?.length) partes.push(seccion.lista.map((item) => `- ${escaparTexto(item)}`).join("\n"));
  if (seccion.ejemplo) partes.push(`<SqlEjemplo consulta=${atributo(seccion.ejemplo)} />`);
  if (seccion.formula) partes.push(`<Sintaxis lenguaje="planilla" codigo=${atributo(seccion.formula)} />`);
  // Un bloque de código de MDX se muestra tal cual: no necesita escaparse.
  if (seccion.codigo) partes.push([`\`\`\`${seccion.lenguaje ?? "python"}`, seccion.codigo, "```"].join("\n"));
  return partes.join("\n\n");
}

function practicaMdx(practica: Practica): string {
  const datos = practica.datos ? ` Los datos están en [${practica.datos.nombre}](${practica.datos.enlace}), también en «Datos del caso» de estas clases.` : "";
  return [`**Práctica.** ${escaparTexto(practica.enunciado)}${datos}`, practica.pasos.map((paso, indice) => `${indice + 1}. ${escaparTexto(paso)}`).join("\n")].join("\n\n");
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
    case "PythonTask":
      return [
        "<PythonTask",
        `  id="${tarea.id}"`,
        `  enunciado=${atributo(tarea.enunciado)}`,
        `  preparacion=${atributo(tarea.preparacion)}`,
        `  inicial=${atributo(tarea.inicial)}`,
        `  solucion=${atributo(tarea.solucion)}`,
        `  pruebas=${atributo(tarea.pruebas)}`,
        `  paquetes={${JSON.stringify(tarea.paquetes)}}`,
        `  pistas={${JSON.stringify(tarea.pistas)}}`,
        "/>",
      ];
    case "QuizTask":
      return ["<QuizTask", `  id="${tarea.id}"`, `  preguntas={${JSON.stringify(tarea.preguntas)}}`, `  pistas={${JSON.stringify(tarea.pistas)}}`, "/>"];
    case "LecturaTask":
      return ["<LecturaTask", `  id="${tarea.id}"`, `  pregunta=${atributo(tarea.pregunta)}`, `  respuesta=${atributo(tarea.respuesta)}`, "/>"];
  }
}

export function leccionAMdx(leccion: Leccion): string {
  const concepto = [
    ...leccion.intro.map(escaparTexto),
    ...(leccion.sintaxis ? [`<Sintaxis lenguaje="${leccion.sintaxis.lenguaje}" codigo=${atributo(leccion.sintaxis.codigo)} />`] : []),
    ...leccion.secciones.map(seccionMdx),
    ...(leccion.practica ? [practicaMdx(leccion.practica)] : []),
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
  agrupacion: "agrupación",
  ahi: "ahí",
  alfabetico: "alfabético",
  analisis: "análisis",
  analitica: "analítica",
  anio: "año",
  anios: "años",
  anonimizacion: "anonimización",
  antiguedad: "antigüedad",
  aparicion: "aparición",
  aplicacion: "aplicación",
  aplicala: "aplícala",
  aqui: "aquí",
  area: "área",
  areas: "áreas",
  aritmetica: "aritmética",
  aritmeticos: "aritméticos",
  asi: "así",
  asignacion: "asignación",
  automaticamente: "automáticamente",
  automaticas: "automáticas",
  automaticos: "automáticos",
  autorizacion: "autorización",
  basica: "básica",
  basicas: "básicas",
  basico: "básico",
  basicos: "básicos",
  botin: "botín",
  boton: "botón",
  busqueda: "búsqueda",
  calculo: "cálculo",
  calculos: "cálculos",
  categoria: "categoría",
  categorias: "categorías",
  categoricas: "categóricas",
  cirugia: "cirugía",
  clasificacion: "clasificación",
  codigo: "código",
  codigos: "códigos",
  coleccion: "colección",
  combinacion: "combinación",
  como: "cómo",
  comodo: "cómodo",
  comparacion: "comparación",
  comprobacion: "comprobación",
  comun: "común",
  conclusion: "conclusión",
  condicion: "condición",
  conexion: "conexión",
  configuracion: "configuración",
  confirmacion: "confirmación",
  contraccion: "contracción",
  conversion: "conversión",
  corrigelo: "corrígelo",
  critico: "crítico",
  criticos: "críticos",
  cupon: "cupón",
  deberia: "debería",
  deberian: "deberían",
  decision: "decisión",
  definicion: "definición",
  desafio: "desafío",
  descripcion: "descripción",
  despues: "después",
  devolucion: "devolución",
  dia: "día",
  diagnostico: "diagnóstico",
  dias: "días",
  diciendote: "diciéndote",
  dificil: "difícil",
  dimension: "dimensión",
  dinamica: "dinámica",
  dinamicas: "dinámicas",
  dinamico: "dinámico",
  direccion: "dirección",
  dispersion: "dispersión",
  distribucion: "distribución",
  division: "división",
  dolar: "dólar",
  dolio: "dolió",
  donde: "dónde",
  edicion: "edición",
  ejecucion: "ejecución",
  ejecutalo: "ejecútalo",
  eleccion: "elección",
  especifica: "específica",
  especificas: "específicas",
  estadistica: "estadística",
  estatica: "estática",
  estatico: "estático",
  evalua: "evalúa",
  evolucion: "evolución",
  existia: "existía",
  explicacion: "explicación",
  explicita: "explícita",
  explicitamente: "explícitamente",
  exploracion: "exploración",
  exposicion: "exposición",
  expresion: "expresión",
  facil: "fácil",
  formula: "fórmula",
  formulas: "fórmulas",
  funcion: "función",
  grafico: "gráfico",
  graficos: "gráficos",
  guia: "guía",
  harias: "harías",
  identica: "idéntica",
  incluyendote: "incluyéndote",
  indice: "índice",
  informacion: "información",
  inscribio: "inscribió",
  inscripcion: "inscripción",
  instalacion: "instalación",
  instruccion: "instrucción",
  intentaria: "intentaría",
  interaccion: "interacción",
  interpretacion: "interpretación",
  interseccion: "intersección",
  intuicion: "intuición",
  inutil: "inútil",
  jerarquia: "jerarquía",
  jerarquias: "jerarquías",
  jerarquicos: "jerárquicos",
  leccion: "lección",
  libreria: "librería",
  linea: "línea",
  lineas: "líneas",
  logica: "lógica",
  logicos: "lógicos",
  manipulacion: "manipulación",
  margenes: "márgenes",
  mascara: "máscara",
  matematicas: "matemáticas",
  maximo: "máximo",
  mayoria: "mayoría",
  mayusculas: "mayúsculas",
  mecanicos: "mecánicos",
  metrica: "métrica",
  metricas: "métricas",
  minimizacion: "minimización",
  minimo: "mínimo",
  minusculas: "minúsculas",
  mision: "misión",
  moderacion: "moderación",
  muestrame: "muéstrame",
  multiples: "múltiples",
  normalizacion: "normalización",
  numerica: "numérica",
  numericas: "numéricas",
  numero: "número",
  numeros: "números",
  obligaria: "obligaría",
  observacion: "observación",
  ocurrio: "ocurrió",
  operacion: "operación",
  origenes: "orígenes",
  pagina: "página",
  parentesis: "paréntesis",
  patron: "patrón",
  pelicula: "película",
  pesaria: "pesaría",
  pestana: "pestaña",
  pestanas: "pestañas",
  piensalo: "piénsalo",
  podria: "podría",
  porcion: "porción",
  posicion: "posición",
  precision: "precisión",
  presentacion: "presentación",
  produccion: "producción",
  proporcion: "proporción",
  proxima: "próxima",
  proximo: "próximo",
  quedarian: "quedarían",
  quedate: "quédate",
  rapida: "rápida",
  rapido: "rápido",
  razon: "razón",
  recomendacion: "recomendación",
  region: "región",
  relacion: "relación",
  repeticion: "repetición",
  revision: "revisión",
  sabras: "sabrás",
  sangria: "sangría",
  seccion: "sección",
  segmentacion: "segmentación",
  segun: "según",
  seleccion: "selección",
  semaforo: "semáforo",
  sesion: "sesión",
  simultanea: "simultánea",
  sistematicos: "sistemáticos",
  solucion: "solución",
  subexpresion: "subexpresión",
  suposicion: "suposición",
  tambien: "también",
  taxonomia: "taxonomía",
  tecnica: "técnica",
  tecnicamente: "técnicamente",
  telefonicos: "telefónicos",
  tendran: "tendrán",
  tenias: "tenías",
  teoria: "teoría",
  tipicamente: "típicamente",
  tipico: "típico",
  tipicos: "típicos",
  tipografia: "tipografía",
  todavia: "todavía",
  transformacion: "transformación",
  trio: "trío",
  ultima: "última",
  ultimo: "último",
  unica: "única",
  unicas: "únicas",
  unico: "único",
  usarias: "usarías",
  util: "útil",
  utiles: "útiles",
  vacia: "vacía",
  vacio: "vacío",
  validacion: "validación",
  valido: "válido",
  vendio: "vendió",
  verificacion: "verificación",
  version: "versión",
  visualizacion: "visualización",
};

// «como» y «donde» solo llevan tilde en preguntas o títulos: se corrigen al inicio del texto o después de «¿»
// (por ejemplo «Como pensarlo» → «Cómo pensarlo»). El resto de las palabras se corrige siempre.
const SOLO_AL_INICIO = new Set(["como", "donde"]);

// Frases fijas de las aulas de la v1 que el diccionario no puede corregir solo («que» lleva tilde solo en preguntas), y
// el voseo de algunas aulas: el texto trata de tú (las formas en -ar sin tilde, como «carga», ya son de tú).
const FRASES: [RegExp, string][] = [
  [/\bPara que sirve\b/g, "Para qué sirve"],
  [/\b(por|para) vos\b/g, "$1 ti"],
  [/\bcon vos\b/g, "contigo"],
  [/\b([Hh])ace clic\b/g, "$1az clic"],
  [/\bAnda a\b/g, "Ve a"],
];

// Formas del voseo que no se confunden con otra palabra, y su forma con tú.
const VOSEO: Record<string, string> = {
  abri: "abre",
  acordate: "acuérdate",
  asegurate: "asegúrate",
  descargalo: "descárgalo",
  elegi: "elige",
  escribi: "escribe",
  fijate: "fíjate",
  podes: "puedes",
  queres: "quieres",
  seleccioná: "selecciona",
  segui: "sigue",
  tenes: "tienes",
  volve: "vuelve",
};

// El texto entre comillas simples es un valor de los datos ('Sin inscripcion', 'Santiago'): tiene que quedar igual
// que en la solución, así que no se corrige. En Power BI, en cambio, las comillas encierran nombres de menús
// ('Segmentación de datos'), que sí se corrigen: ahí se pasa { respetarComillas: false }.
export function corregirTildes(texto: string, excepto: ReadonlySet<string> = new Set(), { respetarComillas = true } = {}): string {
  if (!respetarComillas) return corregirTramo(texto, excepto);
  return texto
    .split(/('[^']*')/)
    .map((parte) => (parte.startsWith("'") ? parte : corregirTramo(parte, excepto)))
    .join("");
}

function corregirTramo(texto: string, excepto: ReadonlySet<string>): string {
  const conFrases = FRASES.reduce((actual, [patron, correcta]) => actual.replace(patron, correcta), texto);
  return conFrases.replace(/(^|[^\p{L}\p{N}_])([\p{L}]+)(?=$|[^\p{L}\p{N}_])/gu, (coincidencia, antes: string, palabra: string, desde: number) => {
    const minuscula = palabra.toLowerCase();
    const correcta = TILDES[minuscula] ?? VOSEO[minuscula];
    if (!correcta || excepto.has(minuscula)) return coincidencia;
    if (SOLO_AL_INICIO.has(minuscula) && !(desde === 0 || /¿\s*$/.test(conFrases.slice(0, desde + antes.length)))) return coincidencia;
    const conMayuscula = palabra[0] !== palabra[0].toLowerCase();
    return `${antes}${conMayuscula ? correcta[0].toUpperCase() + correcta.slice(1) : correcta}`;
  });
}
~~~~

`packages/content/src/importar/aula-ia.ts`:
```ts
import { corregirTildes, type Leccion } from "./leccion";

// Adaptador del aula de IA para datos de la v1 (aula-ia-datos/src/data/lessons.js, exportado a JSON).
// Cada lección tiene un objetivo, una explicación, conceptos, un caso de ejemplo y un quiz de opción única (en
// lessonEnhancements). El quiz pasa a ser un QuizTask: se aprueba con todas las respuestas correctas, como en la v1.

export type LeccionIaV1 = { slug: string; title: string; objective: string; explanation: string[] };
export type PreguntaIaV1 = { question: string; options: string[]; answerIndex: number; explanation: string };
export type MejoraIaV1 = { concepts?: string[]; caseStudy?: string; activity: { questions: PreguntaIaV1[]; hint?: string } };

// Las lecciones de la v1 no traen duración: el quiz y la lectura toman unos 10 minutos.
const MINUTOS = 10;

export function convertirLeccionIa(v1: LeccionIaV1, mejora: MejoraIaV1 | undefined, numero: number): Leccion {
  if (!mejora?.activity.questions.length) throw new Error(`La lección ${v1.slug} no tiene quiz`);
  const texto = (valor: string) => corregirTildes(valor);
  const secciones = [
    ...(mejora.concepts?.length ? [{ titulo: "Conceptos clave", parrafos: [], ejemplo: null, lista: mejora.concepts.map(texto) }] : []),
    ...(mejora.caseStudy ? [{ titulo: "Un caso", parrafos: [texto(mejora.caseStudy)], ejemplo: null }] : []),
  ];
  return {
    slug: `${String(numero).padStart(2, "0")}-${v1.slug}`,
    titulo: texto(v1.title),
    minutos: MINUTOS,
    intro: [`**Objetivo:** ${texto(v1.objective)}`, ...v1.explanation.map(texto)],
    sintaxis: null,
    secciones,
    tarea: {
      tipo: "QuizTask",
      id: v1.slug,
      preguntas: mejora.activity.questions.map((pregunta) => ({
        pregunta: texto(pregunta.question),
        opciones: pregunta.options.map(texto),
        correcta: pregunta.answerIndex,
        explicacion: texto(pregunta.explanation),
      })),
      pistas: mejora.activity.hint ? [texto(mejora.activity.hint)] : [],
    },
    cierre: null,
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
import { convertirLeccionIa, type LeccionIaV1, type MejoraIaV1 } from "./aula-ia";
import { columnasDeDatasets, convertirLeccionPowerBi, type LeccionPowerBiV1 } from "./aula-powerbi";
import { convertirLeccionPython, identificadoresPython, type LeccionPythonV1 } from "./aula-python";
import { convertirLeccionSql, datosSql, identificadores, type AulaV1 } from "./aula-sql";
import { leccionAMdx, type Leccion } from "./leccion";

// Escribe el borrador de unas clases a partir de un aula de la v1 exportada a JSON (scripts/exportar-aula-v1.mjs).
// Uso: pnpm --filter @syntaxerror/content importar <sql|excel|python|powerbi|ia> <aula.json> <carpeta de destino> <lecciones separadas por coma>
// Escribe misiones/NN-<lección>.mdx, un caso.yaml para completar y, en SQL, datos/<tabla>.csv con las tablas que usan
// (en Excel cada lección trae su planilla y en Python, su preparación). En Power BI copia los datasets del aula. No pisa contenido: la carpeta de destino no debe existir. Después del
// borrador viene la revisión editorial.

const AULAS = { sql: "Clases de SQL", excel: "Clases de Excel", python: "Clases de Python", powerbi: "Clases de Power BI", ia: "Clases de IA para datos" } as const;
type Aula = keyof typeof AULAS;

const [aula, entrada, destino, seleccion] = process.argv.slice(2);
if (!(aula in AULAS) || !entrada || !destino || !seleccion) {
  console.error("Uso: importar <sql|excel|python|powerbi|ia> <aula.json> <carpeta de destino> <lección,lección,...>");
  process.exit(1);
}

// Cada aula tiene la forma de sus lecciones: se leen como tales en su rama.
const datos = JSON.parse(await readFile(entrada, "utf8")) as { lessons: { slug: string }[]; datasets: AulaV1["datasets"]; archivos?: Record<string, string>; enhancements?: Record<string, MejoraIaV1> };
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
} else if ((aula as Aula) === "excel") {
  lecciones = (elegidas as LeccionExcelV1[]).map((v1, indice) => convertirLeccionExcel(v1, indice + 1));
} else if ((aula as Aula) === "ia") {
  lecciones = (elegidas as LeccionIaV1[]).map((v1, indice) => convertirLeccionIa(v1, datos.enhancements?.[v1.slug], indice + 1));
} else if ((aula as Aula) === "powerbi") {
  const excepto = columnasDeDatasets(datos.archivos ?? {});
  lecciones = (elegidas as LeccionPowerBiV1[]).map((v1, indice) => convertirLeccionPowerBi(v1, indice + 1, path.basename(destino), excepto));
} else {
  const python = elegidas as LeccionPythonV1[];
  const excepto = identificadoresPython(python);
  lecciones = python.map((v1, indice) => convertirLeccionPython(v1, indice + 1, excepto));
}

if (existsSync(destino)) throw new Error(`${destino} ya existe: el importador no pisa contenido`);
await mkdir(path.join(destino, "misiones"), { recursive: true });
for (const leccion of lecciones) await writeFile(path.join(destino, "misiones", `${leccion.slug}.mdx`), leccionAMdx(leccion));
if (tablas.length > 0) {
  await mkdir(path.join(destino, "datos"), { recursive: true });
  for (const [tabla, filas] of Object.entries(datosSql({ lessons: [], datasets: datos.datasets }, tablas))) await writeFile(path.join(destino, "datos", `${tabla}.csv`), aCsv(filas));
}
// Los datasets de las prácticas (Power BI) se descargan desde «Datos del caso»: se copian tal cual.
const archivos = (aula as Aula) === "powerbi" ? Object.entries(datos.archivos ?? {}) : [];
if (archivos.length > 0) {
  await mkdir(path.join(destino, "datos"), { recursive: true });
  for (const [nombre, contenido] of archivos) await writeFile(path.join(destino, "datos", nombre), contenido);
}
await writeFile(
  path.join(destino, "caso.yaml"),
  `slug: ${path.basename(destino)}\ntipo: clases\ntitulo: "${AULAS[aula as Aula]}"\ndataset: "Completar: qué datos de práctica usan las lecciones"\nmisiones:\n${lecciones.map((leccion) => `  - ${leccion.slug}`).join("\n")}\n`
);
console.log(`[importar] ${lecciones.length} lecciones y ${tablas.length + archivos.length} tablas en ${destino}`);
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content exec vitest run src/importar && pnpm --filter @syntaxerror/content exec tsc --noEmit"`
Expected: PASS (29 pruebas) y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add packages/content/scripts packages/content/src/importar
git commit -m "feat(contenido): adaptador del aula de ia para datos, con sus quizzes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Las clases de IA para datos

**Files:**
- Create: `content/casos/clases-de-ia-para-datos/caso.yaml` y 14 lecciones en `misiones/`
- Modify: `content/rutas/data-analyst.yaml`, `apps/web/src/db/release.test.ts`

**Interfaces:**
- Consumes: el adaptador (Task 2) y `QuizTask` (Task 1).
- Produces: las clases `clases-de-ia-para-datos`, penúltimas en la ruta. Las lecciones se llaman `NN-<slug de la v1>` y el id de su tarea es el slug de la v1.

- [ ] **Step 1: El borrador del importador**

Run: `mkdir -p tmp && node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-ia-datos > tmp/aula-ia.json`

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content importar ia /app/tmp/aula-ia.json /app/content/casos/clases-de-ia-para-datos bienvenida-ia-para-datos,entender-tablas-y-columnas,calidad-de-datos,limpieza-asistida,clasificacion-y-etiquetas,formulas-y-hojas-calculo,sql-asistido,analisis-exploratorio,graficos-y-visualizaciones,explicar-hallazgos,reportes-asistidos,sesgos-y-errores,privacidad-en-datos,proyecto-final-analisis-datos`
Expected: `[importar] 14 lecciones y 0 tablas en /app/content/casos/clases-de-ia-para-datos`.

- [ ] **Step 2: La revisión editorial (copia literal)**

Reemplaza cada archivo por su versión final.

`content/casos/clases-de-ia-para-datos/caso.yaml`:
```yaml
slug: clases-de-ia-para-datos
tipo: clases
titulo: "Clases de IA para datos: usar la IA sin perder el criterio"
dataset: "casos breves de tablas, reclamos y reportes, uno por lección"
misiones:
  - 01-bienvenida-ia-para-datos
  - 02-entender-tablas-y-columnas
  - 03-calidad-de-datos
  - 04-limpieza-asistida
  - 05-clasificacion-y-etiquetas
  - 06-formulas-y-hojas-calculo
  - 07-sql-asistido
  - 08-analisis-exploratorio
  - 09-graficos-y-visualizaciones
  - 10-explicar-hallazgos
  - 11-reportes-asistidos
  - 12-sesgos-y-errores
  - 13-privacidad-en-datos
  - 14-proyecto-final-analisis-datos
```

`content/casos/clases-de-ia-para-datos/misiones/01-bienvenida-ia-para-datos.mdx`:
```mdx
---
titulo: "Bienvenida: IA para datos"
tiempo: 10
---

<Concepto>
**Objetivo:** Entender cómo la IA puede apoyar análisis de datos sin reemplazar criterio, fuente ni validación.

La IA puede ayudarte a entender tablas, limpiar datos, proponer fórmulas, escribir SQL, explicar tendencias y preparar reportes.

Pero los datos mandan. Si la fuente está mal definida, si faltan reglas de negocio o si no validas resultados, la IA puede producir conclusiones convincentes pero incorrectas.

**Conceptos clave.**

- Dato: observación registrada con significado dentro de un contexto.
- Análisis asistido: uso de IA para acelerar exploración y explicación.
- Validación: comprobación contra fuente, reglas y casos conocidos.

**Un caso.** Un equipo tiene una planilla de reclamos. La IA ayuda a detectar categorías y tendencias, pero una persona valida columnas, duplicados y casos sensibles.
</Concepto>

<QuizTask
  id="bienvenida-ia-para-datos"
  preguntas={[{"pregunta": "La IA para datos sirve principalmente para...", "opciones": ["Acelerar exploración, limpieza, fórmulas, consultas y explicaciones.", "Garantizar conclusiones perfectas.", "Inventar datos faltantes.", "Eliminar validación humana."], "correcta": 0, "explicacion": "La IA asiste el análisis, no lo vuelve infalible."}, {"pregunta": "¿Qué manda en un análisis?", "opciones": ["La fuente de datos, su significado y sus reglas.", "El tono seguro del modelo.", "La respuesta más larga.", "La primera conclusión generada."], "correcta": 0, "explicacion": "Sin fuente y reglas, no hay análisis defendible."}, {"pregunta": "Antes de usar una conclusión debes...", "opciones": ["Validarla contra datos, reglas y contexto.", "Copiarla sin leer.", "Publicarla por rapidez.", "Ocultar supuestos."], "correcta": 0, "explicacion": "La validación reduce errores."}]}
  pistas={["La IA acelera; la evidencia decide."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/02-entender-tablas-y-columnas.mdx`:
```mdx
---
titulo: "Entender tablas y columnas"
tiempo: 10
---

<Concepto>
**Objetivo:** Describir una tabla para que la IA pueda razonar con menos supuestos.

Una tabla no se entiende solo por sus valores. Necesita nombres de columnas, significado, tipos de datos, unidad de medida y reglas de negocio.

Cuando pidas ayuda a la IA, entrega una muestra pequeña, explica columnas y define que pregunta quieres responder.

**Conceptos clave.**

- Diccionario de datos: descripción de columnas y significado.
- Tipo de dato: texto, número, fecha, categoría o booleano.
- Unidad: escala o medida usada por una columna.

**Un caso.** La columna 'monto' puede significar venta neta, venta bruta, deuda, costo o reclamo. Sin definición, cualquier análisis queda debil.
</Concepto>

<QuizTask
  id="entender-tablas-y-columnas"
  preguntas={[{"pregunta": "Un diccionario de datos describe...", "opciones": ["Columnas, significado, tipo y reglas relevantes.", "Solo colores de una tabla.", "Contrasenas del sistema.", "Una respuesta final."], "correcta": 0, "explicacion": "El diccionario da contexto a la tabla."}, {"pregunta": "¿Por qué importa explicar las unidades?", "opciones": ["Porque un número puede representar pesos, dolares, horas, unidades u otra escala.", "Porque cambia la tipografía.", "Porque elimina errores siempre.", "Porque no afecta al análisis."], "correcta": 0, "explicacion": "La unidad cambia interpretación."}, {"pregunta": "Para pedir ayuda con una tabla conviene entregar...", "opciones": ["Muestra, columnas, significado y pregunta de análisis.", "Solo una captura borrosa.", "Datos sin encabezados.", "Una instrucción vaga."], "correcta": 0, "explicacion": "La IA necesita estructura y objetivo."}]}
  pistas={["Tabla clara: columnas, tipos, unidades, reglas y pregunta."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/03-calidad-de-datos.mdx`:
```mdx
---
titulo: "Calidad de datos"
tiempo: 10
---

<Concepto>
**Objetivo:** Reconocer problemas frecuentes antes de analizar.

La calidad de datos determina la calidad del resultado. Problemas comunes: duplicados, valores faltantes, formatos inconsistentes, categorías mezcladas y errores de captura.

La IA puede ayudarte a detectar patrones de error, pero debes comprobarlos en la fuente.

**Conceptos clave.**

- Duplicado: registro repetido o equivalente.
- Valor faltante: dato esperado que no está informado.
- Formato inconsistente: misma información escrita de varias formas.

**Un caso.** La categoría 'Ventas' aparece como Ventas, venta, VENTAS y Vtas. Antes de contar casos, hay que normalizar.
</Concepto>

<QuizTask
  id="calidad-de-datos"
  preguntas={[{"pregunta": "Un problema común de calidad es...", "opciones": ["Duplicados, faltantes o formatos inconsistentes.", "Tener encabezados claros.", "Documentar columnas.", "Validar fuentes."], "correcta": 0, "explicacion": "Estos problemas distorsionan resultados."}, {"pregunta": "Categorías mezcladas pueden causar...", "opciones": ["Conteos y filtros incorrectos.", "Más precisión automáticamente.", "Menos necesidad de limpieza.", "Mejores gráficos siempre."], "correcta": 0, "explicacion": "La misma categoría escrita distinto se cuenta por separado."}, {"pregunta": "La IA puede sugerir limpieza, pero debes...", "opciones": ["Comprobar contra fuente y reglas.", "Aplicar todo sin revisar.", "Inventar valores.", "Eliminar evidencia."], "correcta": 0, "explicacion": "La limpieza también requiere criterio."}]}
  pistas={["Antes de analizar: revisa duplicados, faltantes, formatos y categorías."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/04-limpieza-asistida.mdx`:
```mdx
---
titulo: "Limpieza asistida con IA"
tiempo: 10
---

<Concepto>
**Objetivo:** Pedir reglas de limpieza claras y reproducibles.

La IA puede proponer pasos de limpieza: normalizar texto, separar columnas, corregir formatos, detectar outliers y clasificar valores.

Una regla de limpieza debe ser explícita y reproducible. Evita que el modelo invente datos faltantes como si fueran reales.

**Conceptos clave.**

- Normalización: convertir valores a un formato consistente.
- Regla reproducible: instrucción que otra persona puede aplicar igual.
- Outlier: valor inusual que requiere revisión.

**Un caso.** Prompt: 'Propone reglas para normalizar la columna Area. No inventes datos faltantes. Marca casos ambiguos para revision manual'.
</Concepto>

<QuizTask
  id="limpieza-asistida"
  preguntas={[{"pregunta": "Una buena regla de limpieza debe ser...", "opciones": ["Clara y reproducible.", "Secreta.", "Ambigua.", "Imposible de auditar."], "correcta": 0, "explicacion": "Debe poder repetirse y revisarse."}, {"pregunta": "¿Qué no debe hacer la IA con valores faltantes?", "opciones": ["Inventarlos como si fueran reales.", "Marcarlos para revisión.", "Sugerir criterios.", "Explicar impactos."], "correcta": 0, "explicacion": "Inventar datos rompe el análisis."}, {"pregunta": "Un outlier es...", "opciones": ["Un valor inusual que debe revisarse.", "Un encabezado.", "Una categoría normal siempre.", "Una fórmula."], "correcta": 0, "explicacion": "Puede ser error o caso real extremo."}]}
  pistas={["Limpieza responsable: regla clara, nada inventado y casos ambiguos marcados."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/05-clasificacion-y-etiquetas.mdx`:
```mdx
---
titulo: "Clasificación y etiquetas"
tiempo: 10
---

<Concepto>
**Objetivo:** Usar IA para crear categorías revisables en datos no estructurados.

Muchos datos vienen como texto libre: comentarios, reclamos, tickets, encuestas o descripciones. La IA puede proponer etiquetas para agruparlos.

Las etiquetas deben tener definición, ejemplos y criterios de revisión para evitar categorías solapadas o demasiado amplias.

**Conceptos clave.**

- Etiqueta: categoría asignada a un registro.
- Taxonomía: conjunto organizado de categorías.
- Criterio de asignación: regla para decidir una etiqueta.

**Un caso.** Reclamos de clientes se etiquetan como despacho, cobro, calidad, soporte o devolución. Los casos mixtos quedan marcados para revisión.
</Concepto>

<QuizTask
  id="clasificacion-y-etiquetas"
  preguntas={[{"pregunta": "La IA puede etiquetar especialmente bien...", "opciones": ["Textos libres como reclamos, tickets o encuestas.", "Datos sin ningun contexto.", "Contrasenas.", "Hechos sin fuente."], "correcta": 0, "explicacion": "El texto libre es un buen caso de clasificación asistida."}, {"pregunta": "Una buena etiqueta necesita...", "opciones": ["Definición, ejemplos y criterio de asignación.", "Nombre ambiguo solamente.", "Cero revisión.", "Datos sensibles."], "correcta": 0, "explicacion": "Eso permite consistencia."}, {"pregunta": "Casos mixtos o ambiguos deberían...", "opciones": ["Marcarse para revisión.", "Forzarse a cualquier categoría.", "Borrarse siempre.", "Usarse como hechos finales."], "correcta": 0, "explicacion": "La ambigüedad debe quedar visible."}]}
  pistas={["Etiqueta bien: define categorías y marca dudas."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/06-formulas-y-hojas-calculo.mdx`:
```mdx
---
titulo: "Fórmulas y hojas de cálculo"
tiempo: 10
---

<Concepto>
**Objetivo:** Pedir fórmulas y pasos de planilla con contexto suficiente.

La IA puede ayudarte a escribir fórmulas, explicar errores y proponer validaciones en Excel o Google Sheets.

Para que la respuesta sirva, debes indicar nombres de columnas, separador regional si aplica, ejemplos y resultado esperado.

**Conceptos clave.**

- Fórmula: expresión que calcula un resultado.
- Caso de prueba: fila conocida para validar la fórmula.
- Separador regional: coma o punto y coma según configuración.

**Un caso.** Prompt: 'En Excel en español, necesito sumar Monto si Estado es Pagado y Area es Ventas. Columnas: A Fecha, B Area, C Estado, D Monto'.
</Concepto>

<QuizTask
  id="formulas-y-hojas-calculo"
  preguntas={[{"pregunta": "Para pedir una fórmula conviene entregar...", "opciones": ["Columnas, objetivo, ejemplos y configuración relevante.", "Solo 'haz formula'.", "Datos sin encabezado.", "Una captura incompleta."], "correcta": 0, "explicacion": "La fórmula depende de estructura y contexto."}, {"pregunta": "Un caso de prueba sirve para...", "opciones": ["Comprobar si la fórmula entrega el resultado esperado.", "Decorar la hoja.", "Eliminar revisión.", "Inventar datos."], "correcta": 0, "explicacion": "Prueba contra filas conocidas."}, {"pregunta": "El separador regional importa porque...", "opciones": ["Algunas configuraciones usan coma y otras punto y coma.", "Cambia el contenido de datos.", "Elimina errores siempre.", "No existe en planillas."], "correcta": 0, "explicacion": "Puede hacer que una fórmula no funcione."}]}
  pistas={["Fórmula útil: columnas + objetivo + ejemplo + configuración."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/07-sql-asistido.mdx`:
```mdx
---
titulo: "SQL asistido por IA"
tiempo: 10
---

<Concepto>
**Objetivo:** Usar IA para crear y revisar consultas SQL sin saltarse la validación.

La IA puede ayudar a escribir SELECT, filtros, JOIN, agregaciones y consultas de diagnóstico.

Debes entregar esquema de tablas, nombres de columnas, relaciones y motor de base de datos. Luego valida con muestras y resultados esperados.

**Conceptos clave.**

- Esquema: estructura de tablas y columnas.
- JOIN: combinación de tablas relacionadas.
- Agregación: cálculo como suma, conteo o promedio.

**Un caso.** Prompt: 'PostgreSQL. Tablas: tickets(id, area_id, estado, created_at), areas(id, nombre). Cuenta tickets cerrados por area durante junio'.
</Concepto>

<QuizTask
  id="sql-asistido"
  preguntas={[{"pregunta": "Para pedir SQL conviene entregar...", "opciones": ["Esquema, relaciones, motor y pregunta.", "Solo el nombre de la base.", "Datos sensibles innecesarios.", "Una conclusión esperada inventada."], "correcta": 0, "explicacion": "SQL depende de estructura exacta."}, {"pregunta": "Un JOIN sirve para...", "opciones": ["Combinar tablas relacionadas.", "Cambiar colores.", "Crear contraseñas.", "Borrar contexto."], "correcta": 0, "explicacion": "JOIN conecta datos entre tablas."}, {"pregunta": "Una consulta generada debe...", "opciones": ["Probarse con datos y resultados esperados.", "Ejecutarse en producción sin revisar.", "Ignorar permisos.", "Eliminar respaldos."], "correcta": 0, "explicacion": "La validación evita errores operativos."}]}
  pistas={["SQL asistido: esquema primero, ejecución controlada después."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/08-analisis-exploratorio.mdx`:
```mdx
---
titulo: "Análisis exploratorio"
tiempo: 10
---

<Concepto>
**Objetivo:** Pedir preguntas, cortes y chequeos iniciales para entender un dataset.

El análisis exploratorio busca conocer el terreno: volumen, periodos, categorías, distribuciones, valores raros, faltantes y relaciones.

La IA puede sugerir una lista de chequeos, pero los resultados salen de los datos, no del modelo.

**Conceptos clave.**

- Distribución: cómo se reparten los valores.
- Segmento: subconjunto por categoría, periodo o condición.
- Chequeo inicial: prueba rápida para entender calidad y forma.

**Un caso.** Antes de reportar ventas, revisas meses disponibles, tiendas sin datos, productos top, devoluciones, outliers y cambios bruscos.
</Concepto>

<QuizTask
  id="analisis-exploratorio"
  preguntas={[{"pregunta": "Análisis exploratorio busca...", "opciones": ["Entender forma, calidad y patrones iniciales del dataset.", "Confirmar una conclusión sin mirar datos.", "Publicar inmediatamente.", "Eliminar preguntas."], "correcta": 0, "explicacion": "Primero se conoce el terreno."}, {"pregunta": "Un segmento puede ser...", "opciones": ["Un subconjunto por fecha, categoría o condición.", "Una contrasena.", "Un color.", "Una fórmula sin datos."], "correcta": 0, "explicacion": "Segmentar permite comparar."}, {"pregunta": "Los resultados del análisis vienen de...", "opciones": ["Los datos y cálculos validados.", "La confianza verbal del modelo.", "La respuesta más larga.", "Una suposición sin fuente."], "correcta": 0, "explicacion": "El modelo sugiere; los datos prueban."}]}
  pistas={["Explora antes de concluir."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/09-graficos-y-visualizaciones.mdx`:
```mdx
---
titulo: "Gráficos y visualizaciones"
tiempo: 10
---

<Concepto>
**Objetivo:** Elegir visualizaciones adecuadas para comunicar datos.

La IA puede sugerir gráficos según la pregunta: barras para comparar categorías, líneas para tendencias, dispersión para relaciones y tablas para detalle.

Un gráfico debe responder una pregunta. Si solo se ve bonito pero no aclara nada, no sirve.

**Conceptos clave.**

- Comparación: diferencias entre categorías.
- Tendencia: cambio a lo largo del tiempo.
- Relación: cómo dos variables se mueven juntas.

**Un caso.** Para mostrar reclamos por mes usas línea. Para comparar áreas usas barras. Para listar casos críticos usas tabla.
</Concepto>

<QuizTask
  id="graficos-y-visualizaciones"
  preguntas={[{"pregunta": "Barras suelen servir para...", "opciones": ["Comparar categorías.", "Mostrar texto largo.", "Guardar claves.", "Reemplazar todos los reportes."], "correcta": 0, "explicacion": "Las barras comparan magnitudes."}, {"pregunta": "Líneas suelen servir para...", "opciones": ["Mostrar tendencias en el tiempo.", "Comparar textos.", "Ocultar outliers.", "Validar contraseñas."], "correcta": 0, "explicacion": "Las líneas muestran evolución."}, {"pregunta": "Un gráfico útil debe...", "opciones": ["Responder una pregunta clara.", "Solo verse decorativo.", "Ocultar la fuente.", "Agregar complejidad innecesaria."], "correcta": 0, "explicacion": "La visualización debe comunicar."}]}
  pistas={["Elige gráfico por pregunta, no por moda."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/10-explicar-hallazgos.mdx`:
```mdx
---
titulo: "Explicar hallazgos"
tiempo: 10
---

<Concepto>
**Objetivo:** Convertir resultados en explicaciones claras con evidencia y límites.

La IA puede ayudarte a redactar conclusiones, pero debes separar hallazgos, interpretaciones, supuestos y recomendaciones.

Una buena explicación dice que se observo, por que importa, que evidencia lo respalda y que no se puede afirmar todavía.

**Conceptos clave.**

- Hallazgo: resultado observado en los datos.
- Interpretación: lectura posible del hallazgo.
- Límite: condición que reduce certeza o alcance.

**Un caso.** Hallazgo: reclamos suben 35% en junio. Interpretación: posible efecto de nuevo proveedor. Limite: faltan datos de volumen de ventas.
</Concepto>

<QuizTask
  id="explicar-hallazgos"
  preguntas={[{"pregunta": "Una buena explicación separa...", "opciones": ["Hallazgos, interpretaciones, supuestos y recomendaciones.", "Hechos e inventos mezclados.", "Datos sin fuente.", "Opiniones como verdades."], "correcta": 0, "explicacion": "Separar piezas evita conclusiones abusivas."}, {"pregunta": "Un límite indica...", "opciones": ["Que no se puede afirmar todavía o bajo qué condición aplica.", "Que el análisis es inútil.", "Que no hay datos.", "Que todo es falso."], "correcta": 0, "explicacion": "Los límites hacen la conclusión más honesta."}, {"pregunta": "Una recomendación debe apoyarse en...", "opciones": ["Evidencia, contexto y criterio.", "Solo intuición.", "Un gráfico decorativo.", "Una frase convincente."], "correcta": 0, "explicacion": "La recomendación necesita respaldo."}]}
  pistas={["Explica con cuatro capas: dato, lectura, límite y acción."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/11-reportes-asistidos.mdx`:
```mdx
---
titulo: "Reportes asistidos"
tiempo: 10
---

<Concepto>
**Objetivo:** Crear reportes con estructura, métricas, lectura y proximos pasos.

Un reporte útil no es un bloque de texto. Tiene objetivo, periodo, fuente, métricas, hallazgos, riesgos, decisiones y proximos pasos.

La IA puede ayudarte a ordenar el reporte y ajustar lenguaje para audiencia ejecutiva, técnica u operativa.

**Conceptos clave.**

- Métrica: medida clave del reporte.
- Periodo: rango temporal analizado.
- Próximo paso: acción recomendada después del reporte.

**Un caso.** Reporte semanal: volumen de tickets, tiempo de respuesta, áreas con más casos, riesgos y acciones para la próxima semana.
</Concepto>

<QuizTask
  id="reportes-asistidos"
  preguntas={[{"pregunta": "Un reporte útil debe incluir...", "opciones": ["Objetivo, fuente, periodo, métricas, hallazgos y acciones.", "Solo texto largo.", "Datos sin fecha.", "Conclusiones sin evidencia."], "correcta": 0, "explicacion": "La estructura facilita decisión."}, {"pregunta": "La audiencia afecta...", "opciones": ["Lenguaje, detalle y foco del reporte.", "Solo el color.", "El cálculo real.", "La existencia de datos."], "correcta": 0, "explicacion": "No todos necesitan el mismo nivel."}, {"pregunta": "Un próximo paso responde...", "opciones": ["Qué acción se debe tomar después.", "Qué fuente se oculta.", "Cómo hacerlo más largo.", "Qué dato inventar."], "correcta": 0, "explicacion": "El reporte debe mover acción."}]}
  pistas={["Reporte: objetivo, fuente, métrica, hallazgo, riesgo y acción."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/12-sesgos-y-errores.mdx`:
```mdx
---
titulo: "Sesgos y errores en datos"
tiempo: 10
---

<Concepto>
**Objetivo:** Reconocer que los datos pueden representar mal la realidad.

Los datos no son neutrales por defecto. Pueden tener sesgos de captura, definiciones cambiantes, muestras incompletas o errores sistemáticos.

La IA puede ayudarte a listar riesgos de sesgo, pero necesitas conocimiento del proceso para evaluarlos.

**Conceptos clave.**

- Sesgo de captura: datos recolectados de forma desigual.
- Muestra incompleta: datos que no representan todo el universo.
- Cambio de definición: métrica que no significa lo mismo en todo el periodo.

**Un caso.** Solo se registran reclamos por email, pero muchos clientes reclaman por telefono. El análisis subestima problemas telefónicos.
</Concepto>

<QuizTask
  id="sesgos-y-errores"
  preguntas={[{"pregunta": "Un sesgo de captura ocurre cuando...", "opciones": ["Los datos se recolectan de forma desigual.", "La tabla tiene encabezados.", "Se documentan reglas.", "Se valida una métrica."], "correcta": 0, "explicacion": "La forma de captura afecta representatividad."}, {"pregunta": "Una muestra incompleta puede causar...", "opciones": ["Conclusiones no representativas.", "Más verdad automáticamente.", "Menos necesidad de contexto.", "Mejores decisiones siempre."], "correcta": 0, "explicacion": "Si faltan grupos, falta realidad."}, {"pregunta": "Para evaluar sesgos necesitas...", "opciones": ["Conocimiento del proceso y fuente.", "Solo una respuesta generada.", "Ignorar el origen.", "Eliminar preguntas."], "correcta": 0, "explicacion": "El contexto operativo es clave."}]}
  pistas={["Pregunta siempre: qué datos faltan y cómo se capturaron."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/13-privacidad-en-datos.mdx`:
```mdx
---
titulo: "Privacidad en datos"
tiempo: 10
---

<Concepto>
**Objetivo:** Reducir exposición de datos personales o sensibles al usar IA.

Trabajar con datos suele implicar información personal, comercial o confidencial. No debes copiar bases completas en herramientas sin autorización.

Usa minimización, anonimización, muestras controladas y permisos adecuados.

**Conceptos clave.**

- Dato personal: información asociada a una persona identificada o identificable.
- Anonimización: quitar identificadores directos o indirectos cuando sea posible.
- Muestra controlada: subconjunto suficiente para resolver la tarea.

**Un caso.** Para analizar temas de reclamos se reemplazan nombres, RUT, telefonos y correos por IDs antes de pedir clasificación.
</Concepto>

<QuizTask
  id="privacidad-en-datos"
  preguntas={[{"pregunta": "Al usar IA con datos debes evitar...", "opciones": ["Compartir datos sensibles innecesarios o sin autorización.", "Anonimizar.", "Minimizar.", "Usar muestras controladas."], "correcta": 0, "explicacion": "La exposición innecesaria aumenta riesgo."}, {"pregunta": "Anonimizar significa...", "opciones": ["Quitar identificadores cuando no son necesarios.", "Inventar datos.", "Borrar toda evidencia.", "Publicar bases."], "correcta": 0, "explicacion": "Reduce exposición."}, {"pregunta": "Una muestra controlada sirve para...", "opciones": ["Resolver o probar una tarea con menos datos expuestos.", "Ocultar errores.", "Compartir todo.", "Evitar permisos."], "correcta": 0, "explicacion": "Menos datos puede ser suficiente."}]}
  pistas={["Si el dato real no aporta al análisis, no lo compartas."]}
/>
```

`content/casos/clases-de-ia-para-datos/misiones/14-proyecto-final-analisis-datos.mdx`:
```mdx
---
titulo: "Proyecto final: mini análisis asistido"
tiempo: 10
---

<Concepto>
**Objetivo:** Diseñar un análisis de datos asistido por IA con fuente, pregunta, limpieza, resultado y validación.

El proyecto final consiste en elegir una tabla real o ficticia y diseñar un flujo de análisis: pregunta, columnas, limpieza, cálculos, visualización, hallazgos y validación.

No basta con pedir conclusiones. Debes demostrar que sabes preparar datos, pedir ayuda de forma estructurada y revisar resultados.

**Conceptos clave.**

- Pregunta de análisis: duda concreta que el dato debe responder.
- Flujo de análisis: pasos desde fuente hasta reporte.
- Criterio de validación: cómo sabrás si el resultado es correcto.

**Un caso.** Dataset de tickets: pregunta principal, limpieza de categorías, conteo por área, tendencia mensual, gráfico y reporte con límites.
</Concepto>

<QuizTask
  id="proyecto-final-analisis-datos"
  preguntas={[{"pregunta": "El proyecto final debe partir con...", "opciones": ["Una pregunta de análisis clara.", "Una conclusión inventada.", "Un gráfico decorativo.", "Datos sin contexto."], "correcta": 0, "explicacion": "La pregunta guía todo el flujo."}, {"pregunta": "El flujo debe incluir...", "opciones": ["Fuente, columnas, limpieza, cálculos, visualización y validación.", "Solo una respuesta de IA.", "Datos sensibles sin permiso.", "Cero revisión."], "correcta": 0, "explicacion": "El análisis necesita pasos defendibles."}, {"pregunta": "¿Qué demuestra aprendizaje?", "opciones": ["Usar IA para acelerar análisis sin perder evidencia ni control.", "Copiar conclusiones sin revisar.", "Inventar datos faltantes.", "Ignorar privacidad."], "correcta": 0, "explicacion": "El objetivo es criterio aplicado."}]}
  pistas={["Tu análisis debe responder: pregunta, datos, limpieza, resultado y validación."]}
/>
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
  - clases-de-python
  - tienda-online-pewen
  - clases-de-power-bi
  - clinica-cordillera-central
  - clases-de-ia-para-datos
  - proyecto-final
```

En `apps/web/src/db/release.test.ts`, `2 rutas, 11 casos` pasa a `2 rutas, 12 casos` (las dos veces), y `toHaveLength(11)` pasa a `toHaveLength(12)`.

- [ ] **Step 4: Validar**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content validate`
Expected: `[content] ok: 2 rutas, 12 casos, 174 misiones`.

Compara cada `.mdx` y `caso.yaml` con `diff` contra este plan: deben ser idénticos.

Run: `docker compose run --rm tools pnpm -r --if-present test`
Expected: PASS en todos los paquetes (engines 128, content 103, web 336).

- [ ] **Step 5: Commit**

```bash
git add content apps/web/src/db/release.test.ts
git commit -m "feat(contenido): clases de ia para datos, catorce lecciones con quiz traidas del aula de la v1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: e2e y documentación

**Files:**
- Modify: `e2e/tests/progreso.ts`, `e2e/tests/clases.spec.ts`, `e2e/tests/proyecto-final.spec.ts`, `e2e/calentar.ts`, `README.md`

**Interfaces:**
- Consumes: los ids de la Task 3.
- Produces:
  - `MISIONES["clases-de-ia-para-datos"]`, y `CLASES` con las cinco clases;
  - una prueba más en `clases.spec.ts`.

- [ ] **Step 1: Los helpers y la cadena de casos**

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
  "clases-de-power-bi": [
    ["01-que-es-power-bi", "que-es-power-bi"],
    ["02-instalar-y-conectar-datos", "instalar-y-conectar-datos"],
    ["03-la-interfaz-de-power-bi", "la-interfaz-de-power-bi"],
    ["04-que-es-power-query", "que-es-power-query"],
    ["05-transformar-datos", "transformar-datos"],
    ["06-combinar-consultas", "combinar-consultas"],
    ["07-limpiar-datos-reales", "limpiar-datos-reales"],
    ["08-vista-de-modelo", "vista-de-modelo"],
    ["09-crear-relaciones", "crear-relaciones"],
    ["10-cardinalidad-y-direccion-del-filtro", "cardinalidad-y-direccion-del-filtro"],
    ["11-modelo-estrella", "modelo-estrella"],
    ["12-tabla-de-calendario", "tabla-de-calendario"],
    ["13-medidas-vs-columnas-calculadas", "medidas-vs-columnas-calculadas"],
    ["14-sintaxis-basica-de-dax", "sintaxis-basica-de-dax"],
    ["15-funciones-de-agregacion", "funciones-de-agregacion"],
    ["16-formato-de-una-medida", "formato-de-una-medida"],
    ["17-calculate-y-contexto", "calculate-y-contexto"],
    ["18-variables-en-dax", "variables-en-dax"],
    ["19-contexto-de-fila-vs-contexto-de-filtro", "contexto-de-fila-vs-contexto-de-filtro"],
    ["20-funciones-iteradoras-sumx-averagex", "funciones-iteradoras-sumx-averagex"],
    ["21-funciones-de-tiempo-basicas", "funciones-de-tiempo-basicas"],
    ["22-inteligencia-de-tiempo-real", "inteligencia-de-tiempo-real"],
    ["23-tipos-de-grafico", "tipos-de-grafico"],
    ["24-tarjetas-y-tablas", "tarjetas-y-tablas"],
    ["25-formato-condicional", "formato-condicional"],
    ["26-tooltips", "tooltips"],
    ["27-slicers", "slicers"],
    ["28-cross-filtering", "cross-filtering"],
    ["29-drill-down-y-drill-through", "drill-down-y-drill-through"],
    ["30-publicar-a-power-bi-service", "publicar-a-power-bi-service"],
    ["31-compartir-y-exportar", "compartir-y-exportar"],
    ["32-buenas-practicas-de-diseno", "buenas-practicas-de-diseno"],
    ["33-power-bi-vs-excel-sql-python", "power-bi-vs-excel-sql-python"],
    ["34-proyecto-final-dashboard-ventas", "proyecto-final-dashboard-ventas"],
  ],
  "clases-de-ia-para-datos": [
    ["01-bienvenida-ia-para-datos", "bienvenida-ia-para-datos"],
    ["02-entender-tablas-y-columnas", "entender-tablas-y-columnas"],
    ["03-calidad-de-datos", "calidad-de-datos"],
    ["04-limpieza-asistida", "limpieza-asistida"],
    ["05-clasificacion-y-etiquetas", "clasificacion-y-etiquetas"],
    ["06-formulas-y-hojas-calculo", "formulas-y-hojas-calculo"],
    ["07-sql-asistido", "sql-asistido"],
    ["08-analisis-exploratorio", "analisis-exploratorio"],
    ["09-graficos-y-visualizaciones", "graficos-y-visualizaciones"],
    ["10-explicar-hallazgos", "explicar-hallazgos"],
    ["11-reportes-asistidos", "reportes-asistidos"],
    ["12-sesgos-y-errores", "sesgos-y-errores"],
    ["13-privacidad-en-datos", "privacidad-en-datos"],
    ["14-proyecto-final-analisis-datos", "proyecto-final-analisis-datos"],
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
  "clases-de-python": [
    ["01-variables-y-tipos", "variables-y-tipos"],
    ["02-operadores", "operadores"],
    ["03-print-fstrings", "print-fstrings"],
    ["04-errores-comunes", "errores-comunes"],
    ["05-listas", "listas"],
    ["06-diccionarios", "diccionarios"],
    ["07-tuplas", "tuplas"],
    ["08-listas-anidadas", "listas-anidadas"],
    ["09-if-else", "if-else"],
    ["10-for", "for"],
    ["11-while", "while"],
    ["12-funciones", "funciones"],
    ["13-series", "series"],
    ["14-dataframe", "dataframe"],
    ["15-explorar-dataframe", "explorar-dataframe"],
    ["16-cargar-csv-excel", "cargar-csv-excel"],
    ["17-seleccionar-columnas", "seleccionar-columnas"],
    ["18-loc-iloc", "loc-iloc"],
    ["19-filtros-booleanos", "filtros-booleanos"],
    ["20-crear-columnas", "crear-columnas"],
    ["21-apply", "apply"],
    ["22-limpieza-texto", "limpieza-texto"],
    ["23-fechas", "fechas"],
    ["24-ordenar", "ordenar"],
    ["25-groupby", "groupby"],
    ["26-agg", "agg"],
    ["27-value-counts", "value-counts"],
    ["28-merge", "merge"],
    ["29-valores-nulos", "valores-nulos"],
    ["30-duplicados", "duplicados"],
    ["31-exportar-resultados", "exportar-resultados"],
    ["32-visualizacion-datos", "visualizacion-datos"],
    ["33-python-vs-excel-sql", "python-vs-excel-sql"],
    ["34-proyecto-final-pandas", "proyecto-final-pandas"],
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
export const CLASES = new Set(["clases-de-excel", "clases-de-sql", "clases-de-python", "clases-de-power-bi", "clases-de-ia-para-datos"]);

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

En `proyecto-final.spec.ts`:
- la lista de casos termina en `"clinica-cordillera-central", "clases-de-ia-para-datos"]`;
- el nombre de la prueba empieza con "con los casos 0 a 4 y sus clases completos:".

En `e2e/calentar.ts`, en `RUTAS`, antes de `"/casos/proyecto-final"`, agrega:
```ts
  "/casos/clases-de-ia-para-datos",
  "/casos/clases-de-ia-para-datos/03-calidad-de-datos",
```

- [ ] **Step 2: La prueba del quiz**

Agrega al final de `e2e/tests/clases.spec.ts`:
```ts
test("con el Caso 4 completo: el quiz de IA para datos marca qué revisar sin dar la respuesta y se aprueba con todo correcto", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(300_000);
  const email = await registrarse(page, "Antonia Quilapán");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "clases-de-excel", "despachos-rapidos", "clases-de-sql", "minimarkets-del-sur", "clases-de-python", "tienda-online-pewen", "clases-de-power-bi", "clinica-cordillera-central"]) {
    await completarCaso(page, admin, ip, email, caso);
  }
  await aprobar(page, ip, "clases-de-ia-para-datos", MISIONES["clases-de-ia-para-datos"].slice(0, 2));

  await page.goto("/casos/clases-de-ia-para-datos/03-calidad-de-datos");
  await expect(page.getByText("> lección 3/14", { exact: false })).toBeVisible();
  const responder = async (segunda: string) => {
    await page.getByLabel("Duplicados, faltantes o formatos inconsistentes.").check();
    await page.getByLabel(segunda).check();
    await page.getByLabel("Comprobar contra fuente y reglas.").check();
    const reportado = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
    await page.getByRole("button", { name: "Validar" }).click();
    await reportado;
  };
  await expect(async () => {
    await responder("Más precisión automáticamente.");
    await expect(page.getByText("Tienes 2 de 3 respuestas correctas. Revisa la pregunta 2.")).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByText("Revisa esta pregunta.")).toHaveCount(1);
  await expect(page.getByText("La misma categoría escrita distinto se cuenta por separado.")).toHaveCount(0);

  await responder("Conteos y filtros incorrectos.");
  await expect(page.getByText("Aprobada", { exact: true })).toBeVisible();
  await expect(page.getByText("La misma categoría escrita distinto se cuenta por separado.")).toBeVisible();
});
```

Run: `npm run test:e2e -- tests/clases.spec.ts tests/proyecto-final.spec.ts`
Expected: `8 passed`.

- [ ] **Step 3: README**

`## Clases` en `README.md` queda:
```markdown
## Clases

- **Qué son:** antes del caso que las aplica, una lección por tema, traída de las aulas de la v1. En `caso.yaml` llevan `tipo: clases` y solo `slug`, `titulo`, `dataset` y `misiones`: no tienen empresa, entregable, rúbrica ni certificado propio.
  - Se completan al aprobar todas sus lecciones y habilitan el caso siguiente de la ruta. Cuentan para el certificado de la ruta, pero no van al portafolio.
  - Cada lección es una misión con `<Concepto>`, `<Sintaxis>` (la forma general, que no se ejecuta), ejemplos, un ejercicio y un `<Debrief>` sin consejo de entrevista.
  - La última lección no tiene que ser sin guía: el caso siguiente cumple ese papel.
  - En la ruta Data Analyst: clases de Excel antes del Caso 1, de SQL antes del Caso 2, de Python antes del Caso 3, de Power BI antes del Caso 4 y de IA para datos antes del proyecto final.
- **Planillas propias:** una tarea de planilla (`SheetTask`) toma su hoja de un CSV de `datos/` (`hoja`) o la trae escrita en la lección (`grilla`, fila por fila desde A1), como las aulas de la v1.
- **Quiz:** `<QuizTask preguntas />` es un quiz de opción única, como los de la v1. Las opciones se mezclan al mostrarse y se aprueba con todas las respuestas correctas. Un error cuenta como intento y marca qué preguntas revisar, sin decir la respuesta; al aprobar aparece la explicación de cada pregunta (`packages/engines/src/quiz.ts`).
- **Lecturas:** `<LecturaTask pregunta respuesta />` es una lección sin validación automática, como las lecturas de la v1: se piensa la pregunta y, al marcarla como completada, aparece la respuesta del curso.
- **Importar un aula de la v1:**
  1. Exporta sus datos a JSON, con el Node de tu equipo: `node packages/content/scripts/exportar-aula-v1.mjs ../cursos/aula-sql > tmp/aula-sql.json`.
  2. Escribe el borrador: `docker compose run --rm tools pnpm --filter @syntaxerror/content importar <sql|excel|python|powerbi|ia> /app/tmp/aula-<aula>.json /app/content/casos/<carpeta> <lección,lección,...>`.
  3. Revisa el borrador: tildes que el diccionario no corrige solo (`mas`, `aun`, `que` en preguntas), dos pistas por lección que orienten sin dar la respuesta, y el título y el dataset de `caso.yaml`. Después corre `npm run content:validate`.
- **El importador** (`packages/content/src/importar/`) tiene un formato común (`leccion.ts`: consultas, planillas y lecturas) y un adaptador por aula (`aula-sql.ts`, `aula-excel.ts`, `aula-python.ts`, `aula-powerbi.ts`, `aula-ia.ts`).
  - En Excel, la v1 guardaba solo el valor esperado de cada celda: la fórmula de la solución se saca de la pista ("En D2 escribe =B2*C2"), se repite fila abajo cuando la pista dice "repite la misma lógica", y el validador comprueba que dé el valor esperado.
  - En Python, la v1 comparaba una variable (`resultado`) con un valor esperado: eso pasa a ser la prueba del `PythonTask`, con tolerancia para números y sin revelar el valor. La solución se saca de la explicación ("resultado = len(precios) = 5"); si no está, el importador la marca con `# REVISAR` y el validador no la deja pasar hasta que la revisión la escriba. Los ejemplos de código dependen de la preparación de la lección, así que se muestran como bloques de solo lectura.
  - Power BI se practica en Power BI Desktop: los pasos de cada práctica van al concepto, su dataset (que el exportador trae desde `public/datasets` del aula) queda en «Datos del caso» y la autocorrección de la v1 es una `LecturaTask`. Ahí las comillas simples encierran nombres de menús, que también se corrigen (`respetarComillas: false`).
  - El voseo de las aulas pasa a tú ("podés" → "puedes", "seguí" → "sigue", "por vos" → "por ti"); las formas ambiguas se revisan a mano.
  - Corrige tildes con un diccionario y nombres propios de los datos (Concepción, Tomás), pero no toca los valores entre comillas simples, los nombres de tablas y columnas de SQL ni las planillas, para que los ejercicios sigan calzando con sus soluciones.
  - Descarta las pistas de la v1 que traían la consulta o la fórmula: el validador rechaza una pista de SQL o Python con la solución completa.
```

- [ ] **Step 4: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes.

Run: `npm run test:e2e`
Expected: `45 passed`. Dos corridas seguidas deben dar lo mismo.

- [ ] **Step 5: Commit**

```bash
git add e2e README.md
git commit -m "test(e2e): clases de ia para datos antes del proyecto final, con el quiz

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**La ruta Data Analyst queda completa,** con las cinco aulas de la v1 y los seis casos:
> Caso 0 → Excel → Caso 1 → SQL → Caso 2 → Python → Caso 3 → Power BI → Caso 4 → IA para datos → Proyecto final

**Pendientes antes de lanzar:**
- **Recorrer la ruta completa como estudiante, en local**, y que el equipo confirme las decisiones pendientes: las clases son obligatorias, y las 11 lecciones de SQL que no son de análisis quedaron fuera.
- **Publicar la ruta** (`estado: publicada`).
- **Retomar el despliegue** (Fases 5b y 5c), cuando el equipo lo decida.
