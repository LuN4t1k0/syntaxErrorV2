# Fase 4f: Caso 5, Proyecto final, y umbrales de ayuda del equipo. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la ruta Data Analyst con el Caso 5, "Proyecto final: tu propio análisis con datos públicos", y aplicar los umbrales de ayuda que acordó el equipo.
- **El caso:** ocho misiones en las que la persona elige datos abiertos chilenos y una pregunta propia, y termina con un proyecto completo en GitHub, la pieza principal de su portafolio.
- **Los umbrales:**
  - primera pista con 2 intentos fallidos y segunda con 3, como hoy;
  - el tutor IA con 5 en todas las misiones, que antes eran 3 (5 en las sin guía);
  - un error de código (sintaxis, un nombre mal escrito o una fórmula con error) ya no cuenta como intento.

**Architecture:**
- **Umbrales:**
  - `ResultadoTarea` suma `errorDeCodigo?: true`, que los motores de SQL, Python y planilla marcan cuando el código no se pudo ejecutar.
  - `MisionProvider` no registra esos resultados: la consola ya explica el error, y para las pistas y el tutor solo cuentan los resultados incorrectos.
  - `INTENTOS_PARA_TUTOR` pasa a 5 y desaparece la diferencia por `sinGuia`. La misión sin guía sigue sin concepto ni pistas, y el tutor mantiene en ella la instrucción de solo hacer preguntas.
- **Los datos los elige la persona**, de una lista curada de seis fuentes: datos.gob.cl, INE, SINIM, DEIS, Centro de Estudios Mineduc y SINCA.
  - Como la plataforma no puede correr un análisis sobre datos que no conoce, el trabajo propio se verifica en GitHub misión a misión con `GithubTask`: repositorio, carpetas, notebook, gráficos, commits y README.
  - Lo que no se puede verificar solo lo evalúa la rúbrica de tres dimensiones del equipo.
- **Muestra de práctica con semilla fija** (`packages/content/src/generadores/proyecto-final.ts`): matrícula escolar del Maule por comuna y dependencia, de 2020 a 2024, con números inventados.
  - Imita un archivo de portal público, con sus trampas: separador `;`, miles con punto (`14.918`), `s/i` donde falta el dato y una fila de «Total regional» al final de cada año.
  - Con ella se practica, dentro de la plataforma y con corrección automática:
    - leer el archivo (misión 2);
    - revisar el análisis de una IA contra el total de control (misión 3);
    - calcular una variación por comuna (misión 6).
  - Lo que muestra: la matrícula municipal cae en las ocho comunas, y en Cauquenes cae 26,7 %.
- **La muestra se escribe tal cual:** el generador entrega el texto del archivo y no filas, así que `generar-cli` acepta las dos formas. El autocompletado de Python lee también encabezados separados por `;`.

**Tech Stack:** Pyodide 0.28.3 con pandas, alasql 4.19.1, HyperFormula 3.4.0, Vitest 4 y Playwright 1.55. Fuera de la plataforma: Google Colab (o Jupyter) y GitHub.

**Spec:** `docs/propuesta-pedagogica-data-analyst.md`, actualizada con las decisiones del equipo del 2026-10-02:
- 5: misión sin guía;
- 6: ayuda (umbrales 2, 3 y 5, y los errores de código que no cuentan);
- 8: Caso 5, con las seis fuentes;
- 9: rúbrica de tres dimensiones;
- 15: decisiones del equipo.

**Fuera de esta fase:**
- **El puntaje de 1 a 3 por dimensión:** queda para la Fase 4g, porque falta que el equipo defina con qué puntaje se aprueba. Mientras tanto, la rúbrica del Caso 5 usa las tres dimensiones como criterios que se marcan.
- **La revisión entre pares** (desde 50 estudiantes activos en un caso).
- **La reutilización de los datasets de la v1:** va con la migración de la v1, en la Fase 5.

## Global Constraints

**El contenido se copia literal**
- Cada archivo `.mdx` y `.yaml` de este plan se copia exactamente como está: sin resumir Briefs, Conceptos, Decisiones ni Debriefs, sin quitar pistas y sin cambiar valores.
- Lo mismo vale para el código: se copian también sus **comentarios**, que explican por qué se hace cada cosa.
- El contenido se verificó contra los datos al planear. Antes del commit de cada task, cada archivo completo se compara con `diff` contra el plan.

**Entorno y texto**
- Todo se ejecuta con `docker compose run --rm tools ...`.
- `npm run test:e2e` corre contra el build de producción.
- El texto visible va en español de Chile, tratando de tú, sin voseo y con lenguaje neutro.
- El paquete de la app se llama `web` (no `@syntaxerror/web`): se filtra con `pnpm --filter web`.

**Umbrales**
- Los valores salen de la decisión del equipo y no se ajustan: pistas en 2 y 3 intentos fallidos, y tutor en 5.
- Solo `errorDeCodigo` evita que un resultado cuente. Un resultado incorrecto siempre cuenta como intento, aunque el diagnóstico agregue un aviso.

**Datos públicos**
- La muestra se presenta siempre como "con el formato de un portal público" y con números inventados: nunca como datos del Mineduc.
- El contenido nombra las fuentes sin inventar direcciones web, cifras ni licencias. La persona busca cada fuente por su nombre y revisa la licencia en la página del conjunto de datos.
- Ningún ejemplo sube a GitHub datos que identifiquen a personas.

**Páginas:** `/casos/proyecto-final`, sus misiones y `/casos/proyecto-final/datos/matricula_comunal.csv` son estáticas, con `x-nextjs-cache: HIT`.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Un error de sintaxis justo después de un resultado incorrecto** (por ejemplo, `SELEC` y luego una consulta que trae filas de más). Solo el segundo suma: el panel dice "Llevas 0" tras el error y "Llevas 1" tras el resultado. Probado en el test e2e de recorrido, en Task 1.
2. **La persona aprieta Validar 4 veces con resultados incorrectos.** Sigue sin tutor, porque se habilita en 5, igual en el navegador y en el servidor. Las pruebas de `estadoTutor` y de `/api/tutor` siembran 4 y 5 fallidos, en Task 1.
3. **Leer la muestra a medias:** solo `sep`, sin `thousands` o sin `na_values`. Cada caso da un diagnóstico distinto que dice qué falta, sin entregar el código:
   - "no tiene las cinco columnas";
   - "quedó como texto";
   - "Los miles no se leyeron bien".

   Comprobado con Pyodide al planear; el e2e de la Task 4 recorre dos de ellos.
4. **Sumar la fila de total con el detalle, o leer los miles como decimales,** en el código del asistente de IA. El total no calza con «Total regional» y el diagnóstico lo dice. El código original da 1265,5 y "creció 1,3 %"; con solo los miles corregidos da el doble, 297.466. Cubierto por las pruebas de la tarea, que corre el validador.
5. **Alguien edita a mano la muestra o cambia la semilla.** Fallan las pruebas "el CSV del repositorio es el generado" y "muestra lo que el análisis tiene que encontrar" (Task 2), y las soluciones de las tareas de Python dejan de pasar en `validate` (Task 3).

## Estructura de archivos

```
packages/engines/src/tipos.ts, sql.ts, python.ts, sheet.ts (+ tests)   errorDeCodigo; encabezados con ;
apps/web/src/lib/progreso/ayudas.ts (+ test)                            umbrales del equipo
apps/web/src/lib/tutor/acceso.ts (+ test)                               tutor en 5, sin sinGuia
apps/web/src/app/api/tutor/preguntas/route.ts, api/tutor/route.test.ts
apps/web/src/components/mision/                                         provider, panel, tutor y tareas
apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx
packages/content/src/generadores/proyecto-final.ts (+ test)             muestra con formato de portal
packages/content/src/generar-cli.ts                                     acepta texto de archivo
content/casos/proyecto-final/                                           caso.yaml, datos/ (generado) y 8 misiones
content/rutas/data-analyst.yaml                                         agrega proyecto-final
e2e/tests/recorrido.spec.ts, tutor.spec.ts, progreso.ts, proyecto-final.spec.ts, e2e/calentar.ts
README.md
```

---

### Task 1: Umbrales del equipo; los errores de código no cuentan

**Files:**
- Modify: `packages/engines/src/tipos.ts`, `sql.ts`, `python.ts`, `sheet.ts`
- Test: `packages/engines/src/sql.test.ts`, `python.test.ts`, `sheet.test.ts`
- Modify: `apps/web/src/lib/progreso/ayudas.ts`, `apps/web/src/lib/tutor/acceso.ts`
- Test: `apps/web/src/lib/progreso/ayudas.test.ts`, `apps/web/src/lib/tutor/acceso.test.ts`, `apps/web/src/app/api/tutor/route.test.ts`
- Modify: `apps/web/src/app/api/tutor/preguntas/route.ts`, `apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx`
- Modify: `apps/web/src/components/mision/mision-provider.tsx`, `panel-tarea.tsx`, `tutor.tsx`, `sql-task.tsx`, `python-task.tsx`, `sheet-task.tsx`, `markdown-task.tsx`, `github-task.tsx`
- Test: `e2e/tests/recorrido.spec.ts`, `e2e/tests/tutor.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Produces:
  - `ResultadoTarea = { aprobada: boolean; diagnostico: string | null; errorDeCodigo?: true }` en `@syntaxerror/engines/tipos`;
  - `INTENTOS_PARA_PISTA = 2`, `INTENTOS_PARA_TUTOR = 5`, `pistasDisponibles(fallidos, total)` y `tutorHabilitado({ fallidos, aprobada })` en `@/lib/progreso/ayudas`, que ya no exporta `umbralTutor`;
  - `estadoTutor(db, userId, casoSlug, misionSlug: string)`;
  - `registrarResultado(id, resultado: Pick<ResultadoTarea, "aprobada" | "errorDeCodigo">)` en el contexto de la misión;
  - `<Tutor caso mision />`, sin `sinGuia`.

- [ ] **Step 1: Las pruebas de los motores**

En `packages/engines/src/sql.test.ts`:

1. En "explica el error de la consulta en español", agrega `errorDeCodigo: true` al objeto esperado:
```ts
    expect(resultado).toEqual({
      aprobada: false,
      diagnostico: "Tu consulta tiene un error. Línea 1: «SELEC» no es una palabra de SQL. ¿Quisiste decir SELECT?",
      errorDeCodigo: true,
    });
```
2. En la prueba que espera "Tu consulta trae 4 filas, se esperan 2.", cambia `toEqual` por `toStrictEqual`, para que un resultado incorrecto no traiga `errorDeCodigo`:
```ts
    expect(resultado).toStrictEqual({ aprobada: false, diagnostico: "Tu consulta trae 4 filas, se esperan 2." });
```

En `packages/engines/src/python.test.ts`:

1. En "da un mensaje genérico si el assert no tiene mensaje", después del `expect` del diagnóstico, agrega:
```ts
    expect(resultado.errorDeCodigo).toBeUndefined();
```
2. En "informa el error de sintaxis del alumno, explicado", después del `expect` del diagnóstico, agrega:
```ts
    expect(resultado.errorDeCodigo).toBe(true);
