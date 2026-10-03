# Fase 7a: Los mensajes a los estudiantes. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Traer de la v1 las dos páginas con mensajes para los estudiantes, con las mismas direcciones:
- **"El origen"** (`/lun4t1k0`): el mensaje de Cristian como LuN4t!k0.
- **"Por qué existimos"** (`/nosotros`): la carta "Syntax Error no es el fin".

**Architecture:**
- **Se copian de `cursos/apps/web/src/app/(marketing)/`.** Usan `TerminalWindow`, que es idéntico en las dos versiones, y clases que la v2 ya tiene (`page-container`, `section-kicker`, `page-title`, `text-success`).
- **"El origen" va sin cambios.** "Por qué existimos" venía sin tildes y solo se le ponen: "Por qué", "código", "estás", "críptico", "fuéramos", "callejón", "tecnología", "Aquí", "hubiéramos", "línea", "lección", "jamás", "diseñar", "más", "frustración", "está" y "café".
- **Los enlaces:**
  - En el menú va "El origen", con el texto `> sudo ./run_bio` de la v1. En pantallas chicas queda solo el ícono.
  - En el pie de página va "Por qué existimos". El pie ahora se ajusta en varias líneas para caber en un teléfono.

**Tech Stack:** Next 15, Tailwind 4 y Playwright 1.55.

**Spec:** decisión del 2026-10-03 de traer las funciones de la v1 (fase 7a).

## Global Constraints

- **Contenido:** el texto de los mensajes no se reescribe; solo se corrigen tildes.
- **Entorno:** todo se ejecuta con `docker compose run --rm tools ...`. El paquete de la app se llama `web`.
- **Commits:** en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Un teléfono de 360 px:** el pie, ahora con cuatro enlaces, no debe desbordar la página. Probado en `origen.spec.ts`.
2. **Los enlaces que se compartieron con la v1** (`/lun4t1k0` y `/nosotros`) siguen funcionando.

---

### Task 1: Las dos páginas y sus enlaces

**Files:**
- Create: `apps/web/src/app/(marketing)/lun4t1k0/page.tsx`, `apps/web/src/app/(marketing)/nosotros/page.tsx`
- Modify: `apps/web/src/components/site-header.tsx`, `apps/web/src/components/site-footer.tsx`, `e2e/calentar.ts`
- Test: `e2e/tests/origen.spec.ts`

**Interfaces:**
- Produces: las páginas `/lun4t1k0` y `/nosotros`, enlazadas desde el menú ("El origen") y desde el pie ("Por qué existimos").

- [ ] **Step 1: Escribir la prueba**

`e2e/tests/origen.spec.ts`:
```ts
import { expect, test } from "./fixtures";

test("el mensaje del creador se abre desde el menú, como en la v1", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "El origen" }).click();
  await expect(page).toHaveURL(/\/lun4t1k0$/);
  await expect(page.getByText("> sudo ./run_bio_LuN4t!k0.sh")).toBeVisible();
  await expect(page.getByText("esta plataforma es 100% gratuita")).toBeVisible();
  await expect(page.getByText("Un abrazo gigante y dale con todo... ¡Aprende!")).toBeVisible();
});

test("la carta de bienvenida se abre desde el pie de página y cabe en un teléfono", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Por qué existimos" }).click();
  await expect(page).toHaveURL(/\/nosotros$/);
  await expect(page.getByRole("heading", { name: "Syntax Error no es el fin" })).toBeVisible();
  await expect(page.getByText("Bienvenido al club.")).toBeVisible();
  await expect(page.getByText("Prepara tu café, ajusta tu setup y ejecuta tu primer comando.")).toBeVisible();
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});
```

En `e2e/calentar.ts`, en `RUTAS`, después de `"/reportar",`, agrega:
```ts
  "/lun4t1k0",
  "/nosotros",
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run test:e2e -- tests/origen.spec.ts`
Expected: `2 failed`. No existe el enlace "El origen".

- [ ] **Step 3: Las páginas**

