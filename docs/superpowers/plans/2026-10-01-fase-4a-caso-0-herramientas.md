# Fase 4a: Caso 0, Herramientas del oficio. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar el primer caso de la ruta Data Analyst, "Herramientas del oficio". Son 7 misiones donde la persona aprende a trabajar con GitHub desde la web, sin instalar nada:
- crear un repositorio;
- escribir un README en Markdown;
- hacer commits con mensajes propios;
- ordenar un proyecto;
- armar su perfil;
- terminar con su repositorio de presentación personal, que es el entregable del caso.

**Architecture:**
- **Dos tareas nuevas que se corrigen solas:**
  - `MarkdownTask`: se escribe Markdown con vista previa en vivo y se revisa en el navegador con `markdown-it`.
  - `GithubTask`: se revisa el repositorio real de la persona por la API de GitHub, con los requisitos de la tarea: público, README, commits con mensaje propio, carpetas, nombres sin espacios ni tildes y el Markdown del README.
- **Dónde vive la revisión:**
  - Los requisitos de Markdown viven en `packages/engines` (`markdown-requisitos.ts`, liviano, y `markdown.ts`, con `markdown-it`). Los usan la tarea, los esquemas de contenido y la revisión del README en GitHub.
  - La revisión en GitHub corre en el servidor (`POST /api/github/revisar`). Toma los requisitos del contenido, nunca del navegador, y tiene un límite de solicitudes por IP.
  - En desarrollo y e2e, `ENTREGABLES_VERIFICACION=prueba` evita llamar a GitHub, igual que con los entregables.
- **El caso:**
  - Es la primera parada de la ruta `data-analyst`.
  - El caso demo se mueve a una ruta propia en borrador (`demo`), para que las pruebas e2e sigan usándolo sin prerrequisitos.
- **Plazo de revisión:** al enviar un entregable se informa el plazo acordado con el equipo, 5 días hábiles.

**Tech Stack:** markdown-it 15.0.2 (con `@types/markdown-it` 14.2.0), la API REST de GitHub sin SDK, Next.js 15, zod 3, Vitest 4 y Playwright 1.55.

**Spec:** `docs/propuesta-pedagogica-data-analyst.md`, en particular:
- 4: cómo es una misión;
- 5: misión sin guía;
- 7: orden de la ruta;
- 8: Caso 0;
- 9: evaluación y certificación.

También los acuerdos del equipo del 2026-10-01:
- la empresa del Caso 0 es el perfil del propio estudiante;
- revisa el docente de la clase, o administración, en un plazo de 5 días hábiles.

## Global Constraints

**Entorno y texto**
- Todo se ejecuta en contenedores con `docker compose run --rm tools ...`. Las dependencias se instalan con versión exacta (`--save-exact`).
- El texto visible va en español de Chile, tratando de tú, sin voseo y con lenguaje neutro ("estudiante", "persona", "docente").
- Los nombres de botones de GitHub van como aparecen en su web, en inglés y en negrita (**New**, **Add a README file**, **Commit changes…**).

**Páginas**
- `/casos/[caso]` y `/casos/[caso]/[mision]` siguen estáticas, con `x-nextjs-cache: HIT`.
- `markdown-it` se carga con `import()` solo en las misiones que tienen `MarkdownTask`. El componente `GithubTask` importa únicamente `@/lib/github/descripcion`, sin `markdown-it`.

**Pedagogía**
- El Caso 0 se hace completo desde la web de GitHub: sin terminal ni instalaciones (propuesta, sección 8).
- Los mensajes de commit que GitHub escribe solo ("Initial commit", "Create x", "Update x", "Add files via upload", "Delete x", "Rename x to y") no cuentan como mensajes propios.
- La misión 7 es sin guía: sin concepto, sin ejemplo y sin pistas. Su repositorio es el entregable del caso.
- Cada misión desde la 3 repasa algo de las anteriores: el `.csv` de la 3 se exige en la 4, el Markdown de la 2 se aplica en la 5 y los commits de la 3 cuentan en la 5.

**Seguridad**
- La vista previa de Markdown usa `html: false`: el HTML escrito a mano se muestra como texto, y `markdown-it` no genera enlaces `javascript:`.
- `/api/github/revisar` acepta solo slugs y un usuario de GitHub válido o un enlace de repositorio. Los requisitos salen del contenido.

**Commits**
- Mensajes en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Una persona escribe mal su usuario de GitHub** (`-ana`, `ana/../otro`, vacío) o pega un enlace que no es de un repositorio. El servidor responde 400 sin llamar a GitHub, y la tarea explica qué escribir. Tests en Task 3.
2. **GitHub no responde, tarda o limita las consultas** (sin token son 60 por hora para todo el servidor). La persona ve "No pudimos revisar GitHub en este momento", y ese intento no suma como fallido para las pistas. Tests en Task 3 (revisor) y Task 4 (componente: `reintentable` no registra el intento).
3. **Commits con mensajes automáticos de GitHub, o mensajes propios que empiezan con un verbo en inglés** ("Update the README with the results"). Los automáticos no cuentan y los propios sí. Tests en Task 3.
4. **Un README con errores típicos** (`#Título`, `-elemento`, una tabla sin `| --- |` o una imagen sin `!`). El error se explica antes de decir qué falta, tanto en `MarkdownTask` como en la revisión del README en GitHub. Tests en Tasks 1 y 3.
5. **Se manda por la API una tarea que no es de GitHub, o requisitos inventados.** Responde 404, o usa los requisitos del contenido e ignora los enviados. Test en Task 3.

## Estructura de archivos

```
packages/engines/src/
  markdown-requisitos.ts        ELEMENTOS_MARKDOWN, PATRON_REQUISITO_MARKDOWN, leerRequisito, describirRequisitoMarkdown
  markdown.ts                   renderizarMarkdown, analizarMarkdown, problemasMarkdown, revisarMarkdown
packages/content/src/
  esquemas.ts                   MarkdownTask, GithubTask, PATRON_REQUISITO_GITHUB, TIPOS_TAREA
  validar.ts                    revisa la solución de MarkdownTask; GithubTask no tiene solución previa
apps/web/src/lib/github/
  descripcion.ts                PATRON_USUARIO, describirRequisito (liviano, para el navegador)
  requisitos.ts                 esMensajePropio, problemasRepositorio
  revisor.ts                    resolverObjetivo, crearRevisorGithub, revisorPrueba, revisorDesdeEntorno
apps/web/src/app/api/github/revisar/route.ts
apps/web/src/lib/entregables/plazo.ts       PLAZO_REVISION_DIAS_HABILES
apps/web/src/components/mision/
  markdown-task.tsx, github-task.tsx, componentes.tsx, panel-caso.tsx
apps/web/src/lib/tutor/contexto.ts, apps/web/src/lib/buscador/indice.ts
apps/web/src/app/globals.css    .markdown-vista
content/rutas/data-analyst.yaml, content/rutas/demo.yaml
content/casos/herramientas-del-oficio/   caso.yaml y 7 misiones
e2e/tests/herramientas.spec.ts
README.md
```

---

### Task 1: Motor de Markdown

**Files:**
- Create: `packages/engines/src/markdown-requisitos.ts`, `packages/engines/src/markdown.ts`
- Test: `packages/engines/src/markdown.test.ts`
- Modify: `packages/engines/package.json` (dependencia `markdown-it` y exports `./markdown` y `./markdown-requisitos`)

**Interfaces:**
- Consumes: `ResultadoTarea` (`./tipos`).
- Produces en `@syntaxerror/engines/markdown-requisitos`, sin `markdown-it`:
  - `ELEMENTOS_MARKDOWN`: `titulo`, `subtitulos`, `lista`, `lista-numerada`, `tabla`, `enlace`, `imagen`, `negrita`, `codigo`;
  - `type ElementoMarkdown`;
  - `PATRON_REQUISITO_MARKDOWN`: un requisito es un elemento con mínimo opcional, como `"subtitulos:2"`;
  - `leerRequisito(requisito): { elemento; minimo }`;
  - `NOMBRES`;
  - `describirRequisitoMarkdown(requisito): string`, por ejemplo "al menos 2 subtítulos".
- Produces en `@syntaxerror/engines/markdown`:
  - todo lo anterior, reexportado;
  - `renderizarMarkdown(texto): string`, con el HTML escapado;
  - `type ResumenMarkdown`;
  - `analizarMarkdown(texto): ResumenMarkdown`;
  - `problemasMarkdown(texto, requisitos): string[]`;
  - `revisarMarkdown(texto, requisitos): ResultadoTarea`.

- [ ] **Step 1: Instalar markdown-it**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines add markdown-it@15.0.2 --save-exact && pnpm --filter @syntaxerror/engines add -D @types/markdown-it@14.2.0 --save-exact"`

En `packages/engines/package.json`, agregar a `exports`:
```json
    "./markdown": "./src/markdown.ts",
    "./markdown-requisitos": "./src/markdown-requisitos.ts",
```

- [ ] **Step 2: Escribir las pruebas**

`packages/engines/src/markdown.test.ts`:
~~~~ts
import { describe, expect, it } from "vitest";
import { analizarMarkdown, describirRequisitoMarkdown, leerRequisito, problemasMarkdown, renderizarMarkdown, revisarMarkdown } from "./markdown";

const README = [
  "# Análisis de despachos",
  "",
  "Revisé los despachos de **marzo** con `SUMAR.SI`.",
  "",
  "## Datos",
  "",
  "- despachos.csv",
  "- comunas.csv",
  "",
  "## Resultados",
  "",
  "1. Maipú tiene más atrasos.",
  "2. Los lunes son el peor día.",
  "",
  "| Comuna | Despachos |",
  "| --- | --- |",
  "| Maipú | 120 |",
  "",
  "Más en [mi perfil](https://github.com/ana) y ![gráfico](https://ejemplo.cl/grafico.png).",
].join("\n");

describe("analizarMarkdown", () => {
  it("cuenta cada elemento", () => {
    expect(analizarMarkdown(README)).toEqual({ titulo: 1, subtitulos: 2, lista: 1, "lista-numerada": 1, tabla: 1, enlace: 1, imagen: 1, negrita: 1, codigo: 1 });
  });

  it("no cuenta lo que parece Markdown dentro de un bloque de código", () => {
    expect(analizarMarkdown("```\n# no es título\n- no es lista\n```")).toMatchObject({ titulo: 0, lista: 0, codigo: 1 });
  });
});

describe("leerRequisito", () => {
  it("lee el elemento y el mínimo", () => {
    expect(leerRequisito("lista")).toEqual({ elemento: "lista", minimo: 1 });
    expect(leerRequisito("subtitulos:3")).toEqual({ elemento: "subtitulos", minimo: 3 });
    expect(() => leerRequisito("parrafo")).toThrow("Requisito de Markdown desconocido: parrafo");
  });
});

describe("revisarMarkdown", () => {
  it("aprueba cuando están todos los requisitos", () => {
    expect(revisarMarkdown(README, ["titulo", "subtitulos:2", "lista", "tabla", "enlace", "imagen"])).toEqual({ aprobada: true, diagnostico: null });
  });

  it("pide escribir algo si está vacío", () => {
    expect(revisarMarkdown("  \n", ["titulo"])).toEqual({ aprobada: false, diagnostico: "Escribe tu Markdown antes de validar." });
  });

  it("explica el título sin espacio después del #", () => {
    expect(revisarMarkdown("#Mi proyecto", ["titulo"]).diagnostico).toBe(
      "Después de los # va un espacio: escribe «# Título», no «#Título». Falta un título principal: una línea que empiece con «# », por ejemplo «# Análisis de despachos»."
    );
  });

  it("dice cuántos subtítulos hay y cuántos faltan", () => {
    expect(revisarMarkdown("# T\n\n## Uno", ["subtitulos:2"]).diagnostico).toBe(
      "Se necesitan 2 subtítulos y hay 1. Faltan subtítulos: cada uno empieza con «## », por ejemplo «## Datos»."
    );
  });

  it("explica la lista sin espacio, la tabla sin separación y la imagen sin !", () => {
    expect(revisarMarkdown("-uno\n-dos", ["lista"]).diagnostico).toMatch(/^Después del guion va un espacio/);
    expect(revisarMarkdown("| a | b |\n| 1 | 2 |", ["tabla"]).diagnostico).toMatch(/^Tu tabla necesita, bajo la fila de encabezados/);
    expect(revisarMarkdown("[gráfico](https://ejemplo.cl/g.png)", ["imagen"]).diagnostico).toMatch(/^Para mostrar una imagen, el enlace lleva un !/);
  });

  it("lista todos los problemas en orden", () => {
    expect(problemasMarkdown("Solo un párrafo.", ["titulo", "lista"])).toHaveLength(2);
  });
});

describe("renderizarMarkdown", () => {
  it("escapa el HTML y no deja enlaces javascript:", () => {
    const html = renderizarMarkdown('<script>alert(1)</script>\n\n[clic](javascript:alert(1))');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('href="javascript:');
  });
});

