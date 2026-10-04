# Fase 7c: Descargar el certificado. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el certificado se descargue en PDF con un botón, como en la v1, pero con el diseño de la página del certificado de la v2.

**Architecture:**
- **El PDF de la v1 era solo texto** (`Certificado de finalizacion`, sin tildes y sin diseño). El de la v2 repite la página `/certificados/<código>`:
  - marca, título, nombre, caso o ruta, cargo, fecha y código;
  - más la dirección completa para verificarlo;
  - en blanco, con el violeta de la marca y un marco, en A4 apaisado.
- **Se genera con `@react-pdf/renderer`**, la misma librería de la v1, con Helvetica y Courier. Esas fuentes vienen en todo lector de PDF y cubren tildes, ñ, «¿» y «¡».
- **La descarga es `GET /certificados/<código>/pdf`.** Es pública, como la página del certificado, y entrega `certificado-<código>.pdf`. Generar el PDF cuesta CPU, así que se limita a **30 descargas cada 10 minutos por IP** (`certificado-pdf` en `rate-limit.ts`).
- **El botón "Descargar PDF"** va junto a "Imprimir", en la página del certificado.
- **Dos ajustes de configuración:**
  - **`next.config.ts`:** pdfkit carga sus fuentes con un `require` dinámico que el standalone no copia. Sin `outputFileTracingIncludes`, el PDF funciona en desarrollo y falla solo en producción (`Cannot find module .../Helvetica.cjs`). Lo detectó el e2e.
  - **`vitest.config.ts`:** Vitest 4 transforma con oxc, no con esbuild, así que `esbuild: { jsx: "automatic" }` ya no tenía efecto. Es la primera prueba de `web` que importa JSX. Pasa a `oxc: { jsx: { runtime: "automatic" } }`.
- **Se suma la prueba "Escape cierra la ventana de búsqueda"** (Task 3), que quedó fuera de la 7b.

**Tech Stack:** Next 15, `@react-pdf/renderer` 4, Vitest 4 y Playwright 1.55.

**Spec:** decisión del 2026-10-03 de traer las funciones de la v1 (fase 7c).

## Global Constraints

- **Entorno:** todo se ejecuta con `docker compose run --rm tools ...`. El paquete de la app se llama `web`.
- **Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **El PDF en producción:** la imagen standalone tiene que incluir las fuentes de pdfkit. Probado en `cuenta.spec.ts`, que descarga el PDF contra la imagen de producción.
2. **Un código inexistente** responde 404. Probado en `route.test.ts`.
3. **Muchas descargas desde una IP:** desde la 31 en 10 minutos responde 429 con `Retry-After`. Probado en `route.test.ts`.
4. **Un certificado migrado de la v1** (sin cargo) también se descarga. Probado en `pdf.test.ts` y `route.test.ts`.

---

### Task 1: El PDF del certificado

**Files:**
- Modify: `apps/web/package.json` y `pnpm-lock.yaml` (dependencia), `apps/web/vitest.config.ts`
- Create: `apps/web/src/lib/certificados/pdf.tsx`
- Test: `apps/web/src/lib/certificados/pdf.test.ts`

**Interfaces:**
- Produces: `generarCertificadoPdf(certificado: CertificadoPublico, sitio: string): Promise<Buffer>`.

- [ ] **Step 1: La dependencia**

Run: `docker compose run --rm tools pnpm --filter web add @react-pdf/renderer@^4.9.0`
Expected: `apps/web/package.json` suma `"@react-pdf/renderer": "^4.9.0"`.

- [ ] **Step 2: Escribir la prueba**

`apps/web/src/lib/certificados/pdf.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { generarCertificadoPdf } from "./pdf";
import type { CertificadoPublico } from "./servicio";

const CERTIFICADO: CertificadoPublico = {
  codigo: "ABC123XYZ0",
  tipo: "ruta",
  titulo: "Data Analyst",
  cargo: "Analista de datos junior",
  nombreAlumno: "María José Fernández",
  emitidoEn: new Date("2026-10-04T15:00:00Z"),
  legado: false,
};

describe("generarCertificadoPdf", () => {
  it("genera un PDF A4 apaisado con el código y la dirección de verificación", async () => {
    const pdf = await generarCertificadoPdf(CERTIFICADO, "https://syntaxerror.cl");
    const texto = pdf.toString("latin1");
    expect(texto.startsWith("%PDF-")).toBe(true);
    // Los metadatos van sin comprimir: el título y el asunto llevan el código y la dirección para verificarlo.
    expect(texto).toContain("Certificado ABC123XYZ0");
    expect(texto).toContain("https://syntaxerror.cl/verificar/ABC123XYZ0");
    // A4 apaisado: 841.89 x 595.28 puntos.
    expect(texto).toMatch(/\/MediaBox \[0 0 841\.89\d* 595\.28\d*\]/);
  });

  it("funciona con un certificado de la v1, sin cargo", async () => {
    const pdf = await generarCertificadoPdf({ ...CERTIFICADO, tipo: "curso", cargo: null, legado: true }, "https://syntaxerror.cl");
    expect(pdf.toString("latin1").startsWith("%PDF-")).toBe(true);
  });
});
```