```

En `packages/engines/src/sheet.test.ts`:

1. En "muestra el valor obtenido y el esperado", reemplaza el `expect` por:
```ts
    expect(revisarHoja(hoja, total)).toStrictEqual({ aprobada: false, diagnostico: 'La celda C2 muestra "247000" y se espera "487000".' });
```
2. En "informa los errores de fórmula", reemplaza el `expect` por:
```ts
    expect(revisarHoja(hoja, total)).toEqual({
      aprobada: false,
      diagnostico: "La celda C2 tiene el error #¡DIV/0!. La fórmula divide por cero o por una celda vacía. Revisa la celda del divisor. Si puede valer 0, usa SI.ERROR(fórmula; 0).",
      errorDeCodigo: true,
    });
```

- [ ] **Step 2: Las pruebas de la app**

`apps/web/src/lib/progreso/ayudas.test.ts` completo:
```ts
import { describe, expect, it } from "vitest";
import { INTENTOS_PARA_TUTOR, pistasDisponibles, tutorHabilitado } from "./ayudas";

describe("ayudas", () => {
  it("la primera pista llega tras 2 intentos fallidos y luego una por intento, sin pasarse del total", () => {
    expect([0, 1, 2, 3, 4, 9].map((fallidos) => pistasDisponibles(fallidos, 3))).toEqual([0, 0, 1, 2, 3, 3]);
    expect(pistasDisponibles(5, 0)).toBe(0);
  });

  it("el tutor se habilita a los 5 intentos fallidos o con la misión aprobada", () => {
    expect(INTENTOS_PARA_TUTOR).toBe(5);
    expect(tutorHabilitado({ fallidos: 4, aprobada: false })).toBe(false);
    expect(tutorHabilitado({ fallidos: 5, aprobada: false })).toBe(true);
    expect(tutorHabilitado({ fallidos: 0, aprobada: true })).toBe(true);
  });
});
```

`apps/web/src/lib/tutor/acceso.test.ts` completo:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casos, misionProgreso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { estadoTutor } from "./acceso";

const { db, close } = createTestDb();
beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("estadoTutor", () => {
  it("se habilita con los intentos fallidos suficientes o con la misión aprobada", async () => {
    const [ana] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
    const [caso] = await db.insert(casos).values({ slug: "ventas", titulo: "V", cargo: "A", empresa: "E", entregable: "R", misiones: [] }).returning({ id: casos.id });
    expect(await estadoTutor(db, ana.id, "ventas", "m1")).toEqual({ habilitado: false, fallidos: 0, umbral: 5 });
    await db.insert(misionProgreso).values({ userId: ana.id, casoId: caso.id, mision: "m1", fallidos: 4 });
    expect(await estadoTutor(db, ana.id, "ventas", "m1")).toEqual({ habilitado: false, fallidos: 4, umbral: 5 });
    await db.insert(misionProgreso).values({ userId: ana.id, casoId: caso.id, mision: "m3", fallidos: 5 });
    expect(await estadoTutor(db, ana.id, "ventas", "m3")).toEqual({ habilitado: true, fallidos: 5, umbral: 5 });
    await db.insert(misionProgreso).values({ userId: ana.id, casoId: caso.id, mision: "m2", estado: "aprobada" });
    expect((await estadoTutor(db, ana.id, "ventas", "m2")).habilitado).toBe(true);
    expect((await estadoTutor(db, ana.id, "otro", "m1")).habilitado).toBe(false);
  });
});
```

En `apps/web/src/app/api/tutor/route.test.ts`:
- en `iniciarSesion`, el progreso sembrado pasa de `fallidos: 3` a `fallidos: 5`;
- en "preguntas: sin los intentos suficientes responde 403 sin llamar a la IA", el cuerpo esperado pasa a `{ error: "tutor_bloqueado", fallidos: 0, umbral: 5 }`.

- [ ] **Step 3: Correr y ver que fallan**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines exec vitest run src/sql.test.ts src/python.test.ts src/sheet.test.ts; pnpm --filter web exec vitest run src/lib/progreso/ayudas.test.ts src/lib/tutor src/app/api/tutor"`
Expected: FAIL.
- En los motores, falta `errorDeCodigo`.
- En la app:
  - `INTENTOS_PARA_TUTOR` es 3;
  - `estadoTutor` recibe un objeto;
  - `/api/tutor` responde `umbral: 3`.

- [ ] **Step 4: Implementar los motores**

`packages/engines/src/tipos.ts` completo:
```ts
export type Fila = Record<string, unknown>;

// errorDeCodigo: el código no se pudo ejecutar (sintaxis, un nombre mal escrito, una fórmula con error). La consola lo
// explica al instante y no cuenta como intento fallido: para las pistas y el tutor solo cuentan los resultados incorrectos.
export type ResultadoTarea = { aprobada: boolean; diagnostico: string | null; errorDeCodigo?: true };
```

En los tres motores, el resultado del código que no se pudo ejecutar agrega `errorDeCodigo: true`:

`packages/engines/src/sql.ts`, en `compararSql`:
```ts
  } catch (error) {
    return { aprobada: false, diagnostico: `Tu consulta tiene un error. ${textoDeError(explicarErrorSql(consulta, mensajeDe(error), tablas))}`, errorDeCodigo: true };
  }
```

`packages/engines/src/python.ts`, en `revisar`:
```ts
      if (!resultado.ok) {
        return { aprobada: false, diagnostico: `Tu código tiene un error. ${textoDeError(resultado.error)}`, salida: resultado.salida, errorDeCodigo: true };
      }
```

`packages/engines/src/sheet.ts`, en `revisarHoja`:
```ts
    if (error) {
      return { aprobada: false, diagnostico: `La celda ${esperada.celda} tiene el error ${error.original}. ${textoDeError(error)}`, errorDeCodigo: true };
    }
```

- [ ] **Step 5: Implementar la app**

`apps/web/src/lib/progreso/ayudas.ts` completo:
```ts
// Umbrales de la ayuda escalonada (propuesta pedagógica, sección 6), acordados por el equipo el 2026-10-02.
// Un intento fallido es un resultado incorrecto: un error de código (que no corre) se explica al instante y no cuenta.
export const INTENTOS_PARA_PISTA = 2;
export const INTENTOS_PARA_TUTOR = 5;

// La primera pista llega tras INTENTOS_PARA_PISTA fallidos; después, una más por cada intento fallido.
export function pistasDisponibles(fallidos: number, total: number): number {
  if (fallidos < INTENTOS_PARA_PISTA) return 0;
  return Math.min(total, fallidos - INTENTOS_PARA_PISTA + 1);
}

export function tutorHabilitado({ fallidos, aprobada }: { fallidos: number; aprobada: boolean }): boolean {
  return aprobada || fallidos >= INTENTOS_PARA_TUTOR;
}
```

`apps/web/src/lib/tutor/acceso.ts` completo:
```ts
import { and, eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { casos, misionProgreso } from "@syntaxerror/db/schema";
import { INTENTOS_PARA_TUTOR, tutorHabilitado } from "@/lib/progreso/ayudas";

export type EstadoTutor = { habilitado: boolean; fallidos: number; umbral: number };

export async function estadoTutor(db: DbClient, userId: string, casoSlug: string, misionSlug: string): Promise<EstadoTutor> {
  const [fila] = await db
    .select({ estado: misionProgreso.estado, fallidos: misionProgreso.fallidos })
    .from(misionProgreso)
    .innerJoin(casos, eq(casos.id, misionProgreso.casoId))
    .where(and(eq(misionProgreso.userId, userId), eq(casos.slug, casoSlug), eq(misionProgreso.mision, misionSlug)));
  const fallidos = fila?.fallidos ?? 0;
  return {
    habilitado: tutorHabilitado({ fallidos, aprobada: fila?.estado === "aprobada" }),
    fallidos,
    umbral: INTENTOS_PARA_TUTOR,
  };
}
```

En `apps/web/src/app/api/tutor/preguntas/route.ts`, la llamada queda:
```ts
  const acceso = await estadoTutor(getDb(), userId, caso.slug, mision.slug);
```

En `apps/web/src/components/mision/mision-provider.tsx`:

1. Agrega el import, después del de `OpcionesPython`:
```tsx
import type { ResultadoTarea } from "@syntaxerror/engines/tipos";
```
2. En el tipo `ContextoMision`:
```tsx
  registrarResultado: (id: string, resultado: Pick<ResultadoTarea, "aprobada" | "errorDeCodigo">) => void;
```
3. `registrarResultado` queda así:
```tsx
  const registrarResultado = useCallback(
    (id: string, { aprobada, errorDeCodigo }: Pick<ResultadoTarea, "aprobada" | "errorDeCodigo">) => {
      // Un error de código ya se explica en la consola: no es un intento fallido y no se registra.
      if (errorDeCodigo) return;
      if (aprobada) {
        setAprobadas((actuales) => new Set(actuales).add(id));
      } else {
        setFallidosSesion((cantidad) => cantidad + 1);
        const total = sumarFallido(dependenciasNavegador().almacen, caso, mision, id);
        setFallidosPorTarea((actuales) => ({ ...actuales, [id]: total }));
      }
      void reportarTarea({ caso, mision, tarea: id, aprobada }, dependenciasNavegador());
    },
    [caso, mision]
  );
```

En las tareas, cada una entrega su resultado completo:
- `sql-task.tsx`, `python-task.tsx`, `sheet-task.tsx` y `markdown-task.tsx`: `registrarResultado(id, revision.aprobada)` pasa a `registrarResultado(id, revision)`.
- `github-task.tsx`: `registrarResultado(id, true)` pasa a `registrarResultado(id, { aprobada: true })`, y `registrarResultado(id, false)` a `registrarResultado(id, { aprobada: false })`.

En `apps/web/src/components/mision/panel-tarea.tsx`, el aviso antes de la primera pista queda:
```tsx
        <p className="text-sm text-muted-foreground">{`Primero intenta: las pistas aparecen después de ${INTENTOS_PARA_PISTA} intentos con un resultado incorrecto (los errores de código no cuentan). Llevas ${fallidos}.`}</p>
```

En `apps/web/src/components/mision/tutor.tsx`:
1. El import queda `import { INTENTOS_PARA_TUTOR, tutorHabilitado } from "@/lib/progreso/ayudas";`.
2. La firma queda `export function Tutor({ caso, mision }: { caso: string; mision: string }) {`.
3. `const habilitado = !contexto || tutorHabilitado({ fallidos, aprobada: contexto.completa });`
4. El aviso queda:
```tsx
          {`Primero intenta resolver la tarea. El tutor se habilita con ${INTENTOS_PARA_TUTOR} intentos fallidos en esta misión; llevas ${fallidos}.`}
```

En `apps/web/src/app/(misiones)/casos/[caso]/[mision]/page.tsx`, el tutor queda `<Tutor caso={caso.slug} mision={mision.slug} />`. La variable `sinGuia` se sigue usando en el resto de la página.