describe("describirRequisitoMarkdown", () => {
  it("nombra el requisito en español", () => {
    expect(describirRequisitoMarkdown("tabla")).toBe("una tabla");
    expect(describirRequisitoMarkdown("subtitulos:2")).toBe("al menos 2 subtítulos");
  });
});
~~~~

- [ ] **Step 3: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/markdown.test.ts`
Expected: FAIL, "Failed to resolve import ./markdown".

- [ ] **Step 4: Implementar**

`packages/engines/src/markdown-requisitos.ts`:
```ts
// Requisitos de Markdown sin depender de markdown-it: los usan el navegador (listas de requisitos) y los esquemas de contenido.
export const ELEMENTOS_MARKDOWN = ["titulo", "subtitulos", "lista", "lista-numerada", "tabla", "enlace", "imagen", "negrita", "codigo"] as const;
export type ElementoMarkdown = (typeof ELEMENTOS_MARKDOWN)[number];

// Un requisito es un elemento con un mínimo opcional: "lista" o "subtitulos:2".
export const PATRON_REQUISITO_MARKDOWN = new RegExp(`^(${ELEMENTOS_MARKDOWN.join("|")})(?::([1-9]))?$`);

export function leerRequisito(requisito: string): { elemento: ElementoMarkdown; minimo: number } {
  const coincidencia = PATRON_REQUISITO_MARKDOWN.exec(requisito);
  if (!coincidencia) throw new Error(`Requisito de Markdown desconocido: ${requisito}`);
  return { elemento: coincidencia[1] as ElementoMarkdown, minimo: Number(coincidencia[2] ?? 1) };
}

// Cómo se nombra cada elemento: [uno, varios].
export const NOMBRES: Record<ElementoMarkdown, [string, string]> = {
  titulo: ["un título principal", "títulos principales"],
  subtitulos: ["un subtítulo", "subtítulos"],
  lista: ["una lista", "listas"],
  "lista-numerada": ["una lista numerada", "listas numeradas"],
  tabla: ["una tabla", "tablas"],
  enlace: ["un enlace", "enlaces"],
  imagen: ["una imagen", "imágenes"],
  negrita: ["texto en negrita", "textos en negrita"],
  codigo: ["código", "fragmentos de código"],
};

export function describirRequisitoMarkdown(requisito: string): string {
  const { elemento, minimo } = leerRequisito(requisito);
  return minimo === 1 ? NOMBRES[elemento][0] : `al menos ${minimo} ${NOMBRES[elemento][1]}`;
}
```

`packages/engines/src/markdown.ts`:
~~~~ts
import MarkdownIt from "markdown-it";
import { leerRequisito, NOMBRES, type ElementoMarkdown } from "./markdown-requisitos";
import type { ResultadoTarea } from "./tipos";

export { describirRequisitoMarkdown, ELEMENTOS_MARKDOWN, leerRequisito, PATRON_REQUISITO_MARKDOWN, type ElementoMarkdown } from "./markdown-requisitos";

// html: false escapa cualquier HTML escrito a mano; la vista previa nunca ejecuta nada de la persona.
const parser = new MarkdownIt({ html: false, linkify: false });

export type ResumenMarkdown = Record<ElementoMarkdown, number>;

export function renderizarMarkdown(texto: string): string {
  return parser.render(texto);
}

export function analizarMarkdown(texto: string): ResumenMarkdown {
  const resumen: ResumenMarkdown = { titulo: 0, subtitulos: 0, lista: 0, "lista-numerada": 0, tabla: 0, enlace: 0, imagen: 0, negrita: 0, codigo: 0 };
  const recorrer = (tokens: ReturnType<typeof parser.parse>) => {
    for (const token of tokens) {
      if (token.type === "heading_open" && token.tag === "h1") resumen.titulo += 1;
      else if (token.type === "heading_open" && token.tag === "h2") resumen.subtitulos += 1;
      else if (token.type === "bullet_list_open") resumen.lista += 1;
      else if (token.type === "ordered_list_open") resumen["lista-numerada"] += 1;
      else if (token.type === "table_open") resumen.tabla += 1;
      else if (token.type === "link_open") resumen.enlace += 1;
      else if (token.type === "image") resumen.imagen += 1;
      else if (token.type === "strong_open") resumen.negrita += 1;
      else if (token.type === "code_inline" || token.type === "fence" || token.type === "code_block") resumen.codigo += 1;
      if (token.children) recorrer(token.children);
    }
  };
  recorrer(parser.parse(texto, {}));
  return resumen;
}

const FALTA: Record<ElementoMarkdown, string> = {
  titulo: "Falta un título principal: una línea que empiece con «# », por ejemplo «# Análisis de despachos».",
  subtitulos: "Faltan subtítulos: cada uno empieza con «## », por ejemplo «## Datos».",
  lista: "Falta una lista: cada elemento va en su propia línea y empieza con «- ».",
  "lista-numerada": "Falta una lista numerada: «1. », «2. » y así, cada uno en su línea.",
  tabla: "Falta una tabla: una fila de encabezados, una línea de separación como «| --- | --- |» y al menos una fila de datos.",
  enlace: "Falta un enlace: [texto del enlace](https://…).",
  imagen: "Falta una imagen: ![descripción de la imagen](https://…).",
  negrita: "Falta texto en negrita: **así**.",
  codigo: "Falta código: entre comillas invertidas, `así`, o en un bloque que empieza y termina con ```.",
};

// Los errores más comunes al empezar con Markdown: se explican antes del requisito que falla.
function errorComun(elemento: ElementoMarkdown, texto: string): string | null {
  const lineas = texto.split(/\r?\n/);
  if ((elemento === "titulo" || elemento === "subtitulos") && lineas.some((linea) => /^#{1,6}[^#\s]/.test(linea.trim()))) {
    return "Después de los # va un espacio: escribe «# Título», no «#Título».";
  }
  if (elemento === "lista" && lineas.some((linea) => /^[-*][^\s*-]/.test(linea.trim()))) {
    return "Después del guion va un espacio: escribe «- elemento», no «-elemento».";
  }
  if (elemento === "tabla" && lineas.filter((linea) => linea.includes("|")).length >= 2) {
    return "Tu tabla necesita, bajo la fila de encabezados, una línea de separación como «| --- | --- |».";
  }
  if (elemento === "imagen" && /\]\([^)]+\.(png|jpe?g|gif|svg|webp)\)/i.test(texto)) {
    return "Para mostrar una imagen, el enlace lleva un ! adelante: ![descripción](url).";
  }
  return null;
}

export function problemasMarkdown(texto: string, requisitos: string[]): string[] {
  if (!texto.trim()) return ["Escribe tu Markdown antes de validar."];
  const resumen = analizarMarkdown(texto);
  const problemas: string[] = [];
  for (const requisito of requisitos) {
    const { elemento, minimo } = leerRequisito(requisito);
    const hay = resumen[elemento];
    if (hay >= minimo) continue;
    const base = hay === 0 || minimo === 1 ? FALTA[elemento] : `Se necesitan ${minimo} ${NOMBRES[elemento][1]} y hay ${hay}. ${FALTA[elemento]}`;
    const comun = hay === 0 ? errorComun(elemento, texto) : null;
    problemas.push(comun ? `${comun} ${base}` : base);
  }
  return problemas;
}

export function revisarMarkdown(texto: string, requisitos: string[]): ResultadoTarea {
  const [primero] = problemasMarkdown(texto, requisitos);
  return primero ? { aprobada: false, diagnostico: primero } : { aprobada: true, diagnostico: null };
}
~~~~

- [ ] **Step 5: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines exec vitest run src/markdown.test.ts && pnpm --filter @syntaxerror/engines exec tsc --noEmit -p ."`
Expected: PASS (11 pruebas) y sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add packages/engines pnpm-lock.yaml
git commit -m "feat(engines): motor de markdown con requisitos y errores comunes explicados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Tareas de Markdown y GitHub en el contenido

**Files:**
- Modify: `packages/content/src/esquemas.ts`, `packages/content/src/validar.ts`
- Test: `packages/content/src/validar.test.ts`, `packages/content/src/bloques.test.ts`

**Interfaces:**
- Consumes: `PATRON_REQUISITO_MARKDOWN` (Task 1, desde `markdown-requisitos`, para no cargar `markdown-it` en los esquemas) y `revisarMarkdown` (Task 1).
- Produces en `@syntaxerror/content/esquemas`:
  - `bloqueSchemas.MarkdownTask`: `{ id, enunciado?, inicial = "", requisitos: string[] (mín. 1), solucion, pistas }`;
  - `bloqueSchemas.GithubTask`: `{ id, enunciado?, repositorio?, requisitos: string[] (mín. 1), pistas }`. `repositorio` es una plantilla, `"{usuario}/nombre"` o `"{usuario}/{usuario}"`; sin ella, la persona pega el enlace.
  - `PATRON_REQUISITO_GITHUB`, que acepta:
    - `publico`, `readme`, `nombres-limpios`;
    - `commits:N`, `carpeta:x`, `extension:.ext`;
    - `readme:<requisito de Markdown>`.
  - `TIPOS_TAREA` suma `"MarkdownTask"` y `"GithubTask"`, así cuentan para aprobar misiones, para la sincronización y para el progreso.

- [ ] **Step 1: Escribir las pruebas**

En `packages/content/src/validar.test.ts`:

1. En la prueba "rechaza una misión sin tarea práctica", cambia el texto esperado por:
```ts
      "casos/ventas/misiones/01-filtrar.mdx: la misión no tiene ninguna tarea práctica (SqlTask, PythonTask, SheetTask, MarkdownTask o GithubTask)"
```
2. Antes de `it("rechaza un Brief de más de 150 palabras"`, agrega:
```ts
  it("revisa la solución de una tarea de Markdown con sus requisitos", async () => {
    mision("01-filtrar").bloques.push({
      tipo: "MarkdownTask",
      props: { id: "readme", inicial: "", requisitos: ["titulo", "tabla"], solucion: "# Proyecto", pistas: [] },
      texto: null,
    });
    expect(await validar()).toContain(
      'casos/ventas/misiones/01-filtrar.mdx: la solución de la tarea "readme" no pasa su propio validador: Falta una tabla: una fila de encabezados, una línea de separación como «| --- | --- |» y al menos una fila de datos.'
    );
  });

  it("una tarea de GitHub cuenta como tarea práctica y no tiene solución que validar", async () => {
    const filtrar = mision("01-filtrar");
    filtrar.bloques = filtrar.bloques.filter((candidato) => candidato.tipo !== "SqlTask");
    filtrar.bloques.push({ tipo: "GithubTask", props: { id: "repo", repositorio: "{usuario}/mi-primer-repositorio", requisitos: ["publico", "readme"], pistas: [] }, texto: null });
    expect(await validar()).toEqual([]);
  });
```

Al final de `packages/content/src/bloques.test.ts`, agrega:
```ts
describe("tareas de Markdown y GitHub", () => {
  it("leen sus requisitos y rechazan los desconocidos", async () => {
    const [markdown, github] = await extraerBloques(
      '<MarkdownTask id="readme" requisitos={["titulo", "subtitulos:2"]} solucion="# Hola" />\n\n<GithubTask id="repo" repositorio="{usuario}/{usuario}" requisitos={["publico", "readme:enlace", "commits:3"]} />'
    );
    expect(markdown.props).toEqual({ id: "readme", requisitos: ["titulo", "subtitulos:2"], solucion: "# Hola" });
    expect(github.props).toEqual({ id: "repo", repositorio: "{usuario}/{usuario}", requisitos: ["publico", "readme:enlace", "commits:3"] });
    const { bloqueSchemas } = await import("./esquemas");
    expect(bloqueSchemas.MarkdownTask.safeParse({ id: "x", requisitos: ["parrafo"], solucion: "a" }).success).toBe(false);
    expect(bloqueSchemas.GithubTask.safeParse({ id: "x", requisitos: ["readme:parrafo"] }).success).toBe(false);
    expect(bloqueSchemas.GithubTask.safeParse({ id: "x", repositorio: "ana/repo", requisitos: ["publico"] }).success).toBe(false);
    expect(bloqueSchemas.GithubTask.safeParse({ id: "x", requisitos: ["carpeta:datos", "extension:.csv", "nombres-limpios", "readme"] }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/validar.test.ts src/bloques.test.ts`
Expected: FAIL, porque `MarkdownTask` y `GithubTask` son componentes desconocidos y el texto de la misión sin tarea cambió.

- [ ] **Step 3: Implementar**

En `packages/content/src/esquemas.ts`:

1. Agrega el import:
```ts
import { PATRON_REQUISITO_MARKDOWN } from "@syntaxerror/engines/markdown-requisitos";
```
2. Después de `const pistas = ...`, agrega:
```ts
const requisitoMarkdown = z.string().regex(PATRON_REQUISITO_MARKDOWN, "requisito de Markdown desconocido (titulo, subtitulos, lista, lista-numerada, tabla, enlace, imagen, negrita o codigo, con :N opcional)");

// Lo que se revisa en un repositorio de GitHub (Caso 0). "readme:<requisito>" revisa el Markdown del README.
export const PATRON_REQUISITO_GITHUB = /^(publico|readme|nombres-limpios|commits:[1-9]|carpeta:[a-z0-9_-]+|extension:\.[a-z0-9]+|readme:[a-z:0-9-]+)$/;
const requisitoGithub = z
  .string()
  .regex(PATRON_REQUISITO_GITHUB, "requisito de GitHub desconocido")
  .refine((requisito) => !requisito.startsWith("readme:") || PATRON_REQUISITO_MARKDOWN.test(requisito.slice("readme:".length)), "requisito de README desconocido");
```
3. En `bloqueSchemas`, antes de `Decision`, agrega:
```ts
  MarkdownTask: z.object({
    id: idTarea,
    enunciado: z.string().optional(),
    inicial: z.string().default(""),
    requisitos: z.array(requisitoMarkdown).min(1, "indica al menos un requisito"),
    solucion: texto,
    pistas,
  }),
  // Se revisa contra el GitHub de la persona: {usuario} se reemplaza por su usuario. Sin repositorio, pega el enlace.
  GithubTask: z.object({
    id: idTarea,
    enunciado: z.string().optional(),
    repositorio: z
      .string()
      .regex(/^\{usuario\}\/(?:\{usuario\}|[A-Za-z0-9._-]+)$/, 'debe ser "{usuario}/nombre-del-repositorio" o "{usuario}/{usuario}"')
      .optional(),
    requisitos: z.array(requisitoGithub).min(1, "indica al menos un requisito"),
    pistas,
  }),
```
4. Cambia `TIPOS_TAREA` por:
```ts
export const TIPOS_TAREA = ["SqlTask", "PythonTask", "SheetTask", "MarkdownTask", "GithubTask"] as const;
```

En `packages/content/src/validar.ts`:

1. Agrega el import:
```ts
import { revisarMarkdown } from "@syntaxerror/engines/markdown";
```
2. En `revisarSolucion`, después del caso `"PythonTask"`, agrega:
```ts
    case "MarkdownTask":
      return revisarMarkdown(tarea.props.solucion, tarea.props.requisitos);
    case "GithubTask":
      // Se revisa contra el repositorio de cada persona: no hay una solución que validar de antemano.
      return { aprobada: true, diagnostico: null };
```
3. Cambia el texto de la misión sin tarea por:
```ts
      if (tareas.length === 0) problemas.push(`${donde}: la misión no tiene ninguna tarea práctica (SqlTask, PythonTask, SheetTask, MarkdownTask o GithubTask)`);
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content test && pnpm --filter @syntaxerror/content exec tsc --noEmit -p ."`
Expected: PASS y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add packages/content
git commit -m "feat(contenido): tareas de markdown y de github como tareas practicas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Revisión en GitHub

**Files:**
- Create: `apps/web/src/lib/github/descripcion.ts`, `apps/web/src/lib/github/requisitos.ts`, `apps/web/src/lib/github/revisor.ts`
- Test: `apps/web/src/lib/github/requisitos.test.ts`, `apps/web/src/lib/github/revisor.test.ts`
- Create: `apps/web/src/app/api/github/revisar/route.ts`
- Test: `apps/web/src/app/api/github/revisar/route.test.ts`
- Modify: `apps/web/src/lib/rate-limit.ts`

**Interfaces:**
- Consumes:
  - `describirRequisitoMarkdown` (`markdown-requisitos`) y `problemasMarkdown` (`markdown`) de la Task 1;
  - `parsearRepositorio` y `urlRepositorio` (`@/lib/entregables/github`, Fase 3e1);
  - `checkRateLimit` y `getClientIp`;
  - `obtenerCaso` (`@/lib/contenido`).
- Produces en `@/lib/github/descripcion`:
  - `PATRON_USUARIO`;
  - `describirRequisito(requisito): string`.
- Produces en `@/lib/github/requisitos`:
  - `type DatosRepositorio = { publico; rutas; readme: string | null; mensajes }`;
  - `esMensajePropio(mensaje): boolean`;
  - `problemasRepositorio(datos, requisitos): string[]`, que reexporta también lo de `descripcion`.
- Produces en `@/lib/github/revisor`:
  - `type Objetivo = { dueno; nombre }`;
  - `type RevisionGithub = { aprobada: true } | { aprobada: false; problemas; reintentable }`;
  - `type RevisorGithub`;
  - `resolverObjetivo(plantilla, { usuario?, url? }): Objetivo | null`;
  - `crearRevisorGithub({ fetch, token?, timeoutMs? })`, `revisorPrueba` y `revisorDesdeEntorno()`.
- Produces `POST /api/github/revisar` con cuerpo `{ caso, mision, tarea, usuario?, url? }`:
  - responde `RevisionGithub & { repositorio: string }`;
  - o un error: 400 `datos_invalidos`, `usuario_invalido` o `url_invalida`; 404 `tarea_no_existe`; 429 `rate_limited` con `Retry-After`.
- Produces en `RateLimitKey`: `"github"`, con 20 cada 10 minutos por IP.

La revisión pide a GitHub solo lo necesario:
- siempre, el repositorio y su árbol;
- el README en crudo (`application/vnd.github.raw`), solo si hay un requisito `readme:*`;
- los últimos 100 commits, solo si hay `commits:N`.

Sin token, GitHub da 60 consultas por hora para todo el servidor. Por eso en producción hay que definir `GITHUB_TOKEN`; ya lo usa la verificación de entregables.

- [ ] **Step 1: Escribir las pruebas**

`apps/web/src/lib/github/requisitos.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { describirRequisito, esMensajePropio, problemasRepositorio, type DatosRepositorio } from "./requisitos";

const README = "# Ana Pérez\n\n## Sobre mí\n\n- Analista en formación\n\n[LinkedIn](https://linkedin.com/in/ana)";
const completo: DatosRepositorio = {
  publico: true,
  rutas: ["README.md", "datos/despachos-marzo.csv", "resultados/resumen.md"],
  readme: README,
  mensajes: ["Agrega los despachos de marzo", "Explica los resultados en el README", "Ordena las carpetas", "Update README.md"],
};

describe("esMensajePropio", () => {
  it("descarta los mensajes que GitHub escribe solo", () => {
    for (const mensaje of ["Initial commit", "Create README.md", "Update README.md", "Add files via upload", "Delete datos.csv", "Rename a.csv to b.csv", "update datos/x.csv"]) {
      expect(esMensajePropio(mensaje), mensaje).toBe(false);
    }
  });

  it("acepta los escritos por la persona, aunque empiecen con un verbo en inglés", () => {
    expect(esMensajePropio("Agrega los despachos de marzo\n\nDetalle en el README")).toBe(true);
    expect(esMensajePropio("Update the README with the results")).toBe(true);
    expect(esMensajePropio("   ")).toBe(false);
  });
});

describe("describirRequisito", () => {
  it("explica cada requisito en español", () => {
    expect(["publico", "readme", "commits:3", "carpeta:datos", "extension:.csv", "nombres-limpios", "readme:subtitulos:2"].map(describirRequisito)).toEqual([
      "El repositorio es público.",
      "Tiene un README en la carpeta principal.",
      "Tiene al menos 3 commits con mensajes escritos por ti.",
      "Tiene una carpeta «datos».",
      "Tiene al menos un archivo .csv.",
      "Los nombres de carpetas y archivos no tienen espacios ni tildes.",
      "El README tiene al menos 2 subtítulos.",
    ]);
    expect(() => describirRequisito("estrellas:5")).toThrow("Requisito de GitHub desconocido: estrellas:5");
  });
});

describe("problemasRepositorio", () => {
  const todos = ["publico", "readme", "commits:3", "carpeta:datos", "extension:.csv", "nombres-limpios", "readme:titulo", "readme:lista", "readme:enlace"];

  it("aprueba un repositorio que cumple todo", () => {
    expect(problemasRepositorio(completo, todos)).toEqual([]);
  });

  it("explica lo que falta, sin repetir", () => {
    const vacio: DatosRepositorio = { publico: false, rutas: ["Datos Marzo/Despachos Ñuñoa.csv"], readme: null, mensajes: ["Initial commit", "Agrega datos"] };
    expect(problemasRepositorio(vacio, todos)).toEqual([
      "El repositorio es privado: hazlo público en Settings → General → Danger Zone → Change visibility.",
      "Falta el README en la carpeta principal del repositorio.",
      "Encontramos 1 commit con mensaje escrito por ti y se necesitan 3. Los mensajes automáticos de GitHub, como «Update README.md» o «Add files via upload», no cuentan: al guardar, escribe qué cambiaste.",
      "Falta la carpeta «datos». En GitHub se crea al nombrar un archivo como «datos/nombre-del-archivo».",
      "Estos nombres tienen espacios, tildes u otros caracteres que conviene evitar: «Datos Marzo/Despachos Ñuñoa.csv». Usa minúsculas, números y guiones, como «ventas-marzo.csv».",
    ]);
  });

  it("revisa el Markdown del README", () => {
    expect(problemasRepositorio({ ...completo, readme: "#Ana" }, ["readme:titulo", "readme:tabla"])).toEqual([
      "En el README: Después de los # va un espacio: escribe «# Título», no «#Título». Falta un título principal: una línea que empiece con «# », por ejemplo «# Análisis de despachos».",
      "En el README: Falta una tabla: una fila de encabezados, una línea de separación como «| --- | --- |» y al menos una fila de datos.",
    ]);
  });
});
```

`apps/web/src/lib/github/revisor.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { crearRevisorGithub, resolverObjetivo, revisorPrueba } from "./revisor";

type Respuesta = { status: number; cuerpo?: unknown; texto?: string } | Error;

function fetchFalso(respuestas: Record<string, Respuesta>) {
  const pedidas: string[] = [];
  const fetch = (async (url: string, init?: RequestInit) => {
    const ruta = url.replace("https://api.github.com", "");
    pedidas.push(ruta);
    expect(new Headers(init?.headers).get("User-Agent")).toBe("syntaxerror.cl");
    const respuesta = respuestas[ruta];
    if (!respuesta) return new Response("{}", { status: 404 });
    if (respuesta instanceof Error) throw respuesta;
    return new Response(respuesta.texto ?? JSON.stringify(respuesta.cuerpo ?? {}), { status: respuesta.status });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, pedidas };
}

const OBJETIVO = { dueno: "ana", nombre: "ana" };
const repo = { status: 200, cuerpo: { private: false, default_branch: "main" } };
const arbol = (...rutas: string[]) => ({ status: 200, cuerpo: { tree: rutas.map((path) => ({ path, type: "blob" })) } });

describe("resolverObjetivo", () => {
  it("completa la plantilla con el usuario", () => {
    expect(resolverObjetivo("{usuario}/{usuario}", { usuario: "ana-perez" })).toEqual({ dueno: "ana-perez", nombre: "ana-perez" });
    expect(resolverObjetivo("{usuario}/mi-primer-repositorio", { usuario: "ana" })).toEqual({ dueno: "ana", nombre: "mi-primer-repositorio" });
  });

  it("rechaza usuarios inválidos y, sin plantilla, usa el enlace", () => {
    expect(resolverObjetivo("{usuario}/x", { usuario: "-ana" })).toBeNull();
    expect(resolverObjetivo("{usuario}/x", { usuario: "ana/../otro" })).toBeNull();
    expect(resolverObjetivo("{usuario}/x", {})).toBeNull();
    expect(resolverObjetivo(undefined, { url: "https://github.com/ana/presentacion" })).toEqual({ dueno: "ana", nombre: "presentacion" });
    expect(resolverObjetivo(undefined, { url: "ana/presentacion" })).toBeNull();
  });
});

describe("crearRevisorGithub", () => {
  it("lee el README y los commits solo si los requisitos los piden", async () => {
    const { fetch, pedidas } = fetchFalso({ "/repos/ana/ana": repo, "/repos/ana/ana/git/trees/main?recursive=1": arbol("README.md") });
    expect(await crearRevisorGithub({ fetch })(OBJETIVO, ["publico", "readme"])).toEqual({ aprobada: true });
    expect(pedidas).toEqual(["/repos/ana/ana", "/repos/ana/ana/git/trees/main?recursive=1"]);
  });

  it("revisa el Markdown del README y los mensajes de los commits", async () => {
    const { fetch } = fetchFalso({
      "/repos/ana/ana": repo,
      "/repos/ana/ana/git/trees/main?recursive=1": arbol("README.md"),
      "/repos/ana/ana/readme": { status: 200, texto: "# Ana\n\n[GitHub](https://github.com/ana)" },
      "/repos/ana/ana/commits?per_page=100": { status: 200, cuerpo: [{ commit: { message: "Escribe mi presentación" } }, { commit: { message: "Create README.md" } }] },
    });
    expect(await crearRevisorGithub({ fetch })(OBJETIVO, ["readme:titulo", "readme:enlace", "commits:1"])).toEqual({ aprobada: true });
    const resultado = await crearRevisorGithub({ fetch })(OBJETIVO, ["readme:lista", "commits:2"]);
    expect(resultado).toMatchObject({ aprobada: false, reintentable: false });
    expect(resultado.aprobada === false && resultado.problemas).toHaveLength(2);
  });

  it("explica el repositorio que no existe o está vacío", async () => {
    expect(await crearRevisorGithub({ fetch: fetchFalso({}).fetch })(OBJETIVO, ["readme"])).toEqual({
      aprobada: false,
      problemas: ["No encontramos github.com/ana/ana. Revisa que el nombre sea exacto y que el repositorio sea público."],
      reintentable: false,
    });
    const { fetch } = fetchFalso({ "/repos/ana/ana": repo, "/repos/ana/ana/git/trees/main?recursive=1": { status: 409 } });
    expect(await crearRevisorGithub({ fetch })(OBJETIVO, ["readme"])).toMatchObject({ aprobada: false, problemas: ["El repositorio está vacío: crea al menos el README."] });
  });

  it("si GitHub falla o limita, pide reintentar sin culpar a la persona", async () => {
    for (const respuesta of [new Error("timeout"), { status: 403 }, { status: 500 }] as Respuesta[]) {
      const { fetch } = fetchFalso({ "/repos/ana/ana": respuesta });
      expect(await crearRevisorGithub({ fetch })(OBJETIVO, ["readme"])).toEqual({
        aprobada: false,
        problemas: ["No pudimos revisar GitHub en este momento. Intenta de nuevo en unos minutos."],
        reintentable: true,
      });
    }
  });

  it("envía el token si lo hay", async () => {
    let autorizacion: string | null = null;
    const fetch = (async (_url: string, init?: RequestInit) => {
      autorizacion = new Headers(init?.headers).get("Authorization");
      return new Response("{}", { status: 404 });
    }) as unknown as typeof globalThis.fetch;
    await crearRevisorGithub({ fetch, token: "t0k3n" })(OBJETIVO, ["readme"]);
    expect(autorizacion).toBe("Bearer t0k3n");
  });
});

describe("revisorPrueba", () => {
  it("simula usuario inexistente y repositorio vacío", async () => {
    expect(await revisorPrueba({ dueno: "ana", nombre: "ana" }, ["readme"])).toEqual({ aprobada: true });
    expect(await revisorPrueba({ dueno: "no-existe", nombre: "x" }, ["readme"])).toMatchObject({ aprobada: false });
    expect(await revisorPrueba({ dueno: "ana", nombre: "repo-vacio" }, ["readme"])).toMatchObject({ aprobada: false });
  });
});
```

