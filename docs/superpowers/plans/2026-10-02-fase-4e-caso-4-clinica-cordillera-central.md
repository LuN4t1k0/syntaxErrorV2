# Fase 4e: Caso 4, Clínica Cordillera Central. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar el Caso 4 de la ruta Data Analyst, "Clínica Cordillera Central": siete misiones para pasar de una pregunta de gestión a un dashboard presentado al directorio.
- La ficha del dashboard, preparar los datos y calcular indicadores.
- Elegir gráficos, diseñar, y construir en Power BI o Looker Studio.
- Presentar en cinco minutos, en una misión sin guía.

Además, la plataforma suma la descarga de los datos de cada caso, que necesitan todos los entregables que se hacen fuera de ella.

**Architecture:**
- **Descarga de datos:**
  - `/casos/[caso]/datos/[tabla].csv` es una ruta estática, generada en el build.
  - La página del caso muestra "Datos del caso", con los enlaces, las filas y columnas de cada tabla, y cómo abrir los CSV en Excel, Google Sheets o pandas.
  - Sirve también para la planilla del Caso 1 y el notebook del Caso 3.
- **Datos generados con semilla fija** (`packages/content/src/generadores/clinica-cordillera-central.ts`): 4 sedes, 8 especialidades y 1200 atenciones de enero a junio de 2025, sin ningún dato de pacientes. Lo que el dashboard tiene que mostrar sale de los datos:
  - en invierno la espera promedio en urgencia se duplica, de 45 a 95 minutos;
  - en Maipú llega a 129 minutos en junio, y ahí ocurren todos los abandonos de la sala de urgencia;
  - Dermatología tiene un 21 % de inasistencia en consultas, contra 11 % o menos en el resto.
- **El enfoque acordado con el equipo:**
  - Dentro de la plataforma se resuelve lo que se puede corregir solo:
    - la ficha y el boceto del dashboard, con `MarkdownTask`;
    - la preparación de datos, los indicadores y los datos de cada gráfico, con `SqlTask`;
    - el criterio, con decisiones.
  - El dashboard se construye en Power BI Desktop o en Looker Studio, con una guía para cada uno. Se entrega en GitHub con capturas: `GithubTask` verifica el repositorio y la rúbrica evalúa el dashboard.

**Tech Stack:** Next.js 15 (route handler estático con `generateStaticParams`), alasql 4.19.1, Vitest 4 y Playwright 1.55. Fuera de la plataforma: Power BI Desktop o Looker Studio, ambos gratuitos.

**Spec:** `docs/propuesta-pedagogica-data-analyst.md`:
- 5: misión sin guía;
- 8: Caso 4, Visualización, con las dos alternativas de Power BI.

También los acuerdos con el equipo:
- **Nombre de la empresa:** "Clínica Cordillera Central", confirmado el 2026-10-02. Reemplaza a "Clínica Los Andes", que coincide con clínicas reales.
- **Datos:** sintéticos, de un script reproducible.

## Global Constraints

**El contenido se copia literal**
- Cada archivo `.mdx` y `.yaml` de este plan se copia exactamente como está: sin resumir Briefs, Conceptos, Decisiones ni Debriefs, sin quitar pistas y sin cambiar valores.
- El contenido se verificó contra los datos al planear. Antes del commit de la Task 3, cada `.mdx` se compara con `diff` contra el plan.

**Entorno y texto**
- Todo se ejecuta con `docker compose run --rm tools ...`.
- `npm run test:e2e` corre contra el build de producción.
- El texto visible va en español de Chile, tratando de tú, sin voseo y con lenguaje neutro.

**Datos de salud**
- Los datos de la clínica son inventados y no tienen nombres, RUT, edades ni ningún dato que identifique a una persona.
- No se agregan aunque "parezca más real": un caso de salud se enseña igual con atenciones anónimas.

**Descarga de datos**
- Los CSV se entregan en UTF-8, separados por coma y sin BOM. Con BOM, pandas leería la primera columna como `﻿id`.
- Para Excel, la página indica abrirlos con Datos → Obtener datos → Desde texto/CSV, que detecta bien las tildes y las columnas.
- La ruta solo entrega tablas de casos publicados (`dynamicParams = false`); cualquier otro archivo responde 404.

**Herramientas externas**
- Las guías nombran los menús de Power BI y Looker Studio como aparecen en español, en negrita.
- Power BI Desktop es gratuito pero solo funciona en Windows: siempre se ofrece Looker Studio como alternativa equivalente.

**Páginas:** `/casos/[caso]`, `/casos/[caso]/[mision]` y `/casos/[caso]/datos/[archivo]` son estáticas, con `x-nextjs-cache: HIT`.

**Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Pedir por la ruta de descarga un archivo que no es una tabla del caso** (`secretos.csv`, otro caso o un caso inexistente). Responde 404 y no expone nada fuera de `content/casos/*/datos`. Test en Task 1.
2. **Abrir un CSV descargado con tildes y eñes** ("Sede Ñuñoa", "Dermatología"). El archivo llega en UTF-8 con `Content-Type: text/csv; charset=utf-8`, y la página explica cómo abrirlo en Excel sin que se rompan. Tests en Task 1 (unitario) y Task 4 (e2e).
3. **Calcular la inasistencia sin filtrar las consultas.** La especialidad "Urgencia" aparece en la lista y el diagnóstico dice "Tu consulta trae 8 filas, se esperan 7.". La decisión de la misión 3 explica por qué el denominador importa. Test e2e en Task 4.
4. **Alguien edita a mano un CSV o cambia la semilla.** La prueba "los CSV son los generados" falla, y "muestra lo que el dashboard tiene que contar" falla si el invierno en Maipú o las inasistencias de Dermatología dejan de verse. Tests en Task 2.
5. **Una afirmación del contenido que no es cierta en los datos:**
   - inasistencia de Dermatología: 21 % sobre consultas y 1 % sobre todas las atenciones;
   - la espera que se duplica de enero a junio;
   - que no haya avisos falsos en las consultas.

   Comprobado al planear; la Task 3, Step 3 lo vuelve a revisar con una prueba temporal.

## Estructura de archivos

```
apps/web/src/app/(misiones)/casos/[caso]/datos/[archivo]/route.ts   descarga de los CSV de cada caso
apps/web/src/components/mision/datos-del-caso.tsx                  sección "Datos del caso"
apps/web/src/app/(misiones)/casos/[caso]/page.tsx                  la muestra bajo el panel del caso
packages/content/src/generadores/clinica-cordillera-central.ts
packages/content/src/generar-cli.ts                                registra el generador
content/casos/clinica-cordillera-central/                           caso.yaml, datos/ (generados) y 7 misiones
content/rutas/data-analyst.yaml                                    agrega clinica-cordillera-central
e2e/tests/progreso.ts                                              agrega las misiones de tienda-online-pewen
e2e/tests/clinica.spec.ts, e2e/calentar.ts
README.md
```

---

### Task 1: Descargar los datos de cada caso

**Files:**
- Create: `apps/web/src/app/(misiones)/casos/[caso]/datos/[archivo]/route.ts`
- Test: `apps/web/src/app/(misiones)/casos/[caso]/datos/[archivo]/route.test.ts`
- Create: `apps/web/src/components/mision/datos-del-caso.tsx`
- Modify: `apps/web/src/app/(misiones)/casos/[caso]/page.tsx`

**Interfaces:**
- Consumes: `casosParaPublicar` y `obtenerCaso` (`@/lib/contenido`), y `Tabla` (`@syntaxerror/content/tipos`).
- Produces:
  - `GET /casos/[caso]/datos/[tabla].csv`: devuelve 200 con `text/csv; charset=utf-8` y `Content-Disposition: attachment; filename="<caso>-<tabla>.csv"`, o 404;
  - `generateStaticParams()`, que genera una ruta por cada tabla de cada caso publicado;
  - `DatosDelCaso({ caso, datos })`, que no muestra nada si el caso no tiene datos.

- [ ] **Step 1: Escribir las pruebas**