- [ ] **Step 6: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/engines test && pnpm --filter web test && pnpm --filter @syntaxerror/engines exec tsc --noEmit && pnpm --filter web exec tsc --noEmit"`
Expected: PASS, con 124 pruebas en engines y 325 en web, y sin errores de tipos.

- [ ] **Step 7: e2e y README**

En `e2e/tests/recorrido.spec.ts`, la prueba de las pistas queda:
```ts
test("las pistas aparecen después de dos resultados incorrectos; un error de código no cuenta", async ({ page }) => {
  await page.goto(MISION_SQL);
  await expect(page.getByRole("button", { name: "Ver pista" })).toHaveCount(0);
  await page.getByLabel("Consulta SQL").fill("SELEC nombre FROM clientes");
  await page.getByRole("button", { name: "Validar" }).click();
  await expect(page.getByText("«SELEC» no es una palabra de SQL.", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("los errores de código no cuentan). Llevas 0.", { exact: false })).toBeVisible();
  await page.getByLabel("Consulta SQL").fill("SELECT nombre FROM clientes");
  await validarYEsperar(page);
  await expect(page.getByText("Llevas 1.", { exact: false })).toBeVisible();
  await validarYEsperar(page);
  await page.getByRole("button", { name: "Ver pista" }).click();
  await expect(page.getByText("Parte con SELECT nombre, ciudad FROM clientes.")).toBeVisible();
});
```

En `e2e/tests/tutor.spec.ts`, el ciclo de intentos pasa de `intento < 3` a `intento < 5`.

En `README.md`, en "Primero intentar", la línea del tutor se reemplaza por estas dos:
```markdown
  - El tutor IA se habilita tras 5 intentos fallidos en la misión.
  - Un intento fallido es un resultado incorrecto. Un error de código (`errorDeCodigo` en `ResultadoTarea`) se explica al instante y no cuenta.
```

Run: `npm run test:e2e -- tests/recorrido.spec.ts tests/tutor.spec.ts`
Expected: `5 passed`.

- [ ] **Step 8: Commit**

```bash
git add packages/engines apps/web e2e/tests/recorrido.spec.ts e2e/tests/tutor.spec.ts README.md
git commit -m "feat(ayudas): umbrales del equipo; los errores de codigo no cuentan como intento

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: La muestra con formato de portal público

**Files:**
- Create: `packages/content/src/generadores/proyecto-final.ts`
- Test: `packages/content/src/generadores/proyecto-final.test.ts`
- Modify: `packages/content/src/generar-cli.ts`
- Create (generado): `content/casos/proyecto-final/datos/matricula_comunal.csv`
- Modify: `packages/engines/src/python.ts` (`columnasDeArchivos`)
- Test: `packages/engines/src/python.test.ts`

**Interfaces:**
- Consumes: `crearAleatorio` (Fase 4b) y `papaparse`, que ya es dependencia de `@syntaxerror/content`.
- Produces en `generadores/proyecto-final`:
  - las constantes:
    - `SEMILLA_PROYECTO_FINAL` y `AGNOS` (2020 a 2024);
    - `AGNO_SIN_INFORMACION = 2022` y `FILAS_SIN_INFORMACION = 3`;
    - `FILA_TOTAL = "Total regional"` y `COMUNA_CON_MAYOR_CAIDA = "Cauquenes"`;
  - `filasMatricula(): FilaMatricula[]`, con los valores reales y `sinInformacion`;
  - `conMiles(numero)`;
  - `generarProyectoFinal(): { matricula_comunal: string }`, el texto del archivo.
- Produces la tabla `matricula_comunal`, con las columnas `agno;region;comuna;dependencia;matricula`: 125 filas, de las que 120 son de detalle y 5 son totales.

- [ ] **Step 1: Escribir las pruebas**

`packages/content/src/generadores/proyecto-final.test.ts`:
```ts
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AGNO_SIN_INFORMACION, COMUNA_CON_MAYOR_CAIDA, conMiles, FILA_TOTAL, FILAS_SIN_INFORMACION, filasMatricula, generarProyectoFinal } from "./proyecto-final";

const DATOS = fileURLToPath(new URL("../../../../content/casos/proyecto-final/datos/", import.meta.url));

describe("generarProyectoFinal", () => {
  const filas = filasMatricula();
  const detalle = filas.filter((fila) => fila.comuna !== FILA_TOTAL);
  const totales = filas.filter((fila) => fila.comuna === FILA_TOTAL);

  it("genera siempre lo mismo", () => {
    expect(generarProyectoFinal()).toEqual(generarProyectoFinal());
  });

  it("el CSV del repositorio es el generado: no se edita a mano", async () => {
    expect(await readFile(`${DATOS}matricula_comunal.csv`, "utf8")).toBe(generarProyectoFinal().matricula_comunal);
  });

  it("tiene el formato de un portal público: punto y coma, miles con punto y «s/i»", () => {
    const lineas = generarProyectoFinal().matricula_comunal.trim().split("\n");
    expect(lineas[0]).toBe("agno;region;comuna;dependencia;matricula");
    expect(lineas).toHaveLength(126);
    expect(lineas.filter((linea) => linea.endsWith(";s/i"))).toHaveLength(FILAS_SIN_INFORMACION);
    expect(lineas.filter((linea) => linea.includes(`;${FILA_TOTAL};`))).toHaveLength(5);
    expect(conMiles(151372)).toBe("151.372");
    expect(conMiles(180)).toBe("180");
  });

  it("cada total regional suma su detalle, y los «s/i» solo están en un año", () => {
    for (const total of totales) {
      const delAgno = detalle.filter((fila) => fila.agno === total.agno);
      expect(delAgno).toHaveLength(24);
      expect(delAgno.reduce((suma, fila) => suma + fila.matricula, 0)).toBe(total.matricula);
    }
    expect(new Set(detalle.filter((fila) => fila.sinInformacion).map((fila) => fila.agno))).toEqual(new Set([AGNO_SIN_INFORMACION]));
    expect(detalle.filter((fila) => fila.sinInformacion && fila.dependencia === "Municipal")).toHaveLength(0);
  });

  it("muestra lo que el análisis tiene que encontrar: la matrícula municipal cae en todas las comunas, y más en Cauquenes", () => {
    const municipal = (comuna: string, agno: number) => detalle.find((fila) => fila.comuna === comuna && fila.agno === agno && fila.dependencia === "Municipal")!.matricula;
    const comunas = [...new Set(detalle.map((fila) => fila.comuna))];
    const caida = (comuna: string) => (municipal(comuna, 2024) - municipal(comuna, 2020)) / municipal(comuna, 2020);
    for (const comuna of comunas) expect(caida(comuna)).toBeLessThan(0);
    for (const comuna of comunas.filter((otra) => otra !== COMUNA_CON_MAYOR_CAIDA)) expect(caida(COMUNA_CON_MAYOR_CAIDA)).toBeLessThan(caida(comuna) * 2);
  });
});
```

En `packages/engines/src/python.test.ts`, al comienzo de `describe("columnasDeArchivos", ...)`, agrega:
```ts
  it("lee los encabezados separados por punto y coma", () => {
    expect(columnasDeArchivos([{ ruta: "datos/matricula.csv", contenido: "agno;comuna;matricula\n2024;Talca;14.918\n" }])).toEqual(["agno", "comuna", "matricula"]);
  });
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content exec vitest run src/generadores/proyecto-final.test.ts; pnpm --filter @syntaxerror/engines exec vitest run src/python.test.ts"`
Expected: FAIL.
- En content: "Failed to resolve import ./proyecto-final".
- En engines: los encabezados llegan como `["agno;comuna;matricula"]`.

- [ ] **Step 3: Implementar**

`packages/content/src/generadores/proyecto-final.ts`:
```ts
import Papa from "papaparse";
import { crearAleatorio } from "./aleatorio";

// Muestra de práctica del Caso 5, "Proyecto final": matrícula escolar por comuna y dependencia en la Región del
// Maule, de 2020 a 2024. Los números son inventados; el formato es el que suelen tener los datos abiertos en Chile,
// con sus trampas: separador punto y coma, miles con punto, «s/i» donde falta el dato y una fila de total regional
// al final de cada año, mezclada con el detalle. Lo que muestra: la matrícula municipal baja y Cauquenes es la
// comuna donde más cae.

export type FilaMatricula = { agno: number; region: string; comuna: string; dependencia: string; matricula: number; sinInformacion: boolean };

export const SEMILLA_PROYECTO_FINAL = 20250901;
export const AGNOS = [2020, 2021, 2022, 2023, 2024] as const;
export const AGNO_SIN_INFORMACION = 2022;
export const FILAS_SIN_INFORMACION = 3;
export const FILA_TOTAL = "Total regional";
export const COMUNA_CON_MAYOR_CAIDA = "Cauquenes";

const DEPENDENCIAS = ["Municipal", "Particular subvencionado", "Particular pagado"] as const;

// Matrícula de 2020 de cada comuna, en el orden de DEPENDENCIAS.
const BASE: Record<string, readonly [number, number, number]> = {
  Talca: [14800, 27600, 3900],
  Curicó: [12100, 22400, 2600],
  Linares: [9800, 13900, 1200],
  Constitución: [5200, 4100, 300],
  Cauquenes: [4900, 2700, 150],
  Molina: [4600, 4300, 200],
  Parral: [4300, 3100, 120],
  "San Javier": [4700, 3900, 180],
};

// Cambio anual de cada dependencia: la municipal baja, la particular subvencionada sube y la pagada casi no cambia.
const CAMBIO_ANUAL = [-0.025, 0.012, 0.004] as const;
const CAMBIO_MUNICIPAL_CAUQUENES = -0.075;

export function filasMatricula(): FilaMatricula[] {
  const aleatorio = crearAleatorio(SEMILLA_PROYECTO_FINAL);
  const filas: FilaMatricula[] = [];
  for (const [indice, agno] of AGNOS.entries()) {
    const detalle: FilaMatricula[] = [];
    for (const [comuna, base] of Object.entries(BASE)) {
      for (const [posicion, dependencia] of DEPENDENCIAS.entries()) {
        const cambio = comuna === COMUNA_CON_MAYOR_CAIDA && posicion === 0 ? CAMBIO_MUNICIPAL_CAUQUENES : CAMBIO_ANUAL[posicion];
        const ruido = 1 + aleatorio.entero(-10, 10) / 1000;
        const matricula = Math.round(base[posicion] * (1 + cambio) ** indice * ruido);
        detalle.push({ agno, region: "Maule", comuna, dependencia, matricula, sinInformacion: false });
      }
    }
    // En un año, algunos establecimientos no informaron: el archivo dice «s/i», pero el total regional los incluye.
    if (agno === AGNO_SIN_INFORMACION) {
      let marcadas = 0;
      while (marcadas < FILAS_SIN_INFORMACION) {
        const fila = aleatorio.elegir(detalle);
        if (fila.sinInformacion) continue;
        fila.sinInformacion = true;
        marcadas += 1;
      }
    }
    const total = detalle.reduce((suma, fila) => suma + fila.matricula, 0);
    filas.push(...detalle, { agno, region: "Maule", comuna: FILA_TOTAL, dependencia: "Todas", matricula: total, sinInformacion: false });
  }
  return filas;
}

// 12345 → "12.345", como se escriben los miles en Chile.
export function conMiles(numero: number): string {
  return String(numero).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function generarProyectoFinal(): { matricula_comunal: string } {
  const filas = filasMatricula().map(({ sinInformacion, matricula, ...fila }) => ({ ...fila, matricula: sinInformacion ? "s/i" : conMiles(matricula) }));
  return { matricula_comunal: `${Papa.unparse(filas, { delimiter: ";", newline: "\n" })}\n` };
}
```