`apps/web/src/app/api/github/revisar/route.test.ts` (usa el contenido real del Caso 0, que llega en la Task 5; hasta entonces falla con 404):
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Objetivo } from "@/lib/github/revisor";

vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");
vi.stubEnv("ENTREGABLES_VERIFICACION", "prueba");
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => ({ allowed: true })) }));
const revisadas: { objetivo: Objetivo; requisitos: string[] }[] = [];
vi.mock("@/lib/github/revisor", async (original) => {
  const modulo = await original<typeof import("@/lib/github/revisor")>();
  return {
    ...modulo,
    revisorDesdeEntorno: () => async (objetivo: Objetivo, requisitos: string[]) => {
      revisadas.push({ objetivo, requisitos });
      return modulo.revisorPrueba(objetivo, requisitos);
    },
  };
});

const { POST } = await import("./route");
const { checkRateLimit } = await import("@/lib/rate-limit");

const CASO = "herramientas-del-oficio";

function revisar(cuerpo: unknown) {
  return POST(new Request("http://localhost:3000/api/github/revisar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }));
}

beforeEach(() => {
  revisadas.length = 0;
});

describe("POST /api/github/revisar", () => {
  it("revisa el repositorio de la plantilla con los requisitos del contenido, no los del navegador", async () => {
    const respuesta = await revisar({ caso: CASO, mision: "01-tu-primer-repositorio", tarea: "primer-repositorio", usuario: "ana-perez", requisitos: [] });
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ aprobada: true, repositorio: "https://github.com/ana-perez/mi-primer-repositorio" });
    expect(revisadas).toEqual([{ objetivo: { dueno: "ana-perez", nombre: "mi-primer-repositorio" }, requisitos: ["publico", "readme"] }]);
  });

  it("en la misión sin guía revisa el enlace que pega la persona", async () => {
    const respuesta = await revisar({ caso: CASO, mision: "07-tu-presentacion", tarea: "presentacion", url: "https://github.com/ana/presentacion-vacio" });
    expect(await respuesta.json()).toEqual({
      aprobada: false,
      problemas: ["El repositorio está vacío: crea al menos el README."],
      reintentable: false,
      repositorio: "https://github.com/ana/presentacion-vacio",
    });
  });

  it("responde 400 si el usuario o el enlace no sirven, y 404 si la tarea no es de GitHub", async () => {
    expect((await revisar({ caso: CASO, mision: "01-tu-primer-repositorio", tarea: "primer-repositorio", usuario: "-ana" })).status).toBe(400);
    expect(await (await revisar({ caso: CASO, mision: "07-tu-presentacion", tarea: "presentacion", url: "ana/presentacion" })).json()).toEqual({ error: "url_invalida" });
    expect((await revisar({ caso: CASO, mision: "02-escribe-un-readme", tarea: "readme-de-proyecto", usuario: "ana" })).status).toBe(404);
    expect((await revisar({ caso: "no-existe", mision: "x", tarea: "y", usuario: "ana" })).status).toBe(404);
    expect((await revisar({ caso: CASO })).status).toBe(400);
    expect(revisadas).toEqual([]);
  });

  it("limita las revisiones por IP", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 120 });
    const respuesta = await revisar({ caso: CASO, mision: "01-tu-primer-repositorio", tarea: "primer-repositorio", usuario: "ana" });
    expect(respuesta.status).toBe(429);
    expect(respuesta.headers.get("Retry-After")).toBe("120");
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run src/lib/github`
Expected: FAIL, "Failed to resolve import ./requisitos".

- [ ] **Step 3: Implementar**

`apps/web/src/lib/github/descripcion.ts`:
```ts
import { describirRequisitoMarkdown } from "@syntaxerror/engines/markdown-requisitos";

// Liviano a propósito: lo usa el navegador (GithubTask) y no debe arrastrar markdown-it.

// Las reglas de GitHub para un usuario: alfanumérico y guiones, sin empezar con guion, hasta 39.
export const PATRON_USUARIO = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;

export function describirRequisito(requisito: string): string {
  if (requisito === "publico") return "El repositorio es público.";
  if (requisito === "readme") return "Tiene un README en la carpeta principal.";
  if (requisito === "nombres-limpios") return "Los nombres de carpetas y archivos no tienen espacios ni tildes.";
  const [tipo, valor] = requisito.split(/:(.*)/s);
  if (tipo === "commits") return `Tiene al menos ${valor} commits con mensajes escritos por ti.`;
  if (tipo === "carpeta") return `Tiene una carpeta «${valor}».`;
  if (tipo === "extension") return `Tiene al menos un archivo ${valor}.`;
  if (tipo === "readme") return `El README tiene ${describirRequisitoMarkdown(valor)}.`;
  throw new Error(`Requisito de GitHub desconocido: ${requisito}`);
}
```

`apps/web/src/lib/github/requisitos.ts`:
```ts
import { problemasMarkdown } from "@syntaxerror/engines/markdown";

export { describirRequisito, PATRON_USUARIO } from "./descripcion";

// Lo que la revisión necesita saber de un repositorio, ya leído desde la API de GitHub.
export type DatosRepositorio = { publico: boolean; rutas: string[]; readme: string | null; mensajes: string[] };

// Mensajes que GitHub escribe solo al crear, editar o subir desde la web: no cuentan como mensajes propios.
const MENSAJE_AUTOMATICO = /^(initial commit|add files via upload|(create|update|delete|rename) \S+( to \S+)?)$/i;
const SEGMENTO_LIMPIO = /^[A-Za-z0-9._-]+$/;
const README = /^readme(\.[a-z0-9]+)?$/i;

export function esMensajePropio(mensaje: string): boolean {
  const titulo = mensaje.split("\n")[0].trim();
  return titulo.length > 0 && !MENSAJE_AUTOMATICO.test(titulo);
}

export function problemasRepositorio(datos: DatosRepositorio, requisitos: string[]): string[] {
  const problemas = new Set<string>();
  const sinReadme = "Falta el README en la carpeta principal del repositorio.";
  for (const requisito of requisitos) {
    const [tipo, valor] = requisito.split(/:(.*)/s);
    if (tipo === "publico" && !datos.publico) {
      problemas.add("El repositorio es privado: hazlo público en Settings → General → Danger Zone → Change visibility.");
    } else if (tipo === "readme" && !valor && !datos.rutas.some((ruta) => README.test(ruta))) {
      problemas.add(sinReadme);
    } else if (tipo === "readme" && valor) {
      if (datos.readme === null) problemas.add(sinReadme);
      else for (const problema of problemasMarkdown(datos.readme, [valor])) problemas.add(`En el README: ${problema}`);
    } else if (tipo === "commits") {
      const propios = datos.mensajes.filter(esMensajePropio).length;
      const necesarios = Number(valor);
      if (propios < necesarios) {
        problemas.add(
          `Encontramos ${propios} ${propios === 1 ? "commit" : "commits"} con mensaje escrito por ti y se necesitan ${necesarios}. Los mensajes automáticos de GitHub, como «Update README.md» o «Add files via upload», no cuentan: al guardar, escribe qué cambiaste.`
        );
      }
    } else if (tipo === "carpeta" && !datos.rutas.some((ruta) => ruta.startsWith(`${valor}/`))) {
      problemas.add(`Falta la carpeta «${valor}». En GitHub se crea al nombrar un archivo como «${valor}/nombre-del-archivo».`);
    } else if (tipo === "extension" && !datos.rutas.some((ruta) => ruta.toLowerCase().endsWith(valor))) {
      problemas.add(`Falta al menos un archivo ${valor}.`);
    } else if (tipo === "nombres-limpios") {
      const malos = datos.rutas.filter((ruta) => ruta.split("/").some((segmento) => !SEGMENTO_LIMPIO.test(segmento)));
      if (malos.length > 0) {
        problemas.add(
          `Estos nombres tienen espacios, tildes u otros caracteres que conviene evitar: ${malos.slice(0, 3).map((ruta) => `«${ruta}»`).join(", ")}. Usa minúsculas, números y guiones, como «ventas-marzo.csv».`
        );
      }
    }
  }
  return [...problemas];
}
```

`apps/web/src/lib/github/revisor.ts`:
```ts
import { parsearRepositorio } from "@/lib/entregables/github";
import { PATRON_USUARIO } from "./descripcion";
import { problemasRepositorio } from "./requisitos";

export type Objetivo = { dueno: string; nombre: string };
export type RevisionGithub = { aprobada: true } | { aprobada: false; problemas: string[]; reintentable: boolean };
export type RevisorGithub = (objetivo: Objetivo, requisitos: string[]) => Promise<RevisionGithub>;


const noDisponible = (): RevisionGithub => ({
  aprobada: false,
  problemas: ["No pudimos revisar GitHub en este momento. Intenta de nuevo en unos minutos."],
  reintentable: true,
});
const rechazo = (...problemas: string[]): RevisionGithub => ({ aprobada: false, problemas, reintentable: false });

// Resuelve qué repositorio revisar: la plantilla de la tarea ("{usuario}/mi-primer-repositorio") o el enlace pegado.
export function resolverObjetivo(plantilla: string | undefined, { usuario, url }: { usuario?: string; url?: string }): Objetivo | null {
  if (plantilla) {
    if (!usuario || !PATRON_USUARIO.test(usuario)) return null;
    const [dueno, nombre] = plantilla.replaceAll("{usuario}", usuario).split("/");
    return { dueno, nombre };
  }
  return url ? parsearRepositorio(url) : null;
}

export function crearRevisorGithub({ fetch, token, timeoutMs = 8_000 }: { fetch: typeof globalThis.fetch; token?: string; timeoutMs?: number }): RevisorGithub {
  const api = (ruta: string, accept = "application/vnd.github+json") =>
    fetch(`https://api.github.com${ruta}`, {
      headers: { Accept: accept, "User-Agent": "syntaxerror.cl", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });

  return async ({ dueno, nombre }, requisitos) => {
    try {
      const base = `/repos/${dueno}/${nombre}`;
      const repo = await api(base);
      // Sin token, GitHub responde 404 también para los privados.
      if (repo.status === 404) {
        return rechazo(`No encontramos github.com/${dueno}/${nombre}. Revisa que el nombre sea exacto y que el repositorio sea público.`);
      }
      if (!repo.ok) return noDisponible();
      const datos = (await repo.json()) as { private?: boolean; default_branch?: string };

      const arbol = await api(`${base}/git/trees/${encodeURIComponent(datos.default_branch ?? "main")}?recursive=1`);
      if (arbol.status === 404 || arbol.status === 409) return rechazo("El repositorio está vacío: crea al menos el README.");
      if (!arbol.ok) return noDisponible();
      const { tree = [] } = (await arbol.json()) as { tree?: { path: string; type: string }[] };
      const rutas = tree.filter((nodo) => nodo.type === "blob").map((nodo) => nodo.path);

      let readme: string | null = null;
      if (requisitos.some((requisito) => requisito.startsWith("readme:"))) {
        const respuesta = await api(`${base}/readme`, "application/vnd.github.raw");
        if (respuesta.ok) readme = await respuesta.text();
        else if (respuesta.status !== 404) return noDisponible();
      }

      let mensajes: string[] = [];
      if (requisitos.some((requisito) => requisito.startsWith("commits:"))) {
        const respuesta = await api(`${base}/commits?per_page=100`);
        if (!respuesta.ok) return noDisponible();
        mensajes = ((await respuesta.json()) as { commit: { message: string } }[]).map((commit) => commit.commit.message);
      }

      const problemas = problemasRepositorio({ publico: !datos.private, rutas, readme, mensajes }, requisitos);
      return problemas.length > 0 ? rechazo(...problemas) : { aprobada: true };
    } catch {
      return noDisponible();
    }
  };
}

// Para desarrollo y e2e (ENTREGABLES_VERIFICACION=prueba): no llama a GitHub.
export const revisorPrueba: RevisorGithub = async ({ dueno, nombre }) => {
  if (dueno === "no-existe") return rechazo(`No encontramos github.com/${dueno}/${nombre}. Revisa que el nombre sea exacto y que el repositorio sea público.`);
  if (nombre.includes("vacio")) return rechazo("El repositorio está vacío: crea al menos el README.");
  return { aprobada: true };
};

export function revisorDesdeEntorno(): RevisorGithub {
  if (process.env.ENTREGABLES_VERIFICACION === "prueba") return revisorPrueba;
  return crearRevisorGithub({ fetch: globalThis.fetch, token: process.env.GITHUB_TOKEN?.trim() || undefined });
}
```

`apps/web/src/app/api/github/revisar/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/client-ip";
import { obtenerCaso } from "@/lib/contenido";
import { urlRepositorio } from "@/lib/entregables/github";
import { resolverObjetivo, revisorDesdeEntorno } from "@/lib/github/revisor";
import { checkRateLimit } from "@/lib/rate-limit";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const cuerpoSchema = z.object({
  caso: slug,
  mision: slug,
  tarea: slug,
  usuario: z.string().trim().max(39).optional(),
  url: z.string().trim().max(500).optional(),
});

// Revisa en GitHub una tarea del Caso 0. Los requisitos salen del contenido, nunca del navegador.
export async function POST(request: Request) {
  const parsed = cuerpoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });
  const limite = await checkRateLimit("github", getClientIp(request.headers));
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const caso = await obtenerCaso(parsed.data.caso);
  const mision = caso?.misiones.find((candidata) => candidata.slug === parsed.data.mision);
  const tarea = mision?.bloques.find((bloque) => bloque.tipo === "GithubTask" && bloque.props.id === parsed.data.tarea);
  if (tarea?.tipo !== "GithubTask") return NextResponse.json({ error: "tarea_no_existe" }, { status: 404 });

  const objetivo = resolverObjetivo(tarea.props.repositorio, { usuario: parsed.data.usuario, url: parsed.data.url });
  if (!objetivo) return NextResponse.json({ error: tarea.props.repositorio ? "usuario_invalido" : "url_invalida" }, { status: 400 });
  const revision = await revisorDesdeEntorno()(objetivo, tarea.props.requisitos);
  return NextResponse.json({ ...revision, repositorio: urlRepositorio(objetivo) });
}
```

En `apps/web/src/lib/rate-limit.ts`:

1. Agrega `| "github"` al final del tipo `RateLimitKey`.
2. Agrega a `LIMITER_CONFIGS`:
```ts
  // Cada revisión consulta la API de GitHub (hasta 4 llamadas): sin token, el límite es de 60 por hora para todo el servidor.
  github: { points: 20, duration: 600 },
