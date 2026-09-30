# Fase 3a: Cuentas, certificados, portafolio y emails. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el alumno gestione su cuenta (confirmar email, cambiar nombre, email y contraseña, recuperar la contraseña olvidada, descargar sus datos y eliminar su cuenta), reciba un certificado verificable al completar un caso o una ruta, y pueda publicar su portafolio en `/p/<usuario>`, con los emails de cuenta enviados por el worker.

**Architecture:**
- `packages/queue` define una sola cola `emails` en BullMQ, con un tipo de trabajo por email. La web encola y falla rápido si Redis no responde. El worker consume, arma el email con la plantilla de la v1 y lo envía por SMTP a Mailpit en local o por la API de Resend en producción (Railway bloquea SMTP saliente).
- Los tokens de email (verificar y cambiar email) se guardan hasheados con SHA-256 y se consumen con `DELETE ... RETURNING`: son de un solo uso aunque alguien haga doble clic. Las páginas de confirmación piden un clic que hace `POST`: un antivirus que abre el enlace no confirma nada.
- Los certificados se emiten cuando la API de progreso o de entregables detecta un caso completo. Guardan una foto fija (nombre del alumno, título y cargo) y un código de 12 caracteres. `/verificar/[codigo]` busca primero en `certificados` y después en `certificados_legacy` (la Fase 5 llena esa tabla).
- El certificado se ve en `/certificados/[codigo]` como una página imprimible (el navegador la guarda en PDF), en vez del PDF que la v1 generaba en el servidor con `@react-pdf/renderer`. **Decisión tomada:** así no se suma RAM al servidor web (spec §14: menos de 512 MB) y el certificado mantiene la identidad visual del sitio.
- Recuperar la contraseña (Task 11) responde lo mismo exista o no la cuenta, para no revelar qué emails están registrados. El enlace dura una hora y sirve una vez. También les sirve a las cuentas de Google para crear una contraseña. Es clave para los alumnos que se migran de la v1 (Fase 5).
- Eliminar la cuenta está disponible para todos: las cuentas con contraseña la confirman con ella, y las de Google escribiendo su email.
- El portafolio público es opcional y parte apagado: la alumna elige su usuario y decide publicarlo (ley 21.719 de datos personales).

**Tech Stack:** Node 22, pnpm 11.9.0, Next.js 15, React 19, TypeScript 5, Auth.js v5, Drizzle ORM 0.36, BullMQ 5, nodemailer 6, Mailpit, Vitest 4, Playwright 1.55.

**Spec:** `docs/superpowers/specs/2026-09-29-syntaxerror-v2-design.md` (secciones 9 [Cuentas, Aprendizaje, Portafolio, Emails], 10 [certificados legacy], 12 y 16 [Fase 3]).

## Global Constraints

- Todo se ejecuta en contenedores. Ningún paso corre `pnpm` o `node` en el host: se usa `docker compose run --rm tools ...`.
- Si los contenedores de la v1 (`cursos-*`) están arriba, ocupan los puertos 5432, 5433, 6379, 1025 y 8025: detenlos antes con `docker compose -p cursos stop`.
- Nombre del paquete nuevo: `@syntaxerror/queue`. Agrega su volumen `node_modules` a `x-node.volumes` y a `volumes:` de `docker-compose.yml`.
- Todo el texto visible para el alumno, incluidos los emails, va en español de Chile, con tildes y `¿`/`¡` (tú, no voseo).
- Las páginas de misiones, rutas y casos siguen estáticas (`dynamic = "error"`). Ningún componente que se use en ellas ni en `not-found.tsx` puede llamar a `auth()`.
- Una acción del alumno no falla porque no se pudo encolar un aviso (clave cambiada, cuenta eliminada, certificado emitido, verificación al registrarse): se registra el error y se sigue. Sí falla, con 503, la solicitud de cambio de email, porque sin ese email el alumno no puede confirmar.
- Los tests de rutas de API mockean `@/lib/emails` y `@/lib/sesion`: no encolan en la cola real ni dependen de Auth.js.
- Commits: mensajes en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Enlace de confirmación usado dos veces o después de otro cambio:** el segundo uso debe dar "no es válido". Un enlace de verificación viejo no debe confirmar un email que la cuenta ya no tiene. Tests en Task 4.
2. **Cuenta creada con Google (sin contraseña):** cambiar email, eliminar la cuenta y ver el perfil deben funcionar sin pedir una contraseña que no existe. Para eliminar, se confirma escribiendo el email. Tests en Task 5.
3. **Email nuevo tomado por otra cuenta entre la solicitud y la confirmación:** debe dar "ese email ya está en uso", no un error 500 por el índice único. Test en Task 5.
4. **Caso completado dos veces** (repetir la última tarea o volver a guardar el entregable): no debe emitir un segundo certificado ni mandar un segundo email. Test en Task 7.
5. **Redis caído al registrarse o al cambiar la contraseña:** la acción debe terminar bien y solo se pierde el aviso. Al pedir el cambio de email, la respuesta debe ser un error claro en menos de 4 segundos. Tests en Tasks 1 y 6.

## Estructura de archivos

```
packages/queue/src/emails.ts              cola "emails": tipos de trabajo, productor y conexiones
apps/worker/src/emails/
  plantilla.ts                            plantilla HTML y texto con la identidad de la v1
  mensajes.ts                             un email por tipo de trabajo
  enviar.ts                               SMTP (Mailpit) o Resend
  procesar.ts                             procesador de la cola
apps/worker/src/testing/mailpit.ts        leer emails recibidos en tests
apps/web/src/lib/emails.ts                encolarEmail y encolarSinFallar
apps/web/src/lib/cuenta/
  tokens.ts, enlaces.ts, meta.ts          tokens de un uso, URLs de los emails, IP y user agent
  verificacion.ts                         verificar el email al registrarse
  perfil.ts                               nombre, clave, email, exportar y eliminar
  recuperacion.ts                         recuperar la contraseña olvidada (Task 11)
  cliente.ts                              enviarJson para los formularios
apps/web/src/lib/certificados/
  servicio.ts                             emitir, buscar (con legacy) y listar
  otorgar.ts                              emitir y avisar por email
apps/web/src/lib/portafolio.ts            usuario, publicación y lectura del portafolio
apps/web/src/app/api/cuenta/**            rutas de la cuenta
apps/web/src/app/(cuenta)/                verificar-email, confirmar-email, verificar/[codigo], p/[usuario]
apps/web/src/app/(certificado)/certificados/[codigo]/   certificado imprimible
apps/web/src/app/(dashboard)/perfil/      página de perfil
apps/web/src/components/cuenta/*          formularios del perfil y confirmación de tokens
e2e/tests/cuenta.spec.ts, e2e/tests/mailpit.ts
```

---

### Task 1: `packages/queue` (cola de emails)

**Files:**
- Create: `packages/queue/package.json`, `tsconfig.json`, `vitest.config.ts`
- Create: `packages/queue/src/emails.ts`
- Test: `packages/queue/src/emails.test.ts`
- Modify: `docker-compose.yml` (volumen `queue_node_modules`)

**Interfaces:**
- Consumes: Redis (`REDIS_URL`).
- Produces (`@syntaxerror/queue/emails`):
  - `COLA_EMAILS = "emails"`;
  - `type TrabajoEmail`, unión por `tipo`, siempre con `para: string` y `nombre: string | null`:
    - `"verificar-email"` y `"confirmar-nuevo-email"`, con `enlace`;
    - `"aviso-cambio-email"`, con `nuevoEmail`;
    - `"clave-cambiada"` y `"cuenta-eliminada"`;
    - `"certificado-emitido"`, con `titulo` y `enlace`;
  - `type ColaEmails = { encolar(trabajo: TrabajoEmail): Promise<void>; cerrar(): Promise<void> }`;
  - `crearColaEmails(url: string, opciones?: { nombre?: string; limiteMs?: number }): ColaEmails`: 5 reintentos con espera exponencial, y rechaza si Redis no responde en `limiteMs` (3 s por defecto);
  - `conexionWorker(url: string): ConnectionOptions` (con `maxRetriesPerRequest: null`, como exige BullMQ).

- [ ] **Step 1: Crear `package.json`, `tsconfig.json` y `vitest.config.ts`**

`packages/queue/package.json`:
```json
{
  "name": "@syntaxerror/queue",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./emails": "./src/emails.ts"
  },
  "scripts": { "test": "vitest run" },
  "dependencies": {
    "bullmq": "^5.34.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vitest": "^4.1.9"
  }
}
```

`packages/queue/tsconfig.json`:
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "types": ["node"] }, "include": ["src"] }
```

`packages/queue/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", testTimeout: 15_000, fileParallelism: false },
});
```

En `docker-compose.yml`, agregar a `x-node.volumes` `- queue_node_modules:/app/packages/queue/node_modules`, y en `volumes:` agregar `queue_node_modules:`.

- [ ] **Step 2: Escribir el test que falla, `src/emails.test.ts`**

```ts
import { Queue } from "bullmq";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { conexionWorker, crearColaEmails, type TrabajoEmail } from "./emails";

const url = process.env.REDIS_URL ?? "redis://redis:6379";
const nombre = `emails-test-${process.pid}`;
const inspector = new Queue(nombre, { connection: conexionWorker(url) });

afterEach(() => inspector.obliterate({ force: true }));
afterAll(() => inspector.close());

describe("crearColaEmails", () => {
  it("encola el trabajo con su tipo como nombre y 5 reintentos", async () => {
    const cola = crearColaEmails(url, { nombre });
    const trabajo: TrabajoEmail = { tipo: "clave-cambiada", para: "ana@correo.cl", nombre: "Ana" };
    await cola.encolar(trabajo);

    const [job] = await inspector.getJobs(["waiting"]);
    expect(job.name).toBe("clave-cambiada");
    expect(job.data).toEqual(trabajo);
    expect(job.opts.attempts).toBe(5);
    await cola.cerrar();
  });

  it("falla en menos de 4 segundos si Redis no está, en vez de dejar colgada la request", async () => {
    const cola = crearColaEmails("redis://127.0.0.1:6390", { nombre, limiteMs: 1_500 });
    const inicio = Date.now();
    await expect(cola.encolar({ tipo: "clave-cambiada", para: "ana@correo.cl", nombre: null })).rejects.toThrow();
    expect(Date.now() - inicio).toBeLessThan(4_000);
    void cola.cerrar().catch(() => {});
  });
});
```

- [ ] **Step 3: Instalar y ver fallar el test**

Run: `docker compose run --rm tools pnpm install && docker compose run --rm tools pnpm --filter @syntaxerror/queue test`
Expected: FAIL, porque no se puede resolver `./emails`.

- [ ] **Step 4: Crear `src/emails.ts`**

```ts
import { Queue, type ConnectionOptions } from "bullmq";

export const COLA_EMAILS = "emails";

type Destinatario = { para: string; nombre: string | null };

export type TrabajoEmail =
  | (Destinatario & { tipo: "verificar-email"; enlace: string })
  | (Destinatario & { tipo: "confirmar-nuevo-email"; enlace: string })
  | (Destinatario & { tipo: "aviso-cambio-email"; nuevoEmail: string })
  | (Destinatario & { tipo: "clave-cambiada" })
  | (Destinatario & { tipo: "cuenta-eliminada" })
  | (Destinatario & { tipo: "certificado-emitido"; titulo: string; enlace: string });

export type ColaEmails = {
  encolar(trabajo: TrabajoEmail): Promise<void>;
  cerrar(): Promise<void>;
};

function opcionesDesdeUrl(url: string) {
  const direccion = new URL(url);
  return {
    host: direccion.hostname,
    port: Number(direccion.port || 6379),
    username: direccion.username ? decodeURIComponent(direccion.username) : undefined,
    password: direccion.password ? decodeURIComponent(direccion.password) : undefined,
    db: direccion.pathname.length > 1 ? Number(direccion.pathname.slice(1)) : 0,
  };
}

// Quien encola desde una request necesita fallar rápido si Redis no está, no quedar colgado.
function conexionProductor(url: string): ConnectionOptions {
  return { ...opcionesDesdeUrl(url), maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 2_000 };
}

// Los workers usan comandos bloqueantes: BullMQ exige maxRetriesPerRequest: null.
export function conexionWorker(url: string): ConnectionOptions {
  return { ...opcionesDesdeUrl(url), maxRetriesPerRequest: null };
}

function conLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolver, rechazar) => {
    const temporizador = setTimeout(() => rechazar(new Error("La cola de emails no responde.")), ms);
    promesa.then(
      (valor) => {
        clearTimeout(temporizador);
        resolver(valor);
      },
      (error: unknown) => {
        clearTimeout(temporizador);
        rechazar(error);
      }
    );
  });
}

export function crearColaEmails(
  url: string,
  { nombre = COLA_EMAILS, limiteMs = 3_000 }: { nombre?: string; limiteMs?: number } = {}
): ColaEmails {
  const cola = new Queue<TrabajoEmail>(nombre, { connection: conexionProductor(url) });
  // Los errores de conexión se informan al encolar; sin este listener, ensucian el log en cada reintento.
  cola.on("error", () => {});

  return {
    async encolar(trabajo) {
      await conLimite(
        cola.add(trabajo.tipo, trabajo, {
          attempts: 5,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: 1_000,
          removeOnFail: 5_000,
        }),
        limiteMs
      );
    },
    cerrar: () => cola.close(),
  };
}
```

- [ ] **Step 5: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter @syntaxerror/queue test && cd packages/queue && pnpm exec tsc --noEmit -p ."`
Expected: PASS (2 tests) y `tsc` sin errores.

- [ ] **Step 6: Commit**

```bash
git add packages/queue docker-compose.yml pnpm-lock.yaml
git commit -m "feat(queue): cola de emails con bullmq

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Worker de emails (plantilla, mensajes, envío y procesador)

**Files:**
- Create: `apps/worker/src/emails/plantilla.ts`, `mensajes.ts`, `enviar.ts`, `procesar.ts`
- Create: `apps/worker/src/testing/mailpit.ts`
- Test: `apps/worker/src/emails/plantilla.test.ts`, `mensajes.test.ts`, `enviar.test.ts`, `procesar.test.ts`
- Modify: `apps/worker/package.json`, `apps/worker/src/index.ts`, `docker-compose.yml` (variables de email, Mailpit para `tools` y `worker`)

**Interfaces:**
- Consumes: `TrabajoEmail`, `COLA_EMAILS`, `crearColaEmails`, `conexionWorker` (Task 1).
- Produces:
  - `plantillaSyntaxError(entrada: EntradaPlantilla): EmailListo`, con `EmailListo = { asunto: string; html: string; texto: string }` y el asunto con el prefijo `syntaxError.cl — `.
  - `construirEmail(trabajo: TrabajoEmail): EmailListo`, con estos asuntos:
    - `verificar-email`: `Confirma tu email`;
    - `confirmar-nuevo-email`: `Confirma tu nuevo email`;
    - `aviso-cambio-email`: `Pidieron cambiar el email de tu cuenta`;
    - `clave-cambiada`: `Tu contraseña fue actualizada`;
    - `cuenta-eliminada`: `Tu cuenta fue eliminada`;
    - `certificado-emitido`: `Obtuviste un certificado`.
  - `enviarEmail(email: EmailSaliente): Promise<void>`, con `EmailSaliente = { para; asunto; html; texto }`. Usa Resend si hay `RESEND_API_KEY` y SMTP si no. El remitente sale de `EMAIL_FROM`.
  - `crearProcesadorEmails(enviar?)`: el procesador que usa el worker.
  - `buscarEmail(para: string): Promise<{ ID; Subject; Text; HTML }>`: helper de tests contra la API de Mailpit.
  - El worker consume la cola `emails` al arrancar.

- [ ] **Step 1: Dependencias y variables de entorno**

Run: `docker compose run --rm tools pnpm --filter worker add "@syntaxerror/queue@workspace:*" "bullmq@^5.34.0" "nodemailer@^6.9.16" && docker compose run --rm tools pnpm --filter worker add -D "@types/nodemailer@^6.4.16"`

En `docker-compose.yml`:

1. Agregar al `environment` del ancla `x-node` (lo heredan `tools`, `web` y `worker`):
```yaml
    EMAIL_FROM: "syntaxError.cl <no-responder@syntaxerror.cl>"
    SMTP_HOST: mailpit
    SMTP_PORT: "1025"
    MAILPIT_URL: http://mailpit:8025
```

2. En `tools`, agregar a `depends_on`:
```yaml
      mailpit: { condition: service_started }
```

3. En `worker`, agregar al `environment` `RESEND_API_KEY: ${RESEND_API_KEY:-}` y a `depends_on` `mailpit: { condition: service_started }`.

- [ ] **Step 2: Crear el helper de Mailpit y escribir los tests que fallan**

`src/testing/mailpit.ts`:
```ts
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://mailpit:8025";

export type EmailMailpit = { ID: string; Subject: string; Text: string; HTML: string };

export async function buscarEmail(para: string, { esperaMs = 10_000 }: { esperaMs?: number } = {}): Promise<EmailMailpit> {
  const limite = Date.now() + esperaMs;
  while (Date.now() < limite) {
    const busqueda = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${para}"`)}`);
    const { messages } = (await busqueda.json()) as { messages: { ID: string }[] };
    if (messages.length > 0) {
      const mensaje = await fetch(`${MAILPIT_URL}/api/v1/message/${messages[0].ID}`);
      return (await mensaje.json()) as EmailMailpit;
    }
    await new Promise((resolver) => setTimeout(resolver, 250));
  }
  throw new Error(`No llegó ningún email a ${para}`);
}
```

`src/emails/plantilla.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { plantillaSyntaxError } from "./plantilla";

const base = {
  asunto: "Confirma tu email",
  estado: { etiqueta: "INFO" as const, mensaje: "Cuenta creada" },
  saludo: "Hola, Ana:",
  parrafos: ["Primer párrafo.", "Segundo párrafo."],
  comandoCierre: "git commit -m \"primer día\"",
};

describe("plantillaSyntaxError", () => {
  it("agrega la marca al asunto", () => {
    expect(plantillaSyntaxError(base).asunto).toBe("syntaxError.cl — Confirma tu email");
  });

  it("incluye el enlace como botón en HTML y como URL en el texto", () => {
    const email = plantillaSyntaxError({ ...base, enlace: { texto: "Confirmar mi email", url: "https://syntaxerror.cl/x?token=abc" } });
    expect(email.html).toContain('href="https://syntaxerror.cl/x?token=abc"');
    expect(email.html).toContain("Confirmar mi email");
    expect(email.texto).toContain("Confirmar mi email: https://syntaxerror.cl/x?token=abc");
  });

  it("escapa el HTML de los datos del alumno", () => {
    const email = plantillaSyntaxError({ ...base, saludo: "Hola, <script>alert(1)</script>:" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("la versión en texto no tiene etiquetas HTML", () => {
    const { texto } = plantillaSyntaxError(base);
    expect(texto).toContain("[INFO]: Cuenta creada");
    expect(texto).toContain("Segundo párrafo.");
    expect(texto).not.toMatch(/<[a-z]/i);
  });
});
```

`src/emails/mensajes.test.ts`:
```ts
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { describe, expect, it } from "vitest";
import { construirEmail } from "./mensajes";

const enlace = "https://syntaxerror.cl/verificar-email?token=abc";

const casos: Array<[TrabajoEmail, string]> = [
  [{ tipo: "verificar-email", para: "ana@correo.cl", nombre: "Ana", enlace }, "Confirma tu email"],
  [{ tipo: "confirmar-nuevo-email", para: "ana@correo.cl", nombre: "Ana", enlace }, "Confirma tu nuevo email"],
  [{ tipo: "aviso-cambio-email", para: "ana@correo.cl", nombre: "Ana", nuevoEmail: "nueva@correo.cl" }, "Pidieron cambiar el email de tu cuenta"],
  [{ tipo: "clave-cambiada", para: "ana@correo.cl", nombre: "Ana" }, "Tu contraseña fue actualizada"],
  [{ tipo: "cuenta-eliminada", para: "ana@correo.cl", nombre: "Ana" }, "Tu cuenta fue eliminada"],
  [{ tipo: "certificado-emitido", para: "ana@correo.cl", nombre: "Ana", titulo: "Ventas de marzo", enlace }, "Obtuviste un certificado"],
];

describe("construirEmail", () => {
  it.each(casos)("%o tiene el asunto correcto y no usa voseo", (trabajo, asunto) => {
    const email = construirEmail(trabajo);
    expect(email.asunto).toBe(`syntaxError.cl — ${asunto}`);
    expect(email.texto).not.toMatch(/\bvos\b|fuiste vos/i);
  });

  it("los emails con enlace lo incluyen en HTML y texto", () => {
    for (const [trabajo] of casos) {
      if (!("enlace" in trabajo)) continue;
      const email = construirEmail(trabajo);
      expect(email.html).toContain(enlace);
      expect(email.texto).toContain(enlace);
    }
  });

  it("el aviso de cambio nombra el email nuevo", () => {
    expect(construirEmail(casos[2][0]).texto).toContain("nueva@correo.cl");
  });

  it("saluda por nombre o con un saludo neutro", () => {
    expect(construirEmail({ tipo: "clave-cambiada", para: "a@b.cl", nombre: "Ana" }).texto).toContain("Hola, Ana:");
    expect(construirEmail({ tipo: "clave-cambiada", para: "a@b.cl", nombre: null }).texto).toContain("Hola:");
  });
});
```

`src/emails/enviar.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarEmail } from "../testing/mailpit";
import { enviarEmail } from "./enviar";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("enviarEmail", () => {
  it("sin RESEND_API_KEY envía por SMTP y llega a Mailpit", async () => {
    const para = `smtp-${Date.now()}@correo.cl`;
    await enviarEmail({ para, asunto: "Prueba SMTP", html: "<p>hola</p>", texto: "hola" });
    const recibido = await buscarEmail(para);
    expect(recibido.Subject).toBe("Prueba SMTP");
    expect(recibido.Text.trim()).toBe("hola");
  });

  it("con RESEND_API_KEY usa la API de Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_prueba");
    vi.stubEnv("EMAIL_FROM", "syntaxError.cl <no-responder@syntaxerror.cl>");
    const fetchFalso = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchFalso);

    await enviarEmail({ para: "ana@correo.cl", asunto: "Asunto", html: "<p>h</p>", texto: "h" });

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFalso.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer re_prueba");
    expect(JSON.parse(String(init?.body))).toEqual({
      from: "syntaxError.cl <no-responder@syntaxerror.cl>",
      to: "ana@correo.cl",
      subject: "Asunto",
      html: "<p>h</p>",
      text: "h",
    });
  });

  it("un error de Resend se propaga para que BullMQ reintente", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_prueba");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("caído", { status: 500 })));
    await expect(enviarEmail({ para: "ana@correo.cl", asunto: "A", html: "h", texto: "h" })).rejects.toThrow(
      "Resend respondió 500: caído"
    );
  });
});
```

`src/emails/procesar.test.ts`:
```ts
import { Worker } from "bullmq";
import { conexionWorker, crearColaEmails } from "@syntaxerror/queue/emails";
import { describe, expect, it } from "vitest";
import type { EmailSaliente } from "./enviar";
import { crearProcesadorEmails } from "./procesar";

const url = process.env.REDIS_URL ?? "redis://redis:6379";