`packages/content/src/generar-cli.ts` completo:
```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aCsv, generarDespachosRapidos } from "./generadores/despachos-rapidos";
import { generarClinicaCordilleraCentral } from "./generadores/clinica-cordillera-central";
import { generarMinimarketsDelSur } from "./generadores/minimarkets-del-sur";
import { generarProyectoFinal } from "./generadores/proyecto-final";
import { generarTiendaOnlinePewen } from "./generadores/tienda-online-pewen";

// Escribe los datos generados de cada caso en content/casos/<caso>/datos/. Se corre después de cambiar un generador.
// Un generador entrega filas (se escriben como CSV estándar) o el texto del archivo tal cual, como el de un portal público.
const CONTENIDO = fileURLToPath(new URL("../../../content", import.meta.url));

const generadores: Record<string, () => Record<string, Record<string, string | number | null>[] | string>> = {
  "despachos-rapidos": generarDespachosRapidos,
  "minimarkets-del-sur": generarMinimarketsDelSur,
  "tienda-online-pewen": generarTiendaOnlinePewen,
  "clinica-cordillera-central": generarClinicaCordilleraCentral,
  "proyecto-final": generarProyectoFinal,
};

for (const [caso, generar] of Object.entries(generadores)) {
  for (const [tabla, datos] of Object.entries(generar())) {
    const directorio = path.join(CONTENIDO, "casos", caso, "datos");
    const archivo = path.join(directorio, `${tabla}.csv`);
    const csv = typeof datos === "string" ? datos : aCsv(datos);
    await mkdir(directorio, { recursive: true });
    await writeFile(archivo, csv);
    console.log(`[content] ${path.relative(CONTENIDO, archivo)}: ${csv.split("\n").length - 2} filas`);
  }
}
```

En `packages/engines/src/python.ts`, en `columnasDeArchivos`, la línea del `.flatMap` se reemplaza por estas dos:
```ts
    // Los archivos de portales públicos suelen separar con punto y coma.
    .flatMap((archivo) => (archivo.contenido.split(/\r?\n/, 1)[0] ?? "").split(/[,;]/))
```

- [ ] **Step 4: Generar y correr las pruebas**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content generar`
Expected: los datos de los casos 1 a 4 sin cambios, más:
```
[content] casos/proyecto-final/datos/matricula_comunal.csv: 125 filas
```

Las primeras líneas de `matricula_comunal.csv` deben ser exactamente estas:
```
agno;region;comuna;dependencia;matricula
2020;Maule;Talca;Municipal;14.918
2020;Maule;Talca;Particular subvencionado;27.407
2020;Maule;Talca;Particular pagado;3.865
```

Además, la línea 26 es `2020;Maule;Total regional;Todas;151.372`, y los `s/i` están en las líneas 60, 71 y 72 (Linares y Parral, 2022).

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content exec vitest run src/generadores && pnpm --filter @syntaxerror/engines test && pnpm --filter @syntaxerror/content exec tsc --noEmit"`
Expected: PASS, con 25 pruebas en los generadores y 125 en engines, y sin errores de tipos. `git status` no debe mostrar cambios en los datos de los otros casos.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/generadores packages/content/src/generar-cli.ts content/casos/proyecto-final/datos packages/engines/src/python.ts packages/engines/src/python.test.ts
git commit -m "feat(contenido): muestra de matricula con formato de portal publico para el proyecto final

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: El contenido del Caso 5

**Files:**
- Create: `content/casos/proyecto-final/caso.yaml` y sus 8 misiones
- Modify: `content/rutas/data-analyst.yaml`

**Interfaces:**
- Consumes:
  - la muestra de la Task 2;
  - `MarkdownTask` y `GithubTask` (Fase 4a, con la entrada por enlace);
  - `PythonTask` y `PythonEjemplo` (Fase 4d);
  - la descarga de datos (Fase 4e).
- Produces:
  - el caso `proyecto-final`, sexto y último de la ruta;
  - estos ids de tarea, por misión:
    1. `propuesta-del-proyecto`;
    2. `leer-el-archivo` y `separar-los-totales`;
    3. `corregir-el-analisis`;
    4. `repositorio-del-proyecto`;
    5. `bitacora-de-limpieza` y `notebook-de-limpieza`;
    6. `caida-municipal` y `graficos-del-proyecto`;
    7. `conclusiones-y-limitaciones`;
    8. `proyecto-publicado`.

El recorrido del caso:

| # | Misión | Tarea | Repasa |
|---|---|---|---|
| 1 | Elegir tus datos y tu pregunta | Markdown: la propuesta, con la fuente enlazada y tres preguntas chicas | Caso 4 (la ficha) |
| 2 | Leer un archivo público | Python, con la muestra: leerla con `sep`, `thousands` y `na_values`, y separar los totales | Caso 3 |
| 3 | Revisar el análisis de la IA | Python, con la muestra: corregir el código del asistente usando el total de control | Casos 1 y 3 |
| 4 | Tu repositorio y tus datos | GitHub: el repositorio propio con `datos/`, nombres limpios y la fuente enlazada | Caso 0 |
| 5 | Explorar y limpiar | Markdown: la bitácora de limpieza. GitHub: el notebook en `notebooks/`, con 3 commits propios | Caso 3 |
| 6 | Analizar y visualizar | Python, con la muestra: la caída municipal con `pivot_table`. GitHub: los gráficos en `graficos/` | Casos 3 y 4 |
| 7 | Conclusiones y limitaciones | Markdown: conclusiones numeradas y limitaciones | Caso 3 |
| 8 | Publicar tu proyecto (sin guía) | GitHub: el proyecto completo, con 5 commits y un README de 5 secciones | todo |

- [ ] **Step 1: Caso y ruta**

`content/casos/proyecto-final/caso.yaml`:
```yaml
slug: proyecto-final
titulo: "Proyecto final: tu propio análisis con datos públicos"
cargo: Analista de datos
empresa: Tu propio proyecto
dataset: Un conjunto de datos abiertos chilenos que eliges tú, de una lista de seis fuentes; para practicar, una muestra de matrícula escolar del Maule con el formato de un portal público (datos generados con un script reproducible)
entregable: Un repositorio en GitHub con tus datos y su fuente, el notebook de análisis (.ipynb), los gráficos (.png) y un README que cuente la pregunta, cómo preparaste los datos, lo que encontraste, tus conclusiones y sus limitaciones.
archivos:
  - .ipynb
  - .png
# Las tres dimensiones estándar de la rúbrica del equipo (propuesta pedagógica, sección 9).
rubrica:
  - "Claridad: el README explica la pregunta, los datos con su fuente, cómo se prepararon y lo que se encontró, de modo que lo entiende alguien que no conoce el proyecto."
  - "Ejecución técnica: el notebook lee y limpia los datos de forma correcta y repetible, cada decisión de limpieza está documentada y los cálculos responden las preguntas."
  - "Coherencia: las conclusiones se apoyan en los resultados y los gráficos, y las limitaciones dicen lo que los datos no permiten afirmar."
misiones:
  - 01-elegir-tus-datos
  - 02-leer-un-archivo-publico
  - 03-revisar-el-analisis-de-la-ia
  - 04-tu-repositorio-y-tus-datos
  - 05-explorar-y-limpiar
  - 06-analizar-y-visualizar
  - 07-conclusiones-y-limitaciones
  - 08-publicar-tu-proyecto
```

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
  - despachos-rapidos
  - minimarkets-del-sur
  - tienda-online-pewen
  - clinica-cordillera-central
  - proyecto-final
```

- [ ] **Step 2: Las misiones (copia literal)**

`content/casos/proyecto-final/misiones/01-elegir-tus-datos.mdx`:
```mdx
---
titulo: Elegir tus datos y tu pregunta
tiempo: 40
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Llegaste al proyecto final. Ya no hay empresa ni encargo: tú eliges los datos y la pregunta. Este proyecto será la pieza principal de tu portafolio, así que elige un tema que te importe y que puedas explicar en una entrevista. Antes de descargar nada, escríbeme una propuesta corta: qué quieres responder, con qué datos y por qué importa.
</Brief>

<Concepto>
Los datos salen de una de estas seis fuentes públicas chilenas. Todas publican archivos descargables y se encuentran buscando su nombre:

| Fuente | Qué publica | Una pregunta posible |
| --- | --- | --- |
| **datos.gob.cl** | El portal de datos abiertos del Estado, con conjuntos de ministerios, servicios y municipios, como patentes comerciales, permisos de circulación o catastros municipales | ¿En qué comunas crecen más las patentes comerciales? |
| **INE** (Instituto Nacional de Estadísticas) | La Encuesta Nacional de Empleo, el IPC y los índices de actividad económica | ¿Cómo cambió la desocupación de cada región desde 2019? |
| **SINIM** (SUBDERE) | Indicadores de cada municipio: presupuesto, educación, salud y fondos de desarrollo | ¿Qué comunas dependen más del Fondo Común Municipal? |
| **DEIS** (MINSAL) | Estadísticas de salud: atenciones de urgencia, listas de espera e indicadores hospitalarios | ¿En qué semanas del año se saturan las urgencias respiratorias? |
| **Centro de Estudios Mineduc** | Matrícula por establecimiento y comuna, Índice de Vulnerabilidad Escolar y resultados de la educación superior | ¿Dónde baja más la matrícula de la educación municipal? |
| **SINCA** | Las mediciones históricas de las estaciones de monitoreo de la calidad del aire | ¿En qué meses se supera más la norma de MP2,5 en tu ciudad? |

Antes de quedarte con un conjunto de datos, revísalo con cinco preguntas:

1. **¿Responde mi pregunta?** Que el tema coincida no basta: tienen que estar las columnas que necesitas.
2. **¿Qué es cada fila?** Una persona, un establecimiento o una comuna en un año. Eso define qué puedes contar.
3. **¿Qué período cubre?** Para hablar de tendencias necesitas varios años, medidos de la misma forma.
4. **¿Cuánto pesa?** GitHub acepta archivos de hasta 25 MB al subirlos desde la web. Si el tuyo pesa más, sube una parte y deja el enlace a la fuente.
5. **¿Trae datos de personas?** Si identifica a alguien (nombre, RUT o dirección), no sirve para un repositorio público: busca la versión agregada.

Una buena pregunta es **concreta** (dice qué, dónde y cuándo), **se puede responder con los datos** y **le importa a alguien** que tomaría una decisión con la respuesta.
</Concepto>

