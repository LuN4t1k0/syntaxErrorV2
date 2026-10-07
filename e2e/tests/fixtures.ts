import { test as base, type BrowserContext, type Page } from "@playwright/test";

function ipAleatoria(): string {
  const octeto = () => Math.floor(Math.random() * 250) + 1;
  return `10.${octeto()}.${octeto()}.${octeto()}`;
}

// Solo las requests a la app llevan la IP: agregarla a todo (extraHTTPHeaders) rompe el CDN de Pyodide por CORS.
async function conIp(context: BrowserContext, ip: string): Promise<void> {
  await context.route("http://localhost:3000/**", (route) => route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } }));
}

export const test = base.extend<{ ip: string; nuevaPagina: () => Promise<Page> }>({
  ip: async ({}, use) => {
    await use(ipAleatoria());
  },
  context: async ({ context, ip }, use) => {
    await conIp(context, ip);
    await use(context);
  },
  // Otra sesión de navegador en el mismo test, por ejemplo la del docente que responde.
  nuevaPagina: async ({ browser }, use) => {
    const contextos: BrowserContext[] = [];
    await use(async () => {
      const contexto = await browser.newContext({ baseURL: "http://localhost:3000" });
      await conIp(contexto, ipAleatoria());
      contextos.push(contexto);
      return contexto.newPage();
    });
    for (const contexto of contextos) await contexto.close();
  },
});

export { expect, type Page } from "@playwright/test";

// La respuesta del servidor al reporte de una tarea. Con `aprobada`, solo la de ese resultado: el mensaje de un
// intento fallido aparece antes de que su reporte termine, así que esperar "el siguiente reporte" después del clic
// que aprueba puede tomar el del intento anterior, y la prueba sigue sin que la aprobación haya llegado.
export function reporteDeTarea(page: Page, aprobada?: boolean) {
  return page.waitForResponse(
    (respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST" && (aprobada === undefined || respuesta.request().postDataJSON()?.aprobada === aprobada)
  );
}

// Toda estudiante nueva ve la terminal de bienvenida en su panel (bienvenida.spec la prueba). Los demás tests la
// cierran como `explorar`: marcan la bienvenida por la API y recargan, sin elegir ruta.
export async function cerrarBienvenida(page: Page) {
  const respuesta = await page.request.post("/api/cuenta/bienvenida", { headers: { Origin: "http://localhost:3000" }, data: { ruta: null } });
  if (!respuesta.ok()) throw new Error(`no se pudo cerrar la bienvenida: ${respuesta.status()}`);
  await page.reload();
}