describe("crearProcesadorEmails", () => {
  it("un trabajo encolado se procesa y se envía armado con su plantilla", async () => {
    const nombre = `emails-worker-test-${process.pid}`;
    const enviados: EmailSaliente[] = [];
    const worker = new Worker(nombre, crearProcesadorEmails(async (email) => void enviados.push(email)), {
      connection: conexionWorker(url),
    });
    const cola = crearColaEmails(url, { nombre });

    await cola.encolar({ tipo: "clave-cambiada", para: "ana@correo.cl", nombre: "Ana" });
    await expect.poll(() => enviados.length, { timeout: 10_000 }).toBe(1);
    expect(enviados[0]).toMatchObject({
      para: "ana@correo.cl",
      asunto: "syntaxError.cl — Tu contraseña fue actualizada",
    });

    await worker.close();
    await cola.cerrar();
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter worker test`
Expected: FAIL, porque no se pueden resolver `./plantilla`, `./mensajes`, `./enviar` ni `./procesar`.

- [ ] **Step 4: Crear `src/emails/plantilla.ts`** (portada de `$V1/apps/worker/src/lib/syntax-error-email.ts`, con el enlace como botón)

```ts
export type LineaEstado = { etiqueta: "INFO" | "WARNING" | "ERROR"; mensaje: string };

export type EntradaPlantilla = {
  asunto: string;
  estado: LineaEstado;
  saludo: string;
  parrafos: string[];
  enlace?: { texto: string; url: string };
  comandoCierre: string;
};

export type EmailListo = { asunto: string; html: string; texto: string };

const PREFIJO = "syntaxError.cl — ";
const FIRMA = ["Un saludo,", "El equipo de syntaxError.cl"];
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";

const TONOS: Record<LineaEstado["etiqueta"], { borde: string; fondo: string; texto: string }> = {
  ERROR: { borde: "#ef4444", fondo: "#fef2f2", texto: "#b91c1c" },
  WARNING: { borde: "#f59e0b", fondo: "#fffbeb", texto: "#b45309" },
  INFO: { borde: "#a1a1aa", fondo: "#f4f4f5", texto: "#52525b" },
};

export function escaparHtml(valor: string): string {
  return valor.replace(
    /[&<>"']/g,
    (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter]!
  );
}

function fila(contenido: string, estilo: string): string {
  return `<tr><td style="${estilo}">${contenido}</td></tr>`;
}

function renderHtml(entrada: EntradaPlantilla): string {
  const tono = TONOS[entrada.estado.etiqueta];
  const estado = fila(
    `[${escaparHtml(entrada.estado.etiqueta)}]: ${escaparHtml(entrada.estado.mensaje)}`,
    `padding:10px 12px;border-left:3px solid ${tono.borde};background:${tono.fondo};font-family:${MONO};font-size:12.5px;line-height:1.6;color:${tono.texto};`
  );
  const saludo = fila(escaparHtml(entrada.saludo), `padding:16px 0 14px;font-family:${SANS};font-size:15px;line-height:1.6;color:#18181b;`);
  const parrafos = entrada.parrafos
    .map((parrafo) => fila(escaparHtml(parrafo), `padding:0 0 14px;font-family:${SANS};font-size:14px;line-height:1.7;color:#52525b;`))
    .join("");
  const enlace = entrada.enlace
    ? fila(
        `<a href="${escaparHtml(entrada.enlace.url)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-family:${SANS};font-size:14px;font-weight:700;padding:10px 18px;border-radius:6px;">${escaparHtml(entrada.enlace.texto)}</a><br><span style="display:inline-block;margin-top:10px;font-family:${MONO};font-size:11px;color:#71717a;word-break:break-all;">${escaparHtml(entrada.enlace.url)}</span>`,
        "padding:4px 0 18px;"
      )
    : "";
  const firma = fila(
    `${FIRMA.map(escaparHtml).join("<br>")}<br><span style="display:inline-block;margin-top:6px;background:#f4f4f5;color:#7c3aed;padding:2px 8px;border-radius:4px;font-family:${MONO};font-size:12px;">${escaparHtml(entrada.comandoCierre)}</span>`,
    `padding:10px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:#a1a1aa;`
  );

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escaparHtml(PREFIJO + entrada.asunto)}</title>
</head>
<body style="margin:0;padding:0;background:#fafafa;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;">
<tr><td style="padding:0 0 16px;font-family:${MONO};font-size:13px;color:#7c3aed;letter-spacing:0.5px;">&gt; syntaxError.cl_</td></tr>
<tr><td style="border:1px solid #e4e4e7;border-radius:8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:#f4f4f5;border-bottom:1px solid #e4e4e7;padding:10px 16px;border-radius:8px 8px 0 0;font-family:${MONO};font-size:11px;color:#71717a;">
<span style="color:#ff5f56;">&#9679;</span> <span style="color:#ffbd2e;">&#9679;</span> <span style="color:#27c93f;">&#9679;</span>&nbsp; estudiante@syntaxerror: ~
</td></tr>
<tr><td style="padding:28px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${estado}
${saludo}
${parrafos}
${enlace}
${firma}
</table>
</td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function renderTexto(entrada: EntradaPlantilla): string {
  const partes = [`[${entrada.estado.etiqueta}]: ${entrada.estado.mensaje}`, "", entrada.saludo];
  for (const parrafo of entrada.parrafos) partes.push("", parrafo);
  if (entrada.enlace) partes.push("", `${entrada.enlace.texto}: ${entrada.enlace.url}`);
  partes.push("", ...FIRMA, entrada.comandoCierre);
  return partes.join("\n");
}

export function plantillaSyntaxError(entrada: EntradaPlantilla): EmailListo {
  return { asunto: PREFIJO + entrada.asunto, html: renderHtml(entrada), texto: renderTexto(entrada) };
}
```

- [ ] **Step 5: Crear `src/emails/mensajes.ts`**

```ts
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { plantillaSyntaxError, type EmailListo } from "./plantilla";

function saludo(nombre: string | null): string {
  const limpio = nombre?.trim();
  return limpio ? `Hola, ${limpio}:` : "Hola:";
}

export function construirEmail(trabajo: TrabajoEmail): EmailListo {
  switch (trabajo.tipo) {
    case "verificar-email":
      return plantillaSyntaxError({
        asunto: "Confirma tu email",
        estado: { etiqueta: "INFO", mensaje: "Cuenta creada" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          "Te damos la bienvenida a syntaxError.cl. Tu cuenta ya está lista y puedes empezar tu primer caso cuando quieras.",
          "Confirma que este email es tuyo: así te podemos enviar tus certificados y los avisos importantes de tu cuenta.",
        ],
        enlace: { texto: "Confirmar mi email", url: trabajo.enlace },
        comandoCierre: 'git commit -m "primer día"',
      });
    case "confirmar-nuevo-email":
      return plantillaSyntaxError({
        asunto: "Confirma tu nuevo email",
        estado: { etiqueta: "INFO", mensaje: "Confirmación de email pendiente" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          "Recibimos una solicitud para usar este email en tu cuenta de syntaxError.cl.",
          "Si fuiste tú, confirma el cambio con el botón. Si no, ignora este correo: tu cuenta sigue igual.",
        ],
        enlace: { texto: "Confirmar nuevo email", url: trabajo.enlace },
        comandoCierre: "git checkout -b nuevo-email",
      });
    case "aviso-cambio-email":
      return plantillaSyntaxError({
        asunto: "Pidieron cambiar el email de tu cuenta",
        estado: { etiqueta: "WARNING", mensaje: "Solicitud de cambio de email" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          `Se pidió cambiar el email de tu cuenta a ${trabajo.nuevoEmail}.`,
          "El cambio solo se hace cuando se confirma desde ese nuevo email. Si no fuiste tú, cambia tu contraseña de inmediato.",
        ],
        comandoCierre: "git log --oneline",
      });
    case "clave-cambiada":
      return plantillaSyntaxError({
        asunto: "Tu contraseña fue actualizada",
        estado: { etiqueta: "INFO", mensaje: "Contraseña actualizada" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          "Te confirmamos que la contraseña de tu cuenta fue actualizada.",
          "Si no fuiste tú, responde este correo de inmediato para que te ayudemos a recuperar tu cuenta.",
        ],
        comandoCierre: "passwd --confirm",
      });
    case "cuenta-eliminada":
      return plantillaSyntaxError({
        asunto: "Tu cuenta fue eliminada",
        estado: { etiqueta: "WARNING", mensaje: "Cuenta eliminada" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          "Tu cuenta en syntaxError.cl fue eliminada de forma permanente.",
          "Se borraron tu progreso, tus entregables, tus certificados y tu portafolio. Si crees que fue un error, responde este correo.",
        ],
        comandoCierre: "sudo rm -rf ~/cuenta",
      });
    case "certificado-emitido":
      return plantillaSyntaxError({
        asunto: "Obtuviste un certificado",
        estado: { etiqueta: "INFO", mensaje: "Certificado emitido" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          `Completaste ${trabajo.titulo}. ¡Felicitaciones!`,
          "Tu certificado tiene un código único que cualquier empresa puede verificar en línea. Agrégalo a tu CV y a tu LinkedIn.",
        ],
        enlace: { texto: "Ver mi certificado", url: trabajo.enlace },
        comandoCierre: "git tag v1.0",
      });
  }
}
```

- [ ] **Step 6: Crear `src/emails/enviar.ts` y `src/emails/procesar.ts`** (el envío está portado de `$V1/apps/worker/src/lib/mailer.ts`)

`src/emails/enviar.ts`:
```ts
import nodemailer, { type Transporter } from "nodemailer";

export type EmailSaliente = { para: string; asunto: string; html: string; texto: string };

let transporte: Transporter | undefined;

function smtp(): Transporter {
  transporte ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === "465",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporte;
}

async function porResend(email: EmailSaliente, apiKey: string, remitente: string): Promise<void> {
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: remitente, to: email.para, subject: email.asunto, html: email.html, text: email.texto }),
  });
  if (!respuesta.ok) throw new Error(`Resend respondió ${respuesta.status}: ${await respuesta.text()}`);
}

// Railway bloquea el SMTP saliente en el plan Hobby: en producción se envía por la API HTTPS de Resend.
// En local se usa SMTP contra Mailpit.
export async function enviarEmail(email: EmailSaliente): Promise<void> {
  const remitente = process.env.EMAIL_FROM;
  if (!remitente) throw new Error("EMAIL_FROM is not set");
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    await porResend(email, apiKey, remitente);
    return;
  }
  await smtp().sendMail({ from: remitente, to: email.para, subject: email.asunto, html: email.html, text: email.texto });
}
```

`src/emails/procesar.ts`:
```ts
import type { Job } from "bullmq";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { enviarEmail, type EmailSaliente } from "./enviar";
import { construirEmail } from "./mensajes";

export function crearProcesadorEmails(enviar: (email: EmailSaliente) => Promise<void> = enviarEmail) {
  return async (job: Job<TrabajoEmail>): Promise<void> => {
    const { asunto, html, texto } = construirEmail(job.data);
    await enviar({ para: job.data.para, asunto, html, texto });
  };
}
```

- [ ] **Step 7: Consumir la cola al arrancar el worker**

Reemplazar `apps/worker/src/index.ts` por:
```ts
import { Worker } from "bullmq";
import { COLA_EMAILS, conexionWorker, type TrabajoEmail } from "@syntaxerror/queue/emails";
import { crearProcesadorEmails } from "./emails/procesar";
import { getRedis } from "./redis";
import { createWorkerServer } from "./server";

const port = Number(process.env.CHAT_SOCKET_PORT ?? 4001);
const corsOrigin = process.env.APP_URL ?? "http://localhost:3000";
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("REDIS_URL is not set");

const redis = getRedis();
const { httpServer, io } = createWorkerServer({ redis, corsOrigin });

const emails = new Worker<TrabajoEmail>(COLA_EMAILS, crearProcesadorEmails(), {
  connection: conexionWorker(redisUrl),
  concurrency: 2,
});
emails.on("failed", (job, error) => {
  console.error(`[emails] falló ${job?.name ?? "trabajo"} (intento ${job?.attemptsMade ?? "?"}): ${error.message}`);
});

httpServer.listen(port, () => {
  console.log(`[worker] escuchando en :${port}`);
});

async function shutdown(signal: string) {
  console.log(`[worker] ${signal}: cerrando`);
  io.close();
  await emails.close();
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
```

- [ ] **Step 8: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter worker test && cd apps/worker && pnpm exec tsc --noEmit -p ."`
Expected: PASS (los 3 de `server.test.ts` más 17 nuevos) y `tsc` sin errores.

Run: `docker compose up -d --build worker && sleep 5 && docker compose logs worker | tail -5`
Expected: `[worker] escuchando en :4001`, sin errores de conexión.

Run: `docker compose down`

- [ ] **Step 9: Commit**

```bash
git add apps/worker docker-compose.yml pnpm-lock.yaml
git commit -m "feat(worker): emails con plantilla syntaxError por smtp o resend

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Schema de cuentas, certificados y auditoría

**Files:**
- Modify: `packages/db/src/schema.ts` (columnas `usuario` y `portafolio_publico` en `users`; tablas `tokens_email`, `certificados` y `certificados_legacy`)
- Modify: `packages/db/src/audit.ts` (acciones nuevas)
- Create: `packages/db/drizzle/0002_<nombre>.sql` (generada)

**Interfaces:**
- Consumes: `users`, `casos`, `rutas` (Fases 1 y 2).
- Produces (`@syntaxerror/db/schema`):
  - `users.usuario` (texto único, opcional) y `users.portafolioPublico` (falso por defecto);
  - `tokensEmail`: `id`, `userId`, `tipo` (`"verificar"` o `"cambiar"`), `email`, `tokenHash` (único), `expiraEn`, `creadoEn`;
  - `certificados`: `id`, `userId`, `tipo` (`"caso"` o `"ruta"`), `casoId`, `rutaId`, `codigo` (único), `nombreAlumno`, `titulo`, `cargo`, `emitidoEn`. Un solo certificado por alumna y caso, y por alumna y ruta;
  - `certificadosLegacy`: `codigo` (clave), `nombreAlumno`, `titulo`, `tipo` (`"curso"` o `"ruta"`), `emitidoEn`.
- Produce en `@syntaxerror/db/audit` las acciones nuevas `email_verified`, `profile_updated`, `password_changed`, `email_change_requested`, `email_changed`, `data_exported`, `account_deleted` y `portfolio_updated`.

- [ ] **Step 1: Agregar columnas a `users`**

En `packages/db/src/schema.ts`, dentro de las columnas de `users`, después de `abandonmentEmailsOptOut`, agregar:
```ts
    usuario: text("usuario"),
    portafolioPublico: boolean("portafolio_publico").notNull().default(false),
```

Y cambiar los índices de `users` por:
```ts
  (table) => [uniqueIndex("users_email_idx").on(table.email), uniqueIndex("users_usuario_idx").on(table.usuario)]
```

- [ ] **Step 2: Agregar las tablas nuevas** (al final de `schema.ts`)

```ts
export const tokensEmail = pgTable(
  "tokens_email",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiraEn: timestamp("expira_en").notNull(),
    creadoEn: timestamp("creado_en").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tokens_email_hash_idx").on(table.tokenHash)]
);

export const certificados = pgTable(
  "certificados",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    casoId: uuid("caso_id").references(() => casos.id, { onDelete: "set null" }),
    rutaId: uuid("ruta_id").references(() => rutas.id, { onDelete: "set null" }),
    codigo: text("codigo").notNull(),
    nombreAlumno: text("nombre_alumno").notNull(),
    titulo: text("titulo").notNull(),
    cargo: text("cargo"),
    emitidoEn: timestamp("emitido_en").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("certificados_codigo_idx").on(table.codigo),
    uniqueIndex("certificados_usuario_caso_idx").on(table.userId, table.tipo, table.casoId),
    uniqueIndex("certificados_usuario_ruta_idx").on(table.userId, table.tipo, table.rutaId),
  ]
);

// Foto fija de los certificados de la v1: la llena scripts/migrar-v1.ts (Fase 5).
export const certificadosLegacy = pgTable("certificados_legacy", {
  codigo: text("codigo").primaryKey(),
  nombreAlumno: text("nombre_alumno").notNull(),
  titulo: text("titulo").notNull(),
  tipo: text("tipo").notNull(),
  emitidoEn: timestamp("emitido_en").notNull(),
});
```

- [ ] **Step 3: Agregar las acciones de auditoría**

En `packages/db/src/audit.ts`, reemplazar `AUDIT_ACTIONS` por:
```ts
export const AUDIT_ACTIONS = [
  "login_success",
  "login_failed",
  "logout",
  "email_verified",
  "profile_updated",
  "password_changed",
  "email_change_requested",
  "email_changed",
  "data_exported",
  "account_deleted",
  "portfolio_updated",
] as const;
```

- [ ] **Step 4: Generar la migración y correr los tests**

Run: `npm run db:generate`
Expected: crea `packages/db/drizzle/0002_<nombre>.sql`, que:
- agrega a `users` las columnas `usuario` y `portafolio_publico`, y el índice único `users_usuario_idx`;
- crea las tablas `tokens_email`, `certificados` y `certificados_legacy`.

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && cd packages/db && pnpm exec tsc --noEmit -p ."`
Expected: PASS en todos los paquetes (la migración se aplica en `postgres-test` desde el `globalSetup`) y `tsc` sin errores.

- [ ] **Step 5: Commit**

```bash
git add packages/db
git commit -m "feat(db): tokens de email, certificados, certificados legacy y portafolio

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Emails desde la web y verificación del email al registrarse

**Files:**
- Create: `apps/web/src/lib/emails.ts`, `apps/web/src/lib/errores-db.ts`
- Create: `apps/web/src/lib/cuenta/tokens.ts`, `enlaces.ts`, `meta.ts`, `verificacion.ts`, `cliente.ts`
- Create: `apps/web/src/app/api/cuenta/verificar-email/route.ts`, `apps/web/src/app/api/cuenta/reenviar-verificacion/route.ts`
- Create: `apps/web/src/app/(cuenta)/layout.tsx`, `apps/web/src/app/(cuenta)/verificar-email/page.tsx`
- Create: `apps/web/src/components/cuenta/confirmar-token.tsx`, `apps/web/src/components/cuenta/aviso-verificacion.tsx`
- Test: `apps/web/src/lib/emails.test.ts`, `apps/web/src/lib/cuenta/tokens.test.ts`, `apps/web/src/lib/cuenta/verificacion.test.ts`, `apps/web/src/app/api/cuenta/verificar-email/route.test.ts`
- Modify: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/src/lib/rate-limit.ts`, `apps/web/src/app/api/auth/register/route.ts`, `apps/web/src/app/api/auth/register/route.test.ts`, `apps/web/src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `crearColaEmails`, `TrabajoEmail` (Task 1), `tokensEmail`, `users`, acciones de auditoría (Task 3), `registerUser` (Fase 1), `absoluteUrl` (`@/lib/seo`), `getClientIp` (`@/lib/client-ip`).
- Produces:
  - `@/lib/emails`: `type Encolar = (trabajo: TrabajoEmail) => Promise<void>`, `encolarEmail` (falla si no pudo encolar) y `encolarSinFallar` (registra el error y sigue).
  - `@/lib/errores-db`: `esViolacionUnica(error): boolean`.
  - `@/lib/cuenta/tokens`: `type TipoToken = "verificar" | "cambiar"`, `crearTokenEmail(db, { userId, tipo, email }): Promise<string>`, `consumirTokenEmail(db, tipo, token): Promise<{ ok: true; userId; email } | { ok: false; motivo: "invalido" | "vencido" }>`.
  - `@/lib/cuenta/enlaces`: `enlaceVerificarEmail(token)`, `enlaceConfirmarEmail(token)`, `enlaceCertificado(codigo)`, `enlaceVerificarCertificado(codigo)`, `enlacePortafolio(usuario)`.
  - `@/lib/cuenta/meta`: `type MetaRequest = { ip: string | null; userAgent: string | null }`, `SIN_META`, `metaDeRequest(request)`.
  - `@/lib/cuenta/verificacion`: `enviarVerificacion(db, usuario, encolar)`, `reenviarVerificacion(db, userId, encolar): Promise<"enviado" | "ya_verificado" | "sin_usuario">`, `confirmarVerificacion(db, token, meta)`, `necesitaVerificar(db, userId): Promise<boolean>` (solo cuentas con contraseña y sin confirmar).
  - `@/lib/cuenta/cliente`: `enviarJson(url, metodo, cuerpo?): Promise<{ ok; status; error: string | null; datos }>`.
  - `<ConfirmarToken endpoint titulo boton exito errores />`: lee `?token=` y confirma con un clic (`POST`).
  - Rate limits nuevos: `cuenta-clave` (5 cada 15 min), `cuenta-email` (5 por hora) y `reenviar-verificacion` (3 por hora), todos por usuario.
  - Al registrarse se envía el email `verificar-email`. El panel muestra el aviso `Confirma tu email: ...` con el botón `Reenviar email`, y `/verificar-email` tiene el botón `Confirmar email`.

- [ ] **Step 1: Dependencias, configuración y rate limits**

Run: `docker compose run --rm tools pnpm --filter web add "@syntaxerror/queue@workspace:*" "bullmq@^5.34.0"`

En `apps/web/next.config.ts`:
1. Cambiar `transpilePackages` por:
```ts
  transpilePackages: ["@syntaxerror/db", "@syntaxerror/ui", "@syntaxerror/engines", "@syntaxerror/content", "@syntaxerror/queue"],
```
2. Agregar, debajo de `transpilePackages`:
```ts
  // BullMQ lee sus scripts Lua desde disco con rutas relativas: no se puede empaquetar con webpack.
  serverExternalPackages: ["bullmq"],
```

En `apps/web/src/lib/rate-limit.ts`:
1. Cambiar el tipo por:
```ts
export type RateLimitKey = "login-email" | "login-ip" | "register-ip" | "cuenta-clave" | "cuenta-email" | "reenviar-verificacion";
```
2. Agregar a `LIMITER_CONFIGS`:
```ts
  "cuenta-clave": { points: 5, duration: 900 },
  "cuenta-email": { points: 5, duration: 3600 },
  "reenviar-verificacion": { points: 3, duration: 3600 },
```

- [ ] **Step 2: Escribir los tests que fallan**

`src/lib/emails.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@syntaxerror/queue/emails", () => ({
  crearColaEmails: () => ({
    encolar: vi.fn(async () => {
      throw new Error("La cola de emails no responde.");
    }),
    cerrar: vi.fn(),
  }),
}));

const { encolarEmail, encolarSinFallar } = await import("./emails");
const aviso = { tipo: "clave-cambiada" as const, para: "ana@correo.cl", nombre: "Ana" };

