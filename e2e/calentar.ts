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

// Las e2e usan la misma base que el desarrollo local: si quedó encendido el orden libre desde la administración,
// las pruebas que esperan bloqueos fallan. Se deja en el orden normal antes de empezar.
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
    await contexto.close();
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