- [ ] **Step 3: Correr y ver que falla**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/certificados/pdf.test.ts"`
Expected: FAIL, `Cannot find module './pdf'`.

- [ ] **Step 4: Implementar**

`apps/web/src/lib/certificados/pdf.tsx`:
```tsx
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { descripcionCertificado, fechaCertificado } from "./formato";
import type { CertificadoPublico } from "./servicio";

// El PDF que se descarga desde la página del certificado. Repite su diseño (la v1 tenía un PDF de solo texto), en
// blanco para imprimir, con el violeta de la marca. Helvetica y Courier vienen en todo lector de PDF y cubren las
// tildes, la ñ, «¿» y «¡».
const VIOLETA = "#7c3aed";
const TEXTO = "#18181b";
const SUAVE = "#52525b";

const estilos = StyleSheet.create({
  pagina: { padding: 36, backgroundColor: "#ffffff", color: TEXTO, fontFamily: "Helvetica" },
  marco: { flexGrow: 1, borderWidth: 2, borderColor: VIOLETA, borderRadius: 6, padding: 36, alignItems: "center", justifyContent: "center" },
  marca: { fontFamily: "Courier-Bold", fontSize: 12, letterSpacing: 2, color: VIOLETA, textTransform: "uppercase" },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 44, marginTop: 8 },
  descripcion: { fontSize: 13, color: SUAVE, marginTop: 6 },
  etiqueta: { fontFamily: "Helvetica-Bold", fontSize: 10, color: SUAVE, textTransform: "uppercase", marginTop: 32 },
  nombre: { fontFamily: "Helvetica-Bold", fontSize: 34, marginTop: 8, textAlign: "center" },
  porCompletar: { fontSize: 12, color: SUAVE, marginTop: 26 },
  materia: { fontFamily: "Helvetica-Bold", fontSize: 20, marginTop: 6, textAlign: "center" },
  cargo: { fontSize: 12, color: SUAVE, marginTop: 4 },
  pie: { marginTop: 34, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#e4e4e7", alignItems: "center" },
  dato: { fontSize: 10, color: SUAVE, marginTop: 3 },
  codigo: { fontFamily: "Courier-Bold", color: TEXTO },
});

export async function generarCertificadoPdf(certificado: CertificadoPublico, sitio: string): Promise<Buffer> {
  const verificacion = `${sitio.replace(/\/$/, "")}/verificar/${certificado.codigo}`;
  return renderToBuffer(
    <Document title={`Certificado ${certificado.codigo}`} subject={`Verifica este certificado en ${verificacion}`} author="syntaxError.cl" creator="syntaxError.cl" language="es-CL">
      <Page size="A4" orientation="landscape" style={estilos.pagina}>
        <View style={estilos.marco}>
          <Text style={estilos.marca}>syntaxError.cl</Text>
          <Text style={estilos.titulo}>Certificado</Text>
          <Text style={estilos.descripcion}>{descripcionCertificado(certificado)}</Text>
          <Text style={estilos.etiqueta}>Otorgado a</Text>
          <Text style={estilos.nombre}>{certificado.nombreAlumno}</Text>
          <Text style={estilos.porCompletar}>Por completar</Text>
          <Text style={estilos.materia}>{certificado.titulo}</Text>
          {certificado.cargo ? <Text style={estilos.cargo}>{certificado.cargo}</Text> : null}
          <View style={estilos.pie}>
            <Text style={estilos.dato}>{`Emitido el ${fechaCertificado(certificado.emitidoEn)}`}</Text>
            <Text style={estilos.dato}>
              Código de verificación: <Text style={estilos.codigo}>{certificado.codigo}</Text>
            </Text>
            <Text style={estilos.dato}>{`Verifícalo en ${verificacion}`}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
```

`apps/web/vitest.config.ts` completo:
```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vitest 4 transforma con oxc, que toma "jsx: preserve" del tsconfig de Next: aquí se compila el JSX de verdad.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    globalSetup: ["../../packages/db/src/global-setup.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: process.env.DATABASE_URL_TEST ?? "" },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

- [ ] **Step 5: Correr las pruebas**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run src/lib/certificados && npx tsc --noEmit"`
Expected: PASS y sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/vitest.config.ts apps/web/src/lib/certificados/pdf.tsx apps/web/src/lib/certificados/pdf.test.ts
git commit -m "feat(certificados): el pdf del certificado con el diseno de su pagina

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: La descarga