describe("emails desde la web", () => {
  it("encolarEmail propaga el error para que la ruta responda 503", async () => {
    await expect(encolarEmail(aviso)).rejects.toThrow("La cola de emails no responde.");
  });

  it("encolarSinFallar registra el error y deja seguir la acción del alumno", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(encolarSinFallar(aviso)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith("[emails] no se pudo encolar clave-cambiada", expect.any(Error));
    error.mockRestore();
  });
});
```

`src/lib/cuenta/tokens.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { tokensEmail, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { consumirTokenEmail, crearTokenEmail } from "./tokens";

const { db, close } = createTestDb();

async function crearUsuario(): Promise<string> {
  const [usuario] = await db.insert(users).values({ email: "ana@correo.cl" }).returning({ id: users.id });
  return usuario.id;
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("tokens de email", () => {
  it("un token se usa una sola vez", async () => {
    const userId = await crearUsuario();
    const token = await crearTokenEmail(db, { userId, tipo: "verificar", email: "ana@correo.cl" });
    expect(await consumirTokenEmail(db, "verificar", token)).toEqual({ ok: true, userId, email: "ana@correo.cl" });
    expect(await consumirTokenEmail(db, "verificar", token)).toEqual({ ok: false, motivo: "invalido" });
  });

  it("guarda solo el hash del token", async () => {
    const userId = await crearUsuario();
    const token = await crearTokenEmail(db, { userId, tipo: "verificar", email: "ana@correo.cl" });
    const [fila] = await db.select().from(tokensEmail);
    expect(fila.tokenHash).not.toBe(token);
    expect(fila.tokenHash).toHaveLength(64);
  });

  it("un token vencido no sirve", async () => {
    const userId = await crearUsuario();
    const token = await crearTokenEmail(db, { userId, tipo: "cambiar", email: "nueva@correo.cl" });
    await db.update(tokensEmail).set({ expiraEn: new Date(Date.now() - 1_000) });
    expect(await consumirTokenEmail(db, "cambiar", token)).toEqual({ ok: false, motivo: "vencido" });
  });

  it("pedir un token nuevo invalida el anterior del mismo tipo", async () => {
    const userId = await crearUsuario();
    const viejo = await crearTokenEmail(db, { userId, tipo: "cambiar", email: "una@correo.cl" });
    await crearTokenEmail(db, { userId, tipo: "cambiar", email: "otra@correo.cl" });
    expect(await consumirTokenEmail(db, "cambiar", viejo)).toEqual({ ok: false, motivo: "invalido" });
  });

  it("un token de verificación no sirve para cambiar el email", async () => {
    const userId = await crearUsuario();
    const token = await crearTokenEmail(db, { userId, tipo: "verificar", email: "ana@correo.cl" });
    expect(await consumirTokenEmail(db, "cambiar", token)).toEqual({ ok: false, motivo: "invalido" });
  });
});
```

`src/lib/cuenta/verificacion.test.ts`:
```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";
import type { Encolar } from "@/lib/emails";
import { SIN_META } from "./meta";
import { confirmarVerificacion, enviarVerificacion, necesitaVerificar, reenviarVerificacion } from "./verificacion";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);

function tokenDe(trabajo: TrabajoEmail): string {
  if (!("enlace" in trabajo)) throw new Error(`El email ${trabajo.tipo} no tiene enlace`);
  return new URL(trabajo.enlace).searchParams.get("token") ?? "";
}

async function alumna() {
  const { id, email } = await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
  return { id, email, name: "Ana" };
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("verificación del email", () => {
  it("envía un enlace que confirma la cuenta y deja registro en la bitácora", async () => {
    const usuario = await alumna();
    await enviarVerificacion(db, usuario, encolar);
    expect(enviados[0]).toMatchObject({ tipo: "verificar-email", para: "ana@correo.cl", nombre: "Ana" });
    expect("enlace" in enviados[0] && enviados[0].enlace).toContain("/verificar-email?token=");
    expect(await necesitaVerificar(db, usuario.id)).toBe(true);

    expect(await confirmarVerificacion(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: true });
    expect(await necesitaVerificar(db, usuario.id)).toBe(false);
    const [registro] = await db.select().from(auditLog);
    expect(registro).toMatchObject({ action: "email_verified", actorId: usuario.id });
  });

  it("el mismo enlace no sirve dos veces", async () => {
    const usuario = await alumna();
    await enviarVerificacion(db, usuario, encolar);
    await confirmarVerificacion(db, tokenDe(enviados[0]), SIN_META);
    expect(await confirmarVerificacion(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: false, motivo: "invalido" });
  });

  it("un enlace viejo no confirma un email que la cuenta ya no tiene", async () => {
    const usuario = await alumna();
    await enviarVerificacion(db, usuario, encolar);
    await db.update(users).set({ email: "otra@correo.cl" }).where(eq(users.id, usuario.id));
    expect(await confirmarVerificacion(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: false, motivo: "invalido" });
    expect(await necesitaVerificar(db, usuario.id)).toBe(true);
  });

  it("reenviar no manda nada si el email ya está confirmado", async () => {
    const usuario = await alumna();
    await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, usuario.id));
    expect(await reenviarVerificacion(db, usuario.id, encolar)).toBe("ya_verificado");
    expect(enviados).toEqual([]);
  });

  it("las cuentas sin contraseña (Google) no necesitan verificar", async () => {
    const [google] = await db.insert(users).values({ email: "google@correo.cl" }).returning({ id: users.id });
    expect(await necesitaVerificar(db, google.id)).toBe(false);
  });
});
```

`src/app/api/cuenta/verificar-email/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn(), cerrarSesion: vi.fn() }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const verificar = await import("./route");
const reenviar = await import("../reenviar-verificacion/route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { encolarEmail } = await import("@/lib/emails");

const { db, close } = createTestDb();

function confirmar(token: unknown) {
  return verificar.POST(
    new Request("http://localhost:3000/api/cuenta/verificar-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
  );
}

beforeEach(async () => {
  await truncateAll(db);
  vi.clearAllMocks();
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("verificación por API", () => {
  it("rechaza un token que no existe", async () => {
    const respuesta = await confirmar("x".repeat(43));
    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toEqual({ error: "invalido" });
  });

  it("reenviar pide sesión", async () => {
    expect((await reenviar.POST()).status).toBe(401);
  });

  it("reenviar encola un enlace que después confirma la cuenta", async () => {
    const { id } = await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(id);

    const respuesta = await reenviar.POST();
    expect(await respuesta.json()).toEqual({ estado: "enviado" });
    const [trabajo] = vi.mocked(encolarEmail).mock.calls[0];
    expect(trabajo.tipo).toBe("verificar-email");
    const token = "enlace" in trabajo ? new URL(trabajo.enlace).searchParams.get("token") : null;

    expect((await confirmar(token)).status).toBe(200);
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/emails.test.ts src/lib/cuenta src/app/api/cuenta`
Expected: FAIL, porque no se pueden resolver `./emails`, `./tokens`, `./verificacion` ni las rutas.

- [ ] **Step 4: Crear `src/lib/emails.ts` y `src/lib/errores-db.ts`**

`src/lib/emails.ts`:
```ts
import { crearColaEmails, type ColaEmails, type TrabajoEmail } from "@syntaxerror/queue/emails";

export type Encolar = (trabajo: TrabajoEmail) => Promise<void>;

const globalParaCola = globalThis as { __syntaxerrorColaEmails?: ColaEmails };

function cola(): ColaEmails {
  if (!globalParaCola.__syntaxerrorColaEmails) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not set");
    globalParaCola.__syntaxerrorColaEmails = crearColaEmails(url);
  }
  return globalParaCola.__syntaxerrorColaEmails;
}

// Para emails sin los que el alumno no puede seguir (confirmar un email nuevo): el error llega a la ruta.
export const encolarEmail: Encolar = (trabajo) => cola().encolar(trabajo);

// Para avisos: si Redis no responde se registra el error y la acción del alumno sigue.
export const encolarSinFallar: Encolar = async (trabajo) => {
  try {
    await encolarEmail(trabajo);
  } catch (error) {
    console.error(`[emails] no se pudo encolar ${trabajo.tipo}`, error);
  }
};
```

`src/lib/errores-db.ts`:
```ts
// Postgres responde 23505 cuando un INSERT o UPDATE choca con un índice único.
export function esViolacionUnica(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "23505";
}
```

- [ ] **Step 5: Crear `tokens.ts`, `enlaces.ts`, `meta.ts` y `verificacion.ts`**

`src/lib/cuenta/tokens.ts`:
```ts
import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { DbClient } from "@syntaxerror/db/client";
import { tokensEmail } from "@syntaxerror/db/schema";

export type TipoToken = "verificar" | "cambiar";
export type ResultadoToken = { ok: true; userId: string; email: string } | { ok: false; motivo: "invalido" | "vencido" };

const DIA_MS = 24 * 60 * 60 * 1000;
const DURACION_MS: Record<TipoToken, number> = { verificar: 7 * DIA_MS, cambiar: DIA_MS };

function hashear(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Solo se guarda el hash: quien lea la base no puede usar los enlaces pendientes.
export async function crearTokenEmail(
  db: DbClient,
  { userId, tipo, email }: { userId: string; tipo: TipoToken; email: string }
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.delete(tokensEmail).where(and(eq(tokensEmail.userId, userId), eq(tokensEmail.tipo, tipo)));
  await db.insert(tokensEmail).values({
    userId,
    tipo,
    email,
    tokenHash: hashear(token),
    expiraEn: new Date(Date.now() + DURACION_MS[tipo]),
  });
  return token;
}

// DELETE ... RETURNING: el token se usa una sola vez aunque lleguen dos confirmaciones a la vez.
export async function consumirTokenEmail(db: DbClient, tipo: TipoToken, token: string): Promise<ResultadoToken> {
  const [fila] = await db
    .delete(tokensEmail)
    .where(and(eq(tokensEmail.tipo, tipo), eq(tokensEmail.tokenHash, hashear(token))))
    .returning();
  if (!fila) return { ok: false, motivo: "invalido" };
  if (fila.expiraEn.getTime() < Date.now()) return { ok: false, motivo: "vencido" };
  return { ok: true, userId: fila.userId, email: fila.email };
}
```

`src/lib/cuenta/enlaces.ts`:
```ts
import { absoluteUrl } from "@/lib/seo";

export const enlaceVerificarEmail = (token: string) => absoluteUrl(`/verificar-email?token=${encodeURIComponent(token)}`);
export const enlaceConfirmarEmail = (token: string) => absoluteUrl(`/confirmar-email?token=${encodeURIComponent(token)}`);
export const enlaceCertificado = (codigo: string) => absoluteUrl(`/certificados/${codigo}`);
export const enlaceVerificarCertificado = (codigo: string) => absoluteUrl(`/verificar/${codigo}`);
export const enlacePortafolio = (usuario: string) => absoluteUrl(`/p/${usuario}`);
```

`src/lib/cuenta/meta.ts`:
```ts
import { getClientIp } from "@/lib/client-ip";

export type MetaRequest = { ip: string | null; userAgent: string | null };

export const SIN_META: MetaRequest = { ip: null, userAgent: null };

export function metaDeRequest(request: Request): MetaRequest {
  const ip = getClientIp(request.headers);
  return { ip: ip === "unknown" ? null : ip, userAgent: request.headers.get("user-agent") };
}
```

`src/lib/cuenta/verificacion.ts`:
```ts
import { and, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { users } from "@syntaxerror/db/schema";
import type { Encolar } from "@/lib/emails";
import { enlaceVerificarEmail } from "./enlaces";
import type { MetaRequest } from "./meta";
import { consumirTokenEmail, crearTokenEmail } from "./tokens";

export async function enviarVerificacion(
  db: AppDb,
  usuario: { id: string; email: string; name: string | null },
  encolar: Encolar
): Promise<void> {
  const token = await crearTokenEmail(db, { userId: usuario.id, tipo: "verificar", email: usuario.email });
  await encolar({ tipo: "verificar-email", para: usuario.email, nombre: usuario.name, enlace: enlaceVerificarEmail(token) });
}

export async function reenviarVerificacion(
  db: AppDb,
  userId: string,
  encolar: Encolar
): Promise<"enviado" | "ya_verificado" | "sin_usuario"> {
  const [usuario] = await db.select().from(users).where(eq(users.id, userId));
  if (!usuario) return "sin_usuario";
  if (usuario.emailVerified) return "ya_verificado";
  await enviarVerificacion(db, usuario, encolar);
  return "enviado";
}

export async function confirmarVerificacion(
  db: AppDb,
  token: string,
  meta: MetaRequest
): Promise<{ ok: true } | { ok: false; motivo: "invalido" | "vencido" }> {
  const resultado = await consumirTokenEmail(db, "verificar", token);
  if (!resultado.ok) return resultado;

  // Solo vale si la cuenta sigue teniendo el email al que se mandó el enlace.
  const actualizados = await db
    .update(users)
    .set({ emailVerified: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, resultado.userId), eq(users.email, resultado.email)))
    .returning({ id: users.id });
  if (actualizados.length === 0) return { ok: false, motivo: "invalido" };

  await insertAuditLogEntry(db, {
    actorId: resultado.userId,
    actorEmail: resultado.email,
    action: "email_verified",
    targetType: "user",
    targetId: resultado.userId,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
  return { ok: true };
}

// Las cuentas de Google llegan con el email ya confirmado por Google.
export async function necesitaVerificar(db: AppDb, userId: string): Promise<boolean> {
  const [usuario] = await db
    .select({ passwordHash: users.passwordHash, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.id, userId));
  return Boolean(usuario?.passwordHash) && !usuario?.emailVerified;
}
```

- [ ] **Step 6: Crear las rutas y enviar la verificación al registrarse**

`src/app/api/cuenta/verificar-email/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { confirmarVerificacion } from "@/lib/cuenta/verificacion";

const esquema = z.object({ token: z.string().min(10).max(200) });

export async function POST(request: Request) {
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });
  const resultado = await confirmarVerificacion(getDb(), parsed.data.token, metaDeRequest(request));
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: 400 });
  return NextResponse.json({ ok: true });
}
```

`src/app/api/cuenta/reenviar-verificacion/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { reenviarVerificacion } from "@/lib/cuenta/verificacion";
import { encolarEmail } from "@/lib/emails";
import { checkRateLimit } from "@/lib/rate-limit";
import { obtenerUsuarioId } from "@/lib/sesion";

export async function POST() {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const limite = await checkRateLimit("reenviar-verificacion", userId);
  if (!limite.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } }
    );
  }
  try {
    return NextResponse.json({ estado: await reenviarVerificacion(getDb(), userId, encolarEmail) });
  } catch (error) {
    console.error("[cuenta] no se pudo reenviar la verificación", error);
    return NextResponse.json({ error: "cola_no_disponible" }, { status: 503 });
  }
}
```

En `src/app/api/auth/register/route.ts`:

1. Agregar los imports:
```ts
import { enviarVerificacion } from "@/lib/cuenta/verificacion";
import { encolarSinFallar } from "@/lib/emails";
```

2. Reemplazar el bloque `try` por:
```ts
  try {
    const result = await registerUser(getDb(), parsed.data);
    // El registro no falla si no se pudo preparar el email: la alumna puede pedirlo de nuevo desde su panel.
    await enviarVerificacion(getDb(), { id: result.id, email: result.email, name: parsed.data.name }, encolarSinFallar).catch(
      (error) => console.error("[registro] no se pudo preparar la verificación", error)
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
```

En `src/app/api/auth/register/route.test.ts`, agregar después del `vi.mock` de rate-limit:
```ts
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));
```

- [ ] **Step 7: Crear el helper de formularios, el layout de cuenta, la página de confirmación y el aviso del panel**

`src/lib/cuenta/cliente.ts`:
```ts
export type RespuestaJson = { ok: boolean; status: number; error: string | null; datos: Record<string, unknown> };

export async function enviarJson(url: string, metodo: "POST" | "PATCH" | "DELETE", cuerpo?: unknown): Promise<RespuestaJson> {
  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const datos = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: respuesta.ok, status: respuesta.status, error: typeof datos.error === "string" ? datos.error : null, datos };
  } catch {
    return { ok: false, status: 0, error: "sin_conexion", datos: {} };
  }
}
```

`src/app/(cuenta)/layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { MisionesHeader } from "@/components/misiones-header";
import { SiteFooter } from "@/components/site-footer";

export default function CuentaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MisionesHeader />
      {children}
      <SiteFooter />
    </>
  );
}
```

`src/components/cuenta/confirmar-token.tsx`:
```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Card } from "@syntaxerror/ui/components/card";
import { enviarJson } from "@/lib/cuenta/cliente";