<Decision
  pregunta="¿Cuál de estas preguntas sirve mejor para tu proyecto?"
  opciones={[
    { texto: "¿En qué comunas de la Región de Valparaíso bajó más la matrícula municipal entre 2019 y 2024?", correcta: true, porque: "Dice qué, dónde y cuándo, y se responde con la matrícula por comuna y año que publica el Centro de Estudios Mineduc." },
    { texto: "¿Cómo está la educación en Chile?", porque: "Es un tema, no una pregunta: no dice qué medir, dónde ni en qué período." },
    { texto: "¿Por qué los estudiantes se cambian de colegio?", porque: "Los datos de matrícula muestran cuántos estudiantes hay en cada colegio, no por qué se cambian. Esa respuesta necesita encuestas o entrevistas." },
  ]}
/>

<MarkdownTask
  id="propuesta-del-proyecto"
  enunciado="Escribe la propuesta de tu proyecto: un título, tres secciones (por ejemplo Pregunta, Datos y Por qué importa), un enlace a la página de los datos que elegiste y una lista numerada con tres preguntas más chicas que te ayuden a responder la principal."
  inicial="Propuesta del proyecto"
  requisitos={["titulo", "subtitulos:3", "enlace", "lista-numerada"]}
  solucion={"# Matrícula municipal en la Región de Valparaíso\n\n## Pregunta\n\n¿En qué comunas de la Región de Valparaíso bajó más la matrícula municipal entre 2019 y 2024?\n\n1. ¿Cuánto cambió la matrícula municipal de la región en esos años?\n2. ¿Qué comunas perdieron más, en porcentaje?\n3. ¿Creció la matrícula particular subvencionada en esas mismas comunas?\n\n## Datos\n\nMatrícula por establecimiento del [portal de datos abiertos](https://datos.gob.cl), de 2019 a 2024.\n\n## Por qué importa\n\nUna comuna que pierde matrícula municipal tiene que decidir qué hacer con sus escuelas y su presupuesto."}
  pistas={["Un enlace se escribe [texto](https://...): copia la dirección de la página de tus datos.", "Las tres preguntas más chicas parten de la principal: por ejemplo, cuánto cambió, dónde cambió más y qué pasó al mismo tiempo.", "Cada sección empieza con ## y un espacio."]}
/>

<Debrief entrevista="En una entrevista, el proyecto final se cuenta en tres frases: la pregunta, los datos y lo que encontraste. Elegir un tema que te importe hace que esa conversación salga natural.">
Elegiste una pregunta concreta, una fuente que la puede responder y tres preguntas más chicas que ordenan el trabajo. En la próxima misión practicas, con una muestra, cómo vienen de verdad los archivos públicos.
</Debrief>
```

`content/casos/proyecto-final/misiones/02-leer-un-archivo-publico.mdx`:
```mdx
---
titulo: Leer un archivo público
tiempo: 35
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Antes de abrir tus datos, practiquemos con una muestra: la matrícula escolar del Maule por comuna y dependencia, de 2020 a 2024, con el formato con que se publican muchos datos abiertos (los números son inventados). Los archivos públicos casi nunca vienen listos: si los lees como un CSV cualquiera, los números salen mal sin ningún error. Léelo bien y separa lo que no es detalle.
</Brief>

<Concepto>
Antes de leer un archivo público con pandas, mira sus primeras líneas. En la muestra hay cuatro trampas comunes:

| Lo que ves | Qué significa | Cómo se lee |
| --- | --- | --- |
| `;` entre columnas | El separador es punto y coma, porque en Chile la coma se usa para los decimales | `sep=";"` |
| `14.918` | Catorce mil novecientos dieciocho: el punto separa los miles | `thousands="."` |
| `s/i` | Sin información: el dato falta | `na_values="s/i"` |
| `Total regional` | Una fila que suma las demás, mezclada con el detalle | se separa con un filtro |

Muchos archivos escriben `agno` en vez de año, para evitar la ñ.

Ninguna de estas trampas produce un error. Si lees el archivo sin indicar nada, obtienes una sola columna con todo junto:

<PythonEjemplo codigo={"import pandas as pd\nmatricula = pd.read_csv(\"datos/matricula_comunal.csv\")\nprint(matricula.columns)\nprint(matricula.head())"} />

Por eso, después de leer, revisa siempre `columns`, `dtypes` y algún valor que conozcas. Las filas de total se separan del detalle con un filtro: `matricula[matricula["comuna"] != "Total regional"]` deja todas las filas menos las de total.
</Concepto>

<PythonTask
  id="leer-el-archivo"
  enunciado="Lee datos/matricula_comunal.csv en la variable matricula, de modo que tenga sus cinco columnas, la matrícula como número (con los miles bien leídos) y los «s/i» como datos faltantes."
  preparacion={"import pandas as pd"}
  inicial={"matricula = pd.read_csv(\"datos/matricula_comunal.csv\")"}
  solucion={"matricula = pd.read_csv(\"datos/matricula_comunal.csv\", sep=\";\", thousands=\".\", na_values=\"s/i\")"}
  pruebas={"assert list(matricula.columns) == [\"agno\", \"region\", \"comuna\", \"dependencia\", \"matricula\"], \"matricula no tiene las cinco columnas: revisa con qué carácter se separan en el archivo.\"\nassert len(matricula) == 125, \"matricula debe tener las 125 filas del archivo.\"\nassert pd.api.types.is_numeric_dtype(matricula[\"matricula\"]), \"La columna matricula quedó como texto: ¿qué texto aparece donde falta el dato?\"\nassert matricula[\"matricula\"].isna().sum() == 3, \"Los «s/i» deben quedar como datos faltantes.\"\nassert matricula[\"matricula\"].max() == 151372, \"Los miles no se leyeron bien: en el archivo, 151.372 es ciento cincuenta y un mil trescientos setenta y dos.\""}
  paquetes={["pandas"]}
  pistas={["Mira la primera línea del archivo: ¿qué carácter separa las columnas? Se indica con sep.", "pd.read_csv acepta thousands para el separador de miles y na_values para el texto que significa «sin dato».", "Después de leer, revisa matricula.dtypes y matricula[\"matricula\"].max(): un total regional debería pasar de cien mil."]}
/>

<PythonTask
  id="separar-los-totales"
  enunciado="Guarda en detalle las filas por comuna y en totales las filas de «Total regional». Después guarda en faltan_2022 cuánta matrícula de 2022 no aparece en el detalle: el total regional de ese año menos la suma de su detalle."
  preparacion={"import pandas as pd\nmatricula = pd.read_csv(\"datos/matricula_comunal.csv\", sep=\";\", thousands=\".\", na_values=\"s/i\")"}
  inicial={"detalle = None\ntotales = None\nfaltan_2022 = None"}
  solucion={"detalle = matricula[matricula[\"comuna\"] != \"Total regional\"]\ntotales = matricula[matricula[\"comuna\"] == \"Total regional\"]\nfaltan_2022 = totales[totales[\"agno\"] == 2022][\"matricula\"].sum() - detalle[detalle[\"agno\"] == 2022][\"matricula\"].sum()"}
  pruebas={"assert len(detalle) == 120 and (detalle[\"comuna\"] != \"Total regional\").all(), \"detalle debe tener solo las filas por comuna, sin las de total.\"\nassert len(totales) == 5, \"totales debe tener una fila de «Total regional» por año.\"\nassert faltan_2022 == 4477, \"faltan_2022 debe ser el total regional de 2022 menos la suma del detalle de 2022.\""}
  paquetes={["pandas"]}
  pistas={["Un filtro con != deja todas las filas menos las que cumplen la condición.", "Filtra cada tabla por agno == 2022 antes de sumar.", "sum() se salta los datos faltantes: por eso la suma del detalle de 2022 queda corta."]}
/>

<Decision
  pregunta="En 2022 faltan 4.477 estudiantes en el detalle, por los «s/i» de Linares y Parral. ¿Qué haces en tu análisis?"
  opciones={[
    { texto: "Para el total regional uso la fila de total; al comparar comunas, aviso que en 2022 faltan datos de Linares y Parral y no saco conclusiones de esas comunas ese año.", correcta: true, porque: "El dato que falta no se inventa ni se ignora: se usa lo confiable y la limitación queda escrita." },
    { texto: "Relleno los «s/i» con 0.", porque: "Un 0 dice que no hubo estudiantes, y sí los hubo: solo no se informaron. Bajaría la matrícula de esas comunas sin razón." },
    { texto: "Borro el año 2022 completo.", porque: "Pierdes 21 filas con datos buenos por 3 que faltan, y la serie de años queda con un hueco." },
  ]}
/>

<Debrief entrevista="Una pregunta frecuente es '¿qué problemas encontraste en los datos?'. Con datos públicos siempre hay algo: separadores, miles, filas de total o datos faltantes. Contar cómo lo detectaste demuestra criterio.">
Los archivos públicos se leen con cuidado: el separador, los miles y el texto de los datos faltantes se indican al leer, y las filas de total se separan del detalle. Ninguna de esas trampas da error, así que después de leer siempre se revisan las columnas, los tipos y algún valor conocido.
</Debrief>
```

`content/casos/proyecto-final/misiones/03-revisar-el-analisis-de-la-ia.mdx`:
```mdx
---
titulo: Revisar el análisis de la IA
tiempo: 25
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Con la muestra del Maule le pedí a un asistente de IA la matrícula total de 2024 y cuánto cambió desde 2020, en porcentaje. Lo pegué en el editor tal cual. El código corre sin errores y dice que la matrícula creció 1,3 %, pero no le creo: el total de 2024 que calcula no se parece en nada al total regional que trae el archivo. Revísalo y corrígelo. Esto mismo te va a pasar con tus datos.
</Brief>

<Concepto>
Un archivo público trae a veces sus propios controles: filas de total, conteos en la descripción del conjunto de datos o cifras publicadas en un informe. Son la mejor forma de revisar un cálculo, tuyo o de una IA:

1. **Calcula lo mismo paso a paso** y mira los resultados intermedios.
2. **Compara con el control.** Si no calza, busca en qué paso se separan.
3. **Revisa cómo se leyó el archivo.** Un número leído como 14,918 en vez de 14918 no da error.

La variación porcentual entre dos años se calcula como (nuevo − antiguo) / antiguo × 100. Un resultado negativo es una caída.
</Concepto>