```

- [ ] **Step 4: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "cd apps/web && pnpm exec vitest run src/lib/github && pnpm exec tsc --noEmit -p ."`
Expected: PASS (14 pruebas) y sin errores de tipos. `route.test.ts` se corre en la Task 5, cuando exista el contenido.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/github apps/web/src/app/api/github apps/web/src/lib/rate-limit.ts
git commit -m "feat(github): revision de repositorios con requisitos del contenido y limite por ip

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Las tareas en la misión y el plazo de revisión

**Files:**
- Create: `apps/web/src/components/mision/markdown-task.tsx`, `apps/web/src/components/mision/github-task.tsx`, `apps/web/src/lib/entregables/plazo.ts`
- Modify:
  - `apps/web/src/components/mision/componentes.tsx`, `apps/web/src/components/mision/panel-caso.tsx`;
  - `apps/web/src/lib/tutor/contexto.ts`, `apps/web/src/lib/buscador/indice.ts`;
  - `apps/web/src/app/globals.css`.

**Interfaces:**
- Consumes:
  - `useMision()`: `caso`, `mision`, `tareaAprobada` y `registrarResultado`;
  - `PanelTarea` y `EditorCodigo`;
  - `@syntaxerror/engines/markdown` por `import()` (Task 1);
  - `describirRequisito` y `PATRON_USUARIO` (Task 3);
  - `POST /api/github/revisar` (Task 3).
- Produces:
  - `MarkdownTask({ id, enunciado?, inicial, requisitos, pistas })`;
  - `GithubTask({ id, enunciado?, repositorio?, requisitos, pistas })`;
  - `PLAZO_REVISION_DIAS_HABILES = 5`.

Cómo se comportan:
- **`MarkdownTask`:**
  - Muestra el editor ("Tu README") junto a la vista previa (región "Vista previa").
  - La lista de requisitos marca con ✓ lo que ya se cumple mientras se escribe.
  - "Validar" revisa con `revisarMarkdown`.
- **`GithubTask`:**
  - Con plantilla, pide "Tu usuario de GitHub" y lo recuerda en `localStorage` (`syntaxerror:github-usuario`); sin plantilla, pide el enlace.
  - Si GitHub no responde (`reintentable`), ese intento no se registra como fallido.

- [ ] **Step 1: Los componentes**

`apps/web/src/components/mision/markdown-task.tsx`:
```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { EditorCodigo } from "./editor-codigo";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";

export type MarkdownTaskProps = { id: string; enunciado?: string; inicial: string; requisitos: string[]; pistas: string[] };
type Motor = typeof import("@syntaxerror/engines/markdown");

export function MarkdownTask({ id, enunciado, inicial, requisitos, pistas }: MarkdownTaskProps) {
  const { tareaAprobada, registrarResultado } = useMision();
  const [texto, setTexto] = useState(inicial);
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  // markdown-it llega con import(): solo lo descargan las misiones que lo usan.
  const [motor, setMotor] = useState<Motor | null>(null);
  useEffect(() => {
    let vigente = true;
    import("@syntaxerror/engines/markdown").then(
      (modulo) => { if (vigente) setMotor(modulo); },
      () => {}
    );
    return () => { vigente = false; };
  }, []);
  const vista = useMemo(() => (motor ? motor.renderizarMarkdown(texto) : ""), [motor, texto]);
  const cumplidos = useMemo(
    () => new Set(motor && texto.trim() ? requisitos.filter((requisito) => motor.problemasMarkdown(texto, [requisito]).length === 0) : []),
    [motor, texto, requisitos]
  );
  function validar() {
    if (!motor) return;
    const revision = motor.revisarMarkdown(texto, requisitos);
    setResultado(revision);
    registrarResultado(id, revision.aprobada);
  }
  return (
    <PanelTarea id={id} titulo="tarea de Markdown" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<Button type="button" disabled={!motor} onClick={validar}>Validar</Button>}>
      <div className="grid gap-2 text-sm">
        <p className="font-bold">Tu README debe tener</p>
        <ul className="grid gap-1 leading-6">
          {requisitos.map((requisito) => (
            <li key={requisito} className={cumplidos.has(requisito) ? "text-primary" : "text-muted-foreground"}>
              {`${cumplidos.has(requisito) ? "✓" : "○"} ${motor ? motor.describirRequisitoMarkdown(requisito) : requisito}`}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <EditorCodigo etiqueta="Tu README" valor={texto} onCambio={setTexto} filas={14} />
        <div className="grid content-start gap-2 text-sm">
          <p className="font-bold">Vista previa</p>
          <div role="region" aria-label="Vista previa" className="markdown-vista min-h-40 rounded-md border border-border bg-background p-4" dangerouslySetInnerHTML={{ __html: vista }} />
        </div>
      </div>
    </PanelTarea>
  );
}
```

`apps/web/src/components/mision/github-task.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
import { describirRequisito, PATRON_USUARIO } from "@/lib/github/descripcion";
import { useMision } from "./mision-provider";
import { PanelTarea } from "./panel-tarea";

export type GithubTaskProps = { id: string; enunciado?: string; repositorio?: string; requisitos: string[]; pistas: string[] };
type Respuesta = { aprobada: true } | { aprobada: false; problemas: string[]; reintentable: boolean };

const CLAVE_USUARIO = "syntaxerror:github-usuario";

function leerUsuario(): string {
  try {
    return localStorage.getItem(CLAVE_USUARIO) ?? "";
  } catch {
    return "";
  }
}

function guardarUsuario(usuario: string) {
  try {
    localStorage.setItem(CLAVE_USUARIO, usuario);
  } catch {
    // Sin almacenamiento solo se pierde el recordatorio del usuario.
  }
}

export function GithubTask({ id, enunciado, repositorio, requisitos, pistas }: GithubTaskProps) {
  const { caso, mision, tareaAprobada, registrarResultado } = useMision();
  const [usuario, setUsuario] = useState("");
  const [url, setUrl] = useState("");
  const [resultado, setResultado] = useState<ResultadoTarea | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [revisando, setRevisando] = useState(false);
  useEffect(() => setUsuario(leerUsuario()), []);
  const usuarioValido = PATRON_USUARIO.test(usuario.trim());
  const destino = repositorio && usuarioValido ? `github.com/${repositorio.replaceAll("{usuario}", usuario.trim())}` : null;

  function avisar(diagnostico: string) {
    setProblemas([]);
    setResultado({ aprobada: false, diagnostico });
  }

  async function revisar() {
    setRevisando(true);
    try {
      if (repositorio) guardarUsuario(usuario.trim());
      const respuesta = await fetch("/api/github/revisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caso, mision, tarea: id, ...(repositorio ? { usuario: usuario.trim() } : { url: url.trim() }) }),
      });
      if (respuesta.status === 429) return avisar("Hiciste muchas revisiones seguidas. Espera unos minutos y vuelve a intentar.");
      if (respuesta.status === 400) {
        return avisar(repositorio ? "Escribe tu usuario de GitHub tal como aparece en tu perfil: letras, números y guiones." : "Pega el enlace de tu repositorio: https://github.com/tu-usuario/tu-repositorio");
      }
      if (!respuesta.ok) return avisar("No pudimos revisar ahora. Intenta de nuevo en unos minutos.");
      const datos = (await respuesta.json()) as Respuesta;
      if (datos.aprobada) {
        setProblemas([]);
        setResultado({ aprobada: true, diagnostico: null });
        registrarResultado(id, true);
        return;
      }
      // Si GitHub no respondió no es un intento fallido de la persona: no suma para las pistas.
      if (datos.reintentable) return avisar(datos.problemas[0]);
      setProblemas(datos.problemas);
      setResultado({ aprobada: false, diagnostico: datos.problemas.length === 1 ? datos.problemas[0] : `Revisamos tu repositorio y faltan ${datos.problemas.length} cosas:` });
      registrarResultado(id, false);
    } catch {
      avisar("No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setRevisando(false);
    }
  }

  return (
    <PanelTarea id={id} titulo="tarea en GitHub" enunciado={enunciado} aprobada={tareaAprobada(id)} resultado={resultado} pistas={pistas} acciones={<Button type="button" disabled={revisando} onClick={() => void revisar()}>{revisando ? "Revisando…" : "Revisar en GitHub"}</Button>}>
      <div className="grid gap-2 text-sm">
        <p className="font-bold">Lo que vamos a revisar</p>
        <ul className="grid list-disc gap-1 pl-5 leading-6">{requisitos.map((requisito) => <li key={requisito}>{describirRequisito(requisito)}</li>)}</ul>
      </div>
      {repositorio ? (
        <label className="grid gap-1 text-sm font-bold">
          Tu usuario de GitHub
          <input value={usuario} onChange={(evento) => setUsuario(evento.target.value)} autoComplete="off" spellCheck={false} placeholder="ana-perez" className="field font-mono" />
          <span className="font-normal text-muted-foreground">{destino ? `Revisaremos ${destino}` : "Es el nombre que aparece en github.com/tu-usuario."}</span>
        </label>
      ) : (
        <label className="grid gap-1 text-sm font-bold">
          Enlace a tu repositorio
          <input value={url} onChange={(evento) => setUrl(evento.target.value)} autoComplete="off" spellCheck={false} placeholder="https://github.com/tu-usuario/tu-repositorio" className="field font-mono" />
        </label>
      )}
      {problemas.length > 1 ? (
        <ul aria-label="Lo que falta en tu repositorio" className="grid list-disc gap-1 rounded-md border border-destructive/30 bg-destructive/10 p-3 pl-8 text-sm leading-6">
          {problemas.map((problema) => <li key={problema}>{problema}</li>)}
        </ul>
      ) : null}
    </PanelTarea>
  );
}
```

