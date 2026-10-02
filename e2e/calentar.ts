// En desarrollo, Next compila cada ruta la primera vez que se pide. Si eso ocurre con varias pruebas en
// paralelo, las recompilaciones abortan navegaciones de otras pruebas (net::ERR_ABORTED). Se piden las
// rutas una vez, en orden, antes de empezar. Contra el build de producción no cuesta nada.
const RUTAS = [
  "/",
  "/login",
  "/registro",
  "/rutas",
  "/buscar",
  "/reportar",
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

export default async function calentar(): Promise<void> {
  for (const ruta of RUTAS) {
    try {
      await fetch(`http://localhost:3000${ruta}`, { redirect: "manual", signal: AbortSignal.timeout(60_000) });
    } catch {
      // Una ruta que no responde se compila igual en su prueba; el calentamiento nunca hace fallar la suite.
    }
  }
}