<PythonTask
  id="corregir-el-analisis"
  enunciado="Corrige el código del asistente para que total_2024 sea la matrícula total de la región en 2024 y variacion el cambio porcentual entre 2020 y 2024, redondeado a un decimal."
  preparacion={"import pandas as pd"}
  inicial={"# Código sugerido por un asistente de IA\nmatricula = pd.read_csv(\"datos/matricula_comunal.csv\", sep=\";\", na_values=\"s/i\")\npor_agno = matricula.groupby(\"agno\")[\"matricula\"].sum()\ntotal_2024 = por_agno[2024]\nvariacion = round((por_agno[2024] - por_agno[2020]) / por_agno[2020] * 100, 1)"}
  solucion={"matricula = pd.read_csv(\"datos/matricula_comunal.csv\", sep=\";\", thousands=\".\", na_values=\"s/i\")\ndetalle = matricula[matricula[\"comuna\"] != \"Total regional\"]\npor_agno = detalle.groupby(\"agno\")[\"matricula\"].sum()\ntotal_2024 = por_agno[2024]\nvariacion = round((por_agno[2024] - por_agno[2020]) / por_agno[2020] * 100, 1)"}
  pruebas={"assert total_2024 == 148733, \"total_2024 no calza con la fila «Total regional» de 2024 del archivo: revisa cómo se leen los números y qué filas se suman.\"\nassert variacion == -1.7, \"variacion debe ser el cambio porcentual entre 2020 y 2024, redondeado a un decimal.\""}
  paquetes={["pandas"]}
  pistas={["Ejecuta el código y compara total_2024 con la fila «Total regional» de 2024: ¿cuánto se alejan?", "Mira matricula[\"matricula\"].head(): ¿14.918 quedó como catorce mil o como catorce?", "Si sumas el detalle y también la fila de total, cuentas todo dos veces."]}
/>

<Decision
  pregunta="Ya corregiste el código del asistente. ¿Cómo vas a usar la IA en tu proyecto?"
  opciones={[
    { texto: "Para escribir código más rápido, revisando cada resultado contra un control: una fila de total, un conteo conocido o un cálculo hecho a mano.", correcta: true, porque: "Bien revisada, la IA ahorra tiempo. Lo que no sirve es usarla sin revisar." },
    { texto: "Copio su resultado: escribe código más rápido que yo.", porque: "Este código corría y daba un número creíble, pero equivocado. La rapidez no sirve si el resultado no se revisa." },
    { texto: "No la uso nunca: si se equivoca, no sirve.", porque: "Tú también te equivocas, y por eso revisas. Con la IA es igual: se revisa contra los datos." },
  ]}
/>

<Debrief entrevista="Si te preguntan cómo validas un análisis, menciona los totales de control: 'comparo mi suma con el total que publica la fuente; si no calza, busco la diferencia antes de seguir'.">
El asistente leyó los miles como decimales y sumó las filas de total junto con el detalle. Ninguno de los dos errores avisa. Los delató el total regional que trae el mismo archivo: usa siempre los controles que tengas a mano.
</Debrief>
```

`content/casos/proyecto-final/misiones/04-tu-repositorio-y-tus-datos.mdx`:
```mdx
---
titulo: Tu repositorio y tus datos
tiempo: 30
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Ahora sí, tus datos. Crea el repositorio del proyecto con un nombre que diga de qué trata, por ejemplo matricula-municipal-valparaiso, y sube tus datos a una carpeta datos. En el README pon el título del proyecto y un enlace a la fuente: quien lo lea tiene que poder descargar lo mismo que tú. Cuando esté, pega el enlace.
</Brief>

<Concepto>
Un proyecto de análisis se ordena así:

| Carpeta o archivo | Qué va |
| --- | --- |
| `README.md` | La portada: pregunta, datos, hallazgos y conclusiones |
| `datos/` | Los archivos tal como los descargaste |
| `notebooks/` | El análisis, en uno o más `.ipynb` |
| `graficos/` | Los gráficos, exportados como `.png` |

**Los datos originales no se editan a mano.** Toda la limpieza se hace en el notebook: así cualquiera puede repetirla desde el archivo de la fuente.

**La fuente se cita.** En el README, en una sección Datos, escribe la institución, el nombre del conjunto de datos, el enlace y la fecha en que lo descargaste. Revisa en la página del conjunto si tiene una licencia y cómo pide ser citado.

**El tamaño importa.** GitHub no acepta desde la web archivos de más de 25 MB. Si el tuyo pesa más, sube un extracto (por ejemplo, solo tu región) y explica en el README cómo descargar el resto.

Como en el Caso 0, nombra archivos y carpetas en minúsculas, sin tildes ni espacios: `matricula-2024.csv`, no `Matrícula 2024.csv`.
</Concepto>

<GithubTask
  id="repositorio-del-proyecto"
  enunciado="Pega el enlace del repositorio de tu proyecto."
  requisitos={["publico", "carpeta:datos", "nombres-limpios", "readme:titulo", "readme:enlace"]}
  pistas={["Para crear la carpeta, al subir el archivo nómbralo datos/nombre-del-archivo.csv.", "Si el archivo se descargó con un nombre con espacios o tildes, renómbralo antes de subirlo.", "Un enlace en Markdown se escribe [Nombre del conjunto de datos](https://...)."]}
/>

<Decision
  pregunta="El conjunto de datos que encontraste trae el nombre y la dirección de cada persona. ¿Qué haces?"
  opciones={[
    { texto: "No lo subo a un repositorio público: busco la versión agregada (por comuna o por mes) que responde la misma pregunta.", correcta: true, porque: "Que un dato se pueda descargar no lo vuelve publicable en tu portafolio. Tu análisis no necesita saber quién es cada persona." },
    { texto: "Lo subo igual: si el Estado lo publicó, es público.", porque: "Tu repositorio difunde esos datos de nuevo, quizás fuera de las condiciones en que se publicaron, y los datos que identifican a alguien no van en un portafolio." },
  ]}
/>

<Debrief entrevista="Quien revisa un portafolio mira primero el README y cómo está ordenado el repositorio. Una carpeta de datos con la fuente citada dice que trabajas de forma que otros pueden repetir.">
Un repositorio ordenado, con los datos originales y su fuente citada, permite repetir tu análisis desde cero. En la próxima misión exploras y limpias tus datos en un notebook.
</Debrief>
```

`content/casos/proyecto-final/misiones/05-explorar-y-limpiar.mdx`:
```mdx
---
titulo: Explorar y limpiar
tiempo: 60
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Abre tus datos en un notebook (Google Colab sirve, como en el Caso 3) y explóralos: cuántas filas tienen, qué columnas, qué tipos, qué falta y qué se repite. Limpia lo necesario y anota cada problema en una bitácora: qué encontraste, cuántas filas afectaba y qué hiciste. Escríbela aquí primero y después agrégala a tu README. El notebook va en la carpeta notebooks.
</Brief>

<Concepto>
Lo mismo que hiciste en el Caso 3, ahora con datos que nadie preparó para ti:

| Pregunta | Código |
| --- | --- |
| ¿Se leyó bien? | `df.columns`, `df.dtypes` y `df.head()` |
| ¿Cuántas filas tiene? | `len(df)` |
| ¿Qué falta? | `df.isna().sum()` |
| ¿Hay filas repetidas? | `df.duplicated().sum()` |
| ¿Qué valores toma una columna? | `df["columna"].value_counts()` |
| ¿Hay valores raros? | `df.describe()` |

Cada decisión de limpieza cambia el resultado, así que se anota. Con la muestra del Maule, la bitácora se vería así:

| Problema | Filas afectadas | Qué hice |
| --- | --- | --- |
| Separador punto y coma y miles con punto | todas | Lo indiqué al leer: `sep=";"` y `thousands="."` |
| Filas de total mezcladas con el detalle | 5 | Las separé en otra tabla y las usé como control |
| «s/i» en 2022 | 3 | Quedaron como datos faltantes; lo explico en las limitaciones |

Para subir el notebook desde Colab: **Archivo** → **Descargar** → **Descargar .ipynb**, y luego súbelo a la carpeta `notebooks`. Súbelo en varios commits, cada uno con un mensaje que diga qué cambiaste.
</Concepto>

<MarkdownTask
  id="bitacora-de-limpieza"
  enunciado="Escribe la bitácora de limpieza de tus datos: un título, una tabla con las columnas Problema, Filas afectadas y Qué hice (con al menos tres problemas) y una lista con lo que revisaste y estaba bien."
  inicial="Bitácora de limpieza"
  requisitos={["titulo", "tabla", "lista"]}
  solucion={"# Bitácora de limpieza\n\n| Problema | Filas afectadas | Qué hice |\n| --- | --- | --- |\n| Separador punto y coma y miles con punto | todas | Lo indiqué al leer el archivo |\n| Filas de total mezcladas con el detalle | 5 | Las separé y las usé como control |\n| «s/i» en 2022 | 3 | Quedaron como datos faltantes |\n\nLo que revisé y estaba bien:\n\n- No hay filas repetidas.\n- Todas las comunas tienen las tres dependencias en cada año."}
  pistas={["Una tabla en Markdown tiene una fila de encabezados, una fila con | --- | --- | --- | y una fila por problema.", "Si no encontraste vacíos o repetidos, también se anota: va en la lista de lo que revisaste y estaba bien.", "Las filas afectadas salen de tu notebook: isna().sum() y duplicated().sum() te dan los números."]}
/>

<GithubTask
  id="notebook-de-limpieza"
  enunciado="Sube tu notebook a la carpeta notebooks y pega el enlace del repositorio."
  requisitos={["publico", "carpeta:notebooks", "extension:.ipynb", "commits:3"]}
  pistas={["En Colab: Archivo → Descargar → Descargar .ipynb.", "Al subirlo, nómbralo notebooks/exploracion.ipynb para que quede dentro de la carpeta.", "Los mensajes automáticos como «Add files via upload» no cuentan: al subir cada archivo, escribe qué agregaste."]}
/>

<Decision
  pregunta="Encuentras un valor muy distinto al resto: una comuna con diez veces más atenciones que las demás en un solo mes. ¿Qué haces?"
  opciones={[
    { texto: "Lo investigo antes de decidir: reviso la fuente y busco una explicación (un error de digitación o algo que pasó de verdad), y anoto la decisión en la bitácora.", correcta: true, porque: "Un valor extremo puede ser un error o el hallazgo más importante del análisis. Se decide con evidencia y queda escrito." },
    { texto: "Lo borro: los valores extremos arruinan los promedios.", porque: "Si pasó de verdad, borrarlo esconde justo lo que había que contar. Se borra solo si se confirma que es un error, y se anota." },
  ]}
/>

<Debrief entrevista="Es casi seguro que te pregunten cuánto tiempo de un análisis se va en preparar los datos. Responde con tu bitácora: qué problemas encontraste, cuántas filas afectaban y por qué decidiste lo que decidiste.">
Explorar es conocer los datos antes de creerles; limpiar es decidir qué hacer con cada problema y dejarlo escrito. La bitácora permite que otra persona entienda y repita cada decisión.
</Debrief>
```

`content/casos/proyecto-final/misiones/06-analizar-y-visualizar.mdx`:
```mdx
---
titulo: Analizar y visualizar
tiempo: 60
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Con los datos limpios, responde tus tres preguntas más chicas, cada una con un cálculo y un gráfico. Antes, practica con la muestra del Maule: ¿en qué comuna cayó más la matrícula municipal entre 2020 y 2024? Después haz lo mismo con tus datos y sube los gráficos a la carpeta graficos.
</Brief>

<Concepto>
Para comparar dos años por grupo, `pivot_table` deja una fila por grupo y una columna por año:

<PythonEjemplo codigo={"import pandas as pd\nmatricula = pd.read_csv(\"datos/matricula_comunal.csv\", sep=\";\", thousands=\".\", na_values=\"s/i\")\nmunicipal = matricula[matricula[\"dependencia\"] == \"Municipal\"]\ntabla = municipal.pivot_table(index=\"comuna\", columns=\"agno\", values=\"matricula\")\nprint(tabla)"} />

Cada columna se usa como una serie: `tabla[2024] - tabla[2020]` resta comuna por comuna.

Para el gráfico, repasa lo que viste en el Caso 4:

| Lo que quieres mostrar | Gráfico |
| --- | --- |
| Cómo cambia algo en el tiempo | Líneas |
| Qué grupo es mayor o menor (un ranking) | Barras horizontales ordenadas |
| Si dos números se mueven juntos | Dispersión |

El título dice la conclusión: «Cauquenes perdió más de un cuarto de su matrícula municipal» dice más que «Matrícula por comuna». Para subir un gráfico desde Colab, haz clic derecho en la imagen, guárdala como `.png` y súbela a la carpeta `graficos`.
</Concepto>

<PythonTask
  id="caida-municipal"
  enunciado="Con la muestra del Maule, guarda en caida la variación porcentual de la matrícula municipal entre 2020 y 2024 de cada comuna (una serie con una fila por comuna) y en comuna_mayor_caida el nombre de la comuna donde más cayó."
  preparacion={"import pandas as pd\nmatricula = pd.read_csv(\"datos/matricula_comunal.csv\", sep=\";\", thousands=\".\", na_values=\"s/i\")"}
  inicial={"municipal = matricula[matricula[\"dependencia\"] == \"Municipal\"]\ncaida = None\ncomuna_mayor_caida = None"}
  solucion={"municipal = matricula[matricula[\"dependencia\"] == \"Municipal\"]\ntabla = municipal.pivot_table(index=\"comuna\", columns=\"agno\", values=\"matricula\")\ncaida = (tabla[2024] - tabla[2020]) / tabla[2020] * 100\ncomuna_mayor_caida = caida.idxmin()"}
  pruebas={"assert len(caida) == 8, \"caida debe tener una fila por comuna.\"\nassert round(caida[\"Cauquenes\"], 1) == -26.7, \"caida debe ser (2024 − 2020) / 2020 × 100 en cada comuna.\"\nassert comuna_mayor_caida == \"Cauquenes\", \"comuna_mayor_caida debe ser la comuna con la variación más negativa.\""}
  paquetes={["pandas"]}
  pistas={["pivot_table(index=\"comuna\", columns=\"agno\", values=\"matricula\") deja una columna por año: tabla[2020] y tabla[2024].", "La variación es (nuevo − antiguo) / antiguo × 100, columna con columna.", "Una caída es una variación negativa: la mayor caída es el valor más bajo, e idxmin() devuelve su comuna."]}
/>

<GithubTask
  id="graficos-del-proyecto"
  enunciado="Sube los gráficos de tus tres preguntas a la carpeta graficos, muestra al menos uno en el README y pega el enlace del repositorio."
  requisitos={["publico", "carpeta:graficos", "extension:.png", "readme:imagen"]}
  pistas={["Al subir cada imagen, nómbrala graficos/nombre-del-grafico.png.", "En el README, una imagen del repositorio se muestra con ![La matrícula municipal cae en todas las comunas](graficos/caida-municipal.png)."]}
/>

<Decision
  pregunta="Para mostrar la caída de la matrícula municipal en las ocho comunas del Maule, ¿qué gráfico usas?"
  opciones={[
    { texto: "Barras horizontales ordenadas de la mayor caída a la menor, con el título «Cauquenes perdió más de un cuarto de su matrícula municipal».", correcta: true, porque: "Un ranking se lee bien en barras ordenadas, y el título dice la conclusión." },
    { texto: "Un gráfico de torta con la matrícula municipal de cada comuna.", porque: "Una torta muestra las partes de un todo en un momento; la pregunta es cuánto cambió cada comuna entre dos años." },
    { texto: "Ocho gráficos de líneas, uno por comuna.", porque: "Obliga a comparar entre gráficos con escalas distintas. Un solo gráfico ordenado responde la pregunta de un vistazo." },
  ]}
/>

<Debrief entrevista="Al mostrar un gráfico en una entrevista, parte por la conclusión del título y después muestra el dato que la respalda. Si un gráfico necesita mucha explicación, probablemente no es el gráfico correcto.">
Cada pregunta chica se responde con un cálculo y un gráfico elegido para esa pregunta, con un título que dice la conclusión. Lo practicaste con la muestra y lo repetiste con tus datos.
</Debrief>
```

`content/casos/proyecto-final/misiones/07-conclusiones-y-limitaciones.mdx`:
```mdx
---
titulo: Conclusiones y limitaciones
tiempo: 40
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Tienes cálculos y gráficos. Ahora escribe lo que significan: qué respondes a tu pregunta, con qué números, y qué no se puede afirmar con estos datos. Las limitaciones no son una debilidad del proyecto: escribirlas muestra que entiendes tus datos.
</Brief>

<Concepto>
Una conclusión tiene tres partes: **la respuesta** a la pregunta, **el número** que la respalda y **la evidencia** de donde sale. Con la muestra del Maule:

> La matrícula municipal bajó en las ocho comunas entre 2020 y 2024. En Cauquenes cayó 26,7 %, casi el triple que en el resto (gráfico de caída municipal).

Las limitaciones dicen hasta dónde llega esa conclusión:

- **Cobertura:** qué período, lugares o grupos quedan fuera.
- **Calidad:** datos faltantes o cambios en cómo se midió, como los «s/i» de 2022.
- **Causa:** los datos muestran qué pasó, casi nunca por qué. «La matrícula municipal cayó» se puede afirmar; «cayó porque las familias prefieren otros colegios» necesita otra evidencia.
- **Alcance:** los datos de una región no hablan por todo el país.

Cierra con una recomendación o una pregunta abierta: qué haría alguien con tu respuesta, o qué habría que investigar después.
</Concepto>

<MarkdownTask
  id="conclusiones-y-limitaciones"
  enunciado="Escribe las conclusiones de tu proyecto: un título, una sección Conclusiones con una lista numerada (una conclusión por pregunta, cada una con su número) y una sección Limitaciones con una lista de lo que tus datos no permiten afirmar."
  inicial="Conclusiones del proyecto"
  requisitos={["titulo", "subtitulos:2", "lista-numerada", "lista"]}
  solucion={"# Conclusiones del proyecto\n\n## Conclusiones\n\n1. La matrícula municipal del Maule bajó en las ocho comunas entre 2020 y 2024.\n2. En Cauquenes cayó 26,7 %, casi el triple que en el resto.\n3. La matrícula total de la región bajó solo 1,7 %, y en esos años la particular subvencionada creció.\n\n## Limitaciones\n\n- En 2022 faltan datos de Linares y Parral.\n- Los datos muestran cuánto cambió la matrícula, no por qué.\n- Es una sola región: no habla por el país."}
  pistas={["Cada conclusión responde una de tus preguntas chicas y lleva su número: «cayó 26,7 %», no «cayó harto».", "Una lista con viñetas empieza cada línea con - y un espacio.", "Revisa las cuatro limitaciones del concepto: cobertura, calidad, causa y alcance. ¿Cuáles aplican a tus datos?"]}
/>

<Decision
  pregunta="En tu análisis, las comunas donde más creció la matrícula particular subvencionada son las que más perdieron matrícula municipal. ¿Qué escribes?"
  opciones={[
    { texto: "Que las dos cosas ocurren juntas en estos datos, y que para saber si una explica la otra se necesitaría otra evidencia, como seguir a cada estudiante o encuestar a las familias.", correcta: true, porque: "Dos números que se mueven juntos no prueban que uno cause el otro: puede haber otra explicación, como un cambio en la población de la comuna." },
    { texto: "Que las familias se están cambiando de los colegios municipales a los subvencionados.", porque: "Es una explicación posible, pero los datos por comuna no siguen a cada estudiante: no muestran desde dónde ni hacia dónde se cambió." },
  ]}
/>

<Debrief entrevista="Una pregunta típica es '¿qué le falta a tu análisis o qué harías distinto?'. Si ya escribiste tus limitaciones, tienes la respuesta lista, y muestra que conoces el alcance de tu trabajo.">
Una conclusión responde la pregunta con un número y su evidencia; las limitaciones dicen hasta dónde llega. Separar lo que los datos muestran de lo que no pueden mostrar es lo que hace confiable un análisis.
</Debrief>
```

`content/casos/proyecto-final/misiones/08-publicar-tu-proyecto.mdx`:
```mdx
---
titulo: Publicar tu proyecto
tiempo: 60
sinGuia: true
---

<Brief de="Daniela Fuentes, analista de datos y tu mentora en esta ruta">
Último paso: deja el proyecto listo para que cualquiera lo entienda sin ti. El README tiene que contar la pregunta, los datos con su fuente, cómo los preparaste, lo que encontraste con tus gráficos, tus conclusiones y sus limitaciones, en ese orden. Que el historial muestre cómo lo construiste. Cuando esté, pega el enlace y envíalo a revisión desde la página del caso.
</Brief>

<GithubTask
  id="proyecto-publicado"
  enunciado="Pega el enlace del repositorio de tu proyecto final."
  requisitos={["publico", "nombres-limpios", "carpeta:datos", "carpeta:notebooks", "extension:.ipynb", "carpeta:graficos", "extension:.png", "commits:5", "readme:titulo", "readme:subtitulos:5", "readme:lista-numerada", "readme:imagen", "readme:enlace"]}
/>

<Decision
  pregunta="¿Cómo presentas este proyecto en tu CV o en LinkedIn?"
  opciones={[
    { texto: "Con una frase que dice la pregunta, los datos y el hallazgo principal, más el enlace al repositorio.", correcta: true, porque: "Quien contrata lee en segundos: el hallazgo y el enlace lo invitan a entrar a ver el resto." },
    { texto: "Con la lista de herramientas que usé: Python, pandas y GitHub.", porque: "Las herramientas importan, pero sin el problema que resolviste no dicen qué sabes hacer con ellas." },
  ]}
/>

<Debrief entrevista="Este proyecto es tu mejor respuesta a 'cuéntame de un análisis que hayas hecho'. Practica contarlo en dos minutos: la pregunta, los datos, un problema que resolviste, el hallazgo y una limitación.">
Terminaste la ruta con un proyecto propio, de principio a fin: elegiste la pregunta y los datos, los limpiaste dejando registro, analizaste, visualizaste y escribiste conclusiones con sus límites. Envíalo desde la página del caso para que lo revisen con la rúbrica.
</Debrief>
```

- [ ] **Step 3: Validar**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content validate`
Expected: `[content] ok: 2 rutas, 7 casos, 51 misiones`. El validador corre en Pyodide la solución de cada `PythonTask` contra sus pruebas.

Compara cada `.mdx` y `.yaml` con el de este plan (con `diff`): deben ser idénticos.