`apps/web/src/app/(marketing)/lun4t1k0/page.tsx` (igual a la v1):
```tsx
import { TerminalWindow } from "@/components/terminal-window";

export const metadata = {
  title: "El origen",
  description: "Quién está detrás de syntaxError.cl.",
};

export default function OrigenPage() {
  return (
    <main className="page-container py-16 sm:py-20">
      {/* <p className="section-kicker">Detrás de la consola // El origen del entorno</p>
      <h1 className="page-title mt-3">Quiénes somos</h1> */}

      <div className="mt-0 max-w-7xl">
        <TerminalWindow title="sudo run syntaxerror --quienes-somos">
          <p className="font-mono text-2xl font-black text-foreground">
            {"> sudo ./run_bio_LuN4t!k0.sh"}
          </p>

          <div className="mt-6 space-y-1 border-l-4 border-primary bg-primary/10 p-4 font-mono text-sm text-foreground">
            <p>
              <span className="text-primary">[PROFILE]:</span> Cristian Venegas (Ingeniero
              Informático & Magíster PUC)
            </p>
            <p>
              <span className="text-primary">[ALIAS]:</span> LuN4t!k0 (Code Lover, Maestro Pokemon Nivel 42, Gamer)
            </p>
            <p>
              <span className="text-primary">[LINKEDIN]:</span>{" "}
              <a
                href="https://www.linkedin.com/in/cristian-venegas-595844a2/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                linkedin.com/in/cristian-venegas-595844a2
              </a>
            </p>
          </div>

          <div className="mt-8 space-y-5 leading-relaxed text-foreground">
            <p>
              A primera vista, mi perfil puede parecer el clásico flujo estructurado:
              Ingeniero Informático con un Magíster de la Pontificia Universidad
              Católica. Pero si excavamos un poco en los logs de mi vida, encuentras a{" "}
              <span className="font-bold text-primary">LuN4t!k0</span>, un apasionado
              que pasa horas frente a la pantalla picando código, resolviendo problemas.
            </p>

            <p>
              Creé esta plataforma con una misión directa y sin rodeos:{" "}
              <span className="font-bold text-primary">
                ayudarte a encontrar el camino hacia tu primer trabajo, tu próximo
                desafío o tu reconversión laboral definitiva
              </span>
              . Si estás aquí con dudas, quiero recordarte algo: nunca es muy temprano
              ni demasiado tarde para subirte a este hermoso ecosistema de la
              informática. Aquí, incluso cuando entiendes exactamente la lógica detrás
              de cada línea y sabes cómo funciona por dentro, sigues sintiendo que la
              programación es pura magia.
            </p>

            <p>
              Porque programar no es simplemente sentarse a tirar líneas de código
              en un editor de texto.{" "}
              <span className="font-bold text-success">
                Es el arte de solucionar problemas reales
              </span>
              , ya sea para ti o para los demás, con el único fin de hacer la vida de
              las personas más simple. No se trata de automatizar para que la humanidad
              deje de trabajar, sino de liberar su tiempo para que puedan invertirlo en
              cosas mucho mejores.
            </p>

            <p>
              Y aquí es donde entra <span className="text-primary">syntaxError.cl</span>.
              ¿Por qué elegí este nombre? Porque un error de sintaxis es lo más común
              cuando estás partiendo, pero no es una muralla infranqueable. Es solo una
              señal del sistema que te avisa que algo no va bien y que debes detenerte
              un segundo a repensar la solución. Nada más. A veces programar se siente
              endiabladamente complicado y frustrante... ¡Y adivina qué! Lo es. Es mega
              frustrante.
            </p>

            <p>
              Por suerte, hoy contamos con el apoyo de la Inteligencia Artificial. Es
              como tener un ayudante integrado que hace todo el trabajo repetitivo por
              ti. Pero ojo,{" "}
              <span className="font-bold text-primary">
                siempre hay un &quot;pero&quot;
              </span>
              : tú debes saber exactamente qué es lo que está haciendo esa máquina.
              Somos los humanos los que debemos tener siempre la última palabra y la
              decisión final sobre el sistema. Por eso, aquí aprenderás a pensar fuera
              de la caja, dentro de la caja, al lado, arriba, en un círculo, un
              cuadrado, un grafo o un objeto de forma plástica.
            </p>

            <p>
              Siempre se ha dicho el mito de que los ingenieros (y sobre todo los
              informáticos) somos seres cuadrados y rígidos. Eso es un gran{" "}
              <em>Runtime Error</em>. Nosotros trabajamos sobre lienzos en blanco donde
              toda la creatividad fluye para construir cosas increíbles a partir de la
              nada.
            </p>

            <p>
              Para cerrar este bloque y volver a lo que nos convoca, quiero dejarte las
              reglas de este entorno claras de inmediato:{" "}
              <span className="font-bold text-primary">
                esta plataforma es 100% gratuita
              </span>
              . Sin trucos, sin telemetría oculta y sin vender tus datos a nadie. Es
              gratis porque yo aprendí en internet gracias a la generosidad de muchos
              entusiastas y creadores de contenido al principio de mi carrera. Ahora
              que Dios y la vida me han dado la oportunidad de crecer, quiero devolver
              un poco de ese conocimiento a quienes también están buscando las
              herramientas para superarse personal o profesionalmente.
            </p>

            <p>
              Este proyecto está hecho con amor, dedicación y con la firme esperanza de
              que te sea de máxima utilidad. Si te sirve, compártelo para que más
              personas puedan aprender. Recuerda siempre: el conocimiento no ocupa
              espacio en tu disco duro. Está bien tener dudas y es normal llenarse de
              preguntas.
            </p>

            <p>
              Como no podré estar físicamente a tu lado en cada momento que te
              estanques, te dejé configurado un ayudante en el entorno:{" "}
              <span className="font-bold text-primary">
                una pequeña IA disponible las 24 horas
              </span>{" "}
              para resolver tus consultas sobre programación, desarrollo y ciencia de
              datos.
            </p>

            <p>Un abrazo gigante y dale con todo... ¡Aprende!</p>
          </div>

          <div className="mt-8 space-y-1 border-t border-dashed border-border pt-6 text-foreground">
            <p className="text-success">
              ✔ Sistema listo para producción. El conocimiento está libre de bloqueos.
            </p>
            <p className="mt-3">
              Abrazo virtual,
              <br />
              <strong>LuN4t!k0</strong>
              <br />
              <span className="font-mono font-bold text-primary">
                sudo init success_story
                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
              </span>
            </p>
          </div>
        </TerminalWindow>
      </div>
    </main>
  );
}
```