**Files:**
- Create: `apps/web/src/app/(certificado)/certificados/[codigo]/pdf/route.ts`
- Test: `apps/web/src/app/(certificado)/certificados/[codigo]/pdf/route.test.ts`
- Modify: `apps/web/src/lib/rate-limit.ts`, `apps/web/src/app/(certificado)/certificados/[codigo]/page.tsx`, `apps/web/next.config.ts`, `e2e/tests/cuenta.spec.ts`, `README.md`

**Interfaces:**
- Consumes: `generarCertificadoPdf` (Task 1).
- Produces: `GET /certificados/<código>/pdf` y el límite `"certificado-pdf"`.

- [ ] **Step 1: Escribir la prueba**

`apps/web/src/app/(certificado)/certificados/[codigo]/pdf/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { certificadosLegacy } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

const { GET } = await import("./route");
const { db, close } = createTestDb();

// Cada prueba usa su propia IP: el límite queda guardado en Redis entre pruebas.
const descargar = (codigo: string, ip = crypto.randomUUID()) =>
  GET(new Request(`http://localhost:3000/certificados/${codigo}/pdf`, { headers: { "x-forwarded-for": ip } }), { params: Promise.resolve({ codigo }) });

beforeEach(async () => {
  await truncateAll(db);
  await db.insert(certificadosLegacy).values({ codigo: "LEGADO1234", nombreAlumno: "Ana Rojas", titulo: "SQL desde cero", tipo: "curso", emitidoEn: new Date("2026-01-15T12:00:00Z") });
});
afterAll(() => close());