Comprueba además, sin agregarlas al repositorio, que el código inicial de las tareas lleva a los diagnósticos que el contenido promete. Usa esta prueba temporal en `packages/engines/src/sonda.test.ts`, córrela con `docker compose run --rm tools pnpm --filter @syntaxerror/engines exec vitest run src/sonda.test.ts` y bórrala después:
```ts
import { readFileSync } from "node:fs";
import { loadPyodide } from "pyodide";
import { expect, it } from "vitest";
import { crearSesionPython } from "./python";

it("los diagnósticos de la muestra dicen qué falta y el código del asistente da un número creíble y equivocado", async () => {
  const py = await loadPyodide();
  const contenido = readFileSync(new URL("../../../content/casos/proyecto-final/datos/matricula_comunal.csv", import.meta.url), "utf8");
  const sesion = await crearSesionPython(py, { paquetes: ["pandas"], archivos: [{ ruta: "datos/matricula_comunal.csv", contenido }] });
  const pruebas = 'assert list(matricula.columns) == ["agno", "region", "comuna", "dependencia", "matricula"], "COLUMNAS"\nassert pd.api.types.is_numeric_dtype(matricula["matricula"]), "TEXTO"\nassert matricula["matricula"].isna().sum() == 3, "SI"\nassert matricula["matricula"].max() == 151372, "MILES"';
  const diagnostico = async (codigo: string) => (await sesion.revisar({ preparacion: "import pandas as pd", pruebas }, codigo)).diagnostico;
  expect(await diagnostico('matricula = pd.read_csv("datos/matricula_comunal.csv")')).toBe("COLUMNAS");
  expect(await diagnostico('matricula = pd.read_csv("datos/matricula_comunal.csv", sep=";")')).toBe("TEXTO");
  expect(await diagnostico('matricula = pd.read_csv("datos/matricula_comunal.csv", sep=";", na_values="s/i")')).toBe("MILES");
  const asistente = 'matricula = pd.read_csv("datos/matricula_comunal.csv", sep=";", na_values="s/i")\npor_agno = matricula.groupby("agno")["matricula"].sum()\nprint(round(por_agno[2024], 1), round((por_agno[2024] - por_agno[2020]) / por_agno[2020] * 100, 1))';
  expect((await sesion.ejecutar("import pandas as pd", asistente)).salida.trim()).toBe("1265.5 1.3");
}, 300_000);
```

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && pnpm --filter web exec tsc --noEmit && pnpm --filter web build"`
Expected: PASS en todos los paquetes y el build con las páginas estáticas.

- [ ] **Step 4: Commit**

```bash
git add content
git commit -m "feat(contenido): caso 5 proyecto final, ocho misiones con datos abiertos chilenos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: e2e y README

**Files:**
- Create: `e2e/tests/proyecto-final.spec.ts`
- Modify: `e2e/tests/progreso.ts`, `e2e/calentar.ts`, `README.md`

**Interfaces:**
- Consumes: `registrarse`, `aprobar`, `completarCaso` y `entrarComoAdmin` (`./progreso`), y los ids de la Task 3.
- Produces:
  - `MISIONES["clinica-cordillera-central"]` en `progreso.ts`;
  - `e2e/tests/proyecto-final.spec.ts`, con 2 pruebas.

- [ ] **Step 1: El helper y las pruebas**

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

// Completa un caso entero: todas sus misiones y el entregable aprobado por administración.
export async function completarCaso(page: Page, admin: Page, ip: string, email: string, caso: string) {
  await aprobar(page, ip, caso, MISIONES[caso]);
  await page.goto(`/casos/${caso}`);
  await page.getByLabel("Enlace a tu repositorio de GitHub").fill(`https://github.com/e2e/${caso}`);
  await page.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Tu entregable está en revisión.", { exact: false })).toBeVisible();
  // Se aprueba por la API de revisión: es más rápido y no depende de que la página hidrate. La aprobación con
  // clics en la rúbrica ya la prueban misiones.spec y cuenta.spec (aprobarEntregable).
  await admin.goto("/profesor/entregables");
  const tarjeta = admin.locator("li", { hasText: email });
  await expect(tarjeta).toHaveCount(1);
  const entregableId = await tarjeta.locator("[data-entregable-id]").getAttribute("data-entregable-id");
  const criterios = await tarjeta.getByRole("checkbox").count();
  expect(entregableId, `${caso}: entregable sin id`).not.toBeNull();
  const respuesta = await admin.request.post(`/api/revision/entregables/${entregableId}`, {
    headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
    data: { decision: "aprobado", criterios: Array.from({ length: criterios }, () => true), comentario: null },
  });
  expect(respuesta.ok(), `${caso}: aprobación de entregable`).toBe(true);
}

export { entrarComoAdmin };
```

`e2e/tests/proyecto-final.spec.ts`:
```ts
import { expect, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, registrarse } from "./progreso";

const CASO = "proyecto-final";

test("la muestra del proyecto final se descarga tal como la publicaría un portal", async ({ page }) => {
  await page.goto(`/casos/${CASO}`);
  await expect(page.getByRole("link", { name: "matricula_comunal.csv" })).toHaveAttribute("href", `/casos/${CASO}/datos/matricula_comunal.csv`);
  await expect(page.getByText("125 filas", { exact: false })).toBeVisible();
  const respuesta = await page.request.get(`/casos/${CASO}/datos/matricula_comunal.csv`);
  expect(await respuesta.text()).toContain("2020;Maule;Talca;Municipal;14.918");
});

test("con los casos 0 a 4 completos: escribe la propuesta y lee un archivo público con sus trampas", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(420_000);
  const email = await registrarse(page, "Javiera Muñoz");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "despachos-rapidos", "minimarkets-del-sur", "tienda-online-pewen", "clinica-cordillera-central"]) {
    await completarCaso(page, admin, ip, email, caso);
  }

  await page.goto(`/casos/${CASO}/01-elegir-tus-datos`);
  await page.getByLabel("Tu README").fill(
    "# Calidad del aire en Temuco\n\n## Pregunta\n\n¿En qué meses se supera más la norma de MP2,5?\n\n1. ¿Cuántos días se supera?\n2. ¿En qué meses?\n3. ¿Cambió desde 2019?\n\n## Datos\n\nMediciones de [SINCA](https://datos.gob.cl).\n\n## Por qué importa\n\nAyuda a planificar alertas."
  );
  const propuesta = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await propuesta;
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  await page.goto(`/casos/${CASO}/02-leer-un-archivo-publico`);
  await expect(page.getByText("Python listo").first()).toBeVisible({ timeout: 150_000 });
  await expect(page.locator('.cm-content[aria-label="Código Python"]').first()).toBeVisible({ timeout: 30_000 });
  // Leído como un CSV cualquiera, el archivo queda en una sola columna: el código corre, pero el resultado está mal.
  await page.getByRole("button", { name: "Validar" }).first().click();
  await expect(page.getByText("matricula no tiene las cinco columnas: revisa con qué carácter se separan en el archivo.")).toBeVisible();
  await page.getByLabel("Código Python").first().fill('matricula = pd.read_csv("datos/matricula_comunal.csv", sep=";", na_values="s/i")');
  await page.getByRole("button", { name: "Validar" }).first().click();
  await expect(page.getByText("Los miles no se leyeron bien", { exact: false })).toBeVisible();
  await page.getByLabel("Código Python").first().fill('matricula = pd.read_csv("datos/matricula_comunal.csv", sep=";", thousands=".", na_values="s/i")');
  const leida = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).first().click();
  await leida;
  await expect(page.getByText("¡Tarea aprobada!").first()).toBeVisible();
  // La tarea siguiente ya se puede aprobar: el servidor registró la primera.
  await aprobar(page, ip, CASO, [["02-leer-un-archivo-publico", "separar-los-totales"]]);
});
```

En `e2e/calentar.ts`, agrega a `RUTAS`, antes de `"/casos/demo-motor"`:
```ts
  "/casos/proyecto-final",
  "/casos/proyecto-final/01-elegir-tus-datos",
  "/casos/proyecto-final/02-leer-un-archivo-publico",
```

Run: `npm run test:e2e -- tests/proyecto-final.spec.ts`
Expected: `2 passed`.

- [ ] **Step 2: README**

En `README.md`, antes de `## Datos de los casos`, agrega:
```markdown
## Caso 5: Proyecto final

- **Datos de la persona:** elige un conjunto de una lista curada de seis fuentes (datos.gob.cl, INE, SINIM, DEIS, Centro de Estudios Mineduc y SINCA). La plataforma no puede correr su análisis: lo verifican `GithubTask` (repositorio, carpetas, notebook, gráficos y README) y la rúbrica de tres dimensiones.
- **Muestra de práctica:** `packages/content/src/generadores/proyecto-final.ts` genera la matrícula escolar del Maule 2020–2024 (números inventados) con el formato de un portal público: separador `;`, miles con punto, `s/i` y filas de «Total regional» mezcladas con el detalle. Con ella se practica leer el archivo, revisar el análisis de una IA contra el total de control y calcular una variación por comuna.
```

En `## Datos de los casos`, debajo de la línea de UTF-8, agrega:
```markdown
  - La excepción es la muestra del proyecto final: imita un archivo público, separado por punto y coma. Su generador entrega el texto del archivo tal cual.
```

- [ ] **Step 3: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes (592 pruebas).

Run: `npm run test:e2e`
Expected: `39 passed`. Dos corridas seguidas deben dar lo mismo.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml up -d --force-recreate --wait web && for p in /casos/proyecto-final /casos/proyecto-final/02-leer-un-archivo-publico /casos/proyecto-final/datos/matricula_comunal.csv; do curl -s -o /dev/null localhost:3000$p; curl -s -D - -o /dev/null localhost:3000$p | grep -i x-nextjs-cache; done; docker compose up -d --force-recreate web`
Expected: `x-nextjs-cache: HIT` tres veces. Al final, `web` vuelve a modo desarrollo.

- [ ] **Step 4: Recorrer el caso como estudiante**

Descarga la muestra desde la página del caso y ábrela en Google Colab. Revisa dos cosas:
- que el código de las misiones 2, 3 y 6 corra igual que en la plataforma;
- que **Archivo → Descargar → Descargar .ipynb** exista con ese nombre.

Busca además cada una de las seis fuentes por su nombre y confirma que publica archivos descargables del tipo que dice la tabla de la misión 1. Si algo cambió, corrige el contenido.

- [ ] **Step 5: Commit**

```bash
git add e2e README.md
git commit -m "test(e2e): caso 5 con la propuesta y la lectura de un archivo publico con sus trampas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Fase 4g: la rúbrica con puntaje.**
- Las tres dimensiones estándar (claridad, ejecución técnica y coherencia), cada una con puntaje de 1 a 3 y una descripción de cada nivel.
- La revisión guarda el puntaje y lo muestra a la persona junto al comentario.
- **Pendiente del equipo:** con qué puntaje se aprueba un entregable, por ejemplo al menos 2 en cada dimensión.

**Antes del lanzamiento:**
- publicar la ruta (`estado: publicada`);
- configurar `GITHUB_TOKEN` en producción y probar la revisión contra GitHub real;
- recorrer las guías de Power BI, Looker Studio y Colab, y los seis casos como estudiante.