`apps/web/src/app/(marketing)/nosotros/page.tsx` (la v1 con tildes):
```tsx
import { TerminalWindow } from "@/components/terminal-window";

export const metadata = {
  title: "Por qué existimos",
  description: "La motivación detrás de syntaxError.cl.",
};

export default function NosotrosPage() {
  return (
    <main className="page-container py-16 sm:py-20">
      <p className="section-kicker">Por qué existimos</p>
      <h1 className="page-title mt-3">Syntax Error no es el fin</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
        Es el primer paso para aprender a solucionarlo.
      </p>

      <div className="mt-10 max-w-3xl">
        <TerminalWindow title="student@syntaxerror: ~/bienvenida.sh">
          <p className="font-mono text-2xl font-black text-foreground">
            {"> SYNTAX ERROR_"}
          </p>
          <p className="mt-1 font-mono text-sm text-primary">
            [ Academia Geek // El arte de aprender rompiendo cosas ]
          </p>

          <div className="mt-6 border-l-4 border-destructive bg-destructive/10 p-4 font-mono text-sm text-destructive">
            [FATAL ERROR]: El miedo al fracaso ha bloqueado el sistema.
            <br />
            [STATUS]: Recomponiendo el entorno... Listo para compilar de nuevo.
          </div>

          <div className="mt-8 space-y-5 leading-relaxed text-foreground">
            <p>Estimado(a) futuro(a) dev, creador(a) y explorador(a) del código:</p>

            <p>
              Si estás leyendo esto, es probable que te hayas topado con esa
              pantalla roja o ese mensaje críptico en la terminal que te hizo
              querer cerrar la laptop y cuestionar tus decisiones de vida.
              Queremos decirte algo fundamental:{" "}
              <span className="font-bold text-primary">Bienvenido al club.</span>
            </p>

            <p>
              Cuando fundamos <span className="text-primary">syntaxError.cl</span>,
              no elegimos el nombre porque fuéramos perfectos. Lo elegimos porque
              entendemos que un error de sintaxis no es un callejón sin salida; es
              el lenguaje que tiene la tecnología para decirte:{" "}
              <em>&quot;Estás cerca, intenta otra perspectiva&quot;</em>. En el
              mundo geek, el verdadero fracaso no es equivocarse, es dejar de
              presionar <span className="font-bold text-primary">F5</span>.
            </p>

            <p>
              Aquí no venimos a memorizar manuales aburridos ni a fingir que el
              código compila a la primera. Venimos a ensuciarnos las manos, a
              romper entornos virtuales (controladamente, claro), a descifrar
              bugs y a celebrar cada{" "}
              <span className="font-bold text-success">&quot;Build Success&quot;</span>{" "}
              como si hubiéramos ganado la copa del mundo. Cada línea de código
              que escribas mal es una lección que jamás vas a olvidar.
            </p>

            <p>
              En esta academia vas a aprender a programar, a diseñar, a pensar y
              a resolver problemas reales. Pero, por sobre todo, vas a
              desarrollar el superpoder más grande de cualquier geek: la{" "}
              <span className="font-bold text-primary">
                tolerancia a la frustración y la curiosidad insaciable
              </span>
              .
            </p>

            <p>
              Tu consola está limpia. El compilador está listo. No le temas al{" "}
              <span className="text-primary">Syntax Error</span>, porque a
              partir de hoy, ese error es tu maestro más honesto.
            </p>
          </div>

          <div className="mt-8 space-y-1 border-t border-dashed border-border pt-6 text-foreground">
            <p className="text-success">
              ✔ El entorno se ha configurado correctamente.
            </p>
            <p>Prepara tu café, ajusta tu setup y ejecuta tu primer comando.</p>
            <p className="mt-3">
              Atentamente,
              <br />
              <strong>El equipo de syntaxError.cl</strong>
              <br />
              <span className="font-mono font-bold text-primary">
                sudo init learning
                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
              </span>
            </p>
          </div>
        </TerminalWindow>

        <p className="mt-3 text-right font-mono text-xs text-muted-foreground">
          Page 404 Not Found... Just kidding. Page 1 of 1
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Los enlaces**

En `apps/web/src/components/site-header.tsx`:
1. El import de íconos queda:
```tsx
import { GraduationCap, LayoutDashboard, Mail, Search, Shield, SquareTerminal, UserRound } from "lucide-react";
```
2. Antes del enlace a `/buscar`, agrega:
```tsx
        {/* El mensaje del creador de la plataforma, con el mismo enlace que tenía la v1. */}
        <Link className="nav-link" href="/lun4t1k0" aria-label="El origen">
          <SquareTerminal size={16} />
          <span className="hidden font-mono lg:inline">{"> sudo ./run_bio"}</span>
        </Link>