`apps/web/src/lib/entregables/plazo.ts`:
```ts
// Plazo de revisión que se comunica al enviar un entregable (acordado con el equipo el 2026-10-01).
export const PLAZO_REVISION_DIAS_HABILES = 5;
```

- [ ] **Step 2: Conectarlos**

En `apps/web/src/components/mision/componentes.tsx`:

1. Agrega los imports:
```tsx
import { GithubTask } from "./github-task";
import { MarkdownTask } from "./markdown-task";
```
2. Antes de `Decision`, agrega:
```tsx
    MarkdownTask: (props: PropsMdx) => {
      const { solucion: _solucion, ...tarea } = bloqueSchemas.MarkdownTask.parse(props);
      return <MarkdownTask {...tarea} />;
    },
    GithubTask: (props: PropsMdx) => <GithubTask {...bloqueSchemas.GithubTask.parse(props)} />,
```

En `apps/web/src/lib/tutor/contexto.ts`:

1. Cambia `TIPO_DE_TAREA` por:
```ts
const TIPO_DE_TAREA = { SqlTask: "SQL", PythonTask: "Python", SheetTask: "de planilla", MarkdownTask: "de Markdown", GithubTask: "en GitHub" } as const;
```
2. Cambia la condición de las tareas por:
```ts
    else if (bloque.tipo === "SqlTask" || bloque.tipo === "PythonTask" || bloque.tipo === "SheetTask" || bloque.tipo === "MarkdownTask" || bloque.tipo === "GithubTask") {
```

En `apps/web/src/lib/buscador/indice.ts`, cambia la condición de los enunciados por:
```ts
    if ((bloque.tipo === "SqlTask" || bloque.tipo === "PythonTask" || bloque.tipo === "SheetTask" || bloque.tipo === "MarkdownTask" || bloque.tipo === "GithubTask") && bloque.props.enunciado) {
```

En `apps/web/src/components/mision/panel-caso.tsx`:

1. Agrega el import:
```tsx
import { PLAZO_REVISION_DIAS_HABILES } from "@/lib/entregables/plazo";
```
2. Cambia el texto del entregable pendiente (`Tu entregable está en revisión. Te avisaremos por email cuando lo revisen. Enviaste:{" "}`) por:
```tsx
            {`Tu entregable está en revisión. Te responderemos en un plazo de ${PLAZO_REVISION_DIAS_HABILES} días hábiles y te avisaremos por email. Enviaste: `}
```

Agrega al final de `apps/web/src/app/globals.css`:
```css
/* Vista previa de Markdown (Caso 0): se parece a cómo GitHub muestra un README. */
.markdown-vista { line-height: 1.6; overflow-wrap: anywhere; }
.markdown-vista > * + * { margin-top: 0.75rem; }
.markdown-vista h1 { font-size: 1.5rem; font-weight: 700; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem; }
.markdown-vista h2 { font-size: 1.25rem; font-weight: 700; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem; }
.markdown-vista h3 { font-size: 1.05rem; font-weight: 700; }
.markdown-vista ul { list-style: disc; padding-left: 1.5rem; }
.markdown-vista ol { list-style: decimal; padding-left: 1.5rem; }
.markdown-vista a { color: var(--primary); text-decoration: underline; }
.markdown-vista code { font-family: var(--font-mono); background: var(--surface-raised); padding: 0.1rem 0.3rem; border-radius: 0.25rem; }
.markdown-vista pre { background: var(--surface-raised); padding: 0.75rem; border-radius: 0.5rem; overflow-x: auto; }
.markdown-vista pre code { background: none; padding: 0; }
.markdown-vista table { border-collapse: collapse; }
.markdown-vista th, .markdown-vista td { border: 1px solid var(--border); padding: 0.25rem 0.75rem; }
.markdown-vista img { max-width: 100%; }
.markdown-vista blockquote { border-left: 3px solid var(--border); padding-left: 0.75rem; color: var(--muted-foreground); }
```

- [ ] **Step 3: Tipos y pruebas**

Run: `docker compose run --rm tools sh -c "cd apps/web && pnpm exec tsc --noEmit -p . && pnpm exec vitest run"`
Expected: sin errores de tipos y PASS (excepto `route.test.ts` de la Task 3, que espera el contenido de la Task 5).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/mision apps/web/src/lib/entregables/plazo.ts apps/web/src/lib/tutor/contexto.ts apps/web/src/lib/buscador/indice.ts apps/web/src/app/globals.css
git commit -m "feat(misiones): tareas de markdown con vista previa, tareas en github y plazo de revision

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: El contenido del Caso 0

**Files:**
- Create: `content/casos/herramientas-del-oficio/caso.yaml`
- Create: las 7 misiones de `content/casos/herramientas-del-oficio/misiones/`
- Create: `content/rutas/demo.yaml`
- Modify: `content/rutas/data-analyst.yaml`

**Interfaces:**
- Consumes: `MarkdownTask` y `GithubTask` (Tasks 2 y 4); `Brief`, `Concepto`, `Decision` y `Debrief`, que ya existen.
- Produces:
  - el caso `herramientas-del-oficio`, primero de la ruta `data-analyst`;
  - la ruta `demo` (borrador) con `demo-motor`, que las pruebas e2e usan sin prerrequisitos.
- **Ids de tarea, en orden**, que usa el e2e de la Task 6:
  1. `primer-repositorio`;
  2. `readme-de-proyecto`;
  3. `commits-propios`;
  4. `proyecto-ordenado`;
  5. `readme-del-proyecto`;
  6. `perfil`;
  7. `presentacion`.

El recorrido del caso:

| # | Misión | Tarea | Repasa |
|---|---|---|---|
| 1 | Tu primer repositorio | GitHub: `{usuario}/mi-primer-repositorio` público y con README | |
| 2 | Escribe un buen README | Markdown en el navegador: título, 2 subtítulos, lista, tabla y enlace | |
| 3 | Archivos y commits | GitHub: un `.csv` y 3 commits con mensaje propio | 1 |
| 4 | Ordena tu proyecto | GitHub: carpetas `datos` y `resultados`, el `.csv` y nombres limpios | 3 |
| 5 | El README de tu proyecto | GitHub: el README real con título, 2 subtítulos, lista, enlace y 4 commits | 2 y 3 |
| 6 | Tu perfil de GitHub | GitHub: `{usuario}/{usuario}` con título, lista y enlace | 2 |
| 7 | Tu presentación personal (sin guía) | GitHub, con el enlace que pega la persona: README completo con imagen, 3 commits y nombres limpios | todo el caso |

- [ ] **Step 1: Rutas y caso**

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
```

`content/rutas/demo.yaml`:
```yaml
# Caso de demostración del motor: lo usan las pruebas e2e y el desarrollo. Nunca se publica.
slug: demo
titulo: Demo del motor
cargo: Analista de datos junior
descripcion: Caso corto para probar las consolas de SQL, planilla y Python.
estado: borrador
casos:
  - demo-motor
```

`content/casos/herramientas-del-oficio/caso.yaml`:
```yaml
slug: herramientas-del-oficio
titulo: "Herramientas del oficio: GitHub y tu portafolio"
cargo: Persona que empieza a trabajar en tecnología
empresa: Tu propio perfil profesional
dataset: Tus archivos, tus proyectos y tu presentación personal
entregable: Un repositorio público de presentación personal en GitHub, con un README que cuente quién eres, qué estás aprendiendo, qué proyectos tienes y cómo contactarte.
# Solo se pide el README: lo revisa la verificación automática y después una persona con la rúbrica.
archivos: []
rubrica:
  - "El README presenta a la persona: quién es, qué está aprendiendo y qué busca."
  - "El README está ordenado: título, secciones, listas, una imagen y enlaces que funcionan."
  - "El historial de commits cuenta qué se hizo, con mensajes claros."
misiones:
  - 01-tu-primer-repositorio
  - 02-escribe-un-readme
  - 03-archivos-y-commits
  - 04-ordena-tu-proyecto
  - 05-el-readme-de-tu-proyecto
  - 06-tu-perfil-de-github
  - 07-tu-presentacion
```

- [ ] **Step 2: Las misiones**

`content/casos/herramientas-del-oficio/misiones/01-tu-primer-repositorio.mdx`:
```mdx
---
titulo: Tu primer repositorio
tiempo: 20
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Hola, qué bueno tenerte aquí. Antes de tocar datos quiero mostrarte dónde va a vivir tu trabajo. En los equipos de datos, las consultas, planillas y análisis se guardan en GitHub: ahí se revisan, se comparten y quedan a la vista de quien te quiera contratar. Cada entregable de esta ruta será un repositorio tuyo. Hoy partimos simple: crea tu cuenta y tu primer repositorio, llamado mi-primer-repositorio, público y con un README.
</Brief>

<Concepto>
Un **repositorio** es la carpeta de un proyecto con su historia completa: qué archivos tiene, quién cambió qué y cuándo. GitHub guarda repositorios en internet para que un equipo trabaje sobre los mismos archivos sin pisarse, y para que cualquiera pueda ver tu trabajo.

Todo se hace desde la web de GitHub, sin instalar nada:

1. Entra a github.com y elige **Sign up**. Usa un nombre de usuario profesional: es la dirección de tu portafolio (github.com/tu-usuario).
2. Ya con la cuenta, presiona **New** (o el **+** de arriba a la derecha y luego **New repository**).
3. En **Repository name** escribe exactamente `mi-primer-repositorio`.
4. Deja marcado **Public**: un repositorio privado no lo puede ver quien revise tu portafolio.
5. Marca **Add a README file** y presiona **Create repository**.

El README es la portada del repositorio: GitHub lo muestra apenas alguien entra.
</Concepto>

<GithubTask
  id="primer-repositorio"
  enunciado="Crea en tu cuenta el repositorio mi-primer-repositorio, público y con README. Después escribe tu usuario de GitHub y revisamos."
  repositorio="{usuario}/mi-primer-repositorio"
  requisitos={["publico", "readme"]}
  pistas={["El nombre debe ser exactamente mi-primer-repositorio, con guiones y en minúsculas.", "Si no ves el README, crea el repositorio de nuevo marcando Add a README file, o usa Add file → Create new file con el nombre README.md.", "Si GitHub dice que no existe, revisa en Settings → General que la visibilidad sea Public."]}
/>

<Decision
  pregunta="Vas a crear tu cuenta y piensas en el nombre de usuario. ¿Cuál eliges?"
  opciones={[
    { texto: "ana-perez-datos", correcta: true, porque: "Se lee bien, te identifica y sirve en un CV: github.com/ana-perez-datos." },
    { texto: "xX_anita_gamer_Xx", porque: "Puede ser divertido, pero es la dirección de tu portafolio profesional y quien te contrate la va a ver." },
    { texto: "user84629", porque: "No dice nada de ti: nadie lo va a recordar ni asociar contigo." },
  ]}
/>

<Debrief entrevista="Te pueden preguntar si usas GitHub o control de versiones. Una buena respuesta: 'Sí, guardo mis análisis en repositorios públicos; así queda el historial de cambios y cualquiera puede revisar cómo llegué a los resultados'.">
Un repositorio guarda el proyecto y su historia. Público significa que cualquiera lo puede ver, pero solo tú lo puedes cambiar. Desde ahora, cada entregable de la ruta será un repositorio como este.
</Debrief>
```

`content/casos/herramientas-del-oficio/misiones/02-escribe-un-readme.mdx`:
~~~~mdx
---
titulo: Escribe un buen README
tiempo: 25
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Revisé tu repositorio: está creado, pero el README dice solo el nombre. Cuando alguien entra a un proyecto, lo primero que lee es el README, y si no entiende de qué se trata, se va. Te dejo un ejercicio: escribe el README de un análisis de despachos de una pyme. Tiene que tener título, secciones, una lista de los datos, una tabla con un resultado y un enlace.
</Brief>

<Concepto>
Los README se escriben en **Markdown**: texto normal con algunos símbolos que le dan formato.

```
# Título principal
## Subtítulo

- un elemento de lista
- otro elemento

1. primer paso
2. segundo paso

| Comuna | Despachos |
| --- | --- |
| Maipú | 120 |

**negrita** y `código`