describe("GET /certificados/[codigo]/pdf", () => {
  it("descarga el PDF del certificado con su código en el nombre", async () => {
    const respuesta = await descargar("LEGADO1234");
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("content-type")).toBe("application/pdf");
    expect(respuesta.headers.get("content-disposition")).toBe('attachment; filename="certificado-LEGADO1234.pdf"');
    expect(Buffer.from(await respuesta.arrayBuffer()).toString("latin1").startsWith("%PDF-")).toBe(true);
  });

  it("un código que no existe responde 404", async () => {
    expect((await descargar("NOEXISTE00")).status).toBe(404);
  });

  it("desde la descarga 31 en diez minutos, la misma IP recibe 429", async () => {
    const ip = crypto.randomUUID();
    for (let intento = 0; intento < 30; intento++) expect((await descargar("NOEXISTE00", ip)).status).toBe(404);
    const limitada = await descargar("LEGADO1234", ip);
    expect(limitada.status).toBe(429);
    expect(Number(limitada.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run 'src/app/(certificado)'"`
Expected: FAIL, no existe `./route`.

- [ ] **Step 3: La ruta y el límite**

`apps/web/src/app/(certificado)/certificados/[codigo]/pdf/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { generarCertificadoPdf } from "@/lib/certificados/pdf";
import { buscarCertificado } from "@/lib/certificados/servicio";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { siteConfig } from "@/lib/seo";

export const dynamic = "force-dynamic";

// El PDF del certificado, como la página: público para quien tenga el código. Generarlo cuesta CPU, así que se
// limita por IP.
export async function GET(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const limite = await checkRateLimit("certificado-pdf", getClientIp(request.headers));
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const { codigo } = await params;
  const certificado = await buscarCertificado(getDb(), codigo);
  if (!certificado) return NextResponse.json({ error: "no_encontrado" }, { status: 404 });

  const pdf = await generarCertificadoPdf(certificado, siteConfig.url);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-${certificado.codigo}.pdf"`,
    },
  });
}
```

En `apps/web/src/lib/rate-limit.ts`:
1. `RateLimitKey` termina en:
```ts
  | "github"
  | "certificado-pdf";
```
2. Al final de `LIMITER_CONFIGS`, después de `github`, agrega:
```ts
  // Descargar el PDF de un certificado es público y cada descarga genera el archivo.
  "certificado-pdf": { points: 30, duration: 600 },
```

Run: `docker compose run --rm tools sh -c "cd apps/web && npx vitest run 'src/app/(certificado)'"`
Expected: PASS (3 pruebas).

- [ ] **Step 4: El botón y el standalone**

`apps/web/src/app/(certificado)/certificados/[codigo]/page.tsx` completo:
```tsx
import { Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { buttonVariants } from "@syntaxerror/ui/components/button";
import { BotonImprimir } from "@/components/certificados/boton-imprimir";
import { descripcionCertificado, fechaCertificado } from "@/lib/certificados/formato";
import { buscarCertificado } from "@/lib/certificados/servicio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Certificado" };

type Parametros = { params: Promise<{ codigo: string }> };

export default async function CertificadoPage({ params }: Parametros) {
  const { codigo } = await params;
  const certificado = await buscarCertificado(getDb(), codigo);
  if (!certificado) notFound();

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground print:bg-white print:px-0 print:py-0">
      <div className="mx-auto grid max-w-5xl gap-4 print:max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link className="font-bold text-primary hover:underline" href={`/verificar/${certificado.codigo}`}>
            Verificar autenticidad
          </Link>
          <div className="flex flex-wrap gap-2">
            <a className={buttonVariants({ variant: "primary" })} href={`/certificados/${certificado.codigo}/pdf`} download>
              <Download className="size-4" aria-hidden="true" />
              Descargar PDF
            </a>
            <BotonImprimir />
          </div>
        </div>
        <section className="grid min-h-[720px] place-items-center border border-border bg-surface p-8 text-center print:min-h-screen print:border-0 print:bg-white">
          <div className="grid max-w-3xl gap-8">
            <div className="grid gap-2">
              <p className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-primary">syntaxError.cl</p>
              <h1 className="text-4xl font-black sm:text-6xl">Certificado</h1>
              <p className="text-lg text-muted-foreground">{descripcionCertificado(certificado)}</p>
            </div>
            <div className="grid gap-3">
              <p className="text-sm font-bold uppercase text-muted-foreground">Otorgado a</p>
              <p className="text-3xl font-black sm:text-5xl">{certificado.nombreAlumno}</p>
            </div>
            <div className="grid gap-2">
              <p className="text-muted-foreground">Por completar</p>
              <p className="text-2xl font-black">{certificado.titulo}</p>
              {certificado.cargo ? <p className="text-muted-foreground">{certificado.cargo}</p> : null}
            </div>
            <div className="mx-auto grid max-w-xl gap-2 border-t border-border pt-6 text-sm text-muted-foreground">
              <p>Emitido el {fechaCertificado(certificado.emitidoEn)}</p>
              <p>Código de verificación: <span className="font-mono font-bold text-foreground">{certificado.codigo}</span></p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
```

En `apps/web/next.config.ts`, después de `serverExternalPackages: ["bullmq"],`, agrega:
```ts
  // pdfkit (bajo @react-pdf/renderer) carga sus fuentes con un require dinámico que el trazado del standalone no
  // ve: sin esto, el PDF del certificado falla solo en producción (Cannot find module .../Helvetica.cjs).
  outputFileTracingIncludes: {
    "/certificados/[codigo]/pdf": ["../../node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/standard-fonts/**"],
  },
```

- [ ] **Step 5: e2e y README**

En `e2e/tests/cuenta.spec.ts`:
1. Agrega al comienzo:
```ts
import { readFileSync } from "node:fs";
```
2. En "completar el caso emite el certificado...", después de `const codigo = new URL(page.url()).pathname.split("/").pop();`, agrega:
```ts
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar PDF" }).click();
  const pdf = await descarga;
  expect(pdf.suggestedFilename()).toBe(`certificado-${codigo}.pdf`);
  expect(readFileSync((await pdf.path()) ?? "").subarray(0, 5).toString()).toBe("%PDF-");
```

En `README.md`, sección "Emails, cuenta y certificados", la oración de los certificados queda:
> Se ven en `/certificados/<código>`, se descargan en PDF desde `/certificados/<código>/pdf` (con `@react-pdf/renderer`, el mismo diseño de la página y la dirección para verificarlo; 30 descargas cada 10 minutos por IP) o se imprimen desde el navegador, y cualquiera los verifica en `/verificar/<código>`, que también busca los certificados migrados de la v1.

Run: `npm run test:e2e -- tests/cuenta.spec.ts`
Expected: PASS. Sin el cambio en `next.config.ts`, la descarga llega como `pdf.txt` y el log del servidor dice `Cannot find module .../Helvetica.cjs`.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/app/(certificado)" apps/web/src/lib/rate-limit.ts apps/web/next.config.ts e2e/tests/cuenta.spec.ts README.md
git commit -m "feat(certificados): descargar el certificado en pdf, como en la v1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Escape cierra la búsqueda

**Files:**
- Test: `e2e/tests/busqueda.spec.ts`

- [ ] **Step 1: La prueba**

Al final de `e2e/tests/busqueda.spec.ts`, agrega:
```ts
test("Escape cierra la ventana de búsqueda", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Buscar" }).click();
  const ventana = page.getByRole("dialog", { name: "Buscar en syntaxError.cl" });
  await expect(ventana).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(ventana).toBeHidden();
});
```

- [ ] **Step 2: Correr todo**

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec tsc --noEmit && pnpm -r --if-present test"`
Expected: sin errores de tipos; web 343 pruebas.

Run: `npm run test:e2e`
Expected: `50 passed`, dos corridas seguidas.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/busqueda.spec.ts
git commit -m "test(e2e): escape cierra la ventana de busqueda

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

7d: el carrusel de la portada.