```

`apps/web/src/components/site-footer.tsx` completo:
```tsx
import Link from "next/link";
import { EnlaceReportar } from "./comunidad/enlace-reportar";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} syntaxError.cl</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Pie de página">
          <Link href="/nosotros" className="hover:text-foreground">
            Por qué existimos
          </Link>
          <Link href="/privacidad" className="hover:text-foreground">
            Privacidad
          </Link>
          <Link href="/terminos" className="hover:text-foreground">
            Términos
          </Link>
          <EnlaceReportar />
        </nav>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Correr todo**

Run: `docker compose run --rm tools sh -c "pnpm --filter web exec tsc --noEmit && pnpm --filter web test"`
Expected: sin errores de tipos; 337 pruebas pasan.

Run: `npm run test:e2e`
Expected: `47 passed`, dos corridas seguidas.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/app/(marketing)/lun4t1k0" "apps/web/src/app/(marketing)/nosotros" apps/web/src/components/site-header.tsx apps/web/src/components/site-footer.tsx e2e/calentar.ts e2e/tests/origen.spec.ts
git commit -m "feat(web): el origen y por que existimos, los mensajes de la v1 a los estudiantes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Qué sigue

7b: la búsqueda con Ctrl+K. Después vienen 7c (descargar el certificado), 7d (el carrusel de la portada) y 7e (el asistente del curso, junto al tutor).