// Se confirma con un clic (POST) y no al abrir el enlace: los antivirus de correo abren los enlaces por su cuenta.
export function ConfirmarToken({
  endpoint,
  titulo,
  boton,
  exito,
  errores,
}: {
  endpoint: string;
  titulo: string;
  boton: string;
  exito: ReactNode;
  errores: Record<string, string>;
}) {
  const token = useSearchParams().get("token") ?? "";
  const [estado, setEstado] = useState<"inicial" | "enviando" | "listo" | "error">("inicial");
  const [mensaje, setMensaje] = useState("");

  async function confirmar() {
    setEstado("enviando");
    const respuesta = await enviarJson(endpoint, "POST", { token });
    if (respuesta.ok) {
      setEstado("listo");
      return;
    }
    setMensaje((respuesta.error && errores[respuesta.error]) ?? "No pudimos confirmar. Intenta de nuevo.");
    setEstado("error");
  }

  return (
    <Card className="grid gap-4 p-6">
      <h1 className="text-2xl font-black">{titulo}</h1>
      {!token ? (
        <p className="text-muted-foreground">El enlace no trae su código. Ábrelo directamente desde el email.</p>
      ) : estado === "listo" ? (
        <div role="status" className="leading-7">
          {exito}
        </div>
      ) : (
        <>
          <div>
            <Button type="button" onClick={() => void confirmar()} disabled={estado === "enviando"}>
              {boton}
            </Button>
          </div>
          {estado === "error" ? (
            <p role="alert" className="text-sm font-bold text-destructive">
              {mensaje}
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}
```

`src/app/(cuenta)/verificar-email/page.tsx`:
```tsx
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmarToken } from "@/components/cuenta/confirmar-token";

export const metadata = { title: "Confirma tu email", robots: { index: false } };

export default function VerificarEmailPage() {
  return (
    <main className="mx-auto grid max-w-lg px-4 py-16">
      <Suspense fallback={null}>
        <ConfirmarToken
          endpoint="/api/cuenta/verificar-email"
          titulo="Confirma tu email"
          boton="Confirmar email"
          exito={
            <p>
              Tu email quedó confirmado.{" "}
              <Link className="font-bold text-primary hover:underline" href="/dashboard">
                Ir a tu panel
              </Link>
            </p>
          }
          errores={{
            invalido: "El enlace no es válido o ya se usó.",
            vencido: "El enlace venció. Pide uno nuevo desde tu panel.",
          }}
        />
      </Suspense>
    </main>
  );
}
```

`src/components/cuenta/aviso-verificacion.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { enviarJson } from "@/lib/cuenta/cliente";

export function AvisoVerificacion() {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function reenviar() {
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta/reenviar-verificacion", "POST");
    setEnviando(false);
    if (respuesta.ok) setMensaje("Te enviamos un enlace nuevo. Revisa tu correo.");
    else if (respuesta.status === 429) setMensaje("Ya te enviamos varios enlaces. Espera un rato antes de pedir otro.");
    else setMensaje("No pudimos enviar el email. Intenta de nuevo en unos minutos.");
  }

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-md border border-primary/40 bg-primary/10 p-4 text-sm">
      <p className="flex-1 font-bold">
        Confirma tu email: así te llegan tus certificados y los avisos de tu cuenta. Te enviamos un enlace al registrarte.
      </p>
      <Button type="button" size="sm" variant="secondary" onClick={() => void reenviar()} disabled={enviando}>
        Reenviar email
      </Button>
      {mensaje ? (
        <p role="status" className="w-full">
          {mensaje}
        </p>
      ) : null}
    </section>
  );
}
```

En `src/app/(dashboard)/dashboard/page.tsx`:

1. Agregar los imports:
```tsx
import { AvisoVerificacion } from "@/components/cuenta/aviso-verificacion";
import { necesitaVerificar } from "@/lib/cuenta/verificacion";
```

2. Reemplazar la línea `const casosDelUsuario = ...` por:
```tsx
  const userId = session?.user?.id;
  const casosDelUsuario = userId ? await listarCasosDelUsuario(getDb(), userId) : [];
  const verificar = userId ? await necesitaVerificar(getDb(), userId) : false;
```

3. Justo antes de `<section className="grid gap-3">` (Tus casos), agregar:
```tsx
      {verificar ? <AvisoVerificacion /> : null}
```

- [ ] **Step 8: Correr los tests y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS (15 tests nuevos) y `tsc` sin errores.

- [ ] **Step 9: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(cuenta): cola de emails en la web y verificacion del email al registrarse

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Servicio de cuenta (nombre, contraseña, email, exportar y eliminar)

**Files:**
- Create: `apps/web/src/lib/cuenta/perfil.ts`
- Test: `apps/web/src/lib/cuenta/perfil.test.ts`

**Interfaces:**
- Consumes: `crearTokenEmail`, `consumirTokenEmail`, `enlaceConfirmarEmail`, `MetaRequest`, `Encolar`, `esViolacionUnica` (Task 4), `hashPassword`, `verifyPassword`, `normalizeEmail` (Fase 1), tablas de las Fases 2 y 3.
- Produces (`@/lib/cuenta/perfil`):
  - `type Perfil = { nombre: string | null; email: string; tieneClave: boolean; emailVerificado: boolean; usuario: string | null; portafolioPublico: boolean }`;
  - `obtenerPerfil(db, userId): Promise<Perfil | null>`;
  - `actualizarNombre(db, userId, nombre, meta): Promise<void>`;
  - `cambiarClave(db, userId, { claveActual, claveNueva }, { encolar, meta })`, que devuelve `{ ok: true }` o `{ ok: false; motivo: "sin_clave" | "clave_incorrecta" }`;
  - `solicitarCambioEmail(db, userId, { nuevoEmail, claveActual? }, { encolar, meta })`, que devuelve `{ ok: true }` o `{ ok: false; motivo: "clave_incorrecta" | "mismo_email" | "email_en_uso" }`. Encola `confirmar-nuevo-email` (al email nuevo) y `aviso-cambio-email` (al actual);
  - `confirmarCambioEmail(db, token, meta)`, que devuelve `{ ok: true; email }` o `{ ok: false; motivo: "invalido" | "vencido" | "email_en_uso" }`;
  - `exportarDatos(db, userId, meta): Promise<DatosExportados | null>`, con la cuenta, las misiones, los casos, las rutas, los entregables y los certificados;
  - `eliminarCuenta(db, userId, confirmacion, { encolar, meta })`, que devuelve `{ ok: true }` o `{ ok: false; motivo: "clave_incorrecta" | "confirmacion_incorrecta" }`. La confirmación es la contraseña, o el email si la cuenta no tiene contraseña.
  - Cada acción deja su registro en la bitácora. El de la cuenta eliminada se conserva: `audit_log` no tiene clave foránea a `users`.

- [ ] **Step 1: Escribir el test que falla, `src/lib/cuenta/perfil.test.ts`**

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, casoInscripciones, casos, misionProgreso, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";
import type { Encolar } from "@/lib/emails";
import { verifyPassword } from "@/lib/password";
import { SIN_META } from "./meta";
import {
  actualizarNombre,
  cambiarClave,
  confirmarCambioEmail,
  eliminarCuenta,
  exportarDatos,
  obtenerPerfil,
  solicitarCambioEmail,
} from "./perfil";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);
const deps = { encolar, meta: SIN_META };

async function alumna(email = "ana@correo.cl") {
  const { id } = await registerUser(db, { name: "Ana", email, password: "clave-segura-123" });
  return id;
}

async function usuariaGoogle() {
  const [usuario] = await db.insert(users).values({ email: "google@correo.cl", name: "Gabriela" }).returning({ id: users.id });
  return usuario.id;
}

function tokenDe(trabajo: TrabajoEmail | undefined): string {
  if (!trabajo || !("enlace" in trabajo)) throw new Error("El email no tiene enlace");
  return new URL(trabajo.enlace).searchParams.get("token") ?? "";
}

async function acciones() {
  return (await db.select({ action: auditLog.action }).from(auditLog)).map((fila) => fila.action);
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("obtenerPerfil y actualizarNombre", () => {
  it("devuelve el perfil y cambia el nombre dejando registro", async () => {
    const id = await alumna();
    await actualizarNombre(db, id, "Ana María", SIN_META);
    expect(await obtenerPerfil(db, id)).toEqual({
      nombre: "Ana María",
      email: "ana@correo.cl",
      tieneClave: true,
      emailVerificado: false,
      usuario: null,
      portafolioPublico: false,
    });
    expect(await acciones()).toEqual(["profile_updated"]);
  });
});

describe("cambiarClave", () => {
  it("cambia la contraseña, avisa por email y deja registro", async () => {
    const id = await alumna();
    expect(await cambiarClave(db, id, { claveActual: "clave-segura-123", claveNueva: "otra-clave-456" }, deps)).toEqual({ ok: true });
    const [fila] = await db.select().from(users).where(eq(users.id, id));
    expect(await verifyPassword("otra-clave-456", fila.passwordHash!)).toBe(true);
    expect(enviados).toEqual([{ tipo: "clave-cambiada", para: "ana@correo.cl", nombre: "Ana" }]);
    expect(await acciones()).toEqual(["password_changed"]);
  });

  it("rechaza la clave actual incorrecta sin cambiar nada", async () => {
    const id = await alumna();
    expect(await cambiarClave(db, id, { claveActual: "mala", claveNueva: "otra-clave-456" }, deps)).toEqual({
      ok: false,
      motivo: "clave_incorrecta",
    });
    expect(enviados).toEqual([]);
  });

  it("una cuenta de Google no tiene clave que cambiar", async () => {
    const id = await usuariaGoogle();
    expect(await cambiarClave(db, id, { claveActual: "x", claveNueva: "otra-clave-456" }, deps)).toEqual({
      ok: false,
      motivo: "sin_clave",
    });
  });
});

describe("cambio de email", () => {
  it("pide confirmación al email nuevo, avisa al actual y cambia al confirmar", async () => {
    const id = await alumna();
    expect(await solicitarCambioEmail(db, id, { nuevoEmail: " Nueva@Correo.CL ", claveActual: "clave-segura-123" }, deps)).toEqual({
      ok: true,
    });
    expect(enviados.map((email) => [email.tipo, email.para])).toEqual([
      ["confirmar-nuevo-email", "nueva@correo.cl"],
      ["aviso-cambio-email", "ana@correo.cl"],
    ]);

    expect(await confirmarCambioEmail(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: true, email: "nueva@correo.cl" });
    const perfil = await obtenerPerfil(db, id);
    expect(perfil).toMatchObject({ email: "nueva@correo.cl", emailVerificado: true });
    expect(await acciones()).toEqual(["email_change_requested", "email_changed"]);
  });

  it("el enlace de confirmación no sirve dos veces", async () => {
    const id = await alumna();
    await solicitarCambioEmail(db, id, { nuevoEmail: "nueva@correo.cl", claveActual: "clave-segura-123" }, deps);
    await confirmarCambioEmail(db, tokenDe(enviados[0]), SIN_META);
    expect(await confirmarCambioEmail(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: false, motivo: "invalido" });
  });

  it("rechaza el mismo email, uno en uso y la clave incorrecta", async () => {
    const id = await alumna();
    await alumna("tomado@correo.cl");
    const pedir = (nuevoEmail: string, claveActual = "clave-segura-123") =>
      solicitarCambioEmail(db, id, { nuevoEmail, claveActual }, deps);
    expect(await pedir("ANA@correo.cl")).toEqual({ ok: false, motivo: "mismo_email" });
    expect(await pedir("tomado@correo.cl")).toEqual({ ok: false, motivo: "email_en_uso" });
    expect(await pedir("nueva@correo.cl", "mala")).toEqual({ ok: false, motivo: "clave_incorrecta" });
    expect(enviados).toEqual([]);
  });

  it("si otra cuenta toma el email antes de confirmar, avisa que está en uso", async () => {
    const id = await alumna();
    await solicitarCambioEmail(db, id, { nuevoEmail: "nueva@correo.cl", claveActual: "clave-segura-123" }, deps);
    await alumna("nueva@correo.cl");
    expect(await confirmarCambioEmail(db, tokenDe(enviados[0]), SIN_META)).toEqual({ ok: false, motivo: "email_en_uso" });
    expect(await obtenerPerfil(db, id)).toMatchObject({ email: "ana@correo.cl" });
  });

  it("una cuenta de Google cambia su email sin contraseña", async () => {
    const id = await usuariaGoogle();
    expect(await solicitarCambioEmail(db, id, { nuevoEmail: "nueva@correo.cl" }, deps)).toEqual({ ok: true });
  });
});

describe("exportarDatos", () => {
  it("incluye la cuenta y el progreso, y deja registro", async () => {
    const id = await alumna();
    const [caso] = await db
      .insert(casos)
      .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
      .returning({ id: casos.id });
    await db.insert(casoInscripciones).values({ userId: id, casoId: caso.id });
    await db.insert(misionProgreso).values({ userId: id, casoId: caso.id, mision: "m1", intentos: 3, tareasAprobadas: ["t1"] });

    const datos = await exportarDatos(db, id, SIN_META);
    expect(datos?.cuenta).toMatchObject({ nombre: "Ana", email: "ana@correo.cl", rol: "student" });
    expect(datos?.misiones).toEqual([
      { caso: "ventas", mision: "m1", estado: "en_curso", intentos: 3, tareasAprobadas: ["t1"], aprobadaEn: null },
    ]);
    expect(datos?.casos).toHaveLength(1);
    expect(await acciones()).toEqual(["data_exported"]);
  });
});

describe("eliminarCuenta", () => {
  it("con la contraseña borra la cuenta y su progreso, avisa y conserva la bitácora", async () => {
    const id = await alumna();
    const [caso] = await db
      .insert(casos)
      .values({ slug: "ventas", titulo: "Ventas", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
      .returning({ id: casos.id });
    await db.insert(misionProgreso).values({ userId: id, casoId: caso.id, mision: "m1" });

    expect(await eliminarCuenta(db, id, "clave-segura-123", deps)).toEqual({ ok: true });
    expect(await db.select().from(users)).toEqual([]);
    expect(await db.select().from(misionProgreso)).toEqual([]);
    expect(enviados).toEqual([{ tipo: "cuenta-eliminada", para: "ana@correo.cl", nombre: "Ana" }]);
    expect(await acciones()).toEqual(["account_deleted"]);
  });

  it("con la contraseña incorrecta no borra nada", async () => {
    const id = await alumna();
    expect(await eliminarCuenta(db, id, "mala", deps)).toEqual({ ok: false, motivo: "clave_incorrecta" });
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it("una cuenta de Google se confirma escribiendo su email", async () => {
    const id = await usuariaGoogle();
    expect(await eliminarCuenta(db, id, "otra@correo.cl", deps)).toEqual({ ok: false, motivo: "confirmacion_incorrecta" });
    expect(await eliminarCuenta(db, id, " Google@Correo.cl ", deps)).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/cuenta/perfil.test.ts`
Expected: FAIL, porque no se puede resolver `./perfil`.

- [ ] **Step 3: Crear `src/lib/cuenta/perfil.ts`**

```ts
import { and, eq, ne } from "drizzle-orm";
import type { AppDb, DbClient } from "@syntaxerror/db/client";
import { insertAuditLogEntry, type AuditAction } from "@syntaxerror/db/audit";
import {
  casoInscripciones,
  casos,
  certificados,
  entregables,
  misionProgreso,
  rutaInscripciones,
  rutas,
  users,
} from "@syntaxerror/db/schema";
import { normalizeEmail } from "@/app/api/auth/register/service";
import type { Encolar } from "@/lib/emails";
import { esViolacionUnica } from "@/lib/errores-db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { enlaceConfirmarEmail } from "./enlaces";
import type { MetaRequest } from "./meta";
import { consumirTokenEmail, crearTokenEmail } from "./tokens";

type Usuario = typeof users.$inferSelect;
type Dependencias = { encolar: Encolar; meta: MetaRequest };

export type Perfil = {
  nombre: string | null;
  email: string;
  tieneClave: boolean;
  emailVerificado: boolean;
  usuario: string | null;
  portafolioPublico: boolean;
};

async function buscarUsuario(db: DbClient, userId: string): Promise<Usuario | null> {
  const [usuario] = await db.select().from(users).where(eq(users.id, userId));
  return usuario ?? null;
}

function auditar(
  db: DbClient,
  usuario: { id: string; email: string },
  action: AuditAction,
  meta: MetaRequest,
  metadata?: Record<string, unknown>
) {
  return insertAuditLogEntry(db, {
    actorId: usuario.id,
    actorEmail: usuario.email,
    action,
    targetType: "user",
    targetId: usuario.id,
    metadata,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
}

export async function obtenerPerfil(db: AppDb, userId: string): Promise<Perfil | null> {
  const usuario = await buscarUsuario(db, userId);
  if (!usuario) return null;
  return {
    nombre: usuario.name,
    email: usuario.email,
    tieneClave: Boolean(usuario.passwordHash),
    emailVerificado: Boolean(usuario.emailVerified),
    usuario: usuario.usuario,
    portafolioPublico: usuario.portafolioPublico,
  };
}

export async function actualizarNombre(db: AppDb, userId: string, nombre: string, meta: MetaRequest): Promise<void> {
  const usuario = await buscarUsuario(db, userId);
  if (!usuario) return;
  await db.transaction(async (tx) => {
    await tx.update(users).set({ name: nombre, updatedAt: new Date() }).where(eq(users.id, userId));
    await auditar(tx, usuario, "profile_updated", meta, { nombreAnterior: usuario.name, nombreNuevo: nombre });
  });
}

export async function cambiarClave(
  db: AppDb,
  userId: string,
  { claveActual, claveNueva }: { claveActual: string; claveNueva: string },
  { encolar, meta }: Dependencias
): Promise<{ ok: true } | { ok: false; motivo: "sin_clave" | "clave_incorrecta" }> {
  const usuario = await buscarUsuario(db, userId);
  if (!usuario?.passwordHash) return { ok: false, motivo: "sin_clave" };
  if (!(await verifyPassword(claveActual, usuario.passwordHash))) return { ok: false, motivo: "clave_incorrecta" };

  const passwordHash = await hashPassword(claveNueva);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
    await auditar(tx, usuario, "password_changed", meta);
  });
  await encolar({ tipo: "clave-cambiada", para: usuario.email, nombre: usuario.name });
  return { ok: true };
}

export async function solicitarCambioEmail(
  db: AppDb,
  userId: string,
  { nuevoEmail, claveActual }: { nuevoEmail: string; claveActual?: string },
  { encolar, meta }: Dependencias
): Promise<{ ok: true } | { ok: false; motivo: "clave_incorrecta" | "mismo_email" | "email_en_uso" }> {
  const usuario = await buscarUsuario(db, userId);
  if (!usuario) throw new Error("cuenta_no_encontrada");
  const email = normalizeEmail(nuevoEmail);
  if (email === usuario.email) return { ok: false, motivo: "mismo_email" };
  // Las cuentas de Google no tienen contraseña: la sesión basta y el cambio igual se confirma desde el email nuevo.
  if (usuario.passwordHash && !(claveActual && (await verifyPassword(claveActual, usuario.passwordHash)))) {
    return { ok: false, motivo: "clave_incorrecta" };
  }
  const [ocupado] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (ocupado) return { ok: false, motivo: "email_en_uso" };

  const token = await crearTokenEmail(db, { userId, tipo: "cambiar", email });
  await auditar(db, usuario, "email_change_requested", meta, { nuevoEmail: email });
  await encolar({ tipo: "confirmar-nuevo-email", para: email, nombre: usuario.name, enlace: enlaceConfirmarEmail(token) });
  await encolar({ tipo: "aviso-cambio-email", para: usuario.email, nombre: usuario.name, nuevoEmail: email });
  return { ok: true };
}

export async function confirmarCambioEmail(
  db: AppDb,
  token: string,
  meta: MetaRequest
): Promise<{ ok: true; email: string } | { ok: false; motivo: "invalido" | "vencido" | "email_en_uso" }> {
  const resultado = await consumirTokenEmail(db, "cambiar", token);
  if (!resultado.ok) return resultado;
  const usuario = await buscarUsuario(db, resultado.userId);
  if (!usuario) return { ok: false, motivo: "invalido" };

  const [ocupado] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, resultado.email), ne(users.id, usuario.id)));
  if (ocupado) return { ok: false, motivo: "email_en_uso" };

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ email: resultado.email, emailVerified: new Date(), updatedAt: new Date() })
        .where(eq(users.id, usuario.id));
      await auditar(tx, { id: usuario.id, email: resultado.email }, "email_changed", meta, {
        emailAnterior: usuario.email,
        emailNuevo: resultado.email,
      });
    });
  } catch (error) {
    // Otra cuenta pudo tomar el email entre la verificación de arriba y el UPDATE.
    if (esViolacionUnica(error)) return { ok: false, motivo: "email_en_uso" };
    throw error;
  }
  return { ok: true, email: resultado.email };
}

export type DatosExportados = {
  exportadoEn: string;
  cuenta: {
    nombre: string | null;
    email: string;
    rol: string;
    creadaEn: Date;
    emailVerificado: Date | null;
    usuario: string | null;
    portafolioPublico: boolean;
  };
  misiones: {
    caso: string;
    mision: string;
    estado: string;
    intentos: number;
    tareasAprobadas: string[];
    aprobadaEn: Date | null;
  }[];
  casos: { caso: string; inscritoEn: Date; completadoEn: Date | null }[];
  rutas: { ruta: string; inscritoEn: Date; completadoEn: Date | null }[];
  entregables: { caso: string; url: string; actualizadoEn: Date }[];
  certificados: { codigo: string; tipo: string; titulo: string; emitidoEn: Date }[];
};

export async function exportarDatos(db: AppDb, userId: string, meta: MetaRequest): Promise<DatosExportados | null> {
  const usuario = await buscarUsuario(db, userId);
  if (!usuario) return null;

  const [misiones, casosInscritos, rutasInscritas, susEntregables, susCertificados] = await Promise.all([
    db
      .select({
        caso: casos.slug,
        mision: misionProgreso.mision,
        estado: misionProgreso.estado,
        intentos: misionProgreso.intentos,
        tareasAprobadas: misionProgreso.tareasAprobadas,
        aprobadaEn: misionProgreso.aprobadaEn,
      })
      .from(misionProgreso)
      .innerJoin(casos, eq(casos.id, misionProgreso.casoId))
      .where(eq(misionProgreso.userId, userId)),
    db
      .select({ caso: casos.slug, inscritoEn: casoInscripciones.inscritoEn, completadoEn: casoInscripciones.completadoEn })
      .from(casoInscripciones)
      .innerJoin(casos, eq(casos.id, casoInscripciones.casoId))
      .where(eq(casoInscripciones.userId, userId)),
    db
      .select({ ruta: rutas.slug, inscritoEn: rutaInscripciones.inscritoEn, completadoEn: rutaInscripciones.completadoEn })
      .from(rutaInscripciones)
      .innerJoin(rutas, eq(rutas.id, rutaInscripciones.rutaId))
      .where(eq(rutaInscripciones.userId, userId)),
    db
      .select({ caso: casos.slug, url: entregables.url, actualizadoEn: entregables.actualizadoEn })
      .from(entregables)
      .innerJoin(casos, eq(casos.id, entregables.casoId))
      .where(eq(entregables.userId, userId)),
    db
      .select({
        codigo: certificados.codigo,
        tipo: certificados.tipo,
        titulo: certificados.titulo,
        emitidoEn: certificados.emitidoEn,
      })
      .from(certificados)
      .where(eq(certificados.userId, userId)),
  ]);

  await auditar(db, usuario, "data_exported", meta);
  return {
    exportadoEn: new Date().toISOString(),
    cuenta: {
      nombre: usuario.name,
      email: usuario.email,
      rol: usuario.role,
      creadaEn: usuario.createdAt,
      emailVerificado: usuario.emailVerified,
      usuario: usuario.usuario,
      portafolioPublico: usuario.portafolioPublico,
    },
    misiones,
    casos: casosInscritos,
    rutas: rutasInscritas,
    entregables: susEntregables,
    certificados: susCertificados,
  };
}

export async function eliminarCuenta(
  db: AppDb,
  userId: string,
  confirmacion: string,
  { encolar, meta }: Dependencias
): Promise<{ ok: true } | { ok: false; motivo: "clave_incorrecta" | "confirmacion_incorrecta" }> {
  const usuario = await buscarUsuario(db, userId);
  if (!usuario) return { ok: true };
  if (usuario.passwordHash) {
    if (!(await verifyPassword(confirmacion, usuario.passwordHash))) return { ok: false, motivo: "clave_incorrecta" };
  } else if (normalizeEmail(confirmacion) !== usuario.email) {
    return { ok: false, motivo: "confirmacion_incorrecta" };
  }

  await db.transaction(async (tx) => {
    // La bitácora se conserva: audit_log no tiene clave foránea a users.
    await auditar(tx, usuario, "account_deleted", meta);
    await tx.delete(users).where(eq(users.id, userId));
  });
  await encolar({ tipo: "cuenta-eliminada", para: usuario.email, nombre: usuario.name });
  return { ok: true };
}
```

- [ ] **Step 4: Correr el test y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test -- src/lib/cuenta/perfil.test.ts && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS (13 tests) y `tsc` sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(cuenta): nombre, contrasena, cambio de email, exportar datos y eliminar cuenta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: API y página de perfil

**Files:**
- Create: `apps/web/src/app/api/cuenta/route.ts`, `api/cuenta/clave/route.ts`, `api/cuenta/email/route.ts`, `api/cuenta/email/confirmar/route.ts`, `api/cuenta/datos/route.ts`
- Create: `apps/web/src/components/cuenta/seccion.tsx`, `formulario-nombre.tsx`, `formulario-email.tsx`, `formulario-clave.tsx`, `seccion-eliminar.tsx`
- Create: `apps/web/src/app/(dashboard)/perfil/page.tsx`, `apps/web/src/app/(cuenta)/confirmar-email/page.tsx`
- Test: `apps/web/src/app/api/cuenta/route.test.ts`
- Modify: `apps/web/src/lib/sesion.ts` (`cerrarSesion`), `apps/web/src/components/site-header.tsx` (enlace a Perfil)

**Interfaces:**
- Consumes: servicios de la Task 5, `ConfirmarToken`, `enviarJson`, `metaDeRequest`, `encolarEmail`, `encolarSinFallar` (Task 4), `checkRateLimit`.
- Produces:
  - `PATCH /api/cuenta { nombre }` y `DELETE /api/cuenta { confirmacion }` (cierra la sesión);
  - `POST /api/cuenta/clave { claveActual, claveNueva }`;
  - `POST /api/cuenta/email { nuevoEmail, claveActual? }`, que responde 409 si el email está en uso y 503 si la cola no responde;
  - `POST /api/cuenta/email/confirmar { token }`;
  - `GET /api/cuenta/datos`, que descarga un JSON como adjunto;
  - `/perfil` con las secciones `Datos de la cuenta`, `Cambiar email`, `Cambiar contraseña`, `Descargar tus datos` y `Eliminar cuenta`, y `/confirmar-email`;
  - `cerrarSesion()` en `@/lib/sesion`;
  - `Seccion` (componente de servidor) con un `h2` y `aria-labelledby`: la Task 9 agrega ahí `Portafolio público`.
  - Textos que usan los e2e: los campos `Nuevo email`, `Contraseña actual`, `Contraseña nueva` y `Escribe tu contraseña para confirmar` (o `Escribe tu email para confirmar`); los botones `Enviar confirmación`, `Cambiar contraseña`, `Eliminar mi cuenta` y `Confirmar nuevo email`; y los mensajes `Tu contraseña cambió.` y `Tu email cambió.`.

- [ ] **Step 1: Escribir el test que falla, `src/app/api/cuenta/route.test.ts`**

```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn(), cerrarSesion: vi.fn(async () => {}) }));
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const cuenta = await import("./route");
const clave = await import("./clave/route");
const email = await import("./email/route");
const confirmar = await import("./email/confirmar/route");
const datos = await import("./datos/route");
const { obtenerUsuarioId, cerrarSesion } = await import("@/lib/sesion");
const { encolarEmail } = await import("@/lib/emails");

const { db, close } = createTestDb();

function pedir(metodo: string, cuerpo?: unknown) {
  return new Request("http://localhost:3000/api/cuenta", {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

async function iniciarSesion(correo = "ana@correo.cl") {
  const { id } = await registerUser(db, { name: "Ana", email: correo, password: "clave-segura-123" });
  vi.mocked(obtenerUsuarioId).mockResolvedValue(id);
  return id;
}

beforeEach(async () => {
  await truncateAll(db);
  vi.clearAllMocks();
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("/api/cuenta", () => {
  it("todas las rutas piden sesión", async () => {
    expect((await cuenta.PATCH(pedir("PATCH", { nombre: "Ana" }))).status).toBe(401);
    expect((await cuenta.DELETE(pedir("DELETE", { confirmacion: "x" }))).status).toBe(401);
    expect((await clave.POST(pedir("POST", { claveActual: "x", claveNueva: "12345678" }))).status).toBe(401);
    expect((await email.POST(pedir("POST", { nuevoEmail: "a@b.cl" }))).status).toBe(401);
    expect((await datos.GET()).status).toBe(401);
  });

  it("PATCH cambia el nombre", async () => {
    const id = await iniciarSesion();
    expect((await cuenta.PATCH(pedir("PATCH", { nombre: "Ana María" }))).status).toBe(200);
    const [fila] = await db.select().from(users).where(eq(users.id, id));
    expect(fila.name).toBe("Ana María");
  });

  it("clave: 400 con la actual incorrecta y 200 con la correcta", async () => {
    await iniciarSesion();
    const mala = await clave.POST(pedir("POST", { claveActual: "mala", claveNueva: "otra-clave-456" }));
    expect(await mala.json()).toEqual({ error: "clave_incorrecta" });
    expect((await clave.POST(pedir("POST", { claveActual: "clave-segura-123", claveNueva: "otra-clave-456" }))).status).toBe(200);
  });

  it("email: 409 si lo usa otra cuenta y 200 encolando la confirmación", async () => {
    await registerUser(db, { name: "Otra", email: "tomado@correo.cl", password: "clave-segura-123" });
    await iniciarSesion();
    const tomado = await email.POST(pedir("POST", { nuevoEmail: "tomado@correo.cl", claveActual: "clave-segura-123" }));
    expect(tomado.status).toBe(409);

    expect((await email.POST(pedir("POST", { nuevoEmail: "nueva@correo.cl", claveActual: "clave-segura-123" }))).status).toBe(200);
    expect(vi.mocked(encolarEmail).mock.calls.map(([trabajo]) => trabajo.tipo)).toEqual([
      "confirmar-nuevo-email",
      "aviso-cambio-email",
    ]);
  });

  it("email: 503 si no se puede encolar la confirmación", async () => {
    await iniciarSesion();
    vi.mocked(encolarEmail).mockRejectedValueOnce(new Error("La cola de emails no responde."));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const respuesta = await email.POST(pedir("POST", { nuevoEmail: "nueva@correo.cl", claveActual: "clave-segura-123" }));
    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ error: "cola_no_disponible" });
    error.mockRestore();
  });

  it("confirmar: 400 con un token que no existe", async () => {
    const respuesta = await confirmar.POST(pedir("POST", { token: "y".repeat(43) }));
    expect(respuesta.status).toBe(400);
  });

  it("datos: descarga un JSON adjunto con la cuenta", async () => {
    await iniciarSesion();
    const respuesta = await datos.GET();
    expect(respuesta.headers.get("Content-Disposition")).toContain("attachment");
    expect(JSON.parse(await respuesta.text()).cuenta.email).toBe("ana@correo.cl");
  });

  it("DELETE: 400 con la clave incorrecta; con la correcta borra la cuenta y cierra la sesión", async () => {
    await iniciarSesion();
    expect((await cuenta.DELETE(pedir("DELETE", { confirmacion: "mala" }))).status).toBe(400);
    expect(cerrarSesion).not.toHaveBeenCalled();
    expect((await cuenta.DELETE(pedir("DELETE", { confirmacion: "clave-segura-123" }))).status).toBe(200);
    expect(cerrarSesion).toHaveBeenCalledTimes(1);
    expect(await db.select().from(users)).toEqual([]);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web test -- src/app/api/cuenta/route.test.ts`
Expected: FAIL, porque no se pueden resolver las rutas.

- [ ] **Step 3: Agregar `cerrarSesion` y crear las rutas**

Reemplazar `src/lib/sesion.ts` por:
```ts
import { auth, signOut } from "./auth";

export async function obtenerUsuarioId(): Promise<string | null> {
  const sesion = await auth();
  return sesion?.user?.id ?? null;
}

export async function cerrarSesion(): Promise<void> {
  await signOut({ redirect: false });
}
```

`src/app/api/cuenta/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { actualizarNombre, eliminarCuenta } from "@/lib/cuenta/perfil";
import { encolarSinFallar } from "@/lib/emails";
import { cerrarSesion, obtenerUsuarioId } from "@/lib/sesion";

const nombreSchema = z.object({ nombre: z.string().trim().min(1).max(120) });
const eliminarSchema = z.object({ confirmacion: z.string().min(1).max(200) });

export async function PATCH(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = nombreSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });
  await actualizarNombre(getDb(), userId, parsed.data.nombre, metaDeRequest(request));
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = eliminarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  const resultado = await eliminarCuenta(getDb(), userId, parsed.data.confirmacion, {
    encolar: encolarSinFallar,
    meta: metaDeRequest(request),
  });
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: 400 });
  await cerrarSesion();
  return NextResponse.json({ ok: true });
}
```

`src/app/api/cuenta/clave/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { cambiarClave } from "@/lib/cuenta/perfil";
import { encolarSinFallar } from "@/lib/emails";
import { checkRateLimit } from "@/lib/rate-limit";
import { obtenerUsuarioId } from "@/lib/sesion";

const esquema = z.object({ claveActual: z.string().min(1).max(200), claveNueva: z.string().min(8).max(200) });

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const limite = await checkRateLimit("cuenta-clave", userId);
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  const resultado = await cambiarClave(getDb(), userId, parsed.data, { encolar: encolarSinFallar, meta: metaDeRequest(request) });
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: 400 });
  return NextResponse.json({ ok: true });
}
```

`src/app/api/cuenta/email/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { solicitarCambioEmail } from "@/lib/cuenta/perfil";
import { encolarEmail } from "@/lib/emails";
import { checkRateLimit } from "@/lib/rate-limit";
import { obtenerUsuarioId } from "@/lib/sesion";

const esquema = z.object({ nuevoEmail: z.string().trim().email().max(200), claveActual: z.string().max(200).optional() });

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const limite = await checkRateLimit("cuenta-email", userId);
  if (!limite.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limite.retryAfterSeconds) } });
  }
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  let resultado: Awaited<ReturnType<typeof solicitarCambioEmail>>;
  try {
    // Sin este email no hay cómo confirmar el cambio: si no se pudo encolar, se avisa con 503.
    resultado = await solicitarCambioEmail(getDb(), userId, parsed.data, { encolar: encolarEmail, meta: metaDeRequest(request) });
  } catch (error) {
    console.error("[cuenta] no se pudo pedir el cambio de email", error);
    return NextResponse.json({ error: "cola_no_disponible" }, { status: 503 });
  }
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.motivo }, { status: resultado.motivo === "email_en_uso" ? 409 : 400 });
  }
  return NextResponse.json({ ok: true });
}
```

`src/app/api/cuenta/email/confirmar/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { confirmarCambioEmail } from "@/lib/cuenta/perfil";

const esquema = z.object({ token: z.string().min(10).max(200) });

export async function POST(request: Request) {
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });
  const resultado = await confirmarCambioEmail(getDb(), parsed.data.token, metaDeRequest(request));
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.motivo }, { status: resultado.motivo === "email_en_uso" ? 409 : 400 });
  }
  return NextResponse.json({ ok: true, email: resultado.email });
}
```

`src/app/api/cuenta/datos/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { SIN_META } from "@/lib/cuenta/meta";
import { exportarDatos } from "@/lib/cuenta/perfil";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const datos = await exportarDatos(getDb(), userId, SIN_META);
  if (!datos) return NextResponse.json({ error: "no_encontrado" }, { status: 404 });
  return new NextResponse(JSON.stringify(datos, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mis-datos-syntaxerror.json"',
      "Cache-Control": "no-store",
    },
  });
}
```

Run: `docker compose run --rm tools pnpm --filter web test -- src/app/api/cuenta/route.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 4: Crear los componentes del perfil**

`src/components/cuenta/seccion.tsx`:
```tsx
import type { ReactNode } from "react";

export function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  const id = `seccion-${titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="card grid gap-4 p-5">
      <div className="grid gap-1">
        <h2 id={id} className="text-xl font-black">
          {titulo}
        </h2>
        {descripcion ? <p className="text-sm leading-6 text-muted-foreground">{descripcion}</p> : null}
      </div>
      {children}
    </section>
  );
}
```

`src/components/cuenta/formulario-nombre.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

export function FormularioNombre({ nombreActual }: { nombreActual: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreActual);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta", "PATCH", { nombre });
    setEnviando(false);
    setMensaje(respuesta.ok ? "Nombre actualizado." : "No pudimos guardar el nombre. Revisa que no esté vacío.");
    if (respuesta.ok) router.refresh();
  }

  return (
    <form className="grid gap-3" onSubmit={guardar}>
      <Label>
        Nombre
        <Input name="nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required maxLength={120} autoComplete="name" />
      </Label>
      <div>
        <Button type="submit" disabled={enviando}>
          Guardar nombre
        </Button>
      </div>
      {mensaje ? (
        <p role="status" className="text-sm font-bold">
          {mensaje}
        </p>
      ) : null}
    </form>
  );
}
```

`src/components/cuenta/formulario-email.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

const ERRORES: Record<string, string> = {
  mismo_email: "Ese ya es tu email.",
  email_en_uso: "Ese email ya lo usa otra cuenta.",
  clave_incorrecta: "La contraseña actual no es correcta.",
  rate_limited: "Hiciste muchos intentos. Espera un rato antes de volver a intentar.",
  cola_no_disponible: "No pudimos enviar el email de confirmación. Intenta de nuevo en unos minutos.",
  invalido: "Revisa que el email esté bien escrito.",
};

export function FormularioEmail({ tieneClave }: { tieneClave: boolean }) {
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [claveActual, setClaveActual] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function pedir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta/email", "POST", tieneClave ? { nuevoEmail, claveActual } : { nuevoEmail });
    setEnviando(false);
    setMensaje(
      respuesta.ok
        ? `Te enviamos un enlace a ${nuevoEmail.trim()}. Ábrelo para confirmar el cambio.`
        : ((respuesta.error && ERRORES[respuesta.error]) ?? "No pudimos pedir el cambio. Intenta de nuevo.")
    );
    if (respuesta.ok) setClaveActual("");
  }

  return (
    <form className="grid gap-3" onSubmit={pedir}>
      <Label>
        Nuevo email
        <Input type="email" value={nuevoEmail} onChange={(evento) => setNuevoEmail(evento.target.value)} required autoComplete="email" />
      </Label>
      {tieneClave ? (
        <Label>
          Contraseña actual
          <Input type="password" value={claveActual} onChange={(evento) => setClaveActual(evento.target.value)} required autoComplete="current-password" />
        </Label>
      ) : null}
      <div>
        <Button type="submit" disabled={enviando}>
          Enviar confirmación
        </Button>
      </div>
      {mensaje ? (
        <p role="status" className="text-sm font-bold">
          {mensaje}
        </p>
      ) : null}
    </form>
  );
}
```

`src/components/cuenta/formulario-clave.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

const ERRORES: Record<string, string> = {
  clave_incorrecta: "La contraseña actual no es correcta.",
  invalido: "La contraseña nueva debe tener al menos 8 caracteres.",
  rate_limited: "Hiciste muchos intentos. Espera un rato antes de volver a intentar.",
};

export function FormularioClave() {
  const [claveActual, setClaveActual] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function cambiar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta/clave", "POST", { claveActual, claveNueva });
    setEnviando(false);
    setMensaje(respuesta.ok ? "Tu contraseña cambió." : ((respuesta.error && ERRORES[respuesta.error]) ?? "No pudimos cambiar la contraseña."));
    if (respuesta.ok) {
      setClaveActual("");
      setClaveNueva("");
    }
  }

  return (
    <form className="grid gap-3" onSubmit={cambiar}>
      <Label>
        Contraseña actual
        <Input type="password" value={claveActual} onChange={(evento) => setClaveActual(evento.target.value)} required autoComplete="current-password" />
      </Label>
      <Label>
        Contraseña nueva
        <Input type="password" value={claveNueva} onChange={(evento) => setClaveNueva(evento.target.value)} required minLength={8} autoComplete="new-password" />
      </Label>
      <div>
        <Button type="submit" disabled={enviando}>
          Cambiar contraseña
        </Button>
      </div>
      {mensaje ? (
        <p role="status" className="text-sm font-bold">
          {mensaje}
        </p>
      ) : null}
    </form>
  );
}
```

`src/components/cuenta/seccion-eliminar.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

const ERRORES: Record<string, string> = {
  clave_incorrecta: "La contraseña no es correcta.",
  confirmacion_incorrecta: "El email no coincide con el de tu cuenta.",
};

export function SeccionEliminar({ tieneClave }: { tieneClave: boolean }) {
  const [confirmacion, setConfirmacion] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function eliminar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta", "DELETE", { confirmacion });
    if (respuesta.ok) {
      window.location.assign("/");
      return;
    }
    setEnviando(false);
    setMensaje((respuesta.error && ERRORES[respuesta.error]) ?? "No pudimos eliminar la cuenta. Intenta de nuevo.");
  }

  return (
    <form className="grid gap-3" onSubmit={eliminar}>
      <Label>
        {tieneClave ? "Escribe tu contraseña para confirmar" : "Escribe tu email para confirmar"}
        <Input
          type={tieneClave ? "password" : "email"}
          value={confirmacion}
          onChange={(evento) => setConfirmacion(evento.target.value)}
          required
          autoComplete="off"
        />
      </Label>
      <div>
        <Button type="submit" variant="destructive" disabled={enviando}>
          Eliminar mi cuenta
        </Button>
      </div>
      {mensaje ? (
        <p role="alert" className="text-sm font-bold text-destructive">
          {mensaje}
        </p>
      ) : null}
    </form>
  );
}
```

- [ ] **Step 5: Crear la página de perfil, la confirmación del email nuevo y el enlace en el menú**

`src/app/(dashboard)/perfil/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { FormularioClave } from "@/components/cuenta/formulario-clave";
import { FormularioEmail } from "@/components/cuenta/formulario-email";
import { FormularioNombre } from "@/components/cuenta/formulario-nombre";
import { Seccion } from "@/components/cuenta/seccion";
import { SeccionEliminar } from "@/components/cuenta/seccion-eliminar";
import { auth } from "@/lib/auth";
import { obtenerPerfil } from "@/lib/cuenta/perfil";

export const metadata = { title: "Tu perfil" };

export default async function PerfilPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login?callbackUrl=/perfil");
  const perfil = await obtenerPerfil(getDb(), userId);
  if (!perfil) redirect("/login?callbackUrl=/perfil");

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <p className="font-mono text-sm font-bold text-primary">{"> cat ~/.perfil"}</p>
      <h1 className="text-3xl font-black">Tu perfil</h1>

      <Seccion titulo="Datos de la cuenta">
        <p className="text-sm text-muted-foreground">
          Email: <strong className="text-foreground">{perfil.email}</strong>
          {perfil.emailVerificado ? " · confirmado" : ""}
        </p>
        <FormularioNombre nombreActual={perfil.nombre ?? ""} />
      </Seccion>

      <Seccion titulo="Cambiar email" descripcion="Te enviamos un enlace al email nuevo. El cambio se hace cuando lo confirmas desde ahí.">
        <FormularioEmail tieneClave={perfil.tieneClave} />
      </Seccion>

      <Seccion titulo="Cambiar contraseña">
        {perfil.tieneClave ? (
          <FormularioClave />
        ) : (
          <p className="text-sm text-muted-foreground">Entras con Google, así que tu cuenta no tiene contraseña.</p>
        )}
      </Seccion>

      <Seccion titulo="Descargar tus datos" descripcion="Tienes derecho a acceder a tus datos personales. Descarga en un archivo JSON todo lo que guardamos de ti.">
        <a className="btn btn-secondary w-fit" href="/api/cuenta/datos">
          Descargar mis datos
        </a>
      </Seccion>

      <Seccion titulo="Eliminar cuenta" descripcion="Se borran tu progreso, tus entregables, tus certificados y tu portafolio. No se puede deshacer.">
        <SeccionEliminar tieneClave={perfil.tieneClave} />
      </Seccion>
    </main>
  );
}
```

`src/app/(cuenta)/confirmar-email/page.tsx`:
```tsx
import Link from "next/link";
import { Suspense } from "react";
import { ConfirmarToken } from "@/components/cuenta/confirmar-token";

export const metadata = { title: "Confirma tu nuevo email", robots: { index: false } };

export default function ConfirmarEmailPage() {
  return (
    <main className="mx-auto grid max-w-lg px-4 py-16">
      <Suspense fallback={null}>
        <ConfirmarToken
          endpoint="/api/cuenta/email/confirmar"
          titulo="Confirma tu nuevo email"
          boton="Confirmar nuevo email"
          exito={
            <p>
              Tu email cambió. Desde ahora entras con el nuevo. Si tenías la sesión abierta, vuelve a{" "}
              <Link className="font-bold text-primary hover:underline" href="/login">
                entrar
              </Link>{" "}
              para verlo en tu cuenta.
            </p>
          }
          errores={{
            invalido: "El enlace no es válido o ya se usó.",
            vencido: "El enlace venció. Pide el cambio de nuevo desde tu perfil.",
            email_en_uso: "Ese email ya lo usa otra cuenta.",
          }}
        />
      </Suspense>
    </main>
  );
}
```

En `src/components/site-header.tsx`:

1. Cambiar el import de íconos por:
```tsx
import { LayoutDashboard, Settings, UserRound } from "lucide-react";
```

2. Justo antes de `<SignOutButton />`, agregar:
```tsx
              <Link
                href="/perfil"
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-surface-raised hover:text-foreground"
              >
                <UserRound size={15} />
                Perfil
              </Link>
```

- [ ] **Step 6: Correr los tests de web y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS y `tsc` sin errores.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(cuenta): api y pagina de perfil con confirmacion del email nuevo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Emisión de certificados al completar un caso o una ruta

**Files:**
- Create: `apps/web/src/lib/certificados/servicio.ts`, `apps/web/src/lib/certificados/otorgar.ts`
- Test: `apps/web/src/lib/certificados/servicio.test.ts`, `apps/web/src/lib/certificados/otorgar.test.ts`
- Modify: `apps/web/src/app/api/progreso/route.ts`, `apps/web/src/app/api/progreso/sync/route.ts`, `apps/web/src/app/api/entregables/route.ts`
- Modify: `apps/web/src/app/api/progreso/route.test.ts`, `apps/web/src/app/api/entregables/route.test.ts`

**Interfaces:**
- Consumes: `certificados`, `certificadosLegacy` (Task 3), `casoInscripciones`, `rutaInscripciones`, `rutaCasos`, `casos`, `rutas` (Fase 2), `enlaceCertificado`, `Encolar`, `encolarSinFallar` (Task 4).
- Produces:
  - `@/lib/certificados/servicio`:
    - `generarCodigo(largo = 12): string`, con un alfabeto sin caracteres ambiguos (no usa 0/O ni 1/l/I);
    - `type CertificadoEmitido = { codigo: string; tipo: "caso" | "ruta"; titulo: string }`;
    - `type CertificadoPublico = { codigo; tipo: "caso" | "ruta" | "curso"; titulo; cargo: string | null; nombreAlumno; emitidoEn: Date; legado: boolean }`;
    - `emitirCertificadosDelCaso(db, userId, casoSlug): Promise<CertificadoEmitido[]>`: devuelve solo los recién emitidos, así que es idempotente;
    - `buscarCertificado(db, codigo): Promise<CertificadoPublico | null>` (primero en `certificados`, después en `certificados_legacy`);
    - `listarCertificados(db, userId): Promise<CertificadoPublico[]>`.
  - `@/lib/certificados/otorgar`: `otorgarCertificados(db, userId, casoSlug, encolar): Promise<CertificadoEmitido[]>` (emite y encola `certificado-emitido`).
  - `POST /api/progreso` y `POST /api/entregables` responden además `certificados: CertificadoEmitido[]`. `POST /api/progreso/sync` también emite los certificados de los casos que se completan con lo pendiente.

- [ ] **Step 1: Escribir los tests que fallan**

`src/lib/certificados/servicio.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  casoInscripciones,
  casos,
  certificados,
  certificadosLegacy,
  rutaCasos,
  rutaInscripciones,
  rutas,
  users,
} from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { buscarCertificado, emitirCertificadosDelCaso, generarCodigo, listarCertificados } from "./servicio";

const { db, close } = createTestDb();

async function escenario({
  nombre = "Ana Rojas" as string | null,
  casoCompleto = true,
  rutaCompleta = true,
} = {}) {
  const [usuario] = await db.insert(users).values({ email: "ana@correo.cl", name: nombre }).returning({ id: users.id });
  const [ruta] = await db
    .insert(rutas)
    .values({ slug: "data-analyst", titulo: "Data Analyst", cargo: "Analista de datos junior", descripcion: "Ruta", estado: "publicada" })
    .returning({ id: rutas.id });
  const [caso] = await db
    .insert(casos)
    .values({ slug: "ventas", titulo: "Ventas de marzo", cargo: "Analista de datos junior", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
    .returning({ id: casos.id });
  await db.insert(rutaCasos).values({ rutaId: ruta.id, casoId: caso.id, orden: 0 });
  await db.insert(casoInscripciones).values({ userId: usuario.id, casoId: caso.id, completadoEn: casoCompleto ? new Date() : null });
  await db.insert(rutaInscripciones).values({ userId: usuario.id, rutaId: ruta.id, completadoEn: rutaCompleta ? new Date() : null });
  return usuario.id;
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("generarCodigo", () => {
  it("genera 12 caracteres sin letras ni números ambiguos", () => {
    for (let i = 0; i < 50; i += 1) expect(generarCodigo()).toMatch(/^[A-HJ-NP-Za-km-z2-9]{12}$/);
  });
});

describe("emitirCertificadosDelCaso", () => {
  it("emite el certificado del caso y el de la ruta, con una foto fija del alumno y el título", async () => {
    const userId = await escenario();
    const emitidos = await emitirCertificadosDelCaso(db, userId, "ventas");
    expect(emitidos.map(({ tipo, titulo }) => ({ tipo, titulo }))).toEqual([
      { tipo: "caso", titulo: "Ventas de marzo" },
      { tipo: "ruta", titulo: "Data Analyst" },
    ]);
    const filas = await db.select().from(certificados);
    expect(filas.map((fila) => [fila.nombreAlumno, fila.cargo])).toEqual([
      ["Ana Rojas", "Analista de datos junior"],
      ["Ana Rojas", "Analista de datos junior"],
    ]);
  });

  it("no emite dos veces el mismo certificado", async () => {
    const userId = await escenario();
    await emitirCertificadosDelCaso(db, userId, "ventas");
    expect(await emitirCertificadosDelCaso(db, userId, "ventas")).toEqual([]);
    expect(await db.select().from(certificados)).toHaveLength(2);
  });

  it("no emite nada si el caso no está completo", async () => {
    const userId = await escenario({ casoCompleto: false, rutaCompleta: false });
    expect(await emitirCertificadosDelCaso(db, userId, "ventas")).toEqual([]);
  });

  it("sin nombre usa la parte del email antes de la @", async () => {
    const userId = await escenario({ nombre: null, rutaCompleta: false });
    await emitirCertificadosDelCaso(db, userId, "ventas");
    const [fila] = await db.select().from(certificados);
    expect(fila.nombreAlumno).toBe("ana");
  });

  it("un caso que no existe no emite nada", async () => {
    const userId = await escenario();
    expect(await emitirCertificadosDelCaso(db, userId, "otro")).toEqual([]);
  });
});

describe("buscarCertificado y listarCertificados", () => {
  it("encuentra los certificados nuevos y los de la v1", async () => {
    const userId = await escenario({ rutaCompleta: false });
    const [nuevo] = await emitirCertificadosDelCaso(db, userId, "ventas");
    await db.insert(certificadosLegacy).values({
      codigo: "V1codigo1234",
      nombreAlumno: "Pedro Soto",
      titulo: "SQL inicial",
      tipo: "curso",
      emitidoEn: new Date("2026-03-01T12:00:00Z"),
    });

    expect(await buscarCertificado(db, nuevo.codigo)).toMatchObject({ tipo: "caso", titulo: "Ventas de marzo", legado: false });
    expect(await buscarCertificado(db, "V1codigo1234")).toMatchObject({
      tipo: "curso",
      nombreAlumno: "Pedro Soto",
      cargo: null,
      legado: true,
    });
    expect(await buscarCertificado(db, "no-existe")).toBeNull();
  });

  it("lista los certificados de la alumna", async () => {
    const userId = await escenario();
    await emitirCertificadosDelCaso(db, userId, "ventas");
    expect((await listarCertificados(db, userId)).map((certificado) => certificado.tipo).sort()).toEqual(["caso", "ruta"]);
  });
});
```

`src/lib/certificados/otorgar.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { casoInscripciones, casos, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import type { Encolar } from "@/lib/emails";
import { otorgarCertificados } from "./otorgar";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("otorgarCertificados", () => {
  it("avisa por email con el enlace a cada certificado nuevo, y no repite el aviso", async () => {
    const [usuario] = await db.insert(users).values({ email: "ana@correo.cl", name: "Ana" }).returning({ id: users.id });
    const [caso] = await db
      .insert(casos)
      .values({ slug: "ventas", titulo: "Ventas de marzo", cargo: "Analista", empresa: "Distribuidora", entregable: "Repo", misiones: [] })
      .returning({ id: casos.id });
    await db.insert(casoInscripciones).values({ userId: usuario.id, casoId: caso.id, completadoEn: new Date() });

    const [certificado] = await otorgarCertificados(db, usuario.id, "ventas", encolar);
    expect(enviados).toEqual([
      {
        tipo: "certificado-emitido",
        para: "ana@correo.cl",
        nombre: "Ana",
        titulo: "el caso Ventas de marzo",
        enlace: expect.stringContaining(`/certificados/${certificado.codigo}`),
      },
    ]);

    await otorgarCertificados(db, usuario.id, "ventas", encolar);
    expect(enviados).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/certificados`
Expected: FAIL, porque no se pueden resolver `./servicio` ni `./otorgar`.

- [ ] **Step 3: Crear `src/lib/certificados/servicio.ts` y `otorgar.ts`** (la emisión está portada de `$V1/apps/web/src/lib/certificates/service.ts`)

`src/lib/certificados/servicio.ts`:
```ts
import { randomInt } from "node:crypto";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import {
  casoInscripciones,
  casos,
  certificados,
  certificadosLegacy,
  rutaCasos,
  rutaInscripciones,
  rutas,
  users,
} from "@syntaxerror/db/schema";

// Sin 0/O ni 1/l/I: el código se lee en voz alta o se copia desde un PDF.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generarCodigo(largo = 12): string {
  return Array.from({ length: largo }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
}

export type TipoCertificado = "caso" | "ruta";
export type CertificadoEmitido = { codigo: string; tipo: TipoCertificado; titulo: string };
export type CertificadoPublico = {
  codigo: string;
  tipo: TipoCertificado | "curso";
  titulo: string;
  cargo: string | null;
  nombreAlumno: string;
  emitidoEn: Date;
  legado: boolean;
};

function nombreParaCertificado(usuario: { name: string | null; email: string }): string {
  return usuario.name?.trim() || usuario.email.split("@")[0];
}

// Emite lo que falte: onConflictDoNothing sobre los índices únicos evita duplicados aunque dos requests lleguen a la vez.
export async function emitirCertificadosDelCaso(db: AppDb, userId: string, casoSlug: string): Promise<CertificadoEmitido[]> {
  const [caso] = await db.select().from(casos).where(eq(casos.slug, casoSlug));
  const [usuario] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId));
  if (!caso || !usuario) return [];
  const nombreAlumno = nombreParaCertificado(usuario);
  const emitidos: CertificadoEmitido[] = [];

  const [inscripcion] = await db
    .select({ completadoEn: casoInscripciones.completadoEn })
    .from(casoInscripciones)
    .where(and(eq(casoInscripciones.userId, userId), eq(casoInscripciones.casoId, caso.id)));
  if (inscripcion?.completadoEn) {
    const [nuevo] = await db
      .insert(certificados)
      .values({ userId, tipo: "caso", casoId: caso.id, codigo: generarCodigo(), nombreAlumno, titulo: caso.titulo, cargo: caso.cargo })
      .onConflictDoNothing()
      .returning({ codigo: certificados.codigo });
    if (nuevo) emitidos.push({ codigo: nuevo.codigo, tipo: "caso", titulo: caso.titulo });
  }

  const rutasCompletas = await db
    .select({ id: rutas.id, titulo: rutas.titulo, cargo: rutas.cargo })
    .from(rutaCasos)
    .innerJoin(rutas, eq(rutas.id, rutaCasos.rutaId))
    .innerJoin(rutaInscripciones, and(eq(rutaInscripciones.rutaId, rutas.id), eq(rutaInscripciones.userId, userId)))
    .where(and(eq(rutaCasos.casoId, caso.id), isNotNull(rutaInscripciones.completadoEn)));
  for (const ruta of rutasCompletas) {
    const [nuevo] = await db
      .insert(certificados)
      .values({ userId, tipo: "ruta", rutaId: ruta.id, codigo: generarCodigo(), nombreAlumno, titulo: ruta.titulo, cargo: ruta.cargo })
      .onConflictDoNothing()
      .returning({ codigo: certificados.codigo });
    if (nuevo) emitidos.push({ codigo: nuevo.codigo, tipo: "ruta", titulo: ruta.titulo });
  }
  return emitidos;
}

export async function buscarCertificado(db: AppDb, codigo: string): Promise<CertificadoPublico | null> {
  const [actual] = await db.select().from(certificados).where(eq(certificados.codigo, codigo));
  if (actual) {
    return {
      codigo: actual.codigo,
      tipo: actual.tipo === "ruta" ? "ruta" : "caso",
      titulo: actual.titulo,
      cargo: actual.cargo,
      nombreAlumno: actual.nombreAlumno,
      emitidoEn: actual.emitidoEn,
      legado: false,
    };
  }
  const [legado] = await db.select().from(certificadosLegacy).where(eq(certificadosLegacy.codigo, codigo));
  if (!legado) return null;
  return {
    codigo: legado.codigo,
    tipo: legado.tipo === "ruta" ? "ruta" : "curso",
    titulo: legado.titulo,
    cargo: null,
    nombreAlumno: legado.nombreAlumno,
    emitidoEn: legado.emitidoEn,
    legado: true,
  };
}

export async function listarCertificados(db: AppDb, userId: string): Promise<CertificadoPublico[]> {
  const filas = await db.select().from(certificados).where(eq(certificados.userId, userId)).orderBy(desc(certificados.emitidoEn));
  return filas.map((fila) => ({
    codigo: fila.codigo,
    tipo: fila.tipo === "ruta" ? "ruta" : "caso",
    titulo: fila.titulo,
    cargo: fila.cargo,
    nombreAlumno: fila.nombreAlumno,
    emitidoEn: fila.emitidoEn,
    legado: false,
  }));
}
```

`src/lib/certificados/otorgar.ts`:
```ts
import { eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { users } from "@syntaxerror/db/schema";
import { enlaceCertificado } from "@/lib/cuenta/enlaces";
import type { Encolar } from "@/lib/emails";
import { emitirCertificadosDelCaso, type CertificadoEmitido } from "./servicio";

export async function otorgarCertificados(
  db: AppDb,
  userId: string,
  casoSlug: string,
  encolar: Encolar
): Promise<CertificadoEmitido[]> {
  const emitidos = await emitirCertificadosDelCaso(db, userId, casoSlug);
  if (emitidos.length === 0) return emitidos;
  const [usuario] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId));
  if (!usuario) return emitidos;
  for (const certificado of emitidos) {
    await encolar({
      tipo: "certificado-emitido",
      para: usuario.email,
      nombre: usuario.name,
      titulo: certificado.tipo === "ruta" ? `la ruta ${certificado.titulo}` : `el caso ${certificado.titulo}`,
      enlace: enlaceCertificado(certificado.codigo),
    });
  }
  return emitidos;
}
```

- [ ] **Step 4: Otorgar los certificados desde las APIs de progreso y entregables**

Reemplazar `src/app/api/progreso/route.ts` por:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { otorgarCertificados } from "@/lib/certificados/otorgar";
import { encolarSinFallar } from "@/lib/emails";
import { intentoSchema } from "@/lib/progreso/esquemas";
import { ErrorProgreso, obtenerProgresoCaso, registrarIntento } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const caso = new URL(request.url).searchParams.get("caso");
  if (!caso) return NextResponse.json({ error: "falta_caso" }, { status: 400 });

  const progreso = await obtenerProgresoCaso(getDb(), userId, caso);
  if (!progreso) return NextResponse.json({ error: "caso_no_existe" }, { status: 404 });
  return NextResponse.json(progreso, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = intentoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });

  try {
    const db = getDb();
    const resultado = await registrarIntento(db, userId, parsed.data);
    const certificados = resultado.casoCompleto
      ? await otorgarCertificados(db, userId, parsed.data.caso, encolarSinFallar)
      : [];
    return NextResponse.json({ ...resultado, certificados });
  } catch (error) {
    if (error instanceof ErrorProgreso) return NextResponse.json({ error: error.codigo }, { status: 404 });
    throw error;
  }
}
```

Reemplazar `src/app/api/progreso/sync/route.ts` por:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { otorgarCertificados } from "@/lib/certificados/otorgar";
import { encolarSinFallar } from "@/lib/emails";
import { sincronizacionSchema } from "@/lib/progreso/esquemas";
import { sincronizarIntentos } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = sincronizacionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "datos_invalidos" }, { status: 400 });

  const db = getDb();
  const resultado = await sincronizarIntentos(db, userId, parsed.data.intentos);
  // Lo que se hizo sin sesión también puede completar un caso.
  for (const caso of new Set(parsed.data.intentos.map((intento) => intento.caso))) {
    await otorgarCertificados(db, userId, caso, encolarSinFallar);
  }
  return NextResponse.json(resultado);
}
```

Reemplazar `src/app/api/entregables/route.ts` por:
```ts
import { NextResponse } from "next/server";
import { getDb } from "@syntaxerror/db/client";
import { otorgarCertificados } from "@/lib/certificados/otorgar";
import { encolarSinFallar } from "@/lib/emails";
import { entregableSchema } from "@/lib/progreso/esquemas";
import { ErrorProgreso, guardarEntregable } from "@/lib/progreso/servicio";
import { obtenerUsuarioId } from "@/lib/sesion";

export async function POST(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = entregableSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "url_invalida" }, { status: 400 });

  try {
    const db = getDb();
    const resultado = await guardarEntregable(db, userId, parsed.data);
    const certificados = resultado.casoCompleto
      ? await otorgarCertificados(db, userId, parsed.data.caso, encolarSinFallar)
      : [];
    return NextResponse.json({ ...resultado, certificados });
  } catch (error) {
    if (error instanceof ErrorProgreso) return NextResponse.json({ error: error.codigo }, { status: 404 });
    throw error;
  }
}
```

- [ ] **Step 5: Ajustar los tests de las rutas de la Fase 2**

En `src/app/api/progreso/route.test.ts`:

1. Agregar después de `vi.mock("@/lib/sesion", ...)`:
```ts
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));
```
2. Cambiar `expect(await respuesta.json()).toEqual({ misionAprobada: true, casoCompleto: false });` por:
```ts
    expect(await respuesta.json()).toEqual({ misionAprobada: true, casoCompleto: false, certificados: [] });
```

En `src/app/api/entregables/route.test.ts`:

1. Cambiar el import de schema por:
```ts
import { casos, misionProgreso, users } from "@syntaxerror/db/schema";
```
2. Agregar después de `vi.mock("@/lib/sesion", ...)`:
```ts
vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));
```
3. Cambiar `expect(await respuesta.json()).toEqual({ casoCompleto: false });` por:
```ts
    expect(await respuesta.json()).toEqual({ casoCompleto: false, certificados: [] });
```
4. Agregar este test al final del `describe`:
```ts
  it("al completar el caso responde con su certificado", async () => {
    const [usuario] = await db.select().from(users);
    const [caso] = await db.select().from(casos);
    await db.insert(misionProgreso).values({
      userId: usuario.id,
      casoId: caso.id,
      mision: "m1",
      estado: "aprobada",
      tareasAprobadas: ["t1"],
    });
    const respuesta = await enviar({ caso: "ventas", url: "https://github.com/alumna/ventas" });
    const cuerpo = await respuesta.json();
    expect(cuerpo.casoCompleto).toBe(true);
    expect(cuerpo.certificados).toEqual([{ codigo: expect.any(String), tipo: "caso", titulo: "Ventas" }]);
  });
```

- [ ] **Step 6: Correr los tests de web y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS (10 tests nuevos) y `tsc` sin errores.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(certificados): emision al completar caso o ruta, con aviso por email

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Certificado imprimible, verificación pública y certificados en el panel

**Files:**
- Create: `apps/web/src/lib/certificados/formato.ts`
- Create: `apps/web/src/app/(cuenta)/verificar/[codigo]/page.tsx`
- Create: `apps/web/src/app/(certificado)/layout.tsx`, `apps/web/src/app/(certificado)/certificados/[codigo]/page.tsx`
- Create: `apps/web/src/components/certificados/boton-imprimir.tsx`
- Test: `apps/web/src/lib/certificados/formato.test.ts`
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `apps/web/src/components/mision/panel-caso.tsx`

**Interfaces:**
- Consumes: `buscarCertificado`, `listarCertificados`, `CertificadoEmitido` (Task 7), `enlaceVerificarCertificado` (Task 4).
- Produces:
  - `fechaLarga(fecha: Date): string` (por ejemplo, `3 de marzo de 2026`, en hora de Chile) y `descripcionTipo(tipo): "el caso" | "la ruta" | "el curso"`;
  - `/verificar/[codigo]`: título `Certificado válido` o `Código no encontrado`, y enlace `Ver certificado` (salvo en los certificados legacy);
  - `/certificados/[codigo]`: certificado imprimible, sin encabezado del sitio, con el botón `Imprimir o guardar en PDF`;
  - En el panel, la sección `Tus certificados`. En el caso, al guardar el entregable que lo completa, aparecen los enlaces `Ver tu certificado del caso` y `Ver tu certificado de la ruta <título>`.

- [ ] **Step 1: Escribir el test que falla, `src/lib/certificados/formato.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { descripcionTipo, fechaLarga } from "./formato";

describe("formato de certificados", () => {
  it("escribe la fecha en español de Chile y en hora de Chile", () => {
    expect(fechaLarga(new Date("2026-03-03T15:00:00Z"))).toBe("3 de marzo de 2026");
    // 02:00 UTC del 4 de marzo todavía es 3 de marzo en Santiago.
    expect(fechaLarga(new Date("2026-03-04T02:00:00Z"))).toBe("3 de marzo de 2026");
  });

  it("describe cada tipo de certificado", () => {
    expect([descripcionTipo("caso"), descripcionTipo("ruta"), descripcionTipo("curso")]).toEqual(["el caso", "la ruta", "el curso"]);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/certificados/formato.test.ts`
Expected: FAIL, porque no se puede resolver `./formato`.

- [ ] **Step 3: Crear `src/lib/certificados/formato.ts`**

```ts
import type { CertificadoPublico } from "./servicio";

export function fechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Santiago" });
}

export function descripcionTipo(tipo: CertificadoPublico["tipo"]): string {
  if (tipo === "ruta") return "la ruta";
  if (tipo === "curso") return "el curso";
  return "el caso";
}
```

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/certificados/formato.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 4: Crear la página de verificación pública**

`src/app/(cuenta)/verificar/[codigo]/page.tsx`:
```tsx
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { getDb } from "@syntaxerror/db/client";
import { Card } from "@syntaxerror/ui/components/card";
import { descripcionTipo, fechaLarga } from "@/lib/certificados/formato";
import { buscarCertificado } from "@/lib/certificados/servicio";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verificar certificado", robots: { index: false, follow: true } };

export default async function VerificarCertificadoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const certificado = await buscarCertificado(getDb(), codigo);

  if (!certificado) {
    return (
      <main className="mx-auto grid max-w-lg px-4 py-16">
        <Card className="grid gap-3 p-7 text-center">
          <XCircle className="mx-auto text-destructive" size={36} />
          <h1 className="text-2xl font-black">Código no encontrado</h1>
          <p className="text-muted-foreground">No existe un certificado con el código {codigo}. Revisa que esté bien escrito.</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-lg px-4 py-16">
      <Card className="grid gap-3 p-7 text-center">
        <CheckCircle2 className="mx-auto text-primary" size={40} />
        <p className="section-kicker">Verificación pública</p>
        <h1 className="text-3xl font-black">Certificado válido</h1>
        <p className="text-lg">
          {certificado.nombreAlumno} completó {descripcionTipo(certificado.tipo)}
        </p>
        <p className="text-xl font-black">{certificado.titulo}</p>
        {certificado.cargo ? <p className="text-sm text-muted-foreground">Perfil: {certificado.cargo}</p> : null}
        <p className="text-sm text-muted-foreground">
          Emitido el {fechaLarga(certificado.emitidoEn)} · código <span className="font-mono">{certificado.codigo}</span>
        </p>
        {!certificado.legado ? (
          <Link className="btn btn-secondary mx-auto w-fit" href={`/certificados/${certificado.codigo}`}>
            Ver certificado
          </Link>
        ) : null}
      </Card>
    </main>
  );
}
```

- [ ] **Step 5: Crear el certificado imprimible**

`src/app/(certificado)/layout.tsx`:
```tsx
import type { ReactNode } from "react";

// Sin encabezado ni pie: la página se imprime o se guarda en PDF tal cual.
export default function CertificadoLayout({ children }: { children: ReactNode }) {
  return children;
}
```

`src/components/certificados/boton-imprimir.tsx`:
```tsx
"use client";

import { Button } from "@syntaxerror/ui/components/button";

export function BotonImprimir() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Imprimir o guardar en PDF
    </Button>
  );
}
```

`src/app/(certificado)/certificados/[codigo]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { BotonImprimir } from "@/components/certificados/boton-imprimir";
import { descripcionTipo, fechaLarga } from "@/lib/certificados/formato";
import { buscarCertificado } from "@/lib/certificados/servicio";
import { enlaceVerificarCertificado } from "@/lib/cuenta/enlaces";

export const dynamic = "force-dynamic";

type Parametros = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Parametros) {
  const certificado = await buscarCertificado(getDb(), (await params).codigo);
  return {
    title: certificado ? `Certificado de ${certificado.nombreAlumno}` : "Certificado",
    robots: { index: false, follow: false },
  };
}

export default async function CertificadoPage({ params }: Parametros) {
  const certificado = await buscarCertificado(getDb(), (await params).codigo);
  if (!certificado || certificado.legado) notFound();

  return (
    <main className="grid min-h-dvh place-items-center gap-6 bg-background px-4 py-10 print:min-h-0 print:bg-white print:p-0">
      <article className="grid w-full max-w-4xl gap-6 rounded-lg border-2 border-primary bg-surface p-10 text-center shadow-2xl sm:p-14 print:max-w-none print:border print:bg-white print:text-black print:shadow-none">
        <p className="font-mono text-sm font-bold text-primary">{"> syntaxError.cl_"}</p>
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground print:text-black">
          {certificado.tipo === "ruta" ? "Certificado de ruta completada" : "Certificado de caso completado"}
        </p>
        <h1 className="text-4xl font-black sm:text-5xl">{certificado.nombreAlumno}</h1>
        <p className="text-lg text-muted-foreground print:text-black">completó {descripcionTipo(certificado.tipo)}</p>
        <p className="text-2xl font-black sm:text-3xl">{certificado.titulo}</p>
        {certificado.cargo ? <p>Perfil: {certificado.cargo}</p> : null}
        <p>Emitido el {fechaLarga(certificado.emitidoEn)}</p>
        <div className="grid gap-1 border-t border-border pt-4 font-mono text-xs text-muted-foreground print:text-black">
          <p>Código: {certificado.codigo}</p>
          <p>Verifícalo en {enlaceVerificarCertificado(certificado.codigo)}</p>
        </div>
      </article>
      <div className="flex flex-wrap justify-center gap-3 print:hidden">
        <BotonImprimir />
        <Link className="btn btn-secondary" href={`/verificar/${certificado.codigo}`}>
          Verificar
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Mostrar los certificados en el panel y en el caso**

En `src/app/(dashboard)/dashboard/page.tsx`:

1. Agregar el import:
```tsx
import { listarCertificados } from "@/lib/certificados/servicio";
```
2. Debajo de `const verificar = ...`, agregar:
```tsx
  const certificadosDelUsuario = userId ? await listarCertificados(getDb(), userId) : [];
```
3. Después de la sección `Tus casos` (antes de `</main>`), agregar:
```tsx
      <section className="grid gap-3">
        <h2 className="text-xl font-black">Tus certificados</h2>
        {certificadosDelUsuario.length === 0 ? (
          <p className="text-muted-foreground">Cuando completes un caso con su entregable, tu certificado aparece aquí.</p>
        ) : (
          <ul className="grid gap-3">
            {certificadosDelUsuario.map((certificado) => (
              <li key={certificado.codigo}>
                <Link
                  href={`/certificados/${certificado.codigo}`}
                  className="card flex items-center justify-between gap-4 p-4 hover:border-primary"
                >
                  <span className="font-bold">{certificado.titulo}</span>
                  <span className="font-mono text-xs text-muted-foreground">{certificado.codigo}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
```

En `src/components/mision/panel-caso.tsx`:

1. Debajo de `type MisionDelCaso = ...`, agregar:
```tsx
type CertificadoNuevo = { codigo: string; tipo: "caso" | "ruta"; titulo: string };
```
2. Debajo de `const [enviando, setEnviando] = useState(false);`, agregar:
```tsx
  const [certificados, setCertificados] = useState<CertificadoNuevo[]>([]);
```
3. Reemplazar:
```tsx
      const { casoCompleto } = (await respuesta.json()) as { casoCompleto: boolean };
```
por:
```tsx
      const { casoCompleto, certificados: nuevos } = (await respuesta.json()) as {
        casoCompleto: boolean;
        certificados: CertificadoNuevo[];
      };
      setCertificados(nuevos);
```
4. Reemplazar `{progreso?.completo ? <p role="status" className="font-bold text-primary">Caso completo</p> : null}` por:
```tsx
        {progreso?.completo ? (
          <div className="grid gap-1">
            <p role="status" className="font-bold text-primary">
              Caso completo
            </p>
            <Link className="text-sm font-bold text-primary hover:underline" href="/dashboard">
              Ver tus certificados en tu panel
            </Link>
          </div>
        ) : null}
        {certificados.length > 0 ? (
          <ul className="grid gap-2">
            {certificados.map((certificado) => (
              <li key={certificado.codigo}>
                <Link className="font-bold text-primary hover:underline" href={`/certificados/${certificado.codigo}`}>
                  {certificado.tipo === "ruta" ? `Ver tu certificado de la ruta ${certificado.titulo}` : "Ver tu certificado del caso"}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
```

- [ ] **Step 7: Correr los tests de web y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS y `tsc` sin errores.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(certificados): certificado imprimible, verificacion publica y listado en el panel

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Portafolio público

**Files:**
- Create: `apps/web/src/lib/portafolio.ts`
- Create: `apps/web/src/app/api/cuenta/portafolio/route.ts`
- Create: `apps/web/src/components/cuenta/formulario-portafolio.tsx`
- Create: `apps/web/src/app/(cuenta)/p/[usuario]/page.tsx`
- Test: `apps/web/src/lib/portafolio.test.ts`, `apps/web/src/app/api/cuenta/portafolio/route.test.ts`
- Modify: `apps/web/src/app/(dashboard)/perfil/page.tsx` (sección `Portafolio público`)

**Interfaces:**
- Consumes: `users.usuario`, `users.portafolioPublico` (Task 3), `listarCertificados`, `CertificadoPublico` (Task 7), `fechaLarga` (Task 8), `esViolacionUnica`, `MetaRequest`, `metaDeRequest`, `enlacePortafolio`, `enviarJson` (Task 4), `Seccion` (Task 6).
- Produces:
  - `@/lib/portafolio`:
    - `PATRON_USUARIO`: de 3 a 30 caracteres entre minúsculas, números y guiones, sin guion al inicio ni al final;
    - `sugerirUsuario(nombre, email): string`;
    - `actualizarPortafolio(db, userId, { publico, usuario? }, meta)`, que devuelve `{ ok: true; usuario }` o `{ ok: false; motivo: "usuario_invalido" | "usuario_en_uso" | "usuario_requerido" }`;
    - `obtenerPortafolio(db, usuario): Promise<Portafolio | null>` (`null` si no existe o no es público).
  - `PATCH /api/cuenta/portafolio { publico, usuario? }`, que responde 409 si el usuario está tomado.
  - `/p/[usuario]` con el nombre como título, `Casos resueltos` (con el enlace `Ver entregable`) y `Certificados`.
  - En `/perfil`, la sección `Portafolio público` con la casilla `Hacer público mi portafolio`, el campo `Tu usuario`, el botón `Guardar portafolio` y el mensaje `Portafolio guardado.`.

- [ ] **Step 1: Escribir los tests que fallan**

`src/lib/portafolio.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { casoInscripciones, casos, entregables, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { emitirCertificadosDelCaso } from "@/lib/certificados/servicio";
import { SIN_META } from "@/lib/cuenta/meta";
import { actualizarPortafolio, obtenerPortafolio, sugerirUsuario } from "./portafolio";

const { db, close } = createTestDb();

async function crearUsuaria(email = "ana@correo.cl", nombre: string | null = "Ana Rojas") {
  const [usuario] = await db.insert(users).values({ email, name: nombre }).returning({ id: users.id });
  return usuario.id;
}

async function crearCaso(slug: string, titulo: string) {
  const [caso] = await db
    .insert(casos)
    .values({ slug, titulo, cargo: "Analista de datos junior", empresa: "Distribuidora Los Andes", entregable: "Repo", misiones: [] })
    .returning({ id: casos.id });
  return caso.id;
}

beforeEach(() => truncateAll(db));
afterAll(() => close());

describe("sugerirUsuario", () => {
  it("arma un usuario válido desde el nombre o el email", () => {
    expect(sugerirUsuario("Camila Rojas", "c@correo.cl")).toBe("camila-rojas");
    expect(sugerirUsuario("José Pérez Muñoz", "j@correo.cl")).toBe("jose-perez-munoz");
    expect(sugerirUsuario(null, "valentina.m@correo.cl")).toBe("valentina-m");
    expect(sugerirUsuario(null, "an@correo.cl")).toBe("an-cl");
  });
});

describe("actualizarPortafolio", () => {
  it("pide un usuario para publicar y valida su formato", async () => {
    const id = await crearUsuaria();
    expect(await actualizarPortafolio(db, id, { publico: true }, SIN_META)).toEqual({ ok: false, motivo: "usuario_requerido" });
    expect(await actualizarPortafolio(db, id, { publico: true, usuario: "Ana Rojas" }, SIN_META)).toEqual({
      ok: false,
      motivo: "usuario_invalido",
    });
    expect(await actualizarPortafolio(db, id, { publico: true, usuario: " Ana-Rojas " }, SIN_META)).toEqual({
      ok: true,
      usuario: "ana-rojas",
    });
  });

  it("no deja tomar un usuario ajeno", async () => {
    const ana = await crearUsuaria();
    const otra = await crearUsuaria("otra@correo.cl", "Otra");
    await actualizarPortafolio(db, ana, { publico: true, usuario: "ana-rojas" }, SIN_META);
    expect(await actualizarPortafolio(db, otra, { publico: true, usuario: "ana-rojas" }, SIN_META)).toEqual({
      ok: false,
      motivo: "usuario_en_uso",
    });
  });

  it("despublicar conserva el usuario elegido", async () => {
    const id = await crearUsuaria();
    await actualizarPortafolio(db, id, { publico: true, usuario: "ana-rojas" }, SIN_META);
    expect(await actualizarPortafolio(db, id, { publico: false }, SIN_META)).toEqual({ ok: true, usuario: "ana-rojas" });
    expect(await obtenerPortafolio(db, "ana-rojas")).toBeNull();
  });
});

describe("obtenerPortafolio", () => {
  it("muestra solo los casos completos, con su entregable y sus certificados", async () => {
    const id = await crearUsuaria();
    const completo = await crearCaso("ventas", "Ventas de marzo");
    const enCurso = await crearCaso("clientes", "Clientes de regiones");
    await db.insert(casoInscripciones).values([
      { userId: id, casoId: completo, completadoEn: new Date() },
      { userId: id, casoId: enCurso },
    ]);
    await db.insert(entregables).values({ userId: id, casoId: completo, url: "https://github.com/ana/ventas" });
    await emitirCertificadosDelCaso(db, id, "ventas");
    await actualizarPortafolio(db, id, { publico: true, usuario: "ana-rojas" }, SIN_META);

    const portafolio = await obtenerPortafolio(db, "Ana-Rojas");
    expect(portafolio).toMatchObject({ nombre: "Ana Rojas", usuario: "ana-rojas" });
    expect(portafolio?.casos.map((caso) => [caso.titulo, caso.entregable])).toEqual([
      ["Ventas de marzo", "https://github.com/ana/ventas"],
    ]);
    expect(portafolio?.certificados).toHaveLength(1);
  });

  it("un portafolio privado o inexistente no se muestra", async () => {
    const id = await crearUsuaria();
    await actualizarPortafolio(db, id, { publico: false, usuario: "ana-rojas" }, SIN_META);
    expect(await obtenerPortafolio(db, "ana-rojas")).toBeNull();
    expect(await obtenerPortafolio(db, "nadie")).toBeNull();
  });
});
```

`src/app/api/cuenta/portafolio/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";

vi.mock("@/lib/sesion", () => ({ obtenerUsuarioId: vi.fn(), cerrarSesion: vi.fn() }));

const { PATCH } = await import("./route");
const { obtenerUsuarioId } = await import("@/lib/sesion");
const { db, close } = createTestDb();

function guardar(cuerpo: unknown) {
  return PATCH(
    new Request("http://localhost:3000/api/cuenta/portafolio", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    })
  );
}

beforeEach(async () => {
  await truncateAll(db);
  vi.mocked(obtenerUsuarioId).mockResolvedValue(null);
});
afterAll(() => close());

describe("PATCH /api/cuenta/portafolio", () => {
  it("pide sesión", async () => {
    expect((await guardar({ publico: true, usuario: "ana-rojas" })).status).toBe(401);
  });

  it("publica el portafolio y responde 409 si el usuario ya es de otra cuenta", async () => {
    const [ana, otra] = await db
      .insert(users)
      .values([{ email: "ana@correo.cl" }, { email: "otra@correo.cl" }])
      .returning({ id: users.id });
    vi.mocked(obtenerUsuarioId).mockResolvedValue(ana.id);
    expect(await (await guardar({ publico: true, usuario: "ana-rojas" })).json()).toEqual({ ok: true, usuario: "ana-rojas" });

    vi.mocked(obtenerUsuarioId).mockResolvedValue(otra.id);
    expect((await guardar({ publico: true, usuario: "ana-rojas" })).status).toBe(409);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/portafolio.test.ts src/app/api/cuenta/portafolio`
Expected: FAIL, porque no se pueden resolver `./portafolio` ni `./route`.

- [ ] **Step 3: Crear `src/lib/portafolio.ts` y la ruta**

`src/lib/portafolio.ts`:
```ts
import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { casoInscripciones, casos, entregables, users } from "@syntaxerror/db/schema";
import { listarCertificados, type CertificadoPublico } from "@/lib/certificados/servicio";
import type { MetaRequest } from "@/lib/cuenta/meta";
import { esViolacionUnica } from "@/lib/errores-db";

export const PATRON_USUARIO = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export function sugerirUsuario(nombre: string | null, email: string): string {
  const base = (nombre?.trim() || email.split("@")[0])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
  return base.length >= 3 ? base : `${base || "alumno"}-cl`;
}

export type ResultadoPortafolio =
  | { ok: true; usuario: string | null }
  | { ok: false; motivo: "usuario_invalido" | "usuario_en_uso" | "usuario_requerido" };

export async function actualizarPortafolio(
  db: AppDb,
  userId: string,
  { publico, usuario }: { publico: boolean; usuario?: string },
  meta: MetaRequest
): Promise<ResultadoPortafolio> {
  const [actual] = await db.select().from(users).where(eq(users.id, userId));
  if (!actual) throw new Error("cuenta_no_encontrada");
  const elegido = usuario === undefined ? actual.usuario : usuario.trim().toLowerCase() || null;
  if (elegido && !PATRON_USUARIO.test(elegido)) return { ok: false, motivo: "usuario_invalido" };
  if (publico && !elegido) return { ok: false, motivo: "usuario_requerido" };
  if (elegido && elegido !== actual.usuario) {
    const [ocupado] = await db.select({ id: users.id }).from(users).where(and(eq(users.usuario, elegido), ne(users.id, userId)));
    if (ocupado) return { ok: false, motivo: "usuario_en_uso" };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.update(users).set({ usuario: elegido, portafolioPublico: publico, updatedAt: new Date() }).where(eq(users.id, userId));
      await insertAuditLogEntry(tx, {
        actorId: userId,
        actorEmail: actual.email,
        action: "portfolio_updated",
        targetType: "user",
        targetId: userId,
        metadata: { publico, usuario: elegido },
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
    });
  } catch (error) {
    // Otra cuenta pudo tomar el usuario entre la verificación de arriba y el UPDATE.
    if (esViolacionUnica(error)) return { ok: false, motivo: "usuario_en_uso" };
    throw error;
  }
  return { ok: true, usuario: elegido };
}

export type CasoDelPortafolio = {
  slug: string;
  titulo: string;
  empresa: string;
  cargo: string;
  completadoEn: Date;
  entregable: string | null;
};

export type Portafolio = { nombre: string; usuario: string; casos: CasoDelPortafolio[]; certificados: CertificadoPublico[] };

export async function obtenerPortafolio(db: AppDb, usuario: string): Promise<Portafolio | null> {
  const [dueno] = await db
    .select()
    .from(users)
    .where(and(eq(users.usuario, usuario.toLowerCase()), eq(users.portafolioPublico, true)));
  if (!dueno?.usuario) return null;

  const casosCompletos = await db
    .select({
      slug: casos.slug,
      titulo: casos.titulo,
      empresa: casos.empresa,
      cargo: casos.cargo,
      completadoEn: casoInscripciones.completadoEn,
      entregable: entregables.url,
    })
    .from(casoInscripciones)
    .innerJoin(casos, eq(casos.id, casoInscripciones.casoId))
    .leftJoin(entregables, and(eq(entregables.casoId, casoInscripciones.casoId), eq(entregables.userId, dueno.id)))
    .where(and(eq(casoInscripciones.userId, dueno.id), isNotNull(casoInscripciones.completadoEn)))
    .orderBy(desc(casoInscripciones.completadoEn));

  return {
    nombre: dueno.name?.trim() || dueno.usuario,
    usuario: dueno.usuario,
    casos: casosCompletos.map((caso) => ({ ...caso, completadoEn: caso.completadoEn ?? new Date(0) })),
    certificados: await listarCertificados(db, dueno.id),
  };
}
```

`src/app/api/cuenta/portafolio/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { actualizarPortafolio } from "@/lib/portafolio";
import { obtenerUsuarioId } from "@/lib/sesion";

const esquema = z.object({ publico: z.boolean(), usuario: z.string().max(40).optional() });

export async function PATCH(request: Request) {
  const userId = await obtenerUsuarioId();
  if (!userId) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  const resultado = await actualizarPortafolio(getDb(), userId, parsed.data, metaDeRequest(request));
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.motivo }, { status: resultado.motivo === "usuario_en_uso" ? 409 : 400 });
  }
  return NextResponse.json(resultado);
}
```

Run: `docker compose run --rm tools pnpm --filter web test -- src/lib/portafolio.test.ts src/app/api/cuenta/portafolio`
Expected: PASS (8 tests).

- [ ] **Step 4: Crear el formulario del perfil y la página pública**

`src/components/cuenta/formulario-portafolio.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

const ERRORES: Record<string, string> = {
  usuario_invalido: "Usa entre 3 y 30 letras minúsculas, números o guiones, sin empezar ni terminar en guion.",
  usuario_en_uso: "Ese usuario ya está tomado. Prueba con otro.",
  usuario_requerido: "Elige un usuario para publicar tu portafolio.",
};

export function FormularioPortafolio({
  publicoActual,
  usuarioActual,
  sugerido,
  urlBase,
}: {
  publicoActual: boolean;
  usuarioActual: string | null;
  sugerido: string;
  urlBase: string;
}) {
  const [publico, setPublico] = useState(publicoActual);
  const [usuario, setUsuario] = useState(usuarioActual ?? sugerido);
  const [guardado, setGuardado] = useState<{ publico: boolean; usuario: string | null }>({ publico: publicoActual, usuario: usuarioActual });
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta/portafolio", "PATCH", { publico, usuario });
    setEnviando(false);
    if (respuesta.ok) {
      setGuardado({ publico, usuario: typeof respuesta.datos.usuario === "string" ? respuesta.datos.usuario : null });
      setMensaje("Portafolio guardado.");
      return;
    }
    setMensaje((respuesta.error && ERRORES[respuesta.error]) ?? "No pudimos guardar tu portafolio. Intenta de nuevo.");
  }

  return (
    <form className="grid gap-3" onSubmit={guardar}>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" className="size-4" checked={publico} onChange={(evento) => setPublico(evento.target.checked)} />
        Hacer público mi portafolio
      </label>
      <Label>
        Tu usuario
        <Input value={usuario} onChange={(evento) => setUsuario(evento.target.value)} maxLength={30} autoComplete="off" />
      </Label>
      <p className="text-sm text-muted-foreground">
        Tu portafolio queda en <span className="font-mono">{`${urlBase}${usuario.trim().toLowerCase() || "tu-usuario"}`}</span>
      </p>
      <div>
        <Button type="submit" disabled={enviando}>
          Guardar portafolio
        </Button>
      </div>
      {mensaje ? (
        <p role="status" className="text-sm font-bold">
          {mensaje}
        </p>
      ) : null}
      {guardado.publico && guardado.usuario ? (
        <Link className="w-fit text-sm font-bold text-primary hover:underline" href={`/p/${guardado.usuario}`}>
          Ver mi portafolio
        </Link>
      ) : null}
    </form>
  );
}
```

En `src/app/(dashboard)/perfil/page.tsx`:

1. Agregar los imports:
```tsx
import { FormularioPortafolio } from "@/components/cuenta/formulario-portafolio";
import { enlacePortafolio } from "@/lib/cuenta/enlaces";
import { sugerirUsuario } from "@/lib/portafolio";
```
2. Entre la sección `Cambiar contraseña` y `Descargar tus datos`, agregar:
```tsx
      <Seccion
        titulo="Portafolio público"
        descripcion="Muestra tus casos completados, tus entregables y tus certificados en una página pública. Parte apagado: tú decides si lo publicas."
      >
        <FormularioPortafolio
          publicoActual={perfil.portafolioPublico}
          usuarioActual={perfil.usuario}
          sugerido={sugerirUsuario(perfil.nombre, perfil.email)}
          urlBase={enlacePortafolio("")}
        />
      </Seccion>
```

`src/app/(cuenta)/p/[usuario]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@syntaxerror/db/client";
import { fechaLarga } from "@/lib/certificados/formato";
import { obtenerPortafolio } from "@/lib/portafolio";

export const dynamic = "force-dynamic";

type Parametros = { params: Promise<{ usuario: string }> };

export async function generateMetadata({ params }: Parametros) {
  const portafolio = await obtenerPortafolio(getDb(), (await params).usuario);
  if (!portafolio) return { title: "Portafolio", robots: { index: false } };
  return {
    title: `${portafolio.nombre} · Portafolio`,
    description: `Casos resueltos y certificados de ${portafolio.nombre} en syntaxError.cl.`,
  };
}

export default async function PortafolioPage({ params }: Parametros) {
  const portafolio = await obtenerPortafolio(getDb(), (await params).usuario);
  if (!portafolio) notFound();

  return (
    <main className="mx-auto grid max-w-4xl gap-8 px-4 py-12 sm:px-6">
      <header className="grid gap-2">
        <p className="font-mono text-sm font-bold text-primary">{`> whoami ${portafolio.usuario}`}</p>
        <h1 className="text-4xl font-black">{portafolio.nombre}</h1>
        <p className="text-muted-foreground">Portafolio en syntaxError.cl: casos de trabajo resueltos con herramientas reales.</p>
      </header>

      <section className="grid gap-3">
        <h2 className="text-xl font-black">Casos resueltos</h2>
        {portafolio.casos.length === 0 ? (
          <p className="text-muted-foreground">Todavía no hay casos completados.</p>
        ) : (
          <ul className="grid gap-3">
            {portafolio.casos.map((caso) => (
              <li key={caso.slug} className="card grid gap-2 p-5">
                <p className="font-mono text-xs text-muted-foreground">{`${caso.empresa} · ${caso.cargo}`}</p>
                <h3 className="text-lg font-black">{caso.titulo}</h3>
                <p className="text-sm text-muted-foreground">Completado el {fechaLarga(caso.completadoEn)}</p>
                {caso.entregable ? (
                  <a
                    className="w-fit font-bold text-primary hover:underline"
                    href={caso.entregable}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                  >
                    Ver entregable
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-black">Certificados</h2>
        {portafolio.certificados.length === 0 ? (
          <p className="text-muted-foreground">Todavía no hay certificados.</p>
        ) : (
          <ul className="grid gap-2">
            {portafolio.certificados.map((certificado) => (
              <li key={certificado.codigo} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2">
                <span className="font-bold">{certificado.titulo}</span>
                <Link className="font-mono text-sm text-primary hover:underline" href={`/verificar/${certificado.codigo}`}>
                  {`Verificar ${certificado.codigo}`}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Correr los tests de web y el typecheck**

Run: `docker compose run --rm tools sh -c "pnpm --filter web test && cd apps/web && pnpm exec tsc --noEmit -p ."`
Expected: PASS y `tsc` sin errores.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(portafolio): portafolio publico opcional en /p/usuario

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: E2E de cuenta, certificados y portafolio, y README

**Files:**
- Create: `e2e/tests/mailpit.ts`, `e2e/tests/cuenta.spec.ts`
- Modify: `e2e/tests/fixtures.ts` (una IP por test), `e2e/tests/auth.spec.ts`, `README.md`, `.env.example`

**Interfaces:**
- Consumes: todo lo anterior, más la API de Mailpit (`http://mailpit:8025`), que el contenedor `e2e` alcanza porque comparte la red de `web`.
- Produces:
  - `esperarEmail(para, asunto): Promise<{ asunto; texto }>` y `rutaDelEnlace(texto, ruta): string` (la ruta relativa del enlace, para usarla con `baseURL`);
  - fixture `ip`: una IP distinta por test. Esta fase registra más cuentas por corrida que el límite de 5 registros por hora e IP.

- [ ] **Step 1: Una IP por test en los fixtures**

Reemplazar `e2e/tests/fixtures.ts` por:
```ts
import { test as base } from "@playwright/test";

function ipAleatoria(): string {
  const octeto = () => Math.floor(Math.random() * 250) + 1;
  return `10.${octeto()}.${octeto()}.${octeto()}`;
}

// Cada test usa su propia IP para no chocar con el rate limit de registro (5 por hora e IP).
// Sin proxy delante, Next toma el x-forwarded-for que manda el cliente.
// Solo se agrega a las requests de la app: en las del CDN de Pyodide forzaría un preflight CORS.
export const test = base.extend<{ ip: string }>({
  // eslint-disable-next-line no-empty-pattern
  ip: async ({}, use) => {
    await use(ipAleatoria());
  },
  context: async ({ context, ip }, use) => {
    await context.route("http://localhost:3000/**", (route) =>
      route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } })
    );
    await use(context);
  },
});

export { expect, type Page } from "@playwright/test";
```

En `e2e/tests/auth.spec.ts`:
1. Cambiar el import por:
```ts
import { expect, test } from "./fixtures";
```
2. Cambiar `test("el login acepta el email con otras mayúsculas", async ({ page, request }) => {` por:
```ts
test("el login acepta el email con otras mayúsculas", async ({ page, request, ip }) => {
```
3. Cambiar `headers: { Origin: "http://localhost:3000", "x-forwarded-for": ipDeLaCorrida },` por:
```ts
    headers: { Origin: "http://localhost:3000", "x-forwarded-for": ip },
```

- [ ] **Step 2: Crear el helper de Mailpit, `e2e/tests/mailpit.ts`**

```ts
const MAILPIT = process.env.MAILPIT_URL ?? "http://mailpit:8025";

export type EmailRecibido = { asunto: string; texto: string };

export async function esperarEmail(para: string, asunto: string, esperaMs = 20_000): Promise<EmailRecibido> {
  const limite = Date.now() + esperaMs;
  const consulta = encodeURIComponent(`to:"${para}" subject:"${asunto}"`);
  while (Date.now() < limite) {
    const busqueda = await fetch(`${MAILPIT}/api/v1/search?query=${consulta}`);
    const { messages } = (await busqueda.json()) as { messages: { ID: string }[] };
    if (messages.length > 0) {
      const detalle = await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`);
      const { Subject, Text } = (await detalle.json()) as { Subject: string; Text: string };
      return { asunto: Subject, texto: Text };
    }
    await new Promise((resolver) => setTimeout(resolver, 500));
  }
  throw new Error(`No llegó el email "${asunto}" a ${para}`);
}

// Los enlaces vienen con NEXT_PUBLIC_SITE_URL; se usa solo la ruta para que valga el baseURL de Playwright.
export function rutaDelEnlace(texto: string, ruta: string): string {
  const coincidencia = texto.match(new RegExp(`https?://\\S*${ruta}\\S*`));
  if (!coincidencia) throw new Error(`El email no trae un enlace a ${ruta}`);
  const url = new URL(coincidencia[0]);
  return `${url.pathname}${url.search}`;
}
```

- [ ] **Step 3: Escribir `e2e/tests/cuenta.spec.ts`**

```ts
import { expect, test, type Page } from "./fixtures";
import { esperarEmail, rutaDelEnlace } from "./mailpit";

const CLAVE = "clave-segura-123";

function emailNuevo(prefijo: string): string {
  return `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@correo.cl`;
}

async function registrarse(page: Page, email: string, nombre = "Josefa Morales") {
  await page.goto("/registro");
  await page.locator('input[name="name"]').fill(nombre);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(CLAVE);
  await page.getByRole("button", { name: "Crear y entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function entrar(page: Page, email: string, clave: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(clave);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

function seccion(page: Page, titulo: string) {
  return page.locator("section", { has: page.getByRole("heading", { name: titulo, exact: true }) });
}

test("al registrarse llega el email de confirmación y el enlace confirma la cuenta", async ({ page }) => {
  const email = emailNuevo("verifica");
  await registrarse(page, email);
  await expect(page.getByText("Confirma tu email:")).toBeVisible();

  const mensaje = await esperarEmail(email, "Confirma tu email");
  await page.goto(rutaDelEnlace(mensaje.texto, "/verificar-email"));
  await page.getByRole("button", { name: "Confirmar email" }).click();
  await expect(page.getByText("Tu email quedó confirmado.")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Reenviar email" })).toHaveCount(0);
});

test("completar el caso emite el certificado, se verifica en público y aparece en el portafolio", async ({ page }) => {
  const email = emailNuevo("certificado");
  await registrarse(page, email);

  const tareas = [
    ["01-clientes-de-regiones", "clientes-fuera-de-santiago"],
    ["02-total-de-ventas", "total-marzo"],
    ["03-ticket-promedio", "ticket-promedio"],
  ];
  for (const [mision, tarea] of tareas) {
    const respuesta = await page.request.post("/api/progreso", {
      headers: { Origin: "http://localhost:3000" },
      data: { caso: "demo-motor", mision, tarea, aprobada: true },
    });
    expect(respuesta.ok()).toBe(true);
  }

  await page.goto("/casos/demo-motor");
  await page.getByLabel("Enlace a tu entregable").fill("https://github.com/josefa/demo-motor");
  await page.getByRole("button", { name: "Guardar entregable" }).click();
  await page.getByRole("link", { name: "Ver tu certificado del caso" }).click();
  await expect(page.getByRole("heading", { name: "Josefa Morales" })).toBeVisible();
  const codigo = new URL(page.url()).pathname.split("/").pop();

  await page.goto(`/verificar/${codigo}`);
  await expect(page.getByRole("heading", { name: "Certificado válido" })).toBeVisible();
  await expect(page.getByText("Demo del motor: ventas de marzo", { exact: true })).toBeVisible();
  await esperarEmail(email, "Obtuviste un certificado");

  const usuario = `josefa-${Date.now()}`;
  await page.goto("/perfil");
  const portafolio = seccion(page, "Portafolio público");
  await portafolio.getByLabel("Hacer público mi portafolio").check();
  await portafolio.getByLabel("Tu usuario").fill(usuario);
  await portafolio.getByRole("button", { name: "Guardar portafolio" }).click();
  await expect(portafolio.getByText("Portafolio guardado.")).toBeVisible();

  await page.goto(`/p/${usuario}`);
  await expect(page.getByRole("heading", { name: "Josefa Morales" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver entregable" })).toHaveAttribute("href", "https://github.com/josefa/demo-motor");
});

test("cambiar el email pide confirmación desde el correo nuevo y avisa al anterior", async ({ page }) => {
  const email = emailNuevo("antes");
  const nuevo = emailNuevo("despues");
  await registrarse(page, email);

  await page.goto("/perfil");
  const cambio = seccion(page, "Cambiar email");
  await cambio.getByLabel("Nuevo email").fill(nuevo);
  await cambio.getByLabel("Contraseña actual").fill(CLAVE);
  await cambio.getByRole("button", { name: "Enviar confirmación" }).click();
  await expect(cambio.getByText(`Te enviamos un enlace a ${nuevo}.`, { exact: false })).toBeVisible();

  await esperarEmail(email, "Pidieron cambiar el email de tu cuenta");
  const confirmacion = await esperarEmail(nuevo, "Confirma tu nuevo email");
  await page.goto(rutaDelEnlace(confirmacion.texto, "/confirmar-email"));
  await page.getByRole("button", { name: "Confirmar nuevo email" }).click();
  await expect(page.getByText("Tu email cambió.", { exact: false })).toBeVisible();

  await page.context().clearCookies();
  await entrar(page, nuevo, CLAVE);
  await expect(page).toHaveURL(/\/dashboard/);
});

test("cambiar la contraseña y después eliminar la cuenta", async ({ page }) => {
  const email = emailNuevo("borrar");
  await registrarse(page, email);

  await page.goto("/perfil");
  const clave = seccion(page, "Cambiar contraseña");
  await clave.getByLabel("Contraseña actual").fill(CLAVE);
  await clave.getByLabel("Contraseña nueva").fill("otra-clave-456");
  await clave.getByRole("button", { name: "Cambiar contraseña" }).click();
  await expect(clave.getByText("Tu contraseña cambió.")).toBeVisible();
  await esperarEmail(email, "Tu contraseña fue actualizada");

  const eliminar = seccion(page, "Eliminar cuenta");
  await eliminar.getByLabel("Escribe tu contraseña para confirmar").fill("otra-clave-456");
  await eliminar.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
  await esperarEmail(email, "Tu cuenta fue eliminada");

  await entrar(page, email, "otra-clave-456");
  await expect(page.getByText("Email o password incorrectos.")).toBeVisible();
});

test("un código que no existe no se verifica", async ({ page }) => {
  await page.goto("/verificar/NoExiste2345");
  await expect(page.getByRole("heading", { name: "Código no encontrado" })).toBeVisible();
});
```

- [ ] **Step 4: Documentar en `README.md` y `.env.example`**

En `.env.example`, agregar al final:
```
# Solo en producción: sin esta clave los emails salen por SMTP a Mailpit.
RESEND_API_KEY=
```

En `README.md`, agregar al final:
```markdown
## Emails, cuenta y certificados

- Los emails los manda el worker desde la cola `emails` (BullMQ). En local salen por SMTP a Mailpit: ábrelos en http://localhost:8025. En producción, con `RESEND_API_KEY`, salen por la API de Resend.
- Al registrarse llega un email para confirmar la cuenta. En `/perfil` se cambia el nombre, el email (con confirmación desde el correo nuevo) y la contraseña, se descargan los datos y se elimina la cuenta.
- Al completar un caso (todas sus misiones y el entregable) se emite su certificado; al completar todos los casos de una ruta, el de la ruta. Se ven en `/certificados/<código>`, se imprimen o guardan en PDF desde el navegador y cualquiera los verifica en `/verificar/<código>`, que también busca los certificados migrados de la v1.
- El portafolio público (`/p/<usuario>`) parte apagado. Cada alumna lo publica desde su perfil.
```

- [ ] **Step 5: Correr todo**

Run: `npm test`
Expected: PASS en todos los paquetes (`queue`, `engines`, `content`, `db`, `ui`, `web`, `worker`).

Run: `docker compose up -d --build && npm run test:e2e`
Expected: `10 passed` (los 3 de `auth.spec.ts`, los 2 de `misiones.spec.ts` y los 5 de `cuenta.spec.ts`).

Run: `npm run test:e2e`
Expected: otra vez `10 passed` (el rate limit de registro no se acumula entre corridas).

Run: `docker compose down && npm run test:e2e:prod`
Expected: `10 passed` contra el build de producción. En particular, BullMQ funciona como paquete externo (`serverExternalPackages`) al registrar y al pedir el cambio de email.

Run: `curl -s -D - -o /dev/null localhost:3000/casos/demo-motor/01-clientes-de-regiones | grep -i x-nextjs-cache`
Expected: `x-nextjs-cache: HIT`: las misiones siguen estáticas.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml down`

- [ ] **Step 6: Commit**

```bash
git add e2e README.md .env.example
git commit -m "test(e2e): cuenta, certificados y portafolio con emails en mailpit

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Recuperar la contraseña olvidada

**Files:**
- Create: `apps/web/src/lib/cuenta/recuperacion.ts`
- Create: `apps/web/src/app/api/cuenta/recuperar/route.ts`, `apps/web/src/app/api/cuenta/restablecer/route.ts`
- Create: `apps/web/src/components/cuenta/formulario-recuperar.tsx`, `apps/web/src/components/cuenta/formulario-restablecer.tsx`
- Create: `apps/web/src/app/(cuenta)/recuperar-clave/page.tsx`, `apps/web/src/app/(cuenta)/restablecer-clave/page.tsx`
- Test: `apps/web/src/lib/cuenta/recuperacion.test.ts`, `apps/web/src/app/api/cuenta/recuperar/route.test.ts`
- Modify:
  - `packages/queue/src/emails.ts` (tipo `recuperar-clave`);
  - `apps/worker/src/emails/mensajes.ts` y `mensajes.test.ts`;
  - `packages/db/src/audit.ts` (acción `password_reset`);
  - `apps/web/src/lib/cuenta/tokens.ts` (tipo `recuperar`) y `enlaces.ts`;
  - `apps/web/src/lib/rate-limit.ts`;
  - `apps/web/src/app/(auth)/login/LoginForm.tsx` (enlace `¿Olvidaste tu contraseña?`);
  - `e2e/tests/cuenta.spec.ts`.

**Interfaces:**
- Consumes: `crearTokenEmail`, `consumirTokenEmail`, `metaDeRequest`, `encolarSinFallar`, `enviarJson`, `ConfirmarToken` como referencia de UI (Task 4), `hashPassword`, `normalizeEmail`, `resetRateLimit` (Fase 1).
- Produces:
  - `TrabajoEmail` con `{ tipo: "recuperar-clave"; para; nombre; enlace }`, asunto `Restablece tu contraseña`;
  - `TipoToken` con `"recuperar"` (dura 1 hora) y `enlaceRestablecerClave(token)`;
  - `@/lib/cuenta/recuperacion`:
    - `solicitarRecuperacion(db, email, encolar): Promise<void>`: no hace nada si la cuenta no existe;
    - `restablecerClave(db, token, claveNueva, { encolar, meta })`, que devuelve `{ ok: true; email }` o `{ ok: false; motivo: "invalido" | "vencido" }`. Marca el email como confirmado y avisa con `clave-cambiada`;
  - `POST /api/cuenta/recuperar { email }`: siempre responde `{ ok: true }`, salvo 429 por IP;
  - `POST /api/cuenta/restablecer { token, claveNueva }`: además limpia los intentos fallidos de login de ese email;
  - rate limits `recuperar-ip` (5 por hora) y `recuperar-email` (3 por hora). Si se pasa el de email, se responde igual pero sin enviar nada;
  - páginas `/recuperar-clave` (campo `Email`, botón `Enviarme el enlace`) y `/restablecer-clave` (campo `Contraseña nueva`, botón `Guardar contraseña`, mensaje `Tu contraseña quedó guardada.`).

- [ ] **Step 1: Tipo de email, token, auditoría y rate limits**

En `packages/queue/src/emails.ts`, agregar a la unión `TrabajoEmail`:
```ts
  | (Destinatario & { tipo: "recuperar-clave"; enlace: string })
```

En `packages/db/src/audit.ts`, agregar `"password_reset",` a `AUDIT_ACTIONS` (después de `"password_changed",`).

En `apps/web/src/lib/cuenta/tokens.ts`:
1. Cambiar el tipo por:
```ts
export type TipoToken = "verificar" | "cambiar" | "recuperar";
```
2. Cambiar `DURACION_MS` por:
```ts
const DURACION_MS: Record<TipoToken, number> = { verificar: 7 * DIA_MS, cambiar: DIA_MS, recuperar: 60 * 60 * 1000 };
```

En `apps/web/src/lib/cuenta/enlaces.ts`, agregar:
```ts
export const enlaceRestablecerClave = (token: string) => absoluteUrl(`/restablecer-clave?token=${encodeURIComponent(token)}`);
```

En `apps/web/src/lib/rate-limit.ts`:
1. Agregar al tipo `RateLimitKey`: `| "recuperar-ip" | "recuperar-email"`.
2. Agregar a `LIMITER_CONFIGS`:
```ts
  "recuperar-ip": { points: 5, duration: 3600 },
  "recuperar-email": { points: 3, duration: 3600 },
```

- [ ] **Step 2: Escribir los tests que fallan**

En `apps/worker/src/emails/mensajes.test.ts`, agregar al final del arreglo `casos`:
```ts
  [{ tipo: "recuperar-clave", para: "ana@correo.cl", nombre: "Ana", enlace }, "Restablece tu contraseña"],
```

`apps/web/src/lib/cuenta/recuperacion.test.ts`:
```ts
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TrabajoEmail } from "@syntaxerror/queue/emails";
import { auditLog, tokensEmail, users } from "@syntaxerror/db/schema";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";
import type { Encolar } from "@/lib/emails";
import { verifyPassword } from "@/lib/password";
import { SIN_META } from "./meta";
import { restablecerClave, solicitarRecuperacion } from "./recuperacion";

const { db, close } = createTestDb();
const enviados: TrabajoEmail[] = [];
const encolar: Encolar = async (trabajo) => void enviados.push(trabajo);
const deps = { encolar, meta: SIN_META };

function tokenDe(trabajo: TrabajoEmail | undefined): string {
  if (!trabajo || !("enlace" in trabajo)) throw new Error("El email no tiene enlace");
  return new URL(trabajo.enlace).searchParams.get("token") ?? "";
}

async function claveDe(email: string) {
  const [usuario] = await db.select().from(users).where(eq(users.email, email));
  return usuario.passwordHash;
}

beforeEach(async () => {
  await truncateAll(db);
  enviados.length = 0;
});
afterAll(() => close());

describe("recuperar la contraseña", () => {
  it("envía un enlace que deja entrar con la contraseña nueva, avisa y deja registro", async () => {
    await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    await solicitarRecuperacion(db, " ANA@Correo.cl ", encolar);
    expect(enviados[0]).toMatchObject({ tipo: "recuperar-clave", para: "ana@correo.cl", nombre: "Ana" });
    expect("enlace" in enviados[0] && enviados[0].enlace).toContain("/restablecer-clave?token=");

    expect(await restablecerClave(db, tokenDe(enviados[0]), "nueva-clave-789", deps)).toEqual({ ok: true, email: "ana@correo.cl" });
    expect(await verifyPassword("nueva-clave-789", (await claveDe("ana@correo.cl"))!)).toBe(true);
    expect(enviados[1]).toEqual({ tipo: "clave-cambiada", para: "ana@correo.cl", nombre: "Ana" });
    expect((await db.select().from(auditLog)).map((fila) => fila.action)).toEqual(["password_reset"]);
  });

  it("no envía nada ni falla si el email no tiene cuenta", async () => {
    await expect(solicitarRecuperacion(db, "nadie@correo.cl", encolar)).resolves.toBeUndefined();
    expect(enviados).toEqual([]);
  });

  it("el enlace sirve una sola vez y vence", async () => {
    await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    await solicitarRecuperacion(db, "ana@correo.cl", encolar);
    const token = tokenDe(enviados[0]);
    await restablecerClave(db, token, "nueva-clave-789", deps);
    expect(await restablecerClave(db, token, "otra-clave-000", deps)).toEqual({ ok: false, motivo: "invalido" });

    await solicitarRecuperacion(db, "ana@correo.cl", encolar);
    await db.update(tokensEmail).set({ expiraEn: new Date(Date.now() - 1_000) });
    expect(await restablecerClave(db, tokenDe(enviados.at(-1)), "otra-clave-000", deps)).toEqual({ ok: false, motivo: "vencido" });
  });

  it("un enlace viejo no sirve si la cuenta cambió de email", async () => {
    const { id } = await registerUser(db, { name: "Ana", email: "ana@correo.cl", password: "clave-segura-123" });
    await solicitarRecuperacion(db, "ana@correo.cl", encolar);
    await db.update(users).set({ email: "otra@correo.cl" }).where(eq(users.id, id));
    expect(await restablecerClave(db, tokenDe(enviados[0]), "nueva-clave-789", deps)).toEqual({ ok: false, motivo: "invalido" });
    expect(await verifyPassword("clave-segura-123", (await claveDe("otra@correo.cl"))!)).toBe(true);
  });

  it("una cuenta de Google puede crear su contraseña así", async () => {
    await db.insert(users).values({ email: "google@correo.cl", name: "Gabriela" });
    await solicitarRecuperacion(db, "google@correo.cl", encolar);
    expect(await restablecerClave(db, tokenDe(enviados[0]), "nueva-clave-789", deps)).toMatchObject({ ok: true });
    expect(await claveDe("google@correo.cl")).not.toBeNull();
  });
});
```

`apps/web/src/app/api/cuenta/recuperar/route.test.ts`:
```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, truncateAll } from "@syntaxerror/db/testing";
import { registerUser } from "@/app/api/auth/register/service";

vi.mock("@/lib/emails", () => ({ encolarEmail: vi.fn(async () => {}), encolarSinFallar: vi.fn(async () => {}) }));

const recuperar = await import("./route");
const restablecer = await import("../restablecer/route");
const { encolarSinFallar } = await import("@/lib/emails");
const { db, close } = createTestDb();

// IP y email distintos en cada corrida: los rate limits viven en Redis entre corridas.
function pedir(cuerpo: unknown) {
  return new Request("http://localhost:3000/api/cuenta/recuperar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(cuerpo),
  });
}

beforeEach(async () => {
  await truncateAll(db);
  vi.clearAllMocks();
});
afterAll(() => close());

describe("recuperar y restablecer por API", () => {
  it("responde lo mismo exista o no la cuenta, y solo envía a la que existe", async () => {
    const email = `ana-${Date.now()}@correo.cl`;
    await registerUser(db, { name: "Ana", email, password: "clave-segura-123" });

    const existe = await recuperar.POST(pedir({ email }));
    const noExiste = await recuperar.POST(pedir({ email: `nadie-${Date.now()}@correo.cl` }));
    expect([existe.status, await existe.json()]).toEqual([200, { ok: true }]);
    expect([noExiste.status, await noExiste.json()]).toEqual([200, { ok: true }]);
    expect(encolarSinFallar).toHaveBeenCalledTimes(1);
  });

  it("restablecer: 400 con un token inválido o una clave corta, 200 con el enlace del email", async () => {
    const email = `ana-${Date.now()}@correo.cl`;
    await registerUser(db, { name: "Ana", email, password: "clave-segura-123" });
    await recuperar.POST(pedir({ email }));
    const [trabajo] = vi.mocked(encolarSinFallar).mock.calls[0];
    const token = "enlace" in trabajo ? new URL(trabajo.enlace).searchParams.get("token") : null;

    const enviar = (cuerpo: unknown) =>
      restablecer.POST(
        new Request("http://localhost:3000/api/cuenta/restablecer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo),
        })
      );
    expect((await enviar({ token: "z".repeat(43), claveNueva: "nueva-clave-789" })).status).toBe(400);
    expect((await enviar({ token, claveNueva: "corta" })).status).toBe(400);
    expect((await enviar({ token, claveNueva: "nueva-clave-789" })).status).toBe(200);
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `docker compose run --rm tools sh -c "pnpm --filter worker test -- src/emails/mensajes.test.ts; pnpm --filter web test -- src/lib/cuenta/recuperacion.test.ts src/app/api/cuenta/recuperar"`
Expected: FAIL. En el worker, `construirEmail` no conoce `recuperar-clave`; en la web, no se pueden resolver `./recuperacion` ni las rutas.

- [ ] **Step 4: Crear el email, el servicio y las rutas**

En `apps/worker/src/emails/mensajes.ts`, agregar este `case` antes del de `certificado-emitido`:
```ts
    case "recuperar-clave":
      return plantillaSyntaxError({
        asunto: "Restablece tu contraseña",
        estado: { etiqueta: "INFO", mensaje: "Solicitud de contraseña nueva" },
        saludo: saludo(trabajo.nombre),
        parrafos: [
          "Recibimos una solicitud para elegir una contraseña nueva en tu cuenta de syntaxError.cl. El enlace dura una hora y sirve una sola vez.",
          "Si no la pediste tú, ignora este correo: tu contraseña sigue igual.",
        ],
        enlace: { texto: "Elegir una contraseña nueva", url: trabajo.enlace },
        comandoCierre: "passwd",
      });
```

`apps/web/src/lib/cuenta/recuperacion.ts`:
```ts
import { and, eq } from "drizzle-orm";
import type { AppDb } from "@syntaxerror/db/client";
import { insertAuditLogEntry } from "@syntaxerror/db/audit";
import { users } from "@syntaxerror/db/schema";
import { normalizeEmail } from "@/app/api/auth/register/service";
import type { Encolar } from "@/lib/emails";
import { hashPassword } from "@/lib/password";
import { enlaceRestablecerClave } from "./enlaces";
import type { MetaRequest } from "./meta";
import { consumirTokenEmail, crearTokenEmail } from "./tokens";

// No devuelve nada: la respuesta es igual exista o no la cuenta, así nadie averigua qué emails están registrados.
export async function solicitarRecuperacion(db: AppDb, email: string, encolar: Encolar): Promise<void> {
  const [usuario] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)));
  if (!usuario) return;
  const token = await crearTokenEmail(db, { userId: usuario.id, tipo: "recuperar", email: usuario.email });
  await encolar({ tipo: "recuperar-clave", para: usuario.email, nombre: usuario.name, enlace: enlaceRestablecerClave(token) });
}

export async function restablecerClave(
  db: AppDb,
  token: string,
  claveNueva: string,
  { encolar, meta }: { encolar: Encolar; meta: MetaRequest }
): Promise<{ ok: true; email: string } | { ok: false; motivo: "invalido" | "vencido" }> {
  const resultado = await consumirTokenEmail(db, "recuperar", token);
  if (!resultado.ok) return resultado;

  const passwordHash = await hashPassword(claveNueva);
  const [usuario] = await db.transaction(async (tx) => {
    // Quien abrió el enlace demostró que el correo es suyo: el email queda confirmado.
    const actualizados = await tx
      .update(users)
      .set({ passwordHash, emailVerified: new Date(), updatedAt: new Date() })
      .where(and(eq(users.id, resultado.userId), eq(users.email, resultado.email)))
      .returning({ id: users.id, email: users.email, name: users.name });
    if (actualizados.length > 0) {
      await insertAuditLogEntry(tx, {
        actorId: resultado.userId,
        actorEmail: resultado.email,
        action: "password_reset",
        targetType: "user",
        targetId: resultado.userId,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });
    }
    return actualizados;
  });
  if (!usuario) return { ok: false, motivo: "invalido" };

  await encolar({ tipo: "clave-cambiada", para: usuario.email, nombre: usuario.name });
  return { ok: true, email: usuario.email };
}
```

`apps/web/src/app/api/cuenta/recuperar/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { normalizeEmail } from "@/app/api/auth/register/service";
import { getClientIp } from "@/lib/client-ip";
import { solicitarRecuperacion } from "@/lib/cuenta/recuperacion";
import { encolarSinFallar } from "@/lib/emails";
import { checkRateLimit } from "@/lib/rate-limit";

const esquema = z.object({ email: z.string().trim().email().max(200) });

export async function POST(request: Request) {
  const limiteIp = await checkRateLimit("recuperar-ip", getClientIp(request.headers));
  if (!limiteIp.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limiteIp.retryAfterSeconds) } });
  }
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalido" }, { status: 400 });

  // Pasado el límite por email se responde igual, pero sin enviar: así no se delata si la cuenta existe.
  const limiteEmail = await checkRateLimit("recuperar-email", normalizeEmail(parsed.data.email));
  if (limiteEmail.allowed) {
    await solicitarRecuperacion(getDb(), parsed.data.email, encolarSinFallar).catch((error) =>
      console.error("[cuenta] no se pudo preparar la recuperación", error)
    );
  }
  return NextResponse.json({ ok: true });
}
```

`apps/web/src/app/api/cuenta/restablecer/route.ts`:
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@syntaxerror/db/client";
import { metaDeRequest } from "@/lib/cuenta/meta";
import { restablecerClave } from "@/lib/cuenta/recuperacion";
import { encolarSinFallar } from "@/lib/emails";
import { resetRateLimit } from "@/lib/rate-limit";

const esquema = z.object({ token: z.string().min(10).max(200), claveNueva: z.string().min(8).max(200) });

export async function POST(request: Request) {
  const parsed = esquema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "clave_corta" }, { status: 400 });

  const resultado = await restablecerClave(getDb(), parsed.data.token, parsed.data.claveNueva, {
    encolar: encolarSinFallar,
    meta: metaDeRequest(request),
  });
  if (!resultado.ok) return NextResponse.json({ error: resultado.motivo }, { status: 400 });
  // Quien estaba bloqueado por intentos fallidos puede entrar al tiro con la contraseña nueva.
  await resetRateLimit("login-email", resultado.email).catch(() => {});
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Correr los tests del servicio y las rutas**

Run: `docker compose run --rm tools sh -c "pnpm --filter worker test -- src/emails/mensajes.test.ts && pnpm --filter web test -- src/lib/cuenta/recuperacion.test.ts src/app/api/cuenta/recuperar"`
Expected: PASS (en la web, 7 tests nuevos; en el worker, un caso más en `construirEmail`).

- [ ] **Step 6: Crear las páginas y el enlace en el login**

`apps/web/src/components/cuenta/formulario-recuperar.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

export function FormularioRecuperar() {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function pedir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    const respuesta = await enviarJson("/api/cuenta/recuperar", "POST", { email });
    setEnviando(false);
    if (respuesta.status === 429) setMensaje("Hiciste muchos intentos. Espera un rato antes de volver a pedir el enlace.");
    else if (!respuesta.ok) setMensaje("Revisa que el email esté bien escrito.");
    else setMensaje("Si hay una cuenta con ese email, te enviamos un enlace para elegir una contraseña nueva. Revisa tu correo.");
  }

  return (
    <form className="grid gap-4" onSubmit={pedir}>
      <Label>
        Email
        <Input type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} required autoComplete="email" />
      </Label>
      <div>
        <Button type="submit" disabled={enviando}>
          Enviarme el enlace
        </Button>
      </div>
      {mensaje ? (
        <p role="status" className="text-sm font-bold">
          {mensaje}
        </p>
      ) : null}
    </form>
  );
}
```

`apps/web/src/components/cuenta/formulario-restablecer.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@syntaxerror/ui/components/button";
import { Input } from "@syntaxerror/ui/components/input";
import { Label } from "@syntaxerror/ui/components/label";
import { enviarJson } from "@/lib/cuenta/cliente";

const ERRORES: Record<string, string> = {
  invalido: "El enlace no es válido o ya se usó. Pide uno nuevo.",
  vencido: "El enlace venció (dura una hora). Pide uno nuevo.",
  clave_corta: "La contraseña debe tener al menos 8 caracteres.",
};

export function FormularioRestablecer() {
  const token = useSearchParams().get("token") ?? "";
  const [claveNueva, setClaveNueva] = useState("");
  const [estado, setEstado] = useState<"inicial" | "enviando" | "listo">("inicial");
  const [error, setError] = useState<string | null>(null);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado("enviando");
    const respuesta = await enviarJson("/api/cuenta/restablecer", "POST", { token, claveNueva });
    if (respuesta.ok) {
      setEstado("listo");
      return;
    }
    setEstado("inicial");
    setError((respuesta.error && ERRORES[respuesta.error]) ?? "No pudimos guardar la contraseña. Intenta de nuevo.");
  }

  if (!token) return <p className="text-muted-foreground">El enlace no trae su código. Ábrelo directamente desde el email.</p>;
  if (estado === "listo") {
    return (
      <p role="status" className="leading-7">
        Tu contraseña quedó guardada.{" "}
        <Link className="font-bold text-primary hover:underline" href="/login">
          Entrar
        </Link>
      </p>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={guardar}>
      <Label>
        Contraseña nueva
        <Input type="password" value={claveNueva} onChange={(evento) => setClaveNueva(evento.target.value)} required minLength={8} autoComplete="new-password" />
      </Label>
      <div>
        <Button type="submit" disabled={estado === "enviando"}>
          Guardar contraseña
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm font-bold text-destructive">
          {error}{" "}
          <Link className="underline" href="/recuperar-clave">
            Pedir otro enlace
          </Link>
        </p>
      ) : null}
    </form>
  );
}
```

`apps/web/src/app/(cuenta)/recuperar-clave/page.tsx`:
```tsx
import { Card } from "@syntaxerror/ui/components/card";
import { FormularioRecuperar } from "@/components/cuenta/formulario-recuperar";

export const metadata = { title: "Recuperar contraseña", robots: { index: false } };

export default function RecuperarClavePage() {
  return (
    <main className="mx-auto grid max-w-lg px-4 py-16">
      <Card className="grid gap-4 p-6">
        <h1 className="text-2xl font-black">Recuperar contraseña</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Escribe el email de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva. Si entras con Google, también te sirve para crear una.
        </p>
        <FormularioRecuperar />
      </Card>
    </main>
  );
}
```

`apps/web/src/app/(cuenta)/restablecer-clave/page.tsx`:
```tsx
import { Suspense } from "react";
import { Card } from "@syntaxerror/ui/components/card";
import { FormularioRestablecer } from "@/components/cuenta/formulario-restablecer";

export const metadata = { title: "Elige una contraseña nueva", robots: { index: false } };

export default function RestablecerClavePage() {
  return (
    <main className="mx-auto grid max-w-lg px-4 py-16">
      <Card className="grid gap-4 p-6">
        <h1 className="text-2xl font-black">Elige una contraseña nueva</h1>
        <Suspense fallback={null}>
          <FormularioRestablecer />
        </Suspense>
      </Card>
    </main>
  );
}
```

En `apps/web/src/app/(auth)/login/LoginForm.tsx`, después del `</Label>` que cierra el campo `Password` (el que tiene `autoComplete="current-password"`), agregar:
```tsx
      <Link className="-mt-2 w-fit text-sm font-bold text-primary hover:underline" href="/recuperar-clave">
        ¿Olvidaste tu contraseña?
      </Link>
```

- [ ] **Step 7: Agregar el e2e**

Al final de `e2e/tests/cuenta.spec.ts`, agregar:
```ts
test("recuperar la contraseña desde el login", async ({ page }) => {
  const email = emailNuevo("olvido");
  await registrarse(page, email);
  await page.context().clearCookies();

  await page.goto("/login");
  await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Enviarme el enlace" }).click();
  await expect(page.getByText("Si hay una cuenta con ese email", { exact: false })).toBeVisible();

  const mensaje = await esperarEmail(email, "Restablece tu contraseña");
  await page.goto(rutaDelEnlace(mensaje.texto, "/restablecer-clave"));
  await page.getByLabel("Contraseña nueva").fill("recuperada-789");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.getByText("Tu contraseña quedó guardada.")).toBeVisible();

  await entrar(page, email, "recuperada-789");
  await expect(page).toHaveURL(/\/dashboard/);
});
```

- [ ] **Step 8: Correr todo**

Run: `docker compose run --rm tools sh -c "pnpm -r --if-present test && cd apps/web && pnpm exec tsc --noEmit -p . && cd ../worker && pnpm exec tsc --noEmit -p ."`
Expected: PASS en todos los paquetes y `tsc` sin errores.

Run: `docker compose up -d --build && npm run test:e2e`
Expected: `11 passed`.

Run: `docker compose down && npm run test:e2e:prod`
Expected: `11 passed`.

Run: `docker compose -f docker-compose.yml -f docker/compose.prod-check.yml down`

- [ ] **Step 9: Commit**

```bash
git add packages apps e2e
git commit -m "feat(cuenta): recuperar la contrasena olvidada por email

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