`apps/web/src/app/(misiones)/casos/[caso]/datos/[archivo]/route.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";

vi.stubEnv("CONTENT_INCLUDE_DRAFTS", "true");
const { GET, generateStaticParams } = await import("./route");

const pedir = (caso: string, archivo: string) => GET(new Request(`http://localhost:3000/casos/${caso}/datos/${archivo}`), { params: Promise.resolve({ caso, archivo }) });

describe("GET /casos/[caso]/datos/[archivo]", () => {
  it("entrega el CSV del caso para descargar, en UTF-8", async () => {
    const respuesta = await pedir("despachos-rapidos", "comunas.csv");
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(respuesta.headers.get("Content-Disposition")).toBe('attachment; filename="despachos-rapidos-comunas.csv"');
    const texto = await respuesta.text();
    expect(texto.split("\n")[0]).toBe("comuna,region,zona,tarifa,dias_compromiso");
    expect(texto).toContain("Ñuñoa");
  });

  it("responde 404 si el archivo o el caso no existen", async () => {
    expect((await pedir("despachos-rapidos", "secretos.csv")).status).toBe(404);
    expect((await pedir("no-existe", "comunas.csv")).status).toBe(404);
  });

  it("genera en el build una ruta por cada tabla de cada caso", async () => {
    const rutas = await generateStaticParams();
    expect(rutas).toContainEqual({ caso: "despachos-rapidos", archivo: "despachos_limpios.csv" });
    expect(rutas).toContainEqual({ caso: "minimarkets-del-sur", archivo: "ventas.csv" });
    expect(rutas.some((ruta) => ruta.caso === "herramientas-del-oficio")).toBe(false);
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter web exec vitest run "src/app/(misiones)"`
Expected: FAIL, "Failed to resolve import ./route".

- [ ] **Step 3: Implementar**

`apps/web/src/app/(misiones)/casos/[caso]/datos/[archivo]/route.ts`:
```ts
import { casosParaPublicar, obtenerCaso } from "@/lib/contenido";

// Los CSV de cada caso, para trabajar fuera de la plataforma: la planilla del entregable, el notebook en Colab o
// el dashboard en Power BI o Looker Studio. Se generan en el build, como las páginas del caso.
export const dynamic = "force-static";
export const dynamicParams = false;

type Parametros = { params: Promise<{ caso: string; archivo: string }> };

export async function generateStaticParams() {
  return (await casosParaPublicar()).flatMap((caso) => caso.datos.map((tabla) => ({ caso: caso.slug, archivo: `${tabla.nombre}.csv` })));
}

export async function GET(_request: Request, { params }: Parametros) {
  const { caso: slug, archivo } = await params;
  const caso = await obtenerCaso(slug);
  const tabla = caso?.datos.find((candidata) => `${candidata.nombre}.csv` === archivo);
  if (!caso || !tabla) return new Response("No encontramos ese archivo.", { status: 404 });
  return new Response(tabla.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${caso.slug}-${archivo}"`,
    },
  });
}
```

`apps/web/src/components/mision/datos-del-caso.tsx`:
```tsx
import type { Tabla } from "@syntaxerror/content/tipos";

// Los datos del caso para descargar: el entregable se hace fuera de la plataforma (planilla, notebook o dashboard).
export function DatosDelCaso({ caso, datos }: { caso: string; datos: Tabla[] }) {
  if (datos.length === 0) return null;
  return (
    <section aria-labelledby="datos-del-caso" className="card grid gap-3 p-5">
      <h2 id="datos-del-caso" className="text-xl font-bold">Datos del caso</h2>
      <p className="text-sm leading-6 text-muted-foreground">
        Descárgalos para tu entregable. Son archivos CSV en UTF-8, separados por coma. En Excel ábrelos con Datos → Obtener datos → Desde texto/CSV (así se ven bien las tildes y las columnas); en Google Sheets, con Archivo → Importar; en Python, con pd.read_csv.
      </p>
      <ul className="grid gap-2">
        {datos.map((tabla) => (
          <li key={tabla.nombre} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <a href={`/casos/${caso}/datos/${tabla.nombre}.csv`} download className="font-mono font-bold text-primary hover:underline">{`${tabla.nombre}.csv`}</a>
            <span className="text-sm text-muted-foreground">{`${tabla.filas.length} filas · ${Object.keys(tabla.filas[0] ?? {}).join(", ")}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

En `apps/web/src/app/(misiones)/casos/[caso]/page.tsx`:

1. Agrega el import:
```tsx
import { DatosDelCaso } from "@/components/mision/datos-del-caso";
```
2. Antes de `<ResenasCaso caso={caso.slug} />`, agrega:
```tsx
      <DatosDelCaso caso={caso.slug} datos={caso.datos} />
```

- [ ] **Step 4: Correr las pruebas y el build**

Run: `docker compose run --rm tools sh -c "cd apps/web && pnpm exec vitest run 'src/app/(misiones)' && pnpm exec tsc --noEmit -p . && pnpm build"`
Expected:
- PASS (3 pruebas) y sin errores de tipos;
- en la salida del build, `/casos/[caso]/datos/[archivo]` aparece como estática (○).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/(misiones)/casos/[caso]" apps/web/src/components/mision/datos-del-caso.tsx
git commit -m "feat(casos): descargar los datos de cada caso como csv

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Generador de datos de Clínica Cordillera Central

**Files:**
- Create: `packages/content/src/generadores/clinica-cordillera-central.ts`
- Test: `packages/content/src/generadores/clinica-cordillera-central.test.ts`
- Modify: `packages/content/src/generar-cli.ts`
- Create (generados): `content/casos/clinica-cordillera-central/datos/sedes.csv`, `especialidades.csv` y `atenciones.csv`

**Interfaces:**
- Consumes: `crearAleatorio`, `FilaDato` y `aCsv` (Fase 4b).
- Produces en `generadores/clinica-cordillera-central`:
  - `SEMILLA_CLINICA`, `CANTIDAD_ATENCIONES = 1200`;
  - `SEDE_SATURADA = 2` (Maipú) y `ESPECIALIDAD_CON_INASISTENCIAS = 4` (Dermatología);
  - `SEDES` y `ESPECIALIDADES`;
  - `generarClinicaCordilleraCentral(): { sedes; especialidades; atenciones }`.
- Produces las tablas que usa el caso:
  - `sedes`: id, nombre, comuna;
  - `especialidades`: id, nombre, area (la 8 es Urgencia);
  - `atenciones`: id, fecha, sede_id, especialidad_id, tipo (`consulta` o `urgencia`), estado (`atendida`, `inasistencia`, `cancelada` o `abandono`), espera_minutos (solo en urgencias), prevision.

- [ ] **Step 1: Escribir las pruebas**

`packages/content/src/generadores/clinica-cordillera-central.test.ts`:
```ts
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CANTIDAD_ATENCIONES, ESPECIALIDAD_CON_INASISTENCIAS, generarClinicaCordilleraCentral, SEDE_SATURADA } from "./clinica-cordillera-central";
import { aCsv } from "./despachos-rapidos";

const DATOS = fileURLToPath(new URL("../../../../content/casos/clinica-cordillera-central/datos/", import.meta.url));

describe("generarClinicaCordilleraCentral", () => {
  const datos = generarClinicaCordilleraCentral();
  const urgencias = datos.atenciones.filter((atencion) => atencion.tipo === "urgencia");
  const consultas = datos.atenciones.filter((atencion) => atencion.tipo === "consulta");
  const promedio = (valores: number[]) => valores.reduce((suma, valor) => suma + valor, 0) / valores.length;
  const esperaDe = (filtro: (atencion: Record<string, unknown>) => boolean) => promedio(urgencias.filter(filtro).map((atencion) => Number(atencion.espera_minutos)));

  it("genera siempre lo mismo", () => {
    expect(generarClinicaCordilleraCentral()).toEqual(datos);
  });

  it("los CSV del repositorio son los generados: no se editan a mano", async () => {
    for (const [tabla, filas] of Object.entries(datos)) {
      expect(await readFile(`${DATOS}${tabla}.csv`, "utf8"), tabla).toBe(aCsv(filas));
    }
  });

  it("las atenciones son coherentes y no tienen datos de pacientes", () => {
    expect(datos.atenciones).toHaveLength(CANTIDAD_ATENCIONES);
    expect(Object.keys(datos.atenciones[0])).toEqual(["id", "fecha", "sede_id", "especialidad_id", "tipo", "estado", "espera_minutos", "prevision"]);
    for (const atencion of urgencias) expect(Number(atencion.espera_minutos)).toBeGreaterThan(0);
    for (const atencion of consultas) {
      expect(atencion.espera_minutos).toBeNull();
      expect(atencion.estado).not.toBe("abandono");
    }
  });

  it("muestra lo que el dashboard tiene que contar: el invierno en Maipú y las inasistencias de Dermatología", () => {
    const deMes = (meses: string[]) => (atencion: Record<string, unknown>) => meses.some((mes) => String(atencion.fecha).startsWith(`2025-${mes}`));
    expect(esperaDe(deMes(["06"]))).toBeGreaterThan(esperaDe(deMes(["01"])) * 1.8);
    for (const sede of [1, 3, 4]) expect(esperaDe((atencion) => atencion.sede_id === SEDE_SATURADA)).toBeGreaterThan(esperaDe((atencion) => atencion.sede_id === sede));
    const tasa = (especialidad: number) => {
      const deLaEspecialidad = consultas.filter((atencion) => atencion.especialidad_id === especialidad);
      return deLaEspecialidad.filter((atencion) => atencion.estado === "inasistencia").length / deLaEspecialidad.length;
    };
    for (const otra of [1, 2, 3, 5, 6, 7]) expect(tasa(ESPECIALIDAD_CON_INASISTENCIAS)).toBeGreaterThan(tasa(otra) * 1.5);
  });
});
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run src/generadores/clinica-cordillera-central.test.ts`
Expected: FAIL, "Failed to resolve import ./clinica-cordillera-central".

- [ ] **Step 3: Implementar**

`packages/content/src/generadores/clinica-cordillera-central.ts`:
```ts
import { crearAleatorio } from "./aleatorio";
import type { FilaDato } from "./despachos-rapidos";

// Datos del Caso 4, "Clínica Cordillera Central": un centro de salud privado con cuatro sedes, consultas
// ambulatorias y urgencias, de enero a junio de 2025. Son inventados y no tienen ningún dato de pacientes.
// Lo que el dashboard tiene que mostrar: en invierno (mayo y junio) suben las urgencias y la espera, sobre todo
// en Maipú, y Dermatología tiene muchas más inasistencias que el resto de las especialidades.

export type DatosClinica = { sedes: FilaDato[]; especialidades: FilaDato[]; atenciones: FilaDato[] };

export const SEMILLA_CLINICA = 20250601;
export const CANTIDAD_ATENCIONES = 1200;
export const SEDE_SATURADA = 2;
export const ESPECIALIDAD_CON_INASISTENCIAS = 4;
const URGENCIA = 8;

export const SEDES: FilaDato[] = [
  { id: 1, nombre: "Sede Ñuñoa", comuna: "Ñuñoa" },
  { id: 2, nombre: "Sede Maipú", comuna: "Maipú" },
  { id: 3, nombre: "Sede La Florida", comuna: "La Florida" },
  { id: 4, nombre: "Sede Providencia", comuna: "Providencia" },
];

export const ESPECIALIDADES: FilaDato[] = [
  { id: 1, nombre: "Medicina general", area: "ambulatoria" },
  { id: 2, nombre: "Pediatría", area: "ambulatoria" },
  { id: 3, nombre: "Traumatología", area: "ambulatoria" },
  { id: 4, nombre: "Dermatología", area: "ambulatoria" },
  { id: 5, nombre: "Ginecología", area: "ambulatoria" },
  { id: 6, nombre: "Cardiología", area: "ambulatoria" },
  { id: 7, nombre: "Oftalmología", area: "ambulatoria" },
  { id: URGENCIA, nombre: "Urgencia", area: "urgencia" },
];

// Más atenciones en invierno, por los virus respiratorios.
const MESES = [[1, 1], [2, 0.9], [3, 1], [4, 1.1], [5, 1.4], [6, 1.6]] as const;
const DIAS: Record<number, number> = { 1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30 };
const PESO_SEDE = [[1, 3], [2, 4], [3, 3], [4, 2]] as const;
const PESO_ESPECIALIDAD = [[1, 6], [2, 4], [3, 3], [4, 2], [5, 3], [6, 2], [7, 2]] as const;
// Espera base en la sala de urgencia, en minutos, y cuánto sube en invierno.
const ESPERA_BASE: Record<number, number> = { 1: 40, 2: 60, 3: 50, 4: 35 };
const ALZA_INVIERNO: Record<number, number> = { 5: 20, 6: 35 };

const dosDigitos = (numero: number) => String(numero).padStart(2, "0");

export function generarClinicaCordilleraCentral(): DatosClinica {
  const aleatorio = crearAleatorio(SEMILLA_CLINICA);
  const atenciones: FilaDato[] = [];
  for (let indice = 0; indice < CANTIDAD_ATENCIONES; indice += 1) {
    const mes = aleatorio.elegirConPeso(MESES);
    const sede = aleatorio.elegirConPeso(PESO_SEDE);
    const invierno = mes >= 5;
    const esUrgencia = aleatorio.siguiente() < (invierno ? 0.5 : 0.33);
    const prevision = aleatorio.elegirConPeso([["Fonasa", 6], ["Isapre", 3], ["Particular", 1]] as const);
    const fecha = `2025-${dosDigitos(mes)}-${dosDigitos(aleatorio.entero(1, DIAS[mes]))}`;
    if (esUrgencia) {
      // En Maipú la sala de urgencia se satura en invierno: el alza le pega el doble.
      const alza = (ALZA_INVIERNO[mes] ?? 0) * (sede === SEDE_SATURADA ? 2 : 1);
      const espera = Math.max(5, ESPERA_BASE[sede] + alza + aleatorio.entero(-15, 15));
      const abandono = espera > 100 && aleatorio.siguiente() < 0.3;
      atenciones.push({ fecha, sede_id: sede, especialidad_id: URGENCIA, tipo: "urgencia", estado: abandono ? "abandono" : "atendida", espera_minutos: espera, prevision });
    } else {
      const especialidad = aleatorio.elegirConPeso(PESO_ESPECIALIDAD);
      const azar = aleatorio.siguiente();
      const inasistencia = especialidad === ESPECIALIDAD_CON_INASISTENCIAS ? 0.26 : 0.09;
      const estado = azar < inasistencia ? "inasistencia" : azar < inasistencia + 0.04 ? "cancelada" : "atendida";
      atenciones.push({ fecha, sede_id: sede, especialidad_id: especialidad, tipo: "consulta", estado, espera_minutos: null, prevision });
    }
  }
  atenciones.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  return { sedes: SEDES, especialidades: ESPECIALIDADES, atenciones: atenciones.map((atencion, indice) => ({ id: indice + 1, ...atencion })) };
}
```

En `packages/content/src/generar-cli.ts`:

1. Agrega el import:
```ts
import { generarClinicaCordilleraCentral } from "./generadores/clinica-cordillera-central";
```
2. Agrega a `generadores`:
```ts
  "clinica-cordillera-central": generarClinicaCordilleraCentral,
```

- [ ] **Step 4: Generar y correr las pruebas**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content generar`
Expected: los datos de los casos 1 a 3 sin cambios, más:
```
[content] casos/clinica-cordillera-central/datos/sedes.csv: 4 filas
[content] casos/clinica-cordillera-central/datos/especialidades.csv: 8 filas
[content] casos/clinica-cordillera-central/datos/atenciones.csv: 1200 filas
```

Las primeras líneas de `atenciones.csv` deben ser exactamente estas:
```
id,fecha,sede_id,especialidad_id,tipo,estado,espera_minutos,prevision
1,2025-01-01,2,2,consulta,atendida,,Fonasa
2,2025-01-01,2,8,urgencia,atendida,47,Isapre
```

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/content exec vitest run src/generadores && pnpm --filter @syntaxerror/content exec tsc --noEmit -p ."`
Expected: PASS (20 pruebas) y sin errores de tipos. `git status` no debe mostrar cambios en los datos de los otros casos.

- [ ] **Step 5: Commit**

```bash
git add packages/content/src/generadores packages/content/src/generar-cli.ts content/casos/clinica-cordillera-central/datos
git commit -m "feat(contenido): generador reproducible de los datos de clinica cordillera central

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: El contenido del Caso 4

**Files:**
- Create: `content/casos/clinica-cordillera-central/caso.yaml` y sus 7 misiones
- Modify: `content/rutas/data-analyst.yaml`

**Interfaces:**
- Consumes:
  - los datos de la Task 2;
  - `MarkdownTask` y `GithubTask` (Fase 4a);
  - `SqlTask` y `SqlEjemplo`;
  - la descarga de datos de la Task 1, que la misión 6 menciona.
- Produces:
  - el caso `clinica-cordillera-central`, quinto en la ruta;
  - estos ids de tarea, por misión:
    1. `ficha-del-dashboard`;
    2. `atenciones-con-nombres` y `control-por-tipo`;
    3. `tasa-de-inasistencia` y `espera-por-sede`;
    4. `serie-mensual-de-urgencias` y `ranking-de-inasistencia`;
    5. `boceto-del-dashboard`;
    6. `dashboard-publicado`;
    7. `presentacion-al-directorio`.

El recorrido del caso:

| # | Misión | Tarea | Repasa |
|---|---|---|---|
| 1 | La pregunta del dashboard | Markdown: la ficha (audiencia, preguntas e indicadores) | Caso 0 |
| 2 | Preparar los datos | SQL: hechos y dimensiones con dos `JOIN`, y un control de filas | Caso 2 |
| 3 | Calcular indicadores | SQL: tasa con `CASE WHEN` y promedio de espera | 2 |
| 4 | Elegir el gráfico | SQL: los datos con la forma de cada gráfico (serie mensual y ranking) | 3, Caso 2 |
| 5 | Diseñar el dashboard | Markdown: el boceto (jerarquía, orden de lectura y tabla de elementos) | 1 y 4 |
| 6 | Construir el dashboard | GitHub: `{usuario}/dashboard-clinica` con capturas y README; guías de Power BI y Looker Studio | Caso 0 |
| 7 | Presentar en cinco minutos (sin guía) | GitHub: el README como guion, con capturas, secciones y commits | todo |

- [ ] **Step 1: Caso y ruta**

`content/casos/clinica-cordillera-central/caso.yaml`:
```yaml
slug: clinica-cordillera-central
titulo: "Clínica Cordillera Central: un dashboard para decidir"
cargo: Analista de datos junior en el área de gestión
empresa: Clínica Cordillera Central
dataset: Atenciones de enero a junio de 2025 en cuatro sedes, sin datos de pacientes (datos generados con un script reproducible)
entregable: Un repositorio en GitHub con tu dashboard (el archivo .pbix de Power BI o el enlace público de Looker Studio), capturas de cada página en la carpeta capturas y un README que funcione como guion de una presentación de cinco minutos.
archivos:
  - .png
rubrica:
  - "El dashboard responde las preguntas de la gerencia, para la audiencia que se definió."
  - "Cada indicador está bien definido (qué se cuenta y sobre qué total) y se muestra con un gráfico adecuado."
  - "El diseño se lee fácil: lo importante arriba, títulos que dicen la conclusión, filtros útiles y colores accesibles."
  - "El README presenta los hallazgos y una recomendación en cinco minutos, con capturas que los respaldan."
misiones:
  - 01-la-pregunta-del-dashboard
  - 02-preparar-los-datos
  - 03-calcular-indicadores
  - 04-elegir-el-grafico
  - 05-disenar-el-dashboard
  - 06-construir-el-dashboard
  - 07-presentar-en-cinco-minutos
```

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
  - despachos-rapidos
  - minimarkets-del-sur
  - tienda-online-pewen
  - clinica-cordillera-central
```

- [ ] **Step 2: Las misiones (copia literal)**

`content/casos/clinica-cordillera-central/misiones/01-la-pregunta-del-dashboard.mdx`:
```mdx
---
titulo: La pregunta del dashboard
tiempo: 25
---

<Brief de="Carolina Pizarro, gerenta de operaciones de Clínica Cordillera Central">
Bienvenida o bienvenido a la clínica. Tenemos cuatro sedes con consultas y urgencias, y cada mes llego a la reunión de directorio con planillas que nadie alcanza a leer. Quiero un dashboard. Pero antes de dibujar nada, escribe la ficha del dashboard: para quién es, qué preguntas responde y con qué indicadores, cada uno bien definido.
</Brief>

<Concepto>
Un **dashboard** no es una colección de gráficos: es la respuesta a unas pocas preguntas de una audiencia concreta. Antes de construirlo se escribe una **ficha**:

1. **Audiencia:** quién lo mira y qué decisiones toma. El directorio decide inversiones; la jefatura de urgencia decide turnos.
2. **Preguntas:** tres o cuatro, como mucho. Por ejemplo: «¿cuánto esperan los pacientes en urgencia?».
3. **Indicadores:** cada pregunta se responde con un indicador definido sin ambigüedad.

| Indicador | Fórmula | Frecuencia |
| --- | --- | --- |
| Espera promedio en urgencia | promedio de minutos de espera de las urgencias | mensual |
| Tasa de inasistencia | consultas a las que el paciente no llegó ÷ todas las consultas | mensual |

Definir bien el **denominador** evita discusiones después: ¿la inasistencia es sobre las consultas agendadas o sobre todas las atenciones, incluidas las urgencias? Son números muy distintos.

La ficha se escribe en Markdown, como el README del Caso 0.
</Concepto>

<MarkdownTask
  id="ficha-del-dashboard"
  enunciado="Escribe la ficha del dashboard de la clínica: un título, al menos tres secciones (por ejemplo Audiencia, Preguntas e Indicadores), una lista y una tabla con los indicadores y sus fórmulas."
  inicial="Ficha del dashboard de operaciones"
  requisitos={["titulo", "subtitulos:3", "lista", "tabla"]}
  solucion={"# Dashboard de operaciones\n\n## Audiencia\n\nDirectorio de la clínica, una vez al mes.\n\n## Preguntas\n\n- ¿Cuánto esperan los pacientes en urgencia en cada sede?\n- ¿Qué especialidades pierden más horas por inasistencia?\n- ¿Cómo cambia la demanda mes a mes?\n\n## Indicadores\n\n| Indicador | Fórmula | Frecuencia |\n| --- | --- | --- |\n| Espera en urgencia | promedio de minutos de espera de las urgencias | mensual |\n| Tasa de inasistencia | inasistencias ÷ consultas | mensual |"}
  pistas={["Cada sección empieza con ## y un espacio.", "La tabla necesita la fila de encabezados, la línea | --- | --- | --- | y al menos una fila con un indicador.", "Las preguntas quedan bien como lista: una por línea, empezando con «- »."]}
/>

<Decision
  pregunta="El jefe de urgencia te pide agregar al dashboard del directorio el detalle de espera por hora y por box. ¿Qué haces?"
  opciones={[
    { texto: "Le propongo una página o un dashboard aparte para su equipo: el directorio necesita la tendencia, no el detalle por box.", correcta: true, porque: "Cada audiencia decide cosas distintas. Mezclar niveles de detalle hace que nadie encuentre lo suyo." },
    { texto: "Lo agrego: mientras más información, mejor.", porque: "Un dashboard con todo no responde nada: el directorio tendría que buscar entre gráficos que no le sirven." },
  ]}
/>

<Debrief entrevista="Una pregunta habitual para analistas: '¿cómo empiezas un dashboard?'. La mejor respuesta no menciona ninguna herramienta: 'pregunto para quién es, qué decisiones toma y cómo se define cada indicador'.">
La ficha es el contrato del dashboard: audiencia, preguntas e indicadores bien definidos. Con ella puedes decir que no a lo que no corresponde y revisar después si el dashboard cumple.
</Debrief>
```

`content/casos/clinica-cordillera-central/misiones/02-preparar-los-datos.mdx`:
```mdx
---
titulo: Preparar los datos
tiempo: 25
---

<Brief de="Carolina Pizarro, gerenta de operaciones de Clínica Cordillera Central">
Te dejé tres tablas: las atenciones, las sedes y las especialidades. El sistema guarda solo códigos en las atenciones, y en el dashboard necesitamos nombres. Prepara una tabla con cada atención y los nombres de su sede y su especialidad, y antes de seguir, comprueba cuántas atenciones hay de cada tipo.
</Brief>

<Concepto>
Los datos para un dashboard suelen organizarse en un **modelo estrella**:

- Una **tabla de hechos**, con lo que pasó y se puede contar o sumar: `atenciones` (una fila por atención, con fecha, estado y minutos de espera).
- **Tablas de dimensiones**, que describen los hechos y sirven para filtrar y agrupar: `sedes` y `especialidades`.

En **Power BI** se cargan las tres tablas y se relacionan por sus códigos (`sede_id` con `id`). En **Looker Studio** conviene una sola tabla con los nombres ya incluidos. En los dos casos, el cruce es el mismo `JOIN` del Caso 2:

<SqlEjemplo consulta="SELECT a.id, s.nombre AS sede, a.tipo FROM atenciones a JOIN sedes s ON a.sede_id = s.id LIMIT 5" />

Después de preparar los datos, un **control**: contar las filas por algún criterio conocido y compararlo con el origen. Si el cruce perdió o duplicó filas, el dashboard mostrará números equivocados sin avisar.
</Concepto>

<SqlTask
  id="atenciones-con-nombres"
  enunciado="Trae de cada atención su fecha, el nombre de la sede (como sede), el nombre de la especialidad (como especialidad), el tipo, el estado y los minutos de espera, en ese orden."
  solucion="SELECT a.fecha, s.nombre AS sede, e.nombre AS especialidad, a.tipo, a.estado, a.espera_minutos FROM atenciones a JOIN sedes s ON a.sede_id = s.id JOIN especialidades e ON a.especialidad_id = e.id"
  comparar="filas-sin-orden"
  pistas={["Son dos JOIN: uno con sedes y otro con especialidades.", "La sede se une por sede_id y la especialidad por especialidad_id.", "Con alias, cada columna lleva su tabla: a.fecha, s.nombre AS sede."]}
/>

<SqlTask
  id="control-por-tipo"
  enunciado="Control: trae cada tipo de atención y cuántas atenciones tiene."
  solucion="SELECT tipo, COUNT(*) AS atenciones FROM atenciones GROUP BY tipo"
  comparar="filas-sin-orden"
  pistas={["Agrupa la tabla atenciones por tipo.", "COUNT(*) cuenta las filas de cada grupo."]}
/>

<Decision
  pregunta="Tu tabla preparada tiene 1.180 filas y la tabla de atenciones tiene 1.200. ¿Qué pasó?"
  opciones={[
    { texto: "Algunas atenciones tienen un código que no existe en sedes o especialidades, y el JOIN las dejó fuera. Hay que encontrarlas antes de seguir.", correcta: true, porque: "Un JOIN deja fuera lo que no tiene pareja. Contar antes y después es la forma de notarlo." },
    { texto: "No importa: son 20 de 1.200, menos del 2 %.", porque: "Esas 20 pueden ser justo las de una sede o un mes, y cambiar las conclusiones. Primero se entiende la diferencia." },
  ]}
/>

<Debrief entrevista="En entrevistas para analista de BI suelen preguntar por el modelo estrella. Explica la diferencia entre hechos (lo que se cuenta) y dimensiones (cómo se filtra y agrupa), con un ejemplo de tu propio proyecto.">
Preparar los datos es dejar una tabla de hechos con sus dimensiones, o una sola tabla con los nombres incluidos, y controlar que no se pierdan filas en el camino. Un dashboard nunca es mejor que los datos que lo alimentan.
</Debrief>
```

`content/casos/clinica-cordillera-central/misiones/03-calcular-indicadores.mdx`:
```mdx
---
titulo: Calcular indicadores
tiempo: 30
---

<Brief de="Carolina Pizarro, gerenta de operaciones de Clínica Cordillera Central">
Ahora los números de la ficha. Para cada especialidad, la tasa de inasistencia de sus consultas, con dos decimales. Y para cada sede, la espera promedio en urgencia, en minutos enteros. Ojo con las definiciones: la inasistencia se mide sobre las consultas, no sobre las urgencias.
</Brief>

<Concepto>
Una **tasa** se calcula como casos ÷ total. En SQL, `CASE WHEN` convierte cada fila en 1 o 0 según si cumple la condición, y `SUM` cuenta los casos:

<SqlEjemplo consulta="SELECT SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) AS canceladas, COUNT(*) AS consultas FROM atenciones WHERE tipo = 'consulta'" />

Para la tasa se divide, y se multiplica por `1.0` para que la división tenga decimales:

`ROUND(SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 2)`

Dos cuidados que cambian el resultado:
- **El denominador lo define el `WHERE`.** Con `WHERE tipo = 'consulta'` la tasa es sobre las consultas; sin él, sobre todas las atenciones.
- **`AVG` ignora los vacíos.** Las consultas no tienen minutos de espera (están vacíos), así que el promedio de espera solo considera las urgencias. Igual conviene filtrarlas: deja clara la definición.
</Concepto>

<SqlTask
  id="tasa-de-inasistencia"
  enunciado="Trae el nombre de cada especialidad y su tasa de inasistencia en consultas (inasistencias ÷ consultas), redondeada a 2 decimales."
  solucion="SELECT e.nombre, ROUND(SUM(CASE WHEN a.estado = 'inasistencia' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 2) AS tasa FROM atenciones a JOIN especialidades e ON a.especialidad_id = e.id WHERE a.tipo = 'consulta' GROUP BY e.nombre"
  comparar="filas-sin-orden"
  pistas={["Filtra las consultas con WHERE a.tipo = 'consulta' y agrupa por el nombre de la especialidad.", "Cuenta las inasistencias con SUM(CASE WHEN a.estado = 'inasistencia' THEN 1 ELSE 0 END).", "Divide por COUNT(*), multiplica por 1.0 para tener decimales y redondea con ROUND(…, 2)."]}
/>

<SqlTask
  id="espera-por-sede"
  enunciado="Trae el nombre de cada sede y la espera promedio de sus urgencias, redondeada a minutos enteros."
  solucion="SELECT s.nombre, ROUND(AVG(a.espera_minutos), 0) AS espera FROM atenciones a JOIN sedes s ON a.sede_id = s.id WHERE a.tipo = 'urgencia' GROUP BY s.nombre"
  comparar="filas-sin-orden"
  pistas={["Filtra las urgencias y agrupa por el nombre de la sede.", "El promedio de los minutos es AVG(a.espera_minutos), redondeado con ROUND(…, 0)."]}
/>

<Decision
  pregunta="Alguien calculó la inasistencia de Dermatología sobre todas las atenciones de la clínica, incluidas las urgencias, y le dio 1 %. Tú obtienes 21 %. ¿Cuál va al dashboard?"
  opciones={[
    { texto: "El 21 %: es la proporción de consultas de Dermatología a las que el paciente no llegó, que es lo que la ficha define.", correcta: true, porque: "El denominador tiene que ser el grupo que podía faltar: las consultas de esa especialidad. Otro denominador diluye el problema." },
    { texto: "El 1 %, porque usa más datos.", porque: "Usar más filas no hace mejor un indicador: lo hace responder otra pregunta, y aquí esconde un problema real." },
  ]}
/>

<Debrief entrevista="Cuando presentes un indicador en una entrevista, di su fórmula en voz alta: 'inasistencias sobre consultas agendadas, por especialidad'. Mostrar el denominador es lo que separa a un analista cuidadoso.">
Un indicador es una fórmula con un denominador explícito. `CASE WHEN` con `SUM` cuenta casos, `AVG` promedia sin los vacíos y el `WHERE` define sobre qué total se calcula.
</Debrief>
```

`content/casos/clinica-cordillera-central/misiones/04-elegir-el-grafico.mdx`:
```mdx
---
titulo: Elegir el gráfico
tiempo: 25
---

<Brief de="Carolina Pizarro, gerenta de operaciones de Clínica Cordillera Central">
En la última reunión alguien mostró un gráfico de torta con doce colores y nadie entendió nada. Quiero que cada gráfico del dashboard tenga una razón. Prepara los datos para dos: cómo evolucionan las urgencias y su espera mes a mes, y el ranking de especialidades por inasistencia, de mayor a menor.
</Brief>

<Concepto>
El gráfico se elige según la pregunta, no según lo que se vea más bonito:

| Pregunta | Gráfico | Por qué |
| --- | --- | --- |
| ¿Cómo cambia en el tiempo? | Línea | el ojo sigue la tendencia de izquierda a derecha |
| ¿Quién está más arriba? | Barras horizontales, ordenadas | se comparan largos y caben los nombres |
| ¿Cuánto es ahora? | Número grande (tarjeta o KPI) | se lee en un segundo |
| ¿Qué parte del total? | Barras apiladas al 100 %, o torta con dos o tres partes | con más partes la torta no se lee |

Cada gráfico necesita los datos **en la forma correcta**: para una línea, una fila por mes y en orden; para un ranking, ya ordenado de mayor a menor. Si el ranking no viene ordenado, quien lo mire tiene que ordenar con los ojos.

Dos reglas que evitan engañar sin querer: las barras parten en cero, y un eje no cambia de escala entre gráficos que se comparan.
</Concepto>

<SqlTask
  id="serie-mensual-de-urgencias"
  enunciado="Para el gráfico de línea: trae el número de cada mes, cuántas urgencias hubo y su espera promedio en minutos enteros, ordenado por mes."
  solucion="SELECT MONTH(fecha) AS mes, COUNT(*) AS urgencias, ROUND(AVG(espera_minutos), 0) AS espera FROM atenciones WHERE tipo = 'urgencia' GROUP BY MONTH(fecha) ORDER BY mes"
  comparar="filas-en-orden"
  pistas={["Filtra las urgencias y agrupa por MONTH(fecha), como en las ventas por mes del Caso 2.", "Una línea necesita los meses en orden: ORDER BY mes."]}
/>

<SqlTask
  id="ranking-de-inasistencia"
  enunciado="Para el gráfico de barras: trae el nombre de cada especialidad y su tasa de inasistencia en consultas, con 2 decimales, de la más alta a la más baja."
  solucion="SELECT e.nombre, ROUND(SUM(CASE WHEN a.estado = 'inasistencia' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 2) AS tasa FROM atenciones a JOIN especialidades e ON a.especialidad_id = e.id WHERE a.tipo = 'consulta' GROUP BY e.nombre ORDER BY tasa DESC"
  comparar="filas-en-orden"
  pistas={["Es la tasa de la misión de indicadores.", "Agrégale el orden: ORDER BY tasa DESC."]}
/>

<Decision
  pregunta="Para mostrar la tasa de inasistencia de las siete especialidades, ¿qué gráfico usas?"
  opciones={[
    { texto: "Barras horizontales ordenadas de mayor a menor, con la tasa escrita al final de cada barra.", correcta: true, porque: "Se lee de un vistazo quién está peor, y los nombres de las especialidades caben completos." },
    { texto: "Una torta con siete colores.", porque: "Las tasas no son partes de un total: no suman 100 %. Además, con siete porciones nadie compara ángulos." },
    { texto: "Una línea que una las siete especialidades.", porque: "La línea sugiere una secuencia en el tiempo, y entre especialidades no la hay." },
  ]}
/>

<Debrief entrevista="Es común que en una entrevista muestren un gráfico malo y pregunten qué cambiarías. Responde con la pregunta que el gráfico debería responder y elige desde ahí: línea para el tiempo, barras ordenadas para comparar.">
El gráfico se elige por la pregunta: línea para el tiempo, barras ordenadas para comparar, número grande para el estado actual. Y los datos se preparan en la forma que cada gráfico necesita.
</Debrief>
```

`content/casos/clinica-cordillera-central/misiones/05-disenar-el-dashboard.mdx`:
```mdx
---
titulo: Diseñar el dashboard
tiempo: 25
---

<Brief de="Carolina Pizarro, gerenta de operaciones de Clínica Cordillera Central">
Antes de abrir la herramienta, quiero ver un boceto: qué va arriba, qué va abajo, qué filtros tiene y en qué orden se lee. Escríbelo como un documento corto. Si el directorio no entiende el dashboard en un minuto, no sirve.
</Brief>

<Concepto>
Un buen dashboard se lee como una página: de arriba hacia abajo y de izquierda a derecha.

1. **Arriba, los números clave** (tarjetas o KPI): espera promedio en urgencia, tasa de inasistencia y atenciones del mes.
2. **Al medio, la tendencia:** la línea de urgencias y espera por mes.
3. **Abajo, el detalle:** el ranking de especialidades y la comparación entre sedes.

Otras decisiones de diseño:
- **Filtros** solo los que la audiencia usa: sede y mes. Cada filtro extra es una pregunta más.
- **Títulos que dicen la conclusión:** «La espera en urgencia se duplicó en junio» dice más que «Espera por mes».
- **Colores con propósito:** un color neutro para todo y uno de alerta solo para lo que requiere atención. Evita depender de rojo contra verde: cerca de uno de cada doce hombres no los distingue bien.
</Concepto>

<MarkdownTask
  id="boceto-del-dashboard"
  enunciado="Escribe el boceto del dashboard: un título, al menos tres secciones (por ejemplo Arriba, Al medio y Abajo), una lista numerada con el orden de lectura y una tabla con cada elemento, su tipo de gráfico y la pregunta que responde."
  inicial="Boceto del dashboard"
  requisitos={["titulo", "subtitulos:3", "lista-numerada", "tabla"]}
  solucion={"# Boceto del dashboard de operaciones\n\n## Arriba\n\nTres tarjetas: espera en urgencia, tasa de inasistencia y atenciones del mes.\n\n## Al medio\n\nLínea de urgencias y espera por mes.\n\n## Abajo\n\nRanking de inasistencia por especialidad y espera por sede.\n\n## Orden de lectura\n\n1. Tarjetas con el estado actual.\n2. Tendencia de urgencias.\n3. Detalle por especialidad y sede.\n\n| Elemento | Gráfico | Pregunta |\n| --- | --- | --- |\n| Espera en urgencia | tarjeta | ¿Cuánto esperan hoy? |\n| Urgencias por mes | línea | ¿Cómo cambia en el año? |\n| Inasistencia | barras ordenadas | ¿Qué especialidad pierde más horas? |"}
  pistas={["Cada sección empieza con ## y un espacio.", "Una lista numerada se escribe 1., 2. y 3., cada número en su línea.", "La tabla puede tener tres columnas: Elemento, Gráfico y Pregunta."]}
/>

<Decision
  pregunta="¿Qué colores usas para las tarjetas de la espera en urgencia de cada sede?"
  opciones={[
    { texto: "Un gris neutro para todas y un naranjo solo para la sede que supera la meta, con el valor escrito.", correcta: true, porque: "El color de alerta llama la atención justo donde se necesita, y el número escrito no depende de distinguir colores." },
    { texto: "Verde para las que están bien y rojo para las que están mal, sin números.", porque: "Muchas personas no distinguen bien el rojo del verde, y sin el valor escrito no se sabe cuánto falta." },
    { texto: "Un color distinto para cada sede, para que se vea alegre.", porque: "El color deja de significar algo: el ojo busca un patrón que no existe." },
  ]}
/>

<Debrief entrevista="Si te piden comentar un dashboard en una entrevista, recórrelo en voz alta en el orden en que se lee y di qué decisión permite tomar cada parte. Eso demuestra que diseñas para la audiencia y no para la herramienta.">
El boceto ordena el dashboard antes de construirlo: lo importante arriba, la tendencia al medio y el detalle abajo, con pocos filtros, títulos que concluyen y colores con propósito.
</Debrief>
```

`content/casos/clinica-cordillera-central/misiones/06-construir-el-dashboard.mdx`:
```mdx
---
titulo: Construir el dashboard
tiempo: 60
---

<Brief de="Carolina Pizarro, gerenta de operaciones de Clínica Cordillera Central">
Con la ficha y el boceto aprobados, ahora sí: construye el dashboard. Si tienes Windows, usa Power BI Desktop, que es lo que más piden las empresas; si no, Looker Studio, que funciona en el navegador. Súbelo a un repositorio llamado dashboard-clinica, con capturas en una carpeta capturas y un README con una imagen y el enlace al dashboard o al archivo.
</Brief>

<Concepto>
Los datos del caso se descargan desde la página del caso, en «Datos del caso».

**Con Power BI Desktop (gratis, solo en Windows):**
1. Instálalo desde la Microsoft Store y ábrelo; no necesitas cuenta para trabajar en tu computador.
2. **Obtener datos** → **Texto/CSV** y carga `atenciones.csv`, `sedes.csv` y `especialidades.csv`.
3. En la vista **Modelo**, revisa que `atenciones[sede_id]` esté relacionada con `sedes[id]` y `atenciones[especialidad_id]` con `especialidades[id]`.
4. Crea las medidas de la ficha, por ejemplo `Espera promedio = AVERAGE(atenciones[espera_minutos])`.
5. Arma las páginas según tu boceto, con **Tarjeta**, **Gráfico de líneas** y **Gráfico de barras agrupadas**, y agrega segmentaciones por sede y mes.
6. Guarda el archivo `.pbix` y toma una captura de cada página.

**Con Looker Studio (gratis, en el navegador):**
1. Entra a lookerstudio.google.com con una cuenta de Google y crea un **Informe en blanco**.
2. Sube los tres CSV con **Agregar datos** → **Subir archivo**. Luego únelos en **Recurso** → **Administrar combinaciones**: atenciones con sedes por `sede_id` = `id`, y con especialidades por `especialidad_id` = `id`. Es el mismo cruce de la misión 2.
3. Crea los **campos calculados** de la ficha, por ejemplo la tasa de inasistencia.
4. Arma la página según tu boceto con **Cuadro de resultados**, **Gráfico de series temporales** y **Gráfico de barras**, y agrega **Controles** de sede y fecha.
5. **Compartir** → «Cualquier persona con el enlace puede ver», y copia ese enlace.

**En el repositorio:** crea `dashboard-clinica`, sube las capturas a la carpeta `capturas/` (en formato `.png`) y escribe un README con un título, al menos una captura como imagen y el enlace al dashboard de Looker Studio o al archivo `.pbix` del repositorio.
</Concepto>

<GithubTask
  id="dashboard-publicado"
  enunciado="Sube tu dashboard al repositorio dashboard-clinica, con sus capturas, y revisamos."
  repositorio="{usuario}/dashboard-clinica"
  requisitos={["publico", "carpeta:capturas", "extension:.png", "readme:titulo", "readme:imagen", "readme:enlace"]}
  pistas={["Las capturas van dentro de la carpeta capturas: al subirlas, nombra el archivo como capturas/resumen.png.", "Una imagen del repositorio se muestra en el README con ![Resumen del dashboard](capturas/resumen.png).", "El enlace puede ir al dashboard de Looker Studio o al archivo .pbix: [Abrir el dashboard](…)."]}
/>

<Decision
  pregunta="Terminaste el dashboard. Antes de mandarlo, ¿qué revisas?"
  opciones={[
    { texto: "Que los números de las tarjetas coincidan con los que calculé con SQL en la misión de indicadores.", correcta: true, porque: "Una medida mal escrita en la herramienta da un número creíble y equivocado. Comparar con un cálculo independiente lo detecta." },
    { texto: "Que todos los gráficos tengan colores distintos.", porque: "El color no hace correcto un número. Lo primero es que los indicadores coincidan con su definición." },
  ]}
/>

<Debrief entrevista="Si te preguntan si sabes Power BI o Looker Studio, muestra tu dashboard y cuenta cómo validaste los números: 'comparé cada tarjeta con una consulta SQL'. Eso pesa más que listar funciones de la herramienta.">
Power BI y Looker Studio cambian de botones, pero el trabajo es el mismo: cargar datos preparados, definir indicadores, seguir el boceto y validar los números. Tu repositorio deja el dashboard a la vista de quien te quiera contratar.
</Debrief>
```

`content/casos/clinica-cordillera-central/misiones/07-presentar-en-cinco-minutos.mdx`:
```mdx
---
titulo: Presentar en cinco minutos
tiempo: 45
sinGuia: true
---

<Brief de="Carolina Pizarro, gerenta de operaciones de Clínica Cordillera Central">
El directorio te da cinco minutos el lunes. Prepara la presentación del dashboard como un README en tu repositorio: un título, el contexto, tus hallazgos con las capturas que los respaldan y lo que recomiendas, en el orden en que lo vas a contar. Que el historial muestre cómo lo fuiste armando. Cuando esté, pega el enlace.
</Brief>

<GithubTask
  id="presentacion-al-directorio"
  enunciado="Pega el enlace del repositorio con tu presentación."
  requisitos={["publico", "carpeta:capturas", "commits:3", "readme:titulo", "readme:subtitulos:3", "readme:lista-numerada", "readme:imagen"]}
/>

<Decision
  pregunta="¿Con qué abres los cinco minutos frente al directorio?"
  opciones={[
    { texto: "Con la conclusión principal y su número, por ejemplo cuánto subió la espera en urgencia de Maipú en junio, y después muestro cómo llegué a ella.", correcta: true, porque: "Si la reunión se corta en el minuto dos, el directorio ya escuchó lo más importante." },
    { texto: "Explicando cómo preparé los datos y qué herramienta usé.", porque: "Al directorio le importa qué decidir; el método se cuenta solo si lo preguntan." },
  ]}
/>

<Debrief entrevista="Muchos procesos de selección para analista terminan con una presentación de un caso. Practica la estructura: conclusión, dos o tres hallazgos con su gráfico y una recomendación concreta, en cinco minutos y con reloj.">
Este repositorio es tu entregable del caso: el dashboard, sus capturas y una presentación que se puede contar en cinco minutos. Envíalo desde la página del caso para que lo revisen con la rúbrica.
</Debrief>
```

- [ ] **Step 3: Validar**

Run: `docker compose run --rm tools pnpm --filter @syntaxerror/content validate`
Expected: `[content] ok: 2 rutas, 6 casos, 43 misiones`.

Compara cada `.mdx` con el de este plan (con `diff`): deben ser idénticos.

Revisa además, sin agregarla al repositorio, que las consultas no tengan avisos y que las afirmaciones de las decisiones sean ciertas. Corre esta prueba temporal en `packages/content/sonda.test.ts` con `docker compose run --rm tools pnpm --filter @syntaxerror/content exec vitest run sonda.test.ts`, y bórrala después:
```ts
import { expect, it } from "vitest";
import { avisosSql } from "@syntaxerror/engines/sql-errores";
import { ejecutarConsulta } from "@syntaxerror/engines/sql";
import { cargarContenido } from "./src/cargar";
import { tablasSql } from "./src/datos";

it("las consultas del caso no tienen avisos y las decisiones dicen la verdad", async () => {
  const contenido = await cargarContenido("/app/content");
  const caso = contenido.casos.find((candidato) => candidato.slug === "clinica-cordillera-central")!;
  const tablas = tablasSql(caso);
  for (const mision of caso.misiones) {
    for (const bloque of mision.bloques) {
      if (bloque.tipo === "SqlTask") expect(avisosSql(bloque.props.solucion, tablas), bloque.props.id).toEqual([]);
      if (bloque.tipo === "SqlEjemplo") expect(avisosSql(bloque.props.consulta, tablas), bloque.props.consulta).toEqual([]);
    }
  }
  const sobreTodo = ejecutarConsulta(tablas, "SELECT ROUND(SUM(CASE WHEN estado = 'inasistencia' AND especialidad_id = 4 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) AS pct FROM atenciones");
  expect(sobreTodo).toMatchObject({ ok: true, filas: [{ pct: 1 }] });
  const serie = ejecutarConsulta(tablas, "SELECT MONTH(fecha) AS mes, ROUND(AVG(espera_minutos), 0) AS espera FROM atenciones WHERE tipo = 'urgencia' GROUP BY MONTH(fecha) ORDER BY mes");
  expect(serie).toMatchObject({ ok: true, filas: expect.arrayContaining([{ mes: 1, espera: 45 }, { mes: 6, espera: 95 }]) });
});
```

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && cd apps/web && pnpm exec tsc --noEmit -p . && pnpm build"`
Expected: PASS en todos los paquetes y el build con las páginas estáticas.

- [ ] **Step 4: Commit**

```bash
git add content
git commit -m "feat(contenido): caso 4 clinica cordillera central, siete misiones de visualizacion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: e2e y README

**Files:**
- Create: `e2e/tests/clinica.spec.ts`
- Modify: `e2e/tests/progreso.ts`, `e2e/calentar.ts`, `README.md`

**Interfaces:**
- Consumes: `registrarse`, `aprobar`, `completarCaso` y `entrarComoAdmin` (`./progreso`), los ids de la Task 3 y la descarga de la Task 1.
- Produces:
  - `MISIONES["tienda-online-pewen"]` en `progreso.ts`;
  - `e2e/tests/clinica.spec.ts`, con 2 pruebas.

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

`e2e/tests/clinica.spec.ts`:
```ts
import { expect, test } from "./fixtures";
import { aprobar, completarCaso, entrarComoAdmin, registrarse } from "./progreso";

const CASO = "clinica-cordillera-central";

test("los datos de un caso se descargan como CSV desde la página del caso", async ({ page }) => {
  await page.goto(`/casos/${CASO}`);
  const enlace = page.getByRole("link", { name: "atenciones.csv" });
  await expect(enlace).toHaveAttribute("href", `/casos/${CASO}/datos/atenciones.csv`);
  await expect(page.getByText("1200 filas", { exact: false })).toBeVisible();
  const respuesta = await page.request.get(`/casos/${CASO}/datos/sedes.csv`);
  expect(respuesta.headers()["content-type"]).toBe("text/csv; charset=utf-8");
  expect(await respuesta.text()).toContain("Sede Ñuñoa");
});

test("con los casos 0 a 3 completos: escribe la ficha del dashboard y calcula un indicador", async ({ page, ip, nuevaPagina }) => {
  test.setTimeout(300_000);
  const email = await registrarse(page, "Matías Contreras");
  const admin = await nuevaPagina();
  await entrarComoAdmin(admin);
  for (const caso of ["herramientas-del-oficio", "despachos-rapidos", "minimarkets-del-sur", "tienda-online-pewen"]) await completarCaso(page, admin, ip, email, caso);

  await page.goto(`/casos/${CASO}/01-la-pregunta-del-dashboard`);
  await page.getByLabel("Tu README").fill("# Dashboard de operaciones\n\n## Audiencia\n\nDirectorio.\n\n## Preguntas\n\n- ¿Cuánto esperan en urgencia?\n\n## Indicadores\n\n| Indicador | Fórmula |\n| --- | --- |\n| Espera | promedio de minutos |");
  await expect(page.getByRole("region", { name: "Vista previa" }).getByRole("table")).toBeVisible();
  // Se espera a que la aprobación llegue al servidor: la misión 2 la exige.
  const aprobada = page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST");
  await page.getByRole("button", { name: "Validar" }).click();
  await aprobada;
  await expect(page.getByText("¡Tarea aprobada!")).toBeVisible();

  await aprobar(page, ip, CASO, [
    ["02-preparar-los-datos", "atenciones-con-nombres"],
    ["02-preparar-los-datos", "control-por-tipo"],
  ]);
  await page.goto(`/casos/${CASO}/03-calcular-indicadores`);
  const consultas = page.getByLabel("Consulta SQL");
  await consultas.first().fill("SELECT e.nombre, ROUND(SUM(CASE WHEN a.estado = 'inasistencia' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 2) AS tasa FROM atenciones a JOIN especialidades e ON a.especialidad_id = e.id GROUP BY e.nombre");
  await page.getByRole("button", { name: "Validar" }).first().click();
  // Sin filtrar las consultas, la especialidad Urgencia se suma a la lista.
  await expect(page.getByText("Tu consulta trae 8 filas, se esperan 7.")).toBeVisible();
  await consultas.first().fill("SELECT e.nombre, ROUND(SUM(CASE WHEN a.estado = 'inasistencia' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 2) AS tasa FROM atenciones a JOIN especialidades e ON a.especialidad_id = e.id WHERE a.tipo = 'consulta' GROUP BY e.nombre");
  await page.getByRole("button", { name: "Validar" }).first().click();
  await expect(page.getByText("¡Tarea aprobada!").first()).toBeVisible();
});
```

En `e2e/calentar.ts`, agrega a `RUTAS`, antes de `"/casos/demo-motor"`:
```ts
  "/casos/clinica-cordillera-central",
  "/casos/clinica-cordillera-central/03-calcular-indicadores",
```

Run: `npm run test:e2e -- tests/clinica.spec.ts`
Expected: `2 passed`.

- [ ] **Step 2: README**

Agrega al final de `README.md`:
```markdown
## Caso 4: Clínica Cordillera Central

- **Datos generados:** `packages/content/src/generadores/clinica-cordillera-central.ts`, con semilla fija.
  - 4 sedes, 8 especialidades y 1200 atenciones de enero a junio de 2025, sin ningún dato de pacientes.
  - Lo que el dashboard tiene que mostrar: en invierno la espera en urgencia se duplica (en Maipú llega a 129 minutos en junio, con todos los abandonos) y Dermatología tiene 21 % de inasistencia.
- **Dentro y fuera de la plataforma:**
  - Dentro se resuelven la ficha y el boceto (`MarkdownTask`), los datos e indicadores (`SqlTask`) y el criterio (decisiones).
  - El dashboard se construye en Power BI Desktop (Windows) o Looker Studio (navegador) y se entrega en GitHub con capturas: `GithubTask` verifica el repositorio y la rúbrica evalúa el dashboard.

## Datos de los casos

- Cada caso con datos muestra "Datos del caso" en su página, con enlaces para descargar sus CSV: `/casos/<caso>/datos/<tabla>.csv`.
- Los CSV van en UTF-8, separados por coma y sin BOM. En Excel se abren con Datos → Obtener datos → Desde texto/CSV.
- Las rutas se generan en el build, solo para los casos publicados.
```

- [ ] **Step 3: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes.

Run: `npm run test:e2e`
Expected: `37 passed`. Dos corridas seguidas deben dar lo mismo.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml up -d --force-recreate --wait web && for p in /casos/clinica-cordillera-central /casos/clinica-cordillera-central/06-construir-el-dashboard /casos/clinica-cordillera-central/datos/atenciones.csv; do curl -s -o /dev/null localhost:3000$p; curl -s -D - -o /dev/null localhost:3000$p | grep -i x-nextjs-cache; done; docker compose up -d --force-recreate web`
Expected: `x-nextjs-cache: HIT` tres veces. Al final, `web` vuelve a modo desarrollo.

- [ ] **Step 4: Probar la guía de verdad**

Descarga los tres CSV desde la página del caso y sigue la guía de la misión 6 en Looker Studio, y en Power BI si tienes Windows. Revisa tres cosas:
- que cada paso exista con ese nombre en la herramienta;
- que la combinación de datos de Looker Studio dé 1200 filas;
- que la espera promedio de Maipú sea 85 minutos, como en la misión 3.

Si un menú cambió de nombre, corrige la guía.

- [ ] **Step 5: Commit**

```bash
git add e2e README.md
git commit -m "test(e2e): caso 4 con ficha del dashboard, indicador sin filtrar explicado y descarga de datos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

**Fase 4f: el Caso 5, Proyecto final, "Tu propio análisis".**
- Una lista curada de datos abiertos chilenos (INE, datos.gob.cl, SII, Mineduc), con enlaces y una descripción de cada uno.
- Misiones para elegir la pregunta, explorar y limpiar, analizar, visualizar, escribir conclusiones y limitaciones, y publicar.
- Las tareas combinan `MarkdownTask` (pregunta, plan, conclusiones) y `GithubTask` (el repositorio del proyecto, que crece misión a misión).
- Es la pieza principal del portafolio y cierra la ruta con el certificado de Data Analyst.