[texto del enlace](https://github.com)
![descripción de la imagen](https://ejemplo.cl/grafico.png)
```

Tres detalles que causan la mayoría de los errores:
- Después de `#` o de `-` va un **espacio**: `# Título`, no `#Título`.
- Una tabla necesita la línea `| --- | --- |` bajo los encabezados.
- Entre un párrafo y una lista o tabla va una **línea en blanco**.
</Concepto>

<MarkdownTask
  id="readme-de-proyecto"
  enunciado="Escribe el README del análisis de despachos: un título, al menos dos subtítulos, una lista, una tabla y un enlace. Mira la vista previa mientras escribes."
  inicial="Análisis de despachos"
  requisitos={["titulo", "subtitulos:2", "lista", "tabla", "enlace"]}
  solucion={"# Análisis de despachos de marzo\n\nRevisé los despachos de una pyme de la Región Metropolitana para encontrar dónde se atrasan las entregas.\n\n## Datos\n\n- despachos.csv: un registro por despacho\n- comunas.csv: tarifas por comuna\n\n## Resultados\n\n| Comuna | Atrasos |\n| --- | --- |\n| Maipú | 12 |\n| Ñuñoa | 4 |\n\nEl detalle está en [la carpeta de resultados](resultados/resumen.md)."}
  pistas={["El título empieza con # y un espacio. Los subtítulos, con ## y un espacio.", "Para la tabla: una fila con los encabezados, la línea | --- | --- | y al menos una fila con datos.", "Un enlace se escribe [texto](dirección). Puede apuntar a una página o a un archivo del repositorio."]}
/>

<Decision
  pregunta="Un compañero te pasa su README: dice solo 'proyecto final, ver archivos'. ¿Qué es lo más importante que le falta?"
  opciones={[
    { texto: "Explicar qué pregunta responde el proyecto, con qué datos y qué encontró.", correcta: true, porque: "Quien entra tiene que entender en un minuto de qué se trata y si le sirve, sin abrir los archivos." },
    { texto: "Más emojis y colores para que se vea bonito.", porque: "El formato ayuda a leer, pero no reemplaza el contenido: un README bonito y vacío sigue sin explicar nada." },
    { texto: "Nada: los archivos hablan por sí solos.", porque: "Nadie va a abrir diez archivos para adivinar qué hiciste; la mayoría se va antes." },
  ]}
/>

<Debrief entrevista="En entrevistas técnicas suelen abrir tu GitHub mientras conversan. Un README claro te permite guiar esa conversación: 'acá está la pregunta, acá los datos y acá lo que encontré'.">
Markdown es el formato de los README, de la documentación técnica y de muchas herramientas de trabajo. Un buen README responde tres preguntas: qué es, con qué datos y qué se encontró.
</Debrief>
~~~~

`content/casos/herramientas-del-oficio/misiones/03-archivos-y-commits.mdx`:
~~~~mdx
---
titulo: Archivos y commits
tiempo: 25
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Ahora vamos a llenar tu repositorio. Agrega un archivo de datos de despachos y después mejora el README. Cada vez que guardes un cambio, GitHub te va a pedir un mensaje: no lo dejes en lo que GitHub propone. Escribe qué cambiaste. Necesito ver al menos tres cambios con mensajes tuyos.
</Brief>

<Concepto>
Cada vez que guardas un cambio en GitHub haces un **commit**: una foto del proyecto en ese momento, con un mensaje que explica qué cambió. El historial de commits permite saber qué pasó, cuándo y volver atrás si algo sale mal.

Para crear un archivo desde la web:
1. En tu repositorio, presiona **Add file** → **Create new file**.
2. Nómbralo `despachos.csv` y pega estos datos:

```
fecha,comuna,estado,costo
2025-03-03,Maipú,entregado,3500
2025-03-03,Ñuñoa,atrasado,4200
2025-03-04,Puente Alto,entregado,3900
```

3. Presiona **Commit changes…** y, en **Commit message**, reemplaza el texto propuesto por uno tuyo.

Un buen mensaje dice qué cambió, con un verbo: «Agrega los despachos del 3 y 4 de marzo», «Corrige el costo de Ñuñoa», «Explica los datos en el README». Los mensajes que GitHub propone, como «Create despachos.csv» o «Update README.md», no cuentan.
</Concepto>

<GithubTask
  id="commits-propios"
  enunciado="En mi-primer-repositorio, agrega un archivo .csv y haz al menos tres commits con mensajes escritos por ti (por ejemplo, el archivo y dos mejoras al README)."
  repositorio="{usuario}/mi-primer-repositorio"
  requisitos={["extension:.csv", "commits:3"]}
  pistas={["Al guardar, borra el mensaje que propone GitHub y escribe el tuyo.", "Editar el README cuenta: abre README.md, presiona el lápiz (Edit this file), cambia algo y guarda con tu mensaje.", "Si un commit quedó con el mensaje automático, no se puede cambiar desde la web: haz otro cambio con un buen mensaje."]}
/>

<Decision
  pregunta="Terminaste de corregir los costos de tres comunas en el archivo de despachos. ¿Qué mensaje de commit escribes?"
  opciones={[
    { texto: "Corrige el costo de Maipú, Ñuñoa y Puente Alto", correcta: true, porque: "Dice qué cambió y dónde: dentro de un mes vas a entender ese commit sin abrir el archivo." },
    { texto: "cambios", porque: "Todos los commits son cambios: no ayuda a encontrar nada en el historial." },
    { texto: "asdfg final final ahora sí", porque: "Además de no explicar nada, se ve poco profesional en un historial que otros van a leer." },
  ]}
/>

<Debrief entrevista="Una pregunta frecuente: '¿cómo sabes qué cambió en un análisis si algo da distinto?'. Con el historial de commits: cada cambio tiene fecha, autor y un mensaje que explica qué se hizo.">
Un commit es una foto del proyecto con una explicación. Commits pequeños y con buenos mensajes hacen que el historial cuente la historia del trabajo, y que un error se pueda encontrar y deshacer.
</Debrief>
~~~~

`content/casos/herramientas-del-oficio/misiones/04-ordena-tu-proyecto.mdx`:
~~~~mdx
---
titulo: Ordena tu proyecto
tiempo: 20
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Tu repositorio va bien, pero imagina cuando tenga diez archivos: datos, consultas, gráficos y conclusiones mezclados. En los proyectos de datos se separa lo que entra de lo que sale. Arma dos carpetas, datos y resultados, mueve los despachos a datos y crea un resumen en resultados. Y revisa los nombres: nada de espacios ni tildes.
</Brief>

<Concepto>
Una estructura simple que se usa en casi todos los proyectos de datos:

```
mi-primer-repositorio/
├── README.md          qué es el proyecto
├── datos/             los archivos de entrada, sin modificar
└── resultados/        lo que produjiste: resúmenes, gráficos, conclusiones
```

En la web de GitHub las carpetas se crean con el nombre del archivo:
- **Mover un archivo a una carpeta:** abre `despachos.csv`, presiona el lápiz y, en el nombre, escribe `datos/` antes de `despachos.csv`. Al escribir la `/`, GitHub crea la carpeta.
- **Crear un archivo en otra carpeta:** **Add file** → **Create new file** y nómbralo `resultados/resumen.md`.

**Nombres de archivo:** en minúsculas, sin espacios ni tildes, con guiones: `despachos-marzo.csv`. Los espacios y las tildes fallan en muchas herramientas y en los enlaces.
</Concepto>

<GithubTask
  id="proyecto-ordenado"
  enunciado="En mi-primer-repositorio, crea las carpetas datos y resultados, deja tu .csv dentro de datos y revisa que ningún nombre tenga espacios ni tildes."
  repositorio="{usuario}/mi-primer-repositorio"
  requisitos={["carpeta:datos", "carpeta:resultados", "extension:.csv", "nombres-limpios"]}
  pistas={["Una carpeta vacía no existe en GitHub: necesita al menos un archivo adentro.", "Para mover despachos.csv, edítalo y escribe datos/ al inicio del nombre.", "Si un archivo tiene un espacio o una tilde, cámbiale el nombre de la misma forma: con el lápiz."]}
/>

<Decision
  pregunta="Tienes que guardar la versión final del análisis de marzo. ¿Qué nombre le pones al archivo?"
  opciones={[
    { texto: "analisis-despachos-2025-03.csv", correcta: true, porque: "Dice qué es y de cuándo, y la fecha en formato año-mes ordena los archivos solos." },
    { texto: "Análisis FINAL (2) ÚLTIMO.csv", porque: "Espacios, tildes y paréntesis complican los enlaces, y «final» deja de ser cierto a la semana." },
    { texto: "datos.csv", porque: "No dice qué datos ni de cuándo: con dos archivos así ya no sabes cuál es cuál." },
  ]}
/>

<Debrief entrevista="Te pueden pedir que expliques cómo organizas un proyecto. Contar que separas los datos de entrada de los resultados, y que nunca modificas los datos originales, muestra que trabajas de forma ordenada y repetible.">
Separar datos y resultados permite que otra persona entienda el proyecto de un vistazo y que puedas repetir el análisis desde cero. Los nombres sin espacios ni tildes evitan errores al compartir y enlazar archivos.
</Debrief>
~~~~

`content/casos/herramientas-del-oficio/misiones/05-el-readme-de-tu-proyecto.mdx`:
~~~~mdx
---
titulo: El README de tu proyecto
tiempo: 20
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Ya practicaste Markdown y ordenaste el repositorio. Ahora junta las dos cosas: escribe en tu README real qué hay en el proyecto, con un título, secciones para los datos y los resultados, una lista de archivos y un enlace al archivo de datos. Es el mismo ejercicio de antes, pero esta vez queda publicado.
</Brief>

<Concepto>
Para editar el README en GitHub, ábrelo y presiona el lápiz (**Edit this file**). La pestaña **Preview** muestra cómo se verá antes de guardar.

Los enlaces pueden apuntar a archivos del mismo repositorio con su ruta, sin la dirección completa:

```
Los datos están en [despachos.csv](datos/despachos.csv).
```

Así el enlace sigue funcionando aunque cambies el nombre del repositorio. Al guardar, escribe un mensaje de commit propio, como en la misión de archivos y commits.
</Concepto>

<GithubTask
  id="readme-del-proyecto"
  enunciado="Escribe el README de mi-primer-repositorio: un título, al menos dos subtítulos, una lista y un enlace al archivo de datos. Guárdalo con un mensaje propio."
  repositorio="{usuario}/mi-primer-repositorio"
  requisitos={["readme:titulo", "readme:subtitulos:2", "readme:lista", "readme:enlace", "commits:4"]}
  pistas={["Revisa la pestaña Preview antes de guardar: si un título no se ve grande, falta el espacio después de #.", "El enlace al archivo de datos es [despachos.csv](datos/despachos.csv).", "Los cuatro commits incluyen los tres de la misión de archivos y commits: con guardar este README con tu mensaje, ya suman cuatro."]}
/>

<Decision
  pregunta="Tu README tiene un enlace escrito como https://github.com/tu-usuario/mi-primer-repositorio/blob/main/datos/despachos.csv. ¿Lo cambias?"
  opciones={[
    { texto: "Sí, por la ruta relativa datos/despachos.csv.", correcta: true, porque: "La ruta relativa sigue funcionando si cambias el nombre del repositorio o si alguien hace una copia." },
    { texto: "No, la dirección completa es más segura.", porque: "Se rompe apenas cambia el nombre del repositorio o la rama, y el enlace sigue apuntando a tu cuenta aunque otro copie el proyecto." },
  ]}
/>

<Debrief entrevista="Si te piden mostrar un proyecto, abre el README y recórrelo: pregunta, datos, resultados y próximos pasos. Es la forma más rápida de mostrar que sabes comunicar lo que hiciste.">
El README es la puerta de entrada del proyecto: lo escribe la persona que conoce el trabajo para alguien que no lo conoce. Los enlaces relativos lo mantienen funcionando aunque el repositorio cambie.
</Debrief>
~~~~

`content/casos/herramientas-del-oficio/misiones/06-tu-perfil-de-github.mdx`:
```mdx
---
titulo: Tu perfil de GitHub
tiempo: 20
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Cuando postules, mucha gente va a llegar a tu perfil de GitHub antes que a tu CV. Hoy vamos a dejarlo presentable: GitHub permite poner un README en la portada del perfil. Crea ese repositorio especial y escribe ahí quién eres, qué estás aprendiendo y cómo contactarte.
</Brief>

<Concepto>
Si creas un repositorio con **el mismo nombre que tu usuario**, su README aparece en la portada de tu perfil. GitHub lo avisa al escribir el nombre: «you found a secret!».

1. **New** → en **Repository name** escribe tu usuario exacto, por ejemplo `ana-perez-datos`.
2. Déjalo **Public**, marca **Add a README file** y créalo.
3. Edita el README: un título con tu nombre, una lista con lo que estás aprendiendo y un enlace para contactarte, como tu LinkedIn.

Otras dos cosas que mejoran el perfil y no requieren código:
- **Foto y bio:** en tu perfil, **Edit profile**. Una línea basta: «Analista de datos en formación. SQL, planillas y Python.».
- **Proyectos fijados:** en tu perfil, **Customize your pins** y elige hasta seis repositorios. Fija los entregables de esta ruta a medida que los termines.
</Concepto>

<GithubTask
  id="perfil"
  enunciado="Crea el repositorio con el nombre de tu usuario y escribe su README: un título, una lista y un enlace para contactarte."
  repositorio="{usuario}/{usuario}"
  requisitos={["publico", "readme:titulo", "readme:lista", "readme:enlace"]}
  pistas={["El nombre del repositorio tiene que ser idéntico a tu usuario, con las mismas mayúsculas y guiones.", "Un enlace se escribe [LinkedIn](https://www.linkedin.com/in/tu-perfil).", "Si el README no aparece en tu perfil, revisa que el repositorio sea Public."]}
/>

<Decision
  pregunta="Tienes cinco repositorios y puedes fijar algunos en tu perfil. ¿Cuáles eliges?"
  opciones={[
    { texto: "Los proyectos terminados y con buen README, aunque sean pocos.", correcta: true, porque: "Quien revisa tu perfil va a abrir lo fijado: dos proyectos bien explicados dicen más que cinco a medio hacer." },
    { texto: "Todos, para que se vea que tengo harto.", porque: "Los proyectos incompletos o sin README le quitan valor a los buenos." },
    { texto: "Ninguno: el perfil lo ordena GitHub solo.", porque: "GitHub muestra los más recientes, no necesariamente los mejores: tú eliges qué se ve primero." },
  ]}
/>

<Debrief entrevista="Es común que pregunten '¿qué proyecto de tu GitHub te gustaría que viéramos?'. Tener la respuesta fijada en tu perfil, con un README claro, te da ventaja desde el primer minuto.">
El perfil de GitHub funciona como un portafolio: la portada presenta a la persona y los proyectos fijados muestran su trabajo. Se mantiene igual que un CV: se actualiza cada vez que terminas algo.
</Debrief>
```

`content/casos/herramientas-del-oficio/misiones/07-tu-presentacion.mdx`:
```mdx
---
titulo: Tu presentación personal
tiempo: 40
sinGuia: true
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Te tengo una noticia: una empresa abrió una práctica de análisis de datos y quiero recomendarte. Me pidieron un enlace donde puedan conocerte. Arma un repositorio de presentación personal, con el nombre que quieras: quién eres, qué estás aprendiendo, en qué proyectos trabajas y cómo contactarte, con al menos una imagen. Que el historial muestre cómo lo fuiste construyendo y que todo esté ordenado. Cuando esté listo, pega el enlace y lo reviso.
</Brief>

<GithubTask
  id="presentacion"
  enunciado="Pega el enlace de tu repositorio de presentación personal."
  requisitos={["publico", "nombres-limpios", "commits:3", "readme:titulo", "readme:subtitulos:3", "readme:lista", "readme:enlace", "readme:imagen"]}
/>

<Decision
  pregunta="Antes de mandar el enlace, ¿qué haces?"
  opciones={[
    { texto: "Lo abro como si fuera otra persona, sin sesión iniciada, y reviso que todo se vea y que los enlaces funcionen.", correcta: true, porque: "Así ves exactamente lo que verá quien te evalúe, incluidos los enlaces rotos o una imagen que no carga." },
    { texto: "Lo mando de inmediato: si GitHub lo aceptó, está bien.", porque: "Que se haya guardado no significa que se entienda ni que los enlaces lleven a donde deben." },
  ]}
/>

<Debrief entrevista="'Cuéntame de ti' es casi siempre la primera pregunta. Tu repositorio de presentación es la versión escrita de esa respuesta: practícala en voz alta usando el README como guía.">
Este repositorio es tu entregable del caso y la primera pieza de tu portafolio. Envíalo desde la página del caso para que lo revisen con la rúbrica. Todo lo que hiciste aquí (repositorios, Markdown, commits y orden) lo vas a usar en cada caso de la ruta.
</Debrief>
```

- [ ] **Step 3: Validar el contenido**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content validate`
Expected: `[content] ok: 2 rutas, 2 casos, 10 misiones`.

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && cd apps/web && pnpm exec tsc --noEmit -p . && pnpm build"`
Expected:
- PASS en todos los paquetes, incluido `route.test.ts` de la Task 3;
- el build termina con `/casos/[caso]/[mision]` estática.

- [ ] **Step 4: Commit**

```bash
git add content
git commit -m "feat(contenido): caso 0 herramientas del oficio y caso demo en su propia ruta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: e2e y README

**Files:**
- Create: `e2e/tests/herramientas.spec.ts`
- Modify: `e2e/tests/comunidad.spec.ts`, `e2e/calentar.ts`, `README.md`

**Interfaces:**
- Consumes:
  - las misiones e ids de la Task 5 y los componentes de la Task 4;
  - el modo `ENTREGABLES_VERIFICACION=prueba`: `revisorPrueba` da por inexistente al usuario `no-existe` y por vacío a un repositorio con `vacio` en el nombre.
- Produces: `e2e/tests/herramientas.spec.ts`, con 2 pruebas.

- [ ] **Step 1: Escribir las pruebas**

`e2e/tests/herramientas.spec.ts`:
```ts
import { expect, test, type Page } from "./fixtures";

const CASO = "/casos/herramientas-del-oficio";
const MISIONES: [string, string][] = [
  ["01-tu-primer-repositorio", "primer-repositorio"],
  ["02-escribe-un-readme", "readme-de-proyecto"],
  ["03-archivos-y-commits", "commits-propios"],
  ["04-ordena-tu-proyecto", "proyecto-ordenado"],
  ["05-el-readme-de-tu-proyecto", "readme-del-proyecto"],
  ["06-tu-perfil-de-github", "perfil"],
  ["07-tu-presentacion", "presentacion"],
];
const README = "# Análisis de despachos\n\n## Datos\n\n- despachos.csv\n\n## Resultados\n\n| Comuna | Atrasos |\n| --- | --- |\n| Maipú | 12 |\n\nVer [resultados](resultados/resumen.md).";

async function registrarse(page: Page) {
  await page.goto("/registro?callbackUrl=%2Fdashboard");
  await page.locator('input[name="name"]').fill("Tomás Herrera");
  await page.locator('input[name="email"]').fill(`herramientas-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`);
  await page.locator('input[name="password"]').fill("clave-segura-123");
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// En e2e, ENTREGABLES_VERIFICACION=prueba: el usuario no-existe simula una cuenta inexistente.
test("sin sesión: revisa el primer repositorio en GitHub y escribe un README con vista previa", async ({ page }) => {
  await page.goto(`${CASO}/${MISIONES[0][0]}`);
  const usuario = page.getByLabel("Tu usuario de GitHub");
  await usuario.fill("no-existe");
  await expect(page.getByText("Revisaremos github.com/no-existe/mi-primer-repositorio")).toBeVisible();
  await page.getByRole("button", { name: "Revisar en GitHub" }).click();
  await expect(page.getByText("No encontramos github.com/no-existe/mi-primer-repositorio.", { exact: false })).toBeVisible();
  await usuario.fill("ana-prueba");
  await page.getByRole("button", { name: "Revisar en GitHub" }).click();
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  await page.goto(`${CASO}/${MISIONES[1][0]}`);
  const editor = page.getByLabel("Tu README");
  await editor.fill("#Análisis de despachos");
  await page.getByRole("button", { name: "Validar" }).click();
  await expect(page.getByText("Después de los # va un espacio", { exact: false })).toBeVisible();
  await editor.fill(README);
  const vista = page.getByRole("region", { name: "Vista previa" });
  await expect(vista.getByRole("heading", { name: "Análisis de despachos" })).toBeVisible();
  await expect(vista.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Validar" }).click();
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  // El usuario de GitHub se recuerda entre misiones.
  await page.goto(`${CASO}/${MISIONES[2][0]}`);
  await expect(page.getByLabel("Tu usuario de GitHub")).toHaveValue("ana-prueba");
});

test("al enviar el entregable se informa el plazo de revisión", async ({ page, ip }) => {
  await registrarse(page);
  for (const [mision, tarea] of MISIONES) {
    const respuesta = await page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
      data: { caso: "herramientas-del-oficio", mision, tarea, aprobada: true },
    });
    expect(respuesta.ok()).toBe(true);
  }
  await page.goto(CASO);
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill("https://github.com/tomas/presentacion");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Te responderemos en un plazo de 5 días hábiles", { exact: false })).toBeVisible();
});
```

Run: `docker compose up -d --force-recreate --wait web && docker compose --profile e2e run --rm e2e npx playwright test tests/herramientas.spec.ts`
Expected: `2 passed`.

- [ ] **Step 2: Ajustar las pruebas que suponían que la primera ruta empezaba con el caso demo**

Una clase nueva toma por defecto la primera ruta, `data-analyst`, y ahora esa ruta empieza con el Caso 0. En `e2e/tests/comunidad.spec.ts`, en la prueba "una clase: el docente la crea…", cambia la última línea por:
```ts
  // La clase muestra los casos de su ruta (la primera, Data Analyst), en orden: el primero es el Caso 0.
  await expect(page.locator('a[href="/casos/herramientas-del-oficio"]')).toBeVisible();
```

En `e2e/calentar.ts`, agrega a `RUTAS`, antes de `"/casos/demo-motor"`:
```ts
  "/casos/herramientas-del-oficio",
  "/casos/herramientas-del-oficio/01-tu-primer-repositorio",
  "/casos/herramientas-del-oficio/02-escribe-un-readme",
```

- [ ] **Step 3: README**

En la sección "Recorrido y ayudas" de `README.md`, en el punto **Entregables**, después de "Luego un docente de la clase, o administración, lo revisa…", agrega:
```markdown
  - Al enviarlo se informa el plazo de revisión: 5 días hábiles (`apps/web/src/lib/entregables/plazo.ts`).
```

Agrega al final de `README.md`:
```markdown
## Caso 0: Herramientas del oficio

- **Lo primero de la ruta:** es el primer caso de `data-analyst` y se hace completo desde la web de GitHub.
- **Dos tipos de tarea propios:**
  - `MarkdownTask`: se escribe Markdown con vista previa y se revisa en el navegador.
  - `GithubTask`: revisa el repositorio real de la persona por la API de GitHub (`POST /api/github/revisar`, 20 revisiones cada 10 minutos por IP).
- **Requisitos de una `GithubTask`:**
  - `publico`, `readme`, `nombres-limpios`;
  - `commits:N`: mensajes escritos por la persona, no los automáticos de GitHub;
  - `carpeta:x`, `extension:.ext`;
  - `readme:<requisito de Markdown>`, por ejemplo `readme:subtitulos:2`.
- **Configuración:**
  - En producción, define `GITHUB_TOKEN`: sin token, GitHub permite 60 consultas por hora para todo el servidor.
  - En local y en e2e, `ENTREGABLES_VERIFICACION=prueba` evita llamar a GitHub: el usuario `no-existe` simula una cuenta inexistente.
- **El caso demo** (`demo-motor`) vive en la ruta `demo`, en borrador: lo usan las pruebas y nunca se publica.
```

- [ ] **Step 4: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes.

Run: `npm run test:e2e`
Expected: `32 passed` (los 30 anteriores y los 2 del Caso 0).

En desarrollo, con 3 navegadores en paralelo, puede fallar alguna prueba de formularios que no tiene que ver con este caso. Al planear esta fase, fallaba una distinta en cada corrida, sin reinicios del servidor. Si pasa, córrela sola. La verificación que manda es la de producción.

Run: `docker compose down && npm run test:e2e:prod`
Expected: `32 passed` contra el build de producción.

Run: `for p in /casos/herramientas-del-oficio /casos/herramientas-del-oficio/02-escribe-un-readme; do curl -s -o /dev/null localhost:3000$p; curl -s -D - -o /dev/null localhost:3000$p | grep -i x-nextjs-cache; done`
Expected: `x-nextjs-cache: HIT` dos veces.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml down`

- [ ] **Step 5: Probarlo con GitHub de verdad**

Con `ENTREGABLES_VERIFICACION` sin definir y un `GITHUB_TOKEN` en `.env`, recorre las misiones 1 y 3 con una cuenta real de GitHub y comprueba dos cosas:
- un commit "Update README.md" no cuenta;
- uno "Agrega los despachos de marzo" sí.

- [ ] **Step 6: Commit**

```bash
git add e2e README.md
git commit -m "test(e2e): caso 0 con revision en github, readme con vista previa y plazo de revision

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Fase 4b: el Caso 1, Planillas, en "Despachos Rápidos".**
- Un script reproducible que genera los datos de despachos y comunas, con los defectos reales que el caso enseña a limpiar: celdas vacías, duplicados, fechas mezcladas y espacios de más.
- Mejoras de planilla que el caso necesita:
  - varias hojas, para buscar en otra tabla con `BUSCARV` y `BUSCARX`;
  - rellenar una fórmula hacia abajo;
  - resúmenes en el lugar de las tablas dinámicas.
- Nueve misiones:
  - las ocho del plan del caso;
  - la de "IA para analizar datos", donde una fórmula sugerida por un asistente trae un error que hay que detectar;
  - la misión sin guía, el resumen para la dueña.
